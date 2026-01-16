/*
  # Add Comercial Indicators
  
  ## Summary
  Adds new KPIs and rankings to the commercial dashboard:
  - Índice de Desconto Médio (Average Discount Index)
  - Ranking de Descontos por Vendedor (Seller Discount Ranking)
  - Ranking de Recorrência de Clientes (Client Recurrence Ranking)
  
  ## Changes
  - Update `get_dashboard_consolidado` to include new calculations
  - Add `indice_desconto_medio` to KPIs
  - Add `ranking_descontos` for seller discount ranking
  - Add `ranking_recorrencia` for client recurrence ranking
*/

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
  v_ranking_descontos json;
  v_ranking_recorrencia json;
  v_faturamento_bruto numeric;
  v_faturamento_liquido numeric;
  v_total_vendas bigint;
  v_desconto_total numeric;
  v_itens_vendidos bigint;
  v_margem_global numeric;
  v_indice_desconto_medio numeric;
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
    v_indice_desconto_medio := 0;
  ELSE
    v_margem_global := ROUND((v_faturamento_liquido / v_faturamento_bruto * 100)::numeric, 2);
    -- Discount index calculated as (Bruto - Liquido) / Bruto * 100
    v_indice_desconto_medio := ROUND(((v_faturamento_bruto - v_faturamento_liquido) / v_faturamento_bruto * 100)::numeric, 2);
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
    'margem_global', v_margem_global,
    'indice_desconto_medio', v_indice_desconto_medio
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

  -- Get OS summary - using DISTINCT numero_os
  SELECT json_build_object(
    'os_abertas', COUNT(DISTINCT numero_os) FILTER (
      WHERE LOWER(status_os) IN ('aberta', 'em andamento', 'pendente')
    ),
    'os_entregues', COUNT(DISTINCT numero_os) FILTER (
      WHERE LOWER(status_os) IN ('entregue', 'finalizada', 'concluída')
    ),
    'os_em_atraso', COUNT(DISTINCT numero_os) FILTER (
      WHERE dt_previsao_entrega IS NOT NULL
        AND dt_entrega IS NULL
        AND DATE(dt_previsao_entrega) < CURRENT_DATE
    )
  )
  INTO v_resumo_os
  FROM tbl_ordem_servico
  WHERE
    DATE(dt_abertura_os) BETWEEN p_data_inicio AND p_data_fim
    AND id_empresa = ANY(p_empresa_ids);

  -- NEW: Ranking Descontos por Vendedor (Top 5)
  WITH desconto_vendedor AS (
    SELECT
      COALESCE(ds_vendedor, 'Sem Vendedor') as vendedor,
      COALESCE(SUM(item_valor_total_bruto - item_valor_total_liquido), 0) as desconto_total,
      COALESCE(SUM(item_valor_total_bruto), 0) as vendas_brutas
    FROM tbl_vendas
    WHERE
      DATE(data_venda) BETWEEN p_data_inicio AND p_data_fim
      AND id_empresa = ANY(p_empresa_ids)
    GROUP BY ds_vendedor
    HAVING SUM(item_valor_total_bruto - item_valor_total_liquido) > 0
    ORDER BY desconto_total DESC
    LIMIT 5
  )
  SELECT json_agg(
    json_build_object(
      'vendedor', vendedor,
      'desconto_total', desconto_total,
      'percentual', CASE
        WHEN vendas_brutas > 0
        THEN ROUND((desconto_total / vendas_brutas * 100)::numeric, 2)
        ELSE 0
      END
    )
    ORDER BY desconto_total DESC
  )
  INTO v_ranking_descontos
  FROM desconto_vendedor;

  -- NEW: Ranking Recorrência de Clientes (Clientes com > 1 compra)
  WITH recorrencia_clientes AS (
    SELECT
      COALESCE(ds_cliente, 'Cliente não identificado') as cliente,
      COUNT(DISTINCT numero_venda) as qtd_compras,
      COALESCE(SUM(item_valor_total_liquido), 0) as valor_total
    FROM tbl_vendas
    WHERE
      DATE(data_venda) BETWEEN p_data_inicio AND p_data_fim
      AND id_empresa = ANY(p_empresa_ids)
    GROUP BY ds_cliente
    HAVING COUNT(DISTINCT numero_venda) > 1
    ORDER BY qtd_compras DESC, valor_total DESC
    LIMIT 10
  )
  SELECT json_agg(
    json_build_object(
      'cliente', cliente,
      'qtd_compras', qtd_compras,
      'valor_total', valor_total
    )
    ORDER BY qtd_compras DESC, valor_total DESC
  )
  INTO v_ranking_recorrencia
  FROM recorrencia_clientes;

  -- Build final result
  v_result := json_build_object(
    'kpis', v_kpis,
    'tendencia', COALESCE(v_tendencia, '[]'::json),
    'top_vendedores', COALESCE(v_top_vendedores, '[]'::json),
    'formas_pagamento', COALESCE(v_formas_pagamento, '[]'::json),
    'resumo_os', v_resumo_os,
    'ranking_descontos', COALESCE(v_ranking_descontos, '[]'::json),
    'ranking_recorrencia', COALESCE(v_ranking_recorrencia, '[]'::json)
  );

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_dashboard_consolidado(date, date, uuid[]) TO authenticated;
COMMENT ON FUNCTION get_dashboard_consolidado IS 'Consolidates dashboard data with new discount and recurrence rankings.';
