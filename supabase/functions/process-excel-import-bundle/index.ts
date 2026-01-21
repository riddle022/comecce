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
function removeDiacritics(text: string): string {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function normalizeText(text: string | null | undefined): string {
  if (!text) return '';
  return text.toString().trim().replace(/\s+/g, ' ').substring(0, 100);
}

function compareNormalized(text1: string | null | undefined, text2: string | null | undefined): boolean {
  if (!text1 || !text2) return normalizeText(text1) === normalizeText(text2);
  const n1 = removeDiacritics(normalizeText(text1).toLowerCase());
  const n2 = removeDiacritics(normalizeText(text2).toLowerCase());
  return n1 === n2;
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
  if (typeof value === 'number') return Math.floor(value);
  const match = value.toString().match(/\d+/);
  return match ? parseInt(match[0]) : null;
}

// =============== PARSERS ===============
function parseVendasExcel(buffer: ArrayBuffer, ds_empresa: string): { vendas: VendaBase[]; erros: ErrorRecord[] } {
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
        const numero_venda = parseInteger(getCellValue(row, 'B'));
        if (numero_venda) {
          const empresaArquivo = normalizeText(getCellValue(row, 'A'));
          if (!compareNormalized(empresaArquivo, ds_empresa)) {
            erros.push({
              arquivo: 'Vendas',
              linha,
              valor: empresaArquivo,
              descricao: `A empresa no arquivo ("${empresaArquivo}") não coincide com a empresa selecionada ("${ds_empresa}")`
            });
            return { vendas: [], erros };
          }

          lastHeader = {
            numero_venda,
            data_venda: formatDateToISO(excelDateToJSDate(getCellValue(row, 'C'))),
            numero_os: parseInteger(getCellValue(row, 'D')),
            ds_vendedor: normalizeText(getCellValue(row, 'E')),
            ds_cliente: normalizeText(getCellValue(row, 'H')), // Mapeamento para Coluna H (Cliente Real)
            ds_forma_pagamento: normalizeText(getCellValue(row, 'Q')),
          };
        }

        const item_ds_referencia = normalizeText(getCellValue(row, 'T'));
        if (item_ds_referencia) {
          if (!lastHeader) {
            erros.push({ arquivo: 'Vendas', linha, coluna: 'B', descricao: 'Item encontrado sem cabeçalho de venda anterior' });
            continue;
          }

          vendas.push({
            ...lastHeader,
            item_ds_referencia,
            item_ds_descricao: normalizeText(getCellValue(row, 'U')) || 'Item de Venda',
            item_nr_quantidade: parseInteger(getCellValue(row, 'W')) || 1,
            item_valor_original: parseDecimal(getCellValue(row, 'X')) || parseDecimal(getCellValue(row, 'N')),
            item_valor_ajuste: parseDecimal(getCellValue(row, 'Y')),
            item_valor_unitario: parseDecimal(getCellValue(row, 'Z')) || parseDecimal(getCellValue(row, 'N')),
            item_valor_total_bruto: parseDecimal(getCellValue(row, 'AA')) || parseDecimal(getCellValue(row, 'N')),
            item_desconto_total: parseDecimal(getCellValue(row, 'AC')) || parseDecimal(getCellValue(row, 'O')),
            item_valor_total_liquido: parseDecimal(getCellValue(row, 'AE')) || parseDecimal(getCellValue(row, 'P'))
          });
        }
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

    for (let i = 3; i < data.length; i++) {
      const row = data[i];
      const linha = i + 1;
      try {
        const item_ds_referencia = normalizeText(getCellValue(row, 'A'));
        if (!item_ds_referencia) continue;

        const quantidade = parseInteger(getCellValue(row, 'L'));
        const custo_total = parseDecimal(getCellValue(row, 'N'));
        let custo_unitario: number | null = null;
        if (custo_total !== null && quantidade !== null && quantidade > 0) {
          custo_unitario = custo_total / quantidade;
        }
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

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const linha = i + 1;
      try {
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

        const item_ds_referencia = normalizeText(getCellValue(row, 'AA'));
        if (item_ds_referencia) {
          if (!lastHeader) {
            erros.push({ arquivo: 'Ordem de Serviço', linha, coluna: 'A', descricao: 'Item de OS sem cabeçalho' });
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

  for (const venda of vendas) {
    const produtosRelacionados = produtosByVenda.get(venda.numero_venda) || [];
    const produto = produtosRelacionados.find(p => p.item_ds_referencia === venda.item_ds_referencia) || produtosRelacionados[0];

    vendasEnriquecidas.push({
      ...venda,
      item_ds_grupo: produto?.item_ds_grupo || null,
      item_ds_grife: produto?.item_ds_grife || null,
      item_ds_fornecedor: produto?.item_ds_fornecedor || null,
      item_vl_custo_unitario: produto?.custo_unitario || null
    });
  }
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


// =============== SERVICES ===============
async function getEmpresaIdByName(supabase: any, ds_empresa: string): Promise<string | null> {
  const { data, error } = await supabase.from('empresas').select('id_empresa, ds_empresa').eq('ativo', true);
  if (error) throw new Error(`Erro ao buscar empresa: ${error.message}`);
  const empresa = data?.find((e: any) => compareNormalized(e.ds_empresa, ds_empresa));
  return empresa?.id_empresa || null;
}

async function persistData(
  supabase: any,
  id_empresa: string,
  vendas: VendaEnriquecida[],
  ordensServico: OrdemServicoData[],
  fileNames: { vendas: string, produtos: string, os: string }
): Promise<{ vendas_inseridas: number; os_inseridas: number; id_upload: string }> {

  const uniqueVendasCount = new Set(vendas.map(v => v.numero_venda)).size;
  const uniqueOSCount = new Set(ordensServico.map(os => os.numero_os)).size;

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

  if (uploadError) throw new Error(`Erro ao criar histórico: ${uploadError.message}`);
  const id_upload = uploadData.id_upload;

  const vendasInsert = vendas.map(v => ({ id_empresa, id_upload, ...v }));
  const ordensInsert = ordensServico.map(os => ({ id_empresa, id_upload, ...os }));

  const CHUNK_SIZE = 1000;
  const vendasIds = [...new Set(vendas.map(v => v.numero_venda))];
  const osIds = [...new Set(ordensServico.map(os => os.numero_os))];

  for (let i = 0; i < vendasIds.length; i += CHUNK_SIZE) {
    await supabase.from('tbl_vendas').delete().eq('id_empresa', id_empresa).in('numero_venda', vendasIds.slice(i, i + CHUNK_SIZE));
  }
  for (let i = 0; i < osIds.length; i += CHUNK_SIZE) {
    await supabase.from('tbl_ordem_servico').delete().eq('id_empresa', id_empresa).in('numero_os', osIds.slice(i, i + CHUNK_SIZE));
  }

  for (let i = 0; i < vendasInsert.length; i += CHUNK_SIZE) {
    await supabase.from('tbl_vendas').insert(vendasInsert.slice(i, i + CHUNK_SIZE));
  }
  for (let i = 0; i < ordensInsert.length; i += CHUNK_SIZE) {
    await supabase.from('tbl_ordem_servico').insert(ordensInsert.slice(i, i + CHUNK_SIZE));
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
  if (req.method === 'OPTIONS') return new Response(null, { status: 200, headers: corsHeaders });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: corsHeaders });

  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const formData = await req.formData();
    const ds_empresa = formData.get('ds_empresa')?.toString();
    const vendasFile = formData.get('vendas') as File;
    const productosFile = formData.get('produtos') as File;
    const osFile = formData.get('ordem_servico') as File;

    if (!ds_empresa || !vendasFile || !productosFile || !osFile) {
      return new Response(JSON.stringify({ status: 'falha', erros: [{ arquivo: '', descricao: 'Faltam parâmetros' }] }), { status: 400, headers: corsHeaders });
    }

    const id_empresa = await getEmpresaIdByName(supabase, ds_empresa);
    if (!id_empresa) return new Response(JSON.stringify({ status: 'falha', erros: [{ arquivo: '', descricao: 'Empresa não encontrada' }] }), { status: 404, headers: corsHeaders });

    const { vendas, erros: errosVendas } = parseVendasExcel(await vendasFile.arrayBuffer(), ds_empresa);
    const { produtos, erros: errosProd } = parseProdutosExcel(await productosFile.arrayBuffer());
    const { ordensServico, erros: errosOS } = parseOrdemServicoExcel(await osFile.arrayBuffer());

    let allErros = [...errosVendas, ...errosProd, ...errosOS];
    if (allErros.length > 0) return new Response(JSON.stringify({ status: 'falha', erros: allErros }), { status: 400, headers: corsHeaders });


    const { vendasEnriquecidas } = enrichVendasWithProdutos(vendas, produtos);
    const { ordensEnriquecidas } = enrichOrdemServicoWithProdutos(ordensServico, produtos);

    const uniqueProdutosParsed = new Set(produtos.map(p => p.item_ds_referencia)).size;

    const { vendas_inseridas, os_inseridas } = await persistData(supabase, id_empresa, vendasEnriquecidas, ordensEnriquecidas, {
      vendas: vendasFile.name,
      produtos: productosFile.name,
      os: osFile.name
    });

    return new Response(JSON.stringify({
      status: 'sucesso',
      total_vendas: vendas_inseridas,
      total_produtos: uniqueProdutosParsed,
      total_ordens_servico: os_inseridas,
      erros: [],
      message: 'Importação concluída com sucesso'
    }), { status: 200, headers: corsHeaders });

  } catch (error) {
    return new Response(JSON.stringify({ status: 'falha', erros: [{ arquivo: '', descricao: error.message }] }), { status: 500, headers: corsHeaders });
  }
});
