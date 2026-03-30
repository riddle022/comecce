import React from 'react';
import { FluxoCaixaDiario, LinhaRelatorio, ViewMode } from '../../../types/financeiro';
import { Skeleton } from '../Skeleton';
import { ViewModeToggle } from '../ViewModeToggle';
import { DailyDetailRows } from './DailyDetailRows';
import { TableHeader } from './TableHeader';
import { TableRow } from './TableRow';

interface FinanceiroTableProps {
  title: string;
  subtitle: string;
  linhas: LinhaRelatorio[];
  meses: string[];
  mesLabels: Record<string, string>;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onToggle: (idx: number) => void;
  isLoading: boolean;
  error: string | null;
  onDrillDown?: (codigo: string) => void;
  dailyData?: Record<string, FluxoCaixaDiario[]>;
  expandedDaily?: Record<string, boolean>;
}

export const FinanceiroTable: React.FC<FinanceiroTableProps> = ({
  title,
  subtitle,
  linhas,
  meses,
  mesLabels,
  viewMode,
  onViewModeChange,
  onToggle,
  isLoading,
  error,
  onDrillDown,
  dailyData,
  expandedDaily,
}) => {
  const isAnalytic = viewMode === 'analytic';
  const colCount = 1 + meses.length * (isAnalytic ? 2 : 1) + (isAnalytic ? 2 : 1);

  return (
    <div className="bg-slate-900/40 border border-white/5 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-white tracking-tight">{title}</h2>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-0.5">{subtitle}</p>
        </div>
        <ViewModeToggle mode={viewMode} onChange={onViewModeChange} />
      </div>

      {isLoading ? (
        <Skeleton />
      ) : error ? (
        <div className="p-8 text-center text-red-400 text-sm">{error}</div>
      ) : linhas.length === 0 ? (
        <div className="p-8 text-center text-slate-500 text-sm">Nenhum dado encontrado para o período</div>
      ) : (
        <div className="overflow-x-auto relative">
          <table className="w-full text-left border-collapse min-w-[600px]">
            <TableHeader meses={meses} mesLabels={mesLabels} viewMode={viewMode} />
            <tbody className="divide-y divide-slate-800/40">
              {linhas.map((linha, idx) => (
                <React.Fragment key={idx}>
                  <TableRow
                    linha={linha}
                    meses={meses}
                    viewMode={viewMode}
                    onToggle={() => onToggle(idx)}
                  />
                  {linha.expandido && linha.filhos?.map((filho, fidx) => (
                    <TableRow
                      key={`${idx}-${fidx}`}
                      linha={filho}
                      meses={meses}
                      viewMode={viewMode}
                      isFilho
                    />
                  ))}
                  {linha.codigo && expandedDaily?.[linha.codigo] && dailyData && (
                    <DailyDetailRows
                      dailyData={dailyData[linha.codigo] ?? []}
                      isLoading={!dailyData[linha.codigo]}
                      colSpan={colCount}
                      meses={meses}
                      viewMode={viewMode}
                    />
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
