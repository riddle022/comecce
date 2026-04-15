import { TrendingDown, TrendingUp } from 'lucide-react';
import React from 'react';

interface KpiCardProps {
  title: string;
  value: string;
  subtitle?: string;
  trend?: number;
  icon: React.FC<{ className?: string }>;
  variant: 'positive' | 'negative' | 'neutral';
}

const variantConfig = {
  positive: {
    iconBg: 'bg-emerald-500/15',
    iconText: 'text-emerald-400',
    iconRing: 'ring-emerald-500/25',
    border: 'border-emerald-500/20 hover:border-emerald-400/50',
    topBar: 'from-emerald-400/60 via-emerald-500/30 to-transparent',
    bgGlow: 'from-emerald-500/[0.07] to-transparent',
    valueColor: 'text-emerald-300',
  },
  negative: {
    iconBg: 'bg-red-500/15',
    iconText: 'text-red-400',
    iconRing: 'ring-red-500/25',
    border: 'border-red-500/20 hover:border-red-400/50',
    topBar: 'from-red-400/60 via-red-500/30 to-transparent',
    bgGlow: 'from-red-500/[0.07] to-transparent',
    valueColor: 'text-red-300',
  },
  neutral: {
    iconBg: 'bg-cyan-500/15',
    iconText: 'text-cyan-400',
    iconRing: 'ring-cyan-500/25',
    border: 'border-cyan-500/20 hover:border-cyan-400/50',
    topBar: 'from-cyan-400/60 via-cyan-500/30 to-transparent',
    bgGlow: 'from-cyan-500/[0.07] to-transparent',
    valueColor: 'text-white',
  },
};

export const KpiCard: React.FC<KpiCardProps> = ({ title, value, subtitle, trend, icon: Icon, variant }) => {
  const c = variantConfig[variant];

  return (
    <div className={`relative overflow-hidden bg-slate-900/80 border ${c.border} rounded-2xl p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-2xl`}>
      {/* Accent line top */}
      <div className={`absolute top-0 left-0 right-0 h-px bg-gradient-to-r ${c.topBar}`} />
      {/* Background glow */}
      <div className={`absolute inset-0 bg-gradient-to-br ${c.bgGlow} pointer-events-none`} />

      <div className="relative flex flex-col gap-3">
        <div className="flex items-start justify-between">
          <div className={`w-10 h-10 rounded-xl ${c.iconBg} ring-1 ${c.iconRing} flex items-center justify-center`}>
            <Icon className={`w-5 h-5 ${c.iconText}`} />
          </div>
          {trend !== undefined && trend !== 0 && (
            <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ring-1 ${
              trend > 0
                ? 'text-emerald-400 bg-emerald-500/10 ring-emerald-500/20'
                : 'text-red-400 bg-red-500/10 ring-red-500/20'
            }`}>
              {trend > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {Math.abs(trend).toFixed(1)}%
            </span>
          )}
        </div>

        <div>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mb-1.5 leading-none">{title}</p>
          <p className={`text-xl font-black tabular-nums tracking-tight leading-none ${c.valueColor}`}>{value}</p>
          {subtitle && (
            <p className="text-[11px] text-slate-500 mt-2 font-medium leading-snug">{subtitle}</p>
          )}
        </div>
      </div>
    </div>
  );
};
