import { SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { VendaEnriquecida, OrdemServicoData, VendaInsert, OrdemServicoInsert } from '../types.ts';

export async function persistData(
  supabase: SupabaseClient,
  id_empresa: string,
  vendas: VendaEnriquecida[],
  ordensServico: OrdemServicoData[]
): Promise<{ vendas_inseridas: number; os_inseridas: number }> {
  const vendasInsert: VendaInsert[] = vendas.map(v => ({
    id_empresa,
    numero_venda: v.numero_venda,
    data_venda: v.data_venda,
    numero_os: v.numero_os,
    ds_vendedor: v.ds_vendedor,
    ds_cliente: v.ds_cliente,
    ds_forma_pagamento: v.ds_forma_pagamento,
    item_ds_referencia: v.item_ds_referencia,
    item_ds_descricao: v.item_ds_descricao,
    item_nr_quantidade: v.item_nr_quantidade,
    item_valor_original: v.item_valor_original,
    item_valor_ajuste: v.item_valor_ajuste,
    item_valor_unitario: v.item_valor_unitario,
    item_valor_total_bruto: v.item_valor_total_bruto,
    item_desconto_total: v.item_desconto_total,
    item_valor_total_liquido: v.item_valor_total_liquido,
    item_ds_grupo: v.item_ds_grupo,
    item_ds_grife: v.item_ds_grife,
    item_ds_fornecedor: v.item_ds_fornecedor,
    item_vl_custo_unitario: v.item_vl_custo_unitario
  }));

  const ordensInsert: OrdemServicoInsert[] = ordensServico.map(os => ({
    id_empresa,
    numero_os: os.numero_os,
    dt_abertura_os: os.dt_abertura_os,
    status_os: os.status_os,
    status_da_venda: os.status_da_venda,
    ds_etapa_atual: os.ds_etapa_atual,
    dt_previsao_entrega: os.dt_previsao_entrega,
    dt_entrega: os.dt_entrega,
    ds_vendedor: os.ds_vendedor,
    item_ds_referencia: os.item_ds_referencia,
    item_ds_descricao: os.item_ds_descricao,
    item_nr_quantidade: os.item_nr_quantidade,
    item_vl_original: os.item_vl_original,
    item_vl_ajuste: os.item_vl_ajuste,
    item_vl_unitario: os.item_vl_unitario,
    item_vl_total_bruto: os.item_vl_total_bruto,
    item_vl_desconto_total: os.item_vl_desconto_total,
    item_vl_total_liquido: os.item_vl_total_liquido,
    item_ds_grupo: os.item_ds_grupo,
    item_ds_grife: os.item_ds_grife,
    item_ds_fornecedor: os.item_ds_fornecedor,
    item_vl_custo_unitario: os.item_vl_custo_unitario
  }));

  const { error: vendasError } = await supabase
    .from('tbl_vendas')
    .insert(vendasInsert);

  if (vendasError) {
    throw new Error(`Erro ao inserir vendas: ${vendasError.message}`);
  }

  let os_inseridas = 0;
  if (ordensInsert.length > 0) {
    const { error: osError } = await supabase
      .from('tbl_ordem_servico')
      .insert(ordensInsert);

    if (osError) {
      throw new Error(`Erro ao inserir ordens de serviço: ${osError.message}`);
    }
    os_inseridas = ordensInsert.length;
  }

  return {
    vendas_inseridas: vendasInsert.length,
    os_inseridas
  };
}
