import { SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { compareNormalized } from '../utils/textUtils.ts';

export async function getEmpresaIdByName(
  supabase: SupabaseClient,
  ds_empresa: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from('empresas')
    .select('id_empresa, ds_empresa')
    .eq('ativo', true);

  if (error) {
    throw new Error(`Erro ao buscar empresa: ${error.message}`);
  }

  if (!data || data.length === 0) {
    throw new Error('Nenhuma empresa ativa encontrada');
  }

  const empresa = data.find((e: any) => compareNormalized(e.ds_empresa, ds_empresa));

  if (!empresa) {
    throw new Error(`Empresa "${ds_empresa}" não encontrada no sistema`);
  }

  return empresa.id_empresa;
}
