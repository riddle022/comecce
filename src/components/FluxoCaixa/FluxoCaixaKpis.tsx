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

  const colorMap: Record<string, {
    border: string; iconBg: string; iconText: string; iconRing: string;
    gradient: string; bar: string; topBar: string;
  }> = {
    amber: {
      border: 'border-amber-500/20 hover:border-amber-400/40',
      iconBg: 'bg-amber-500/15',
      iconText: 'text-amber-400',
      iconRing: 'ring-amber-500/25',
      gradient: 'from-amber-500/[0.06] to-transparent',
      bar: 'from-amber-400 to-emerald-400',
      topBar: 'from-amber-400/60 via-amber-500/20 to-transparent',
    },
    violet: {
      border: 'border-violet-500/20 hover:border-violet-400/40',
      iconBg: 'bg-violet-500/15',
      iconText: 'text-violet-400',
      iconRing: 'ring-violet-500/25',
      gradient: 'from-violet-500/[0.06] to-transparent',
      bar: 'from-violet-400 to-cyan-400',
      topBar: 'from-violet-400/60 via-violet-500/20 to-transparent',
    },
  };
  const c = colorMap[color] || colorMap.amber;

  return (
    <div className={`relative overflow-hidden rounded-2xl border ${c.border} bg-slate-900/80 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl`}>
      {/* Accent top line */}
      <div className={`absolute top-0 left-0 right-0 h-px bg-gradient-to-r ${c.topBar}`} />
      {/* Background glow */}
      <div className={`absolute inset-0 bg-gradient-to-br ${c.gradient} pointer-events-none`} />

      <div className="relative p-5 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${c.iconBg} ring-1 ${c.iconRing}`}>
              <Icon className={`w-5 h-5 ${c.iconText}`} />
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold leading-none mb-1.5">{title}</p>
              <p className="text-xl font-black text-white tabular-nums leading-none">{fmtBRL(value)}</p>
            </div>
          </div>
          <span className={`shrink-0 px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider ring-1 ${
            acima
              ? 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/25'
              : 'bg-red-500/10 text-red-400 ring-red-500/25'
          }`}>
            {acima ? 'Acima' : 'Abaixo'}
          </span>
        </div>

        {/* Progress bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[9px] font-semibold">
            <span className="text-slate-500 uppercase tracking-wider">{fmtPct(pct)} da Receita</span>
            <span className="text-slate-600 font-medium">MC: {fmtPct(mcPct)}</span>
          </div>
          <div className="h-1.5 w-full bg-slate-800/80 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-700 rounded-full bg-gradient-to-r ${acima ? c.bar : 'from-red-500 to-red-400'}`}
              style={{ width: `${barWidth}%` }}
            />
          </div>
        </div>

        {/* Breakdown */}
        {labels.length > 0 && (
          <div className="pt-3 border-t border-white/5 grid grid-cols-2 gap-x-6 gap-y-2">
            {labels.map(item => (
              <div key={item.label} className="flex items-center justify-between gap-2">
                <span className="text-[9px] text-slate-500 font-medium uppercase tracking-wide">{item.label}</span>
                <span className="text-[10px] text-slate-300 font-bold tabular-nums font-mono">{fmtBRL(item.value)}</span>
              </div>
            ))}
          </div>
        )}
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

