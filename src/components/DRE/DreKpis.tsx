import { Activity, Crosshair, DollarSign, Target, TrendingUp } from 'lucide-react';
import React from 'react';
import { KpiCard } from '../Financeiro/KpiCard';
import { DreKpi } from './useDreKpis';

const icons = [DollarSign, TrendingUp, Activity, Target, Crosshair];

interface DreKpisProps {
  kpis: DreKpi[];
}

export const DreKpis: React.FC<DreKpisProps> = ({ kpis }) => {
  if (kpis.length === 0) return null;

  const mainKpis = kpis.slice(0, 4);
  const peKpi = kpis.length > 4 ? kpis[4] : null;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {mainKpis.map((kpi, i) => (
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

      {peKpi && (
        <div className={`relative overflow-hidden rounded-xl border transition-all ${
          peKpi.variant === 'positive'
            ? 'border-amber-500/20 bg-gradient-to-r from-amber-500/5 via-[#1E293B] to-[#1E293B]'
            : 'border-red-500/20 bg-gradient-to-r from-red-500/5 via-[#1E293B] to-[#1E293B]'
        }`}>
          <div className="flex items-center justify-between px-5 py-4">
            <div className="flex items-center gap-4">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                peKpi.variant === 'positive' ? 'bg-amber-500/10' : 'bg-red-500/10'
              }`}>
                <Crosshair className={`w-5 h-5 ${
                  peKpi.variant === 'positive' ? 'text-amber-400' : 'text-red-400'
                }`} />
              </div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium mb-0.5">
                  Ponto de Equilíbrio
                </p>
                <p className="text-xl font-bold text-white tabular-nums">{peKpi.value}</p>
              </div>
            </div>

            <div className="flex items-center gap-6">
              {peKpi.subtitle && (
                <div className="text-right">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium mb-0.5">
                    % da Receita
                  </p>
                  <p className={`text-sm font-bold ${
                    peKpi.variant === 'positive' ? 'text-amber-400' : 'text-red-400'
                  }`}>
                    {peKpi.subtitle}
                  </p>
                </div>
              )}

              <div className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                peKpi.variant === 'positive'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-red-500/10 text-red-400 border border-red-500/20'
              }`}>
                {peKpi.variant === 'positive' ? 'Acima do Equilíbrio' : 'Abaixo do Equilíbrio'}
              </div>
            </div>
          </div>

          {/* Barra de progresso visual */}
          <div className="h-1 w-full bg-slate-800">
            <div
              className={`h-full transition-all duration-700 rounded-r ${
                peKpi.variant === 'positive'
                  ? 'bg-gradient-to-r from-amber-500 to-emerald-500'
                  : 'bg-gradient-to-r from-red-500 to-red-400'
              }`}
              style={{
                width: peKpi.subtitle
                  ? `${Math.min(parseFloat(peKpi.subtitle) || 0, 100)}%`
                  : '0%'
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

