/*
  # Create get_produtos_dashboard RPC Function
  
  ## Summary
  Creates a new function `get_produtos_dashboard` to return KPIs and tables for the Products Dashboard.
  
  ## KPIs Calculated
  - Produtos Vendidos (qty): Sum of item_nr_quantidade
  - Lucro Bruto Total: Sum of (Revenue - Cost)
  - Custo Total CMV: Sum of Cost
  - Margem de Lucro Média (%): (Total Profit / Total Revenue) * 100
  - Margem Bruta (Valor): Same as Total Gross Profit
  - Margem Bruta (%): Same as Average Profit Margin
  
  ## Tables
  - performance_produtos: Grouped by item_ds_descricao/referencia
  - performance_grupos: Grouped by item_ds_grupo
  - produtos_por_vendedor: All products filtered by date/company (client filters by seller)
  
  ## Notes
  - Uses `tbl_vendas`
  - Revenue = `item_valor_total_liquido`
  - Cost = `item_vl_custo_unitario` * `item_nr_quantidade`
  - Handles division by zero for margins
*/

CREATE OR REPLACE FUNCTION get_produtos_dashboard(
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
  -- KPI Variables
  v_produtos_vendidos bigint;
  v_faturamento_total numeric;
  v_custo_total numeric;
  v_desconto_total numeric;
  v_lucro_bruto_total numeric;
  v_margem_lucro_media numeric;
  
  -- Tables Variables
  v_performance_produtos json;
  v_performance_grupos json;
  v_produtos_por_vendedor json;
BEGIN
  -- 1. Calculate Aggregated KPIs
  SELECT
    COALESCE(SUM(item_nr_quantidade), 0),
    COALESCE(SUM(item_valor_total_liquido), 0),
    COALESCE(SUM(COALESCE(item_vl_custo_unitario, 0) * item_nr_quantidade), 0),
    COALESCE(SUM(item_desconto_total), 0)
  INTO
    v_produtos_vendidos,
    v_faturamento_total,
    v_custo_total,
    v_desconto_total
  FROM tbl_vendas
  WHERE
    DATE(data_venda) BETWEEN p_data_inicio AND p_data_fim
    AND id_empresa = ANY(p_empresa_ids);

  -- Calculate Derived KPIs
  v_lucro_bruto_total := v_faturamento_total - v_custo_total;
  
  IF v_faturamento_total > 0 THEN
    v_margem_lucro_media := ROUND((v_lucro_bruto_total / v_faturamento_total * 100)::numeric, 2);
  ELSE
    v_margem_lucro_media := 0;
  END IF;

  -- 2. Performance por Produto
  SELECT COALESCE(json_agg(prod_data), '[]'::json)
  INTO v_performance_produtos
  FROM (
    SELECT
      COALESCE(item_ds_descricao, 'N/A') as produto,
      COALESCE(SUM(item_valor_total_liquido), 0) as faturamento,
      COALESCE(SUM(item_valor_total_liquido) - SUM(COALESCE(item_vl_custo_unitario, 0) * item_nr_quantidade), 0) as lucro,
      CASE 
        WHEN SUM(item_valor_total_liquido) > 0 THEN 
          ROUND(((SUM(item_valor_total_liquido) - SUM(COALESCE(item_vl_custo_unitario, 0) * item_nr_quantidade)) / SUM(item_valor_total_liquido) * 100)::numeric, 2)
        ELSE 0 
      END as margem_percentual
    FROM tbl_vendas
    WHERE
      DATE(data_venda) BETWEEN p_data_inicio AND p_data_fim
      AND id_empresa = ANY(p_empresa_ids)
    GROUP BY item_ds_descricao
    ORDER BY faturamento DESC
    LIMIT 100
  ) prod_data;

  -- 3. Performance por Grupo
  SELECT COALESCE(json_agg(grupo_data), '[]'::json)
  INTO v_performance_grupos
  FROM (
    SELECT
      COALESCE(item_ds_grupo, 'Sem Grupo') as grupo,
      COALESCE(SUM(item_valor_total_liquido), 0) as faturamento,
      CASE 
        WHEN COUNT(DISTINCT numero_venda) > 0 THEN 
          ROUND((SUM(item_valor_total_liquido) / COUNT(DISTINCT numero_venda))::numeric, 2)
        ELSE 0 
      END as ticket_medio,
      COALESCE(SUM(item_valor_total_liquido) - SUM(COALESCE(item_vl_custo_unitario, 0) * item_nr_quantidade), 0) as lucro,
      CASE 
        WHEN SUM(item_valor_total_liquido) > 0 THEN 
          ROUND(((SUM(item_valor_total_liquido) - SUM(COALESCE(item_vl_custo_unitario, 0) * item_nr_quantidade)) / SUM(item_valor_total_liquido) * 100)::numeric, 2)
        ELSE 0 
      END as margem_percentual
    FROM tbl_vendas
    WHERE
      DATE(data_venda) BETWEEN p_data_inicio AND p_data_fim
      AND id_empresa = ANY(p_empresa_ids)
    GROUP BY item_ds_grupo
    ORDER BY faturamento DESC
  ) grupo_data;

  -- 4. Tabela de Produtos (To be filtered by Vendedor on Frontend)
  -- We return a summarized list to keep payload light, containing vendedor info
  SELECT COALESCE(json_agg(vend_data), '[]'::json)
  INTO v_produtos_por_vendedor
  FROM (
    SELECT
      ds_vendedor,
      COALESCE(item_ds_descricao, 'N/A') as produto,
      COALESCE(SUM(item_valor_total_liquido), 0) as faturamento,
      COALESCE(SUM(item_nr_quantidade), 0) as quantidade
    FROM tbl_vendas
    WHERE
      DATE(data_venda) BETWEEN p_data_inicio AND p_data_fim
      AND id_empresa = ANY(p_empresa_ids)
    GROUP BY ds_vendedor, item_ds_descricao
    ORDER BY ds_vendedor, faturamento DESC
    LIMIT 1000 -- Safety limit
  ) vend_data;

  -- Build Result
  v_result := json_build_object(
    'kpis', json_build_object(
      'produtos_vendidos', v_produtos_vendidos,
      'faturamento_total', v_faturamento_total,
      'desconto_total', v_desconto_total,
      'lucro_bruto_total', v_lucro_bruto_total,
      'custo_total_cmv', v_custo_total,
      'margem_lucro_media', v_margem_lucro_media,
      'margem_bruta_valor', v_lucro_bruto_total,
      'margem_bruta_percentual', v_margem_lucro_media
    ),
    'performance_produtos', v_performance_produtos,
    'performance_grupos', v_performance_grupos,
    'produtos_por_vendedor', v_produtos_por_vendedor
  );

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_produtos_dashboard(date, date, uuid[]) TO authenticated;
COMMENT ON FUNCTION get_produtos_dashboard IS 'Returns KPIs and tables for Products Dashboard.';
