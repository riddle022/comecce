import { createClient } from 'npm:@supabase/supabase-js@2';
import * as XLSX from 'npm:xlsx@0.18.5';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

// ============================================================
// TIPOS
// ============================================================

interface LancamentoInsert {
  id_empresa:   string;
  id_upload:    string;
  id_origem:    number | null;
  codigo:       string;
  grupo:        string;
  subcategoria: string | null;
  data:         string; // 'YYYY-MM-DD'
  valor:        number;
}

// ============================================================
// HELPERS
// ============================================================

/** Converte data Excel (serial number ou string) para 'YYYY-MM-DD' */
function toDateString(raw: unknown): string | null {
  if (!raw) return null;

  // Já é string tipo '2026-01-02 08:09:30' ou '2026-01-02'
  if (typeof raw === 'string') {
    const d = new Date(raw);
    if (isNaN(d.getTime())) return null;
    return d.toISOString().split('T')[0];
  }

  // Serial number do Excel
  if (typeof raw === 'number') {
    const d = new Date((raw - 25569) * 86400 * 1000);
    if (isNaN(d.getTime())) return null;
    return d.toISOString().split('T')[0];
  }

  // Date object
  if (raw instanceof Date) {
    return raw.toISOString().split('T')[0];
  }

  return null;
}

/** Extrai codigo, grupo e subcategoria da coluna categoria
 *  Formato: "1.001 - Receitas de Vendas >> Adiantamento Ordem de Serviço"
 *  Resultado: { codigo: '1001', grupo: 'Receitas de Vendas', subcategoria: 'Adiantamento...' }
 */
function parseCategoria(categoria: string): { codigo: string; grupo: string; subcategoria: string | null } {
  const partes = categoria.split(' - ');
  const codigoRaw = partes[0]?.trim().replace(/\./g, '') ?? '';

  const resto = partes.slice(1).join(' - ');
  const subPartes = resto.split(' >> ');

  const grupo       = subPartes[0]?.trim() ?? '';
  const subcategoria = subPartes[1]?.trim() ?? null;

  return { codigo: codigoRaw, grupo, subcategoria };
}

/** Lê arquivo Excel do FormData e retorna array de rows (arrays) */
function parseExcel(buffer: ArrayBuffer): unknown[][] {
  const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array', cellDates: false });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  return XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null }) as unknown[][];
}

/** Lê aba específica de um Excel */
function parseExcelSheet(buffer: ArrayBuffer, sheetName: string): unknown[][] {
  const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array', cellDates: false });
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) throw new Error(`Aba "${sheetName}" não encontrada no arquivo`);
  return XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null }) as unknown[][];
}

// ============================================================
// PARSERS POR ARQUIVO
// ============================================================

/**
 * resultado_financeiro → aba receitas ou despesas
 * Colunas: [0]id_origem [1]categoria [3]data [4]valor
 * Linha 0 = header, ignorar
 */
function parseResultadoFinanceiro(
  buffer: ArrayBuffer,
  idEmpresa: string,
  idUpload: string,
  aba: 'receitas' | 'despesas'
): LancamentoInsert[] {
  const rows = parseExcelSheet(buffer, aba);
  const lancamentos: LancamentoInsert[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || !row[1] || !row[3] || row[4] === null) continue;

    const categoria  = String(row[1]).trim();
    const data       = toDateString(row[3]);
    const valor      = parseFloat(String(row[4]));

    if (!data || isNaN(valor) || !categoria) continue;

    const { codigo, grupo, subcategoria } = parseCategoria(categoria);
    if (!codigo) continue;

    lancamentos.push({
      id_empresa:   idEmpresa,
      id_upload:    idUpload,
      id_origem:    row[0] ? Number(row[0]) : null,
      codigo,
      grupo,
      subcategoria,
      data,
      valor,
    });
  }

  return lancamentos;
}

/**
 * relatorio_vendas → Receita Bruta para DRE (codigo 1001)
 * Colunas: [2]data_venda [15]valor_liquido
 * Agrupa por data → soma valor_liquido
 * Linha 0 = header, ignorar
 */
function parseRelatorioVendas(
  buffer: ArrayBuffer,
  idEmpresa: string,
  idUpload: string
): LancamentoInsert[] {
  const rows = parseExcel(buffer);
  const agrupado = new Map<string, number>();

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || !row[2] || row[15] === null) continue;

    const data  = toDateString(row[2]);
    const valor = parseFloat(String(row[15]));

    if (!data || isNaN(valor)) continue;

    agrupado.set(data, (agrupado.get(data) ?? 0) + valor);
  }

  return Array.from(agrupado.entries()).map(([data, valor]) => ({
    id_empresa:   idEmpresa,
    id_upload:    idUpload,
    id_origem:    null,
    codigo:       '1001',
    grupo:        'Receita Bruta',
    subcategoria: null,
    data,
    valor,
  }));
}

/**
 * produtos_vendidos → CMV para DRE (codigo 2002)
 * Colunas: [2]data_venda [13]custo_total
 * ⚠️ Confirme se col C (índice 2) é a data no seu arquivo de produtos
 * Agrupa por data → soma custo_total
 * Linha 0 = header, ignorar
 */
function parseProdutosVendidos(
  buffer: ArrayBuffer,
  idEmpresa: string,
  idUpload: string
): LancamentoInsert[] {
  const rows = parseExcel(buffer);
  const agrupado = new Map<string, number>();

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || !row[2] || row[13] === null) continue;

    const data  = toDateString(row[2]);
    const valor = parseFloat(String(row[13]));

    if (!data || isNaN(valor)) continue;

    agrupado.set(data, (agrupado.get(data) ?? 0) + valor);
  }

  return Array.from(agrupado.entries()).map(([data, valor]) => ({
    id_empresa:   idEmpresa,
    id_upload:    idUpload,
    id_origem:    null,
    codigo:       '2002',
    grupo:        'Custo das Mercadorias e Produtos Vendidos',
    subcategoria: null,
    data,
    valor,
  }));
}

// ============================================================
// HANDLER PRINCIPAL
// ============================================================

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 200, headers: corsHeaders });
  if (req.method !== 'POST')   return new Response('Method not allowed', { status: 405, headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // ── 1. Recebe FormData ───────────────────────────────────
    const formData = await req.formData();

    const idEmpresa = formData.get('id_empresa') as string;

    const fileFinanceiro = formData.get('resultado_financeiro') as File | null;
    const fileVendas     = formData.get('relatorio_vendas')     as File | null;
    const fileProdutos   = formData.get('produtos_vendidos')    as File | null;

    if (!idEmpresa) {
      return new Response(
        JSON.stringify({ status: 'falha', message: 'id_empresa é obrigatório' }),
        { status: 400, headers: corsHeaders }
      );
    }

    if (!fileFinanceiro || !fileVendas || !fileProdutos) {
      return new Response(
        JSON.stringify({ status: 'falha', message: 'Os 3 arquivos são obrigatórios: resultado_financeiro, relatorio_vendas, produtos_vendidos' }),
        { status: 400, headers: corsHeaders }
      );
    }

    // ── 2. Registra upload ───────────────────────────────────
    const { data: uploadRecord, error: uploadError } = await supabase
      .from('tbl_historico_uploads')
      .insert({
        id_empresa:        idEmpresa,
        tipo_importacao:   'fluxo_dre',
        arquivo_financeiro: fileFinanceiro.name,
        arquivo_vendas:    fileVendas.name,
        arquivo_produtos:  fileProdutos.name,
        status:            'processando',
      })
      .select('id_upload')
      .single();

    if (uploadError) throw new Error(`Erro ao registrar upload: ${uploadError.message}`);

    const idUpload = uploadRecord.id_upload;

    try {
      // ── 3. Lê buffers dos arquivos ──────────────────────────
      const bufferFinanceiro = await fileFinanceiro.arrayBuffer();
      const bufferVendas     = await fileVendas.arrayBuffer();
      const bufferProdutos   = await fileProdutos.arrayBuffer();

      // ── 4. Parseia todos os arquivos ────────────────────────
      const fluxoReceitas  = parseResultadoFinanceiro(bufferFinanceiro, idEmpresa, idUpload, 'receitas');
      const fluxoDespesas  = parseResultadoFinanceiro(bufferFinanceiro, idEmpresa, idUpload, 'despesas');
      const fluxoLancamentos = [...fluxoReceitas, ...fluxoDespesas];

      const dreVendas   = parseRelatorioVendas(bufferVendas, idEmpresa, idUpload);
      const dreProdutos = parseProdutosVendidos(bufferProdutos, idEmpresa, idUpload);

      // Para DRE: reusa o que já foi parseado, filtra codigos que vêm de outras fontes
      const dreFinanceiro  = fluxoLancamentos.filter(l => l.codigo !== '1001' && l.codigo !== '2002');
      const dreLancamentos = [...dreFinanceiro, ...dreVendas, ...dreProdutos];

      // ── 5. Extrai range de datas dos dados parseados ────────
      const todasDatas = [
        ...fluxoLancamentos.map(l => l.data),
        ...dreVendas.map(l => l.data),
        ...dreProdutos.map(l => l.data),
      ].filter(Boolean).sort();

      const dataInicio = todasDatas[0];
      const dataFim    = todasDatas[todasDatas.length - 1];

      if (!dataInicio || !dataFim) throw new Error('Nenhuma data válida encontrada nos arquivos');

      // ── 6. DELETE por empresa + período extraído ────────────
      const { error: delFluxo } = await supabase
        .from('tbl_fluxo_caixa_lancamentos')
        .delete()
        .eq('id_empresa', idEmpresa)
        .gte('data', dataInicio)
        .lte('data', dataFim);

      if (delFluxo) throw new Error(`Erro ao limpar fluxo: ${delFluxo.message}`);

      const { error: delDre } = await supabase
        .from('tbl_dre_lancamentos')
        .delete()
        .eq('id_empresa', idEmpresa)
        .gte('data', dataInicio)
        .lte('data', dataFim);

      if (delDre) throw new Error(`Erro ao limpar DRE: ${delDre.message}`);

      // ── 7. INSERT em lotes de 500 ───────────────────────────
      const chunkSize = 500;

      for (let i = 0; i < fluxoLancamentos.length; i += chunkSize) {
        const chunk = fluxoLancamentos.slice(i, i + chunkSize);
        const { error } = await supabase.from('tbl_fluxo_caixa_lancamentos').insert(chunk);
        if (error) throw new Error(`Erro ao inserir fluxo lote ${i}: ${error.message}`);
      }

      for (let i = 0; i < dreLancamentos.length; i += chunkSize) {
        const chunk = dreLancamentos.slice(i, i + chunkSize);
        const { error } = await supabase.from('tbl_dre_lancamentos').insert(chunk);
        if (error) throw new Error(`Erro ao inserir DRE lote ${i}: ${error.message}`);
      }

      // ── 8. Atualiza status do upload ────────────────────────
      await supabase
        .from('tbl_historico_uploads')
        .update({
          status:           'sucesso',
          ds_arquivo:       `${dataInicio}_${dataFim}`,
          total_financeiro: fluxoLancamentos.length + dreLancamentos.length,
        })
        .eq('id_upload', idUpload);

      return new Response(
        JSON.stringify({
          status: 'sucesso',
          id_upload: idUpload,
          totais: {
            fluxo_caixa: fluxoLancamentos.length,
            dre:         dreLancamentos.length,
          },
        }),
        { status: 200, headers: corsHeaders }
      );

    } catch (innerError) {
      // Marca upload como falha antes de propagar
      await supabase
        .from('tbl_historico_uploads')
        .update({ status: 'falha' })
        .eq('id_upload', idUpload);

      throw innerError;
    }

  } catch (error) {
    return new Response(
      JSON.stringify({ status: 'falha', message: error.message }),
      { status: 500, headers: corsHeaders }
    );
  }
});