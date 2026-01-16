import { VendaBase, ErrorRecord } from '../types.ts';
import { parseExcelFile, getWorksheetData, getCellValue, parseDecimal, parseInteger } from '../utils/excelUtils.ts';
import { normalizeText } from '../utils/textUtils.ts';
import { excelDateToJSDate, formatDateToISO } from '../utils/dateUtils.ts';

export function parseVendasExcel(buffer: ArrayBuffer): { vendas: VendaBase[]; erros: ErrorRecord[] } {
  const vendas: VendaBase[] = [];
  const erros: ErrorRecord[] = [];

  try {
    const workbook = parseExcelFile(buffer);
    const data = getWorksheetData(workbook);

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const linha = i + 1;

      try {
        const numero_venda = parseInteger(getCellValue(row, 'B'));
        if (!numero_venda) {
          erros.push({
            arquivo: 'Vendas',
            linha,
            coluna: 'B',
            valor: getCellValue(row, 'B'),
            descricao: 'numero_venda é obrigatório'
          });
          continue;
        }

        const item_ds_referencia = normalizeText(getCellValue(row, 'T'));
        if (!item_ds_referencia) {
          erros.push({
            arquivo: 'Vendas',
            linha,
            coluna: 'T',
            valor: getCellValue(row, 'T'),
            descricao: 'item_ds_referencia é obrigatório'
          });
          continue;
        }

        const data_venda_raw = getCellValue(row, 'C');
        const data_venda_date = excelDateToJSDate(data_venda_raw);
        const data_venda = formatDateToISO(data_venda_date);

        const numero_os = parseInteger(getCellValue(row, 'D'));
        const ds_vendedor = normalizeText(getCellValue(row, 'E'));
        const ds_cliente = normalizeText(getCellValue(row, 'H'));
        const ds_forma_pagamento = normalizeText(getCellValue(row, 'Q'));
        const item_ds_descricao = normalizeText(getCellValue(row, 'U'));

        const item_nr_quantidade = parseInteger(getCellValue(row, 'W')) || 1;
        const item_valor_original = parseDecimal(getCellValue(row, 'X'));
        const item_valor_ajuste = parseDecimal(getCellValue(row, 'Y'));
        const item_valor_unitario = parseDecimal(getCellValue(row, 'Z'));
        const item_valor_total_bruto = parseDecimal(getCellValue(row, 'AA'));
        const item_desconto_total = parseDecimal(getCellValue(row, 'AC'));
        const item_valor_total_liquido = parseDecimal(getCellValue(row, 'AE'));

        vendas.push({
          numero_venda,
          data_venda,
          numero_os,
          ds_vendedor,
          ds_cliente,
          ds_forma_pagamento,
          item_ds_referencia,
          item_ds_descricao,
          item_nr_quantidade,
          item_valor_original,
          item_valor_ajuste,
          item_valor_unitario,
          item_valor_total_bruto,
          item_desconto_total,
          item_valor_total_liquido
        });
      } catch (error) {
        erros.push({
          arquivo: 'Vendas',
          linha,
          descricao: `Erro ao processar linha: ${error.message}`
        });
      }
    }
  } catch (error) {
    erros.push({
      arquivo: 'Vendas',
      descricao: `Erro ao ler arquivo: ${error.message}`
    });
  }

  return { vendas, erros };
}
