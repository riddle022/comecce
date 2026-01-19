-- Create get_performance_vendedores RPC
CREATE OR REPLACE FUNCTION get_performance_vendedores(
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
BEGIN
  SELECT COALESCE(json_agg(vend_data), '[]'::json)
  INTO v_result
  FROM (
    SELECT
      COALESCE(ds_vendedor, 'Sem Vendedor') as vendedor,
      COALESCE(SUM(item_valor_total_liquido), 0) as faturamento,
      COALESCE(SUM(item_nr_quantidade), 0) as quantidade_vendida,
      COALESCE(SUM(item_desconto_total), 0) as total_desconto,
      CASE 
        WHEN COUNT(DISTINCT numero_venda) > 0 THEN 
          COALESCE(SUM(item_valor_total_liquido), 0) / NULLIF(COUNT(DISTINCT numero_venda), 0)
        ELSE 0 
      END as ticket_medio
    FROM tbl_vendas
    WHERE
      DATE(data_venda) BETWEEN p_data_inicio AND p_data_fim
      AND id_empresa = ANY(p_empresa_ids)
    GROUP BY ds_vendedor
    ORDER BY faturamento DESC
  ) vend_data;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_performance_vendedores(date, date, uuid[]) TO authenticated;
