import { ChevronDown, ChevronRight } from 'lucide-react';
import React from 'react';
import { LinhaRelatorio, ViewMode } from '../../../types/financeiro';
import { CelulaValor } from '../CelulaValor';
import { descColor, rowBg, responsiveFontSize } from '../styles';

interface TableRowProps {
  linha: LinhaRelatorio;
  meses: string[];
  viewMode: ViewMode;
  isFilho?: boolean;
  onToggle?: () => void;
}

export const TableRow: React.FC<TableRowProps> = ({ linha, meses, viewMode, isFilho = false, onToggle }) => {
  const temFilhos = (linha.filhos?.length ?? 0) > 0;
  const isAnalytic = viewMode === 'analytic';
  const fontSize = responsiveFontSize(meses.length);

  if (!isAnalytic && linha.tipo === 'percentual') return null;

  return (
    <tr className={`transition-colors ${rowBg(linha.tipo)}`}>
      <td
        className={`sticky left-0 z-10 px-4 py-2.5 whitespace-nowrap ${
          linha.tipo === 'total'
            ? 'bg-[#0a3240]'
            : linha.tipo === 'subtotal'
              ? 'bg-slate-800/80'
              : 'bg-[#0c1525]'
        } ${isFilho ? 'pl-10' : ''} ${descColor(linha.tipo)} ${fontSize}`}
      >
        <div className="flex items-center gap-1.5">
          {temFilhos && onToggle && (
            <button
              onClick={onToggle}
              className="w-5 h-5 flex items-center justify-center rounded text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors flex-shrink-0"
            >
              {linha.expandido ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </button>
          )}
          {!temFilhos && !isFilho && <span className="w-5 flex-shrink-0" />}
          <span>{linha.descricao}</span>
        </div>
      </td>

      {meses.map(mes => (
        <React.Fragment key={mes}>
          <CelulaValor linha={linha} value={linha.valor_mensal[mes] ?? 0} fontSize={fontSize} />
          {isAnalytic && (
            <CelulaValor linha={linha} value={linha.av_mensal[mes] ?? 0} isPct fontSize={fontSize} />
          )}
        </React.Fragment>
      ))}

      <CelulaValor linha={linha} value={linha.valor_total} fontSize={fontSize} />
      {isAnalytic && (
        <CelulaValor linha={linha} value={linha.av_total} isPct fontSize={fontSize} />
      )}
    </tr>
  );
};
