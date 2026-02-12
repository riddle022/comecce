import React from 'react';
import { AlertTriangle, DollarSign, TrendingUp, FileText } from 'lucide-react';
import { FilterPanel } from '../Common/FilterPanel';
import { OSKPICards } from './OSKPICards';
import { MetricCard } from './MetricCard';
import { RankingVendedoresCard } from './RankingFuncionariosCard';
import { TopGroupsCard } from './TopGroupsCard';
import { useOperacionalData } from '../../hooks/useOperacionalData';
import { useGlobalFilters } from '../../contexts/GlobalFiltersContext';

export const OperacionalPage: React.FC = () => {
  const { filters: globalFilters, updateFilters } = useGlobalFilters();

  const { data, loading, error } = useOperacionalData({
    dataInicio: globalFilters.dataInicio,
    dataFim: globalFilters.dataFim,
    empresaIds: globalFilters.empresaIds
  });

  const handleDateRangeChange = (newDateRange: { dataInicio: string; dataFim: string }) => {
    updateFilters(newDateRange);
  };

  const handleEmpresasChange = (ids: string[]) => {
    updateFilters({ empresaIds: ids });
  };

  return (
    <div className="space-y-4">
      <div className="relative z-50">
        <FilterPanel
          onDateRangeChange={handleDateRangeChange}
          onEmpresasChange={handleEmpresasChange}
          initialDateRange={{ dataInicio: globalFilters.dataInicio, dataFim: globalFilters.dataFim }}
          initialEmpresas={globalFilters.empresaIds}
        />
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center space-y-4">
            <div className="w-12 h-12 border-4 border-[#0F4C5C] border-t-transparent rounded-full animate-spin"></div>
            <p className="text-gray-400">Carregando dados de ordens de serviço...</p>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <div>
              <p className="text-red-400 font-medium">Erro ao carregar dados</p>
              <p className="text-red-300 text-sm mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {!loading && !error && globalFilters.empresaIds.length === 0 && (
        <div className="bg-[#1E293B] border border-[#0F4C5C]/20 rounded-xl p-8">
          <div className="text-center">
            <p className="text-gray-400">Selecione pelo menos uma empresa para visualizar os indicadores</p>
          </div>
        </div>
      )}

      {!loading && !error && data && (
        <div className="space-y-4">
          <OSKPICards kpis={data} />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MetricCard
              title="Faturamento Líquido OS"
              value={new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL',
                minimumFractionDigits: 2
              }).format(data.faturamento_liquido_os)}
              icon={DollarSign}
              color="green"
            />
            <MetricCard
              title="Ticket Médio por OS"
              value={new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL',
                minimumFractionDigits: 2
              }).format(data.ticket_medio_os)}
              icon={TrendingUp}
              color="orange"
            />
            <MetricCard
              title="Volume Total de OS"
              value={new Intl.NumberFormat('pt-BR').format(data.total_os)}
              icon={FileText}
              color="blue"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <RankingVendedoresCard vendedores={data.ranking_vendedores} />
            <TopGroupsCard grupos={data.ranking_grupos} />
          </div>
        </div>
      )}
    </div>
  );
};
