-- Final Fix for Operacional OS Indicators
-- Aligns financial metrics and "Sold OS" count to tbl_vendas as the source of truth.

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
  -- 1. Operational Counts from tbl_ordem_servico (Status logic only)
  SELECT
    COUNT(DISTINCT numero_os) FILTER (WHERE LOWER(status_os) = 'não entregue'),
    COUNT(DISTINCT numero_os) FILTER (WHERE LOWER(status_os) = 'entregue'),
    COUNT(DISTINCT numero_os)
  INTO
    v_os_nao_entregues,
    v_os_entregues,
    v_total_os
  FROM tbl_ordem_servico
  WHERE
    DATE(dt_abertura_os) BETWEEN p_data_inicio AND p_data_fim
    AND id_empresa = ANY(p_empresa_ids);

  -- 2. Financial Metrics and Sold OS from tbl_vendas (Source of Truth)
  SELECT
    COUNT(DISTINCT numero_os),
    COALESCE(SUM(item_valor_total_liquido), 0)
  INTO
    v_os_vendidas,
    v_faturamento_liquido_os
  FROM tbl_vendas
  WHERE
    DATE(data_venda) BETWEEN p_data_inicio AND p_data_fim
    AND id_empresa = ANY(p_empresa_ids)
    AND numero_os > 0;

  -- 3. Derived Calculations
  v_os_nao_vendidas := GREATEST(0, v_total_os - v_os_vendidas);
  
  IF v_os_vendidas > 0 THEN
    v_ticket_medio_os := ROUND((v_faturamento_liquido_os / v_os_vendidas)::numeric, 2);
  ELSE
    v_ticket_medio_os := 0;
  END IF;

  -- 4. Ranking de Vendedores (Financial Total and OS count from tbl_vendas)
  SELECT COALESCE(json_agg(ranking_data), '[]'::json)
  INTO v_ranking_vendedores
  FROM (
    SELECT
      COALESCE(ds_vendedor, 'Sem Vendedor') as vendedor,
      COUNT(DISTINCT numero_os) as total_os,
      SUM(item_valor_total_liquido) as valor_total
    FROM tbl_vendas
    WHERE
      DATE(data_venda) BETWEEN p_data_inicio AND p_data_fim
      AND id_empresa = ANY(p_empresa_ids)
      AND numero_os > 0
    GROUP BY ds_vendedor
    ORDER BY SUM(item_valor_total_liquido) DESC
    LIMIT 10
  ) ranking_data;

  -- 5. Ranking de Grupos (Financial Total and OS count from tbl_vendas)
  SELECT COALESCE(json_agg(ranking_data), '[]'::json)
  INTO v_ranking_grupos
  FROM (
    SELECT
      COALESCE(item_ds_grupo, 'Sem Grupo') as grupo,
      COUNT(DISTINCT numero_os) as total_os,
      SUM(item_valor_total_liquido) as valor_total
    FROM tbl_vendas
    WHERE
      DATE(data_venda) BETWEEN p_data_inicio AND p_data_fim
      AND id_empresa = ANY(p_empresa_ids)
      AND numero_os > 0
    GROUP BY item_ds_grupo
    ORDER BY SUM(item_valor_total_liquido) DESC
    LIMIT 10
  ) ranking_data;

  -- 6. Build final result
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

GRANT EXECUTE ON FUNCTION get_operacional_os_summary(date, date, uuid[]) TO anon, authenticated;
