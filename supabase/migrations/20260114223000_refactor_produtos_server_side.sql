/*
  # Refactor Products Dashboard to Server-Side Architecture
  
  ## Summary
  Splits the monolithic `get_produtos_dashboard` into 3 specialized functions for performance and scalability.
  
  ## 1. get_produtos_dashboard (Updated)
  - **Purpose**: Returns only High-Level KPIs and Top Charts.
  - **Removed**: The heavy `produtos_por_vendedor` list.
  - **Returns**: KPIs, Top Products (Limit 100), Top Groups.
  
  ## 2. get_lista_vendedores (New)
  - **Purpose**: Fast retrieval of unique seller names for the dropdown filter.
  - **Logic**: DISTINCT query on `tbl_vendas`.
  
  ## 3. get_detalhe_produtos_vendedor (New)
  - **Purpose**: Returns the detailed table data with Server-Side Filtering and Pagination.
  - **Params**:
    - dates/companies (Standard)
    - `p_vendedor`: If NULL/'Todos', returns all. If set, filters by name.
    - `p_limit`: Max rows to return (default 50).
    - `p_offset`: formatting for pagination.
*/

-- 1. UPDATE get_produtos_dashboard (Remove detailed list)
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
  v_lucro_bruto_total numeric;
  v_margem_lucro_media numeric;
  
  -- Tables Variables
  v_performance_produtos json;
  v_performance_grupos json;
BEGIN
  -- 1. Calculate Aggregated KPIs
  SELECT
    COALESCE(SUM(item_nr_quantidade), 0),
    COALESCE(SUM(item_valor_total_liquido), 0),
    COALESCE(SUM(COALESCE(item_vl_custo_unitario, 0) * item_nr_quantidade), 0)
  INTO
    v_produtos_vendidos,
    v_faturamento_total,
    v_custo_total
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

  -- 2. Performance por Produto (Top 100)
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

  -- Build Result (Reduced payload)
  v_result := json_build_object(
    'kpis', json_build_object(
      'produtos_vendidos', v_produtos_vendidos,
      'lucro_bruto_total', v_lucro_bruto_total,
      'custo_total_cmv', v_custo_total,
      'margem_lucro_media', v_margem_lucro_media,
      'margem_bruta_valor', v_lucro_bruto_total,
      'margem_bruta_percentual', v_margem_lucro_media
    ),
    'performance_produtos', v_performance_produtos,
    'performance_grupos', v_performance_grupos
  );

  RETURN v_result;
END;
$$;


-- 2. CREATE get_lista_vendedores
CREATE OR REPLACE FUNCTION get_lista_vendedores(
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
  SELECT COALESCE(json_agg(DISTINCT ds_vendedor), '[]'::json)
  INTO v_result
  FROM tbl_vendas
  WHERE 
    id_empresa = ANY(p_empresa_ids)
    AND ds_vendedor IS NOT NULL 
    AND ds_vendedor != '';
    
  RETURN v_result;
END;
$$;


-- 3. CREATE get_detalhe_produtos_vendedor
CREATE OR REPLACE FUNCTION get_detalhe_produtos_vendedor(
  p_data_inicio date,
  p_data_fim date,
  p_empresa_ids uuid[],
  p_vendedor text,
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0
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
      ds_vendedor,
      COALESCE(item_ds_descricao, 'N/A') as produto,
      COALESCE(SUM(item_valor_total_liquido), 0) as faturamento,
      COALESCE(SUM(item_nr_quantidade), 0) as quantidade
    FROM tbl_vendas
    WHERE
      DATE(data_venda) BETWEEN p_data_inicio AND p_data_fim
      AND id_empresa = ANY(p_empresa_ids)
      -- Apply Vendedor Filter dynamically
      AND (
        p_vendedor IS NULL 
        OR p_vendedor = 'Todos'
        OR ds_vendedor = p_vendedor
      )
    GROUP BY ds_vendedor, item_ds_descricao
    ORDER BY faturamento DESC
    LIMIT p_limit
    OFFSET p_offset
  ) vend_data;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_produtos_dashboard(date, date, uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION get_lista_vendedores(uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION get_detalhe_produtos_vendedor(date, date, uuid[], text, integer, integer) TO authenticated;
