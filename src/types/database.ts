export interface Grupo {
  id: string;
  nome: string;
  descricao: string;
  permissoes: {
    admin?: boolean;
    edit_data?: boolean;
    delete_data?: boolean;
    menus?: string[];
  };
  created_at: string;
  updated_at: string;
}

export interface Perfil {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  grupo_id: string | null;
  grupo?: Grupo;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface GrupoEconomico {
  uuid: string;
  id_grupo: string;
  ds_grupo: string;
  created_at: string;
  updated_at: string;
}

export interface Empresa {
  id_empresa: string;
  cnpj: string;
  ds_empresa: string;
  telefone: string;
  email?: string;
  grupoeco_id?: string | null;
  tbl_grupos_economicos?: GrupoEconomico;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface UsuarioEmpresa {
  id: string;
  usuario_id: string;
  empresa_id: string;
  created_at: string;
}

export interface DadosComerciais {
  id: string;
  empresa_id: string;
  periodo: string;
  faturamento_bruto: number;
  faturamento_por_vendedor: Array<{ vendedor: string; valor: number }>;
  faturamento_por_forma_pagamento: Array<{ forma: string; valor: number }>;
  ticket_medio_geral: number;
  ticket_medio_por_os: number;
  produtos_por_grupo: Array<{ grupo: string; quantidade: number; valor: number }>;
  created_at: string;
  updated_at: string;
}

export interface DadosOperacionais {
  id: string;
  empresa_id: string;
  periodo: string;
  os_abertas: number;
  os_vendidas: number;
  os_nao_vendidas: number;
  os_por_funcionario: Array<{ funcionario: string; quantidade: number }>;
  created_at: string;
  updated_at: string;
}

export interface DadosFinanceiros {
  id: string;
  empresa_id: string;
  periodo: string;
  cmv: number;
  lucro_bruto: number;
  margem_lucro_bruta: number;
  receitas: {
    operacional: number;
    nao_operacional: number;
  };
  despesas: {
    operacional: number;
    administrativa: number;
    financeira: number;
  };
  ponto_equilibrio: number;
  created_at: string;
  updated_at: string;
}

export interface ArquivoImportado {
  id: string;
  empresa_id: string;
  nome_arquivo: string;
  tipo_arquivo: string;
  url_storage: string;
  status: string;
  uploaded_by: string;
  created_at: string;
}

export interface HistoricoUpload {
  id_upload: string;
  id_empresa: string;
  data_upload: string;
  arquivo_vendas: string | null;
  arquivo_produtos: string | null;
  arquivo_os: string | null;
  ds_arquivo: string | null;
  tipo_importacao: string | null;
  total_registros: number | null;
  total_financeiro?: number | null;
  arquivo_financeiro?: string | null;
  total_vendas: number;
  total_os: number;
  status: string;
  empresas?: Empresa;
}
