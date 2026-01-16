/*
  # Schema Completo - Plataforma NEXUS OS

  ## Descrição
  Cria toda a estrutura do banco de dados para a plataforma de análise contábil,
  incluindo gestão de usuários, grupos, empresas, permissões e dados contábeis.

  ## 1. Novas Tabelas

  ### `grupos`
  Armazena os perfis/grupos de usuários com suas permissões
  - `id` (uuid, primary key)
  - `nome` (text) - Nome do grupo (ex: Administrador, Analista)
  - `descricao` (text) - Descrição do grupo
  - `permissoes` (jsonb) - Objeto com permissões (admin, edit_data, delete_data, menus)
  - `created_at` (timestamptz) - Data de criação
  - `updated_at` (timestamptz) - Data de atualização

  ### `perfis`
  Perfis dos usuários do sistema
  - `id` (uuid, primary key, references auth.users)
  - `nome` (text) - Nome completo do usuário
  - `email` (text) - Email do usuário
  - `grupo_id` (uuid) - Referência ao grupo
  - `ativo` (boolean) - Status ativo/inativo
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `empresas`
  Cadastro de empresas brasileiras
  - `id` (uuid, primary key)
  - `cnpj` (text, unique) - CNPJ da empresa
  - `razao_social` (text) - Razão social
  - `nome_fantasia` (text) - Nome fantasia
  - `ativo` (boolean) - Status da empresa
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `usuarios_empresas`
  Relacionamento N:N entre usuários e empresas
  - `id` (uuid, primary key)
  - `usuario_id` (uuid) - Referência ao perfil do usuário
  - `empresa_id` (uuid) - Referência à empresa
  - `created_at` (timestamptz)

  ### `dados_comerciais`
  Dados comerciais das empresas por período
  - `id` (uuid, primary key)
  - `empresa_id` (uuid)
  - `periodo` (date) - Período (mês/ano)
  - `faturamento_bruto` (numeric)
  - `faturamento_por_vendedor` (jsonb)
  - `faturamento_por_forma_pagamento` (jsonb)
  - `ticket_medio_geral` (numeric)
  - `ticket_medio_por_os` (numeric)
  - `produtos_por_grupo` (jsonb)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `dados_operacionais`
  Dados operacionais (OS) por período
  - `id` (uuid, primary key)
  - `empresa_id` (uuid)
  - `periodo` (date)
  - `os_abertas` (integer)
  - `os_vendidas` (integer)
  - `os_nao_vendidas` (integer)
  - `os_por_funcionario` (jsonb)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `dados_financeiros`
  Dados financeiros e DRE por período
  - `id` (uuid, primary key)
  - `empresa_id` (uuid)
  - `periodo` (date)
  - `cmv` (numeric) - Custo de Mercadoria Vendida
  - `lucro_bruto` (numeric)
  - `margem_lucro_bruta` (numeric) - Percentual
  - `receitas` (jsonb) - Detalhamento
  - `despesas` (jsonb) - Detalhamento
  - `ponto_equilibrio` (numeric)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `arquivos_importados`
  Histórico de uploads XLS/CSV
  - `id` (uuid, primary key)
  - `empresa_id` (uuid)
  - `nome_arquivo` (text)
  - `tipo_arquivo` (text) - xls, xlsx, csv
  - `url_storage` (text) - URL no Supabase Storage
  - `status` (text) - processando, sucesso, erro
  - `uploaded_by` (uuid) - Usuário que fez upload
  - `created_at` (timestamptz)

  ## 2. Segurança (RLS)
  - RLS habilitado em TODAS as tabelas
  - Políticas restritivas: usuários só veem dados das empresas associadas
  - Permissões de edição/exclusão baseadas no grupo
  - Administradores têm acesso completo

  ## 3. Índices
  - Índices em foreign keys para performance
  - Índices em campos de busca (CNPJ, período, email)
  - Índices compostos para queries frequentes

  ## 4. Triggers
  - Auto-atualização de updated_at
*/

-- =============================================
-- TABELAS
-- =============================================

-- Tabela de grupos/perfis
CREATE TABLE IF NOT EXISTS grupos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  descricao text DEFAULT '',
  permissoes jsonb DEFAULT '{"admin": false, "edit_data": false, "delete_data": false, "menus": []}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabela de perfis de usuários
CREATE TABLE IF NOT EXISTS perfis (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome text NOT NULL,
  email text NOT NULL,
  grupo_id uuid REFERENCES grupos(id) ON DELETE SET NULL,
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabela de empresas
CREATE TABLE IF NOT EXISTS empresas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cnpj text UNIQUE NOT NULL,
  razao_social text NOT NULL,
  nome_fantasia text DEFAULT '',
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabela de associação usuários-empresas
CREATE TABLE IF NOT EXISTS usuarios_empresas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid REFERENCES perfis(id) ON DELETE CASCADE NOT NULL,
  empresa_id uuid REFERENCES empresas(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(usuario_id, empresa_id)
);

-- Tabela de dados comerciais
CREATE TABLE IF NOT EXISTS dados_comerciais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid REFERENCES empresas(id) ON DELETE CASCADE NOT NULL,
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

-- Tabela de dados operacionais
CREATE TABLE IF NOT EXISTS dados_operacionais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid REFERENCES empresas(id) ON DELETE CASCADE NOT NULL,
  periodo date NOT NULL,
  os_abertas integer DEFAULT 0,
  os_vendidas integer DEFAULT 0,
  os_nao_vendidas integer DEFAULT 0,
  os_por_funcionario jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(empresa_id, periodo)
);

-- Tabela de dados financeiros
CREATE TABLE IF NOT EXISTS dados_financeiros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid REFERENCES empresas(id) ON DELETE CASCADE NOT NULL,
  periodo date NOT NULL,
  cmv numeric DEFAULT 0,
  lucro_bruto numeric DEFAULT 0,
  margem_lucro_bruta numeric DEFAULT 0,
  receitas jsonb DEFAULT '{"operacional": 0, "nao_operacional": 0}',
  despesas jsonb DEFAULT '{"operacional": 0, "administrativa": 0, "financeira": 0}',
  ponto_equilibrio numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(empresa_id, periodo)
);

-- Tabela de arquivos importados
CREATE TABLE IF NOT EXISTS arquivos_importados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid REFERENCES empresas(id) ON DELETE CASCADE NOT NULL,
  nome_arquivo text NOT NULL,
  tipo_arquivo text NOT NULL,
  url_storage text DEFAULT '',
  status text DEFAULT 'processando',
  uploaded_by uuid REFERENCES perfis(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- =============================================
-- ÍNDICES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_perfis_grupo ON perfis(grupo_id);
CREATE INDEX IF NOT EXISTS idx_perfis_email ON perfis(email);
CREATE INDEX IF NOT EXISTS idx_usuarios_empresas_usuario ON usuarios_empresas(usuario_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_empresas_empresa ON usuarios_empresas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_empresas_cnpj ON empresas(cnpj);
CREATE INDEX IF NOT EXISTS idx_dados_comerciais_empresa ON dados_comerciais(empresa_id);
CREATE INDEX IF NOT EXISTS idx_dados_comerciais_periodo ON dados_comerciais(periodo);
CREATE INDEX IF NOT EXISTS idx_dados_comerciais_empresa_periodo ON dados_comerciais(empresa_id, periodo);
CREATE INDEX IF NOT EXISTS idx_dados_operacionais_empresa ON dados_operacionais(empresa_id);
CREATE INDEX IF NOT EXISTS idx_dados_operacionais_periodo ON dados_operacionais(periodo);
CREATE INDEX IF NOT EXISTS idx_dados_operacionais_empresa_periodo ON dados_operacionais(empresa_id, periodo);
CREATE INDEX IF NOT EXISTS idx_dados_financeiros_empresa ON dados_financeiros(empresa_id);
CREATE INDEX IF NOT EXISTS idx_dados_financeiros_periodo ON dados_financeiros(periodo);
CREATE INDEX IF NOT EXISTS idx_dados_financeiros_empresa_periodo ON dados_financeiros(empresa_id, periodo);
CREATE INDEX IF NOT EXISTS idx_arquivos_empresa ON arquivos_importados(empresa_id);
CREATE INDEX IF NOT EXISTS idx_arquivos_status ON arquivos_importados(status);

-- =============================================
-- HABILITAR RLS
-- =============================================

ALTER TABLE grupos ENABLE ROW LEVEL SECURITY;
ALTER TABLE perfis ENABLE ROW LEVEL SECURITY;
ALTER TABLE empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios_empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE dados_comerciais ENABLE ROW LEVEL SECURITY;
ALTER TABLE dados_operacionais ENABLE ROW LEVEL SECURITY;
ALTER TABLE dados_financeiros ENABLE ROW LEVEL SECURITY;
ALTER TABLE arquivos_importados ENABLE ROW LEVEL SECURITY;

-- =============================================
-- POLÍTICAS RLS - GRUPOS
-- =============================================

CREATE POLICY "Usuários autenticados podem ver grupos"
  ON grupos FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Administradores podem inserir grupos"
  ON grupos FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM perfis p
      JOIN grupos g ON p.grupo_id = g.id
      WHERE p.id = auth.uid()
      AND (g.permissoes->>'admin')::boolean = true
    )
  );

CREATE POLICY "Administradores podem atualizar grupos"
  ON grupos FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM perfis p
      JOIN grupos g ON p.grupo_id = g.id
      WHERE p.id = auth.uid()
      AND (g.permissoes->>'admin')::boolean = true
    )
  );

CREATE POLICY "Administradores podem deletar grupos"
  ON grupos FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM perfis p
      JOIN grupos g ON p.grupo_id = g.id
      WHERE p.id = auth.uid()
      AND (g.permissoes->>'admin')::boolean = true
    )
  );

-- =============================================
-- POLÍTICAS RLS - PERFIS
-- =============================================

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
      AND (g.permissoes->>'admin')::boolean = true
    )
  );

CREATE POLICY "Sistema pode criar perfis no signup"
  ON perfis FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "Usuários podem atualizar próprio perfil"
  ON perfis FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "Administradores podem atualizar qualquer perfil"
  ON perfis FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM perfis p
      JOIN grupos g ON p.grupo_id = g.id
      WHERE p.id = auth.uid()
      AND (g.permissoes->>'admin')::boolean = true
    )
  );

-- =============================================
-- POLÍTICAS RLS - EMPRESAS
-- =============================================

CREATE POLICY "Usuários podem ver empresas associadas"
  ON empresas FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT empresa_id FROM usuarios_empresas
      WHERE usuario_id = auth.uid()
    )
  );

CREATE POLICY "Administradores podem ver todas empresas"
  ON empresas FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM perfis p
      JOIN grupos g ON p.grupo_id = g.id
      WHERE p.id = auth.uid()
      AND (g.permissoes->>'admin')::boolean = true
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
      AND (g.permissoes->>'admin')::boolean = true
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
      AND (g.permissoes->>'admin')::boolean = true
    )
  );

CREATE POLICY "Administradores podem deletar empresas"
  ON empresas FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM perfis p
      JOIN grupos g ON p.grupo_id = g.id
      WHERE p.id = auth.uid()
      AND (g.permissoes->>'admin')::boolean = true
    )
  );

-- =============================================
-- POLÍTICAS RLS - USUARIOS_EMPRESAS
-- =============================================

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
      AND (g.permissoes->>'admin')::boolean = true
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
      AND (g.permissoes->>'admin')::boolean = true
    )
  );

CREATE POLICY "Administradores podem deletar associações"
  ON usuarios_empresas FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM perfis p
      JOIN grupos g ON p.grupo_id = g.id
      WHERE p.id = auth.uid()
      AND (g.permissoes->>'admin')::boolean = true
    )
  );

-- =============================================
-- POLÍTICAS RLS - DADOS COMERCIAIS
-- =============================================

CREATE POLICY "Usuários podem ver dados comerciais de empresas associadas"
  ON dados_comerciais FOR SELECT
  TO authenticated
  USING (
    empresa_id IN (
      SELECT empresa_id FROM usuarios_empresas
      WHERE usuario_id = auth.uid()
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
      AND ((g.permissoes->>'edit_data')::boolean = true OR (g.permissoes->>'admin')::boolean = true)
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
      AND ((g.permissoes->>'edit_data')::boolean = true OR (g.permissoes->>'admin')::boolean = true)
    )
  );

CREATE POLICY "Usuários com permissão podem deletar dados comerciais"
  ON dados_comerciais FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM perfis p
      JOIN grupos g ON p.grupo_id = g.id
      WHERE p.id = auth.uid()
      AND ((g.permissoes->>'delete_data')::boolean = true OR (g.permissoes->>'admin')::boolean = true)
    )
  );

-- =============================================
-- POLÍTICAS RLS - DADOS OPERACIONAIS
-- =============================================

CREATE POLICY "Usuários podem ver dados operacionais de empresas associadas"
  ON dados_operacionais FOR SELECT
  TO authenticated
  USING (
    empresa_id IN (
      SELECT empresa_id FROM usuarios_empresas
      WHERE usuario_id = auth.uid()
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
      AND ((g.permissoes->>'edit_data')::boolean = true OR (g.permissoes->>'admin')::boolean = true)
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
      AND ((g.permissoes->>'edit_data')::boolean = true OR (g.permissoes->>'admin')::boolean = true)
    )
  );

CREATE POLICY "Usuários com permissão podem deletar dados operacionais"
  ON dados_operacionais FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM perfis p
      JOIN grupos g ON p.grupo_id = g.id
      WHERE p.id = auth.uid()
      AND ((g.permissoes->>'delete_data')::boolean = true OR (g.permissoes->>'admin')::boolean = true)
    )
  );

-- =============================================
-- POLÍTICAS RLS - DADOS FINANCEIROS
-- =============================================

CREATE POLICY "Usuários podem ver dados financeiros de empresas associadas"
  ON dados_financeiros FOR SELECT
  TO authenticated
  USING (
    empresa_id IN (
      SELECT empresa_id FROM usuarios_empresas
      WHERE usuario_id = auth.uid()
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
      AND ((g.permissoes->>'edit_data')::boolean = true OR (g.permissoes->>'admin')::boolean = true)
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
      AND ((g.permissoes->>'edit_data')::boolean = true OR (g.permissoes->>'admin')::boolean = true)
    )
  );

CREATE POLICY "Usuários com permissão podem deletar dados financeiros"
  ON dados_financeiros FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM perfis p
      JOIN grupos g ON p.grupo_id = g.id
      WHERE p.id = auth.uid()
      AND ((g.permissoes->>'delete_data')::boolean = true OR (g.permissoes->>'admin')::boolean = true)
    )
  );

-- =============================================
-- POLÍTICAS RLS - ARQUIVOS IMPORTADOS
-- =============================================

CREATE POLICY "Usuários podem ver arquivos de empresas associadas"
  ON arquivos_importados FOR SELECT
  TO authenticated
  USING (
    empresa_id IN (
      SELECT empresa_id FROM usuarios_empresas
      WHERE usuario_id = auth.uid()
    )
  );

CREATE POLICY "Usuários autenticados podem fazer upload"
  ON arquivos_importados FOR INSERT
  TO authenticated
  WITH CHECK (uploaded_by = auth.uid());

CREATE POLICY "Usuários podem atualizar status dos próprios uploads"
  ON arquivos_importados FOR UPDATE
  TO authenticated
  USING (uploaded_by = auth.uid())
  WITH CHECK (uploaded_by = auth.uid());

-- =============================================
-- FUNÇÕES E TRIGGERS
-- =============================================

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para atualizar updated_at
DROP TRIGGER IF EXISTS update_grupos_updated_at ON grupos;
CREATE TRIGGER update_grupos_updated_at 
  BEFORE UPDATE ON grupos
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_perfis_updated_at ON perfis;
CREATE TRIGGER update_perfis_updated_at 
  BEFORE UPDATE ON perfis
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_empresas_updated_at ON empresas;
CREATE TRIGGER update_empresas_updated_at 
  BEFORE UPDATE ON empresas
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_dados_comerciais_updated_at ON dados_comerciais;
CREATE TRIGGER update_dados_comerciais_updated_at 
  BEFORE UPDATE ON dados_comerciais
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_dados_operacionais_updated_at ON dados_operacionais;
CREATE TRIGGER update_dados_operacionais_updated_at 
  BEFORE UPDATE ON dados_operacionais
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_dados_financeiros_updated_at ON dados_financeiros;
CREATE TRIGGER update_dados_financeiros_updated_at 
  BEFORE UPDATE ON dados_financeiros
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- DADOS INICIAIS (SEED)
-- =============================================

-- Inserir grupo Administrador padrão
INSERT INTO grupos (nome, descricao, permissoes)
VALUES (
  'Administrador',
  'Acesso completo ao sistema',
  '{"admin": true, "edit_data": true, "delete_data": true, "menus": ["dashboard", "comercial", "operacional", "financeiro", "upload", "usuarios", "grupos", "empresas"]}'
)
ON CONFLICT DO NOTHING;

-- Inserir grupo Analista padrão
INSERT INTO grupos (nome, descricao, permissoes)
VALUES (
  'Analista',
  'Visualização e edição de dados',
  '{"admin": false, "edit_data": true, "delete_data": false, "menus": ["dashboard", "comercial", "operacional", "financeiro", "upload"]}'
)
ON CONFLICT DO NOTHING;

-- Inserir grupo Visualizador padrão
INSERT INTO grupos (nome, descricao, permissoes)
VALUES (
  'Visualizador',
  'Apenas visualização de dados',
  '{"admin": false, "edit_data": false, "delete_data": false, "menus": ["dashboard", "comercial", "operacional", "financeiro"]}'
)
ON CONFLICT DO NOTHING;