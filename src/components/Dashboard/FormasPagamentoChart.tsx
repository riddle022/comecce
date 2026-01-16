import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { FormaPagamento } from '../../hooks/useDashboardData';

interface FormasPagamentoChartProps {
  data: FormaPagamento[];
}

const COLORS = [
  '#0F766E', '#0D9488', '#0891B2', '#0284C7', '#2563EB', '#4F46E5', '#7C3AED', '#9333EA', '#C026D3',
  '#DB2777', '#E11D48', '#DC2626', '#EA580C', '#D97706', '#CA8A04', '#65A30D', '#16A34A', '#059669',
  '#475569', '#334155', '#1E293B', '#0F172A'
];

export const FormasPagamentoChart: React.FC<FormasPagamentoChartProps> = ({ data }) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Process data for the Chart (group small ones)
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];

    const threshold = 3; // 3%
    const mainItems = data.filter(item => item.porcentagem >= threshold);
    const otherItems = data.filter(item => item.porcentagem < threshold);

    if (otherItems.length === 0) return data;

    const othersTotal = otherItems.reduce((acc, current) => acc + current.valor, 0);
    const othersPercentage = Number(otherItems.reduce((acc, current) => acc + current.porcentagem, 0).toFixed(1));

    return [
      ...mainItems,
      {
        forma: `Otros (${otherItems.length})`,
        valor: othersTotal,
        porcentagem: othersPercentage
      }
    ];
  }, [data]);

  return (
    <div className="bg-slate-900/40 backdrop-blur-md border border-white/5 rounded-xl p-5 shadow-sm h-full flex flex-col">
      <h3 className="text-sm font-semibold text-slate-200 mb-4 flex items-center gap-2">
        <div className="w-1 h-4 bg-cyan-500 rounded-full" />
        Distribuição por Forma de Pagamento
      </h3>

      {data && data.length > 0 ? (
        <div className="flex-1 flex flex-col min-h-0">
          <div className="h-[180px] w-full shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData as any[]}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={2}
                  dataKey="valor"
                  stroke="none"
                >
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.forma.startsWith('Otros') ? '#475569' : COLORS[index % COLORS.length]}
                      className="hover:opacity-80 transition-opacity outline-none"
                    />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-[#0F172A] border border-white/10 rounded-xl p-3 shadow-xl transform transition-all duration-200">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-100 text-sm">{formatCurrency(data.valor)}</span>
                            <span className="text-xs text-slate-400">({data.porcentagem}%)</span>
                          </div>
                          <div className="text-xs text-slate-400 mt-1 truncate max-w-[140px] font-medium border-t border-slate-800/50 pt-1">
                            {data.forma}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-6 flex-1 min-h-0 overflow-y-auto pr-2 space-y-2 max-h-[300px] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-700 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-600">
            {data.map((item, index) => (
              <div
                key={index}
                className="group flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-slate-800/50 transition-colors"
              >
                <div className="flex items-center space-x-3 overflow-hidden">
                  <div
                    className="w-2 h-2 rounded-full shrink-0 group-hover:scale-110 transition-transform"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="text-[11px] text-slate-400 truncate group-hover:text-slate-200 transition-colors">
                    {item.forma}
                  </span>
                </div>
                <div className="text-right flex items-center gap-2 shrink-0">
                  <span className="text-[11px] text-slate-200 font-medium">
                    {formatCurrency(item.valor)}
                  </span>
                  <span className="text-[10px] text-slate-500 w-10 text-right">
                    {item.porcentagem}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center py-10">
          <p className="text-slate-500 text-sm italic">Nenhum dado disponível</p>
        </div>
      )}
    </div>
  );
};
