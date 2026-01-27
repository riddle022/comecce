-- Migration: Comprehensive Dashboard RPC Fix
-- Description: Aligns OS counts, fixes column names, and ensures all financial KPIs (CMV, Profit, Margin) are returned correctly

CREATE OR REPLACE FUNCTION public.get_dashboard_consolidado(
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
  v_custo_total numeric;
  v_lucro_bruto numeric;
  v_margem_lucro_media numeric;
  v_top_produtos json;
  v_top_grupos json;
BEGIN
  -- 1. KPI Aggregates
  SELECT 
    COALESCE(SUM(item_valor_total_bruto), 0),
    COALESCE(SUM(item_valor_total_liquido), 0),
    COUNT(DISTINCT numero_venda),
    COALESCE(SUM(item_desconto_total), 0),
    COALESCE(SUM(item_nr_quantidade), 0),
    COALESCE(SUM(item_vl_custo_unitario * item_nr_quantidade), 0)
  INTO 
    v_faturamento_bruto,
    v_faturamento_liquido,
    v_total_vendas,
    v_desconto_total,
    v_itens_vendidos,
    v_custo_total
  FROM tbl_vendas
  WHERE
    DATE(data_venda) BETWEEN p_data_inicio AND p_data_fim
    AND id_empresa = ANY(p_empresa_ids);

  IF v_faturamento_bruto = 0 THEN
    v_margem_global := 0;
    v_indice_desconto_medio := 0;
  ELSE
    v_margem_global := ROUND((v_faturamento_liquido / v_faturamento_bruto * 100)::numeric, 2);
    v_indice_desconto_medio := ROUND(((v_faturamento_bruto - v_faturamento_liquido) / v_faturamento_bruto * 100)::numeric, 2);
  END IF;

  v_lucro_bruto := v_faturamento_liquido - v_custo_total;
  
  IF v_faturamento_liquido = 0 THEN
    v_margem_lucro_media := 0;
  ELSE
    v_margem_lucro_media := ROUND((v_lucro_bruto / v_faturamento_liquido * 100)::numeric, 2);
  END IF;

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
    'indice_desconto_medio', v_indice_desconto_medio,
    'custo_total', v_custo_total,
    'lucro_bruto', v_lucro_bruto,
    'margem_lucro_media', v_margem_lucro_media
  );

  -- 2. Daily Trend
  WITH daily_totals AS (
    SELECT
      DATE(data_venda) as dia,
      COALESCE(SUM(item_valor_total_bruto), 0) as valor_bruto,
      COALESCE(SUM(item_valor_total_liquido), 0) as valor_liquido,
      COALESCE(SUM(item_nr_quantidade), 0) as cantidad_vendida,
      COALESCE(SUM(item_desconto_total), 0) as desc_total,
      COALESCE(SUM(item_vl_custo_unitario * item_nr_quantidade), 0) as c_total,
      COUNT(DISTINCT numero_venda) as n_vendas
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
      'valor_liquido', valor_liquido,
      'quantidade_vendida', cantidad_vendida,
      'desconto_total', desc_total,
      'custo_total', c_total,
      'numero_vendas', n_vendas
    )
    ORDER BY dia
  )
  INTO v_tendencia
  FROM daily_totals;

  -- 3. Top 5 Sellers
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

  -- 4. Payment Methods Distribution
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

  -- 5. OS Summary
  WITH vendidas AS (
    SELECT DISTINCT numero_os, id_empresa
    FROM tbl_vendas
    WHERE DATE(data_venda) BETWEEN p_data_inicio AND p_data_fim
      AND id_empresa = ANY(p_empresa_ids)
      AND numero_os > 0
  )
  SELECT json_build_object(
    'os_nao_entregues', (SELECT COUNT(*) FROM vendidas) - COUNT(DISTINCT os.numero_os) FILTER (WHERE os.status_os = 'Entregue'),
    'os_entregues', COUNT(DISTINCT os.numero_os) FILTER (WHERE os.status_os = 'Entregue')
  )
  INTO v_resumo_os
  FROM tbl_ordem_servico os
  INNER JOIN vendidas v ON os.numero_os = v.numero_os AND os.id_empresa = v.id_empresa;

  -- 6. Top 5 Products
  WITH produto_totals AS (
    SELECT
      COALESCE(item_ds_descricao, 'Sem Produto') as producto,
      COALESCE(SUM(item_valor_total_liquido), 0) as valor,
      COALESCE(SUM(item_nr_quantidade), 0) as cantidad
    FROM tbl_vendas
    WHERE
      DATE(data_venda) BETWEEN p_data_inicio AND p_data_fim
      AND id_empresa = ANY(p_empresa_ids)
    GROUP BY item_ds_descricao
    ORDER BY valor DESC
    LIMIT 5
  )
  SELECT json_agg(
    json_build_object(
      'produto', producto,
      'valor', valor,
      'quantidade', cantidad
    )
    ORDER BY valor DESC
  )
  INTO v_top_produtos
  FROM produto_totals;

  -- 7. Top 5 Groups
  WITH grupo_totals AS (
    SELECT
      COALESCE(item_ds_grupo, 'Sem Grupo') as grupo,
      COALESCE(SUM(item_valor_total_liquido), 0) as valor,
      COALESCE(SUM(item_nr_quantidade), 0) as cantidad
    FROM tbl_vendas
    WHERE
      DATE(data_venda) BETWEEN p_data_inicio AND p_data_fim
      AND id_empresa = ANY(p_empresa_ids)
    GROUP BY item_ds_grupo
    ORDER BY valor DESC
    LIMIT 5
  )
  SELECT json_agg(
    json_build_object(
      'grupo', grupo,
      'valor', valor,
      'quantidade', cantidad
    )
    ORDER BY valor DESC
  )
  INTO v_top_grupos
  FROM grupo_totals;

  -- 8. Ranking Descontos
  WITH desconto_vendedor AS (
    SELECT
      COALESCE(ds_vendedor, 'Sem Vendedor') as vendedor,
      COALESCE(SUM(item_valor_total_bruto - item_valor_total_liquido), 0) as total_desc,
      COALESCE(SUM(item_valor_total_bruto), 0) as v_brutas
    FROM tbl_vendas
    WHERE
      DATE(data_venda) BETWEEN p_data_inicio AND p_data_fim
      AND id_empresa = ANY(p_empresa_ids)
    GROUP BY ds_vendedor
    HAVING SUM(item_valor_total_bruto - item_valor_total_liquido) > 0
    ORDER BY total_desc DESC
    LIMIT 5
  )
  SELECT json_agg(
    json_build_object(
      'vendedor', vendedor,
      'desconto_total', total_desc,
      'percentual', CASE
        WHEN v_brutas > 0
        THEN ROUND((total_desc / v_brutas * 100)::numeric, 2)
        ELSE 0
      END
    )
    ORDER BY total_desc DESC
  )
  INTO v_ranking_descontos
  FROM desconto_vendedor;

  -- 9. Ranking Recorrência
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

  -- 10. Build final result
  v_result := json_build_object(
    'kpis', v_kpis,
    'tendencia', COALESCE(v_tendencia, '[]'::json),
    'top_vendedores', COALESCE(v_top_vendedores, '[]'::json),
    'top_produtos', COALESCE(v_top_produtos, '[]'::json),
    'top_grupos', COALESCE(v_top_grupos, '[]'::json),
    'formas_pagamento', COALESCE(v_formas_pagamento, '[]'::json),
    'resumo_os', v_resumo_os,
    'ranking_descontos', COALESCE(v_ranking_descontos, '[]'::json),
    'ranking_recorrencia', COALESCE(v_ranking_recorrencia, '[]'::json)
  );

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_dashboard_consolidado(date, date, uuid[]) TO authenticated, anon, service_role;
