import React from 'react';
import { ViewMode } from '../../../types/financeiro';

interface TableHeaderProps {
  meses: string[];
  mesLabels: Record<string, string>;
  viewMode: ViewMode;
}

export const TableHeader: React.FC<TableHeaderProps> = ({ meses, mesLabels, viewMode }) => {
  const isAnalytic = viewMode === 'analytic';

  return (
    <thead>
      {isAnalytic && (
        <tr className="bg-slate-800/80">
          <th className="sticky left-0 z-30 bg-slate-800/80 px-3 py-1.5" />
          {meses.map(mes => (
            <th
              key={mes}
              colSpan={2}
              className="px-3 py-1.5 text-center text-[10px] font-semibold text-slate-300 uppercase tracking-wider border-b border-slate-700/40"
            >
              {mesLabels[mes] ?? mes}
            </th>
          ))}
          <th colSpan={2} className="px-3 py-1.5 text-center text-[10px] font-semibold text-slate-300 uppercase tracking-wider border-b border-slate-700/40">
            Total
          </th>
        </tr>
      )}
      <tr className="bg-slate-800/60 text-slate-400 text-[10px] uppercase tracking-widest">
        <th className="sticky left-0 z-30 bg-slate-800/60 px-3 py-2 font-semibold whitespace-nowrap min-w-[220px] text-left">
          Descrição
        </th>
        {meses.map(mes => (
          <React.Fragment key={mes}>
            <th className="px-3 py-2 text-right font-semibold whitespace-nowrap">
              {isAnalytic ? 'Valor' : (mesLabels[mes] ?? mes)}
            </th>
            {isAnalytic && (
              <th className="px-3 py-2 text-right font-semibold text-slate-600 whitespace-nowrap">%AV</th>
            )}
          </React.Fragment>
        ))}
        <th className="px-3 py-2 text-right font-semibold whitespace-nowrap">
          {isAnalytic ? 'Valor' : 'Total'}
        </th>
        {isAnalytic && (
          <th className="px-3 py-2 text-right font-semibold text-slate-600 whitespace-nowrap">%AV</th>
        )}
      </tr>
    </thead>
  );
};
