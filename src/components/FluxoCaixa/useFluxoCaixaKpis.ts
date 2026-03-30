import { LinhaRelatorio } from '../../types/financeiro';
import { fmtBRL } from '../Financeiro/formatters';

export interface FluxoCaixaKpi {
  title: string;
  value: string;
  subtitle?: string;
  trend?: number;
  variant: 'positive' | 'negative' | 'neutral';
}

export function useFluxoCaixaKpis(linhas: LinhaRelatorio[], meses: string[]): FluxoCaixaKpi[] {
  if (linhas.length === 0 || meses.length === 0) return [];

  const lastMes = meses[meses.length - 1];

  let totalEntradas = 0;
  let totalSaidas = 0;
  let saldoAcumulado = 0;
  const saidasMensais: number[] = [];

  for (const mes of meses) {
    let entradasMes = 0;
    let saidasMes = 0;

    for (const linha of linhas) {
      if (linha.tipo === 'subtotal' || linha.tipo === 'total' || linha.tipo === 'percentual') continue;
      const val = linha.valor_mensal[mes] ?? 0;
      if (linha.tipo === 'entrada') entradasMes += val;
      if (linha.tipo === 'saida') saidasMes += Math.abs(val);
    }

    saldoAcumulado += entradasMes - saidasMes;
    saidasMensais.push(saidasMes);

    if (mes === lastMes) {
      totalEntradas = entradasMes;
      totalSaidas = saidasMes;
    }
  }

  const saldoPeriodo = totalEntradas - totalSaidas;
  const mediaSaidas = saidasMensais.length > 0
    ? saidasMensais.reduce((a, b) => a + b, 0) / saidasMensais.length
    : 0;
  const cobertura = mediaSaidas > 0 ? saldoAcumulado / mediaSaidas : 0;

  return [
    {
      title: 'Total Entradas',
      value: fmtBRL(totalEntradas),
      variant: 'positive',
    },
    {
      title: 'Total Saídas',
      value: fmtBRL(totalSaidas),
      variant: 'negative',
    },
    {
      title: 'Saldo do Período',
      value: fmtBRL(saldoPeriodo),
      variant: saldoPeriodo >= 0 ? 'positive' : 'negative',
    },
    {
      title: 'Saldo Acumulado',
      value: fmtBRL(saldoAcumulado),
      subtitle: `Cobertura: ${cobertura.toFixed(1)} meses`,
      variant: saldoAcumulado >= 0 ? 'positive' : 'negative',
    },
  ];
}
