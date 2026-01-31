import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, Check } from 'lucide-react';
import { Empresa } from '../../types/database';

interface CompanyListboxProps {
  empresas: Empresa[];
  empresasSelecionadas: string[];
  onSelectionChange: (ids: string[]) => void;
  mode?: 'single' | 'multiple';
  autoFocus?: boolean;
}

export const CompanyListbox: React.FC<CompanyListboxProps> = ({
  empresas,
  empresasSelecionadas,
  onSelectionChange,
  mode = 'multiple',
  autoFocus = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [localSelected, setLocalSelected] = useState<string[]>(empresasSelecionadas);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Sincroniza o estado local quando a prop muda (ex: atualização externa/inicial)
  useEffect(() => {
    setLocalSelected(empresasSelecionadas);
  }, [empresasSelecionadas]);

  // Debounce para aplicar o filtro após o usuário parar de selecionar
  useEffect(() => {
    const timer = setTimeout(() => {
      // Verifica se houve mudança real para evitar loops ou chamadas desnecessárias
      const hasChanged =
        localSelected.length !== empresasSelecionadas.length ||
        !localSelected.every((id) => empresasSelecionadas.includes(id));

      if (hasChanged) {
        onSelectionChange(localSelected);
      }
    }, 1500); // 1.5 segundos de delay

    return () => clearTimeout(timer);
  }, [localSelected, empresasSelecionadas, onSelectionChange]);

  useEffect(() => {
    if (autoFocus && buttonRef.current) {
      buttonRef.current.focus();
    }
  }, [autoFocus]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const sortedEmpresas = [...empresas].sort((a, b) => {
    const nomeA = a.ds_empresa || '';
    const nomeB = b.ds_empresa || '';
    return nomeA.localeCompare(nomeB, 'pt-BR');
  });

  const filteredEmpresas = sortedEmpresas.filter(empresa => {
    const nome = empresa.ds_empresa || '';
    return nome.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const handleToggleEmpresa = (id: string) => {
    if (mode === 'single') {
      setLocalSelected([id]);
      setIsOpen(false);
    } else {
      const newSelection = localSelected.includes(id)
        ? localSelected.filter(e => e !== id)
        : [...localSelected, id];
      setLocalSelected(newSelection);
    }
  };

  const handleSelectAll = () => {
    if (localSelected.length === empresas.length) {
      setLocalSelected([]);
    } else {
      setLocalSelected(empresas.map(e => e.id_empresa));
    }
    // Mantém aberto para permitir ver o resultado ou ajusta conforme UX desejada
    // setIsOpen(false); // Comentado para permitir que o usuário veja a ação
  };

  // Usa o estado local para exibir o que está selecionado na UI
  const validSelectedIds = localSelected.filter(id =>
    empresas.some(e => e.id_empresa === id)
  );

  const getButtonText = () => {
    if (validSelectedIds.length === 0) {
      return mode === 'single' ? 'Selecionar empresa' : 'Selecionar empresas';
    }
    if (validSelectedIds.length === 1) {
      const empresa = empresas.find(e => e.id_empresa === validSelectedIds[0]);
      return empresa?.ds_empresa || (mode === 'single' ? 'Selecionar empresa' : 'Selecionar empresas');
    }
    if (validSelectedIds.length === empresas.length) {
      return 'Todas as empresas';
    }
    return `${validSelectedIds.length} empresas selecionadas`;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 h-8 text-xs bg-slate-800/50 border border-slate-700/50 rounded-md text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 transition-all flex items-center justify-between hover:bg-slate-800 hover:border-slate-600"
      >
        <span className={`truncate mr-2 ${localSelected.length === 0 ? 'text-slate-500' : ''}`}>
          {getButtonText()}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-500 transition-transform flex-shrink-0 ${isOpen ? 'transform rotate-180' : ''
            }`}
        />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full min-w-[280px] mt-1.5 bg-slate-900 border border-slate-700/50 rounded-lg shadow-2xl shadow-black/80 overflow-hidden ring-1 ring-black ring-opacity-5">
          <div className="p-2 border-b border-slate-800">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar empresa..."
                className="w-full pl-8 pr-3 py-1.5 bg-slate-800 border border-slate-700/50 rounded-md text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
              />
            </div>
          </div>

          {mode === 'multiple' && (
            <div className="px-2 py-1.5 border-b border-slate-800 bg-slate-900/50">
              <button
                type="button"
                onClick={handleSelectAll}
                className="w-full text-left px-2 py-1 text-[11px] text-cyan-400 hover:text-cyan-300 transition-colors font-medium flex items-center"
              >
                <div className={`w-3.5 h-3.5 rounded border border-cyan-500/50 mr-2 flex items-center justify-center ${localSelected.length === empresas.length ? 'bg-cyan-500/10' : ''}`}>
                  {localSelected.length === empresas.length && <Check className="w-2.5 h-2.5" />}
                </div>
                {localSelected.length === empresas.length
                  ? 'Desmarcar todas'
                  : 'Selecionar todas'}
              </button>
            </div>
          )}

          <div className="max-h-60 overflow-y-auto custom-scrollbar">
            {filteredEmpresas.length === 0 ? (
              <div className="p-4 text-center text-slate-500 text-xs italic">
                {searchTerm ? 'Nenhuma empresa encontrada' : 'Nenhuma empresa disponível'}
              </div>
            ) : (
              filteredEmpresas.map((empresa) => {
                const isSelected = localSelected.includes(empresa.id_empresa);
                const nomeEmpresa = empresa.ds_empresa;

                return (
                  <button
                    key={empresa.id_empresa}
                    type="button"
                    onClick={() => handleToggleEmpresa(empresa.id_empresa)}
                    className="w-full flex items-center px-3 py-2 hover:bg-slate-800/80 transition-colors group"
                  >
                    <div
                      className={`w-4 h-4 rounded border flex items-center justify-center mr-3 transition-all ${isSelected
                        ? 'bg-cyan-600 text-white border-cyan-500 shadow-[0_0_8px_rgba(8,145,178,0.3)]'
                        : 'border-slate-700 bg-slate-900 group-hover:border-slate-500'
                        }`}
                    >
                      {isSelected && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <span
                      className={`text-xs truncate ${isSelected ? 'text-white font-medium' : 'text-slate-400 group-hover:text-slate-200'
                        }`}
                    >
                      {nomeEmpresa}
                    </span>
                  </button>
                );
              })
            )}
          </div>

          <div className="p-2 border-t border-slate-800 bg-slate-900/80">
            <div className="text-[10px] text-slate-500 text-center font-medium">
              {empresas.length} {empresas.length === 1 ? 'empresa' : 'empresas'} no total
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
