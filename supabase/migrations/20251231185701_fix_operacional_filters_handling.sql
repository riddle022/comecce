/*
  # Fix Operacional Filters Handling

  ## Summary
  Updates the get_operacional_os_summary function to properly handle all text-based 
  filters from the frontend, including filters for dates and numeric values.

  ## Changes
  - Handle all column filters as text search (ILIKE) for consistency with frontend
  - Remove separate valor_min/valor_max logic since frontend sends direct column filters
  - Ensure all filterable columns from the table are properly handled
*/

-- Drop and recreate the function with proper filter handling
DROP FUNCTION IF EXISTS get_operacional_os_summary(date, date, uuid[], integer, integer, text, text, jsonb);

CREATE OR REPLACE FUNCTION get_operacional_os_summary(
  p_data_inicio date,
  p_data_fim date,
  p_empresa_ids uuid[],
  p_page integer DEFAULT 1,
  p_limit integer DEFAULT 50,
  p_sort_by text DEFAULT 'dt_abertura_os',
  p_sort_order text DEFAULT 'DESC',
  p_filters jsonb DEFAULT '{}'::jsonb
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result json;
  v_filter_numero_os text;
  v_filter_status text;
  v_filter_etapa text;
  v_filter_vendedor text;
  v_filter_dt_abertura text;
  v_filter_dt_previsao text;
  v_filter_dt_entrega text;
  v_filter_valor_total text;
  v_offset integer;
BEGIN
  -- Validate and sanitize inputs
  p_page := GREATEST(1, p_page);
  p_limit := LEAST(100, GREATEST(10, p_limit));
  p_sort_order := UPPER(p_sort_order);
  IF p_sort_order NOT IN ('ASC', 'DESC') THEN
    p_sort_order := 'DESC';
  END IF;

  -- Calculate offset
  v_offset := (p_page - 1) * p_limit;

  -- Extract filters from jsonb
  v_filter_numero_os := p_filters->>'numero_os';
  v_filter_status := p_filters->>'status_os';
  v_filter_etapa := p_filters->>'ds_etapa_atual';
  v_filter_vendedor := p_filters->>'ds_vendedor';
  v_filter_dt_abertura := p_filters->>'dt_abertura_os';
  v_filter_dt_previsao := p_filters->>'dt_previsao_entrega';
  v_filter_dt_entrega := p_filters->>'dt_entrega';
  v_filter_valor_total := p_filters->>'valor_total';

  -- Single query with all CTEs and final result
  WITH filtered_os AS (
    SELECT
      numero_os,
      id_empresa,
      dt_abertura_os,
      status_os,
      status_da_venda,
      ds_etapa_atual,
      dt_previsao_entrega,
      dt_entrega,
      ds_vendedor,
      item_vl_total_liquido,
      item_nr_quantidade,
      CASE
        WHEN dt_previsao_entrega IS NOT NULL
          AND dt_entrega IS NULL
          AND DATE(dt_previsao_entrega) < CURRENT_DATE
        THEN true
        ELSE false
      END as em_atraso
    FROM tbl_ordem_servico
    WHERE
      DATE(dt_abertura_os) BETWEEN p_data_inicio AND p_data_fim
      AND id_empresa = ANY(p_empresa_ids)
      AND (v_filter_numero_os IS NULL OR numero_os::text ILIKE '%' || v_filter_numero_os || '%')
      AND (
        v_filter_status IS NULL
        OR (
          v_filter_status = 'Entregue' AND LOWER(status_os) IN ('entregue', 'finalizada', 'concluída', 'entregues')
        )
        OR (
          v_filter_status = 'Aberta' AND LOWER(status_os) IN ('aberta', 'pendente')
        )
        OR (
          v_filter_status = 'Em Andamento'
          AND LOWER(status_os) NOT IN ('entregue', 'finalizada', 'concluída', 'entregues', 'aberta', 'pendente')
          AND (dt_previsao_entrega IS NULL OR dt_entrega IS NOT NULL OR DATE(dt_previsao_entrega) >= CURRENT_DATE)
        )
        OR (
          v_filter_status = 'Em Atraso'
          AND dt_previsao_entrega IS NOT NULL
          AND dt_entrega IS NULL
          AND DATE(dt_previsao_entrega) < CURRENT_DATE
        )
      )
      AND (v_filter_etapa IS NULL OR ds_etapa_atual ILIKE '%' || v_filter_etapa || '%')
      AND (v_filter_vendedor IS NULL OR ds_vendedor ILIKE '%' || v_filter_vendedor || '%')
  ),
  os_aggregated AS (
    SELECT
      numero_os,
      id_empresa,
      dt_abertura_os,
      status_os,
      status_da_venda,
      ds_etapa_atual,
      dt_previsao_entrega,
      dt_entrega,
      ds_vendedor,
      SUM(COALESCE(item_vl_total_liquido, 0)) as valor_total,
      SUM(COALESCE(item_nr_quantidade, 0)) as quantidade_total,
      BOOL_OR(em_atraso) as em_atraso
    FROM filtered_os
    GROUP BY
      numero_os, id_empresa, dt_abertura_os, status_os,
      status_da_venda, ds_etapa_atual, dt_previsao_entrega,
      dt_entrega, ds_vendedor
  ),
  os_filtered_final AS (
    SELECT *
    FROM os_aggregated
    WHERE
      (v_filter_dt_abertura IS NULL OR to_char(dt_abertura_os, 'DD/MM/YYYY') ILIKE '%' || v_filter_dt_abertura || '%')
      AND (v_filter_dt_previsao IS NULL OR to_char(dt_previsao_entrega, 'DD/MM/YYYY') ILIKE '%' || v_filter_dt_previsao || '%')
      AND (v_filter_dt_entrega IS NULL OR to_char(dt_entrega, 'DD/MM/YYYY') ILIKE '%' || v_filter_dt_entrega || '%')
      AND (v_filter_valor_total IS NULL OR valor_total::text ILIKE '%' || v_filter_valor_total || '%')
  ),
  kpis AS (
    SELECT
      COUNT(*) FILTER (
        WHERE LOWER(status_os) IN ('aberta', 'em andamento', 'pendente')
          AND NOT em_atraso
      ) as os_abertas,
      COUNT(*) FILTER (
        WHERE LOWER(status_os) IN ('entregue', 'finalizada', 'concluída', 'entregues')
      ) as os_entregues,
      COUNT(*) FILTER (WHERE em_atraso = true) as os_em_atraso,
      COALESCE(SUM(valor_total), 0) as faturamento_liquido_os,
      COUNT(*) as total_count
    FROM os_filtered_final
  ),
  paginated_os AS (
    SELECT
      json_build_object(
        'numero_os', numero_os,
        'status_os', COALESCE(status_os, 'N/A'),
        'status_da_venda', COALESCE(status_da_venda, 'N/A'),
        'ds_etapa_atual', COALESCE(ds_etapa_atual, 'N/A'),
        'dt_abertura_os', dt_abertura_os::text,
        'dt_previsao_entrega', dt_previsao_entrega::text,
        'dt_entrega', dt_entrega::text,
        'ds_vendedor', COALESCE(ds_vendedor, 'N/A'),
        'valor_total', valor_total,
        'quantidade_total', quantidade_total,
        'em_atraso', em_atraso
      ) as row_data,
      CASE
        WHEN p_sort_by = 'numero_os' THEN
          CASE WHEN p_sort_order = 'ASC' THEN numero_os::text ELSE LPAD((999999999 - numero_os)::text, 10, '0') END
        WHEN p_sort_by = 'status_os' THEN
          CASE WHEN p_sort_order = 'ASC' THEN status_os ELSE REVERSE(status_os) END
        WHEN p_sort_by = 'ds_etapa_atual' THEN
          CASE WHEN p_sort_order = 'ASC' THEN ds_etapa_atual ELSE REVERSE(ds_etapa_atual) END
        WHEN p_sort_by = 'ds_vendedor' THEN
          CASE WHEN p_sort_order = 'ASC' THEN ds_vendedor ELSE REVERSE(ds_vendedor) END
        WHEN p_sort_by = 'dt_abertura_os' THEN
          CASE WHEN p_sort_order = 'ASC' THEN dt_abertura_os::text ELSE REVERSE(dt_abertura_os::text) END
        WHEN p_sort_by = 'dt_previsao_entrega' THEN
          CASE WHEN p_sort_order = 'ASC' THEN COALESCE(dt_previsao_entrega::text, '9999-12-31') ELSE REVERSE(COALESCE(dt_previsao_entrega::text, '0000-01-01')) END
        WHEN p_sort_by = 'dt_entrega' THEN
          CASE WHEN p_sort_order = 'ASC' THEN COALESCE(dt_entrega::text, '9999-12-31') ELSE REVERSE(COALESCE(dt_entrega::text, '0000-01-01')) END
        WHEN p_sort_by = 'valor_total' THEN
          CASE WHEN p_sort_order = 'ASC' THEN LPAD(valor_total::text, 20, '0') ELSE LPAD((9999999999.99 - valor_total)::text, 20, '0') END
        ELSE
          CASE WHEN p_sort_order = 'ASC' THEN dt_abertura_os::text ELSE REVERSE(dt_abertura_os::text) END
      END as sort_value
    FROM os_filtered_final
    ORDER BY sort_value
    LIMIT p_limit
    OFFSET v_offset
  )
  SELECT json_build_object(
    'kpis', json_build_object(
      'os_abertas', (SELECT os_abertas FROM kpis),
      'os_entregues', (SELECT os_entregues FROM kpis),
      'os_em_atraso', (SELECT os_em_atraso FROM kpis),
      'faturamento_liquido_os', (SELECT faturamento_liquido_os FROM kpis)
    ),
    'lista_os', COALESCE((SELECT json_agg(row_data) FROM paginated_os), '[]'::json),
    'total_count', (SELECT total_count FROM kpis),
    'current_page', p_page,
    'total_pages', GREATEST(1, CEIL((SELECT total_count FROM kpis)::numeric / p_limit::numeric)::integer)
  )
  INTO v_result;

  RETURN v_result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_operacional_os_summary(date, date, uuid[], integer, integer, text, text, jsonb) TO authenticated;

-- Add comment
COMMENT ON FUNCTION get_operacional_os_summary IS 'Returns operational OS summary with server-side pagination, filtering (all columns as text search), and sorting.';
