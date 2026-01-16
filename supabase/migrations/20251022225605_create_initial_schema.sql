/*
  # Schema Inicial - Plataforma de Indicadores Contábeis

  ## Descrição
  Este migration cria a estrutura completa do banco de dados para a plataforma de análise contábil,
  incluindo gestão de usuários, grupos, empresas, permissões e dados contábeis.

  ## 1. Novas Tabelas

  ### `grupos`
  - `id` (uuid, primary key)
  - `nome` (text) - Nome do grupo
  - `descricao` (text) - Descrição do grupo
  - `permissoes` (jsonb) - Permissões do grupo (menus, edição, exclusão)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `perfis`
  - `id` (uuid, primary key, references auth.users)
  - `nome` (text) - Nome completo do usuário
  - `email` (text) - Email do usuário
  - `grupo_id` (uuid) - Referência ao grupo
  - `ativo` (boolean) - Status do usuário
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `empresas`
  - `id` (uuid, primary key)
  - `cnpj` (text, unique) - CNPJ da empresa
  - `razao_social` (text) - Razão social
  - `nome_fantasia` (text) - Nome fantasia
  - `ativo` (boolean) - Status da empresa
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `usuarios_empresas`
  - `id` (uuid, primary key)
  - `usuario_id` (uuid) - Referência ao usuário
  - `empresa_id` (uuid) - Referência à empresa
  - `created_at` (timestamptz)

  ### `dados_comerciais`
  - `id` (uuid, primary key)
  - `empresa_id` (uuid) - Referência à empresa
  - `periodo` (date) - Período dos dados
  - `faturamento_bruto` (numeric) - Faturamento bruto
  - `faturamento_por_vendedor` (jsonb) - Dados por vendedor
  - `faturamento_por_forma_pagamento` (jsonb) - Dados por forma de pagamento
  - `ticket_medio_geral` (numeric) - Ticket médio geral
  - `ticket_medio_por_os` (numeric) - Ticket médio por OS
  - `produtos_por_grupo` (jsonb) - Produtos vendidos por grupo
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `dados_operacionais`
  - `id` (uuid, primary key)
  - `empresa_id` (uuid) - Referência à empresa
  - `periodo` (date) - Período dos dados
  - `os_abertas` (integer) - Quantidade de OS abertas
  - `os_vendidas` (integer) - Quantidade de OS vendidas
  - `os_nao_vendidas` (integer) - Quantidade de OS não vendidas
  - `os_por_funcionario` (jsonb) - OS por funcionário
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `dados_financeiros`
  - `id` (uuid, primary key)
  - `empresa_id` (uuid) - Referência à empresa
  - `periodo` (date) - Período dos dados
  - `cmv` (numeric) - Custo de Mercadoria Vendida
  - `lucro_bruto` (numeric) - Lucro bruto
  - `margem_lucro_bruta` (numeric) - Margem de lucro bruta (%)
  - `receitas` (jsonb) - Detalhamento de receitas
  - `despesas` (jsonb) - Detalhamento de despesas
  - `ponto_equilibrio` (numeric) - Ponto de equilíbrio
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `arquivos_importados`
  - `id` (uuid, primary key)
  - `empresa_id` (uuid) - Referência à empresa
  - `nome_arquivo` (text) - Nome do arquivo
  - `tipo_arquivo` (text) - Tipo (xls, csv)
  - `url_storage` (text) - URL no Supabase Storage
  - `status` (text) - Status do processamento
  - `uploaded_by` (uuid) - Usuário que fez upload
  - `created_at` (timestamptz)

  ## 2. Segurança (RLS)
  - RLS habilitado em todas as tabelas
  - Políticas restritivas baseadas em autenticação e associação de empresas
  - Usuários só podem ver dados das empresas associadas a eles
  - Permissões de edição/exclusão baseadas no grupo

  ## 3. Índices
  - Índices em chaves estrangeiras para performance
  - Índices em campos de busca frequente (CNPJ, período)
*/

-- Criar tabela de grupos
CREATE TABLE IF NOT EXISTS grupos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  descricao text DEFAULT '',
  permissoes jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Criar tabela de perfis de usuários
CREATE TABLE IF NOT EXISTS perfis (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome text NOT NULL,
  email text NOT NULL,
  grupo_id uuid REFERENCES grupos(id) ON DELETE SET NULL,
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Criar tabela de empresas
CREATE TABLE IF NOT EXISTS empresas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cnpj text UNIQUE NOT NULL,
  razao_social text NOT NULL,
  nome_fantasia text DEFAULT '',
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Criar tabela de associação usuários-empresas
CREATE TABLE IF NOT EXISTS usuarios_empresas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid REFERENCES perfis(id) ON DELETE CASCADE,
  empresa_id uuid REFERENCES empresas(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(usuario_id, empresa_id)
);

-- Criar tabela de dados comerciais
CREATE TABLE IF NOT EXISTS dados_comerciais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid REFERENCES empresas(id) ON DELETE CASCADE,
  periodo date NOT NULL,
  faturamento_bruto numeric DEFAULT 0,
  faturamento_por_vendedor jsonb DEFAULT '[]',
  faturamento_por_forma_pagamento jsonb DEFAULT '[]',
  ticket_medio_geral numeric DEFAULT 0,
  ticket_medio_por_os numeric DEFAULT 0,
  produtos_por_grupo jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(empresa_id, periodo)
);

-- Criar tabela de dados operacionais
CREATE TABLE IF NOT EXISTS dados_operacionais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid REFERENCES empresas(id) ON DELETE CASCADE,
  periodo date NOT NULL,
  os_abertas integer DEFAULT 0,
  os_vendidas integer DEFAULT 0,
  os_nao_vendidas integer DEFAULT 0,
  os_por_funcionario jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(empresa_id, periodo)
);

-- Criar tabela de dados financeiros
CREATE TABLE IF NOT EXISTS dados_financeiros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid REFERENCES empresas(id) ON DELETE CASCADE,
  periodo date NOT NULL,
  cmv numeric DEFAULT 0,
  lucro_bruto numeric DEFAULT 0,
  margem_lucro_bruta numeric DEFAULT 0,
  receitas jsonb DEFAULT '{}',
  despesas jsonb DEFAULT '{}',
  ponto_equilibrio numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(empresa_id, periodo)
);

-- Criar tabela de arquivos importados
CREATE TABLE IF NOT EXISTS arquivos_importados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid REFERENCES empresas(id) ON DELETE CASCADE,
  nome_arquivo text NOT NULL,
  tipo_arquivo text NOT NULL,
  url_storage text DEFAULT '',
  status text DEFAULT 'processando',
  uploaded_by uuid REFERENCES perfis(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_perfis_grupo ON perfis(grupo_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_empresas_usuario ON usuarios_empresas(usuario_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_empresas_empresa ON usuarios_empresas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_empresas_cnpj ON empresas(cnpj);
CREATE INDEX IF NOT EXISTS idx_dados_comerciais_empresa_periodo ON dados_comerciais(empresa_id, periodo);
CREATE INDEX IF NOT EXISTS idx_dados_operacionais_empresa_periodo ON dados_operacionais(empresa_id, periodo);
CREATE INDEX IF NOT EXISTS idx_dados_financeiros_empresa_periodo ON dados_financeiros(empresa_id, periodo);

-- Habilitar RLS em todas as tabelas
ALTER TABLE grupos ENABLE ROW LEVEL SECURITY;
ALTER TABLE perfis ENABLE ROW LEVEL SECURITY;
ALTER TABLE empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios_empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE dados_comerciais ENABLE ROW LEVEL SECURITY;
ALTER TABLE dados_operacionais ENABLE ROW LEVEL SECURITY;
ALTER TABLE dados_financeiros ENABLE ROW LEVEL SECURITY;
ALTER TABLE arquivos_importados ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para grupos
CREATE POLICY "Usuários autenticados podem ver grupos"
  ON grupos FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Apenas administradores podem criar grupos"
  ON grupos FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM perfis
      WHERE perfis.id = auth.uid()
      AND perfis.grupo_id IN (
        SELECT id FROM grupos WHERE permissoes->>'admin' = 'true'
      )
    )
  );

CREATE POLICY "Apenas administradores podem atualizar grupos"
  ON grupos FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM perfis
      WHERE perfis.id = auth.uid()
      AND perfis.grupo_id IN (
        SELECT id FROM grupos WHERE permissoes->>'admin' = 'true'
      )
    )
  );

-- Políticas RLS para perfis
CREATE POLICY "Usuários podem ver próprio perfil"
  ON perfis FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Administradores podem ver todos os perfis"
  ON perfis FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM perfis p
      JOIN grupos g ON p.grupo_id = g.id
      WHERE p.id = auth.uid()
      AND g.permissoes->>'admin' = 'true'
    )
  );

CREATE POLICY "Sistema pode criar perfis"
  ON perfis FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "Usuários podem atualizar próprio perfil"
  ON perfis FOR UPDATE
  TO authenticated
  USING (id = auth.uid());

-- Políticas RLS para empresas
CREATE POLICY "Usuários podem ver empresas associadas"
  ON empresas FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios_empresas
      WHERE usuarios_empresas.empresa_id = empresas.id
      AND usuarios_empresas.usuario_id = auth.uid()
    )
  );

CREATE POLICY "Administradores podem criar empresas"
  ON empresas FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM perfis p
      JOIN grupos g ON p.grupo_id = g.id
      WHERE p.id = auth.uid()
      AND g.permissoes->>'admin' = 'true'
    )
  );

CREATE POLICY "Administradores podem atualizar empresas"
  ON empresas FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM perfis p
      JOIN grupos g ON p.grupo_id = g.id
      WHERE p.id = auth.uid()
      AND g.permissoes->>'admin' = 'true'
    )
  );

-- Políticas RLS para usuarios_empresas
CREATE POLICY "Usuários podem ver próprias associações"
  ON usuarios_empresas FOR SELECT
  TO authenticated
  USING (usuario_id = auth.uid());

CREATE POLICY "Administradores podem ver todas associações"
  ON usuarios_empresas FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM perfis p
      JOIN grupos g ON p.grupo_id = g.id
      WHERE p.id = auth.uid()
      AND g.permissoes->>'admin' = 'true'
    )
  );

CREATE POLICY "Administradores podem criar associações"
  ON usuarios_empresas FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM perfis p
      JOIN grupos g ON p.grupo_id = g.id
      WHERE p.id = auth.uid()
      AND g.permissoes->>'admin' = 'true'
    )
  );

-- Políticas RLS para dados comerciais
CREATE POLICY "Usuários podem ver dados de empresas associadas"
  ON dados_comerciais FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios_empresas
      WHERE usuarios_empresas.empresa_id = dados_comerciais.empresa_id
      AND usuarios_empresas.usuario_id = auth.uid()
    )
  );

CREATE POLICY "Usuários com permissão podem inserir dados comerciais"
  ON dados_comerciais FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM perfis p
      JOIN grupos g ON p.grupo_id = g.id
      WHERE p.id = auth.uid()
      AND (g.permissoes->>'edit_data' = 'true' OR g.permissoes->>'admin' = 'true')
    )
  );

CREATE POLICY "Usuários com permissão podem atualizar dados comerciais"
  ON dados_comerciais FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM perfis p
      JOIN grupos g ON p.grupo_id = g.id
      WHERE p.id = auth.uid()
      AND (g.permissoes->>'edit_data' = 'true' OR g.permissoes->>'admin' = 'true')
    )
  );

-- Políticas RLS para dados operacionais
CREATE POLICY "Usuários podem ver dados operacionais de empresas associadas"
  ON dados_operacionais FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios_empresas
      WHERE usuarios_empresas.empresa_id = dados_operacionais.empresa_id
      AND usuarios_empresas.usuario_id = auth.uid()
    )
  );

CREATE POLICY "Usuários com permissão podem inserir dados operacionais"
  ON dados_operacionais FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM perfis p
      JOIN grupos g ON p.grupo_id = g.id
      WHERE p.id = auth.uid()
      AND (g.permissoes->>'edit_data' = 'true' OR g.permissoes->>'admin' = 'true')
    )
  );

CREATE POLICY "Usuários com permissão podem atualizar dados operacionais"
  ON dados_operacionais FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM perfis p
      JOIN grupos g ON p.grupo_id = g.id
      WHERE p.id = auth.uid()
      AND (g.permissoes->>'edit_data' = 'true' OR g.permissoes->>'admin' = 'true')
    )
  );

-- Políticas RLS para dados financeiros
CREATE POLICY "Usuários podem ver dados financeiros de empresas associadas"
  ON dados_financeiros FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios_empresas
      WHERE usuarios_empresas.empresa_id = dados_financeiros.empresa_id
      AND usuarios_empresas.usuario_id = auth.uid()
    )
  );

CREATE POLICY "Usuários com permissão podem inserir dados financeiros"
  ON dados_financeiros FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM perfis p
      JOIN grupos g ON p.grupo_id = g.id
      WHERE p.id = auth.uid()
      AND (g.permissoes->>'edit_data' = 'true' OR g.permissoes->>'admin' = 'true')
    )
  );

CREATE POLICY "Usuários com permissão podem atualizar dados financeiros"
  ON dados_financeiros FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM perfis p
      JOIN grupos g ON p.grupo_id = g.id
      WHERE p.id = auth.uid()
      AND (g.permissoes->>'edit_data' = 'true' OR g.permissoes->>'admin' = 'true')
    )
  );

-- Políticas RLS para arquivos importados
CREATE POLICY "Usuários podem ver arquivos de empresas associadas"
  ON arquivos_importados FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios_empresas
      WHERE usuarios_empresas.empresa_id = arquivos_importados.empresa_id
      AND usuarios_empresas.usuario_id = auth.uid()
    )
  );

CREATE POLICY "Usuários autenticados podem fazer upload"
  ON arquivos_importados FOR INSERT
  TO authenticated
  WITH CHECK (uploaded_by = auth.uid());

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para atualizar updated_at
CREATE TRIGGER update_grupos_updated_at BEFORE UPDATE ON grupos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_perfis_updated_at BEFORE UPDATE ON perfis
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_empresas_updated_at BEFORE UPDATE ON empresas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dados_comerciais_updated_at BEFORE UPDATE ON dados_comerciais
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dados_operacionais_updated_at BEFORE UPDATE ON dados_operacionais
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dados_financeiros_updated_at BEFORE UPDATE ON dados_financeiros
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();