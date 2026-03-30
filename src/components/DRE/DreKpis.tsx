import { Activity, DollarSign, Target, TrendingUp } from 'lucide-react';
import React from 'react';
import { KpiCard } from '../Financeiro/KpiCard';
import { DreKpi } from './useDreKpis';

const icons = [DollarSign, TrendingUp, Activity, Target];

interface DreKpisProps {
  kpis: DreKpi[];
}

export const DreKpis: React.FC<DreKpisProps> = ({ kpis }) => {
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
