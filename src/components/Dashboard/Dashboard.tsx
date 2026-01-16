import React from 'react';
import { DollarSign, TrendingUp, ShoppingCart, PercentSquare, ShoppingBag, FileCheck, Truck } from 'lucide-react';
import { StatCard } from './StatCard';
import { FilterPanel } from '../Common/FilterPanel';
import { FaturamentoChart } from './FaturamentoChart';
import { TopVendedoresCard } from './TopVendedoresCard';
import { FormasPagamentoChart } from './FormasPagamentoChart';
import { useDashboardData } from '../../hooks/useDashboardData';
import { useGlobalFilters } from '../../contexts/GlobalFiltersContext';

export const Dashboard: React.FC = () => {
  const { filters, updateFilters } = useGlobalFilters();

  const { data, loading, error } = useDashboardData({
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
      currency: 'BRL',
    }).format(value);
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
        <div className="flex items-center justify-center h-48">
          <div className="text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#0F4C5C] mx-auto mb-3"></div>
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
        <div className="bg-red-900/20 border border-red-500/50 rounded-xl p-4">
          <p className="text-red-400 text-sm">Erro ao carregar dados: {error}</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-4">
        <FilterPanel
          onDateRangeChange={handleDateRangeChange}
          onEmpresasChange={handleEmpresasChange}
          initialDateRange={{ dataInicio: filters.dataInicio, dataFim: filters.dataFim }}
          initialEmpresas={filters.empresaIds}
        />
        <div className="bg-[#1E293B] border border-[#0F4C5C]/20 rounded-xl p-4">
          <p className="text-gray-400 text-center text-sm">Selecione um período e empresas para visualizar os dados</p>
        </div>
      </div>
    );
  }

  const { kpis, tendencia, top_vendedores, formas_pagamento, resumo_os } = data;

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
          value={formatCurrency(kpis.faturamento_bruto)}
          icon={DollarSign}
          color="cyan"
        />
        <StatCard
          title="Faturamento Líquido"
          value={formatCurrency(kpis.faturamento_liquido)}
          icon={TrendingUp}
          color="green"
        />
        <StatCard
          title="Nº de Vendas"
          value={kpis.total_vendas.toString()}
          icon={ShoppingCart}
          color="blue"
        />
        <StatCard
          title="Ticket Médio"
          value={formatCurrency(kpis.ticket_medio)}
          icon={TrendingUp}
          color="orange"
        />
        <StatCard
          title="Desconto Total"
          value={formatCurrency(kpis.desconto_total)}
          icon={PercentSquare}
          color="red"
        />
        <StatCard
          title="Itens Vendidos"
          value={kpis.itens_vendidos.toString()}
          icon={ShoppingBag}
          color="purple"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <FaturamentoChart data={tendencia || []} />
        <TopVendedoresCard vendedores={top_vendedores || []} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <FormasPagamentoChart data={formas_pagamento || []} />

        <div className="bg-[#1E293B] border border-[#0F4C5C]/20 rounded-xl p-4">
          <h3 className="text-base font-semibold text-white mb-3">Resumo de Ordens de Serviço</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-[#0F172A] rounded-lg">
              <div className="flex items-center space-x-2">
                <FileCheck className="w-4 h-4 text-blue-400" />
                <span className="text-gray-300 text-sm">OS Não Entregues</span>
              </div>
              <span className="text-xl font-bold text-white">{resumo_os?.os_nao_entregues || 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-[#0F172A] rounded-lg">
              <div className="flex items-center space-x-2">
                <Truck className="w-4 h-4 text-green-400" />
                <span className="text-gray-300 text-sm">OS Entregues</span>
              </div>
              <span className="text-xl font-bold text-white">{resumo_os?.os_entregues || 0}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
