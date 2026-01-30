
-- Create a robust function to handle atomic imports
CREATE OR REPLACE FUNCTION process_operacional_import_atomic(
  p_id_empresa UUID,
  p_file_names JSONB,
  p_vendas JSONB,
  p_ordens JSONB,
  p_upload_stats JSONB
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with elevated permissions to ensure clean transaction
SET statement_timeout = '60s' -- Give it some time, though it should be fast
AS $$
DECLARE
  v_id_upload UUID;
  v_total_vendas INT;
  v_total_os INT;
BEGIN
  -- 1. Extract stats
  v_total_vendas := (p_upload_stats->>'total_vendas')::INT;
  v_total_os := (p_upload_stats->>'total_os')::INT;

  -- 2. Cleanup OLD history for this company/type (Atomic Replacement)
  -- This assumes ON DELETE CASCADE is set up on tbl_vendas/tbl_ordem_servico foreign keys to tbl_historico_uploads.
  -- If not, we manually delete to be safe.
  DELETE FROM tbl_vendas WHERE id_empresa = p_id_empresa;
  DELETE FROM tbl_ordem_servico WHERE id_empresa = p_id_empresa;
  
  -- Also delete the old history record
  DELETE FROM tbl_historico_uploads 
  WHERE id_empresa = p_id_empresa 
  AND tipo_importacao = 'operacional';

  -- 3. Create NEW history record
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

  -- 4. Bulk Insert Vendas
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

  -- 5. Bulk Insert Ordem Servico
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
