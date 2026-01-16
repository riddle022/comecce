import { OrdemServicoData, ErrorRecord } from '../types.ts';
import { parseExcelFile, getWorksheetData, getCellValue, parseDecimal, parseInteger } from '../utils/excelUtils.ts';
import { normalizeText } from '../utils/textUtils.ts';
import { excelDateToJSDate, formatDateToISO } from '../utils/dateUtils.ts';

export function parseOrdemServicoExcel(buffer: ArrayBuffer): { ordensServico: OrdemServicoData[]; erros: ErrorRecord[] } {
  const ordensServico: OrdemServicoData[] = [];
  const erros: ErrorRecord[] = [];

  try {
    const workbook = parseExcelFile(buffer);
    const data = getWorksheetData(workbook);

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const linha = i + 1;

      try {
        const numero_os = parseInteger(getCellValue(row, 'A'));
        if (!numero_os) {
          erros.push({
            arquivo: 'Ordem de Serviço',
            linha,
            coluna: 'A',
            valor: getCellValue(row, 'A'),
            descricao: 'numero_os é obrigatório'
          });
          continue;
        }

        const item_ds_referencia = normalizeText(getCellValue(row, 'AB'));
        if (!item_ds_referencia) {
          erros.push({
            arquivo: 'Ordem de Serviço',
            linha,
            coluna: 'AB',
            valor: getCellValue(row, 'AB'),
            descricao: 'item_ds_referencia é obrigatório'
          });
          continue;
        }

        const dt_abertura_os = formatDateToISO(excelDateToJSDate(getCellValue(row, 'C')));
        const status_os = normalizeText(getCellValue(row, 'D'));
        const status_da_venda = normalizeText(getCellValue(row, 'E'));
        const ds_etapa_atual = normalizeText(getCellValue(row, 'F'));
        const dt_previsao_entrega = formatDateToISO(excelDateToJSDate(getCellValue(row, 'G')));
        const dt_entrega = formatDateToISO(excelDateToJSDate(getCellValue(row, 'H')));
        const ds_vendedor = normalizeText(getCellValue(row, 'I'));

        const item_ds_descricao = normalizeText(getCellValue(row, 'AC'));
        const item_nr_quantidade = parseInteger(getCellValue(row, 'AD')) || 1;
        const item_vl_original = parseDecimal(getCellValue(row, 'AE'));
        const item_vl_ajuste = parseDecimal(getCellValue(row, 'AF'));
        const item_vl_unitario = parseDecimal(getCellValue(row, 'AG'));
        const item_vl_total_bruto = parseDecimal(getCellValue(row, 'AH'));
        const item_vl_desconto_total = parseDecimal(getCellValue(row, 'AJ'));
        const item_vl_total_liquido = parseDecimal(getCellValue(row, 'AK'));

        ordensServico.push({
          numero_os,
          dt_abertura_os,
          status_os,
          status_da_venda,
          ds_etapa_atual,
          dt_previsao_entrega,
          dt_entrega,
          ds_vendedor,
          item_ds_referencia,
          item_ds_descricao,
          item_nr_quantidade,
          item_vl_original,
          item_vl_ajuste,
          item_vl_unitario,
          item_vl_total_bruto,
          item_vl_desconto_total,
          item_vl_total_liquido,
          item_ds_grupo: null,
          item_ds_grife: null,
          item_ds_fornecedor: null,
          item_vl_custo_unitario: null
        });
      } catch (error) {
        erros.push({
          arquivo: 'Ordem de Serviço',
          linha,
          descricao: `Erro ao processar linha: ${error.message}`
        });
      }
    }
  } catch (error) {
    erros.push({
      arquivo: 'Ordem de Serviço',
      descricao: `Erro ao ler arquivo: ${error.message}`
    });
  }

  return { ordensServico, erros };
}
