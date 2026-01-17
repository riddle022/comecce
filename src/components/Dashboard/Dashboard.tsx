import React from 'react';
import { DollarSign, TrendingUp, ShoppingCart, PercentSquare, ShoppingBag, FileCheck, Truck, Trophy, Package, Layers } from 'lucide-react';
import { StatCard } from './StatCard';
import { FilterPanel } from '../Common/FilterPanel';
import { FaturamentoChart } from './FaturamentoChart';
import { RankingCard } from './RankingCard';
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

  const { kpis, tendencia, top_vendedores, top_produtos, top_grupos, resumo_os } = data;

  return (
    <div className="space-y-4">
      <FilterPanel
        onDateRangeChange={handleDateRangeChange}
        onEmpresasChange={handleEmpresasChange}
        initialDateRange={{ dataInicio: filters.dataInicio, dataFim: filters.dataFim }}
        initialEmpresas={filters.empresaIds}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
        <StatCard
          title="OS Não Entregues"
          value={resumo_os?.os_nao_entregues || 0}
          icon={FileCheck}
          color="blue"
        />
        <StatCard
          title="OS Entregues"
          value={resumo_os?.os_entregues || 0}
          icon={Truck}
          color="green"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <FaturamentoChart data={tendencia || []} />

        {/* Rankings Grid */}
        <div className="grid grid-cols-1 gap-4">
          <RankingCard
            title="Top Vendedores"
            icon={Trophy}
            items={(top_vendedores || []).map(v => ({
              label: v.vendedor,
              value: v.valor,
              subValue: v.vendas,
              subLabel: 'vendas'
            }))}
          />
        </div>
      </div>

      {/* Product and Group Rankings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RankingCard
          title="Top Produtos"
          icon={Package}
          items={(top_produtos || []).map(p => ({
            label: p.produto,
            value: p.valor,
            subValue: p.quantidade,
            subLabel: 'itens'
          }))}
        />
        <RankingCard
          title="Top Grupos"
          icon={Layers}
          items={(top_grupos || []).map(g => ({
            label: g.grupo,
            value: g.valor,
            subValue: g.quantidade,
            subLabel: 'itens'
          }))}
        />
      </div>
    </div>
  );
};
