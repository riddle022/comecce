/*
  # Add RLS Policies to tbl_ordem_servico and tbl_vendas

  ## Summary
  This migration enables Row Level Security (RLS) on the tbl_ordem_servico and tbl_vendas tables
  and creates comprehensive policies to control data access based on user permissions and company associations.

  ## Tables Modified
  
  ### tbl_ordem_servico
  - Enable RLS
  - Add SELECT policy: Users can view orders from their associated companies
  - Add INSERT policy: Users with edit permission can create orders for their companies
  - Add UPDATE policy: Users with edit permission can update orders from their companies
  - Add DELETE policy: Users with delete permission can remove orders from their companies

  ### tbl_vendas
  - Enable RLS
  - Add SELECT policy: Users can view sales from their associated companies
  - Add INSERT policy: Users with edit permission can create sales for their companies
  - Add UPDATE policy: Users with edit permission can update sales from their companies
  - Add DELETE policy: Users with delete permission can remove sales from their companies

  ## Security Model
  All policies enforce:
  - User must be authenticated
  - User must be active (via user_is_active() function)
  - User must have a group assigned (via user_has_group() function)
  - User can only access data from companies they are associated with (via user_empresas() function)
  - Edit operations require edit permission (via user_can_edit() function)
  - Delete operations require delete permission (via user_can_delete() function)

  ## Notes
  - These policies align with the existing RLS patterns used in tbl_produtos and other tables
  - Multi-tenancy is enforced at the database level through id_empresa filtering
  - Policies use existing helper functions for consistency
*/

-- =============================================
-- ENABLE RLS ON TABLES
-- =============================================

ALTER TABLE tbl_ordem_servico ENABLE ROW LEVEL SECURITY;
ALTER TABLE tbl_vendas ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS POLICIES - TBL_ORDEM_SERVICO
-- =============================================

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Users can view ordem_servico" ON tbl_ordem_servico;
DROP POLICY IF EXISTS "Users with permission can insert ordem_servico" ON tbl_ordem_servico;
DROP POLICY IF EXISTS "Users with permission can update ordem_servico" ON tbl_ordem_servico;
DROP POLICY IF EXISTS "Users with permission can delete ordem_servico" ON tbl_ordem_servico;

-- SELECT: Users can view orders from their associated companies
CREATE POLICY "Users can view ordem_servico"
  ON tbl_ordem_servico FOR SELECT
  TO authenticated
  USING (
    user_is_active() 
    AND user_has_group() 
    AND id_empresa IN (SELECT * FROM user_empresas())
  );

-- INSERT: Users with edit permission can create orders for their companies
CREATE POLICY "Users with permission can insert ordem_servico"
  ON tbl_ordem_servico FOR INSERT
  TO authenticated
  WITH CHECK (
    user_can_edit() 
    AND id_empresa IN (SELECT * FROM user_empresas())
  );

-- UPDATE: Users with edit permission can update orders from their companies
CREATE POLICY "Users with permission can update ordem_servico"
  ON tbl_ordem_servico FOR UPDATE
  TO authenticated
  USING (
    user_can_edit() 
    AND id_empresa IN (SELECT * FROM user_empresas())
  )
  WITH CHECK (
    user_can_edit() 
    AND id_empresa IN (SELECT * FROM user_empresas())
  );

-- DELETE: Users with delete permission can remove orders from their companies
CREATE POLICY "Users with permission can delete ordem_servico"
  ON tbl_ordem_servico FOR DELETE
  TO authenticated
  USING (
    user_can_delete() 
    AND id_empresa IN (SELECT * FROM user_empresas())
  );

-- =============================================
-- RLS POLICIES - TBL_VENDAS
-- =============================================

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Users can view vendas" ON tbl_vendas;
DROP POLICY IF EXISTS "Users with permission can insert vendas" ON tbl_vendas;
DROP POLICY IF EXISTS "Users with permission can update vendas" ON tbl_vendas;
DROP POLICY IF EXISTS "Users with permission can delete vendas" ON tbl_vendas;

-- SELECT: Users can view sales from their associated companies
CREATE POLICY "Users can view vendas"
  ON tbl_vendas FOR SELECT
  TO authenticated
  USING (
    user_is_active() 
    AND user_has_group() 
    AND id_empresa IN (SELECT * FROM user_empresas())
  );

-- INSERT: Users with edit permission can create sales for their companies
CREATE POLICY "Users with permission can insert vendas"
  ON tbl_vendas FOR INSERT
  TO authenticated
  WITH CHECK (
    user_can_edit() 
    AND id_empresa IN (SELECT * FROM user_empresas())
  );

-- UPDATE: Users with edit permission can update sales from their companies
CREATE POLICY "Users with permission can update vendas"
  ON tbl_vendas FOR UPDATE
  TO authenticated
  USING (
    user_can_edit() 
    AND id_empresa IN (SELECT * FROM user_empresas())
  )
  WITH CHECK (
    user_can_edit() 
    AND id_empresa IN (SELECT * FROM user_empresas())
  );

-- DELETE: Users with delete permission can remove sales from their companies
CREATE POLICY "Users with permission can delete vendas"
  ON tbl_vendas FOR DELETE
  TO authenticated
  USING (
    user_can_delete() 
    AND id_empresa IN (SELECT * FROM user_empresas())
  );
