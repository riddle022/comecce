import { LinhaRelatorio } from '../../types/financeiro';
import { fmtBRL } from '../Financeiro/formatters';

export interface FluxoCaixaKpi {
  title: string;
  value: string;
  subtitle?: string;
  trend?: number;
  variant: 'positive' | 'negative' | 'neutral';
}

export interface PontoEquilibrioData {
  pe1: number;
  pe2: number;
  receitaTotal: number;
  pe1Pct: number;
  pe2Pct: number;
  custosFixos: number;
  investimentos: number;
  financiamentos: number;
  retiradas: number;
  mcPct: number;
}

function findLinha(linhas: LinhaRelatorio[], match: { codigo?: string; descricao?: string }): LinhaRelatorio | undefined {
  return linhas.find(l =>
    (match.codigo && l.codigo === match.codigo) ||
    (match.descricao && l.descricao === match.descricao)
  );
}

export function useFluxoCaixaKpis(linhas: LinhaRelatorio[], meses: string[]): {
  kpis: FluxoCaixaKpi[];
  pontoEquilibrio: PontoEquilibrioData | null;
} {
  if (linhas.length === 0 || meses.length === 0) return { kpis: [], pontoEquilibrio: null };

  // Calcula total de entradas e saídas somando TODOS os meses
  let totalEntradas = 0;
  let totalSaidas = 0;
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

    totalEntradas += entradasMes;
    totalSaidas += saidasMes;
    saidasMensais.push(saidasMes);
  }

  // Saldo do Período = Resultado Líquido da tabela (linha tipo 'total')
  const linhaResultadoLiquido = linhas.find(
    l => l.tipo === 'total' && l.descricao === '(=) Resultado Líquido'
  );
  const saldoPeriodo = linhaResultadoLiquido?.valor_total ?? 0;

  // Saldo Acumulado = acumula o resultado líquido mês a mês
  let saldoAcumulado = 0;
  if (linhaResultadoLiquido) {
    for (const mes of meses) {
      saldoAcumulado += linhaResultadoLiquido.valor_mensal[mes] ?? 0;
    }
  }

  const mediaSaidas = saidasMensais.length > 0
    ? saidasMensais.reduce((a, b) => a + b, 0) / saidasMensais.length
    : 0;
  const cobertura = mediaSaidas > 0 ? saldoAcumulado / mediaSaidas : 0;

  // Ponto de Equilíbrio - usa TOTAIS do período
  const rb  = findLinha(linhas, { codigo: '1001' });
  const mc  = findLinha(linhas, { descricao: '(=) Margem de Contribuição' });
  const cf  = findLinha(linhas, { descricao: '(-) Custos Fixos' });
  const inv = findLinha(linhas, { descricao: '(-) Investimentos' });
  const fin = findLinha(linhas, { descricao: '(-) Financiamentos' });
  const ret = findLinha(linhas, { descricao: '(-) Retiradas Sócios' });

  const rbTotal  = rb?.valor_total ?? 0;
  const mcTotal  = mc?.valor_total ?? 0;
  const cfTotal  = Math.abs(cf?.valor_total ?? 0);
  const invTotal = Math.abs(inv?.valor_total ?? 0);
  const finTotal = Math.abs(fin?.valor_total ?? 0);
  const retTotal = Math.abs(ret?.valor_total ?? 0);

  const mcPctFrac = rbTotal !== 0 ? mcTotal / rbTotal : 0; // fração ex: 0.45

  const pe1 = mcPctFrac !== 0 ? cfTotal / mcPctFrac : 0;
  const pe2 = mcPctFrac !== 0 ? (cfTotal + invTotal + finTotal + retTotal) / mcPctFrac : 0;

  const pontoEquilibrio: PontoEquilibrioData = {
    pe1,
    pe2,
    receitaTotal: rbTotal,
    pe1Pct: rbTotal > 0 ? (pe1 / rbTotal) * 100 : 0,
    pe2Pct: rbTotal > 0 ? (pe2 / rbTotal) * 100 : 0,
    custosFixos: cfTotal,
    investimentos: invTotal,
    financiamentos: finTotal,
    retiradas: retTotal,
    mcPct: mcPctFrac * 100,
  };

  const kpis: FluxoCaixaKpi[] = [
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

  return { kpis, pontoEquilibrio };
}

