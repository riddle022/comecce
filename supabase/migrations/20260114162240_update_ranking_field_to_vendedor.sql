/*
  # Update Ranking Field Name from Funcionario to Vendedor

  ## Summary
  Updates the get_operacional_os_summary function to use "vendedor" instead of 
  "funcionario" in the ranking data for better semantic clarity.

  ## Changes
  1. Changes field name from "funcionario" to "vendedor" in ranking output
  2. Maintains all existing functionality and permissions
  3. No schema changes - only field naming update

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
  v_faturamento_liquido_os numeric;
  v_ranking_vendedores json;
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
    COALESCE(SUM(item_vl_total_liquido), 0)
  INTO
    v_os_nao_entregues,
    v_os_entregues,
    v_os_vendidas,
    v_os_nao_vendidas,
    v_faturamento_liquido_os
  FROM tbl_ordem_servico
  WHERE
    DATE(dt_abertura_os) BETWEEN p_data_inicio AND p_data_fim
    AND id_empresa = ANY(p_empresa_ids);

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

  -- Build result JSON with KPIs and ranking
  v_result := json_build_object(
    'os_nao_entregues', v_os_nao_entregues,
    'os_entregues', v_os_entregues,
    'os_vendidas', v_os_vendidas,
    'os_nao_vendidas', v_os_nao_vendidas,
    'faturamento_liquido_os', v_faturamento_liquido_os,
    'ranking_vendedores', v_ranking_vendedores
  );

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_operacional_os_summary(date, date, uuid[]) TO authenticated;
COMMENT ON FUNCTION get_operacional_os_summary IS 'Returns operational OS KPIs and ranking of salespeople by OS count.';