import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export type FilterMode = 'competencia' | 'periodo';

interface GlobalFilters {
  dataInicio: string;
  dataFim: string;
  empresaIds: string[];
  competenciaMes: number; // 0-11
  competenciaAno: number;
  filterMode: FilterMode;
}

interface GlobalFiltersContextType {
  filters: GlobalFilters;
  updateFilters: (filters: Partial<GlobalFilters>) => void;
  resetFilters: () => void;
  setCompetencia: (mes: number, ano: number) => void;
  setFilterMode: (mode: FilterMode) => void;
}

const GlobalFiltersContext = createContext<GlobalFiltersContextType | undefined>(undefined);

const STORAGE_KEY = 'global-filters';

/** Calcula dataInicio e dataFim a partir de mês (0-11) e ano */
const competenciaToDateRange = (mes: number, ano: number) => {
  const primeiroDia = new Date(ano, mes, 1);
  const ultimoDia = new Date(ano, mes + 1, 0);
  return {
    dataInicio: primeiroDia.toISOString().split('T')[0],
    dataFim: ultimoDia.toISOString().split('T')[0],
  };
};

const getDefaultFilters = (): GlobalFilters => {
  const hoje = new Date();
  const mes = hoje.getMonth();
  const ano = hoje.getFullYear();
  const { dataInicio, dataFim } = competenciaToDateRange(mes, ano);
  return {
    dataInicio,
    dataFim,
    empresaIds: [],
    competenciaMes: mes,
    competenciaAno: ano,
    filterMode: 'competencia',
  };
};

export const GlobalFiltersProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [filters, setFilters] = useState<GlobalFilters>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Migração: se não tem os campos novos, adiciona defaults
        if (parsed.competenciaMes === undefined) {
          const hoje = new Date();
          parsed.competenciaMes = hoje.getMonth();
          parsed.competenciaAno = hoje.getFullYear();
          parsed.filterMode = 'competencia';
        }
        // Retorna os filtros sem campos legados
        return {
          dataInicio: parsed.dataInicio,
          dataFim: parsed.dataFim,
          empresaIds: parsed.empresaIds || [],
          competenciaMes: parsed.competenciaMes,
          competenciaAno: parsed.competenciaAno,
          filterMode: parsed.filterMode || 'competencia',
        };
      } catch (e) {
        console.error('Erro ao restaurar filtros do cache:', e);
      }
    }
    return getDefaultFilters();
  });

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setFilters(getDefaultFilters());
      } else if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
        const userId = session?.user?.id;
        const storedFilters = localStorage.getItem(STORAGE_KEY);
        if (storedFilters) {
          try {
            const parsed = JSON.parse(storedFilters);
            if (parsed.userId && parsed.userId !== userId) {
              setFilters(getDefaultFilters());
            }
          } catch (e) {
            console.error('Erro ao validar filtros do cache:', e);
          }
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const saveFilters = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...filters, userId: user.id }));
      } else {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
      }
    };
    saveFilters();
  }, [filters]);

  const updateFilters = useCallback((newFilters: Partial<GlobalFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(getDefaultFilters());
  }, []);

  /** Atualiza competência e recalcula dataInicio/dataFim automaticamente */
  const setCompetencia = useCallback((mes: number, ano: number) => {
    const { dataInicio, dataFim } = competenciaToDateRange(mes, ano);
    setFilters(prev => ({
      ...prev,
      competenciaMes: mes,
      competenciaAno: ano,
      dataInicio,
      dataFim,
    }));
  }, []);

  const setFilterMode = useCallback((mode: FilterMode) => {
    setFilters(prev => {
      if (mode === 'competencia') {
        // Ao voltar para competência, recalcula as datas a partir da competência atual
        const { dataInicio, dataFim } = competenciaToDateRange(prev.competenciaMes, prev.competenciaAno);
        return { ...prev, filterMode: mode, dataInicio, dataFim };
      }
      return { ...prev, filterMode: mode };
    });
  }, []);

  return (
    <GlobalFiltersContext.Provider
      value={{
        filters,
        updateFilters,
        resetFilters,
        setCompetencia,
        setFilterMode,
      }}
    >
      {children}
    </GlobalFiltersContext.Provider>
  );
};

export const useGlobalFilters = () => {
  const context = useContext(GlobalFiltersContext);
  if (!context) {
    throw new Error('useGlobalFilters must be used within a GlobalFiltersProvider');
  }
  return context;
};
