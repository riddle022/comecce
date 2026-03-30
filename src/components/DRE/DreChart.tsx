import React from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { LinhaRelatorio } from '../../types/financeiro';
import { ChartTooltip } from '../Financeiro/ChartTooltip';
import { fmtBRL, fmtCompact } from '../Financeiro/formatters';

interface DreChartProps {
  linhas: LinhaRelatorio[];
  meses: string[];
  mesLabels: Record<string, string>;
}

export const DreChart: React.FC<DreChartProps> = ({ linhas, meses, mesLabels }) => {
  if (meses.length === 0) return null;

  const chartData = meses.map(mes => {
    const rb = linhas.find(l => l.codigo === '1001')?.valor_mensal[mes] ?? 0;
    const mc = linhas.find(l => l.descricao === '(=) Margem de Contribuição')?.valor_mensal[mes] ?? 0;
    const rl = linhas.find(l => l.tipo === 'total')?.valor_mensal[mes] ?? 0;

    // Total custos = rb - rl (tudo que foi deduzido)
    const custos = Math.abs(rb - rl);

    return {
      mes: mesLabels[mes] ?? mes,
      'Receita Bruta': rb,
      'Custos Totais': custos,
      'Resultado Líquido': rl,
    };
  });

  return (
    <div className="bg-slate-900/40 border border-white/5 rounded-xl p-4">
      <h3 className="text-sm font-bold text-white mb-4 tracking-tight">Composição Mensal</h3>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
          <XAxis dataKey="mes" tick={{ fill: '#64748B', fontSize: 10 }} />
          <YAxis tick={{ fill: '#64748B', fontSize: 10 }} tickFormatter={fmtCompact} />
          <Tooltip content={<ChartTooltip formatter={fmtBRL} />} />
          <Legend wrapperStyle={{ fontSize: 11, color: '#64748B' }} />
          <Bar dataKey="Receita Bruta" fill="#0EA5E9" radius={[3, 3, 0, 0]} />
          <Bar dataKey="Custos Totais" fill="#F97316" radius={[3, 3, 0, 0]} />
          <Bar dataKey="Resultado Líquido" fill="#22C55E" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
