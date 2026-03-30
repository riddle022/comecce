import React from 'react';
import { ViewMode } from '../../types/financeiro';

interface ViewModeToggleProps {
  mode: ViewMode;
  onChange: (mode: ViewMode) => void;
}

export const ViewModeToggle: React.FC<ViewModeToggleProps> = ({ mode, onChange }) => (
  <div className="flex items-center bg-slate-800/60 rounded-lg p-0.5 text-[11px]">
    <button
      onClick={() => onChange('compact')}
      className={`px-3 py-1 rounded-md transition-all ${
        mode === 'compact'
          ? 'bg-[#0F4C5C] text-white shadow-sm'
          : 'text-slate-400 hover:text-slate-200'
      }`}
    >
      Compacto
    </button>
    <button
      onClick={() => onChange('analytic')}
      className={`px-3 py-1 rounded-md transition-all ${
        mode === 'analytic'
          ? 'bg-[#0F4C5C] text-white shadow-sm'
          : 'text-slate-400 hover:text-slate-200'
      }`}
    >
      Analítico
    </button>
  </div>
);
