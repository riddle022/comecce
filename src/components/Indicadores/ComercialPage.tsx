import { DollarSign, Percent, PercentSquare, ShoppingCart, TrendingUp } from 'lucide-react';
import React from 'react';
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useGlobalFilters } from '../../contexts/GlobalFiltersContext';
import { useSalesData } from '../../hooks/useSalesData';
import { FilterPanel } from '../Common/FilterPanel';
import { StatCard } from '../Dashboard/StatCard';

export const ComercialPage: React.FC = () => {
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

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('pt-BR').format(value);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' }).format(date);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <FilterPanel
          onDateRangeChange={handleDateRangeChange}
          onEmpresasChange={handleEmpresasChange}
          initialDateRange={{ dataInicio: filters.dataInicio, dataFim: filters.dataFim }}
          initialEmpresas={filters.empresaIds}
        />
        <div className="bg-[#1E293B] border border-[#0F4C5C]/20 rounded-xl p-8">
          <div className="text-center">
            <p className="text-gray-400 text-sm">Carregando dados...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <FilterPanel
          onDateRangeChange={handleDateRangeChange}
          onEmpresasChange={handleEmpresasChange}
          initialDateRange={{ dataInicio: filters.dataInicio, dataFim: filters.dataFim }}
          initialEmpresas={filters.empresaIds}
        />
        <div className="bg-[#1E293B] border border-[#0F4C5C]/20 rounded-xl p-8">
          <div className="text-center">
            <p className="text-red-400 text-sm">Erro: {error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!data || filters.empresaIds.length === 0) {
    return (
      <div className="space-y-4">
        <FilterPanel
          onDateRangeChange={handleDateRangeChange}
          onEmpresasChange={handleEmpresasChange}
          initialDateRange={{ dataInicio: filters.dataInicio, dataFim: filters.dataFim }}
          initialEmpresas={filters.empresaIds}
        />
        <div className="bg-[#1E293B] border border-[#0F4C5C]/20 rounded-xl p-8">
          <div className="text-center">
            <p className="text-gray-400 text-sm">Selecione empresas para visualizar os dados</p>
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
          icon={DollarSign}
          color="cyan"
        />
        <StatCard
          title="Faturamento Líquido"
          value={formatCurrency(data.kpis.faturamento_liquido)}
          icon={DollarSign}
          color="green"
        />
        <StatCard
          title="Índice de Desconto Médio"
          value={`${data.kpis.indice_desconto_medio || 0}%`}
          icon={Percent}
          color="orange"
        />
        <StatCard
          title="Número de Vendas"
          value={formatNumber(data.kpis.total_vendas)}
          icon={ShoppingCart}
          color="blue"
        />
        <StatCard
          title="Ticket Médio"
          value={formatCurrency(data.kpis.ticket_medio)}
          icon={TrendingUp}
          color="purple"
        />
        <StatCard
          title="Desconto Total"
          value={formatCurrency(data.kpis.desconto_total)}
          icon={PercentSquare}
          color="red"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-[#1E293B] border border-[#0F4C5C]/20 rounded-xl p-4">
          <h3 className="text-base font-semibold text-white mb-3">Ranking de Vendedores</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data.top_vendedores} layout="vertical" barSize={24} margin={{ right: 60 }}>
              <defs>
                <linearGradient id="rankingGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#06B6D4" />
                  <stop offset="100%" stopColor="#3B82F6" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#334155" />
              <XAxis
                type="number"
                stroke="#64748B"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `R$${(value / 1000).toFixed(0)}k`}
              />
              <YAxis
                dataKey="vendedor"
                type="category"
                stroke="#94A3B8"
                width={100}
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
                labelStyle={{ color: '#E2E8F0', marginBottom: '8px' }}
                formatter={(value: any) => [formatCurrency(value), 'Vendas']}
              />
              <Bar
                dataKey="valor"
                fill="url(#rankingGradient)"
                radius={[0, 4, 4, 0]}
                label={(props: any) => {
                  const { x, y, width, height, value } = props;
                  if (value === null || value === undefined) return null;
                  return (
                    <text
                      x={x + width + 5}
                      y={y + height / 2 + 4}
                      fill="#E2E8F0"
                      fontSize={11}
                      fontWeight={500}
                      textAnchor="start"
                    >
                      {formatCurrency(value)}
                    </text>
                  );
                }}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-[#1E293B] border border-[#0F4C5C]/20 rounded-xl p-4">
          <h3 className="text-base font-semibold text-white mb-3">Evolução de Vendas</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={data.tendencia}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="data" stroke="#94A3B8" tickFormatter={formatDate} />
              <YAxis stroke="#94A3B8" tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1E293B', border: '1px solid #0F4C5C' }}
                labelStyle={{ color: '#FFF' }}
                formatter={(value: any) => formatCurrency(value)}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="valor_bruto"
                stroke="#0F4C5C"
                strokeWidth={2}
                dot={{ fill: '#0F4C5C' }}
                name="Faturamento Bruto"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-[#1E293B] border border-[#0F4C5C]/20 rounded-xl p-4">
          <h3 className="text-base font-semibold text-white mb-3">Ranking Descontos por Vendedor</h3>
          {data.ranking_descontos && data.ranking_descontos.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data.ranking_descontos} layout="vertical" barSize={24} margin={{ right: 60 }}>
                <defs>
                  <linearGradient id="descontoGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#F59E0B" />
                    <stop offset="100%" stopColor="#EF4444" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#334155" />
                <XAxis
                  type="number"
                  stroke="#64748B"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `R$${(value / 1000).toFixed(0)}k`}
                />
                <YAxis
                  dataKey="vendedor"
                  type="category"
                  stroke="#94A3B8"
                  width={100}
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
                  labelStyle={{ color: '#E2E8F0', marginBottom: '8px' }}
                  formatter={(value: any, name: string | undefined) => {
                    if (name === 'desconto_total') return [formatCurrency(value), 'Desconto'];
                    if (name === 'percentual') return [`${value}%`, '% das Vendas'];
                    return [value, name || ''];
                  }}
                />
                <Bar
                  dataKey="desconto_total"
                  fill="url(#descontoGradient)"
                  radius={[0, 4, 4, 0]}
                  label={(props: any) => {
                    const { x, y, width, height, value } = props;
                    if (value === null || value === undefined) return null;
                    return (
                      <text
                        x={x + width + 5}
                        y={y + height / 2 + 4}
                        fill="#E2E8F0"
                        fontSize={11}
                        fontWeight={500}
                        textAnchor="start"
                      >
                        {formatCurrency(value)}
                      </text>
                    );
                  }}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[250px] text-gray-400">
              Nenhum desconto registrado no período
            </div>
          )}
        </div>

        <div className="bg-[#1E293B] border border-[#0F4C5C]/20 rounded-xl p-4">
          <h3 className="text-base font-semibold text-white mb-3">Ranking Recorrência de Clientes</h3>
          <div className="overflow-x-auto max-h-[250px] overflow-y-auto custom-scrollbar">
            <table className="w-full text-sm text-left text-gray-400">
              <thead className="text-xs text-gray-200 uppercase bg-[#0F172A] sticky top-0">
                <tr>
                  <th className="px-4 py-3 rounded-tl-lg">Cliente</th>
                  <th className="px-4 py-3 text-center">Compras</th>
                  <th className="px-4 py-3 text-right rounded-tr-lg">Valor Total</th>
                </tr>
              </thead>
              <tbody>
                {data.ranking_recorrencia && data.ranking_recorrencia.length > 0 ? (
                  data.ranking_recorrencia.map((item, index) => (
                    <tr key={index} className="border-b border-[#0F4C5C]/10 hover:bg-[#0F4C5C]/5">
                      <td className="px-4 py-3 font-medium text-white">{item.cliente}</td>
                      <td className="px-4 py-3 text-center text-cyan-400">{item.qtd_compras}</td>
                      <td className="px-4 py-3 text-right text-emerald-400">
                        {formatCurrency(item.valor_total)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-gray-500">
                      Nenhum cliente recorrente encontrado
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div >
    </div >
  );
};
