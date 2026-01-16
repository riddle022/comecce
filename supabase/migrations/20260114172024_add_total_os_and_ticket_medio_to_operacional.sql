/*
  # Add Total OS and Ticket Médio to Operacional Summary
  
  ## Summary
  Enhances the get_operacional_os_summary function to include:
  - Total volume of distinct OS (total_os)
  - Average ticket per OS (ticket_medio_os)
  
  ## Changes
  1. Adds total_os field - total count of distinct OS numbers
  2. Adds ticket_medio_os field - calculated as faturamento_liquido_os / total_os
  3. Maintains all existing functionality and fields
  
  ## Fields Added
  - `total_os`: Total number of distinct service orders
  - `ticket_medio_os`: Average revenue per service order
  
  ## Security
  - Maintains SECURITY DEFINER and search_path settings
  - Keeps all existing permissions
*/

CREATE OR REPLACE FUNCTION get_operacional_os_summary(
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
  v_os_nao_entregues bigint;
  v_os_entregues bigint;
  v_os_vendidas bigint;
  v_os_nao_vendidas bigint;
  v_total_os bigint;
  v_faturamento_liquido_os numeric;
  v_ticket_medio_os numeric;
  v_ranking_vendedores json;
  v_ranking_grupos json;
BEGIN
  -- Calculate OS KPIs - Count DISTINCT OS numbers
  SELECT
    COUNT(DISTINCT numero_os) FILTER (
      WHERE status_os = 'Não Entregue'
    ),
    COUNT(DISTINCT numero_os) FILTER (
      WHERE status_os = 'Entregue'
    ),
    COUNT(DISTINCT numero_os) FILTER (
      WHERE status_da_venda = 'Vendido'
    ),
    COUNT(DISTINCT numero_os) FILTER (
      WHERE status_da_venda = 'Não Vendido'
    ),
    COUNT(DISTINCT numero_os),
    COALESCE(SUM(COALESCE(item_vl_total_liquido, item_vl_unitario, 0)), 0)
  INTO
    v_os_nao_entregues,
    v_os_entregues,
    v_os_vendidas,
    v_os_nao_vendidas,
    v_total_os,
    v_faturamento_liquido_os
  FROM tbl_ordem_servico
  WHERE
    DATE(dt_abertura_os) BETWEEN p_data_inicio AND p_data_fim
    AND id_empresa = ANY(p_empresa_ids);

  -- Calculate ticket médio
  IF v_total_os > 0 THEN
    v_ticket_medio_os := v_faturamento_liquido_os / v_total_os;
  ELSE
    v_ticket_medio_os := 0;
  END IF;

  -- Get ranking de vendedores (top 10 by OS count)
  SELECT COALESCE(json_agg(ranking_data), '[]'::json)
  INTO v_ranking_vendedores
  FROM (
    SELECT
      ds_vendedor as vendedor,
      COUNT(DISTINCT numero_os) as total_os,
      SUM(item_vl_total_liquido) as valor_total
    FROM tbl_ordem_servico
    WHERE
      DATE(dt_abertura_os) BETWEEN p_data_inicio AND p_data_fim
      AND id_empresa = ANY(p_empresa_ids)
      AND ds_vendedor IS NOT NULL
      AND ds_vendedor != ''
    GROUP BY ds_vendedor
    ORDER BY COUNT(DISTINCT numero_os) DESC
    LIMIT 10
  ) ranking_data;

  -- Get ranking de grupos (top groups by OS count)
  SELECT COALESCE(json_agg(ranking_data), '[]'::json)
  INTO v_ranking_grupos
  FROM (
    SELECT
      item_ds_grupo as grupo,
      COUNT(DISTINCT numero_os) as total_os,
      SUM(item_vl_total_liquido) as valor_total
    FROM tbl_ordem_servico
    WHERE
      DATE(dt_abertura_os) BETWEEN p_data_inicio AND p_data_fim
      AND id_empresa = ANY(p_empresa_ids)
      AND item_ds_grupo IS NOT NULL
      AND item_ds_grupo != ''
    GROUP BY item_ds_grupo
    ORDER BY COUNT(DISTINCT numero_os) DESC
  ) ranking_data;

  -- Build result JSON with KPIs and ranking
  v_result := json_build_object(
    'os_nao_entregues', v_os_nao_entregues,
    'os_entregues', v_os_entregues,
    'os_vendidas', v_os_vendidas,
    'os_nao_vendidas', v_os_nao_vendidas,
    'total_os', v_total_os,
    'faturamento_liquido_os', v_faturamento_liquido_os,
    'ticket_medio_os', v_ticket_medio_os,
    'ranking_vendedores', v_ranking_vendedores,
    'ranking_grupos', v_ranking_grupos
  );

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_operacional_os_summary(date, date, uuid[]) TO authenticated;
COMMENT ON FUNCTION get_operacional_os_summary IS 'Returns operational OS KPIs including total volume, average ticket, and ranking of salespeople by OS count.';