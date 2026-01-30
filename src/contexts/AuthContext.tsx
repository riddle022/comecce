import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Perfil } from '../types/database';

interface AuthContextType {
  user: User | null;
  perfil: Perfil | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, nome: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadPerfil(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      (async () => {
        setUser(session?.user ?? null);
        if (session?.user) {
          await loadPerfil(session.user.id);
        } else {
          setPerfil(null);
        }
      })();
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadPerfil = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('perfis')
        .select(`
          *,
          grupo:grupo_id(
            id,
            nome,
            descricao,
            permissoes
          )
        `)
        .eq('id', userId)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        console.error('Perfil não encontrado');
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }

      if (!data.ativo) {
        console.log('Usuário inativo, fazendo logout...');
        await supabase.auth.signOut();
        if (typeof window !== 'undefined') {
          window.location.href = '/?inactive=true';
        }
        setLoading(false);
        return;
      }

      if (data && data.grupo && Array.isArray(data.grupo) && data.grupo.length > 0) {
        data.grupo = data.grupo[0];
      }

      setPerfil(data);
    } catch (error) {
      console.error('Erro ao carregar perfil:', error);
      await supabase.auth.signOut();
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signUp = async (email: string, password: string, nome: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;

    if (data.user) {
      const { error: perfilError } = await supabase.from('perfis').insert({
        id: data.user.id,
        nome,
        email,
        ativo: true,
      });

      if (perfilError) throw perfilError;
    }
  };

  const signOut = async () => {
    try {
      // Limpar filtros globais e cache de permissões antes de sair
      localStorage.removeItem('global-filters');
      localStorage.removeItem('global-filters-mode');
      localStorage.removeItem('app_permissions_cache');

      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      console.error('Erro ao sair:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, perfil, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};
