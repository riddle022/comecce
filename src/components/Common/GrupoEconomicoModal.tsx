import React, { useState, useEffect } from 'react';
import { X, Building, Trash2, AlertTriangle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { GrupoEconomico } from '../../types/database';
import { ProtectedAction } from './ProtectedAction';

interface GrupoEconomicoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (grupoUuid: string) => void;
  grupos: GrupoEconomico[];
  onRefresh: () => Promise<void>;
}

export const GrupoEconomicoModal: React.FC<GrupoEconomicoModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  grupos,
  onRefresh,
}) => {
  const [formData, setFormData] = useState({
    id_grupo: '',
    ds_grupo: '',
  });
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ uuid: string, ds_grupo: string } | null>(null);

  const handleClose = () => {
    setFormData({ id_grupo: '', ds_grupo: '' });
    setFormError('');
    setConfirmDelete(null);
    onClose();
  };

  useEffect(() => {
    if (isOpen) {
      // Calcular o próximo ID sequencial
      const ids = grupos
        .map(g => parseInt(g.id_grupo))
        .filter(id => !isNaN(id));

      const nextId = ids.length > 0 ? (Math.max(...ids) + 1).toString() : '1';
      setFormData(prev => ({ ...prev, id_grupo: nextId }));
    }
  }, [isOpen, grupos]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);

    try {
      const { id_grupo, ds_grupo } = formData;

      if (!id_grupo.trim() || !ds_grupo.trim()) {
        throw new Error('Todos os campos são obrigatórios');
      }

      const { data: existingGrupo, error: checkError } = await supabase
        .from('tbl_grupos_economicos')
        .select('uuid')
        .eq('id_grupo', id_grupo)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existingGrupo) {
        throw new Error('Já existe um grupo econômico com este ID');
      }

      const { data, error } = await supabase
        .from('tbl_grupos_economicos')
        .insert({
          id_grupo: id_grupo.trim(),
          ds_grupo: ds_grupo.trim(),
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        onSuccess(data.uuid);
        handleClose();
      }
    } catch (error: any) {
      setFormError(error.message || 'Erro ao criar grupo econômico');
    } finally {
      setSubmitting(false);
    }
  };

  const executeDelete = async () => {
    if (!confirmDelete) return;

    setFormError('');
    setDeletingId(confirmDelete.uuid);
    const targetUuid = confirmDelete.uuid;

    try {
      // 1. Verificar se existem empresas vinculadas a este grupo
      const { data: linkedEmpresas, error: checkError } = await supabase
        .from('empresas')
        .select('id_empresa')
        .eq('grupoeco_id', targetUuid)
        .limit(1);

      if (checkError) throw checkError;

      if (linkedEmpresas && linkedEmpresas.length > 0) {
        throw new Error('Não é possível excluir este grupo pois existem empresas vinculadas a ele.');
      }

      // 2. Proceder com a exclusão
      const { error: deleteError } = await supabase
        .from('tbl_grupos_economicos')
        .delete()
        .eq('uuid', targetUuid);

      if (deleteError) throw deleteError;

      // 3. Atualizar a lista
      await onRefresh();
      setConfirmDelete(null);
    } catch (error: any) {
      setFormError(error.message || 'Erro ao excluir grupo econômico');
      setConfirmDelete(null);
    } finally {
      setDeletingId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <div className="bg-[#1E293B] border border-[#0F4C5C]/30 rounded-xl max-w-md w-full p-6 relative overflow-hidden">
        {/* Confirmação de Exclusão Overlay */}
        {confirmDelete && (
          <div className="absolute inset-0 z-20 bg-[#1E293B] p-6 flex flex-col items-center justify-center text-center animate-in fade-in zoom-in duration-200">
            <div className="bg-rose-500/10 p-3 rounded-full mb-4">
              <AlertTriangle className="w-8 h-8 text-rose-500" />
            </div>
            <h4 className="text-lg font-bold text-white mb-2">Confirmar Exclusão</h4>
            <p className="text-sm text-gray-400 mb-6">
              Tem certeza que deseja excluir o grupo <span className="text-white font-semibold">"{confirmDelete.ds_grupo}"</span>? Esta ação não pode ser desfeita.
            </p>
            <div className="flex space-x-3 w-full">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 px-4 py-2 bg-[#0F172A] border border-[#0F4C5C]/30 text-white rounded-lg hover:bg-[#0F172A]/80 transition-all font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={executeDelete}
                disabled={deletingId !== null}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-rose-600 to-rose-700 text-white rounded-lg hover:shadow-lg hover:shadow-rose-500/20 transition-all font-medium disabled:opacity-50"
              >
                {deletingId ? 'Excluindo...' : 'Sim, Excluir'}
              </button>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="bg-[#0F4C5C]/20 p-2 rounded-lg">
              <Building className="w-5 h-5 text-[#0F4C5C]" />
            </div>
            <h3 className="text-xl font-bold text-white">Novo Grupo Econômico</h3>
          </div>
          <button
            onClick={handleClose}
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
              ID do Grupo <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={formData.id_grupo}
              readOnly
              className="w-full px-4 py-2 bg-[#0F172A]/50 border border-[#0F4C5C]/30 rounded-lg text-gray-400 cursor-not-allowed focus:outline-none"
              placeholder="Gerando ID..."
              required
            />
            <p className="mt-1 text-xs text-gray-500">
              Gerado automaticamente pelo sistema
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Descrição <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={formData.ds_grupo}
              onChange={(e) => setFormData({ ...formData, ds_grupo: e.target.value })}
              className="w-full px-4 py-2 bg-[#0F172A] border border-[#0F4C5C]/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#0F4C5C]"
              placeholder="Nome do grupo econômico"
              required
              maxLength={200}
            />
            <p className="mt-1 text-xs text-gray-500">
              Nome descritivo do grupo econômico
            </p>
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2 bg-[#0F172A] border border-[#0F4C5C]/30 text-white rounded-lg hover:bg-[#0F172A]/80 transition-all font-medium disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-[#0F4C5C] to-[#0F4C5C] text-white rounded-lg hover:shadow-lg hover:shadow-[#0F4C5C]/50 transition-all font-medium disabled:opacity-50"
            >
              {submitting ? 'Criando...' : 'Criar Grupo'}
            </button>
          </div>
        </form>

        <div className="mt-8 border-t border-[#0F4C5C]/20 pt-6">
          <h4 className="text-sm font-semibold text-white mb-4 uppercase tracking-wider">
            Grupos Existentes
          </h4>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
            {grupos.length === 0 ? (
              <p className="text-xs text-gray-500 text-center py-4 italic">
                Nenhum grupo cadastrado
              </p>
            ) : (
              grupos.map((grupo) => (
                <div
                  key={grupo.uuid}
                  className="flex items-center justify-between p-3 bg-[#0F172A] border border-[#0F4C5C]/10 rounded-lg group hover:border-[#0F4C5C]/30 transition-all"
                >
                  <div className="flex-1 min-w-0 mr-4">
                    <p className="text-sm font-medium text-white truncate">
                      {grupo.ds_grupo}
                    </p>
                    <p className="text-[10px] text-gray-500 font-mono">
                      ID: {grupo.id_grupo}
                    </p>
                  </div>
                  <ProtectedAction requiredPermission="delete">
                    <button
                      onClick={() => setConfirmDelete({ uuid: grupo.uuid, ds_grupo: grupo.ds_grupo })}
                      disabled={deletingId === grupo.uuid}
                      className="p-1.5 text-gray-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all disabled:opacity-50"
                      title="Excluir Grupo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </ProtectedAction>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
