import React, { useState, useEffect } from 'react';
import { Calendar, Link2 } from 'lucide-react';
import { CompanyListbox } from '../Dashboard/CompanyListbox';
import { usePermissions } from '../../hooks/usePermissions';
import { useGlobalFilters } from '../../contexts/GlobalFiltersContext';

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
  initialDateRange,
  initialEmpresas,
  showDateRange = true,
  showEmpresas = true,
}) => {
  const { getEmpresas, loading: permissionsLoading } = usePermissions();
  const { filters: globalFilters, isGlobalMode, setGlobalMode, updateFilters } = useGlobalFilters();

  const getDefaultDateRange = () => {
    const hoje = new Date();
    const primeiroDia = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const ultimoDia = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
    return {
      dataInicio: primeiroDia.toISOString().split('T')[0],
      dataFim: ultimoDia.toISOString().split('T')[0]
    };
  };

  const [localDateRange, setLocalDateRange] = useState(
    initialDateRange || getDefaultDateRange()
  );
  const [localEmpresas, setLocalEmpresas] = useState<string[]>(
    initialEmpresas || []
  );

  const dateRange = isGlobalMode ? {
    dataInicio: globalFilters.dataInicio,
    dataFim: globalFilters.dataFim
  } : localDateRange;

  const empresasSelecionadas = isGlobalMode ? globalFilters.empresaIds : localEmpresas;

  const empresas = getEmpresas();

  useEffect(() => {
    // Auto-select first company IF none are selected and we have list of companies
    if (!permissionsLoading && empresas.length > 0 && empresasSelecionadas.length === 0) {
      const firstEmpresaId = [empresas[0].id_empresa];
      if (isGlobalMode) {
        updateFilters({ empresaIds: firstEmpresaId });
      } else {
        setLocalEmpresas(firstEmpresaId);
      }

      // Notify parent of the automatic selection
      if (onEmpresasChange) {
        onEmpresasChange(firstEmpresaId);
      }
    }
  }, [permissionsLoading, empresas.length]); // Optimized dependency

  // REMOVED: Redundant useEffect that was triggering onDateRangeChange/onEmpresasChange 
  // on every global filter change. This became problematic during mode transitions.
  // The handleDateChange and handleEmpresasChange already notify parent.

  const handleDateChange = (field: 'dataInicio' | 'dataFim', value: string) => {
    if (isGlobalMode) {
      updateFilters({ [field]: value });
      if (onDateRangeChange) {
        onDateRangeChange({ ...globalFilters, [field]: value });
      }
    } else {
      const newDateRange = { ...localDateRange, [field]: value };
      setLocalDateRange(newDateRange);
      if (onDateRangeChange) {
        onDateRangeChange(newDateRange);
      }
    }
  };

  const handleEmpresasChange = (ids: string[]) => {
    if (isGlobalMode) {
      updateFilters({ empresaIds: ids });
    } else {
      setLocalEmpresas(ids);
    }
    if (onEmpresasChange) {
      onEmpresasChange(ids);
    }
  };

  const handleToggleGlobalMode = () => {
    if (!isGlobalMode) {
      updateFilters({
        dataInicio: localDateRange.dataInicio,
        dataFim: localDateRange.dataFim,
        empresaIds: localEmpresas
      });
    }
    setGlobalMode(!isGlobalMode);
  };

  if (!showDateRange && !showEmpresas) {
    return null;
  }

  return (
    <div className="relative z-50 bg-slate-900/40 backdrop-blur-md border border-white/5 rounded-xl px-4 py-2.5 shadow-sm">
      <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
        {showDateRange && (
          <div className="flex items-center space-x-3">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
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
            <button
              onClick={handleToggleGlobalMode}
              className={`
                flex items-center justify-center h-8 w-8 rounded-md
                transition-all duration-200 flex-shrink-0
                ${isGlobalMode
                  ? 'bg-cyan-600/20 text-cyan-400 border border-cyan-500/30 shadow-[0_0_10px_rgba(34,197,94,0.1)]'
                  : 'bg-slate-800/50 text-slate-500 border border-slate-700/50 hover:border-slate-600 hover:text-slate-300'
                }
              `}
              title={isGlobalMode ? 'Filtros fixados em todas as telas (clique para desativar)' : 'Clique para fixar os filtros em todas as telas'}
            >
              <Link2 className={`w-3.5 h-3.5 ${isGlobalMode ? 'animate-pulse' : ''}`} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
