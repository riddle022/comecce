/*
  # Fix Dashboard Consolidado - Nested Aggregates Error
  
  ## Summary
  Fixes the "aggregate function calls cannot be nested" error by calculating
  aggregate values separately before building the JSON object.
  
  ## Changes
  - Calculate faturamento_bruto and faturamento_liquido in separate variables first
  - Use these variables to calculate margem_global instead of nested SUM() calls
  
  ## Security
  - No changes to security or permissions
*/

-- Drop existing function
DROP FUNCTION IF EXISTS get_dashboard_consolidado(date, date, uuid[]);

-- Create the fixed dashboard consolidado function
CREATE OR REPLACE FUNCTION get_dashboard_consolidado(
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

  -- Get daily trend with both bruto and liquido values
  SELECT json_agg(
    json_build_object(
      'data', DATE(data_venda)::text,
      'valor_bruto', COALESCE(SUM(item_valor_total_bruto), 0),
      'valor_liquido', COALESCE(SUM(item_valor_total_liquido), 0)
    )
    ORDER BY DATE(data_venda)
  )
  INTO v_tendencia
  FROM tbl_vendas
  WHERE
    DATE(data_venda) BETWEEN p_data_inicio AND p_data_fim
    AND id_empresa = ANY(p_empresa_ids)
  GROUP BY DATE(data_venda);

  -- Get top 5 sellers
  SELECT json_agg(row_data ORDER BY valor DESC)
  INTO v_top_vendedores
  FROM (
    SELECT
      json_build_object(
        'vendedor', COALESCE(ds_vendedor, 'Sem Vendedor'),
        'valor', COALESCE(SUM(item_valor_total_liquido), 0),
        'vendas', COUNT(DISTINCT numero_venda)
      ) as row_data,
      COALESCE(SUM(item_valor_total_liquido), 0) as valor
    FROM tbl_vendas
    WHERE
      DATE(data_venda) BETWEEN p_data_inicio AND p_data_fim
      AND id_empresa = ANY(p_empresa_ids)
    GROUP BY ds_vendedor
    ORDER BY valor DESC
    LIMIT 5
  ) subq;

  -- Get payment methods distribution
  SELECT json_agg(row_data ORDER BY valor DESC)
  INTO v_formas_pagamento
  FROM (
    SELECT
      json_build_object(
        'forma', COALESCE(ds_forma_pagamento, 'Não Especificado'),
        'valor', COALESCE(SUM(item_valor_total_liquido), 0),
        'porcentagem', CASE
          WHEN v_faturamento_liquido > 0
          THEN ROUND((COALESCE(SUM(item_valor_total_liquido), 0) / v_faturamento_liquido * 100)::numeric, 1)
          ELSE 0
        END
      ) as row_data,
      COALESCE(SUM(item_valor_total_liquido), 0) as valor
    FROM tbl_vendas
    WHERE
      DATE(data_venda) BETWEEN p_data_inicio AND p_data_fim
      AND id_empresa = ANY(p_empresa_ids)
    GROUP BY ds_forma_pagamento
  ) subq;

  -- Get OS summary
  SELECT json_build_object(
    'os_abertas', COUNT(*) FILTER (
      WHERE LOWER(status_os) IN ('aberta', 'em andamento', 'pendente')
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

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_dashboard_consolidado(date, date, uuid[]) TO authenticated;

-- Add comment
COMMENT ON FUNCTION get_dashboard_consolidado IS 'Consolidates dashboard data including KPIs with margin, trends (bruto/liquido), top sellers, payment methods and OS summary for the specified period and companies';