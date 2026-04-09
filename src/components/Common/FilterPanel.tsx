import React, { useMemo } from 'react';
import { Calendar, CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { CompanyListbox } from '../Dashboard/CompanyListbox';
import { usePermissions } from '../../hooks/usePermissions';
import { useGlobalFilters, FilterMode } from '../../contexts/GlobalFiltersContext';

const MESES_LABEL = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const MESES_CURTO = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
];

interface FilterPanelProps {
  onDateRangeChange?: (dateRange: { dataInicio: string; dataFim: string }) => void;
  onEmpresasChange?: (empresaIds: string[]) => void;
  initialDateRange?: { dataInicio: string; dataFim: string };
  initialEmpresas?: string[];
  showDateRange?: boolean;
  showEmpresas?: boolean;
}

export const FilterPanel: React.FC<FilterPanelProps> = ({
  onDateRangeChange,
  onEmpresasChange,
  showDateRange = true,
  showEmpresas = true,
}) => {
  const { getEmpresas } = usePermissions();
  const {
    filters: globalFilters,
    updateFilters,
    setCompetencia,
    setFilterMode,
  } = useGlobalFilters();

  // Sempre ler direto do contexto global — fonte única de verdade
  const filterMode = globalFilters.filterMode;
  const competenciaMes = globalFilters.competenciaMes;
  const competenciaAno = globalFilters.competenciaAno;

  const dateRange = {
    dataInicio: globalFilters.dataInicio,
    dataFim: globalFilters.dataFim,
  };

  const empresasSelecionadas = globalFilters.empresaIds;

  const empresas = getEmpresas();

  // Calcula dataInicio/dataFim a partir de mês/ano
  const competenciaToDateRange = (mes: number, ano: number) => {
    const primeiroDia = new Date(ano, mes, 1);
    const ultimoDia = new Date(ano, mes + 1, 0);
    return {
      dataInicio: primeiroDia.toISOString().split('T')[0],
      dataFim: ultimoDia.toISOString().split('T')[0],
    };
  };

  const handleCompetenciaChange = (mes: number, ano: number) => {
    setCompetencia(mes, ano);
    if (onDateRangeChange) {
      onDateRangeChange(competenciaToDateRange(mes, ano));
    }
  };

  const handleMesAnterior = () => {
    let novoMes = competenciaMes - 1;
    let novoAno = competenciaAno;
    if (novoMes < 0) {
      novoMes = 11;
      novoAno -= 1;
    }
    handleCompetenciaChange(novoMes, novoAno);
  };

  const handleProximoMes = () => {
    let novoMes = competenciaMes + 1;
    let novoAno = competenciaAno;
    if (novoMes > 11) {
      novoMes = 0;
      novoAno += 1;
    }
    handleCompetenciaChange(novoMes, novoAno);
  };

  const handleToggleFilterMode = () => {
    const newMode: FilterMode = filterMode === 'competencia' ? 'periodo' : 'competencia';
    setFilterMode(newMode);
  };

  const handleDateChange = (field: 'dataInicio' | 'dataFim', value: string) => {
    updateFilters({ [field]: value });
    if (onDateRangeChange) {
      onDateRangeChange({ ...dateRange, [field]: value });
    }
  };

  const handleEmpresasChange = (ids: string[]) => {
    updateFilters({ empresaIds: ids });
    if (onEmpresasChange) {
      onEmpresasChange(ids);
    }
  };

  // Gera lista de anos para o select (5 anos atrás até ano atual + 1)
  const anosDisponiveis = useMemo(() => {
    const atual = new Date().getFullYear();
    const anos: number[] = [];
    for (let a = atual - 5; a <= atual + 1; a++) {
      anos.push(a);
    }
    return anos;
  }, []);

  if (!showDateRange && !showEmpresas) {
    return null;
  }

  return (
    <div className="relative z-50 bg-slate-900/40 backdrop-blur-md border border-white/5 rounded-xl px-4 py-2.5 shadow-sm">
      <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
        {showDateRange && (
          <div className="flex items-center space-x-3">
            {/* Ícone e toggle entre competência e período */}
            <button
              onClick={handleToggleFilterMode}
              className={`
                flex items-center justify-center h-7 w-7 rounded-md transition-all duration-200
                ${filterMode === 'competencia'
                  ? 'bg-cyan-600/20 text-cyan-400 border border-cyan-500/30'
                  : 'bg-slate-800/50 text-slate-400 border border-slate-700/50 hover:border-slate-600 hover:text-slate-300'
                }
              `}
              title={filterMode === 'competencia'
                ? 'Modo Competência (clique para período livre)'
                : 'Modo Período (clique para competência)'
              }
            >
              {filterMode === 'competencia'
                ? <CalendarDays className="w-3.5 h-3.5" />
                : <Calendar className="w-3.5 h-3.5" />
              }
            </button>

            {filterMode === 'competencia' ? (
              /* ───── MODO COMPETÊNCIA ───── */
              <div className="flex items-center gap-1.5">
                {/* Botão mês anterior */}
                <button
                  onClick={handleMesAnterior}
                  className="flex items-center justify-center h-8 w-6 rounded-md bg-slate-800/50 border border-slate-700/50 text-slate-400 hover:bg-slate-700/60 hover:text-white transition-all"
                  title="Mês anterior"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>

                {/* Select de mês */}
                <select
                  value={competenciaMes}
                  onChange={(e) => handleCompetenciaChange(Number(e.target.value), competenciaAno)}
                  className="px-2 h-8 text-xs bg-slate-800/50 border border-slate-700/50 rounded-md text-white focus:outline-none focus:ring-1 focus:ring-cyan-500/50 transition-all cursor-pointer hover:bg-slate-800 appearance-none pr-6"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 6px center',
                  }}
                >
                  {MESES_LABEL.map((label, idx) => (
                    <option key={idx} value={idx}>{label}</option>
                  ))}
                </select>

                {/* Select de ano */}
                <select
                  value={competenciaAno}
                  onChange={(e) => handleCompetenciaChange(competenciaMes, Number(e.target.value))}
                  className="px-2 h-8 text-xs bg-slate-800/50 border border-slate-700/50 rounded-md text-white focus:outline-none focus:ring-1 focus:ring-cyan-500/50 transition-all cursor-pointer hover:bg-slate-800 appearance-none pr-6"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 6px center',
                  }}
                >
                  {anosDisponiveis.map((a) => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>

                {/* Botão próximo mês */}
                <button
                  onClick={handleProximoMes}
                  className="flex items-center justify-center h-8 w-6 rounded-md bg-slate-800/50 border border-slate-700/50 text-slate-400 hover:bg-slate-700/60 hover:text-white transition-all"
                  title="Próximo mês"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>

                {/* Label visual do período calculado */}
                <span className="text-[10px] text-slate-500 ml-1 hidden lg:inline whitespace-nowrap">
                  {dateRange.dataInicio.split('-').reverse().join('/')} — {dateRange.dataFim.split('-').reverse().join('/')}
                </span>
              </div>
            ) : (
              /* ───── MODO PERÍODO LIVRE ───── */
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 whitespace-nowrap">
                    De
                  </span>
                  <input
                    type="date"
                    value={dateRange.dataInicio}
                    onChange={(e) => handleDateChange('dataInicio', e.target.value)}
                    className="px-2 h-8 text-xs bg-slate-800/50 border border-slate-700/50 rounded-md text-white focus:outline-none focus:ring-1 focus:ring-cyan-500/50 transition-all cursor-pointer hover:bg-slate-800"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 whitespace-nowrap">
                    Até
                  </span>
                  <input
                    type="date"
                    value={dateRange.dataFim}
                    onChange={(e) => handleDateChange('dataFim', e.target.value)}
                    className="px-2 h-8 text-xs bg-slate-800/50 border border-slate-700/50 rounded-md text-white focus:outline-none focus:ring-1 focus:ring-cyan-500/50 transition-all cursor-pointer hover:bg-slate-800"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        <div className="h-6 w-px bg-slate-800 hidden sm:block" />

        {showEmpresas && (
          <div className="flex-1 min-w-[320px] max-w-[500px] flex items-center gap-3">
            <div className="flex-1 flex items-center gap-3">
              <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 whitespace-nowrap">
                Empresa
              </span>
              <div className="flex-1">
                <CompanyListbox
                  empresas={empresas}
                  empresasSelecionadas={empresasSelecionadas}
                  onSelectionChange={handleEmpresasChange}
                  mode="multiple"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
