import { createClient } from 'npm:@supabase/supabase-js@2';
import * as XLSX from 'npm:xlsx@0.18.5';

// =============== TYPES ===============
interface ErrorRecord {
  arquivo: string;
  linha?: number;
  coluna?: string;
  valor?: any;
  descricao: string;
}

interface VendaBase {
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

interface VendaHeader {
  numero_venda: number;
  data_venda: string | null;
  numero_os: number | null;
  ds_vendedor: string | null;
  ds_cliente: string | null;
  ds_forma_pagamento: string | null;
}

interface VendaEnriquecida extends VendaBase {
  item_ds_grupo: string | null;
  item_ds_grife: string | null;
  item_ds_fornecedor: string | null;
  item_vl_custo_unitario: number | null;
}

interface ProdutoData {
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

interface OrdemServicoData {
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

interface OrdemServicoHeader {
  numero_os: number;
  dt_abertura_os: string | null;
  status_os: string | null;
  status_da_venda: string | null;
  ds_etapa_atual: string | null;
  dt_previsao_entrega: string | null;
  dt_entrega: string | null;
  ds_vendedor: string | null;
}

interface ProcessingResult {
  status: 'sucesso' | 'falha';
  total_vendas: number;
  total_produtos: number;
  total_ordens_servico: number;
  erros: ErrorRecord[];
  message?: string;
}

// =============== UTILS ===============
// Truncate to 100 characters to match DB constraints
function normalizeText(text: string | null | undefined): string {
  if (!text) return '';
  return text.toString().trim().replace(/\s+/g, ' ').substring(0, 100);
}

function compareNormalized(text1: string | null | undefined, text2: string | null | undefined): boolean {
  const normalized1 = normalizeText(text1).toLowerCase();
  const normalized2 = normalizeText(text2).toLowerCase();
  return normalized1 === normalized2;
}

function parseCsvList(csvString: string | null | undefined): string[] {
  if (!csvString) return [];
  return csvString.toString().split(',').map(item => normalizeText(item)).filter(item => item.length > 0);
}

function excelDateToJSDate(excelDate: number | string | null | undefined): Date | null {
  if (!excelDate) return null;
  if (typeof excelDate === 'string') {
    const parsed = new Date(excelDate);
    if (!isNaN(parsed.getTime())) return parsed;
    const parts = excelDate.split('/');
    if (parts.length === 3) {
      const day = parseInt(parts[0]);
      const month = parseInt(parts[1]) - 1;
      const year = parseInt(parts[2]);
      const date = new Date(year, month, day);
      if (!isNaN(date.getTime())) return date;
    }
    return null;
  }
  if (typeof excelDate === 'number') {
    return new Date((excelDate - 25569) * 86400 * 1000);
  }
  return null;
}

function formatDateToISO(date: Date | null): string | null {
  if (!date || isNaN(date.getTime())) return null;
  return date.toISOString();
}

function getCellValue(row: any, column: string): any {
  return row[column] !== undefined && row[column] !== null ? row[column] : null;
}

function parseDecimal(value: any): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = typeof value === 'number' ? value : parseFloat(value.toString().replace(',', '.'));
  return isNaN(parsed) ? null : parsed;
}

function parseInteger(value: any): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = typeof value === 'number' ? Math.floor(value) : parseInt(value.toString());
  return isNaN(parsed) ? null : parsed;
}

// =============== PARSERS ===============
function parseVendasExcel(buffer: ArrayBuffer): { vendas: VendaBase[]; erros: ErrorRecord[] } {
  const vendas: VendaBase[] = [];
  const erros: ErrorRecord[] = [];
  try {
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 'A', defval: null });

    let lastHeader: VendaHeader | null = null;

    // Start from row 4 (index 3), skipping 3 rows of headers
    for (let i = 3; i < data.length; i++) {
      const row = data[i];
      const linha = i + 1;

      try {
        // Tenta ler o cabeçalho (que pode estar presente ou não nas linhas de detalhe)
        const numero_venda = parseInteger(getCellValue(row, 'B'));

        if (numero_venda) {
          lastHeader = {
            numero_venda,
            data_venda: formatDateToISO(excelDateToJSDate(getCellValue(row, 'C'))),
            numero_os: parseInteger(getCellValue(row, 'D')),
            ds_vendedor: normalizeText(getCellValue(row, 'E')),
            ds_cliente: normalizeText(getCellValue(row, 'H')),
            ds_forma_pagamento: normalizeText(getCellValue(row, 'Q')),
          };
        }

        // Tenta ler o item
        const item_ds_referencia = normalizeText(getCellValue(row, 'T'));

        if (item_ds_referencia) {
          if (!lastHeader) {
            erros.push({ arquivo: 'Vendas', linha, coluna: 'B', descricao: 'Item encontrado sem cabeçalho de venda anterior (numero_venda ausente)' });
            continue;
          }

          vendas.push({
            ...lastHeader,
            item_ds_referencia,
            item_ds_descricao: normalizeText(getCellValue(row, 'U')),
            item_nr_quantidade: parseInteger(getCellValue(row, 'W')) || 1,
            item_valor_original: parseDecimal(getCellValue(row, 'X')),
            item_valor_ajuste: parseDecimal(getCellValue(row, 'Y')),
            item_valor_unitario: parseDecimal(getCellValue(row, 'Z')),
            item_valor_total_bruto: parseDecimal(getCellValue(row, 'AA')),
            item_desconto_total: parseDecimal(getCellValue(row, 'AC')),
            item_valor_total_liquido: parseDecimal(getCellValue(row, 'AE'))
          });
        }

        // Se a linha não tem numero_venda nem item_ds_referencia, ela é ignorada (pode ser linha em branco no meio do arquivo ou similar)

      } catch (error) {
        erros.push({ arquivo: 'Vendas', linha, descricao: `Erro ao processar linha: ${error.message}` });
      }
    }
  } catch (error) {
    erros.push({ arquivo: 'Vendas', descricao: `Erro ao ler arquivo: ${error.message}` });
  }
  return { vendas, erros };
}

function parseProdutosExcel(buffer: ArrayBuffer): { produtos: ProdutoData[]; erros: ErrorRecord[] } {
  const produtos: ProdutoData[] = [];
  const erros: ErrorRecord[] = [];
  try {
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 'A', defval: null });

    // Start from row 4 (index 3), skipping 3 rows of headers
    for (let i = 3; i < data.length; i++) {
      const row = data[i];
      const linha = i + 1;
      try {
        const item_ds_referencia = normalizeText(getCellValue(row, 'A'));
        if (!item_ds_referencia) {
          // em produtos, a referencia é a chave principal, então se não tem, provavelmente é linha vazia/invalida
          continue;
        }
        const quantidade = parseInteger(getCellValue(row, 'L'));
        const custo_total = parseDecimal(getCellValue(row, 'N'));
        let custo_unitario: number | null = null;
        if (custo_total !== null && quantidade !== null && quantidade > 0) {
          custo_unitario = custo_total / quantidade;
        }
        // Se quantidade for 0 ou nula, custo_unitario permanece null, o que evita o erro de divisão por zero.
        produtos.push({
          item_ds_referencia,
          item_ds_grupo: normalizeText(getCellValue(row, 'C')),
          item_ds_grife: normalizeText(getCellValue(row, 'E')),
          item_ds_fornecedor: normalizeText(getCellValue(row, 'I')),
          quantidade,
          custo_total,
          custo_unitario,
          vendas_referencias: parseCsvList(getCellValue(row, 'R')).map(v => parseInt(v)).filter(v => !isNaN(v)),
          os_referencias: parseCsvList(getCellValue(row, 'S')).map(v => parseInt(v)).filter(v => !isNaN(v))
        });
      } catch (error) {
        erros.push({ arquivo: 'Produtos', linha, descricao: `Erro ao processar linha: ${error.message}` });
      }
    }
  } catch (error) {
    erros.push({ arquivo: 'Produtos', descricao: `Erro ao ler arquivo: ${error.message}` });
  }
  return { produtos, erros };
}

function parseOrdemServicoExcel(buffer: ArrayBuffer): { ordensServico: OrdemServicoData[]; erros: ErrorRecord[] } {
  const ordensServico: OrdemServicoData[] = [];
  const erros: ErrorRecord[] = [];
  try {
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 'A', defval: null });

    let lastHeader: OrdemServicoHeader | null = null;

    // Start from row 2 (index 1), skipping 1 row of headers
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const linha = i + 1;
      try {
        // Tenta ler o cabeçalho
        const numero_os = parseInteger(getCellValue(row, 'A'));

        if (numero_os) {
          lastHeader = {
            numero_os,
            dt_abertura_os: formatDateToISO(excelDateToJSDate(getCellValue(row, 'C'))),
            status_os: normalizeText(getCellValue(row, 'D')),
            status_da_venda: normalizeText(getCellValue(row, 'E')),
            ds_etapa_atual: normalizeText(getCellValue(row, 'F')),
            dt_previsao_entrega: formatDateToISO(excelDateToJSDate(getCellValue(row, 'G'))),
            dt_entrega: formatDateToISO(excelDateToJSDate(getCellValue(row, 'H'))),
            ds_vendedor: normalizeText(getCellValue(row, 'I')),
          };
        }

        // Tenta ler o item
        const item_ds_referencia = normalizeText(getCellValue(row, 'AA'));

        if (item_ds_referencia) {
          if (!lastHeader) {
            erros.push({ arquivo: 'Ordem de Serviço', linha, coluna: 'A', descricao: 'Item encontrado sem cabeçalho de OS anterior (numero_os ausente)' });
            continue;
          }

          ordensServico.push({
            ...lastHeader,
            item_ds_referencia,
            item_ds_descricao: normalizeText(getCellValue(row, 'AB')),
            item_nr_quantidade: parseInteger(getCellValue(row, 'AC')) || 1,
            item_vl_original: parseDecimal(getCellValue(row, 'AD')),
            item_vl_ajuste: parseDecimal(getCellValue(row, 'AE')),
            item_vl_unitario: parseDecimal(getCellValue(row, 'AF')),
            item_vl_total_bruto: parseDecimal(getCellValue(row, 'AG')),
            item_vl_desconto_total: parseDecimal(getCellValue(row, 'AI')),
            item_vl_total_liquido: parseDecimal(getCellValue(row, 'AJ')),
            item_ds_grupo: null,
            item_ds_grife: null,
            item_ds_fornecedor: null,
            item_vl_custo_unitario: null
          });
        }
      } catch (error) {
        erros.push({ arquivo: 'Ordem de Serviço', linha, descricao: `Erro ao processar linha: ${error.message}` });
      }
    }
  } catch (error) {
    erros.push({ arquivo: 'Ordem de Serviço', descricao: `Erro ao ler arquivo: ${error.message}` });
  }
  return { ordensServico, erros };
}

// =============== VALIDATORS ===============
function enrichVendasWithProdutos(vendas: VendaBase[], produtos: ProdutoData[]): { vendasEnriquecidas: VendaEnriquecida[]; erros: ErrorRecord[] } {
  const vendasEnriquecidas: VendaEnriquecida[] = [];
  const erros: ErrorRecord[] = [];
  const produtosByVenda = new Map<number, ProdutoData[]>();

  for (const produto of produtos) {
    for (const numero_venda of produto.vendas_referencias) {
      if (!produtosByVenda.has(numero_venda)) produtosByVenda.set(numero_venda, []);
      produtosByVenda.get(numero_venda)!.push(produto);
    }
  }

  // Não valida duplicidade de vendas aqui pois agora permitimos múltiplas linhas para a mesma venda (itens)

  for (const venda of vendas) {
    const produtosRelacionados = produtosByVenda.get(venda.numero_venda) || [];
    // Tenta encontrar o produto específico pela referência do item
    // Se não encontrar, pega o primeiro relacionado à venda (fallback)
    const produto = produtosRelacionados.find(p => p.item_ds_referencia === venda.item_ds_referencia) || produtosRelacionados[0];

    // Omitindo aviso de produto faltante para manter fluxo, pode ser reativado se necessário

    vendasEnriquecidas.push({
      ...venda,
      item_ds_grupo: produto?.item_ds_grupo || null,
      item_ds_grife: produto?.item_ds_grife || null,
      item_ds_fornecedor: produto?.item_ds_fornecedor || null,
      item_vl_custo_unitario: produto?.custo_unitario || null
    });
  }

  // Omitindo validação inversa (Produto -> Venda) que gerava muitos erros se não match exato

  return { vendasEnriquecidas, erros };
}

function enrichOrdemServicoWithProdutos(ordensServico: OrdemServicoData[], produtos: ProdutoData[]): { ordensEnriquecidas: OrdemServicoData[]; erros: ErrorRecord[] } {
  const ordensEnriquecidas: OrdemServicoData[] = [];
  const erros: ErrorRecord[] = [];
  const produtosByOS = new Map<number, ProdutoData[]>();

  for (const produto of produtos) {
    for (const numero_os of produto.os_referencias) {
      if (!produtosByOS.has(numero_os)) produtosByOS.set(numero_os, []);
      produtosByOS.get(numero_os)!.push(produto);
    }
  }

  for (const os of ordensServico) {
    const produtosRelacionados = produtosByOS.get(os.numero_os) || [];
    const produto = produtosRelacionados.find(p => p.item_ds_referencia === os.item_ds_referencia) || produtosRelacionados[0];

    if (produto) {
      let custo_unitario = null;
      if (produto.custo_total !== null) {
        // Usa quantidade da OS se existir, senão usa a do produto
        const quantidade = os.item_nr_quantidade || produto.quantidade;
        if (quantidade && quantidade > 0) custo_unitario = produto.custo_total / quantidade;
      }
      ordensEnriquecidas.push({
        ...os,
        item_ds_grupo: produto.item_ds_grupo,
        item_ds_grife: produto.item_ds_grife,
        item_ds_fornecedor: produto.item_ds_fornecedor,
        item_vl_custo_unitario: custo_unitario
      });
    } else {
      ordensEnriquecidas.push(os);
    }
  }

  return { ordensEnriquecidas, erros };
}

function sanitizeOrdemServicoIntegrity(vendas: VendaBase[], ordensServico: OrdemServicoData[]): void {
  const osNumeros = new Set(ordensServico.map(os => os.numero_os));

  for (const venda of vendas) {
    if (venda.numero_os && !osNumeros.has(venda.numero_os)) {
      // Opcional: logar warning?
      // console.warn(`Venda ${venda.numero_venda} referencia OS inexistente: ${venda.numero_os}. Removendo referência.`);
      venda.numero_os = null;
    }
  }
}

/*
function validateClienteEmpresa(vendas: VendaBase[], ds_empresa: string): ErrorRecord[] {
  const erros: ErrorRecord[] = [];
  // Valida apenas quando temos ds_cliente na linha (pode estar vazio em linhas de só-item se não preenchido pelo fill-down corretamente na origem, mas nosso fill-down garante)
  for (const venda of vendas) {
    if (venda.ds_cliente && !compareNormalized(venda.ds_cliente, ds_empresa)) {
      erros.push({ arquivo: 'Vendas', valor: venda.ds_cliente, descricao: `Cliente "${venda.ds_cliente}" não corresponde à empresa "${ds_empresa}"` });
    }
  }
  return erros;
}
*/

// =============== SERVICES ===============
async function getEmpresaIdByName(supabase: any, ds_empresa: string): Promise<string | null> {
  const { data, error } = await supabase.from('empresas').select('id_empresa, ds_empresa').eq('ativo', true);
  if (error) throw new Error(`Erro ao buscar empresa: ${error.message}`);
  if (!data || data.length === 0) throw new Error('Nenhuma empresa ativa encontrada');
  const empresa = data.find((e: any) => compareNormalized(e.ds_empresa, ds_empresa));
  if (!empresa) throw new Error(`Empresa "${ds_empresa}" não encontrada no sistema`);
  return empresa.id_empresa;
}

async function persistData(
  supabase: any,
  id_empresa: string,
  vendas: VendaEnriquecida[],
  ordensServico: OrdemServicoData[],
  fileNames: { vendas: string, produtos: string, os: string }
): Promise<{ vendas_inseridas: number; os_inseridas: number; id_upload: string }> {

  // 1. Calcular totais únicos para o histórico
  const uniqueVendasCount = new Set(vendas.map(v => v.numero_venda)).size;
  const uniqueOSCount = new Set(ordensServico.map(os => os.numero_os)).size;

  // 2. Criar registro no Histórico de Uploads
  const { data: uploadData, error: uploadError } = await supabase
    .from('tbl_historico_uploads')
    .insert({
      id_empresa,
      arquivo_vendas: fileNames.vendas,
      arquivo_produtos: fileNames.produtos,
      arquivo_os: fileNames.os,
      total_vendas: uniqueVendasCount,
      total_os: uniqueOSCount
    })
    .select('id_upload')
    .single();

  if (uploadError) throw new Error(`Erro ao criar histórico de upload: ${uploadError.message}`);
  const id_upload = uploadData.id_upload;

  // 2. Preparar dados para inserção (incluindo id_upload)
  const vendasInsert = vendas.map(v => ({ id_empresa, id_upload, ...v }));
  const ordensInsert = ordensServico.map(os => ({ id_empresa, id_upload, ...os }));

  const CHUNK_SIZE = 1000;

  // 3. Preparar IDs para exclusão (Idempotência/Reemplazo)
  // Nota: Com o histórico, talvez não precisássemos deletar por ID se apenas confiássemos no novo id_upload.
  // Porém, para manter a consistência de "última versão vale", mantemos a deleção dos IDs que estão sendo re-importados.
  const vendasIds = [...new Set(vendas.map(v => v.numero_venda))];
  const osIds = [...new Set(ordensServico.map(os => os.numero_os))];

  // 4. Apagar dados existentes para substituir
  // Vendas
  for (let i = 0; i < vendasIds.length; i += CHUNK_SIZE) {
    const chunkIds = vendasIds.slice(i, i + CHUNK_SIZE);
    const { error } = await supabase
      .from('tbl_vendas')
      .delete()
      .eq('id_empresa', id_empresa)
      .in('numero_venda', chunkIds);

    if (error) throw new Error(`Erro ao limpar vendas antigas: ${error.message}`);
  }

  // OS
  for (let i = 0; i < osIds.length; i += CHUNK_SIZE) {
    const chunkIds = osIds.slice(i, i + CHUNK_SIZE);
    const { error } = await supabase
      .from('tbl_ordem_servico')
      .delete()
      .eq('id_empresa', id_empresa)
      .in('numero_os', chunkIds);

    if (error) throw new Error(`Erro ao limpar OSs antigas: ${error.message}`);
  }

  // 5. Inserir novos dados
  // Vendas Insert
  for (let i = 0; i < vendasInsert.length; i += CHUNK_SIZE) {
    const chunk = vendasInsert.slice(i, i + CHUNK_SIZE);
    const { error: vendasError } = await supabase.from('tbl_vendas').insert(chunk);
    if (vendasError) throw new Error(`Erro ao inserir vendas (chunk ${i}): ${vendasError.message}`);
  }

  // OS Insert
  let os_inseridas = 0;
  if (ordensInsert.length > 0) {
    for (let i = 0; i < ordensInsert.length; i += CHUNK_SIZE) {
      const chunk = ordensInsert.slice(i, i + CHUNK_SIZE);
      const { error: osError } = await supabase.from('tbl_ordem_servico').insert(chunk);
      if (osError) throw new Error(`Erro ao inserir ordens de serviço (chunk ${i}): ${osError.message}`);
    }
    os_inseridas = ordensInsert.length;
  }

  return { vendas_inseridas: uniqueVendasCount, os_inseridas: uniqueOSCount, id_upload };
}

// =============== MAIN HANDLER ===============
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({
      status: 'falha', total_vendas: 0, total_produtos: 0, total_ordens_servico: 0,
      erros: [{ arquivo: '', descricao: 'Método não permitido' }]
    } as ProcessingResult), { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({
        status: 'falha', total_vendas: 0, total_produtos: 0, total_ordens_servico: 0,
        erros: [{ arquivo: '', descricao: 'Não autorizado' }]
      } as ProcessingResult), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const formData = await req.formData();
    const ds_empresa = formData.get('ds_empresa')?.toString();
    if (!ds_empresa) {
      return new Response(JSON.stringify({
        status: 'falha', total_vendas: 0, total_produtos: 0, total_ordens_servico: 0,
        erros: [{ arquivo: '', descricao: 'ds_empresa é obrigatório' }]
      } as ProcessingResult), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const vendasFile = formData.get('vendas') as File;
    const produtosFile = formData.get('produtos') as File;
    const ordemServicoFile = formData.get('ordem_servico') as File;

    if (!vendasFile || !produtosFile || !ordemServicoFile) {
      return new Response(JSON.stringify({
        status: 'falha', total_vendas: 0, total_produtos: 0, total_ordens_servico: 0,
        erros: [{ arquivo: '', descricao: 'Os 3 arquivos Excel são obrigatórios' }]
      } as ProcessingResult), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const id_empresa = await getEmpresaIdByName(supabase, ds_empresa);
    if (!id_empresa) {
      return new Response(JSON.stringify({
        status: 'falha', total_vendas: 0, total_produtos: 0, total_ordens_servico: 0,
        erros: [{ arquivo: '', descricao: `Empresa "${ds_empresa}" não encontrada` }]
      } as ProcessingResult), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { vendas, erros: errosVendas } = parseVendasExcel(await vendasFile.arrayBuffer());
    const { produtos, erros: errosProdutos } = parseProdutosExcel(await produtosFile.arrayBuffer());
    const { ordensServico, erros: errosOS } = parseOrdemServicoExcel(await ordemServicoFile.arrayBuffer());

    let allErros = [...errosVendas, ...errosProdutos, ...errosOS];
    const uniqueVendasParsed = new Set(vendas.map(v => v.numero_venda)).size;
    const uniqueProdutosParsed = new Set(produtos.map(p => p.item_ds_referencia)).size;
    const uniqueOSParsed = new Set(ordensServico.map(os => os.numero_os)).size;

    if (allErros.length > 0) {
      return new Response(JSON.stringify({
        status: 'falha', total_vendas: uniqueVendasParsed, total_produtos: uniqueProdutosParsed,
        total_ordens_servico: uniqueOSParsed, erros: allErros
      } as ProcessingResult), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Removido validateNoDuplicates(vendas) e validateClienteEmpresa(vendas, ds_empresa)
    // allErros = [...allErros, ...validateClienteEmpresa(vendas, ds_empresa)];

    const { vendasEnriquecidas, erros: errosEnrich } = enrichVendasWithProdutos(vendas, produtos);
    allErros = [...allErros, ...errosEnrich];

    const { ordensEnriquecidas, erros: errosEnrichOS } = enrichOrdemServicoWithProdutos(ordensServico, produtos);

    // Sanitize OS references instead of erroring
    sanitizeOrdemServicoIntegrity(vendas, ordensServico);

    allErros = [...allErros, ...errosEnrichOS];

    if (allErros.length > 0) {
      return new Response(JSON.stringify({
        status: 'falha', total_vendas: uniqueVendasParsed, total_produtos: uniqueProdutosParsed,
        total_ordens_servico: uniqueOSParsed, erros: allErros
      } as ProcessingResult), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { vendas_inseridas, os_inseridas } = await persistData(
      supabase,
      id_empresa,
      vendasEnriquecidas,
      ordensEnriquecidas,
      {
        vendas: vendasFile.name,
        produtos: produtosFile.name,
        os: ordemServicoFile.name
      }
    );

    return new Response(JSON.stringify({
      status: 'sucesso', total_vendas: vendas_inseridas, total_produtos: uniqueProdutosParsed,
      total_ordens_servico: os_inseridas, erros: [], message: 'Importação concluída com sucesso'
    } as ProcessingResult), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    return new Response(JSON.stringify({
      status: 'falha', total_vendas: 0, total_produtos: 0, total_ordens_servico: 0,
      erros: [{ arquivo: '', descricao: `Erro no processamento: ${error.message}` }]
    } as ProcessingResult), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
