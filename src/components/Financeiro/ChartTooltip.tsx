import React from 'react';

interface ChartTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
  formatter: (v: number) => string;
}

export const ChartTooltip: React.FC<ChartTooltipProps> = ({ active, payload, label, formatter }) => {
  if (!active || !payload?.length) return null;

  return (
    <div className="bg-[#1E293B] border border-[#0F4C5C] rounded-lg shadow-lg shadow-black/20 p-3">
      <p className="text-[11px] text-slate-400 mb-1.5 font-medium">{label}</p>
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2 text-[12px]">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
          <span className="text-slate-400">{entry.name}:</span>
          <span className="text-white font-medium tabular-nums">{formatter(entry.value)}</span>
        </div>
      ))}
    </div>
  );
};
