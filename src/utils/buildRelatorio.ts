import { FluxoCaixaMensal, LinhaRelatorio } from '../types/financeiro';

function soma(dados: FluxoCaixaMensal[], codigos: string[], mes: string): number {
  return dados
    .filter(d => codigos.includes(d.codigo) && d.ano_mes === mes)
    .reduce((acc, d) => acc + d.total, 0);
}

function totalRecord(mensal: Record<string, number>): number {
  return Object.values(mensal).reduce((a, b) => a + b, 0);
}

function calcAV(
  mensal: Record<string, number>,
  rbMensal: Record<string, number>,
  valorTotal: number,
  rbTotal: number
): { av_mensal: Record<string, number>; av_total: number } {
  const av_mensal: Record<string, number> = {};
  for (const mes of Object.keys(mensal)) {
    const rb = rbMensal[mes] ?? 0;
    av_mensal[mes] = rb !== 0 ? (mensal[mes] / rb) * 100 : 0;
  }
  return { av_mensal, av_total: rbTotal !== 0 ? (valorTotal / rbTotal) * 100 : 0 };
}

function buildMensal(
  dados: FluxoCaixaMensal[],
  meses: string[],
  codigos: string[],
  negativos?: string[]
): Record<string, number> {
  const mensal: Record<string, number> = {};
  for (const mes of meses) {
    let v = soma(dados, codigos, mes);
    if (negativos) v -= soma(dados, negativos, mes);
    mensal[mes] = v;
  }
  return mensal;
}

function subtrair(
  base: Record<string, number>,
  ...deducoes: Record<string, number>[]
): Record<string, number> {
  const result = { ...base };
  for (const ded of deducoes) {
    for (const mes of Object.keys(result)) {
      result[mes] = (result[mes] ?? 0) - (ded[mes] ?? 0);
    }
  }
  return result;
}

function somar(
  base: Record<string, number>,
  ...adicoes: Record<string, number>[]
): Record<string, number> {
  const result = { ...base };
  for (const add of adicoes) {
    for (const mes of Object.keys(result)) {
      result[mes] = (result[mes] ?? 0) + (add[mes] ?? 0);
    }
  }
  return result;
}

function pctMensal(
  num: Record<string, number>,
  den: Record<string, number>
): Record<string, number> {
  const result: Record<string, number> = {};
  for (const mes of Object.keys(num)) {
    const d = den[mes] ?? 0;
    result[mes] = d !== 0 ? (num[mes] / d) * 100 : 0;
  }
  return result;
}

function makeLinha(
  codigo: string | null,
  descricao: string,
  tipo: LinhaRelatorio['tipo'],
  nivel: LinhaRelatorio['nivel'],
  mensal: Record<string, number>,
  rbMensal: Record<string, number>,
  rbTotal: number,
  filhos?: LinhaRelatorio[]
): LinhaRelatorio {
  const valorTotal = totalRecord(mensal);
  const { av_mensal, av_total } = calcAV(mensal, rbMensal, valorTotal, rbTotal);
  return { codigo, descricao, tipo, nivel, valor_mensal: mensal, valor_total: valorTotal, av_mensal, av_total, expandido: false, filhos };
}

function makePct(descricao: string, mensal: Record<string, number>): LinhaRelatorio {
  return { codigo: null, descricao, tipo: 'percentual', nivel: 'pai', valor_mensal: mensal, valor_total: totalRecord(mensal), av_mensal: {}, av_total: 0, expandido: false };
}

export function buildRelatorio(dados: FluxoCaixaMensal[]): { linhas: LinhaRelatorio[]; meses: string[] } {
  const meses = [...new Set(dados.map(d => d.ano_mes))].sort();

  const rbMensal  = buildMensal(dados, meses, ['1001']);
  const rbTotal   = totalRecord(rbMensal);

  const mk = (
    codigo: string | null,
    descricao: string,
    tipo: LinhaRelatorio['tipo'],
    nivel: LinhaRelatorio['nivel'],
    mensal: Record<string, number>,
    filhos?: LinhaRelatorio[]
  ) => makeLinha(codigo, descricao, tipo, nivel, mensal, rbMensal, rbTotal, filhos);

  const impMensal = buildMensal(dados, meses, ['2001']);
  const rlMensal  = subtrair(rbMensal, impMensal);
  const cmvMensal = buildMensal(dados, meses, ['2002']);
  const dvMensal  = buildMensal(dados, meses, ['2003']);
  const mcMensal  = subtrair(rlMensal, cmvMensal, dvMensal);

  const pessoalMensal = buildMensal(dados, meses, ['2006']);
  const ocupMensal    = buildMensal(dados, meses, ['2005']);
  const mktMensal     = buildMensal(dados, meses, ['2004']);
  const outrosMensal  = buildMensal(dados, meses, ['2008', '2009'], ['1004']);

  const cfMensal: Record<string, number> = {};
  for (const mes of meses) {
    cfMensal[mes] = (pessoalMensal[mes] ?? 0) + (ocupMensal[mes] ?? 0) + (mktMensal[mes] ?? 0) + (outrosMensal[mes] ?? 0);
  }

  const filhosCF: LinhaRelatorio[] = [
    mk('2006', 'Pessoal',   'saida', 'filho', pessoalMensal),
    mk('2005', 'Ocupação',  'saida', 'filho', ocupMensal),
    mk('2004', 'Marketing', 'saida', 'filho', mktMensal),
    mk(null,   'Outros',    'saida', 'filho', outrosMensal),
  ];

  const roMensal     = subtrair(mcMensal, cfMensal);
  const roPctMensal  = pctMensal(roMensal, rbMensal);
  const invMensal    = buildMensal(dados, meses, ['2012']);
  const raiMensal    = subtrair(roMensal, invMensal);
  const raiPctMensal = pctMensal(raiMensal, rbMensal);
  const finMensal    = buildMensal(dados, meses, ['1002'], ['2011', '2013']);
  const rafMensal    = somar(raiMensal, finMensal);
  const rafPctMensal = pctMensal(rafMensal, rbMensal);
  const retMensal    = buildMensal(dados, meses, ['2010']);
  const rarMensal    = subtrair(rafMensal, retMensal);
  const rarPctMensal = pctMensal(rarMensal, rbMensal);
  const empMensal    = buildMensal(dados, meses, ['1003'], ['2015']);
  const rliqMensal   = somar(rarMensal, empMensal);
  const rliqPctMensal = pctMensal(rliqMensal, rbMensal);

  const linhas: LinhaRelatorio[] = [
    mk('1001', 'Receita Bruta',                'entrada',  'pai', rbMensal),
    mk('2001', '(-) Impostos',                 'saida',    'pai', impMensal),
    mk(null,   '(=) Receita Líquida',          'subtotal', 'pai', rlMensal),
    mk('2002', '(-) CMV',                      'saida',    'pai', cmvMensal),
    mk('2003', '(-) Desp. Variáveis',          'saida',    'pai', dvMensal),
    mk(null,   '(=) Margem de Contribuição',   'subtotal', 'pai', mcMensal),
    mk(null,   '(-) Custos Fixos',             'saida',    'pai', cfMensal, filhosCF),
    mk(null,   '(=) Resultado Operacional',    'subtotal', 'pai', roMensal),
    makePct(   '(=) Resultado Operacional %',              roPctMensal),
    mk('2012', '(-) Investimentos',            'saida',    'pai', invMensal),
    mk(null,   '(=) Res. após Investimentos',  'subtotal', 'pai', raiMensal),
    makePct(   '(=) Res. após Investimentos %',            raiPctMensal),
    mk(null,   '(+/-) Financiamentos',         'entrada',  'pai', finMensal),
    mk(null,   '(=) Res. após Financiamentos', 'subtotal', 'pai', rafMensal),
    makePct(   '(=) Res. após Financiamentos %',           rafPctMensal),
    mk('2010', '(-) Retiradas Sócios',         'saida',    'pai', retMensal),
    mk(null,   '(=) Res. após Retiradas',      'subtotal', 'pai', rarMensal),
    makePct(   '(=) Res. após Retiradas %',                rarPctMensal),
    mk(null,   '(+/-) Empréstimos Empresas',   'entrada',  'pai', empMensal),
    mk(null,   '(=) Resultado Líquido',        'total',    'pai', rliqMensal),
    makePct(   '(=) Resultado Líquido %',                  rliqPctMensal),
  ];

  return { linhas, meses };
}
