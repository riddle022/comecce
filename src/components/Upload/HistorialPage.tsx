import React, { useState, useEffect } from 'react';
import { History, Trash2, Building2, FileSpreadsheet, AlertCircle, CheckCircle } from 'lucide-react';
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

  useEffect(() => {
    loadEmpresas();
  }, []);

  useEffect(() => {
    if (empresasSelecionadas.length > 0) {
      loadHistorico();
    } else {
      setHistorico([]);
    }
  }, [empresasSelecionadas]);

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

      const { data, error } = await supabase
        .from('tbl_historico_uploads')
        .select(`
          *,
          empresas:id_empresa (
            id_empresa,
            ds_empresa,
            cnpj
          )
        `)
        .in('id_empresa', empresasSelecionadas)
        .order('data_upload', { ascending: false });

      if (error) throw error;
      setHistorico(data || []);
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
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Building2 className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 whitespace-nowrap">
              Empresas
            </span>
          </div>

          <div className="h-6 w-px bg-slate-800" />

          <div className="flex-1 max-w-md">
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

          <div className="flex-1" />

          <div className="flex items-center space-x-2 text-[10px] font-bold text-slate-600 uppercase tracking-widest px-3 py-1 bg-white/[0.02] border border-white/5 rounded-lg">
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
                  <th className="px-4 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-widest text-center">Registos</th>
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
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase tracking-widest ${item.tipo_importacao === 'Contas a Pagar'
                          ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        }`}>
                        {item.tipo_importacao || 'Operacional'}
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
                      {item.tipo_importacao === 'Contas a Pagar' ? (
                        <div className="flex flex-col">
                          <span className="text-white font-black">{item.total_registros || 0}</span>
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
