import React, { useState, useRef, useEffect } from 'react';
import { Upload, FileSpreadsheet, CheckCircle, XCircle, Building2, AlertTriangle, ChevronDown, ChevronRight, Copy, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Empresa } from '../../types/database';
import { CompanyListbox } from '../Dashboard/CompanyListbox';

type FileType = 'vendas' | 'produtos' | 'ordem_servico';

interface FileWithType {
  file: File;
  type: FileType | null;
}

interface ErrorRecord {
  arquivo: string;
  linha?: number;
  coluna?: string;
  valor?: any;
  descricao: string;
}

interface ProcessingResult {
  status: 'sucesso' | 'falha';
  total_vendas: number;
  total_produtos: number;
  total_ordens_servico: number;
  erros: ErrorRecord[];
  message?: string;
}

const FileTypeSelector: React.FC<{
  value: FileType | null;
  options: { value: FileType; label: string }[];
  onChange: (value: FileType) => void;
  placeholder?: string;
}> = ({ value, options, onChange, placeholder = "Tipo..." }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  const selectedOption = options.find(o => o.value === value);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between bg-slate-800/50 border border-white/5 text-[10px] text-white rounded-lg pl-3 pr-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-all font-medium hover:bg-slate-800/80"
      >
        <span className={!selectedOption ? "text-slate-500" : ""}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown className={`w-3 h-3 text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-[100] w-full mt-1 bg-slate-900 border border-white/5 rounded-lg shadow-2xl overflow-hidden ring-1 ring-black/5 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="py-1">
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className="w-full px-3 py-2 text-[10px] text-left text-slate-400 hover:text-white hover:bg-indigo-500/20 transition-colors flex items-center justify-between group"
              >
                <span>{option.label}</span>
                {value === option.value && <div className="w-1 h-1 rounded-full bg-indigo-500" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};


export const UploadPage: React.FC = () => {
  const [dragging, setDragging] = useState(false);
  const [files, setFiles] = useState<FileWithType[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [empresaSelecionada, setEmpresaSelecionada] = useState<string[]>([]);
  const [loadingEmpresas, setLoadingEmpresas] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<ProcessingResult | null>(null);
  const [expandedErrors, setExpandedErrors] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadEmpresas();
  }, []);

  const loadEmpresas = async () => {
    try {
      setLoadingEmpresas(true);
      const { data, error } = await supabase
        .from('empresas')
        .select('*')
        .eq('ativo', true)
        .order('ds_empresa', { ascending: true });

      if (error) throw error;
      setEmpresas(data || []);
    } catch (error) {
      console.error('Error loading empresas:', error);
    } finally {
      setLoadingEmpresas(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragging(true);
    } else if (e.type === 'dragleave') {
      setDragging(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    processFiles(droppedFiles);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      processFiles(selectedFiles);
    }
  };

  const processFiles = (fileList: File[]) => {
    const validFiles = fileList.filter(file => {
      const ext = file.name.split('.').pop()?.toLowerCase();
      return ext === 'xls' || ext === 'xlsx';
    });

    if (validFiles.length === 0) return;

    const newFiles = validFiles.slice(0, 3 - files.length).map(file => ({
      file,
      type: null as FileType | null
    }));

    setFiles(prev => [...prev, ...newFiles].slice(0, 3));
  };

  const updateFileType = (index: number, type: FileType) => {
    setFiles(prev => {
      const updated = [...prev];
      const oldType = updated[index].type;

      if (oldType) {
        const otherWithSameType = updated.findIndex((f, i) => i !== index && f.type === oldType);
        if (otherWithSameType === -1) {
          updated.forEach((f, i) => {
            if (i !== index && f.type === type) {
              f.type = oldType;
            }
          });
        }
      }

      updated.forEach((f, i) => {
        if (i !== index && f.type === type) {
          f.type = null;
        }
      });

      updated[index].type = type;
      return updated;
    });
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const getFileTypeLabel = (type: FileType): string => {
    const labels: Record<FileType, string> = {
      vendas: 'Vendas',
      produtos: 'Produtos',
      ordem_servico: 'Ordem de Serviço'
    };
    return labels[type];
  };

  const getAvailableTypes = (currentType: FileType | null): FileType[] => {
    const allTypes: FileType[] = ['vendas', 'produtos', 'ordem_servico'];
    const usedTypes = files.filter(f => f.type !== currentType).map(f => f.type);
    return allTypes.filter(type => !usedTypes.includes(type));
  };

  const areAllFilesReady = (): boolean => {
    if (files.length !== 3) return false;
    const types = files.map(f => f.type);
    return types.includes('vendas') && types.includes('produtos') && types.includes('ordem_servico');
  };

  const handleUpload = async () => {
    if (!areAllFilesReady() || empresaSelecionada.length === 0) return;

    try {
      setUploading(true);
      setResult(null);

      const empresa = empresas.find(e => e.id_empresa === empresaSelecionada[0]);
      if (!empresa) throw new Error('Empresa não encontrada');

      const formData = new FormData();
      formData.append('ds_empresa', empresa.ds_empresa);

      files.forEach(({ file, type }) => {
        if (type) {
          formData.append(type, file);
        }
      });

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Sessão não encontrada');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-excel-import-bundle`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: formData
        }
      );

      const resultData: ProcessingResult = await response.json();
      setResult(resultData);

      if (resultData.status === 'sucesso') {
        setFiles([]);
      }
    } catch (error) {
      console.error('Erro ao processar upload:', error);
      setResult({
        status: 'falha',
        total_vendas: 0,
        total_produtos: 0,
        total_ordens_servico: 0,
        erros: [{
          arquivo: '',
          descricao: error instanceof Error ? error.message : 'Erro desconhecido ao processar arquivos'
        }]
      });
    } finally {
      setUploading(false);
    }
  };

  const toggleErrorExpansion = (arquivo: string) => {
    setExpandedErrors(prev => {
      const newSet = new Set(prev);
      if (newSet.has(arquivo)) {
        newSet.delete(arquivo);
      } else {
        newSet.add(arquivo);
      }
      return newSet;
    });
  };

  const copyErrorsToClipboard = () => {
    if (!result?.erros) return;
    const errorsText = result.erros.map(e =>
      `${e.arquivo}${e.linha ? ` (linha ${e.linha})` : ''}${e.coluna ? ` [${e.coluna}]` : ''}: ${e.descricao}`
    ).join('\n');
    navigator.clipboard.writeText(errorsText);
  };

  const groupedErrors = result?.erros.reduce((acc, error) => {
    const key = error.arquivo || 'Geral';
    if (!acc[key]) acc[key] = [];
    acc[key].push(error);
    return acc;
  }, {} as Record<string, ErrorRecord[]>);

  return (
    <div className="space-y-6">
      <div className="relative z-20 bg-slate-900/40 backdrop-blur-md border border-white/5 rounded-xl px-4 py-2.5 mb-6 shadow-sm">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Building2 className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 whitespace-nowrap">
              Empresa
            </span>
          </div>

          <div className="h-6 w-px bg-slate-800" />

          <div className="flex-1 max-w-sm">
            {loadingEmpresas ? (
              <div className="flex items-center h-8">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-500"></div>
              </div>
            ) : (
              <CompanyListbox
                empresas={empresas}
                empresasSelecionadas={empresaSelecionada}
                onSelectionChange={setEmpresaSelecionada}
                mode="single"
              />
            )}
          </div>

          <div className="flex-1" />

          <div className="flex items-center space-x-2 text-[10px] font-bold text-slate-600 uppercase tracking-widest px-3 py-1 bg-white/[0.02] border border-white/5 rounded-lg">
            <div className="w-1 h-1 rounded-full bg-indigo-500" />
            <span>Seleção Necessária</span>
          </div>
        </div>
      </div>

      <div
        className={`relative overflow-hidden bg-white/[0.01] border border-dashed rounded-2xl transition-all duration-500 group/drop ${empresaSelecionada.length === 0
          ? 'border-white/5 opacity-50 cursor-not-allowed'
          : files.length >= 3
            ? 'border-emerald-500/20 bg-emerald-500/5'
            : dragging
              ? 'border-indigo-500/50 bg-indigo-500/10'
              : 'border-white/10 hover:border-indigo-500/30 hover:bg-white/[0.02]'
          }`}
        onDragEnter={empresaSelecionada.length > 0 && files.length < 3 ? handleDrag : undefined}
        onDragLeave={empresaSelecionada.length > 0 && files.length < 3 ? handleDrag : undefined}
        onDragOver={empresaSelecionada.length > 0 && files.length < 3 ? handleDrag : undefined}
        onDrop={empresaSelecionada.length > 0 && files.length < 3 ? handleDrop : undefined}
      >
        <div className="p-8 flex flex-col items-center justify-center space-y-4 relative z-10">
          <div className={`p-4 rounded-2xl transition-all duration-500 ${dragging
            ? 'bg-indigo-500 text-white scale-105 shadow-lg shadow-indigo-500/20'
            : files.length >= 3
              ? 'bg-emerald-500/10 text-emerald-400'
              : 'bg-white/5 text-slate-400 group-hover/drop:text-indigo-400 group-hover/drop:bg-indigo-500/10'
            }`}>
            {files.length >= 3 ? <CheckCircle className="w-8 h-8" /> : <Upload className="w-8 h-8" />}
          </div>

          <div className="text-center">
            {empresaSelecionada.length === 0 ? (
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-400">Upload Bloqueado</h3>
                <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">Selecione uma empresa para habilitar</p>
              </div>
            ) : files.length >= 3 ? (
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white">Pronto para processar</h3>
                <p className="text-[10px] text-emerald-500/60 font-bold uppercase tracking-widest">Os 3 arquivos foram carregados</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-white group-hover/drop:text-indigo-50 transition-colors">
                    {dragging ? 'Solte os arquivos agora' : 'Arraste os arquivos aqui'}
                  </h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                    {files.length === 0
                      ? '3 arquivos Excel obrigatórios (Vendas, Produtos, OS)'
                      : `Arquivo(s) adicionado(s): ${files.length}/3`}
                  </p>
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-6 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg font-bold text-xs border border-white/10 transition-all"
                >
                  Procurar Arquivos
                </button>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".xls,.xlsx"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          <div className="flex items-center space-x-4 text-[9px] font-bold text-slate-600 uppercase tracking-widest">
            <span className="flex items-center space-x-1.5">
              <div className="w-1 h-1 rounded-full bg-slate-800" />
              <span>XLS, XLSX</span>
            </span>
            <span className="flex items-center space-x-1.5">
              <div className="w-1 h-1 rounded-full bg-slate-800" />
              <span>Bundle de 3</span>
            </span>
          </div>
        </div>
      </div>


      {files.length > 0 && (
        <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <FileSpreadsheet className="w-4 h-4 text-indigo-400" />
              <h3 className="text-sm font-bold text-white tracking-tight">Arquivos Selecionados</h3>
            </div>
            <span className="text-[9px] bg-indigo-500/10 text-indigo-400 font-bold px-2 py-0.5 rounded-full border border-indigo-500/20 uppercase tracking-widest">{files.length}/3</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            {files.map((fileWithType, index) => (
              <div key={index} className="bg-white/[0.02] border border-white/5 rounded-xl p-3 group/file hover:bg-white/[0.04] transition-all">
                <div className="flex flex-col space-y-3">
                  <div className="flex items-start justify-between min-w-0">
                    <div className="flex-1 min-w-0">
                      <span className="text-xs text-white font-bold block truncate" title={fileWithType.file.name}>{fileWithType.file.name}</span>
                      <span className="text-[9px] text-slate-500 font-bold uppercase tracking-tight">{(fileWithType.file.size / 1024).toFixed(1)} KB</span>
                    </div>
                    <button
                      onClick={() => removeFile(index)}
                      className="p-1.5 text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <FileTypeSelector
                    value={fileWithType.type}
                    onChange={(val) => updateFileType(index, val)}
                    options={getAvailableTypes(fileWithType.type).map(type => ({
                      value: type,
                      label: getFileTypeLabel(type)
                    }))}
                  />

                </div>
              </div>
            ))}
          </div>

          {!areAllFilesReady() ? (
            <div className="bg-amber-500/5 border border-amber-500/10 rounded-lg p-3 flex items-center space-x-3">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
              <p className="text-[10px] text-slate-400 font-medium">
                {files.length < 3
                  ? `Adicione mais ${3 - files.length} arquivo(s) para completar o bundle.`
                  : 'Selecione o tipo para cada arquivo.'}
              </p>
            </div>
          ) : (
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs transition-all disabled:opacity-50 disabled:grayscale flex items-center justify-center space-x-2"
            >
              {uploading ? (
                <>
                  <div className="animate-spin rounded-full h-3 w-3 border-2 border-white/30 border-t-white"></div>
                  <span className="uppercase tracking-widest">Processando...</span>
                </>
              ) : (
                <>
                  <Upload className="w-3.5 h-3.5" />
                  <span className="uppercase tracking-widest">Processar Bundle</span>
                </>
              )}
            </button>
          )}
        </div>
      )}


      {result && result.status === 'sucesso' && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-3xl p-8 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-[50px] group-hover:bg-emerald-500/20 transition-all duration-500" />

          <div className="flex items-center space-x-4 mb-6 relative z-10">
            <div className="bg-emerald-500/20 p-2.5 rounded-xl border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
              <CheckCircle className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">Importação finalizada!</h3>
              <p className="text-[10px] font-bold text-emerald-500/80 uppercase tracking-widest mt-0.5">Bundle processado com sucesso</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative z-10">
            {[
              { label: 'Vendas Importadas', value: result.total_vendas, color: 'emerald' },
              { label: 'Produtos Processados', value: result.total_produtos, color: 'emerald' },
              { label: 'Ordens de Serviço', value: result.total_ordens_servico, color: 'emerald' }
            ].map((stat, i) => (
              <div key={i} className="bg-white/[0.03] border border-white/5 rounded-2xl p-5 hover:bg-white/[0.05] transition-all">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">{stat.label}</p>
                <p className="text-3xl font-black text-white tracking-tighter">{stat.value}</p>
              </div>
            ))}
          </div>

          {result.message && (
            <p className="text-xs text-emerald-400/80 font-medium mt-6 relative z-10 bg-emerald-500/5 px-4 py-2 rounded-lg inline-block">{result.message}</p>
          )}
        </div>
      )}

      {result && result.erros.length > 0 && (
        <div className="bg-rose-500/5 border border-rose-500/10 rounded-3xl p-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-4">
              <div className="bg-rose-500/20 p-2.5 rounded-xl border border-rose-500/20">
                <XCircle className="w-6 h-6 text-rose-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white tracking-tight">Erros detectados</h3>
                <p className="text-[10px] font-bold text-rose-500/80 uppercase tracking-widest mt-0.5">{result.erros.length} inconsistências no bundle</p>
              </div>
            </div>
            <button
              onClick={copyErrorsToClipboard}
              className="flex items-center space-x-2 px-4 py-2 bg-white/[0.03] border border-white/5 rounded-xl text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-white hover:bg-white/[0.08] transition-all"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Copiar Lista</span>
            </button>
          </div>

          <div className="space-y-4">
            {Object.entries(groupedErrors || {}).map(([arquivo, erros]) => (
              <div key={arquivo} className="bg-white/[0.02] border border-white/5 rounded-2xl overflow-hidden transition-all hover:bg-white/[0.03]">
                <button
                  onClick={() => toggleErrorExpansion(arquivo)}
                  className="w-full flex items-center justify-between p-5 text-left"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center border border-rose-500/10">
                      <FileSpreadsheet className="w-4 h-4 text-rose-400" />
                    </div>
                    <div>
                      <span className="text-sm font-bold text-white block">{arquivo}</span>
                      <span className="text-[10px] font-bold text-rose-500/60 uppercase tracking-widest">{erros.length} Erros encontrados</span>
                    </div>
                  </div>
                  <div className={`p-2 rounded-lg transition-all ${expandedErrors.has(arquivo) ? 'bg-indigo-500/10 text-indigo-400' : 'text-slate-600'}`}>
                    {expandedErrors.has(arquivo) ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </div>
                </button>

                {expandedErrors.has(arquivo) && (
                  <div className="px-5 pb-5 space-y-3">
                    {erros.map((erro, idx) => (
                      <div key={idx} className="bg-black/20 border border-rose-500/5 rounded-xl p-4">
                        <div className="flex items-start space-x-3">
                          <AlertTriangle className="w-4 h-4 text-rose-500/50 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-xs text-slate-300 font-medium leading-relaxed">{erro.descricao}</p>
                            <div className="flex items-center space-x-4 mt-3">
                              {erro.linha && (
                                <span className="text-[9px] font-bold text-slate-500 bg-slate-800/50 px-2 py-0.5 rounded uppercase tracking-tighter">Linha {erro.linha}</span>
                              )}
                              {erro.coluna && (
                                <span className="text-[9px] font-bold text-indigo-500/60 bg-indigo-500/5 px-2 py-0.5 rounded uppercase tracking-tighter">Col: {erro.coluna}</span>
                              )}
                              {erro.valor && (
                                <span className="text-[9px] font-medium text-slate-600 truncate max-w-[200px]">Val: {String(erro.valor)}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { title: 'Vendas', desc: 'Consolidado de vendas por período.', icon: FileSpreadsheet, color: 'emerald' },
          { title: 'Produtos', desc: 'Mestre de produtos e movimentação.', icon: FileSpreadsheet, color: 'indigo' },
          { title: 'Ordem de Serviço', desc: 'Registros de atendimentos e serviços.', icon: FileSpreadsheet, color: 'amber' }
        ].map((tipo, i) => (
          <div key={i} className="bg-white/[0.01] border border-white/5 rounded-xl p-4 hover:bg-white/[0.02] transition-all group">
            <div className="flex items-center space-x-3 mb-2">
              <div className={`p-2 rounded-lg bg-${tipo.color}-500/10 border border-${tipo.color}-500/20`}>
                <tipo.icon className={`w-3.5 h-3.5 text-${tipo.color}-400`} />
              </div>
              <h3 className="text-sm font-bold text-white">{tipo.title}</h3>
            </div>
            <p className="text-[10px] text-slate-500 font-medium leading-relaxed mb-3">
              {tipo.desc}
            </p>
            <div className="flex items-center space-x-2">
              <div className="w-1 h-1 rounded-full bg-slate-800" />
              <span className="text-[8px] font-bold text-slate-600 uppercase tracking-widest">Obrigatório</span>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
};
