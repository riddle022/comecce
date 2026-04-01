const brlFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const fmtBRL = (n: number): string => brlFormatter.format(n);

export const fmtPct = (n: number): string => `${n.toFixed(1)}%`;

export const fmtCompact = (n: number): string => {
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(2).replace('.', ',')}M`;
  if (abs >= 1_000) return `${sign}${(abs / 1_000).toFixed(2).replace('.', ',')}k`;
  return `${sign}${abs.toFixed(2).replace('.', ',')}`;
};

const MONTH_MAP: Record<string, string> = {
  JAN: 'JAN',
  FEB: 'FEV',
  MAR: 'MAR',
  APR: 'ABR',
  MAY: 'MAI',
  JUN: 'JUN',
  JUL: 'JUL',
  AUG: 'AGO',
  SEP: 'SET',
  OCT: 'OUT',
  NOV: 'NOV',
  DEC: 'DEZ',
};

export const translateMonth = (label: string): string => {
  if (!label) return label;
  const parts = label.split('/');
  if (parts.length === 2) {
    const [month, year] = parts;
    const upperMonth = month.toUpperCase();
    if (MONTH_MAP[upperMonth]) {
      return `${MONTH_MAP[upperMonth]}/${year}`;
    }
  }
  return label;
};
