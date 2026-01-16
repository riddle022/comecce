/*
  # Remove OS em Atraso Logic

  ## Summary
  Removes "OS em Atraso" (Overdue OS) logic from all database functions.
  Only keeps two OS states: Abertas (Open) and Entregues (Delivered).

  ## Changes
  1. Updates `get_dashboard_consolidado` function
     - Removes `os_em_atraso` from resumo_os calculation
     - Returns only os_abertas and os_entregues

  2. Updates `get_operacional_os_summary` function
     - Removes `os_em_atraso` from KPIs calculation
     - Removes `em_atraso` field from lista_os items

  ## Security
  - Maintains SECURITY DEFINER and search_path settings
  - Keeps all existing permissions
*/

-- Update get_dashboard_consolidado function to remove os_em_atraso
CREATE OR REPLACE FUNCTION get_dashboard_consolidado(
  p_data_inicio date,
  p_data_fim date,
  p_empresa_ids uuid[]
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_result json;
  v_kpis json;
  v_tendencia json;
  v_top_vendedores json;
  v_formas_pagamento json;
  v_resumo_os json;
  v_faturamento_bruto numeric;
  v_faturamento_liquido numeric;
  v_total_vendas bigint;
  v_desconto_total numeric;
  v_itens_vendidos bigint;
  v_margem_global numeric;
BEGIN
  -- Calculate aggregate values first to avoid nested aggregates
  SELECT
    COALESCE(SUM(item_valor_total_bruto), 0),
    COALESCE(SUM(item_valor_total_liquido), 0),
    COUNT(DISTINCT numero_venda),
    COALESCE(SUM(item_desconto_total), 0),
    COALESCE(SUM(item_nr_quantidade), 0)
  INTO
    v_faturamento_bruto,
    v_faturamento_liquido,
    v_total_vendas,
    v_desconto_total,
    v_itens_vendidos
  FROM tbl_vendas
  WHERE
    DATE(data_venda) BETWEEN p_data_inicio AND p_data_fim
    AND id_empresa = ANY(p_empresa_ids);

  -- Calculate margem_global from the variables
  IF v_faturamento_bruto = 0 THEN
    v_margem_global := 0;
  ELSE
    v_margem_global := ROUND((v_faturamento_liquido / v_faturamento_bruto * 100)::numeric, 2);
  END IF;

  -- Build KPIs JSON object
  v_kpis := json_build_object(
    'faturamento_bruto', v_faturamento_bruto,
    'faturamento_liquido', v_faturamento_liquido,
    'total_vendas', v_total_vendas,
    'ticket_medio', CASE
      WHEN v_total_vendas = 0 THEN 0
      ELSE ROUND((v_faturamento_liquido / v_total_vendas)::numeric, 2)
    END,
    'desconto_total', v_desconto_total,
    'itens_vendidos', v_itens_vendidos,
    'margem_global', v_margem_global
  );

  -- Get daily trend - calculate aggregates in subquery first
  WITH daily_totals AS (
    SELECT
      DATE(data_venda) as dia,
      COALESCE(SUM(item_valor_total_bruto), 0) as valor_bruto,
      COALESCE(SUM(item_valor_total_liquido), 0) as valor_liquido
    FROM tbl_vendas
    WHERE
      DATE(data_venda) BETWEEN p_data_inicio AND p_data_fim
      AND id_empresa = ANY(p_empresa_ids)
    GROUP BY DATE(data_venda)
  )
  SELECT json_agg(
    json_build_object(
      'data', dia::text,
      'valor_bruto', valor_bruto,
      'valor_liquido', valor_liquido
    )
    ORDER BY dia
  )
  INTO v_tendencia
  FROM daily_totals;

  -- Get top 5 sellers - calculate aggregates in subquery first
  WITH vendedor_totals AS (
    SELECT
      COALESCE(ds_vendedor, 'Sem Vendedor') as vendedor,
      COALESCE(SUM(item_valor_total_liquido), 0) as valor,
      COUNT(DISTINCT numero_venda) as vendas
    FROM tbl_vendas
    WHERE
      DATE(data_venda) BETWEEN p_data_inicio AND p_data_fim
      AND id_empresa = ANY(p_empresa_ids)
    GROUP BY ds_vendedor
    ORDER BY valor DESC
    LIMIT 5
  )
  SELECT json_agg(
    json_build_object(
      'vendedor', vendedor,
      'valor', valor,
      'vendas', vendas
    )
    ORDER BY valor DESC
  )
  INTO v_top_vendedores
  FROM vendedor_totals;

  -- Get payment methods distribution - calculate aggregates in subquery first
  WITH payment_totals AS (
    SELECT
      COALESCE(ds_forma_pagamento, 'Não Especificado') as forma,
      COALESCE(SUM(item_valor_total_liquido), 0) as valor
    FROM tbl_vendas
    WHERE
      DATE(data_venda) BETWEEN p_data_inicio AND p_data_fim
      AND id_empresa = ANY(p_empresa_ids)
    GROUP BY ds_forma_pagamento
  )
  SELECT json_agg(
    json_build_object(
      'forma', forma,
      'valor', valor,
      'porcentagem', CASE
        WHEN v_faturamento_liquido > 0
        THEN ROUND((valor / v_faturamento_liquido * 100)::numeric, 1)
        ELSE 0
      END
    )
    ORDER BY valor DESC
  )
  INTO v_formas_pagamento
  FROM payment_totals;

  -- Get OS summary - REMOVED os_em_atraso, only os_abertas and os_entregues
  SELECT json_build_object(
    'os_abertas', COUNT(DISTINCT numero_os) FILTER (
      WHERE LOWER(status_os) IN ('aberta', 'em andamento', 'pendente')
    ),
    'os_entregues', COUNT(DISTINCT numero_os) FILTER (
      WHERE LOWER(status_os) IN ('entregue', 'finalizada', 'concluída')
    )
  )
  INTO v_resumo_os
  FROM tbl_ordem_servico
  WHERE
    DATE(dt_abertura_os) BETWEEN p_data_inicio AND p_data_fim
    AND id_empresa = ANY(p_empresa_ids);

  -- Build final result
  v_result := json_build_object(
    'kpis', v_kpis,
    'tendencia', COALESCE(v_tendencia, '[]'::json),
    'top_vendedores', COALESCE(v_top_vendedores, '[]'::json),
    'formas_pagamento', COALESCE(v_formas_pagamento, '[]'::json),
    'resumo_os', v_resumo_os
  );

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_dashboard_consolidado(date, date, uuid[]) TO authenticated;
COMMENT ON FUNCTION get_dashboard_consolidado IS 'Consolidates dashboard data. Returns only os_abertas and os_entregues (removed os_em_atraso logic).';

-- Update get_operacional_os_summary function to remove atraso logic
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
  v_os_abertas bigint;
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

  -- Calculate OS KPIs - REMOVED os_em_atraso
  SELECT
    COUNT(*) FILTER (
      WHERE LOWER(status_os) IN ('aberta', 'em andamento', 'pendente')
    ),
    COUNT(*) FILTER (
      WHERE LOWER(status_os) IN ('entregue', 'finalizada', 'concluída', 'entregues')
    ),
    COALESCE(SUM(item_vl_total_liquido), 0)
  INTO
    v_os_abertas,
    v_os_entregues,
    v_faturamento_liquido_os
  FROM tbl_ordem_servico
  WHERE
    DATE(dt_abertura_os) BETWEEN p_data_inicio AND p_data_fim
    AND id_empresa = ANY(p_empresa_ids);

  -- Build KPIs JSON - REMOVED os_em_atraso
  v_kpis := json_build_object(
    'os_abertas', v_os_abertas,
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
        OR (v_status_filter = 'Aberta' AND LOWER(status_os) IN ('aberta', 'em andamento', 'pendente'))
        OR (v_status_filter = 'Entregue' AND LOWER(status_os) IN ('entregue', 'finalizada', 'concluída'))
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

  -- Build final result - REMOVED em_atraso from lista_os
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
COMMENT ON FUNCTION get_operacional_os_summary IS 'Returns operational OS summary with pagination, sorting, and filtering. Removed os_em_atraso and em_atraso logic.';