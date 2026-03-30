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

const variantColors = {
  positive: {
    iconBg: 'bg-emerald-500/10',
    iconText: 'text-emerald-400',
    border: 'border-emerald-500/20',
  },
  negative: {
    iconBg: 'bg-red-500/10',
    iconText: 'text-red-400',
    border: 'border-red-500/20',
  },
  neutral: {
    iconBg: 'bg-cyan-500/10',
    iconText: 'text-cyan-400',
    border: 'border-[#0F4C5C]/30',
  },
};

export const KpiCard: React.FC<KpiCardProps> = ({ title, value, subtitle, trend, icon: Icon, variant }) => {
  const colors = variantColors[variant];

  return (
    <div className={`bg-[#1E293B] border ${colors.border} rounded-xl p-4 hover:border-[#0F4C5C]/40 transition-all`}>
      <div className="flex items-start justify-between mb-2">
        <div className={`w-9 h-9 rounded-lg ${colors.iconBg} flex items-center justify-center`}>
          <Icon className={`w-4.5 h-4.5 ${colors.iconText}`} />
        </div>
        {trend !== undefined && trend !== 0 && (
          <div className={`flex items-center gap-1 text-[11px] ${trend > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {trend > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            <span>{Math.abs(trend).toFixed(1)}%</span>
          </div>
        )}
      </div>
      <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium mb-1">{title}</p>
      <p className="text-lg font-bold text-white tabular-nums">{value}</p>
      {subtitle && <p className="text-[11px] text-slate-400 mt-0.5">{subtitle}</p>}
    </div>
  );
};
