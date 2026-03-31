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
  LabelList,
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
    <div className="bg-gradient-to-br from-slate-900/60 to-slate-900/20 border border-slate-700/50 rounded-2xl p-6 shadow-2xl backdrop-blur-md">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-3">
          <div className="w-1.5 h-6 bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.6)]"></div>
          Movimentação e Tendência
        </h3>
      </div>
      
      <ResponsiveContainer width="100%" height={380}>
        <ComposedChart data={chartData} margin={{ top: 30, right: 10, left: 10, bottom: 20 }}>
          <defs>
            <linearGradient id="colorEntradas" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
              <stop offset="100%" stopColor="#047857" stopOpacity={0.8} />
            </linearGradient>
            <linearGradient id="colorSaidas" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ef4444" stopOpacity={1} />
              <stop offset="100%" stopColor="#b91c1c" stopOpacity={0.8} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
          
          <XAxis 
            dataKey="mes" 
            tick={{ fill: '#94A3B8', fontSize: 12, fontWeight: 500 }} 
            axisLine={false} 
            tickLine={false} 
            dy={10} 
          />
          <YAxis 
            yAxisId="left" 
            tick={{ fill: '#64748B', fontSize: 11 }} 
            tickFormatter={fmtCompact} 
            axisLine={false} 
            tickLine={false} 
            dx={-10} 
          />
          <YAxis 
            yAxisId="right" 
            orientation="right" 
            tick={{ fill: '#64748B', fontSize: 11 }} 
            tickFormatter={fmtCompact} 
            axisLine={false} 
            tickLine={false} 
            dx={10} 
          />
          
          <Tooltip 
            content={<ChartTooltip formatter={fmtBRL} />} 
            cursor={{ fill: '#334155', opacity: 0.2 }}
          />
          
          <Legend 
            wrapperStyle={{ fontSize: 13, fontWeight: 500, color: '#E2E8F0', paddingTop: '20px' }} 
            iconType="circle" 
          />
          
          <Bar yAxisId="left" dataKey="Entradas" fill="url(#colorEntradas)" radius={[6, 6, 0, 0]} maxBarSize={60}>
            <LabelList dataKey="Entradas" position="top" formatter={(val: any) => fmtCompact(Number(val) || 0)} fill="#94A3B8" fontSize={11} fontWeight={600} offset={8} />
          </Bar>
          <Bar yAxisId="left" dataKey="Saídas" fill="url(#colorSaidas)" radius={[6, 6, 0, 0]} maxBarSize={60}>
            <LabelList dataKey="Saídas" position="top" formatter={(val: any) => fmtCompact(Number(val) || 0)} fill="#94A3B8" fontSize={11} fontWeight={600} offset={8} />
          </Bar>
          
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="Saldo Acumulado"
            stroke="#3b82f6"
            strokeWidth={3}
            dot={{ fill: '#3b82f6', r: 5, strokeWidth: 0 }}
            activeDot={{ r: 7, fill: '#60a5fa' }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};
