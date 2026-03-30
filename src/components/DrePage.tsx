import { Minus, Plus } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useGlobalFilters } from '../contexts/GlobalFiltersContext';
import { useDreData } from '../hooks/useDreData';
import { LinhaRelatorio } from '../types/financeiro';
import { buildRelatorio } from '../utils/buildRelatorio';
import { FilterPanel } from './Common/FilterPanel';

const fmtBRL = (n: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);

const fmtPct = (n: number) => `${n.toFixed(1)}%`;

function rowBg(tipo: LinhaRelatorio['tipo']): string {
  switch (tipo) {
    case 'total':      return 'bg-[#0F4C5C] font-black';
    case 'subtotal':   return 'bg-[#0F4C5C]/40 font-bold border-t border-b border-[#0F4C5C]/60';
    case 'percentual': return 'bg-transparent italic';
    default:           return 'hover:bg-slate-800/30';
  }
}

function valueColor(tipo: LinhaRelatorio['tipo'], value: number): string {
  if (tipo === 'subtotal' || tipo === 'total' || tipo === 'percentual') {
    return value >= 0 ? 'text-emerald-400' : 'text-red-400';
  }
  return 'text-slate-200';
}

function CelulaValor({ linha, value, isPct }: { linha: LinhaRelatorio; value: number; isPct?: boolean }) {
  if (isPct && linha.tipo === 'percentual') return <td className="px-3 py-1.5 text-right text-[10px] text-slate-600">—</td>;
  const display = linha.tipo === 'percentual' ? fmtPct(value) : (isPct ? fmtPct(value) : fmtBRL(value));
  return (
    <td className={`px-3 py-1.5 text-right text-[11px] tabular-nums ${valueColor(linha.tipo, value)}`}>
      {display}
    </td>
  );
}

function LinhaTabela({
  linha,
  meses,
  onToggle,
  isFilho = false,
}: {
  linha: LinhaRelatorio;
  meses: string[];
  onToggle?: () => void;
  isFilho?: boolean;
}) {
  const temFilhos = (linha.filhos?.length ?? 0) > 0;
  const textSize  = linha.tipo === 'percentual' ? 'text-[10px] text-slate-500' : 'text-[11px] text-slate-200';

  return (
    <tr className={`transition-colors ${rowBg(linha.tipo)}`}>
      <td className={`px-3 py-1.5 whitespace-nowrap ${textSize} ${isFilho ? 'pl-8' : ''}`}>
        <div className="flex items-center gap-1.5">
          {temFilhos && onToggle && (
            <button
              onClick={onToggle}
              className="w-4 h-4 flex items-center justify-center rounded text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors flex-shrink-0"
            >
              {linha.expandido ? <Minus className="w-2.5 h-2.5" /> : <Plus className="w-2.5 h-2.5" />}
            </button>
          )}
          {!temFilhos && !isFilho && <span className="w-4 flex-shrink-0" />}
          <span className={linha.tipo === 'total' || linha.tipo === 'subtotal' ? 'text-white' : ''}>
            {linha.descricao}
          </span>
        </div>
      </td>

      {meses.map(mes => (
        <React.Fragment key={mes}>
          <CelulaValor linha={linha} value={linha.valor_mensal[mes] ?? 0} />
          <CelulaValor linha={linha} value={linha.av_mensal[mes] ?? 0} isPct />
        </React.Fragment>
      ))}

      <CelulaValor linha={linha} value={linha.valor_total} />
      <CelulaValor linha={linha} value={linha.av_total} isPct />
    </tr>
  );
}

function Skeleton() {
  return (
    <div className="space-y-2 animate-pulse">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="h-8 bg-slate-800/60 rounded" style={{ opacity: 1 - i * 0.06 }} />
      ))}
    </div>
  );
}

export const DrePage: React.FC = () => {
  const { filters } = useGlobalFilters();

  const [dateRange, setDateRange] = useState({
    dataInicio: filters.dataInicio,
    dataFim:    filters.dataFim,
  });
  const [empresaIds, setEmpresaIds] = useState<string[]>(filters.empresaIds);

  const { dadosMensais, isLoading, error } = useDreData({
    dataInicio: dateRange.dataInicio,
    dataFim:    dateRange.dataFim,
    empresaIds,
  });

  const [linhas, setLinhas] = useState<LinhaRelatorio[]>([]);
  const [meses,  setMeses]  = useState<string[]>([]);

  useEffect(() => {
    if (dadosMensais.length > 0) {
      const { linhas: l, meses: m } = buildRelatorio(dadosMensais);
      setLinhas(l);
      setMeses(m);
    } else {
      setLinhas([]);
      setMeses([]);
    }
  }, [dadosMensais]);

  const toggleLinha = (idx: number) => {
    setLinhas(prev => prev.map((l, i) => i === idx ? { ...l, expandido: !l.expandido } : l));
  };

  const mesLabels: Record<string, string> = dadosMensais.reduce<Record<string, string>>((acc, d) => {
    acc[d.ano_mes] = d.mes_label;
    return acc;
  }, {});

  const chartData = meses.map(mes => ({
    mes:              mesLabels[mes] ?? mes,
    receitaBruta:     linhas.find(l => l.codigo === '1001')?.valor_mensal[mes] ?? 0,
    margem:           linhas.find(l => l.descricao === '(=) Margem de Contribuição')?.valor_mensal[mes] ?? 0,
    resultadoLiquido: linhas.find(l => l.tipo === 'total')?.valor_mensal[mes] ?? 0,
  }));

  return (
    <div className="space-y-4">
      <FilterPanel
        onDateRangeChange={r => setDateRange({ dataInicio: r.dataInicio, dataFim: r.dataFim })}
        onEmpresasChange={setEmpresaIds}
        initialDateRange={dateRange}
      />

      <div className="bg-slate-900/40 border border-white/5 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-white/5">
          <h2 className="text-sm font-bold text-white tracking-tight">DRE — Demonstração do Resultado</h2>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-0.5">Demonstrativo mensal</p>
        </div>

        {isLoading ? (
          <div className="p-4"><Skeleton /></div>
        ) : error ? (
          <div className="p-8 text-center text-red-400 text-sm">{error}</div>
        ) : linhas.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm">Nenhum dado encontrado para o período</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="bg-slate-800/60 text-slate-400 text-[10px] uppercase tracking-widest">
                  <th className="px-3 py-2 font-semibold whitespace-nowrap min-w-[220px]">Descrição</th>
                  {meses.map(mes => (
                    <React.Fragment key={mes}>
                      <th className="px-3 py-2 text-right font-semibold whitespace-nowrap">{mesLabels[mes] ?? mes}</th>
                      <th className="px-3 py-2 text-right font-semibold text-slate-600">%AV</th>
                    </React.Fragment>
                  ))}
                  <th className="px-3 py-2 text-right font-semibold whitespace-nowrap">Total</th>
                  <th className="px-3 py-2 text-right font-semibold text-slate-600">%AV</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {linhas.map((linha, idx) => (
                  <React.Fragment key={idx}>
                    <LinhaTabela
                      linha={linha}
                      meses={meses}
                      onToggle={() => toggleLinha(idx)}
                    />
                    {linha.expandido && linha.filhos?.map((filho, fidx) => (
                      <LinhaTabela
                        key={`${idx}-${fidx}`}
                        linha={filho}
                        meses={meses}
                        isFilho
                      />
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {chartData.length > 0 && (
        <div className="bg-slate-900/40 border border-white/5 rounded-xl p-4">
          <h3 className="text-sm font-bold text-white mb-4 tracking-tight">Variação Mensal</h3>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
              <XAxis dataKey="mes" tick={{ fill: '#64748B', fontSize: 10 }} />
              <YAxis tick={{ fill: '#64748B', fontSize: 10 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                formatter={(v: number) => fmtBRL(v)}
                contentStyle={{ background: '#1E293B', border: '1px solid #0F4C5C', borderRadius: 8, fontSize: 11 }}
                labelStyle={{ color: '#94A3B8' }}
              />
              <Legend wrapperStyle={{ fontSize: 11, color: '#64748B' }} />
              <Line type="monotone" dataKey="receitaBruta"     name="Receita Bruta"         stroke="#0EA5E9" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="margem"           name="Margem de Contribuição" stroke="#06B6D4" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="resultadoLiquido" name="Resultado Líquido"      stroke="#22C55E" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};
