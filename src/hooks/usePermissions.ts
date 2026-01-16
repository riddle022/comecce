import { useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { usePermissionsContext } from '../contexts/PermissionsContext';
import { Empresa } from '../types/database';

interface PermissionCheck {
  action: string;
  resource?: string;
}

export const usePermissions = () => {
  const { permissions, loading, refreshPermissions } = usePermissionsContext();

  const checkPermission = useCallback(async (check: PermissionCheck): Promise<boolean> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        return false;
      }

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/check-permissions`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(check),
      });

      const data = await response.json();

      if (response.status === 403 && data.userInactive) {
        console.log('Usuario inativo detectado, fazendo logout...');
        await supabase.auth.signOut();
        return false;
      }

      if (!response.ok) {
        return false;
      }

      return data.hasPermission;
    } catch (err) {
      console.error('Error checking permission:', err);
      return false;
    }
  }, []);

  const canViewMenu = useCallback((menuName: string): boolean => {
    if (permissions.isAdmin) return true;
    return permissions.menus.includes(menuName);
  }, [permissions]);

  const canEdit = useCallback((): boolean => {
    if (permissions.isAdmin) return true;
    return permissions.canEdit;
  }, [permissions]);

  const canDelete = useCallback((): boolean => {
    if (permissions.isAdmin) return true;
    return permissions.canDelete;
  }, [permissions]);

  const isAdmin = useCallback((): boolean => {
    return permissions.isAdmin;
  }, [permissions]);

  const getEmpresas = useCallback((): Empresa[] => {
    return permissions.empresas;
  }, [permissions]);

  return {
    permissions,
    loading,
    checkPermission,
    canViewMenu,
    canEdit,
    canDelete,
    isAdmin,
    getEmpresas,
    refetch: refreshPermissions,
  };
};
