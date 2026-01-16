import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { GrupoEconomico } from '../../types/database';

interface GrupoEconomicoComboboxProps {
  grupos: GrupoEconomico[];
  grupoSelecionado: string | null;
  onSelectionChange: (uuid: string | null) => void;
}

export const GrupoEconomicoCombobox: React.FC<GrupoEconomicoComboboxProps> = ({
  grupos,
  grupoSelecionado,
  onSelectionChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dropdownDirection, setDropdownDirection] = useState<'down' | 'up'>('down');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);

      if (buttonRef.current) {
        const buttonRect = buttonRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - buttonRect.bottom;
        const spaceAbove = buttonRect.top;
        const dropdownHeight = 400;

        if (spaceBelow < dropdownHeight && spaceAbove > spaceBelow) {
          setDropdownDirection('up');
        } else {
          setDropdownDirection('down');
        }
      }
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const sortedGrupos = [...grupos].sort((a, b) => {
    return a.ds_grupo.localeCompare(b.ds_grupo, 'pt-BR');
  });

  const filteredGrupos = sortedGrupos.filter(grupo => {
    return grupo.ds_grupo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      grupo.id_grupo.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const handleSelectGrupo = (uuid: string | null) => {
    onSelectionChange(uuid);
    setIsOpen(false);
  };

  const getButtonText = () => {
    if (!grupoSelecionado) {
      return 'Sem grupo econômico';
    }
    const grupo = grupos.find(g => g.uuid === grupoSelecionado);
    return grupo?.ds_grupo || 'Sem grupo econômico';
  };


  return (
    <div className="relative" ref={dropdownRef}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-2 bg-[#0F172A] border border-[#0F4C5C]/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#0F4C5C] transition-all flex items-center justify-between hover:border-[#0F4C5C]/50"
      >
        <span className={!grupoSelecionado ? 'text-gray-400' : ''}>
          {getButtonText()}
        </span>
        <ChevronDown
          className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'transform rotate-180' : ''
            }`}
        />
      </button>

      {isOpen && (
        <div className={`absolute z-[60] w-full bg-[#0F172A] border border-[#0F4C5C]/30 rounded-lg shadow-2xl shadow-black/50 overflow-hidden ${dropdownDirection === 'up' ? 'bottom-full mb-2' : 'top-full mt-2'
          }`}>
          <div className="p-3 border-b border-[#0F4C5C]/20">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar grupo..."
                className="w-full pl-10 pr-4 py-2 bg-[#1E293B] border border-[#0F4C5C]/20 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#0F4C5C] focus:border-transparent"
              />
            </div>
          </div>

          <div className="max-h-64 overflow-y-auto">
            <button
              type="button"
              onClick={() => handleSelectGrupo(null)}
              className={`w-full flex items-center px-4 py-3 hover:bg-[#1E293B] transition-colors ${!grupoSelecionado ? 'bg-[#1E293B]' : ''
                }`}
            >
              <span
                className={`text-sm ${!grupoSelecionado ? 'text-white font-medium' : 'text-gray-300'
                  }`}
              >
                Sem grupo econômico
              </span>
            </button>

            {filteredGrupos.length === 0 ? (
              <div className="p-4 text-center text-gray-400 text-sm">
                {searchTerm ? 'Nenhum grupo encontrado' : 'Nenhum grupo disponível'}
              </div>
            ) : (
              filteredGrupos.map((grupo) => {
                const isSelected = grupoSelecionado === grupo.uuid;

                return (
                  <button
                    key={grupo.uuid}
                    type="button"
                    onClick={() => handleSelectGrupo(grupo.uuid)}
                    className={`w-full flex items-start px-4 py-3 hover:bg-[#1E293B] transition-colors group ${isSelected ? 'bg-[#1E293B]' : ''
                      }`}
                  >
                    <div className="flex-1 text-left">
                      <span
                        className={`text-sm block ${isSelected ? 'text-white font-medium' : 'text-gray-300'
                          }`}
                      >
                        {grupo.ds_grupo}
                      </span>
                      <span className="text-xs text-gray-500 block mt-0.5">
                        ID: {grupo.id_grupo}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          <div className="p-2 border-t border-[#0F4C5C]/20 bg-[#1E293B]/50">
            <div className="text-xs text-gray-500 text-center">
              {grupos.length} {grupos.length === 1 ? 'grupo' : 'grupos'} no total
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
