import React, { useState, useEffect, useRef } from 'react';
import { Users, Plus, Edit2, Trash2, Search, X, Building2, Filter, ChevronDown, Key } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Perfil, Grupo, Empresa } from '../../types/database';
import { ProtectedAction } from '../Common/ProtectedAction';

interface UsuarioWithEmpresas extends Perfil {
  empresas?: Empresa[];
}

export const UsuariosPage: React.FC = () => {
  const [usuarios, setUsuarios] = useState<UsuarioWithEmpresas[]>([]);
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [filters, setFilters] = useState({
    nome: [] as string[],
    email: [] as string[],
    grupo: [] as string[],
    empresas: [] as string[],
    status: [] as string[]
  });
  const [openFilter, setOpenFilter] = useState<string | null>(null);
  const filterRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingUsuario, setEditingUsuario] = useState<UsuarioWithEmpresas | null>(null);
  const [deletingUsuario, setDeletingUsuario] = useState<UsuarioWithEmpresas | null>(null);
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    password: '',
    telefone: '',
    grupo_id: '',
    ativo: true,
    empresa_ids: [] as string[]
  });
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [empresaSearch, setEmpresaSearch] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUser(user);
    });
  }, []);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const [gruposData, empresasData] = await Promise.all([
        supabase.from('grupos').select('*'),
        supabase.from('empresas').select('*').eq('ativo', true)
      ]);

      if (gruposData.error) throw gruposData.error;
      if (empresasData.error) throw empresasData.error;

      setGrupos(gruposData.data || []);
      setEmpresas(empresasData.data || []);
    } catch (error) {
      console.error('Erro ao carregar dados iniciais:', error);
    }
  };

  const loadUsuarios = async (searchQuery: string = '') => {
    setLoading(true);
    try {
      let query = supabase.from('perfis').select('*');

      if (searchQuery.trim()) {
        query = query.or(`nome.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%,telefone.ilike.%${searchQuery}%`);
      }

      const { data: usuariosData, error: usuariosError } = await query;

      if (usuariosError) throw usuariosError;

      const usuariosWithEmpresas = await Promise.all(
        (usuariosData || []).map(async (usuario) => {
          const { data: usuarioEmpresas } = await supabase
            .from('usuarios_empresas')
            .select('empresa_id, empresas(*)')
            .eq('usuario_id', usuario.id);

          return {
            ...usuario,
            empresas: usuarioEmpresas?.map(ue => ue.empresas).filter(Boolean) || []
          };
        })
      );

      setUsuarios(usuariosWithEmpresas);
      setHasSearched(true);
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    loadUsuarios(searchTerm);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // Filtrado local: primero por searchTerm (si ya se han cargado usuarios), luego por filtros avanzados
  const filteredUsuarios = (hasSearched && usuarios.length > 0
    ? usuarios.filter(usuario => {
      if (!searchTerm.trim()) return true;
      const searchLower = searchTerm.toLowerCase();
      return (
        usuario.nome.toLowerCase().includes(searchLower) ||
        usuario.email.toLowerCase().includes(searchLower) ||
        (usuario.telefone && usuario.telefone.includes(searchTerm))
      );
    })
    : usuarios
  ).filter(usuario => {
    const matchesNome = filters.nome.length === 0 || filters.nome.includes(usuario.nome);
    const matchesEmail = filters.email.length === 0 || filters.email.includes(usuario.email);
    const matchesGrupo = filters.grupo.length === 0 || (usuario.grupo_id && filters.grupo.includes(usuario.grupo_id));
    const matchesStatus = filters.status.length === 0 || filters.status.includes(usuario.ativo ? 'ativo' : 'inativo');

    const usuarioEmpresaIds = usuario.empresas?.map(e => e.id_empresa) || [];
    const matchesEmpresa = filters.empresas.length === 0 ||
      filters.empresas.some(empId => usuarioEmpresaIds.includes(empId));

    return matchesNome && matchesEmail && matchesGrupo && matchesEmpresa && matchesStatus;
  });

  const uniqueNomes = Array.from(new Set(usuarios.map(u => u.nome))).sort();
  const uniqueEmails = Array.from(new Set(usuarios.map(u => u.email))).sort();
  const allEmpresas = Array.from(new Set(usuarios.flatMap(u => u.empresas || []).map(e => e.id_empresa)))
    .map(id => usuarios.flatMap(u => u.empresas || []).find(e => e.id_empresa === id))
    .filter(Boolean) as Empresa[];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openFilter && filterRefs.current[openFilter] &&
        !filterRefs.current[openFilter]?.contains(event.target as Node)) {
        setOpenFilter(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openFilter]);

  const toggleFilterValue = (filterKey: keyof typeof filters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [filterKey]: prev[filterKey].includes(value)
        ? prev[filterKey].filter(v => v !== value)
        : [...prev[filterKey], value]
    }));
  };

  const clearFilter = (filterKey: keyof typeof filters) => {
    setFilters(prev => ({ ...prev, [filterKey]: [] }));
  };

  const hasActiveFilter = (filterKey: keyof typeof filters) => {
    return filters[filterKey].length > 0;
  };

  const getGrupoBadgeStyles = (grupoId: string | null) => {
    const grupo = grupos.find(g => g.id === grupoId);
    if (grupo?.nome === 'Administrador') {
      return 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20';
    }
    return 'bg-slate-500/10 text-slate-400 border border-slate-500/20';
  };

  const getGrupoNome = (grupoId: string | null) => {
    const grupo = grupos.find(g => g.id === grupoId);
    return grupo?.nome || 'Sem grupo';
  };

  const handleOpenEdit = (usuario: UsuarioWithEmpresas) => {
    setEditingUsuario(usuario);
    setFormData({
      nome: usuario.nome,
      email: usuario.email,
      password: '',
      telefone: usuario.telefone || '',
      grupo_id: usuario.grupo_id || '',
      ativo: usuario.ativo,
      empresa_ids: usuario.empresas?.map(e => e.id_empresa) || []
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingUsuario(null);
    setFormError('');
    setEmpresaSearch('');
    setIsChangingPassword(false);
    setNewPassword('');
    setConfirmPassword('');
    setFormData({ nome: '', email: '', password: '', telefone: '', grupo_id: '', ativo: true, empresa_ids: [] });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);

    try {
      let usuarioId: string;

      if (editingUsuario) {
        // Se o usuário estiver mudando a senha
        if (isChangingPassword) {
          if (newPassword !== confirmPassword) {
            throw new Error('As senhas não coincidem');
          }
          if (newPassword.length < 6) {
            throw new Error('A senha debe ter pelo menos 6 caracteres');
          }

          if (currentUser?.id === editingUsuario.id) {
            // Mudança de senha própria
            const { error: updateAuthError } = await supabase.auth.updateUser({
              password: newPassword
            });
            if (updateAuthError) throw updateAuthError;
          } else {
            // Mudança de senha por administrador
            const { data: { session } } = await supabase.auth.getSession();
            const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-update-password`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${session?.access_token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                userId: editingUsuario.id,
                newPassword: newPassword
              }),
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Erro ao atualizar senha');
          }
        }

        const { error: perfilError } = await supabase
          .from('perfis')
          .update({
            nome: formData.nome,
            telefone: formData.telefone,
            grupo_id: formData.grupo_id || null,
            ativo: formData.ativo,
          })
          .eq('id', editingUsuario.id);

        if (perfilError) throw perfilError;
        usuarioId = editingUsuario.id;
      } else {
        const { data: { session } } = await supabase.auth.getSession();
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-create-user`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: formData.email,
            password: formData.password,
            nome: formData.nome,
            telefone: formData.telefone,
            grupo_id: formData.grupo_id || null,
            ativo: formData.ativo,
          }),
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Erro ao criar usuário');
        usuarioId = data.userId;
      }

      const { error: deleteError } = await supabase
        .from('usuarios_empresas')
        .delete()
        .eq('usuario_id', usuarioId);

      if (deleteError) throw deleteError;

      if (formData.empresa_ids.length > 0) {
        const empresasToInsert = formData.empresa_ids.map(empresaId => ({
          usuario_id: usuarioId,
          empresa_id: empresaId
        }));

        const { error: insertError } = await supabase
          .from('usuarios_empresas')
          .insert(empresasToInsert);

        if (insertError) throw insertError;
      }

      await loadUsuarios(searchTerm);
      handleCloseModal();
    } catch (error: any) {
      setFormError(error.message || 'Erro ao salvar usuário');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingUsuario) return;
    setSubmitting(true);

    try {
      const { error } = await supabase
        .from('perfis')
        .delete()
        .eq('id', deletingUsuario.id);

      if (error) throw error;

      await loadUsuarios(searchTerm);
      setShowDeleteModal(false);
      setDeletingUsuario(null);
    } catch (error: any) {
      setFormError(error.message || 'Erro ao excluir usuário');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <ProtectedAction requiredPermission="edit">
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-[#0F4C5C] to-[#0F4C5C] text-white rounded-lg hover:shadow-lg hover:shadow-[#0F4C5C]/50 transition-all"
          >
            <Plus className="w-5 h-5" />
            <span>Novo Usuário</span>
          </button>
        </ProtectedAction>
      </div>

      <div className="bg-[#1E293B] border border-[#0F4C5C]/20 rounded-xl p-6">
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input
            type="text"
            placeholder="Buscar usuários (pressione Enter para buscar ou deixe vazio para ver todos)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                loadUsuarios(searchTerm);
              }
            }}
            className="w-full pl-10 pr-4 py-2 bg-[#0F172A] border border-[#0F4C5C]/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#0F4C5C]"
          />
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-400">Carregando...</div>
        ) : usuarios.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            Digite um termo e pressione Enter para buscar usuários
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left py-4 px-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <div className="flex items-center space-x-2">
                      <span>Nome</span>
                      <div className="relative" ref={el => filterRefs.current['nome'] = el}>
                        <button
                          onClick={() => setOpenFilter(openFilter === 'nome' ? null : 'nome')}
                          className={`p-1 rounded hover:bg-white/5 transition-colors ${hasActiveFilter('nome') ? 'text-cyan-400' : ''}`}
                        >
                          <Filter className="w-3 h-3" />
                        </button>
                        {openFilter === 'nome' && (
                          <div className="absolute top-full left-0 mt-2 bg-[#0F172A] border border-white/10 rounded-xl shadow-2xl z-50 w-64 max-h-80 overflow-y-auto backdrop-blur-xl">
                            <div className="p-3 border-b border-white/5 flex items-center justify-between bg-white/5">
                              <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Nome</span>
                              {hasActiveFilter('nome') && (
                                <button
                                  onClick={() => clearFilter('nome')}
                                  className="text-[10px] font-bold text-cyan-500 hover:text-cyan-400 uppercase tracking-tight"
                                >
                                  Limpar
                                </button>
                              )}
                            </div>
                            <div className="p-2 space-y-0.5">
                              {uniqueNomes.map((nome) => (
                                <label key={nome} className="flex items-center space-x-2.5 p-2 hover:bg-white/5 rounded-lg cursor-pointer transition-colors">
                                  <input
                                    type="checkbox"
                                    checked={filters.nome.includes(nome)}
                                    onChange={() => toggleFilterValue('nome', nome)}
                                    className="w-3.5 h-3.5 bg-slate-900 border-white/10 rounded text-cyan-500 focus:ring-0 focus:ring-offset-0"
                                  />
                                  <span className="text-sm text-slate-300">{nome}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </th>
                  <th className="text-left py-4 px-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <div className="flex items-center space-x-2">
                      <span>Email</span>
                      <div className="relative" ref={el => filterRefs.current['email'] = el}>
                        <button
                          onClick={() => setOpenFilter(openFilter === 'email' ? null : 'email')}
                          className={`p-1 rounded hover:bg-white/5 transition-colors ${hasActiveFilter('email') ? 'text-cyan-400' : ''}`}
                        >
                          <Filter className="w-3 h-3" />
                        </button>
                        {openFilter === 'email' && (
                          <div className="absolute top-full left-0 mt-2 bg-[#0F172A] border border-white/10 rounded-xl shadow-2xl z-50 w-64 max-h-80 overflow-y-auto backdrop-blur-xl">
                            <div className="p-3 border-b border-white/5 flex items-center justify-between bg-white/5">
                              <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Email</span>
                              {hasActiveFilter('email') && (
                                <button
                                  onClick={() => clearFilter('email')}
                                  className="text-[10px] font-bold text-cyan-500 hover:text-cyan-400 uppercase tracking-tight"
                                >
                                  Limpar
                                </button>
                              )}
                            </div>
                            <div className="p-2 space-y-0.5">
                              {uniqueEmails.map((email) => (
                                <label key={email} className="flex items-center space-x-2.5 p-2 hover:bg-white/5 rounded-lg cursor-pointer transition-colors">
                                  <input
                                    type="checkbox"
                                    checked={filters.email.includes(email)}
                                    onChange={() => toggleFilterValue('email', email)}
                                    className="w-3.5 h-3.5 bg-slate-900 border-white/10 rounded text-cyan-500 focus:ring-0 focus:ring-offset-0"
                                  />
                                  <span className="text-sm text-slate-300 truncate">{email}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </th>
                  <th className="text-left py-4 px-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Telefone</th>
                  <th className="text-left py-4 px-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <div className="flex items-center space-x-2">
                      <span>Grupo</span>
                      <div className="relative" ref={el => filterRefs.current['grupo'] = el}>
                        <button
                          onClick={() => setOpenFilter(openFilter === 'grupo' ? null : 'grupo')}
                          className={`p-1 rounded hover:bg-white/5 transition-colors ${hasActiveFilter('grupo') ? 'text-cyan-400' : ''}`}
                        >
                          <Filter className="w-3 h-3" />
                        </button>
                        {openFilter === 'grupo' && (
                          <div className="absolute top-full left-0 mt-2 bg-[#0F172A] border border-white/10 rounded-xl shadow-2xl z-50 w-64 backdrop-blur-xl">
                            <div className="p-3 border-b border-white/5 flex items-center justify-between bg-white/5">
                              <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Grupo</span>
                              {hasActiveFilter('grupo') && (
                                <button
                                  onClick={() => clearFilter('grupo')}
                                  className="text-[10px] font-bold text-cyan-500 hover:text-cyan-400 uppercase tracking-tight"
                                >
                                  Limpar
                                </button>
                              )}
                            </div>
                            <div className="p-2 space-y-0.5">
                              {grupos.map((grupo) => (
                                <label key={grupo.id} className="flex items-center space-x-2.5 p-2 hover:bg-white/5 rounded-lg cursor-pointer transition-colors">
                                  <input
                                    type="checkbox"
                                    checked={filters.grupo.includes(grupo.id)}
                                    onChange={() => toggleFilterValue('grupo', grupo.id)}
                                    className="w-3.5 h-3.5 bg-slate-900 border-white/10 rounded text-cyan-500 focus:ring-0 focus:ring-offset-0"
                                  />
                                  <span className="text-sm text-slate-300">{grupo.nome}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </th>
                  <th className="text-left py-4 px-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <div className="flex items-center space-x-2">
                      <span>Empresas</span>
                      <div className="relative" ref={el => filterRefs.current['empresas'] = el}>
                        <button
                          onClick={() => setOpenFilter(openFilter === 'empresas' ? null : 'empresas')}
                          className={`p-1 rounded hover:bg-white/5 transition-colors ${hasActiveFilter('empresas') ? 'text-cyan-400' : ''}`}
                        >
                          <Filter className="w-3 h-3" />
                        </button>
                        {openFilter === 'empresas' && (
                          <div className="absolute top-full left-0 mt-2 bg-[#0F172A] border border-white/10 rounded-xl shadow-2xl z-50 w-64 max-h-80 overflow-y-auto backdrop-blur-xl">
                            <div className="p-3 border-b border-white/5 flex items-center justify-between bg-white/5">
                              <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Empresas</span>
                              {hasActiveFilter('empresas') && (
                                <button
                                  onClick={() => clearFilter('empresas')}
                                  className="text-[10px] font-bold text-cyan-500 hover:text-cyan-400 uppercase tracking-tight"
                                >
                                  Limpar
                                </button>
                              )}
                            </div>
                            <div className="p-2 space-y-0.5">
                              {allEmpresas.map((empresa) => (
                                <label key={empresa.id_empresa} className="flex items-center space-x-2.5 p-2 hover:bg-white/5 rounded-lg cursor-pointer transition-colors">
                                  <input
                                    type="checkbox"
                                    checked={filters.empresas.includes(empresa.id_empresa)}
                                    onChange={() => toggleFilterValue('empresas', empresa.id_empresa)}
                                    className="w-3.5 h-3.5 bg-slate-900 border-white/10 rounded text-cyan-500 focus:ring-0 focus:ring-offset-0"
                                  />
                                  <span className="text-sm text-slate-300">{empresa.ds_empresa}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </th>
                  <th className="text-left py-4 px-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <div className="flex items-center space-x-2">
                      <span>Status</span>
                      <div className="relative" ref={el => filterRefs.current['status'] = el}>
                        <button
                          onClick={() => setOpenFilter(openFilter === 'status' ? null : 'status')}
                          className={`p-1 rounded hover:bg-white/5 transition-colors ${hasActiveFilter('status') ? 'text-cyan-400' : ''}`}
                        >
                          <Filter className="w-3 h-3" />
                        </button>
                        {openFilter === 'status' && (
                          <div className="absolute top-full left-0 mt-2 bg-[#0F172A] border border-white/10 rounded-xl shadow-2xl z-50 w-48 backdrop-blur-xl">
                            <div className="p-3 border-b border-white/5 flex items-center justify-between bg-white/5">
                              <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Status</span>
                              {hasActiveFilter('status') && (
                                <button
                                  onClick={() => clearFilter('status')}
                                  className="text-[10px] font-bold text-cyan-500 hover:text-cyan-400 uppercase tracking-tight"
                                >
                                  Limpar
                                </button>
                              )}
                            </div>
                            <div className="p-2 space-y-0.5">
                              <label className="flex items-center space-x-2.5 p-2 hover:bg-white/5 rounded-lg cursor-pointer transition-colors">
                                <input
                                  type="checkbox"
                                  checked={filters.status.includes('ativo')}
                                  onChange={() => toggleFilterValue('status', 'ativo')}
                                  className="w-3.5 h-3.5 bg-slate-900 border-white/10 rounded text-cyan-500 focus:ring-0 focus:ring-offset-0"
                                />
                                <span className="text-sm text-slate-300">Ativo</span>
                              </label>
                              <label className="flex items-center space-x-2.5 p-2 hover:bg-white/5 rounded-lg cursor-pointer transition-colors">
                                <input
                                  type="checkbox"
                                  checked={filters.status.includes('inativo')}
                                  onChange={() => toggleFilterValue('status', 'inativo')}
                                  className="w-3.5 h-3.5 bg-slate-900 border-white/10 rounded text-cyan-500 focus:ring-0 focus:ring-offset-0"
                                />
                                <span className="text-sm text-slate-300">Inativo</span>
                              </label>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </th>
                  <th className="text-right py-4 px-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsuarios.map((usuario) => (
                  <tr key={usuario.id} className="border-b border-white/[0.02] hover:bg-white/[0.02] transition-colors group">
                    <td className="py-4 px-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-slate-200 group-hover:text-white transition-colors">
                          {usuario.nome}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-xs text-slate-400 font-medium">{usuario.email}</span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-xs text-slate-400 font-mono tracking-tight">{usuario.telefone || '—'}</span>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${getGrupoBadgeStyles(usuario.grupo_id)}`}>
                        {getGrupoNome(usuario.grupo_id)}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      {usuario.empresas && usuario.empresas.length > 0 ? (
                        <div className="flex flex-col space-y-1">
                          <div className="flex flex-wrap gap-1.5">
                            {usuario.empresas.slice(0, 2).map((empresa) => (
                              <span key={empresa.id_empresa} className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-300 hover:text-white transition-colors">
                                <div className="w-1 h-1 rounded-full bg-cyan-500/50" />
                                {empresa.ds_empresa}
                              </span>
                            ))}
                          </div>
                          {usuario.empresas.length > 2 && (
                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tight ml-2.5">
                              + {usuario.empresas.length - 2} empresas adicionales
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-600 italic">Sin empresas</span>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center space-x-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${usuario.ativo ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                        <span className={`text-[11px] font-bold uppercase tracking-wider ${usuario.ativo ? 'text-emerald-400' : 'text-rose-400'
                          }`}>
                          {usuario.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center justify-end space-x-1">
                        <ProtectedAction requiredPermission="edit">
                          <button
                            onClick={() => handleOpenEdit(usuario)}
                            className="p-1.5 text-slate-500 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-all"
                            title="Editar"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </ProtectedAction>
                        <ProtectedAction requiredPermission="delete">
                          <button
                            onClick={() => {
                              setDeletingUsuario(usuario);
                              setShowDeleteModal(true);
                            }}
                            className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all"
                            title="Excluir"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </ProtectedAction>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-[#1E293B] border border-[#0F4C5C]/30 rounded-xl max-w-md w-full max-h-[95vh] sm:max-h-[90vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between p-4 sm:p-6 pb-4 border-b border-[#0F4C5C]/20 flex-shrink-0">
              <h3 className="text-lg sm:text-xl font-bold text-white">
                {editingUsuario ? 'Editar Usuário' : 'Novo Usuário'}
              </h3>
              <button
                onClick={handleCloseModal}
                className="p-2 text-gray-400 hover:text-white hover:bg-[#0F172A] rounded-lg transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
              {formError && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                  {formError}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4" id="usuario-form">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Nome completo
                  </label>
                  <input
                    type="text"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    className="w-full px-4 py-2 bg-[#0F172A] border border-[#0F4C5C]/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#0F4C5C]"
                    placeholder="Nome do usuário"
                    required
                  />
                </div>

                {!editingUsuario && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Email
                      </label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-4 py-2 bg-[#0F172A] border border-[#0F4C5C]/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#0F4C5C]"
                        placeholder="email@exemplo.com"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Senha
                      </label>
                      <input
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="w-full px-4 py-2 bg-[#0F172A] border border-[#0F4C5C]/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#0F4C5C]"
                        placeholder="Mínimo 6 caracteres"
                        required
                        minLength={6}
                      />
                    </div>
                  </>
                )}

                {editingUsuario && (
                  <div className="p-3 bg-[#0F172A] rounded-lg">
                    <p className="text-sm text-gray-400">
                      <span className="font-medium">Email:</span> {editingUsuario.email}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      O email não pode ser alterado
                    </p>
                  </div>
                )}

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
                    Grupo
                  </label>
                  <select
                    value={formData.grupo_id}
                    onChange={(e) => setFormData({ ...formData, grupo_id: e.target.value })}
                    className="w-full px-4 py-2 bg-[#0F172A] border border-[#0F4C5C]/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#0F4C5C]"
                  >
                    <option value="">Selecione um grupo</option>
                    {grupos.map((grupo) => (
                      <option key={grupo.id} value={grupo.id}>
                        {grupo.nome}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Empresas
                  </label>
                  {empresas.length > 0 && (
                    <div className="mb-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <input
                          type="text"
                          value={empresaSearch}
                          onChange={(e) => setEmpresaSearch(e.target.value)}
                          placeholder="Buscar empresa..."
                          className="w-full pl-9 pr-3 py-2 text-sm bg-[#0F172A] border border-[#0F4C5C]/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#0F4C5C]"
                        />
                      </div>
                    </div>
                  )}
                  <div className="bg-[#0F172A] border border-[#0F4C5C]/30 rounded-lg p-2 max-h-32 sm:max-h-40 overflow-y-auto space-y-1">
                    {empresas.length === 0 ? (
                      <p className="text-sm text-gray-500 p-2">Nenhuma empresa cadastrada</p>
                    ) : (
                      empresas
                        .filter(empresa => {
                          if (!empresaSearch.trim()) return true;
                          const searchLower = empresaSearch.toLowerCase();
                          return (
                            (empresa.ds_empresa?.toLowerCase().includes(searchLower)) ||
                            (empresa.cnpj?.includes(empresaSearch))
                          );
                        })
                        .map((empresa) => (
                          <label key={empresa.id_empresa} className="flex items-center space-x-2 cursor-pointer hover:bg-[#1E293B] p-2 rounded transition-colors">
                            <input
                              type="checkbox"
                              checked={formData.empresa_ids.includes(empresa.id_empresa)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setFormData({ ...formData, empresa_ids: [...formData.empresa_ids, empresa.id_empresa] });
                                } else {
                                  setFormData({ ...formData, empresa_ids: formData.empresa_ids.filter(id => id !== empresa.id_empresa) });
                                }
                              }}
                              className="w-4 h-4 bg-[#0F172A] border-[#0F4C5C]/30 rounded focus:ring-2 focus:ring-[#0F4C5C] text-[#0F4C5C] flex-shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm text-white truncate">{empresa.ds_empresa}</div>
                              <div className="text-xs text-gray-500">{empresa.cnpj}</div>
                            </div>
                          </label>
                        ))
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1.5">
                    {formData.empresa_ids.length === 0
                      ? 'Nenhuma empresa selecionada'
                      : `${formData.empresa_ids.length} empresa${formData.empresa_ids.length > 1 ? 's' : ''} selecionada${formData.empresa_ids.length > 1 ? 's' : ''}`
                    }
                  </p>
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
                    Usuário ativo
                  </label>
                </div>

                {editingUsuario && (
                  <div className="pt-4 border-t border-[#0F4C5C]/20">
                    {!isChangingPassword ? (
                      <button
                        type="button"
                        onClick={() => setIsChangingPassword(true)}
                        className="flex items-center space-x-2 text-sm font-medium text-cyan-400 hover:text-cyan-300 transition-colors"
                      >
                        <Key className="w-4 h-4" />
                        <span>Mudar Senha</span>
                      </button>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                            <Key className="w-4 h-4 text-cyan-400" />
                            <span>Alterar Senha</span>
                          </h4>
                          <button
                            type="button"
                            onClick={() => {
                              setIsChangingPassword(false);
                              setNewPassword('');
                              setConfirmPassword('');
                            }}
                            className="text-xs text-gray-400 hover:text-white"
                          >
                            Cancelar alteração
                          </button>
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                          <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1.5">
                              Nova Senha
                            </label>
                            <input
                              type="password"
                              value={newPassword}
                              onChange={(e) => setNewPassword(e.target.value)}
                              className="w-full px-4 py-2 bg-[#0F172A] border border-[#0F4C5C]/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#0F4C5C]"
                              placeholder="Mínimo 6 caracteres"
                              minLength={6}
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1.5">
                              Confirmar Nova Senha
                            </label>
                            <input
                              type="password"
                              value={confirmPassword}
                              onChange={(e) => setConfirmPassword(e.target.value)}
                              className="w-full px-4 py-2 bg-[#0F172A] border border-[#0F4C5C]/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#0F4C5C]"
                              placeholder="Repita a nova senha"
                              minLength={6}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </form>
            </div>

            <div className="flex space-x-3 p-4 sm:p-6 pt-4 border-t border-[#0F4C5C]/20 flex-shrink-0">
              <button
                type="button"
                onClick={handleCloseModal}
                className="flex-1 px-4 py-2.5 bg-[#0F172A] border border-[#0F4C5C]/30 text-white rounded-lg hover:bg-[#0F172A]/80 transition-all text-sm sm:text-base"
              >
                Cancelar
              </button>
              <button
                type="submit"
                form="usuario-form"
                disabled={submitting}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-[#0F4C5C] to-[#0F4C5C] text-white rounded-lg hover:shadow-lg hover:shadow-[#0F4C5C]/50 transition-all disabled:opacity-50 text-sm sm:text-base"
              >
                {submitting ? (editingUsuario ? 'Salvando...' : 'Criando...') : (editingUsuario ? 'Salvar' : 'Criar Usuário')}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && deletingUsuario && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1E293B] border border-[#9A031E]/30 rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">Excluir Usuário</h3>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeletingUsuario(null);
                }}
                className="p-2 text-gray-400 hover:text-white hover:bg-[#0F172A] rounded-lg transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-gray-300 mb-6">
              Tem certeza que deseja excluir o usuário{' '}
              <span className="font-bold text-white">{deletingUsuario.nome}</span>?
              Esta ação não pode ser desfeita.
            </p>

            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeletingUsuario(null);
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
