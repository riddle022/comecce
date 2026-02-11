import { OrdemServicoData, ErrorRecord } from '../types.ts';
import { parseExcelFile, getWorksheetData, getCellValue, parseDecimal, parseInteger } from '../utils/excelUtils.ts';
import { normalizeText } from '../utils/textUtils.ts';
import { excelDateToJSDate, formatDateToISO } from '../utils/dateUtils.ts';

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

export function parseOrdemServicoExcel(buffer: ArrayBuffer): { ordensServico: OrdemServicoData[]; erros: ErrorRecord[] } {
  const ordensServico: OrdemServicoData[] = [];
  const erros: ErrorRecord[] = [];

  try {
    const workbook = parseExcelFile(buffer);
    const data = getWorksheetData(workbook);

    let lastHeader: OrdemServicoHeader | null = null;

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const linha = i + 1;

      try {
        // 1. Detect OS header row: Col A has numero_os
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

        // 2. Detect item row: Col AC has Item - Referencia (product reference)
        // Data rows have Description column absent, so values shift LEFT by 1:
        //   AC = Referencia, AD = Quantidade, AE = Valor Original, AF = Ajuste,
        //   AG = Unitário, AH = Total Bruto, AJ = Desconto Total, AK = Total Líquido
        const item_ds_referencia = normalizeText(getCellValue(row, 'AC'));
        if (item_ds_referencia && item_ds_referencia !== '---'
            && !item_ds_referencia.toLowerCase().includes('referencia')
            && !item_ds_referencia.toLowerCase().includes('referência')) {
          if (!lastHeader) {
            erros.push({ arquivo: 'Ordem de Serviço', linha, coluna: 'AC', descricao: 'Item de OS sem cabeçalho' });
            continue;
          }

          ordensServico.push({
            ...lastHeader,
            item_ds_referencia,
            item_ds_descricao: item_ds_referencia,
            item_nr_quantidade: parseInteger(getCellValue(row, 'AD')) || 1,
            item_vl_original: parseDecimal(getCellValue(row, 'AE')),
            item_vl_ajuste: parseDecimal(getCellValue(row, 'AF')),
            item_vl_unitario: parseDecimal(getCellValue(row, 'AG')),
            item_vl_total_bruto: parseDecimal(getCellValue(row, 'AH')),
            item_vl_desconto_total: parseDecimal(getCellValue(row, 'AJ')),
            item_vl_total_liquido: parseDecimal(getCellValue(row, 'AK')),
            item_ds_grupo: null,
            item_ds_grife: null,
            item_ds_fornecedor: null,
            item_vl_custo_unitario: null
          });
        }
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
