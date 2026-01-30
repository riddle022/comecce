import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

interface GlobalFilters {
  dataInicio: string;
  dataFim: string;
  empresaIds: string[];
}

interface GlobalFiltersContextType {
  filters: GlobalFilters;
  isGlobalMode: boolean;
  setGlobalMode: (enabled: boolean) => void;
  updateFilters: (filters: Partial<GlobalFilters>) => void;
  resetFilters: () => void;
}

const GlobalFiltersContext = createContext<GlobalFiltersContextType | undefined>(undefined);

const STORAGE_KEY = 'global-filters';
const MODE_STORAGE_KEY = 'global-filters-mode';

const getDefaultFilters = (): GlobalFilters => {
  const hoje = new Date();
  const primeiroDia = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const ultimoDia = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
  return {
    dataInicio: primeiroDia.toISOString().split('T')[0],
    dataFim: ultimoDia.toISOString().split('T')[0],
    empresaIds: []
  };
};

export const GlobalFiltersProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isGlobalMode, setIsGlobalModeState] = useState<boolean>(() => {
    const stored = localStorage.getItem(MODE_STORAGE_KEY);
    return stored ? JSON.parse(stored) : false;
  });

  const [filters, setFilters] = useState<GlobalFilters>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : getDefaultFilters();
  });

  useEffect(() => {
    localStorage.setItem(MODE_STORAGE_KEY, JSON.stringify(isGlobalMode));
  }, [isGlobalMode]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setFilters(getDefaultFilters());
        setIsGlobalModeState(false);
      } else if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
        const userId = session?.user?.id;
        const storedFilters = localStorage.getItem(STORAGE_KEY);
        if (storedFilters) {
          try {
            const parsed = JSON.parse(storedFilters);
            if (parsed.userId && parsed.userId !== userId) {
              setFilters(getDefaultFilters());
              setIsGlobalModeState(false);
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

  const setGlobalMode = useCallback((enabled: boolean) => {
    setIsGlobalModeState(enabled);
  }, []);

  const updateFilters = useCallback((newFilters: Partial<GlobalFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(getDefaultFilters());
  }, []);

  return (
    <GlobalFiltersContext.Provider
      value={{
        filters,
        isGlobalMode,
        setGlobalMode,
        updateFilters,
        resetFilters
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
