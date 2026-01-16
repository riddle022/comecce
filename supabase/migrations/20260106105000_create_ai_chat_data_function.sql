CREATE OR REPLACE FUNCTION get_ai_chat_data(
  p_data_inicio date,
  p_data_fim date,
  p_empresa_ids uuid[]
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result json;
  v_kpis json;
  v_tendencia json;
  v_top_vendedores json;
  v_formas_pagamento json;
  v_resumo_os json;
  v_vendas_detalhadas json;
  v_os_detalhadas json;
  v_faturamento_bruto numeric;
  v_faturamento_liquido numeric;
  v_total_vendas bigint;
  v_desconto_total numeric;
  v_itens_vendidos bigint;
  v_margem_global numeric;
BEGIN
  -- 1. KPIs Consolidatos (baseados no dashboard)
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

  IF v_faturamento_bruto = 0 THEN
    v_margem_global := 0;
  ELSE
    v_margem_global := ROUND((v_faturamento_liquido / v_faturamento_bruto * 100)::numeric, 2);
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
    'margem_global', v_margem_global
  );

  -- 2. Tendência Diária
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

  -- 3. Top Vendedores
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

  -- 4. Formas de Pagamento
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

  -- 5. Resumo OS
  SELECT json_build_object(
    'os_abertas', COUNT(*) FILTER (
      WHERE LOWER(status_os) IN ('aberta', 'em andamento', 'pendente', 'orçamento')
    ),
    'os_entregues', COUNT(*) FILTER (
      WHERE LOWER(status_os) IN ('entregue', 'finalizada', 'concluída')
    ),
    'os_em_atraso', COUNT(*) FILTER (
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

  -- 6. Vendas Detalhadas (Granularidade para IA)
  WITH detail_vendas AS (
    SELECT 
      numero_venda,
      data_venda,
      COALESCE(ds_cliente, 'Cliente não identificado') as cliente,
      COALESCE(ds_vendedor, 'Sem vendedor') as vendedor,
      item_valor_total_liquido as valor,
      ds_forma_pagamento as forma_pagamento
    FROM tbl_vendas
    WHERE
      DATE(data_venda) BETWEEN p_data_inicio AND p_data_fim
      AND id_empresa = ANY(p_empresa_ids)
    ORDER BY data_venda DESC
    LIMIT 100
  )
  SELECT json_agg(
    json_build_object(
      'id', numero_venda,
      'data', data_venda::text,
      'cliente', cliente,
      'vendedor', vendedor,
      'valor', valor,
      'pagamento', forma_pagamento
    )
  )
  INTO v_vendas_detalhadas
  FROM detail_vendas;

  -- 7. OS Detalhadas (Granularidade para IA)
  WITH detail_os AS (
    SELECT 
      numero_os,
      dt_abertura_os,
      status_os,
      ds_etapa_atual,
      dt_previsao_entrega,
      item_ds_descricao,
      item_valor_total_liquido as valor
    FROM tbl_ordem_servico
    WHERE
      DATE(dt_abertura_os) BETWEEN p_data_inicio AND p_data_fim
      AND id_empresa = ANY(p_empresa_ids)
    ORDER BY dt_abertura_os DESC
    LIMIT 100
  )
  SELECT json_agg(
    json_build_object(
      'id', numero_os,
      'data_abertura', dt_abertura_os::text,
      'status', status_os,
      'etapa', ds_etapa_atual,
      'previsao', dt_previsao_entrega::text,
      'descricao', item_ds_descricao,
      'valor', valor
    )
  )
  INTO v_os_detalhadas
  FROM detail_os;

  -- Build final result
  v_result := json_build_object(
    'kpis', v_kpis,
    'tendencia', COALESCE(v_tendencia, '[]'::json),
    'top_vendedores', COALESCE(v_top_vendedores, '[]'::json),
    'formas_pagamento', COALESCE(v_formas_pagamento, '[]'::json),
    'resumo_os', v_resumo_os,
    'historico_vendas', COALESCE(v_vendas_detalhadas, '[]'::json),
    'detalhes_os', COALESCE(v_os_detalhadas, '[]'::json)
  );

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_ai_chat_data(date, date, uuid[]) TO authenticated;
