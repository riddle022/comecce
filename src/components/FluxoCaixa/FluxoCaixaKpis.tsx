import { ArrowDownCircle, ArrowUpCircle, TrendingUp, Wallet } from 'lucide-react';
import React from 'react';
import { KpiCard } from '../Financeiro/KpiCard';
import { FluxoCaixaKpi } from './useFluxoCaixaKpis';

const icons = [ArrowUpCircle, ArrowDownCircle, Wallet, TrendingUp];

interface FluxoCaixaKpisProps {
  kpis: FluxoCaixaKpi[];
}

export const FluxoCaixaKpis: React.FC<FluxoCaixaKpisProps> = ({ kpis }) => {
  if (kpis.length === 0) return null;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {kpis.map((kpi, i) => (
        <KpiCard
          key={kpi.title}
          title={kpi.title}
          value={kpi.value}
          subtitle={kpi.subtitle}
          trend={kpi.trend}
          icon={icons[i]}
          variant={kpi.variant}
        />
      ))}
    </div>
  );
};
