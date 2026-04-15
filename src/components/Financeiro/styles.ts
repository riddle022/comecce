import { LinhaRelatorio } from '../../types/financeiro';

type Tipo = LinhaRelatorio['tipo'];

export function rowBg(tipo: Tipo): string {
  switch (tipo) {
    case 'total':
      return 'bg-gradient-to-r from-[#0F4C5C] to-[#0a3240] border-l-[3px] border-l-cyan-400 font-black text-sm';
    case 'subtotal':
      return 'bg-slate-800/60 border-l-2 border-l-slate-600 font-bold text-[13px] border-t border-t-slate-700/50';
    case 'percentual':
      return 'italic text-xs bg-slate-900/30';
    default:
      return 'hover:bg-slate-800/50 text-[13px]';
  }
}

export function valueColor(tipo: Tipo, value: number): string {
  if (tipo === 'total' || tipo === 'subtotal' || tipo === 'percentual') {
    return value >= 0 ? 'text-emerald-400' : 'text-red-400';
  }
  return 'text-slate-200';
}

export function descColor(tipo: Tipo): string {
  if (tipo === 'total' || tipo === 'subtotal') return 'text-white';
  if (tipo === 'percentual') return 'text-slate-500';
  return 'text-slate-200';
}

export function responsiveFontSize(mesesCount: number): string {
  if (mesesCount > 9) return 'text-[11px]';
  if (mesesCount > 6) return 'text-xs';
  return 'text-[13px]';
}
