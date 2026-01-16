import React, { useState, useEffect } from 'react';
import { Building2, Plus, Edit2, Trash2, Search, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Empresa, GrupoEconomico } from '../../types/database';
import { ProtectedAction } from '../Common/ProtectedAction';
import { GrupoEconomicoCombobox } from '../Common/GrupoEconomicoCombobox';
import { GrupoEconomicoModal } from '../Common/GrupoEconomicoModal';

export const EmpresasPage: React.FC = () => {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [gruposEconomicos, setGruposEconomicos] = useState<GrupoEconomico[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showGrupoModal, setShowGrupoModal] = useState(false);
  const [editingEmpresa, setEditingEmpresa] = useState<Empresa | null>(null);
  const [deletingEmpresa, setDeletingEmpresa] = useState<Empresa | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [formData, setFormData] = useState({
    cnpj: '',
    ds_empresa: '',
    telefone: '',
    email: '',
    grupoeco_id: null as string | null,
    ativo: true
  });
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadGruposEconomicos();
    loadEmpresas();
  }, []);

  const loadGruposEconomicos = async () => {
    try {
      const { data, error } = await supabase
        .from('tbl_grupos_economicos')
        .select('*')
        .order('ds_grupo', { ascending: true });

      if (error) throw error;
      setGruposEconomicos(data || []);
    } catch (error) {
      console.error('Erro ao carregar grupos econômicos:', error);
    }
  };

  const loadEmpresas = async (searchQuery?: string) => {
    setLoading(true);
    try {
      let query = supabase
        .from('empresas')
        .select('*, tbl_grupos_economicos(*)');

      if (searchQuery && searchQuery.trim()) {
        query = query.or(`ds_empresa.ilike.%${searchQuery}%,cnpj.like.%${searchQuery}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      setEmpresas(data || []);
      setHasSearched(true);
    } catch (error) {
      console.error('Erro ao carregar empresas:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    loadEmpresas(searchTerm);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // Filtragem local apenas se as empresas já foram carregadas
  const filteredEmpresas = hasSearched && empresas.length > 0
    ? empresas.filter(empresa =>
      empresa.ds_empresa.toLowerCase().includes(searchTerm.toLowerCase()) ||
      empresa.cnpj.includes(searchTerm)
    )
    : empresas;

  const formatCNPJ = (cnpj: string) => {
    return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  };

  const handleOpenEdit = (empresa: Empresa) => {
    setEditingEmpresa(empresa);
    setFormData({
      cnpj: formatCNPJ(empresa.cnpj),
      ds_empresa: empresa.ds_empresa,
      telefone: empresa.telefone || '',
      email: empresa.email || '',
      grupoeco_id: empresa.grupoeco_id || null,
      ativo: empresa.ativo
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingEmpresa(null);
    setFormError('');
    setFormData({
      cnpj: '',
      ds_empresa: '',
      telefone: '',
      email: '',
      grupoeco_id: null,
      ativo: true
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);

    try {
      const cnpjLimpo = formData.cnpj.replace(/\D/g, '');

      if (cnpjLimpo.length !== 14) {
        throw new Error('CNPJ deve ter 14 dígitos');
      }

      const empresaData = {
        cnpj: cnpjLimpo,
        ds_empresa: formData.ds_empresa,
        telefone: formData.telefone,
        email: formData.email || null,
        grupoeco_id: formData.grupoeco_id,
        ativo: formData.ativo
      };

      if (editingEmpresa) {
        const { error } = await supabase
          .from('empresas')
          .update(empresaData)
          .eq('id_empresa', editingEmpresa.id_empresa);

        if (error) throw error;
      } else {
        const { error } = await supabase.from('empresas').insert(empresaData);
        if (error) throw error;
      }

      await loadEmpresas();
      handleCloseModal();
    } catch (error: any) {
      setFormError(error.message || 'Erro ao salvar empresa');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingEmpresa) return;
    setSubmitting(true);

    try {
      const { error } = await supabase
        .from('empresas')
        .delete()
        .eq('id_empresa', deletingEmpresa.id_empresa);

      if (error) throw error;

      await loadEmpresas();
      setShowDeleteModal(false);
      setDeletingEmpresa(null);
    } catch (error: any) {
      setFormError(error.message || 'Erro ao excluir empresa');
    } finally {
      setSubmitting(false);
    }
  };

  const formatCNPJInput = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 14) {
      return numbers.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
    return value;
  };

  const handleGrupoCreated = async (grupoUuid: string) => {
    await loadGruposEconomicos();
    setFormData({ ...formData, grupoeco_id: grupoUuid });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <ProtectedAction requiredPermission="edit">
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-amber-600 to-orange-700 text-white rounded-lg hover:shadow-lg hover:shadow-orange-500/20 transition-all font-medium text-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Empresa</span>
          </button>
        </ProtectedAction>
      </div>

      <div className="bg-[#1E293B] border border-[#0F4C5C]/20 rounded-xl p-6">
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Filtrar por nome ou CNPJ..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full pl-10 pr-12 py-2 bg-white/[0.02] border border-white/5 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-white/10 transition-all text-sm"
          />
          <button
            onClick={handleSearch}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-white transition-colors"
            title="Buscar"
          >
            <Search className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-400">Carregando...</div>
        ) : !hasSearched ? (
          <div className="text-center py-12 text-gray-400">
            <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Digite um termo de busca e pressione Enter para buscar empresas</p>
            <p className="text-sm mt-2">Pressione Enter com a busca vazia para ver todas as empresas</p>
          </div>
        ) : filteredEmpresas.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p>Nenhuma empresa encontrada</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEmpresas.map((empresa) => (
              <div key={empresa.id_empresa} className="bg-white/[0.03] border border-white/5 rounded-2xl p-6 hover:bg-white/[0.04] hover:border-white/10 transition-all group relative overflow-hidden">
                {/* Glow effect on hover */}
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-amber-500/5 blur-[80px] group-hover:bg-amber-500/10 transition-all duration-500" />

                <div className="flex items-start justify-between mb-5 relative z-10">
                  <div className="bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20 shadow-inner">
                    <Building2 className="w-5 h-5 text-amber-400" />
                  </div>
                  <div className="flex items-center space-x-1 translate-x-2 -translate-y-2">
                    <ProtectedAction requiredPermission="edit">
                      <button
                        onClick={() => handleOpenEdit(empresa)}
                        className="p-2 text-slate-500 hover:text-amber-400 hover:bg-amber-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                        title="Editar"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </ProtectedAction>
                    <ProtectedAction requiredPermission="delete">
                      <button
                        onClick={() => {
                          setDeletingEmpresa(empresa);
                          setShowDeleteModal(true);
                        }}
                        className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </ProtectedAction>
                  </div>
                </div>

                <div className="relative z-10">
                  <h3 className="text-lg font-bold text-white mb-1 group-hover:text-amber-50 transition-colors tracking-tight truncate">
                    {empresa.ds_empresa}
                  </h3>
                  <div className="flex items-center space-x-2 mb-6">
                    <span className="text-[10px] font-mono font-bold text-slate-500 px-1.5 py-0.5 bg-slate-800 rounded border border-white/5">
                      {formatCNPJ(empresa.cnpj)}
                    </span>
                    {empresa.tbl_grupos_economicos && (
                      <span className="text-[10px] font-bold text-amber-500/80 uppercase tracking-tight">
                        • {empresa.tbl_grupos_economicos.ds_grupo}
                      </span>
                    )}
                  </div>

                  <div className="space-y-3 mb-6">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Contato</span>
                      <div className="flex flex-col items-end">
                        <span className="text-xs text-slate-300 font-medium">{empresa.telefone || '—'}</span>
                        <span className="text-[10px] text-slate-500 truncate max-w-[150px]">{empresa.email || '—'}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Status</span>
                      <div className="flex items-center space-x-2">
                        <div className={`w-1 h-1 rounded-full ${empresa.ativo ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-700'}`} />
                        <span className={`text-[10px] font-bold uppercase tracking-widest ${empresa.ativo ? 'text-emerald-400' : 'text-slate-600'
                          }`}>
                          {empresa.ativo ? 'Ativa' : 'Inativa'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-white/5 flex items-center justify-between text-[10px] text-slate-600 font-bold uppercase tracking-tight">
                    <span>ID: {empresa.id_empresa.split('-')[0]}</span>
                    <span>Desde {new Date(empresa.created_at).toLocaleDateString('pt-BR')}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-[#1E293B] border border-[#0F4C5C]/30 rounded-xl max-w-md w-full p-6 my-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">
                {editingEmpresa ? 'Editar Empresa' : 'Nova Empresa'}
              </h3>
              <button
                onClick={handleCloseModal}
                className="p-2 text-gray-400 hover:text-white hover:bg-[#0F172A] rounded-lg transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  CNPJ
                </label>
                <input
                  type="text"
                  value={formData.cnpj}
                  onChange={(e) => setFormData({ ...formData, cnpj: formatCNPJInput(e.target.value) })}
                  className="w-full px-4 py-2 bg-[#0F172A] border border-[#0F4C5C]/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#0F4C5C]"
                  placeholder="00.000.000/0000-00"
                  required
                  maxLength={18}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Nome da Empresa
                </label>
                <input
                  type="text"
                  value={formData.ds_empresa}
                  onChange={(e) => setFormData({ ...formData, ds_empresa: e.target.value })}
                  className="w-full px-4 py-2 bg-[#0F172A] border border-[#0F4C5C]/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#0F4C5C]"
                  placeholder="Nome da empresa"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Telefone
                </label>
                <input
                  type="tel"
                  value={formData.telefone}
                  onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                  className="w-full px-4 py-2 bg-[#0F172A] border border-[#0F4C5C]/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#0F4C5C]"
                  placeholder="(00) 00000-0000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 bg-[#0F172A] border border-[#0F4C5C]/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#0F4C5C]"
                  placeholder="email@empresa.com.br"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Grupo Económico
                </label>
                <div className="flex items-center space-x-2">
                  <div className="flex-1">
                    <GrupoEconomicoCombobox
                      grupos={gruposEconomicos}
                      grupoSelecionado={formData.grupoeco_id}
                      onSelectionChange={(uuid) => setFormData({ ...formData, grupoeco_id: uuid })}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowGrupoModal(true)}
                    className="px-3 py-2 bg-[#0F4C5C]/20 border border-[#0F4C5C]/30 text-[#0F4C5C] rounded-lg hover:bg-[#0F4C5C]/30 hover:border-[#0F4C5C]/50 transition-all"
                    title="Cadastrar novo grupo"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="ativo"
                  checked={formData.ativo}
                  onChange={(e) => setFormData({ ...formData, ativo: e.target.checked })}
                  className="w-4 h-4 bg-[#0F172A] border-[#0F4C5C]/30 rounded focus:ring-2 focus:ring-[#0F4C5C]"
                />
                <label htmlFor="ativo" className="text-sm text-gray-300">
                  Empresa ativa
                </label>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 px-4 py-2 bg-[#0F172A] border border-[#0F4C5C]/30 text-white rounded-lg hover:bg-[#0F172A]/80 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-[#FB8B24] to-[#E36414] text-white rounded-lg hover:shadow-lg hover:shadow-[#FB8B24]/50 transition-all disabled:opacity-50"
                >
                  {submitting ? (editingEmpresa ? 'Salvando...' : 'Criando...') : (editingEmpresa ? 'Salvar' : 'Criar Empresa')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <GrupoEconomicoModal
        isOpen={showGrupoModal}
        onClose={() => setShowGrupoModal(false)}
        onSuccess={handleGrupoCreated}
        grupos={gruposEconomicos}
        onRefresh={loadGruposEconomicos}
      />

      {showDeleteModal && deletingEmpresa && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1E293B] border border-[#9A031E]/30 rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">Excluir Empresa</h3>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeletingEmpresa(null);
                }}
                className="p-2 text-gray-400 hover:text-white hover:bg-[#0F172A] rounded-lg transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-gray-300 mb-6">
              Tem certeza que deseja excluir a empresa{' '}
              <span className="font-bold text-white">
                {deletingEmpresa.ds_empresa}
              </span>?
              Esta ação não pode ser desfeita.
            </p>

            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeletingEmpresa(null);
                }}
                className="flex-1 px-4 py-2 bg-[#0F172A] border border-[#0F4C5C]/30 text-white rounded-lg hover:bg-[#0F172A]/80 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={submitting}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-[#9A031E] to-[#9A031E] text-white rounded-lg hover:shadow-lg hover:shadow-[#9A031E]/50 transition-all disabled:opacity-50"
              >
                {submitting ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
