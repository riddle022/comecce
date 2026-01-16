/*
  # Create Operacional OS Summary Function
  
  ## Summary
  Creates a database function to retrieve operational OS (Ordem de Serviço) summary data
  for the Operacional page dashboard.
  
  ## Changes
  1. New Function: `get_operacional_os_summary`
     - Parameters: p_data_inicio (date), p_data_fim (date), p_empresa_ids (uuid[])
     - Returns JSON with:
       - kpis: os_abertas, os_entregues, os_em_atraso, faturamento_liquido_os
       - lista_os: Array with detailed OS information (numero_os, status, etapa, dates, valor_total)
  
  ## Security
  - SECURITY DEFINER for controlled access
  - GRANT EXECUTE to authenticated users
  
  ## Notes
  - Filters OS by opening date within the specified date range
  - Calculates os_em_atraso based on dt_previsao_entrega vs current date
  - Includes detailed OS list for optional display
  - Uses CTEs to avoid nested aggregates
*/

-- Create the operacional OS summary function
CREATE OR REPLACE FUNCTION get_operacional_os_summary(
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
  v_lista_os json;
  v_os_abertas bigint;
  v_os_entregues bigint;
  v_os_em_atraso bigint;
  v_faturamento_liquido_os numeric;
BEGIN
  -- Calculate OS KPIs
  SELECT 
    COUNT(*) FILTER (
      WHERE LOWER(status_os) IN ('aberta', 'em andamento', 'pendente')
    ),
    COUNT(*) FILTER (
      WHERE LOWER(status_os) IN ('entregue', 'finalizada', 'concluída', 'entregues')
    ),
    COUNT(*) FILTER (
      WHERE dt_previsao_entrega IS NOT NULL
        AND dt_entrega IS NULL
        AND DATE(dt_previsao_entrega) < CURRENT_DATE
    ),
    COALESCE(SUM(item_vl_total_liquido), 0)
  INTO 
    v_os_abertas,
    v_os_entregues,
    v_os_em_atraso,
    v_faturamento_liquido_os
  FROM tbl_ordem_servico
  WHERE
    DATE(dt_abertura_os) BETWEEN p_data_inicio AND p_data_fim
    AND id_empresa = ANY(p_empresa_ids);

  -- Build KPIs JSON
  v_kpis := json_build_object(
    'os_abertas', v_os_abertas,
    'os_entregues', v_os_entregues,
    'os_em_atraso', v_os_em_atraso,
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
    GROUP BY 
      numero_os, id_empresa, dt_abertura_os, status_os, 
      status_da_venda, ds_etapa_atual, dt_previsao_entrega, 
      dt_entrega, ds_vendedor
    ORDER BY dt_abertura_os DESC
    LIMIT 100
  )
  SELECT json_agg(
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
      'em_atraso', CASE
        WHEN dt_previsao_entrega IS NOT NULL
          AND dt_entrega IS NULL
          AND DATE(dt_previsao_entrega) < CURRENT_DATE
        THEN true
        ELSE false
      END
    )
    ORDER BY dt_abertura_os DESC
  )
  INTO v_lista_os
  FROM os_aggregated;

  -- Build final result
  v_result := json_build_object(
    'kpis', v_kpis,
    'lista_os', COALESCE(v_lista_os, '[]'::json)
  );

  RETURN v_result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_operacional_os_summary(date, date, uuid[]) TO authenticated;

-- Add comment
COMMENT ON FUNCTION get_operacional_os_summary IS 'Returns operational OS summary with KPIs (os_abertas, os_entregues, os_em_atraso, faturamento_liquido_os) and detailed OS list for the specified period and companies';
