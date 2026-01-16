/*
  # Fix Operacional OS Count to Count Distinct OS

  ## Summary
  Fixes the operacional KPIs to count distinct OS numbers instead of counting every item.
  Each OS can have multiple items, but should be counted as a single OS.

  ## Changes
  Updates `get_operacional_os_summary` function:
  - Changes `COUNT(*)` to `COUNT(DISTINCT numero_os)` for os_nao_entregues
  - Changes `COUNT(*)` to `COUNT(DISTINCT numero_os)` for os_entregues
  - Keeps the SUM for faturamento_liquido_os unchanged

  ## Impact
  - KPI cards will now show the correct count of unique OS (not item count)
  - The OS list table already counts correctly and remains unchanged
  
  ## Security
  - Maintains SECURITY DEFINER and search_path settings
  - Keeps all existing permissions
*/

-- Update get_operacional_os_summary to count distinct OS numbers
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
SET search_path = public, pg_temp
AS $$
DECLARE
  v_result json;
  v_kpis json;
  v_lista_os json;
  v_os_nao_entregues bigint;
  v_os_entregues bigint;
  v_faturamento_liquido_os numeric;
  v_total_count bigint;
  v_offset integer;
  v_total_pages integer;
  v_status_filter text;
BEGIN
  -- Calculate offset
  v_offset := (p_page - 1) * p_limit;

  -- Extract status filter if provided
  v_status_filter := p_filters->>'status_os';

  -- Calculate OS KPIs - Count DISTINCT OS numbers
  SELECT
    COUNT(DISTINCT numero_os) FILTER (
      WHERE status_os = 'Não Entregue'
    ),
    COUNT(DISTINCT numero_os) FILTER (
      WHERE status_os = 'Entregue'
    ),
    COALESCE(SUM(item_vl_total_liquido), 0)
  INTO
    v_os_nao_entregues,
    v_os_entregues,
    v_faturamento_liquido_os
  FROM tbl_ordem_servico
  WHERE
    DATE(dt_abertura_os) BETWEEN p_data_inicio AND p_data_fim
    AND id_empresa = ANY(p_empresa_ids);

  -- Build KPIs JSON
  v_kpis := json_build_object(
    'os_nao_entregues', v_os_nao_entregues,
    'os_entregues', v_os_entregues,
    'faturamento_liquido_os', v_faturamento_liquido_os
  );

  -- Get detailed OS list with aggregated values per OS
  WITH os_aggregated AS (
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
      SUM(COALESCE(item_nr_quantidade, 0)) as quantidade_total
    FROM tbl_ordem_servico
    WHERE
      DATE(dt_abertura_os) BETWEEN p_data_inicio AND p_data_fim
      AND id_empresa = ANY(p_empresa_ids)
      AND (
        v_status_filter IS NULL
        OR v_status_filter = ''
        OR (v_status_filter = 'Não Entregue' AND status_os = 'Não Entregue')
        OR (v_status_filter = 'Entregue' AND status_os = 'Entregue')
      )
    GROUP BY
      numero_os, id_empresa, dt_abertura_os, status_os,
      status_da_venda, ds_etapa_atual, dt_previsao_entrega,
      dt_entrega, ds_vendedor
  ),
  os_counted AS (
    SELECT COUNT(*) as total FROM os_aggregated
  ),
  os_paginated AS (
    SELECT
      numero_os,
      status_os,
      status_da_venda,
      ds_etapa_atual,
      dt_abertura_os,
      dt_previsao_entrega,
      dt_entrega,
      ds_vendedor,
      valor_total,
      quantidade_total
    FROM os_aggregated
    ORDER BY
      CASE WHEN p_sort_by = 'dt_abertura_os' AND p_sort_order = 'DESC' THEN dt_abertura_os END DESC NULLS LAST,
      CASE WHEN p_sort_by = 'dt_abertura_os' AND p_sort_order = 'ASC' THEN dt_abertura_os END ASC NULLS LAST,
      CASE WHEN p_sort_by = 'numero_os' AND p_sort_order = 'ASC' THEN numero_os END ASC NULLS LAST,
      CASE WHEN p_sort_by = 'numero_os' AND p_sort_order = 'DESC' THEN numero_os END DESC NULLS LAST,
      CASE WHEN p_sort_by = 'valor_total' AND p_sort_order = 'ASC' THEN valor_total END ASC NULLS LAST,
      CASE WHEN p_sort_by = 'valor_total' AND p_sort_order = 'DESC' THEN valor_total END DESC NULLS LAST
    OFFSET v_offset
    LIMIT p_limit
  )
  SELECT
    json_agg(
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
        'quantidade_total', quantidade_total
      )
    ),
    (SELECT total FROM os_counted)
  INTO v_lista_os, v_total_count
  FROM os_paginated;

  -- Calculate total pages
  v_total_pages := CEIL(COALESCE(v_total_count, 0)::numeric / p_limit);

  -- Build final result
  v_result := json_build_object(
    'kpis', v_kpis,
    'lista_os', COALESCE(v_lista_os, '[]'::json),
    'total_count', COALESCE(v_total_count, 0),
    'current_page', p_page,
    'total_pages', COALESCE(v_total_pages, 0)
  );

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_operacional_os_summary(date, date, uuid[], integer, integer, text, text, jsonb) TO authenticated;
COMMENT ON FUNCTION get_operacional_os_summary IS 'Returns operational OS summary with pagination, sorting, and filtering. Counts distinct OS numbers in KPIs.';