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
  LabelList,
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
    <div className="bg-gradient-to-br from-slate-900/60 to-slate-900/20 border border-slate-700/50 rounded-2xl p-6 shadow-2xl backdrop-blur-md">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-3">
          <div className="w-1.5 h-6 bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.6)]"></div>
          Composição Mensal
        </h3>
      </div>
      
      <ResponsiveContainer width="100%" height={380}>
        <BarChart data={chartData} margin={{ top: 30, right: 10, left: 10, bottom: 20 }}>
          <defs>
            <linearGradient id="colorReceita" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity={1} />
              <stop offset="100%" stopColor="#1d4ed8" stopOpacity={0.8} />
            </linearGradient>
            <linearGradient id="colorCustos" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f97316" stopOpacity={1} />
              <stop offset="100%" stopColor="#c2410c" stopOpacity={0.8} />
            </linearGradient>
            <linearGradient id="colorResultado" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
              <stop offset="100%" stopColor="#047857" stopOpacity={0.8} />
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
            tick={{ fill: '#64748B', fontSize: 11 }} 
            tickFormatter={fmtCompact} 
            axisLine={false} 
            tickLine={false} 
            dx={-10} 
          />
          
          <Tooltip 
            content={<ChartTooltip formatter={fmtBRL} />} 
            cursor={{ fill: '#334155', opacity: 0.2 }}
          />
          
          <Legend 
            wrapperStyle={{ fontSize: 13, fontWeight: 500, color: '#E2E8F0', paddingTop: '20px' }} 
            iconType="circle" 
          />
          
          <Bar dataKey="Receita Bruta" fill="url(#colorReceita)" radius={[6, 6, 0, 0]} maxBarSize={60}>
            <LabelList dataKey="Receita Bruta" position="top" formatter={(val: any) => fmtCompact(Number(val) || 0)} fill="#94A3B8" fontSize={11} fontWeight={600} offset={8} />
          </Bar>
          <Bar dataKey="Custos Totais" fill="url(#colorCustos)" radius={[6, 6, 0, 0]} maxBarSize={60}>
            <LabelList dataKey="Custos Totais" position="top" formatter={(val: any) => fmtCompact(Number(val) || 0)} fill="#94A3B8" fontSize={11} fontWeight={600} offset={8} />
          </Bar>
          <Bar dataKey="Resultado Líquido" fill="url(#colorResultado)" radius={[6, 6, 0, 0]} maxBarSize={60}>
            <LabelList dataKey="Resultado Líquido" position="top" formatter={(val: any) => fmtCompact(Number(val) || 0)} fill="#94A3B8" fontSize={11} fontWeight={600} offset={8} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
