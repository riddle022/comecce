/*
  # Add Ranking de Funcionários to Operacional Function

  ## Summary
  Updates the get_operacional_os_summary function to include a ranking of employees
  by number of OS (service orders).

  ## Changes
  1. Adds ranking_funcionarios array to the return JSON
  2. Groups OS by ds_vendedor (employee/salesperson)
  3. Counts distinct OS per employee
  4. Orders by OS count descending
  5. Limits to top 10 employees

  ## New Return Structure
  - os_nao_entregues: Count of distinct OS not delivered
  - os_entregues: Count of distinct OS delivered
  - os_vendidas: Count of distinct OS sold
  - os_nao_vendidas: Count of distinct OS not sold
  - faturamento_liquido_os: Total liquid revenue
  - ranking_funcionarios: Array of top 10 employees by OS count

  ## Security
  - Maintains SECURITY DEFINER and search_path settings
  - Keeps all existing permissions
*/

-- Update get_operacional_os_summary to include ranking de funcionários
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
  v_ranking_funcionarios json;
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

  -- Get ranking de funcionários (top 10 by OS count)
  SELECT COALESCE(json_agg(ranking_data), '[]'::json)
  INTO v_ranking_funcionarios
  FROM (
    SELECT
      ds_vendedor as funcionario,
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
    'ranking_funcionarios', v_ranking_funcionarios
  );

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_operacional_os_summary(date, date, uuid[]) TO authenticated;
COMMENT ON FUNCTION get_operacional_os_summary IS 'Returns operational OS KPIs and ranking of employees by OS count.';