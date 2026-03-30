import { Loader2 } from 'lucide-react';
import React from 'react';
import { FluxoCaixaDiario, ViewMode } from '../../../types/financeiro';
import { fmtBRL } from '../formatters';

interface DailyDetailRowsProps {
  dailyData: FluxoCaixaDiario[];
  isLoading: boolean;
  colSpan: number;
  meses: string[];
  viewMode: ViewMode;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export const DailyDetailRows: React.FC<DailyDetailRowsProps> = ({ dailyData, isLoading, colSpan }) => {
  if (isLoading) {
    return (
      <tr>
        <td colSpan={colSpan} className="px-3 py-3 text-center">
          <Loader2 className="w-4 h-4 animate-spin text-slate-400 mx-auto" />
        </td>
      </tr>
    );
  }

  if (dailyData.length === 0) {
    return (
      <tr>
        <td colSpan={colSpan} className="px-3 py-2 text-center text-[11px] text-slate-600 italic">
          Sem movimentações detalhadas
        </td>
      </tr>
    );
  }

  return (
    <>
      {dailyData.map((item, i) => (
        <tr key={i} className="bg-slate-800/20">
          <td className="sticky left-0 z-10 bg-slate-800/20 px-3 py-1.5 pl-12 text-[11px] text-slate-400 whitespace-nowrap">
            <span className="text-slate-500 mr-2">{formatDate(item.data)}</span>
            {item.subcategoria ?? item.grupo}
          </td>
          <td className="px-3 py-1.5 text-right text-[11px] tabular-nums font-mono text-slate-300">
            {fmtBRL(item.total)}
          </td>
          <td colSpan={colSpan - 2} />
        </tr>
      ))}
    </>
  );
};
