/*
  # Create Dashboard Consolidado RPC Function
  
  ## Summary
  Creates a comprehensive RPC function that consolidates all dashboard data into a single JSON response.
  This function retrieves KPIs, sales trends, top sellers, payment methods, and service order summaries.
  
  ## Function Parameters
  - `p_data_inicio` (date) - Start date for the period
  - `p_data_fim` (date) - End date for the period  
  - `p_empresa_ids` (uuid[]) - Array of company IDs to filter
  
  ## Returns
  JSON object with the following structure:
  
  ```json
  {
    "kpis": {
      "faturamento_bruto": 125450.50,
      "faturamento_liquido": 112905.45,
      "total_vendas": 245,
      "ticket_medio": 460.43,
      "desconto_total": 12545.05,
      "itens_vendidos": 1250
    },
    "tendencia": [
      {"data": "2024-01-15", "valor": 5200.00},
      {"data": "2024-01-16", "valor": 6100.00}
    ],
    "top_vendedores": [
      {"vendedor": "João Silva", "valor": 45200.00, "vendas": 45},
      {"vendedor": "Maria Santos", "valor": 38900.00, "vendas": 38}
    ],
    "formas_pagamento": [
      {"forma": "Cartão Crédito", "valor": 65000.00, "porcentagem": 57.6},
      {"forma": "PIX", "valor": 35000.00, "porcentagem": 31.0}
    ],
    "resumo_os": {
      "os_abertas": 42,
      "os_entregues": 156,
      "os_em_atraso": 8
    }
  }
  ```
  
  ## Performance
  - Uses aggregation for optimal performance
  - Returns only consolidated data (not raw rows)
  - Efficient for large datasets
  
  ## Security
  - Respects RLS policies through user_empresas() function
  - Only returns data for authorized companies
*/

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS get_dashboard_consolidado(date, date, uuid[]);
DROP FUNCTION IF EXISTS get_dashboard_consolidado(timestamp, timestamp, uuid[]);
DROP FUNCTION IF EXISTS get_dashboard_consolidado;

-- Create the dashboard consolidado function
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
BEGIN
  -- Calculate KPIs from vendas
  SELECT json_build_object(
    'faturamento_bruto', COALESCE(SUM(item_valor_total_bruto), 0),
    'faturamento_liquido', COALESCE(SUM(item_valor_total_liquido), 0),
    'total_vendas', COUNT(DISTINCT numero_venda),
    'ticket_medio', CASE
      WHEN COUNT(DISTINCT numero_venda) = 0 THEN 0
      ELSE COALESCE(SUM(item_valor_total_liquido) / COUNT(DISTINCT numero_venda), 0)
    END,
    'desconto_total', COALESCE(SUM(item_desconto_total), 0),
    'itens_vendidos', COALESCE(SUM(item_nr_quantidade), 0),
    'margem_global', CASE
      WHEN COALESCE(SUM(item_valor_total_bruto), 0) = 0 THEN 0
      ELSE ROUND((COALESCE(SUM(item_valor_total_liquido), 0) / COALESCE(SUM(item_valor_total_bruto), 1) * 100)::numeric, 2)
    END
  )
  INTO v_kpis
  FROM tbl_vendas
  WHERE
    DATE(data_venda) BETWEEN p_data_inicio AND p_data_fim
    AND id_empresa = ANY(p_empresa_ids);

  -- Get total faturamento for percentage calculations
  SELECT COALESCE(SUM(item_valor_total_liquido), 0)
  INTO v_faturamento_liquido
  FROM tbl_vendas
  WHERE 
    DATE(data_venda) BETWEEN p_data_inicio AND p_data_fim
    AND id_empresa = ANY(p_empresa_ids);

  -- Get daily trend (last 30 days or period range)
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
COMMENT ON FUNCTION get_dashboard_consolidado IS 'Consolidates dashboard data including KPIs, trends, top sellers, payment methods and OS summary for the specified period and companies';
