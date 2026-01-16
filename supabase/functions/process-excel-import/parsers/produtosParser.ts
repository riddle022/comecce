import { ProdutoData, ErrorRecord } from '../types.ts';
import { parseExcelFile, getWorksheetData, getCellValue, parseDecimal, parseInteger } from '../utils/excelUtils.ts';
import { normalizeText, parseCsvList } from '../utils/textUtils.ts';

export function parseProdutosExcel(buffer: ArrayBuffer): { produtos: ProdutoData[]; erros: ErrorRecord[] } {
  const produtos: ProdutoData[] = [];
  const erros: ErrorRecord[] = [];

  try {
    const workbook = parseExcelFile(buffer);
    const data = getWorksheetData(workbook);

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const linha = i + 1;

      try {
        const item_ds_referencia = normalizeText(getCellValue(row, 'A'));
        if (!item_ds_referencia) {
          erros.push({
            arquivo: 'Produtos',
            linha,
            coluna: 'A',
            valor: getCellValue(row, 'A'),
            descricao: 'item_ds_referencia é obrigatório'
          });
          continue;
        }

        const item_ds_grupo = normalizeText(getCellValue(row, 'C'));
        const item_ds_grife = normalizeText(getCellValue(row, 'E'));
        const item_ds_fornecedor = normalizeText(getCellValue(row, 'I'));

        const quantidade = parseInteger(getCellValue(row, 'L'));
        const custo_total = parseDecimal(getCellValue(row, 'N'));

        let custo_unitario: number | null = null;
        if (custo_total !== null && quantidade !== null && quantidade > 0) {
          custo_unitario = custo_total / quantidade;
        } else if (custo_total !== null && quantidade === 0) {
          erros.push({
            arquivo: 'Produtos',
            linha,
            coluna: 'L',
            valor: quantidade,
            descricao: 'Divisão por zero ao calcular custo unitário'
          });
        }

        const vendas_csv = getCellValue(row, 'R');
        const vendas_referencias = parseCsvList(vendas_csv).map(v => parseInt(v)).filter(v => !isNaN(v));

        const os_csv = getCellValue(row, 'S');
        const os_referencias = parseCsvList(os_csv).map(v => parseInt(v)).filter(v => !isNaN(v));

        produtos.push({
          item_ds_referencia,
          item_ds_grupo,
          item_ds_grife,
          item_ds_fornecedor,
          quantidade,
          custo_total,
          custo_unitario,
          vendas_referencias,
          os_referencias
        });
      } catch (error) {
        erros.push({
          arquivo: 'Produtos',
          linha,
          descricao: `Erro ao processar linha: ${error.message}`
        });
      }
    }
  } catch (error) {
    erros.push({
      arquivo: 'Produtos',
      descricao: `Erro ao ler arquivo: ${error.message}`
    });
  }

  return { produtos, erros };
}
