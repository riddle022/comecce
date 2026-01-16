import { VendaBase, ErrorRecord } from '../types.ts';
import { compareNormalized } from '../utils/textUtils.ts';

export function validateClienteEmpresa(
  vendas: VendaBase[],
  ds_empresa: string
): ErrorRecord[] {
  const erros: ErrorRecord[] = [];

  for (const venda of vendas) {
    if (venda.ds_cliente && !compareNormalized(venda.ds_cliente, ds_empresa)) {
      erros.push({
        arquivo: 'Vendas',
        valor: venda.ds_cliente,
        descricao: `Cliente "${venda.ds_cliente}" não corresponde à empresa selecionada "${ds_empresa}"`
      });
    }
  }

  return erros;
}

export function validateNoDuplicates(vendas: VendaBase[]): ErrorRecord[] {
  const erros: ErrorRecord[] = [];
  const seen = new Set<number>();

  for (const venda of vendas) {
    if (seen.has(venda.numero_venda)) {
      erros.push({
        arquivo: 'Vendas',
        valor: venda.numero_venda,
        descricao: `numero_venda duplicado: ${venda.numero_venda}`
      });
    }
    seen.add(venda.numero_venda);
  }

  return erros;
}
