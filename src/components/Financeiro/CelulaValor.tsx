import React from 'react';
import { LinhaRelatorio } from '../../types/financeiro';
import { fmtPct } from './formatters';
import { valueColor } from './styles';

interface CelulaValorProps {
  linha: LinhaRelatorio;
  value: number;
  isPct?: boolean;
  fontSize?: string;
}

export const CelulaValor: React.FC<CelulaValorProps> = ({ linha, value, isPct, fontSize = 'text-[13px]' }) => {
  // 1. Coluna %AV e Linha Percentual -> Mostra um traço
  if (isPct && linha.tipo === 'percentual') {
    return <td className="px-3 py-2 text-center text-[10px] text-slate-600 min-w-[70px]">—</td>;
  }

  // 2. Coluna %AV e Linha Normal -> Mostra porcentagem centralizada
  if (isPct) {
    return (
      <td className={`px-3 py-2 text-center tabular-nums font-mono min-w-[70px] ${fontSize} ${valueColor(linha.tipo, value)}`}>
        {fmtPct(value)}
      </td>
    );
  }

  // 3. Coluna VALOR e Linha Percentual -> Mostra porcentagem alinhada à DIREITA para casar perfeito com os numéricos
  if (linha.tipo === 'percentual') {
    return (
      <td className={`px-3 py-2 text-right tabular-nums font-mono min-w-[110px] ${fontSize} ${valueColor(linha.tipo, value)}`}>
        {fmtPct(value)}
      </td>
    );
  }

  const isNegative = value < 0;
  const absValStr = Intl.NumberFormat('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.abs(value));

  return (
    <td className={`px-3 py-2 tabular-nums font-mono min-w-[110px] ${fontSize} ${valueColor(linha.tipo, value)}`}>
      <div className="flex justify-between items-center w-full gap-2">
        <span className="text-[10px] text-slate-500/70 font-sans tracking-wide shrink-0">
          {isNegative ? '-R$' : 'R$'}
        </span>
        <span className="text-right truncate">{absValStr}</span>
      </div>
    </td>
  );
};
