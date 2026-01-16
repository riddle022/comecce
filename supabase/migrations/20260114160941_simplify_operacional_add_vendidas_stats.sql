/*
  # Simplify Operacional Function and Add OS Vendidas Stats

  ## Summary
  Simplifies the operacional function to return only KPIs (no detailed list).
  Adds new KPI metrics for OS Vendidas and OS Não Vendidas.

  ## Changes
  1. Drops the old function with 8 parameters (pagination, sorting, filtering)
  2. Creates new simplified function with only 3 parameters (dates and empresa_ids)
  3. Adds os_vendidas count (COUNT DISTINCT numero_os WHERE status_da_venda = 'Vendido')
  4. Adds os_nao_vendidas count (COUNT DISTINCT numero_os WHERE status_da_venda = 'Não Vendido')
  5. Simplifies return to only include KPIs

  ## New KPIs
  - os_nao_entregues: Count of distinct OS with status "Não Entregue"
  - os_entregues: Count of distinct OS with status "Entregue"
  - os_vendidas: Count of distinct OS with status_da_venda "Vendido"
  - os_nao_vendidas: Count of distinct OS with status_da_venda "Não Vendido"
  - faturamento_liquido_os: Sum of all item values

  ## Security
  - Maintains SECURITY DEFINER and search_path settings
  - Keeps all existing permissions
*/

-- Drop the old function with pagination parameters
DROP FUNCTION IF EXISTS get_operacional_os_summary(date, date, uuid[], integer, integer, text, text, jsonb);

-- Create new simplified function with only KPIs
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

  -- Build result JSON with KPIs only
  v_result := json_build_object(
    'os_nao_entregues', v_os_nao_entregues,
    'os_entregues', v_os_entregues,
    'os_vendidas', v_os_vendidas,
    'os_nao_vendidas', v_os_nao_vendidas,
    'faturamento_liquido_os', v_faturamento_liquido_os
  );

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_operacional_os_summary(date, date, uuid[]) TO authenticated;
COMMENT ON FUNCTION get_operacional_os_summary IS 'Returns operational OS KPIs only. Counts distinct OS numbers for all metrics.';