export interface ErrorRecord {
  arquivo: string;
  linha?: number;
  coluna?: string;
  valor?: any;
  descricao: string;
}

export interface VendaBase {
  numero_venda: number;
  data_venda: string | null;
  numero_os: number | null;
  ds_vendedor: string | null;
  ds_cliente: string | null;
  ds_forma_pagamento: string | null;
  item_ds_referencia: string;
  item_ds_descricao: string | null;
  item_nr_quantidade: number;
  item_valor_original: number | null;
  item_valor_ajuste: number | null;
  item_valor_unitario: number | null;
  item_valor_total_bruto: number | null;
  item_desconto_total: number | null;
  item_valor_total_liquido: number | null;
}

export interface VendaEnriquecida extends VendaBase {
  item_ds_grupo: string | null;
  item_ds_grife: string | null;
  item_ds_fornecedor: string | null;
  item_vl_custo_unitario: number | null;
}

export interface ProdutoData {
  item_ds_referencia: string;
  item_ds_grupo: string | null;
  item_ds_grife: string | null;
  item_ds_fornecedor: string | null;
  quantidade: number | null;
  custo_total: number | null;
  custo_unitario: number | null;
  vendas_referencias: number[];
  os_referencias: number[];
}

export interface OrdemServicoData {
  numero_os: number;
  dt_abertura_os: string | null;
  status_os: string | null;
  status_da_venda: string | null;
  ds_etapa_atual: string | null;
  dt_previsao_entrega: string | null;
  dt_entrega: string | null;
  ds_vendedor: string | null;
  item_ds_referencia: string;
  item_ds_descricao: string | null;
  item_nr_quantidade: number;
  item_vl_original: number | null;
  item_vl_ajuste: number | null;
  item_vl_unitario: number | null;
  item_vl_total_bruto: number | null;
  item_vl_desconto_total: number | null;
  item_vl_total_liquido: number | null;
  item_ds_grupo: string | null;
  item_ds_grife: string | null;
  item_ds_fornecedor: string | null;
  item_vl_custo_unitario: number | null;
}

export interface ProcessingResult {
  status: 'sucesso' | 'falha';
  total_vendas: number;
  total_produtos: number;
  total_ordens_servico: number;
  erros: ErrorRecord[];
  message?: string;
}

export interface VendaInsert {
  id_empresa: string;
  numero_venda: number;
  data_venda: string | null;
  numero_os: number | null;
  ds_vendedor: string | null;
  ds_cliente: string | null;
  ds_forma_pagamento: string | null;
  item_ds_referencia: string;
  item_ds_descricao: string | null;
  item_nr_quantidade: number;
  item_valor_original: number | null;
  item_valor_ajuste: number | null;
  item_valor_unitario: number | null;
  item_valor_total_bruto: number | null;
  item_desconto_total: number | null;
  item_valor_total_liquido: number | null;
  item_ds_grupo: string | null;
  item_ds_grife: string | null;
  item_ds_fornecedor: string | null;
  item_vl_custo_unitario: number | null;
}

export interface OrdemServicoInsert {
  id_empresa: string;
  numero_os: number;
  dt_abertura_os: string | null;
  status_os: string | null;
  status_da_venda: string | null;
  ds_etapa_atual: string | null;
  dt_previsao_entrega: string | null;
  dt_entrega: string | null;
  ds_vendedor: string | null;
  item_ds_referencia: string;
  item_ds_descricao: string | null;
  item_nr_quantidade: number;
  item_vl_original: number | null;
  item_vl_ajuste: number | null;
  item_vl_unitario: number | null;
  item_vl_total_bruto: number | null;
  item_vl_desconto_total: number | null;
  item_vl_total_liquido: number | null;
  item_ds_grupo: string | null;
  item_ds_grife: string | null;
  item_ds_fornecedor: string | null;
  item_vl_custo_unitario: number | null;
}
