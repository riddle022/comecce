-- Fix import logic: delete only the date range present in the uploaded file
-- instead of deleting ALL company data. This allows multiple uploads of
-- different periods to coexist, while still overwriting if the same period
-- is re-uploaded.

CREATE OR REPLACE FUNCTION process_operacional_import_atomic(
  p_id_empresa UUID,
  p_file_names JSONB,
  p_vendas JSONB,
  p_ordens JSONB,
  p_upload_stats JSONB
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET statement_timeout = '60s'
AS $$
DECLARE
  v_id_upload UUID;
  v_total_vendas INT;
  v_total_os INT;
  v_vendas_min_date DATE;
  v_vendas_max_date DATE;
  v_os_min_date DATE;
  v_os_max_date DATE;
BEGIN
  v_total_vendas := (p_upload_stats->>'total_vendas')::INT;
  v_total_os     := (p_upload_stats->>'total_os')::INT;

  -- 1. Calculate date range from vendas in the uploaded file
  SELECT
    MIN((x.obj->>'data_venda')::DATE),
    MAX((x.obj->>'data_venda')::DATE)
  INTO v_vendas_min_date, v_vendas_max_date
  FROM jsonb_array_elements(p_vendas) AS x(obj)
  WHERE x.obj->>'data_venda' IS NOT NULL;

  -- 2. Calculate date range from ordens in the uploaded file
  SELECT
    MIN((x.obj->>'dt_abertura_os')::DATE),
    MAX((x.obj->>'dt_abertura_os')::DATE)
  INTO v_os_min_date, v_os_max_date
  FROM jsonb_array_elements(p_ordens) AS x(obj)
  WHERE x.obj->>'dt_abertura_os' IS NOT NULL;

  -- 3. Delete only the date range covered by this upload (not the entire company)
  IF v_vendas_min_date IS NOT NULL AND v_vendas_max_date IS NOT NULL THEN
    DELETE FROM tbl_vendas
    WHERE id_empresa = p_id_empresa
      AND data_venda::DATE BETWEEN v_vendas_min_date AND v_vendas_max_date;
  END IF;

  IF v_os_min_date IS NOT NULL AND v_os_max_date IS NOT NULL THEN
    DELETE FROM tbl_ordem_servico
    WHERE id_empresa = p_id_empresa
      AND dt_abertura_os::DATE BETWEEN v_os_min_date AND v_os_max_date;
  END IF;

  -- 4. Always insert a new history record (keep full upload audit trail)
  INSERT INTO tbl_historico_uploads (
    id_empresa,
    arquivo_vendas,
    arquivo_produtos,
    arquivo_os,
    total_vendas,
    total_os,
    tipo_importacao,
    status,
    data_upload
  ) VALUES (
    p_id_empresa,
    p_file_names->>'vendas',
    p_file_names->>'produtos',
    p_file_names->>'os',
    v_total_vendas,
    v_total_os,
    'operacional',
    'sucesso',
    NOW()
  )
  RETURNING id_upload INTO v_id_upload;

  -- 5. Bulk insert vendas
  IF jsonb_array_length(p_vendas) > 0 THEN
    INSERT INTO tbl_vendas (
      id_empresa,
      id_upload,
      numero_venda,
      data_venda,
      numero_os,
      ds_vendedor,
      ds_cliente,
      ds_forma_pagamento,
      item_ds_referencia,
      item_ds_descricao,
      item_nr_quantidade,
      item_valor_original,
      item_valor_ajuste,
      item_valor_unitario,
      item_valor_total_bruto,
      item_desconto_total,
      item_valor_total_liquido,
      item_ds_grupo,
      item_ds_grife,
      item_ds_fornecedor,
      item_vl_custo_unitario
    )
    SELECT
      p_id_empresa,
      v_id_upload,
      (x.obj->>'numero_venda')::BIGINT,
      CASE WHEN x.obj->>'data_venda' IS NOT NULL THEN (x.obj->>'data_venda')::TIMESTAMP WITH TIME ZONE ELSE NULL END,
      (x.obj->>'numero_os')::BIGINT,
      x.obj->>'ds_vendedor',
      x.obj->>'ds_cliente',
      x.obj->>'ds_forma_pagamento',
      x.obj->>'item_ds_referencia',
      x.obj->>'item_ds_descricao',
      (x.obj->>'item_nr_quantidade')::INT,
      (x.obj->>'item_valor_original')::NUMERIC,
      (x.obj->>'item_valor_ajuste')::NUMERIC,
      (x.obj->>'item_valor_unitario')::NUMERIC,
      (x.obj->>'item_valor_total_bruto')::NUMERIC,
      (x.obj->>'item_desconto_total')::NUMERIC,
      (x.obj->>'item_valor_total_liquido')::NUMERIC,
      x.obj->>'item_ds_grupo',
      x.obj->>'item_ds_grife',
      x.obj->>'item_ds_fornecedor',
      (x.obj->>'item_vl_custo_unitario')::NUMERIC
    FROM jsonb_array_elements(p_vendas) AS x(obj);
  END IF;

  -- 6. Bulk insert ordens de servico
  IF jsonb_array_length(p_ordens) > 0 THEN
    INSERT INTO tbl_ordem_servico (
      id_empresa,
      id_upload,
      numero_os,
      dt_abertura_os,
      status_os,
      status_da_venda,
      ds_etapa_atual,
      dt_previsao_entrega,
      dt_entrega,
      ds_vendedor,
      item_ds_referencia,
      item_ds_descricao,
      item_nr_quantidade,
      item_vl_original,
      item_vl_ajuste,
      item_vl_unitario,
      item_vl_total_bruto,
      item_vl_desconto_total,
      item_vl_total_liquido,
      item_ds_grupo,
      item_ds_grife,
      item_ds_fornecedor,
      item_vl_custo_unitario
    )
    SELECT
      p_id_empresa,
      v_id_upload,
      (x.obj->>'numero_os')::BIGINT,
      CASE WHEN x.obj->>'dt_abertura_os' IS NOT NULL THEN (x.obj->>'dt_abertura_os')::TIMESTAMP WITH TIME ZONE ELSE NULL END,
      x.obj->>'status_os',
      x.obj->>'status_da_venda',
      x.obj->>'ds_etapa_atual',
      CASE WHEN x.obj->>'dt_previsao_entrega' IS NOT NULL THEN (x.obj->>'dt_previsao_entrega')::TIMESTAMP WITH TIME ZONE ELSE NULL END,
      CASE WHEN x.obj->>'dt_entrega' IS NOT NULL THEN (x.obj->>'dt_entrega')::TIMESTAMP WITH TIME ZONE ELSE NULL END,
      x.obj->>'ds_vendedor',
      x.obj->>'item_ds_referencia',
      x.obj->>'item_ds_descricao',
      (x.obj->>'item_nr_quantidade')::INT,
      (x.obj->>'item_vl_original')::NUMERIC,
      (x.obj->>'item_vl_ajuste')::NUMERIC,
      (x.obj->>'item_vl_unitario')::NUMERIC,
      (x.obj->>'item_vl_total_bruto')::NUMERIC,
      (x.obj->>'item_vl_desconto_total')::NUMERIC,
      (x.obj->>'item_vl_total_liquido')::NUMERIC,
      x.obj->>'item_ds_grupo',
      x.obj->>'item_ds_grife',
      x.obj->>'item_ds_fornecedor',
      (x.obj->>'item_vl_custo_unitario')::NUMERIC
    FROM jsonb_array_elements(p_ordens) AS x(obj);
  END IF;

  RETURN jsonb_build_object(
    'status', 'sucesso',
    'id_upload', v_id_upload,
    'message', 'Importação atômica concluída com sucesso'
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'status', 'falha',
    'message', SQLERRM,
    'detail', SQLSTATE
  );
END;
$$;
