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

  // Saídas são armazenadas como positivas mas representam deduções
  const isDeduction = (linha.tipo === 'saida' && value > 0) || value < 0;
  const absValStr = Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(value));
  const color = valueColor(linha.tipo, value);

  return (
    <td className={`px-3 py-2.5 tabular-nums min-w-[120px] ${fontSize} ${color}`}>
      <div className="flex items-baseline justify-between gap-2 w-full">
        <span className="text-[9px] font-semibold text-slate-600 shrink-0 select-none tracking-wide">
          R$
        </span>
        <span className="font-mono tabular-nums text-right">
          {isDeduction ? `(${absValStr})` : absValStr}
        </span>
      </div>
    </td>
  );
};
