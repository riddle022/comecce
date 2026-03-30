import React from 'react';
import { LinhaRelatorio } from '../../types/financeiro';
import { fmtBRL, fmtPct } from './formatters';
import { valueColor } from './styles';

interface CelulaValorProps {
  linha: LinhaRelatorio;
  value: number;
  isPct?: boolean;
  fontSize?: string;
}

export const CelulaValor: React.FC<CelulaValorProps> = ({ linha, value, isPct, fontSize = 'text-[13px]' }) => {
  if (isPct && linha.tipo === 'percentual') {
    return <td className="px-3 py-2 text-right text-[10px] text-slate-600">—</td>;
  }

  const display = linha.tipo === 'percentual'
    ? fmtPct(value)
    : isPct
      ? fmtPct(value)
      : fmtBRL(value);

  return (
    <td className={`px-3 py-2 text-right tabular-nums font-mono min-w-[90px] ${fontSize} ${valueColor(linha.tipo, value)}`}>
      {display}
    </td>
  );
};
