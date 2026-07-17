import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react';
import {
  User,
  Session,
} from '@supabase/supabase-js';

import { supabase } from '../lib/supabase';
import { PerfilUsuario } from '../config/permissions';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  perfil: PerfilUsuario | null;
  nomeUsuario: string;

  signIn: (
    email: string,
    password: string
  ) => Promise<void>;

  signUp: (
    nome: string,
    email: string,
    password: string
  ) => Promise<void>;

  criarOrganizacaoInicial: (
    nomeOrganizacao: string
  ) => Promise<string>;

  signOut: () => Promise<void>;
}

const AuthContext =
  createContext<AuthContextType | undefined>(
    undefined
  );

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      'useAuth deve ser usado dentro de um AuthProvider'
    );
  }

  return context;
};

export const AuthProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [user, setUser] =
    useState<User | null>(null);

  const [session, setSession] =
    useState<Session | null>(null);

  const [perfil, setPerfil] =
    useState<PerfilUsuario | null>(null);

  const [nomeUsuario, setNomeUsuario] =
    useState('Usuário logado');

  const [loading, setLoading] =
    useState(true);

  const carregarPerfil = async (
    usuario: User | null
  ) => {
    if (!usuario) {
      setPerfil(null);
      setNomeUsuario('Usuário logado');
      return;
    }

    const { data, error } =
      await supabase
        .from('profiles')
        .select(
          `
          nome,
          perfil
          `
        )
        .eq('id', usuario.id)
        .maybeSingle();

    if (error) {
      console.error(
        'Erro ao carregar perfil:',
        error.message
      );
    }

    setPerfil(
      (data?.perfil ||
        'compras') as PerfilUsuario
    );

    setNomeUsuario(
      data?.nome ||
        usuario.user_metadata?.nome ||
        usuario.user_metadata?.name ||
        usuario.email ||
        'Usuário logado'
    );
  };

  useEffect(() => {
    const carregarSessao = async () => {
      setLoading(true);

      const {
        data,
        error,
      } =
        await supabase.auth.getSession();

      if (error) {
        console.error(
          'Erro ao carregar sessão:',
          error.message
        );
      }

      const currentSession =
        data.session;

      const currentUser =
        currentSession?.user || null;

      setSession(currentSession);
      setUser(currentUser);

      await carregarPerfil(
        currentUser
      );

      setLoading(false);
    };

    carregarSessao();

    const {
      data: {
        subscription,
      },
    } =
      supabase.auth.onAuthStateChange(
        async (
          _event,
          currentSession
        ) => {
          const currentUser =
            currentSession?.user ||
            null;

          setSession(
            currentSession
          );

          setUser(
            currentUser
          );

          await carregarPerfil(
            currentUser
          );

          setLoading(false);
        }
      );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (
    email: string,
    password: string
  ) => {
    const { error } =
      await supabase.auth.signInWithPassword(
        {
          email:
            email.trim().toLowerCase(),
          password,
        }
      );

    if (error) {
      throw error;
    }
  };

  const signUp = async (
    nome: string,
    email: string,
    password: string
  ) => {
    const {
      data,
      error,
    } =
      await supabase.auth.signUp({
        email:
          email
            .trim()
            .toLowerCase(),

        password,

        options: {
          data: {
            nome:
              nome.trim(),
          },
        },
      });

    if (error) {
      throw error;
    }

    /*
      IMPORTANTE:

      Não criamos organização aqui.

      Primeiro criamos o usuário.
      Depois a tela de onboarding
      chama criarOrganizacaoInicial().
    */

    if (
      data.user &&
      data.session
    ) {
      const {
        error: profileError,
      } =
        await supabase
          .from('profiles')
          .upsert(
            {
              id:
                data.user.id,

              nome:
                nome.trim(),

              role:
                'user',

              perfil:
                'admin',
            },
            {
              onConflict:
                'id',
            }
          );

      if (profileError) {
        console.error(
          'Erro ao criar perfil:',
          profileError.message
        );
      }
    }
  };

  const criarOrganizacaoInicial =
    async (
      nomeOrganizacao: string
    ) => {
      const {
        data,
        error,
      } =
        await supabase.rpc(
          'criar_organizacao_inicial',
          {
            p_nome_organizacao:
              nomeOrganizacao.trim(),
          }
        );

      if (error) {
        throw error;
      }

      if (!data) {
        throw new Error(
          'Não foi possível criar a organização.'
        );
      }

      return String(data);
    };

  const signOut =
    async () => {
      const { error } =
        await supabase.auth.signOut();

      if (error) {
        throw error;
      }

      setUser(null);
      setSession(null);
      setPerfil(null);

      setNomeUsuario(
        'Usuário logado'
      );
    };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        perfil,
        nomeUsuario,
        signIn,
        signUp,
        criarOrganizacaoInicial,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};