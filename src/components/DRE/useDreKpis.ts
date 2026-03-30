import { LinhaRelatorio } from '../../types/financeiro';
import { fmtBRL, fmtPct } from '../Financeiro/formatters';

export interface DreKpi {
  title: string;
  value: string;
  subtitle?: string;
  trend?: number;
  variant: 'positive' | 'negative' | 'neutral';
}

function findLinha(linhas: LinhaRelatorio[], match: { codigo?: string; descricao?: string; tipo?: string }): LinhaRelatorio | undefined {
  return linhas.find(l =>
    (match.codigo && l.codigo === match.codigo) ||
    (match.descricao && l.descricao === match.descricao) ||
    (match.tipo && l.tipo === match.tipo)
  );
}

function calcTrend(mensal: Record<string, number>, lastMes: string, prevMes: string | undefined): number | undefined {
  if (!prevMes) return undefined;
  const prev = mensal[prevMes] ?? 0;
  const curr = mensal[lastMes] ?? 0;
  if (prev === 0) return undefined;
  return ((curr - prev) / Math.abs(prev)) * 100;
}

export function useDreKpis(linhas: LinhaRelatorio[], meses: string[]): DreKpi[] {
  if (linhas.length === 0 || meses.length === 0) return [];

  const lastMes = meses[meses.length - 1];
  const prevMes = meses.length > 1 ? meses[meses.length - 2] : undefined;

  const rb = findLinha(linhas, { codigo: '1001' });
  const mc = findLinha(linhas, { descricao: '(=) Margem de Contribuição' });
  const ro = findLinha(linhas, { descricao: '(=) Resultado Operacional' });
  const rl = findLinha(linhas, { tipo: 'total' });

  const rbVal = rb?.valor_mensal[lastMes] ?? 0;
  const mcVal = mc?.valor_mensal[lastMes] ?? 0;
  const mcPct = rbVal !== 0 ? (mcVal / rbVal) * 100 : 0;
  const roVal = ro?.valor_mensal[lastMes] ?? 0;
  const roPct = rbVal !== 0 ? (roVal / rbVal) * 100 : 0;
  const rlVal = rl?.valor_mensal[lastMes] ?? 0;
  const rlPct = rbVal !== 0 ? (rlVal / rbVal) * 100 : 0;

  return [
    {
      title: 'Receita Bruta',
      value: fmtBRL(rbVal),
      trend: rb ? calcTrend(rb.valor_mensal, lastMes, prevMes) : undefined,
      variant: 'neutral',
    },
    {
      title: 'Margem Contribuição',
      value: fmtPct(mcPct),
      subtitle: fmtBRL(mcVal),
      trend: mc ? calcTrend(mc.valor_mensal, lastMes, prevMes) : undefined,
      variant: mcPct >= 0 ? 'positive' : 'negative',
    },
    {
      title: 'Resultado Operacional',
      value: fmtPct(roPct),
      subtitle: fmtBRL(roVal),
      trend: ro ? calcTrend(ro.valor_mensal, lastMes, prevMes) : undefined,
      variant: roPct >= 0 ? 'positive' : 'negative',
    },
    {
      title: 'Resultado Líquido',
      value: fmtBRL(rlVal),
      subtitle: fmtPct(rlPct),
      trend: rl ? calcTrend(rl.valor_mensal, lastMes, prevMes) : undefined,
      variant: rlVal >= 0 ? 'positive' : 'negative',
    },
  ];
}
