import { ArrowDownCircle, ArrowUpCircle, Crosshair, Target, TrendingUp, Wallet } from 'lucide-react';
import React from 'react';
import { fmtBRL, fmtPct } from '../Financeiro/formatters';
import { KpiCard } from '../Financeiro/KpiCard';
import { FluxoCaixaKpi, PontoEquilibrioData } from './useFluxoCaixaKpis';

const icons = [ArrowUpCircle, ArrowDownCircle, Wallet, TrendingUp];

interface FluxoCaixaKpisProps {
  kpis: FluxoCaixaKpi[];
  pontoEquilibrio: PontoEquilibrioData | null;
}

const PeCard: React.FC<{
  title: string;
  value: number;
  pct: number;
  receita: number;
  icon: React.FC<{ className?: string }>;
  color: string;
  labels: { label: string; value: number }[];
  mcPct: number;
}> = ({ title, value, pct, receita, icon: Icon, color, labels, mcPct }) => {
  const acima = receita > 0 && value <= receita;
  const barWidth = Math.min(pct, 100);

  const colorMap: Record<string, { border: string; iconBg: string; iconText: string; gradient: string; bar: string; badge: string }> = {
    amber: {
      border: 'border-amber-500/20',
      iconBg: 'bg-amber-500/10',
      iconText: 'text-amber-400',
      gradient: 'from-amber-500/5 via-[#1E293B] to-[#1E293B]',
      bar: 'from-amber-500 to-emerald-500',
      badge: 'text-amber-400',
    },
    violet: {
      border: 'border-violet-500/20',
      iconBg: 'bg-violet-500/10',
      iconText: 'text-violet-400',
      gradient: 'from-violet-500/5 via-[#1E293B] to-[#1E293B]',
      bar: 'from-violet-500 to-cyan-500',
      badge: 'text-violet-400',
    },
  };
  const c = colorMap[color] || colorMap.amber;

  return (
    <div className={`relative overflow-hidden rounded-xl border transition-all ${c.border} bg-gradient-to-r ${c.gradient}`}>
      <div className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${c.iconBg}`}>
              <Icon className={`w-4.5 h-4.5 ${c.iconText}`} />
            </div>
            <div>
              <p className="text-[9px] text-slate-500 uppercase tracking-wider font-bold">{title}</p>
              <p className="text-lg font-bold text-white tabular-nums">{fmtBRL(value)}</p>
            </div>
          </div>
          <div className={`px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider ${
            acima
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              : 'bg-red-500/10 text-red-400 border border-red-500/20'
          }`}>
            {acima ? 'Acima' : 'Abaixo'}
          </div>
        </div>

        {/* Barra de progresso */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[9px] font-bold">
            <span className="text-slate-500 uppercase tracking-wider">{fmtPct(pct)} da Receita</span>
            <span className="text-slate-600">MC: {fmtPct(mcPct)}</span>
          </div>
          <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-700 rounded-full bg-gradient-to-r ${acima ? c.bar : 'from-red-500 to-red-400'}`}
              style={{ width: `${barWidth}%` }}
            />
          </div>
        </div>

        {/* Breakdown */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 pt-1 border-t border-white/5">
          {labels.map(item => (
            <div key={item.label} className="flex items-center justify-between">
              <span className="text-[9px] text-slate-500 font-medium">{item.label}</span>
              <span className="text-[10px] text-slate-400 font-bold tabular-nums">{fmtBRL(item.value)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export const FluxoCaixaKpis: React.FC<FluxoCaixaKpisProps> = ({ kpis, pontoEquilibrio }) => {
  if (kpis.length === 0) return null;

  return (
    <div className="space-y-3">
      {/* KPIs principais */}
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

      {/* Ponto de Equilíbrio 1 e 2 */}
      {pontoEquilibrio && pontoEquilibrio.pe1 > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <PeCard
            title="Ponto de Equilíbrio 1"
            value={pontoEquilibrio.pe1}
            pct={pontoEquilibrio.pe1Pct}
            receita={pontoEquilibrio.receitaTotal}
            icon={Crosshair}
            color="amber"
            mcPct={pontoEquilibrio.mcPct}
            labels={[
              { label: 'Custos Fixos', value: pontoEquilibrio.custosFixos },
            ]}
          />
          <PeCard
            title="Ponto de Equilíbrio 2"
            value={pontoEquilibrio.pe2}
            pct={pontoEquilibrio.pe2Pct}
            receita={pontoEquilibrio.receitaTotal}
            icon={Target}
            color="violet"
            mcPct={pontoEquilibrio.mcPct}
            labels={[
              { label: 'Custos Fixos', value: pontoEquilibrio.custosFixos },
              { label: 'Investimentos', value: pontoEquilibrio.investimentos },
              { label: 'Financiamentos', value: pontoEquilibrio.financiamentos },
              { label: 'Retiradas Sócios', value: pontoEquilibrio.retiradas },
            ]}
          />
        </div>
      )}
    </div>
  );
};

