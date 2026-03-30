import { useState } from 'react';
import { ViewMode } from '../types/financeiro';

const STORAGE_KEY = 'fin-view-mode';

export function useViewMode(): [ViewMode, (mode: ViewMode) => void] {
  const [mode, setModeState] = useState<ViewMode>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'analytic' ? 'analytic' : 'compact';
  });

  const setMode = (newMode: ViewMode) => {
    setModeState(newMode);
    localStorage.setItem(STORAGE_KEY, newMode);
  };

  return [mode, setMode];
}
