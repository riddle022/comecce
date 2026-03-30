import { LinhaRelatorio } from '../../types/financeiro';

type Tipo = LinhaRelatorio['tipo'];

export function rowBg(tipo: Tipo): string {
  switch (tipo) {
    case 'total':
      return 'bg-[#0F4C5C] border-l-4 border-l-emerald-400 font-black text-base';
    case 'subtotal':
      return 'bg-[#0F4C5C]/30 border-l-2 border-l-[#0F4C5C] font-bold text-sm border-t border-t-slate-700/60';
    case 'percentual':
      return 'italic text-xs';
    default:
      return 'hover:bg-slate-800/30 text-[13px]';
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
