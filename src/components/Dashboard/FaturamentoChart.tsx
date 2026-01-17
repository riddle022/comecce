import React, { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TendenciaItem } from '../../hooks/useDashboardData';

interface FaturamentoChartProps {
  data: TendenciaItem[];
}

type FilterType = 'day' | 'week' | 'month';

export const FaturamentoChart: React.FC<FaturamentoChartProps> = ({ data }) => {
  const [filter, setFilter] = useState<FilterType>('month');

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const processedData = useMemo(() => {
    if (!data || data.length === 0) return [];

    if (filter === 'day') {
      return data;
    }

    if (filter === 'week') {
      // Initialize days of week map
      const daysOfWeek = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
      const weekData = daysOfWeek.map(day => ({ data: day, valor_bruto: 0 }));

      data.forEach(item => {
        // Parse date carefully
        const [year, month, day] = item.data.split('-').map(Number);
        const date = new Date(year, month - 1, day);
        const dayIndex = date.getDay();
        weekData[dayIndex].valor_bruto += item.valor_bruto;
      });

      return weekData;
    }

    if (filter === 'month') {
      const monthMap = new Map<string, number>();

      data.forEach(item => {
        const [year, month] = item.data.split('-');
        const key = `${year}-${month}`; // Key for grouping
        const current = monthMap.get(key) || 0;
        monthMap.set(key, current + item.valor_bruto);
      });

      // Convert back to array
      return Array.from(monthMap.entries()).map(([key, value]) => ({
        data: key,
        valor_bruto: value
      }));
    }

    return data;
  }, [data, filter]);

  const formatDate = (dateStr: string) => {
    if (filter === 'week') return dateStr; // Already formatted as day name

    if (filter === 'month') {
      const [year, month] = dateStr.split('-');
      const date = new Date(Number(year), Number(month) - 1, 1);
      // Capitalize first letter
      const monthName = date.toLocaleDateString('pt-BR', { month: 'long' });
      return monthName.charAt(0).toUpperCase() + monthName.slice(1);
    }

    const [year, month, day] = dateStr.split('-');
    const date = new Date(Number(year), Number(month) - 1, Number(day));
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  return (
    <div className="bg-[#1E293B] border border-[#0F4C5C]/20 rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-white">Faturamento no Período</h3>

        {/* Minimalist Filters */}
        <div className="flex items-center bg-[#0F172A] rounded-lg p-1 border border-[#334155]">
          {(['day', 'week', 'month'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`
                px-3 py-1 text-xs font-medium rounded-md transition-all duration-200
                ${filter === f
                  ? 'bg-[#38BDF8]/10 text-[#38BDF8] shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}
              `}
            >
              {f === 'day' ? 'Dia' : f === 'week' ? 'Semana' : 'Mês'}
            </button>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={processedData} barSize={32}>
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
            // Only show tooltip for 'day' filter
            wrapperStyle={{ display: filter === 'day' ? 'block' : 'none' }}
          />
          <Bar
            dataKey="valor_bruto"
            fill="url(#faturamentoGradient)"
            radius={[4, 4, 0, 0]}
            // Show labels for 'week' and 'month'
            label={
              filter !== 'day'
                ? {
                  position: 'top',
                  formatter: (value: number) => formatCurrency(value),
                  fill: '#94A3B8', // Slate-400 for minimalist look
                  fontSize: 11,
                  fontWeight: 500,
                }
                : undefined
            }
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
