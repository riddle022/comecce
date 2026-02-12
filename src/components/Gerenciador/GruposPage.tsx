import React, { useState, useEffect } from 'react';
import { Shield, Plus, Edit2, Trash2, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Grupo } from '../../types/database';
import { ProtectedAction } from '../Common/ProtectedAction';

export const GruposPage: React.FC = () => {
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingGrupo, setEditingGrupo] = useState<Grupo | null>(null);
  const [deletingGrupo, setDeletingGrupo] = useState<Grupo | null>(null);
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    admin: false,
    edit_data: false,
    delete_data: false,
    menus: [] as string[]
  });
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadGrupos();
  }, []);

  const loadGrupos = async () => {
    try {
      const { data, error } = await supabase.from('grupos').select('*');
      if (error) throw error;
      setGrupos(data || []);
    } catch (error) {
      console.error('Erro ao carregar grupos:', error);
    } finally {
      setLoading(false);
    }
  };

  const availableMenus = [
    'dashboard',
    'comercial',
    'operacional',
    'compras',
    'produtos',
    'financeiro',
    'upload',
    'historial',
    'usuarios',
    'grupos',
    'empresas'
  ];

  const menuLabels: Record<string, string> = {
    dashboard: 'Dashboard',
    comercial: 'Comercial',
    operacional: 'Operacional',
    compras: 'Compras',
    produtos: 'Produtos',
    financeiro: 'Financeiro',
    upload: 'Upload',
    historial: 'Histórico',
    usuarios: 'Usuários',
    grupos: 'Grupos',
    empresas: 'Empresas'
  };

  const handleOpenEdit = (grupo: Grupo) => {
    setEditingGrupo(grupo);
    setFormData({
      nome: grupo.nome,
      descricao: grupo.descricao,
      admin: grupo.permissoes?.admin || false,
      edit_data: grupo.permissoes?.edit_data || false,
      delete_data: grupo.permissoes?.delete_data || false,
      menus: grupo.permissoes?.menus || []
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingGrupo(null);
    setFormError('');
    setFormData({
      nome: '',
      descricao: '',
      admin: false,
      edit_data: false,
      delete_data: false,
      menus: []
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);

    try {
      const grupoData = {
        nome: formData.nome,
        descricao: formData.descricao,
        permissoes: {
          admin: formData.admin,
          edit_data: formData.edit_data,
          delete_data: formData.delete_data,
          menus: formData.menus
        }
      };

      if (editingGrupo) {
        const { error } = await supabase
          .from('grupos')
          .update(grupoData)
          .eq('id', editingGrupo.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from('grupos').insert(grupoData);
        if (error) throw error;
      }

      await loadGrupos();
      handleCloseModal();
    } catch (error: any) {
      setFormError(error.message || 'Erro ao salvar grupo');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingGrupo) return;
    setSubmitting(true);

    try {
      const { error } = await supabase
        .from('grupos')
        .delete()
        .eq('id', deletingGrupo.id);

      if (error) throw error;

      await loadGrupos();
      setShowDeleteModal(false);
      setDeletingGrupo(null);
    } catch (error: any) {
      setFormError(error.message || 'Erro ao excluir grupo');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleMenu = (menu: string) => {
    setFormData(prev => ({
      ...prev,
      menus: prev.menus.includes(menu)
        ? prev.menus.filter(m => m !== menu)
        : [...prev.menus, menu]
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <ProtectedAction requiredPermission="edit">
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-cyan-700 text-white rounded-lg hover:shadow-lg hover:shadow-cyan-500/20 transition-all font-medium text-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Grupo</span>
          </button>
        </ProtectedAction>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full text-center py-12 text-gray-400">Carregando...</div>
        ) : (
          grupos.map((grupo) => (
            <div key={grupo.id} className="bg-white/[0.03] border border-white/5 rounded-2xl p-6 hover:bg-white/[0.04] hover:border-white/10 transition-all group relative overflow-hidden">
              {/* Glow effect on hover */}
              <div className="absolute -top-24 -right-24 w-48 h-48 bg-cyan-500/5 blur-[80px] group-hover:bg-cyan-500/10 transition-all duration-500" />

              <div className="flex items-start justify-between mb-5 relative z-10">
                <div className="bg-cyan-500/10 p-2.5 rounded-xl border border-cyan-500/20 shadow-inner">
                  <Shield className="w-5 h-5 text-cyan-400" />
                </div>
                <div className="flex items-center space-x-1 translate-x-2 -translate-y-2">
                  <ProtectedAction requiredPermission="edit">
                    <button
                      onClick={() => handleOpenEdit(grupo)}
                      className="p-2 text-slate-500 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                      title="Editar"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </ProtectedAction>
                  <ProtectedAction requiredPermission="delete">
                    <button
                      onClick={() => {
                        setDeletingGrupo(grupo);
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
                <h3 className="text-lg font-bold text-white mb-1 group-hover:text-cyan-50 group-transition-colors tracking-tight">
                  {grupo.nome}
                </h3>
                <p className="text-xs text-slate-400 mb-6 leading-relaxed line-clamp-2 min-h-[2.5rem]">
                  {grupo.descricao}
                </p>

                <div className="space-y-3 mb-6">
                  {[
                    { label: 'Administrador', value: grupo.permissoes?.admin },
                    { label: 'Editar Dados', value: grupo.permissoes?.edit_data },
                    { label: 'Excluir Dados', value: grupo.permissoes?.delete_data }
                  ].map((perm, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{perm.label}</span>
                      <div className="flex items-center space-x-2">
                        <div className={`w-1 h-1 rounded-full ${perm.value ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-700'}`} />
                        <span className={`text-[10px] font-bold uppercase tracking-widest ${perm.value ? 'text-emerald-400' : 'text-slate-600'
                          }`}>
                          {perm.value ? 'Ativo' : 'Inativo'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                  <div className="flex -space-x-1.5 overflow-hidden">
                    {grupo.permissoes?.menus?.slice(0, 4).map((menu, i) => (
                      <div key={i} title={menu} className="w-5 h-5 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-cyan-500/50" />
                      </div>
                    ))}
                    {(grupo.permissoes?.menus?.length || 0) > 4 && (
                      <div className="w-5 h-5 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center text-[8px] font-bold text-slate-400">
                        +{(grupo.permissoes?.menus?.length || 0) - 4}
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">
                    {grupo.permissoes?.menus?.length || 0} menus
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1E293B] border border-[#0F4C5C]/30 rounded-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">
                {editingGrupo ? 'Editar Grupo' : 'Novo Grupo'}
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

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Nome do Grupo
                </label>
                <input
                  type="text"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  className="w-full px-4 py-2 bg-[#0F172A] border border-[#0F4C5C]/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#0F4C5C]"
                  placeholder="Ex: Administrador"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Descrição
                </label>
                <textarea
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  className="w-full px-4 py-2 bg-[#0F172A] border border-[#0F4C5C]/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#0F4C5C] min-h-[80px]"
                  placeholder="Descreva as responsabilidades deste grupo"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Permissões
                </label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-3 p-3 bg-[#0F172A] rounded-lg">
                    <input
                      type="checkbox"
                      id="admin"
                      checked={formData.admin}
                      onChange={(e) => setFormData({ ...formData, admin: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <label htmlFor="admin" className="text-sm text-gray-300 flex-1">
                      <span className="font-medium">Administrador</span>
                      <p className="text-xs text-gray-500">Acesso total ao sistema</p>
                    </label>
                  </div>
                  <div className="flex items-center space-x-3 p-3 bg-[#0F172A] rounded-lg">
                    <input
                      type="checkbox"
                      id="edit_data"
                      checked={formData.edit_data}
                      onChange={(e) => setFormData({ ...formData, edit_data: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <label htmlFor="edit_data" className="text-sm text-gray-300 flex-1">
                      <span className="font-medium">Editar Dados</span>
                      <p className="text-xs text-gray-500">Pode modificar informações</p>
                    </label>
                  </div>
                  <div className="flex items-center space-x-3 p-3 bg-[#0F172A] rounded-lg">
                    <input
                      type="checkbox"
                      id="delete_data"
                      checked={formData.delete_data}
                      onChange={(e) => setFormData({ ...formData, delete_data: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <label htmlFor="delete_data" className="text-sm text-gray-300 flex-1">
                      <span className="font-medium">Excluir Dados</span>
                      <p className="text-xs text-gray-500">Pode remover registros</p>
                    </label>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Menus Acessíveis
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {availableMenus.map((menu) => (
                    <div
                      key={menu}
                      onClick={() => toggleMenu(menu)}
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${formData.menus.includes(menu)
                          ? 'bg-[#0F4C5C]/20 border-[#0F4C5C] text-white'
                          : 'bg-[#0F172A] border-[#0F4C5C]/30 text-gray-400 hover:border-[#0F4C5C]/50'
                        }`}
                    >
                      <span className="text-sm font-medium">{menuLabels[menu] || menu}</span>
                    </div>
                  ))}
                </div>
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
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-[#5F0F40] to-[#5F0F40] text-white rounded-lg hover:shadow-lg hover:shadow-[#5F0F40]/50 transition-all disabled:opacity-50"
                >
                  {submitting ? (editingGrupo ? 'Salvando...' : 'Criando...') : (editingGrupo ? 'Salvar' : 'Criar Grupo')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDeleteModal && deletingGrupo && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1E293B] border border-[#9A031E]/30 rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">Excluir Grupo</h3>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeletingGrupo(null);
                }}
                className="p-2 text-gray-400 hover:text-white hover:bg-[#0F172A] rounded-lg transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-gray-300 mb-6">
              Tem certeza que deseja excluir o grupo{' '}
              <span className="font-bold text-white">{deletingGrupo.nome}</span>?
              Esta ação não pode ser desfeita.
            </p>

            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeletingGrupo(null);
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
