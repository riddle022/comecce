import React, { useState, useEffect } from 'react';
import { History, Trash2, Building2, FileSpreadsheet, AlertCircle, CheckCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Empresa, HistoricoUpload } from '../../types/database';
import { CompanyListbox } from '../Dashboard/CompanyListbox';

export const HistorialPage: React.FC = () => {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [empresasSelecionadas, setEmpresasSelecionadas] = useState<string[]>([]);
  const [historico, setHistorico] = useState<HistoricoUpload[]>([]);
  const [loadingEmpresas, setLoadingEmpresas] = useState(true);
  const [loadingHistorico, setLoadingHistorico] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [filtroTipo, setFiltroTipo] = useState<string>('todos');
  const [dataInicio, setDataInicio] = useState<string>('');
  const [dataFim, setDataFim] = useState<string>('');
  const [paginaAtual, setPaginaAtual] = useState(0);
  const [totalRegistros, setTotalRegistros] = useState(0);
  const ITENS_POR_PAGINA = 5;

  useEffect(() => {
    loadEmpresas();
  }, []);

  useEffect(() => {
    setPaginaAtual(0);
  }, [empresasSelecionadas, filtroTipo, dataInicio, dataFim]);

  useEffect(() => {
    if (empresasSelecionadas.length > 0) {
      loadHistorico();
    } else {
      setHistorico([]);
      setTotalRegistros(0);
    }
  }, [empresasSelecionadas, filtroTipo, dataInicio, dataFim, paginaAtual]);

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
      setErrorMessage('Erro ao carregar empresas');
    } finally {
      setLoadingEmpresas(false);
    }
  };

  const loadHistorico = async () => {
    try {
      setLoadingHistorico(true);
      setErrorMessage(null);

      let query = supabase
        .from('tbl_historico_uploads')
        .select(`
          *,
          empresas:id_empresa (
            id_empresa,
            ds_empresa,
            cnpj
          )
        `, { count: 'exact' })
        .in('id_empresa', empresasSelecionadas);

      if (filtroTipo !== 'todos') {
        if (filtroTipo === 'operacional') {
          query = query.or('tipo_importacao.is.null,tipo_importacao.ilike.operacional');
        } else if (filtroTipo === 'compras') {
          query = query.or('tipo_importacao.ilike.compras,tipo_importacao.ilike.financeiro');
        } else {
          query = query.ilike('tipo_importacao', filtroTipo);
        }
      }

      if (dataInicio) {
        const startDate = new Date(`${dataInicio}T00:00:00`);
        if (!isNaN(startDate.getTime())) {
          query = query.gte('data_upload', startDate.toISOString());
        }
      }

      if (dataFim) {
        const endDate = new Date(`${dataFim}T23:59:59.999`);
        if (!isNaN(endDate.getTime())) {
          query = query.lte('data_upload', endDate.toISOString());
        }
      }

      const from = paginaAtual * ITENS_POR_PAGINA;
      const to = from + ITENS_POR_PAGINA - 1;

      const { data, error, count } = await query
        .order('data_upload', { ascending: false })
        .range(from, to);

      if (error) throw error;
      setHistorico(data || []);
      setTotalRegistros(count || 0);
    } catch (error) {
      console.error('Error loading historico:', error);
      setErrorMessage('Erro ao carregar histórico de uploads');
    } finally {
      setLoadingHistorico(false);
    }
  };

  const handleDelete = async (id_upload: string) => {
    try {
      setDeletingId(id_upload);
      setErrorMessage(null);
      setSuccessMessage(null);

      const { error } = await supabase
        .from('tbl_historico_uploads')
        .delete()
        .eq('id_upload', id_upload);

      if (error) throw error;

      setSuccessMessage('Upload excluído com sucesso');
      setShowDeleteConfirm(null);
      await loadHistorico();

      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      console.error('Error deleting upload:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Erro ao excluir upload');
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      {errorMessage && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center space-x-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <p className="text-red-400 text-sm">{errorMessage}</p>
        </div>
      )}

      {successMessage && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 flex items-center space-x-3">
          <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
          <p className="text-green-400 text-sm">{successMessage}</p>
        </div>
      )}

      <div className="relative z-20 bg-slate-900/40 backdrop-blur-md border border-white/5 rounded-xl px-4 py-2.5 mb-6 shadow-sm">
        <div className="flex flex-wrap items-center gap-4 lg:gap-8">
          {/* Empresa Filter */}
          <div className="flex items-center space-x-4 min-w-[200px] flex-1 lg:flex-none">
            <div className="flex items-center space-x-2">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 whitespace-nowrap">
                Empresas
              </span>
            </div>
            <div className="flex-1 w-full lg:w-48">
              {loadingEmpresas ? (
                <div className="flex items-center h-8">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-500"></div>
                </div>
              ) : (
                <CompanyListbox
                  empresas={empresas}
                  empresasSelecionadas={empresasSelecionadas}
                  onSelectionChange={setEmpresasSelecionadas}
                  mode="multiple"
                />
              )}
            </div>
          </div>

          <div className="hidden lg:block h-6 w-px bg-slate-800" />

          {/* Tipo Filter */}
          <div className="flex items-center space-x-3">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 whitespace-nowrap">
              Tipo
            </span>
            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
              className="h-8 px-2 text-xs bg-slate-800/50 border border-slate-700/50 rounded-md text-white focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-all cursor-pointer hover:bg-slate-800"
            >
              <option value="todos">Todos</option>
              <option value="operacional">Operacional</option>
              <option value="compras">Contas a Pagar</option>
            </select>
          </div>

          <div className="hidden lg:block h-6 w-px bg-slate-800" />

          {/* Date Filter */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 whitespace-nowrap">
                De
              </span>
              <input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className="h-8 px-2 text-xs bg-slate-800/50 border border-slate-700/50 rounded-md text-white focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-all cursor-pointer hover:bg-slate-800"
              />
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 whitespace-nowrap">
                Até
              </span>
              <input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                className="h-8 px-2 text-xs bg-slate-800/50 border border-slate-700/50 rounded-md text-white focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-all cursor-pointer hover:bg-slate-800"
              />
            </div>
          </div>

          <div className="flex-1" />

          <div className="hidden sm:flex items-center space-x-2 text-[10px] font-bold text-slate-600 uppercase tracking-widest px-3 py-1 bg-white/[0.02] border border-white/5 rounded-lg">
            <div className="w-1 h-1 rounded-full bg-indigo-500" />
            <span>Filtro de Histórico</span>
          </div>
        </div>
      </div>

      {empresasSelecionadas.length === 0 ? (
        <div className="relative overflow-hidden bg-white/[0.01] border border-dashed border-white/10 rounded-2xl p-12">
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="bg-white/5 p-6 rounded-2xl text-slate-400">
              <History className="w-12 h-12" />
            </div>
            <div className="text-center">
              <h3 className="text-base font-bold text-white mb-1">
                Selecione uma empresa
              </h3>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                O histórico de uploads será exibido após selecionar uma ou mais empresas
              </p>
            </div>
          </div>
        </div>
      ) : loadingHistorico ? (
        <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-12">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
          </div>
        </div>
      ) : historico.length === 0 ? (
        <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-12">
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="bg-white/5 p-6 rounded-2xl text-slate-400">
              <FileSpreadsheet className="w-12 h-12" />
            </div>
            <div className="text-center">
              <h3 className="text-base font-bold text-white mb-1">
                Nenhum upload encontrado
              </h3>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                Ainda não há uploads registrados para as empresas selecionadas
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white/[0.01] border border-white/5 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-900/50 border-b border-white/5">
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">Data/Hora</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">Empresa</th>
                  <th className="px-4 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">Tipo</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">Arquivos</th>
                  <th className="px-4 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-widest text-center">Registros</th>
                  <th className="px-4 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-widest text-center">Status</th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-slate-400 uppercase tracking-widest">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.02]">
                {historico.map((item) => (
                  <tr key={item.id_upload} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-6 py-4 text-xs text-white whitespace-nowrap font-medium">
                      {formatDate(item.data_upload)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-xs text-white font-bold">
                          {item.empresas?.ds_empresa || 'N/A'}
                        </span>
                        <span className="text-[10px] text-slate-500 font-medium">
                          {item.empresas?.cnpj || ''}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase tracking-widest ${['compras', 'financeiro'].includes(item.tipo_importacao?.toLowerCase() || '')
                        ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        }`}>
                        {['compras', 'financeiro'].includes(item.tipo_importacao?.toLowerCase() || '') ? 'Contas a Pagar' : (item.tipo_importacao || 'Operacional')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col space-y-1">
                        {item.ds_arquivo && (
                          <div className="flex items-center space-x-2 text-[10px] text-slate-400">
                            <FileSpreadsheet className="w-3 h-3 text-indigo-400/50" />
                            <span className="truncate max-w-[200px] text-white font-medium" title={item.ds_arquivo}>
                              {item.ds_arquivo}
                            </span>
                          </div>
                        )}
                        {(item as any).arquivo_financeiro && (
                          <div className="flex items-center space-x-2 text-[10px] text-slate-400">
                            <FileSpreadsheet className="w-3 h-3 text-sky-500/50" />
                            <span className="truncate max-w-[200px] text-white font-medium" title={(item as any).arquivo_financeiro}>
                              {(item as any).arquivo_financeiro}
                            </span>
                          </div>
                        )}
                        {item.arquivo_vendas && (
                          <div className="flex items-center space-x-2 text-[10px] text-slate-400">
                            <FileSpreadsheet className="w-3 h-3 text-emerald-500/50" />
                            <span className="truncate max-w-[200px]" title={item.arquivo_vendas}>
                              {item.arquivo_vendas}
                            </span>
                          </div>
                        )}
                        {item.arquivo_produtos && (
                          <div className="flex items-center space-x-2 text-[10px] text-slate-400">
                            <FileSpreadsheet className="w-3 h-3 text-indigo-500/50" />
                            <span className="truncate max-w-[200px]" title={item.arquivo_produtos}>
                              {item.arquivo_produtos}
                            </span>
                          </div>
                        )}
                        {item.arquivo_os && (
                          <div className="flex items-center space-x-2 text-[10px] text-slate-400">
                            <FileSpreadsheet className="w-3 h-3 text-amber-500/50" />
                            <span className="truncate max-w-[200px]" title={item.arquivo_os}>
                              {item.arquivo_os}
                            </span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-xs text-center whitespace-nowrap">
                      {['financeiro', 'compras'].includes(item.tipo_importacao?.toLowerCase() || '') ? (
                        <div className="flex flex-col">
                          <span className="text-white font-black">
                            {(item as any).total_financeiro ?? item.total_registros ?? 0}
                          </span>
                          <span className="text-[8px] text-slate-500 font-bold uppercase">Contas</span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center space-x-3">
                          <div className="flex flex-col items-center">
                            <span className="text-white font-black">{item.total_vendas.toLocaleString()}</span>
                            <span className="text-[8px] text-slate-500 font-bold uppercase">Vendas</span>
                          </div>
                          <div className="flex flex-col items-center">
                            <span className="text-white font-black">{item.total_os.toLocaleString()}</span>
                            <span className="text-[8px] text-slate-500 font-bold uppercase">OS</span>
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-tight ${item.status.toLowerCase() === 'sucesso'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {showDeleteConfirm === item.id_upload ? (
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => handleDelete(item.id_upload)}
                            disabled={deletingId === item.id_upload}
                            className="px-3 py-1 bg-rose-600 text-white text-[10px] font-bold uppercase tracking-widest rounded-lg hover:bg-rose-500 transition-all disabled:opacity-50"
                          >
                            {deletingId === item.id_upload ? '...' : 'Confirmar'}
                          </button>
                          <button
                            onClick={() => setShowDeleteConfirm(null)}
                            disabled={deletingId === item.id_upload}
                            className="px-3 py-1 bg-white/5 text-slate-400 text-[10px] font-bold uppercase tracking-widest rounded-lg hover:bg-white/10 transition-all disabled:opacity-50"
                          >
                            X
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setShowDeleteConfirm(item.id_upload)}
                          disabled={deletingId !== null}
                          className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all disabled:opacity-50"
                          title="Excluir upload"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="bg-slate-900/50 border-t border-white/5 px-6 py-4 flex items-center justify-between">
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
              Mostrando {historico.length > 0 ? (paginaAtual * ITENS_POR_PAGINA) + 1 : 0} - {(paginaAtual * ITENS_POR_PAGINA) + historico.length} de {totalRegistros} registros
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setPaginaAtual(prev => Math.max(0, prev - 1))}
                disabled={paginaAtual === 0 || loadingHistorico}
                className="p-2 bg-white/5 text-slate-400 text-[10px] font-bold uppercase tracking-widest rounded-lg hover:bg-white/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 border border-white/5"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Anterior</span>
              </button>

              <div className="px-4 text-[10px] text-white font-bold uppercase tracking-widest">
                Página {paginaAtual + 1} de {Math.max(1, Math.ceil(totalRegistros / ITENS_POR_PAGINA))}
              </div>

              <button
                onClick={() => setPaginaAtual(prev => prev + 1)}
                disabled={paginaAtual >= Math.ceil(totalRegistros / ITENS_POR_PAGINA) - 1 || loadingHistorico}
                className="p-2 bg-white/5 text-slate-400 text-[10px] font-bold uppercase tracking-widest rounded-lg hover:bg-white/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 border border-white/5"
              >
                <span>Próximo</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {historico.length > 0 && (
        <div className="bg-amber-500/5 border border-amber-500/10 rounded-2xl p-6">
          <div className="flex items-start space-x-4">
            <div className="bg-amber-500/20 p-2 rounded-xl border border-amber-500/20">
              <AlertCircle className="w-5 h-5 text-amber-500" />
            </div>
            <div className="text-sm">
              <p className="text-xs font-bold text-white uppercase tracking-widest mb-1">Atenção</p>
              <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
                Ao excluir um upload, todos os dados relacionados (vendas e ordens de serviço) serão
                permanentemente removidos da base de dados. Esta ação não pode ser desfeita.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
