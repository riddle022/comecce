/*
  # Fix SECURITY DEFINER search_path Vulnerability

  ## CRITICAL SECURITY FIX
  This migration addresses a critical search_path injection vulnerability in SECURITY DEFINER functions.
  Without a fixed search_path, attackers can create malicious schemas and objects to:
  - Escalate privileges by impersonating admin users
  - Bypass Row Level Security (RLS) policies
  - Access unauthorized data from other companies
  - Manipulate or delete critical data

  ## Reference
  PostgreSQL Security Best Practices: Always use SET search_path with SECURITY DEFINER functions
  https://www.postgresql.org/docs/current/sql-createfunction.html#SQL-CREATEFUNCTION-SECURITY

  ## Changes
  This migration recreates ALL SECURITY DEFINER functions with SET search_path = public, pg_temp

  ### 1. Authorization Functions (CRITICAL - 7 functions)
  These functions are the foundation of the entire RLS security model:
  - user_is_active() - Checks if user profile is active
  - user_has_group() - Checks if user has an assigned group
  - user_is_admin() - Checks admin permission (requires active + group + admin flag)
  - user_can_edit() - Checks edit permission (requires active + group + edit_data flag)
  - user_can_delete() - Checks delete permission (requires active + group + delete_data flag)
  - user_has_menu_access(text) - Checks menu access permission
  - user_empresas() - Returns empresas user can access (admin=all, regular=associated only)

  ### 2. Data Aggregation Functions (2 functions)
  These functions aggregate sensitive business data:
  - get_dashboard_consolidado() - Dashboard KPIs and charts
  - get_operacional_os_summary() - Operational OS summary with pagination

  ## Security Impact
  BEFORE: Vulnerable to search_path injection attacks
  AFTER: All SECURITY DEFINER functions properly isolated with fixed search_path

  ## Testing
  After applying this migration, verify with:
  SELECT proname, prosecdef, proconfig FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public' AND p.prosecdef = true;

  All functions should have proconfig containing 'search_path=public, pg_temp'
*/

-- =============================================
-- PART 1: AUTHORIZATION FUNCTIONS (CRITICAL)
-- =============================================

-- Function 1: user_is_active
-- Checks if the authenticated user has an active profile
CREATE OR REPLACE FUNCTION user_is_active()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  user_active boolean;
BEGIN
  SELECT ativo INTO user_active
  FROM perfis
  WHERE id = auth.uid();

  RETURN COALESCE(user_active, false);
END;
$$;

COMMENT ON FUNCTION user_is_active IS 'SECURITY: Returns true if authenticated user has an active profile. Uses SECURITY DEFINER with fixed search_path to prevent privilege escalation.';

-- Function 2: user_has_group
-- Checks if the authenticated user has a group assigned
CREATE OR REPLACE FUNCTION user_has_group()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  user_grupo_id uuid;
BEGIN
  SELECT grupo_id INTO user_grupo_id
  FROM perfis
  WHERE id = auth.uid();

  RETURN user_grupo_id IS NOT NULL;
END;
$$;

COMMENT ON FUNCTION user_has_group IS 'SECURITY: Returns true if authenticated user has a group assigned. Uses SECURITY DEFINER with fixed search_path to prevent privilege escalation.';

-- Function 3: user_is_admin
-- Checks if the authenticated user has admin privileges
CREATE OR REPLACE FUNCTION user_is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  user_permissions jsonb;
  user_grupo_id uuid;
  user_active boolean;
BEGIN
  SELECT p.grupo_id, p.ativo INTO user_grupo_id, user_active
  FROM perfis p
  WHERE p.id = auth.uid();

  IF user_active IS FALSE OR user_active IS NULL THEN
    RETURN false;
  END IF;

  IF user_grupo_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT permissoes INTO user_permissions
  FROM grupos
  WHERE id = user_grupo_id;

  RETURN COALESCE((user_permissions->>'admin')::boolean, false);
END;
$$;

COMMENT ON FUNCTION user_is_admin IS 'SECURITY: Returns true if authenticated user is admin (active + group + admin permission). Uses SECURITY DEFINER with fixed search_path to prevent privilege escalation.';

-- Function 4: user_can_edit
-- Checks if the authenticated user has edit permissions
CREATE OR REPLACE FUNCTION user_can_edit()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  user_permissions jsonb;
  user_grupo_id uuid;
  user_active boolean;
BEGIN
  SELECT p.grupo_id, p.ativo INTO user_grupo_id, user_active
  FROM perfis p
  WHERE p.id = auth.uid();

  IF user_active IS FALSE OR user_active IS NULL THEN
    RETURN false;
  END IF;

  IF user_grupo_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT permissoes INTO user_permissions
  FROM grupos
  WHERE id = user_grupo_id;

  IF COALESCE((user_permissions->>'admin')::boolean, false) THEN
    RETURN true;
  END IF;

  RETURN COALESCE((user_permissions->>'edit_data')::boolean, false);
END;
$$;

COMMENT ON FUNCTION user_can_edit IS 'SECURITY: Returns true if authenticated user can edit data (active + group + edit_data or admin permission). Uses SECURITY DEFINER with fixed search_path to prevent privilege escalation.';

-- Function 5: user_can_delete
-- Checks if the authenticated user has delete permissions
CREATE OR REPLACE FUNCTION user_can_delete()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  user_permissions jsonb;
  user_grupo_id uuid;
  user_active boolean;
BEGIN
  SELECT p.grupo_id, p.ativo INTO user_grupo_id, user_active
  FROM perfis p
  WHERE p.id = auth.uid();

  IF user_active IS FALSE OR user_active IS NULL THEN
    RETURN false;
  END IF;

  IF user_grupo_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT permissoes INTO user_permissions
  FROM grupos
  WHERE id = user_grupo_id;

  IF COALESCE((user_permissions->>'admin')::boolean, false) THEN
    RETURN true;
  END IF;

  RETURN COALESCE((user_permissions->>'delete_data')::boolean, false);
END;
$$;

COMMENT ON FUNCTION user_can_delete IS 'SECURITY: Returns true if authenticated user can delete data (active + group + delete_data or admin permission). Uses SECURITY DEFINER with fixed search_path to prevent privilege escalation.';

-- Function 6: user_has_menu_access
-- Checks if the authenticated user has access to a specific menu
CREATE OR REPLACE FUNCTION user_has_menu_access(menu_name text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  user_permissions jsonb;
  user_grupo_id uuid;
  user_active boolean;
BEGIN
  SELECT p.grupo_id, p.ativo INTO user_grupo_id, user_active
  FROM perfis p
  WHERE p.id = auth.uid();

  IF user_active IS FALSE OR user_active IS NULL THEN
    RETURN false;
  END IF;

  IF user_grupo_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT permissoes INTO user_permissions
  FROM grupos
  WHERE id = user_grupo_id;

  IF COALESCE((user_permissions->>'admin')::boolean, false) THEN
    RETURN true;
  END IF;

  RETURN user_permissions->'menus' @> to_jsonb(menu_name);
END;
$$;

COMMENT ON FUNCTION user_has_menu_access IS 'SECURITY: Returns true if authenticated user has access to specified menu (active + group + menu in list or admin). Uses SECURITY DEFINER with fixed search_path to prevent privilege escalation.';

-- Function 7: user_empresas
-- Returns the set of empresa IDs the authenticated user can access
CREATE OR REPLACE FUNCTION user_empresas()
RETURNS SETOF uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF user_is_admin() THEN
    RETURN QUERY SELECT id FROM empresas WHERE ativo = true;
  ELSE
    RETURN QUERY
      SELECT empresa_id
      FROM usuarios_empresas
      WHERE usuario_id = auth.uid();
  END IF;
END;
$$;

COMMENT ON FUNCTION user_empresas IS 'SECURITY: Returns empresas user can access (admin=all active, regular=associated only). Uses SECURITY DEFINER with fixed search_path to prevent privilege escalation.';

-- =============================================
-- PART 2: DATA AGGREGATION FUNCTIONS
-- =============================================

-- Function 8: get_dashboard_consolidado
-- Consolidates dashboard data with KPIs, trends, top sellers, payment methods, and OS summary
DROP FUNCTION IF EXISTS get_dashboard_consolidado(date, date, uuid[]);

CREATE OR REPLACE FUNCTION get_dashboard_consolidado(
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
  v_kpis json;
  v_tendencia json;
  v_top_vendedores json;
  v_formas_pagamento json;
  v_resumo_os json;
  v_faturamento_bruto numeric;
  v_faturamento_liquido numeric;
  v_total_vendas bigint;
  v_desconto_total numeric;
  v_itens_vendidos bigint;
  v_margem_global numeric;
BEGIN
  SELECT
    COALESCE(SUM(item_valor_total_bruto), 0),
    COALESCE(SUM(item_valor_total_liquido), 0),
    COUNT(DISTINCT numero_venda),
    COALESCE(SUM(item_desconto_total), 0),
    COALESCE(SUM(item_nr_quantidade), 0)
  INTO
    v_faturamento_bruto,
    v_faturamento_liquido,
    v_total_vendas,
    v_desconto_total,
    v_itens_vendidos
  FROM tbl_vendas
  WHERE
    DATE(data_venda) BETWEEN p_data_inicio AND p_data_fim
    AND id_empresa = ANY(p_empresa_ids);

  IF v_faturamento_bruto = 0 THEN
    v_margem_global := 0;
  ELSE
    v_margem_global := ROUND((v_faturamento_liquido / v_faturamento_bruto * 100)::numeric, 2);
  END IF;

  v_kpis := json_build_object(
    'faturamento_bruto', v_faturamento_bruto,
    'faturamento_liquido', v_faturamento_liquido,
    'total_vendas', v_total_vendas,
    'ticket_medio', CASE
      WHEN v_total_vendas = 0 THEN 0
      ELSE ROUND((v_faturamento_liquido / v_total_vendas)::numeric, 2)
    END,
    'desconto_total', v_desconto_total,
    'itens_vendidos', v_itens_vendidos,
    'margem_global', v_margem_global
  );

  WITH daily_totals AS (
    SELECT
      DATE(data_venda) as dia,
      COALESCE(SUM(item_valor_total_bruto), 0) as valor_bruto,
      COALESCE(SUM(item_valor_total_liquido), 0) as valor_liquido
    FROM tbl_vendas
    WHERE
      DATE(data_venda) BETWEEN p_data_inicio AND p_data_fim
      AND id_empresa = ANY(p_empresa_ids)
    GROUP BY DATE(data_venda)
  )
  SELECT json_agg(
    json_build_object(
      'data', dia::text,
      'valor_bruto', valor_bruto,
      'valor_liquido', valor_liquido
    )
    ORDER BY dia
  )
  INTO v_tendencia
  FROM daily_totals;

  WITH vendedor_totals AS (
    SELECT
      COALESCE(ds_vendedor, 'Sem Vendedor') as vendedor,
      COALESCE(SUM(item_valor_total_liquido), 0) as valor,
      COUNT(DISTINCT numero_venda) as vendas
    FROM tbl_vendas
    WHERE
      DATE(data_venda) BETWEEN p_data_inicio AND p_data_fim
      AND id_empresa = ANY(p_empresa_ids)
    GROUP BY ds_vendedor
    ORDER BY valor DESC
    LIMIT 5
  )
  SELECT json_agg(
    json_build_object(
      'vendedor', vendedor,
      'valor', valor,
      'vendas', vendas
    )
    ORDER BY valor DESC
  )
  INTO v_top_vendedores
  FROM vendedor_totals;

  WITH payment_totals AS (
    SELECT
      COALESCE(ds_forma_pagamento, 'Não Especificado') as forma,
      COALESCE(SUM(item_valor_total_liquido), 0) as valor
    FROM tbl_vendas
    WHERE
      DATE(data_venda) BETWEEN p_data_inicio AND p_data_fim
      AND id_empresa = ANY(p_empresa_ids)
    GROUP BY ds_forma_pagamento
  )
  SELECT json_agg(
    json_build_object(
      'forma', forma,
      'valor', valor,
      'porcentagem', CASE
        WHEN v_faturamento_liquido > 0
        THEN ROUND((valor / v_faturamento_liquido * 100)::numeric, 1)
        ELSE 0
      END
    )
    ORDER BY valor DESC
  )
  INTO v_formas_pagamento
  FROM payment_totals;

  SELECT json_build_object(
    'os_abertas', COUNT(*) FILTER (
      WHERE LOWER(status_os) IN ('aberta', 'em andamento', 'pendente')
    ),
    'os_entregues', COUNT(*) FILTER (
      WHERE LOWER(status_os) IN ('entregue', 'finalizada', 'concluída')
    ),
    'os_em_atraso', COUNT(*) FILTER (
      WHERE dt_previsao_entrega IS NOT NULL
        AND dt_entrega IS NULL
        AND DATE(dt_previsao_entrega) < CURRENT_DATE
    )
  )
  INTO v_resumo_os
  FROM tbl_ordem_servico
  WHERE
    DATE(dt_abertura_os) BETWEEN p_data_inicio AND p_data_fim
    AND id_empresa = ANY(p_empresa_ids);

  v_result := json_build_object(
    'kpis', v_kpis,
    'tendencia', COALESCE(v_tendencia, '[]'::json),
    'top_vendedores', COALESCE(v_top_vendedores, '[]'::json),
    'formas_pagamento', COALESCE(v_formas_pagamento, '[]'::json),
    'resumo_os', v_resumo_os
  );

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_dashboard_consolidado(date, date, uuid[]) TO authenticated;

COMMENT ON FUNCTION get_dashboard_consolidado IS 'SECURITY: Consolidates dashboard data with KPIs, trends, top sellers, payment methods and OS summary. Uses SECURITY DEFINER with fixed search_path to prevent data manipulation.';

-- Function 9: get_operacional_os_summary
-- Returns operational OS summary with server-side pagination, filtering, and sorting
DROP FUNCTION IF EXISTS get_operacional_os_summary(date, date, uuid[], integer, integer, text, text, jsonb);

CREATE OR REPLACE FUNCTION get_operacional_os_summary(
  p_data_inicio date,
  p_data_fim date,
  p_empresa_ids uuid[],
  p_page integer DEFAULT 1,
  p_limit integer DEFAULT 50,
  p_sort_by text DEFAULT 'dt_abertura_os',
  p_sort_order text DEFAULT 'DESC',
  p_filters jsonb DEFAULT '{}'::jsonb
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_result json;
  v_filter_numero_os text;
  v_filter_status text;
  v_filter_etapa text;
  v_filter_vendedor text;
  v_filter_dt_abertura text;
  v_filter_dt_previsao text;
  v_filter_dt_entrega text;
  v_filter_valor_total text;
  v_offset integer;
BEGIN
  p_page := GREATEST(1, p_page);
  p_limit := LEAST(100, GREATEST(10, p_limit));
  p_sort_order := UPPER(p_sort_order);
  IF p_sort_order NOT IN ('ASC', 'DESC') THEN
    p_sort_order := 'DESC';
  END IF;

  v_offset := (p_page - 1) * p_limit;

  v_filter_numero_os := p_filters->>'numero_os';
  v_filter_status := p_filters->>'status_os';
  v_filter_etapa := p_filters->>'ds_etapa_atual';
  v_filter_vendedor := p_filters->>'ds_vendedor';
  v_filter_dt_abertura := p_filters->>'dt_abertura_os';
  v_filter_dt_previsao := p_filters->>'dt_previsao_entrega';
  v_filter_dt_entrega := p_filters->>'dt_entrega';
  v_filter_valor_total := p_filters->>'valor_total';

  WITH filtered_os AS (
    SELECT
      numero_os, id_empresa, dt_abertura_os, status_os, status_da_venda,
      ds_etapa_atual, dt_previsao_entrega, dt_entrega, ds_vendedor,
      item_vl_total_liquido, item_nr_quantidade,
      CASE
        WHEN dt_previsao_entrega IS NOT NULL AND dt_entrega IS NULL AND DATE(dt_previsao_entrega) < CURRENT_DATE
        THEN true ELSE false
      END as em_atraso
    FROM tbl_ordem_servico
    WHERE
      DATE(dt_abertura_os) BETWEEN p_data_inicio AND p_data_fim
      AND id_empresa = ANY(p_empresa_ids)
      AND (v_filter_numero_os IS NULL OR numero_os::text ILIKE '%' || v_filter_numero_os || '%')
      AND (v_filter_status IS NULL OR
        (v_filter_status = 'Entregue' AND LOWER(status_os) IN ('entregue', 'finalizada', 'concluída', 'entregues')) OR
        (v_filter_status = 'Aberta' AND LOWER(status_os) IN ('aberta', 'pendente')) OR
        (v_filter_status = 'Em Andamento' AND LOWER(status_os) NOT IN ('entregue', 'finalizada', 'concluída', 'entregues', 'aberta', 'pendente') AND (dt_previsao_entrega IS NULL OR dt_entrega IS NOT NULL OR DATE(dt_previsao_entrega) >= CURRENT_DATE)) OR
        (v_filter_status = 'Em Atraso' AND dt_previsao_entrega IS NOT NULL AND dt_entrega IS NULL AND DATE(dt_previsao_entrega) < CURRENT_DATE))
      AND (v_filter_etapa IS NULL OR ds_etapa_atual ILIKE '%' || v_filter_etapa || '%')
      AND (v_filter_vendedor IS NULL OR ds_vendedor ILIKE '%' || v_filter_vendedor || '%')
  ),
  os_aggregated AS (
    SELECT
      numero_os, id_empresa, dt_abertura_os, status_os, status_da_venda,
      ds_etapa_atual, dt_previsao_entrega, dt_entrega, ds_vendedor,
      SUM(COALESCE(item_vl_total_liquido, 0)) as valor_total,
      SUM(COALESCE(item_nr_quantidade, 0)) as quantidade_total,
      BOOL_OR(em_atraso) as em_atraso
    FROM filtered_os
    GROUP BY numero_os, id_empresa, dt_abertura_os, status_os, status_da_venda, ds_etapa_atual, dt_previsao_entrega, dt_entrega, ds_vendedor
  ),
  os_filtered_final AS (
    SELECT * FROM os_aggregated
    WHERE
      (v_filter_dt_abertura IS NULL OR to_char(dt_abertura_os, 'DD/MM/YYYY') ILIKE '%' || v_filter_dt_abertura || '%')
      AND (v_filter_dt_previsao IS NULL OR to_char(dt_previsao_entrega, 'DD/MM/YYYY') ILIKE '%' || v_filter_dt_previsao || '%')
      AND (v_filter_dt_entrega IS NULL OR to_char(dt_entrega, 'DD/MM/YYYY') ILIKE '%' || v_filter_dt_entrega || '%')
      AND (v_filter_valor_total IS NULL OR valor_total::text ILIKE '%' || v_filter_valor_total || '%')
  ),
  kpis AS (
    SELECT
      COUNT(*) FILTER (WHERE LOWER(status_os) IN ('aberta', 'em andamento', 'pendente') AND NOT em_atraso) as os_abertas,
      COUNT(*) FILTER (WHERE LOWER(status_os) IN ('entregue', 'finalizada', 'concluída', 'entregues')) as os_entregues,
      COUNT(*) FILTER (WHERE em_atraso = true) as os_em_atraso,
      COALESCE(SUM(valor_total), 0) as faturamento_liquido_os,
      COUNT(*) as total_count
    FROM os_filtered_final
  ),
  paginated_os AS (
    SELECT
      json_build_object(
        'numero_os', numero_os, 'status_os', COALESCE(status_os, 'N/A'),
        'status_da_venda', COALESCE(status_da_venda, 'N/A'), 'ds_etapa_atual', COALESCE(ds_etapa_atual, 'N/A'),
        'dt_abertura_os', dt_abertura_os::text, 'dt_previsao_entrega', dt_previsao_entrega::text,
        'dt_entrega', dt_entrega::text, 'ds_vendedor', COALESCE(ds_vendedor, 'N/A'),
        'valor_total', valor_total, 'quantidade_total', quantidade_total, 'em_atraso', em_atraso
      ) as row_data,
      CASE
        WHEN p_sort_by = 'numero_os' THEN CASE WHEN p_sort_order = 'ASC' THEN numero_os::text ELSE LPAD((999999999 - numero_os)::text, 10, '0') END
        WHEN p_sort_by = 'status_os' THEN CASE WHEN p_sort_order = 'ASC' THEN status_os ELSE REVERSE(status_os) END
        WHEN p_sort_by = 'ds_etapa_atual' THEN CASE WHEN p_sort_order = 'ASC' THEN ds_etapa_atual ELSE REVERSE(ds_etapa_atual) END
        WHEN p_sort_by = 'ds_vendedor' THEN CASE WHEN p_sort_order = 'ASC' THEN ds_vendedor ELSE REVERSE(ds_vendedor) END
        WHEN p_sort_by = 'dt_abertura_os' THEN CASE WHEN p_sort_order = 'ASC' THEN dt_abertura_os::text ELSE REVERSE(dt_abertura_os::text) END
        WHEN p_sort_by = 'dt_previsao_entrega' THEN CASE WHEN p_sort_order = 'ASC' THEN COALESCE(dt_previsao_entrega::text, '9999-12-31') ELSE REVERSE(COALESCE(dt_previsao_entrega::text, '0000-01-01')) END
        WHEN p_sort_by = 'dt_entrega' THEN CASE WHEN p_sort_order = 'ASC' THEN COALESCE(dt_entrega::text, '9999-12-31') ELSE REVERSE(COALESCE(dt_entrega::text, '0000-01-01')) END
        WHEN p_sort_by = 'valor_total' THEN CASE WHEN p_sort_order = 'ASC' THEN LPAD(valor_total::text, 20, '0') ELSE LPAD((9999999999.99 - valor_total)::text, 20, '0') END
        ELSE CASE WHEN p_sort_order = 'ASC' THEN dt_abertura_os::text ELSE REVERSE(dt_abertura_os::text) END
      END as sort_value
    FROM os_filtered_final
    ORDER BY sort_value LIMIT p_limit OFFSET v_offset
  )
  SELECT json_build_object(
    'kpis', json_build_object(
      'os_abertas', (SELECT os_abertas FROM kpis),
      'os_entregues', (SELECT os_entregues FROM kpis),
      'os_em_atraso', (SELECT os_em_atraso FROM kpis),
      'faturamento_liquido_os', (SELECT faturamento_liquido_os FROM kpis)
    ),
    'lista_os', COALESCE((SELECT json_agg(row_data) FROM paginated_os), '[]'::json),
    'total_count', (SELECT total_count FROM kpis),
    'current_page', p_page,
    'total_pages', GREATEST(1, CEIL((SELECT total_count FROM kpis)::numeric / p_limit::numeric)::integer)
  )
  INTO v_result;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_operacional_os_summary(date, date, uuid[], integer, integer, text, text, jsonb) TO authenticated;

COMMENT ON FUNCTION get_operacional_os_summary IS 'SECURITY: Returns operational OS summary with server-side pagination, filtering and sorting. Uses SECURITY DEFINER with fixed search_path to prevent data manipulation.';