import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import {
  savePermissionsToCache,
  getPermissionsFromCache,
  clearPermissionsCache,
} from '../utils/permissionsCache';

import { Empresa } from '../types/database';

interface Permissions {
  isAdmin: boolean;
  canEdit: boolean;
  canDelete: boolean;
  menus: string[];
  empresas: Empresa[];
  perfil: {
    id: string;
    nome: string;
    email: string;
  } | null;
  grupo: {
    id: string;
    nome: string;
  } | null;
}

interface PermissionsContextType {
  permissions: Permissions;
  loading: boolean;
  refreshPermissions: () => Promise<void>;
}

const defaultPermissions: Permissions = {
  isAdmin: false,
  canEdit: false,
  canDelete: false,
  menus: [],
  empresas: [],
  perfil: null,
  grupo: null,
};

const PermissionsContext = createContext<PermissionsContextType | undefined>(undefined);

export const PermissionsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<Permissions>(defaultPermissions);
  const [loading, setLoading] = useState(true);
  const isMountedRef = useRef(true);

  const fetchPermissions = useCallback(async (silentRefresh = false) => {
    if (!user) {
      setPermissions(defaultPermissions);
      setLoading(false);
      return;
    }

    // Se já temos permissões carregadas para este usuário, tratamos como silencioso por padrão
    // para evitar a tela de "Verificando credenciais..." desnecessária
    const isAlreadyLoaded = permissions.perfil?.id === user.id;
    const effectivelySilent = silentRefresh || isAlreadyLoaded;

    if (!effectivelySilent) {
      setLoading(true);
    }

    try {
      const cachedPermissions = getPermissionsFromCache(user.id);

      if (cachedPermissions && !silentRefresh) {
        setPermissions(cachedPermissions);
        setLoading(false);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('No active session');
      }

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/check-permissions`;
      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      };

      const response = await fetch(apiUrl, { headers, method: 'GET' });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.hasPermission) {
        const newPermissions: Permissions = {
          isAdmin: data.isAdmin || false,
          canEdit: data.permissions?.edit_data || false,
          canDelete: data.permissions?.delete_data || false,
          menus: data.permissions?.menus || [],
          empresas: data.empresas || [],
          perfil: data.perfil || null,
          grupo: data.grupo || null,
        };

        if (isMountedRef.current) {
          setPermissions(newPermissions);
          savePermissionsToCache(user.id, newPermissions);
        }
      } else {
        if (isMountedRef.current) {
          setPermissions(defaultPermissions);
        }
      }
    } catch (error) {
      console.error('Error fetching permissions:', error);

      const cachedPermissions = getPermissionsFromCache(user.id);
      if (cachedPermissions && isMountedRef.current) {
        setPermissions(cachedPermissions);
      } else if (isMountedRef.current) {
        setPermissions(defaultPermissions);
      }
    } finally {
      if (isMountedRef.current && !silentRefresh) {
        setLoading(false);
      }
    }
  }, [user]);

  const refreshPermissions = useCallback(async () => {
    await fetchPermissions(false);
  }, [fetchPermissions]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (user?.id) {
      // Dispara a busca. fetchPermissions já decide se será silencioso
      // baseado no estado atual das permissões.
      fetchPermissions(false);
    } else if (!user) {
      setPermissions(defaultPermissions);
      setLoading(false);
      clearPermissionsCache();
    }
  }, [user?.id, fetchPermissions]);

  return (
    <PermissionsContext.Provider value={{ permissions, loading, refreshPermissions }}>
      {children}
    </PermissionsContext.Provider>
  );
};

export const usePermissionsContext = () => {
  const context = useContext(PermissionsContext);
  if (!context) {
    throw new Error('usePermissionsContext must be used within a PermissionsProvider');
  }
  return context;
};
