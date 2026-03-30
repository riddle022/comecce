import React from 'react';
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { LinhaRelatorio } from '../../types/financeiro';
import { ChartTooltip } from '../Financeiro/ChartTooltip';
import { fmtBRL, fmtCompact } from '../Financeiro/formatters';

interface FluxoCaixaChartProps {
  linhas: LinhaRelatorio[];
  meses: string[];
  mesLabels: Record<string, string>;
}

export const FluxoCaixaChart: React.FC<FluxoCaixaChartProps> = ({ linhas, meses, mesLabels }) => {
  if (meses.length === 0) return null;

  let acumulado = 0;
  const chartData = meses.map(mes => {
    let entradas = 0;
    let saidas = 0;

    for (const linha of linhas) {
      if (linha.tipo === 'subtotal' || linha.tipo === 'total' || linha.tipo === 'percentual') continue;
      const val = linha.valor_mensal[mes] ?? 0;
      if (linha.tipo === 'entrada') entradas += val;
      if (linha.tipo === 'saida') saidas += Math.abs(val);
    }

    acumulado += entradas - saidas;

    return {
      mes: mesLabels[mes] ?? mes,
      Entradas: entradas,
      Saídas: saidas,
      'Saldo Acumulado': acumulado,
    };
  });

  return (
    <div className="bg-slate-900/40 border border-white/5 rounded-xl p-4">
      <h3 className="text-sm font-bold text-white mb-4 tracking-tight">Movimentação e Tendência</h3>
      <ResponsiveContainer width="100%" height={360}>
        <ComposedChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
          <XAxis dataKey="mes" tick={{ fill: '#64748B', fontSize: 10 }} />
          <YAxis yAxisId="left" tick={{ fill: '#64748B', fontSize: 10 }} tickFormatter={fmtCompact} />
          <YAxis yAxisId="right" orientation="right" tick={{ fill: '#64748B', fontSize: 10 }} tickFormatter={fmtCompact} />
          <Tooltip content={<ChartTooltip formatter={fmtBRL} />} />
          <Legend wrapperStyle={{ fontSize: 11, color: '#64748B' }} />
          <Bar yAxisId="left" dataKey="Entradas" fill="#22C55E" radius={[3, 3, 0, 0]} opacity={0.85} />
          <Bar yAxisId="left" dataKey="Saídas" fill="#EF4444" radius={[3, 3, 0, 0]} opacity={0.85} />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="Saldo Acumulado"
            stroke="#0EA5E9"
            strokeWidth={2.5}
            dot={{ fill: '#0EA5E9', r: 3 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};
