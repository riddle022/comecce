/*
  # Add Server-Side Pagination to Operacional OS Summary

  ## Summary
  Modifies the get_operacional_os_summary function to support server-side pagination,
  dynamic filtering, and sorting for scalability with large datasets.

  ## Changes
  1. Modified Function: get_operacional_os_summary
     - New Parameters:
       * p_page (integer, default 1): Current page number
       * p_limit (integer, default 50): Records per page
       * p_sort_by (text, default 'dt_abertura_os'): Column to sort by
       * p_sort_order (text, default 'DESC'): Sort direction (ASC/DESC)
       * p_filters (jsonb, default '{}'): Dynamic filters object
     - Returns expanded JSON with:
       * kpis: Calculated based on filtered data (not global)
       * lista_os: Paginated and sorted OS list
       * total_count: Total filtered records for pagination
       * current_page: Current page number
       * total_pages: Total number of pages

  2. New Indexes:
     - Index on (dt_abertura_os, id_empresa) for date range queries
     - Index on status_os for status filtering
     - Index on ds_vendedor for vendor filtering
     - Index on numero_os for OS number search

  ## Security
  - Maintains SECURITY DEFINER for controlled access
  - GRANT EXECUTE to authenticated users

  ## Notes
  - KPIs now reflect filtered data (Option B from requirements)
  - Status filter supports multiple values for normalization
  - Text filters use ILIKE for case-insensitive partial matching
  - Pagination limits validated (min 10, max 100)
  - 500ms debounce recommended on frontend for text filters
*/

-- Drop existing function
DROP FUNCTION IF EXISTS get_operacional_os_summary(date, date, uuid[]);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_ordem_servico_dt_abertura_empresa
  ON tbl_ordem_servico(dt_abertura_os, id_empresa);

CREATE INDEX IF NOT EXISTS idx_ordem_servico_status
  ON tbl_ordem_servico(status_os);

CREATE INDEX IF NOT EXISTS idx_ordem_servico_vendedor
  ON tbl_ordem_servico(ds_vendedor);

CREATE INDEX IF NOT EXISTS idx_ordem_servico_numero
  ON tbl_ordem_servico(numero_os);

-- Create the enhanced operacional OS summary function with pagination
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
  v_kpis json;
  v_lista_os json;
  v_total_count bigint;
  v_total_pages integer;
  v_offset integer;
  v_os_abertas bigint;
  v_os_entregues bigint;
  v_os_em_atraso bigint;
  v_faturamento_liquido_os numeric;
  v_filter_numero_os text;
  v_filter_status text;
  v_filter_etapa text;
  v_filter_vendedor text;
  v_filter_valor_min numeric;
  v_filter_valor_max numeric;
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
  v_filter_valor_min := (p_filters->>'valor_min')::numeric;
  v_filter_valor_max := (p_filters->>'valor_max')::numeric;

  -- Build filtered CTE
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
      -- Apply numero_os filter
      AND (v_filter_numero_os IS NULL OR numero_os::text ILIKE '%' || v_filter_numero_os || '%')
      -- Apply status filter with normalization (multiple values)
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
      -- Apply etapa filter
      AND (v_filter_etapa IS NULL OR ds_etapa_atual ILIKE '%' || v_filter_etapa || '%')
      -- Apply vendedor filter
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
      MAX(em_atraso) as em_atraso
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
      -- Apply valor filter on aggregated data
      (v_filter_valor_min IS NULL OR valor_total >= v_filter_valor_min)
      AND (v_filter_valor_max IS NULL OR valor_total <= v_filter_valor_max)
  )
  SELECT COUNT(*) INTO v_total_count FROM os_filtered_final;

  -- Calculate total pages
  v_total_pages := CEIL(v_total_count::numeric / p_limit::numeric)::integer;

  -- Calculate KPIs based on filtered data (Option B)
  SELECT
    COUNT(*) FILTER (
      WHERE LOWER(status_os) IN ('aberta', 'em andamento', 'pendente')
        AND NOT em_atraso
    ),
    COUNT(*) FILTER (
      WHERE LOWER(status_os) IN ('entregue', 'finalizada', 'concluída', 'entregues')
    ),
    COUNT(*) FILTER (WHERE em_atraso = true),
    COALESCE(SUM(valor_total), 0)
  INTO
    v_os_abertas,
    v_os_entregues,
    v_os_em_atraso,
    v_faturamento_liquido_os
  FROM os_filtered_final;

  -- Build KPIs JSON
  v_kpis := json_build_object(
    'os_abertas', v_os_abertas,
    'os_entregues', v_os_entregues,
    'os_em_atraso', v_os_em_atraso,
    'faturamento_liquido_os', v_faturamento_liquido_os
  );

  -- Get paginated and sorted OS list
  SELECT json_agg(row_data ORDER BY sort_value)
  INTO v_lista_os
  FROM (
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
    LIMIT p_limit
    OFFSET v_offset
  ) sorted_data;

  -- Build final result
  v_result := json_build_object(
    'kpis', v_kpis,
    'lista_os', COALESCE(v_lista_os, '[]'::json),
    'total_count', v_total_count,
    'current_page', p_page,
    'total_pages', GREATEST(1, v_total_pages)
  );

  RETURN v_result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_operacional_os_summary(date, date, uuid[], integer, integer, text, text, jsonb) TO authenticated;

-- Add comment
COMMENT ON FUNCTION get_operacional_os_summary IS 'Returns operational OS summary with server-side pagination, filtering, and sorting. KPIs are calculated based on filtered data. Supports dynamic WHERE clauses and ORDER BY for scalability.';
