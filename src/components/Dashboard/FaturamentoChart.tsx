import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TendenciaItem } from '../../hooks/useDashboardData';

interface FaturamentoChartProps {
  data: TendenciaItem[];
}

export const FaturamentoChart: React.FC<FaturamentoChartProps> = ({ data }) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    // Correctly handle timezone by parsing the components or appending time
    const [year, month, day] = dateStr.split('-');
    const date = new Date(Number(year), Number(month) - 1, Number(day));
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  return (
    <div className="bg-[#1E293B] border border-[#0F4C5C]/20 rounded-xl p-4">
      <h3 className="text-base font-semibold text-white mb-3">Faturamento no Período</h3>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data} barSize={32}>
          <defs>
            <linearGradient id="faturamentoGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0F766E" />
              <stop offset="100%" stopColor="#0F766E" stopOpacity={0.6} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
          <XAxis
            dataKey="data"
            stroke="#64748B"
            tickFormatter={formatDate}
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="#64748B"
            tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            cursor={{ fill: '#334155', opacity: 0.2 }}
            contentStyle={{
              backgroundColor: '#0F172A',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}
            formatter={(value: any) => [formatCurrency(value), 'Faturamento']}
            labelFormatter={formatDate}
            labelStyle={{ color: '#E2E8F0', marginBottom: '8px' }}
          />
          <Bar
            dataKey="valor_bruto"
            fill="url(#faturamentoGradient)"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
