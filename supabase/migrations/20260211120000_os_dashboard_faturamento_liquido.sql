-- Migration: OS Dashboard - Faturamento Bruto -> Líquido
-- Troca faturamento_bruto_os por faturamento_liquido_os usando SUM(item_vl_total_liquido) da tbl_ordem_servico

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
  v_os_entregues bigint;
  v_total_os bigint;
  v_os_nao_entregues bigint;
  v_faturamento_liquido_os numeric;
  v_ticket_medio_os numeric;
  v_ranking_vendedores json;
  v_ranking_grupos json;
BEGIN
  -- 1. Counts and financial — ONLY OS with status_da_venda = 'vendido'
  SELECT
    COUNT(DISTINCT numero_os) FILTER (WHERE LOWER(TRIM(status_os)) = 'entregue'),
    COUNT(DISTINCT numero_os),
    COALESCE(SUM(item_vl_total_liquido), 0)
  INTO
    v_os_entregues,
    v_total_os,
    v_faturamento_liquido_os
  FROM tbl_ordem_servico
  WHERE
    DATE(dt_abertura_os) BETWEEN p_data_inicio AND p_data_fim
    AND id_empresa = ANY(p_empresa_ids)
    AND LOWER(TRIM(status_da_venda)) = 'vendido';

  -- 2. Não Entregues = total vendido - entregues
  v_os_nao_entregues := v_total_os - v_os_entregues;

  -- 3. Ticket Medio (baseado no faturamento líquido)
  IF v_total_os > 0 THEN
    v_ticket_medio_os := ROUND((v_faturamento_liquido_os / v_total_os)::numeric, 2);
  ELSE
    v_ticket_medio_os := 0;
  END IF;

  -- 4. Ranking Vendedores (only vendido)
  SELECT COALESCE(json_agg(ranking_data), '[]'::json)
  INTO v_ranking_vendedores
  FROM (
    SELECT
      COALESCE(ds_vendedor, 'Sem Vendedor') as vendedor,
      COUNT(DISTINCT numero_os) as total_os,
      COALESCE(SUM(item_vl_total_liquido), 0) as valor_total
    FROM tbl_ordem_servico
    WHERE
      DATE(dt_abertura_os) BETWEEN p_data_inicio AND p_data_fim
      AND id_empresa = ANY(p_empresa_ids)
      AND LOWER(TRIM(status_da_venda)) = 'vendido'
    GROUP BY ds_vendedor
    ORDER BY COALESCE(SUM(item_vl_total_liquido), 0) DESC
    LIMIT 10
  ) ranking_data;

  -- 5. Ranking Grupos (only vendido, enriched from Produtos)
  SELECT COALESCE(json_agg(ranking_data), '[]'::json)
  INTO v_ranking_grupos
  FROM (
    SELECT
      COALESCE(item_ds_grupo, 'Sem Grupo') as grupo,
      COUNT(DISTINCT numero_os) as total_os,
      COALESCE(SUM(item_vl_total_liquido), 0) as valor_total
    FROM tbl_ordem_servico
    WHERE
      DATE(dt_abertura_os) BETWEEN p_data_inicio AND p_data_fim
      AND id_empresa = ANY(p_empresa_ids)
      AND LOWER(TRIM(status_da_venda)) = 'vendido'
      AND item_ds_grupo IS NOT NULL
    GROUP BY item_ds_grupo
    ORDER BY COALESCE(SUM(item_vl_total_liquido), 0) DESC
    LIMIT 10
  ) ranking_data;

  -- 6. Build final result
  v_result := json_build_object(
    'os_nao_entregues', v_os_nao_entregues,
    'os_entregues', v_os_entregues,
    'total_os', v_total_os,
    'faturamento_liquido_os', v_faturamento_liquido_os,
    'ticket_medio_os', v_ticket_medio_os,
    'ranking_vendedores', v_ranking_vendedores,
    'ranking_grupos', v_ranking_grupos
  );

  RETURN v_result;
END;
$$;
