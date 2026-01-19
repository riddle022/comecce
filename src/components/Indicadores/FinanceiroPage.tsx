import React, { useState, useMemo } from 'react';
import { TrendingUp, DollarSign, TrendingDown, PieChart as PieChartIcon } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { FilterPanel } from '../Common/FilterPanel';
import { StatCard } from '../Dashboard/StatCard';
import { FormasPagamentoChart } from '../Dashboard/FormasPagamentoChart';
import { useSalesData } from '../../hooks/useSalesData';
import { useGlobalFilters } from '../../contexts/GlobalFiltersContext';

export const FinanceiroPage: React.FC = () => {
  const { filters, updateFilters } = useGlobalFilters();

  const { data, loading, error } = useSalesData({
    dataInicio: filters.dataInicio,
    dataFim: filters.dataFim,
    empresaIds: filters.empresaIds
  });

  const handleDateRangeChange = (newDateRange: { dataInicio: string; dataFim: string }) => {
    updateFilters(newDateRange);
  };

  const handleEmpresasChange = (ids: string[]) => {
    updateFilters({ empresaIds: ids });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T12:00:00'); // Fix timezone issues
    return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' }).format(date);
  };

  const [chartPeriod, setChartPeriod] = useState<'dia' | 'semana' | 'mes'>('mes');

  // Helper to get week start date (Sunday)
  const getWeekStart = (date: Date) => {
    const d = new Date(date);
    d.setDate(d.getDate() - d.getDay()); // Set to Sunday
    return d;
  };

  const aggregatedTrendData = useMemo(() => {
    if (!data?.tendencia) return [];

    if (chartPeriod === 'dia') return data.tendencia;

    const groupedData: Record<string, { data: string; valor_bruto: number; valor_liquido: number }> = {};

    data.tendencia.forEach((item) => {
      const date = new Date(item.data + 'T12:00:00'); // Valid date parsing
      let key = '';

      if (chartPeriod === 'mes') {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      } else if (chartPeriod === 'semana') {
        const weekStart = getWeekStart(date);
        key = weekStart.toISOString().split('T')[0];
      }

      if (!groupedData[key]) {
        groupedData[key] = { data: key, valor_bruto: 0, valor_liquido: 0 };
      }

      groupedData[key].valor_bruto += Number(item.valor_bruto);
      groupedData[key].valor_liquido += Number(item.valor_liquido);
    });

    return Object.values(groupedData).sort((a, b) => a.data.localeCompare(b.data));

  }, [data?.tendencia, chartPeriod]);

  if (loading) {
    return (
      <div className="space-y-6">
        <FilterPanel
          onDateRangeChange={handleDateRangeChange}
          onEmpresasChange={handleEmpresasChange}
          initialDateRange={{ dataInicio: filters.dataInicio, dataFim: filters.dataFim }}
          initialEmpresas={filters.empresaIds}
        />
        <div className="bg-[#1E293B] border border-[#0F4C5C]/20 rounded-xl p-12">
          <div className="text-center">
            <p className="text-gray-400">Carregando dados...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <FilterPanel
          onDateRangeChange={handleDateRangeChange}
          onEmpresasChange={handleEmpresasChange}
          initialDateRange={{ dataInicio: filters.dataInicio, dataFim: filters.dataFim }}
          initialEmpresas={filters.empresaIds}
        />
        <div className="bg-[#1E293B] border border-[#0F4C5C]/20 rounded-xl p-12">
          <div className="text-center">
            <p className="text-red-400">Erro: {error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!data || filters.empresaIds.length === 0) {
    return (
      <div className="space-y-6">
        <FilterPanel
          onDateRangeChange={handleDateRangeChange}
          onEmpresasChange={handleEmpresasChange}
          initialDateRange={{ dataInicio: filters.dataInicio, dataFim: filters.dataFim }}
          initialEmpresas={filters.empresaIds}
        />
        <div className="bg-[#1E293B] border border-[#0F4C5C]/20 rounded-xl p-12">
          <div className="text-center">
            <p className="text-gray-400">Selecione empresas para visualizar os dados</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <FilterPanel
        onDateRangeChange={handleDateRangeChange}
        onEmpresasChange={handleEmpresasChange}
        initialDateRange={{ dataInicio: filters.dataInicio, dataFim: filters.dataFim }}
        initialEmpresas={filters.empresaIds}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          title="Faturamento Bruto"
          value={formatCurrency(data.kpis.faturamento_bruto)}
          icon={TrendingUp}
          color="cyan"
        />
        <StatCard
          title="Faturamento Líquido"
          value={formatCurrency(data.kpis.faturamento_liquido)}
          icon={DollarSign}
          color="green"
        />
        <StatCard
          title="Desconto Total"
          value={formatCurrency(data.kpis.desconto_total)}
          icon={TrendingDown}
          color="red"
        />
        <StatCard
          title="Lucro Bruto Total"
          value={formatCurrency(data.kpis.lucro_bruto)}
          icon={DollarSign}
          color="green"
        />
        <StatCard
          title="Margem de Lucro Média"
          value={`${data.kpis.margem_lucro_media.toFixed(2)}%`}
          icon={PieChartIcon}
          color="cyan"
        />
        <StatCard
          title="Custo Produtos (CMV)"
          value={formatCurrency(data.kpis.custo_total)}
          icon={TrendingDown}
          color="red"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <FormasPagamentoChart data={data.formas_pagamento} />

        <div className="bg-[#1E293B] border border-[#0F4C5C]/20 rounded-xl p-4 min-h-[350px] flex flex-col">
          <div className="flex flex-row items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-white">Comparativo Bruto vs. Líquido</h3>
            <div className="flex bg-[#0F172A] rounded-lg p-1">
              {(['dia', 'semana', 'mes'] as const).map((period) => (
                <button
                  key={period}
                  onClick={() => setChartPeriod(period)}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${chartPeriod === period
                    ? 'bg-[#0F4C5C] text-white'
                    : 'text-gray-400 hover:text-gray-200'
                    }`}
                >
                  {period.charAt(0).toUpperCase() + period.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="99%" height={250}>
              <AreaChart data={aggregatedTrendData}>
                <defs>
                  <linearGradient id="colorBruto" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorLiquido" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#06B6D4" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                <XAxis
                  dataKey="data"
                  stroke="#64748B"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(dateStr) => {
                    if (chartPeriod === 'mes') {
                      // Expecting "YYYY-MM" or full date for month view
                      const [year, month] = dateStr.includes('-') ? dateStr.split('-') : [];
                      if (year && month) {
                        const date = new Date(parseInt(year), parseInt(month) - 1, 1);
                        return new Intl.DateTimeFormat('pt-BR', { month: 'short', year: '2-digit' }).format(date);
                      }
                      return dateStr;
                    }
                    if (chartPeriod === 'semana') {
                      const date = new Date(dateStr);
                      return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' }).format(date);
                    }
                    return formatDate(dateStr);
                  }}
                />
                <YAxis
                  stroke="#64748B"
                  tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                  labelStyle={{ color: '#E2E8F0', marginBottom: '8px' }}
                  formatter={(value: any) => [formatCurrency(value), '']}
                  labelFormatter={(label) => {
                    if (chartPeriod === 'mes') {
                      const [year, month] = label.includes('-') ? label.split('-') : [];
                      if (year && month) {
                        const date = new Date(parseInt(year), parseInt(month) - 1, 1);
                        return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(date);
                      }
                      return label;
                    }
                    if (chartPeriod === 'semana') {
                      const date = new Date(label);
                      return `Semana de ${new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' }).format(date)}`;
                    }
                    return formatDate(label);
                  }}
                />
                <Legend formatter={(value) => <span className="text-slate-300 text-sm">{value}</span>} />
                <Area
                  type="monotone"
                  dataKey="valor_bruto"
                  stackId="1"
                  stroke="#F59E0B"
                  fill="url(#colorBruto)"
                  strokeWidth={2}
                  name="Faturamento Bruto"
                />
                <Area
                  type="monotone"
                  dataKey="valor_liquido"
                  stackId="2"
                  stroke="#06B6D4"
                  fill="url(#colorLiquido)"
                  strokeWidth={2}
                  name="Faturamento Líquido"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
