import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { PerfilUsuario } from '../config/permissions';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  perfil: PerfilUsuario | null;
  nomeUsuario: string;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    nome: string,
    email: string,
    password: string
  ) => Promise<{
    precisaConfirmarEmail: boolean;
  }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(
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
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] =
    useState<Session | null>(null);
  const [perfil, setPerfil] =
    useState<PerfilUsuario | null>(null);
  const [nomeUsuario, setNomeUsuario] =
    useState('Usuário logado');
  const [loading, setLoading] = useState(true);

  const carregarPerfil = async (
    usuario: User | null
  ) => {
    if (!usuario) {
      setPerfil(null);
      setNomeUsuario('Usuário logado');
      return;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('nome, perfil')
      .eq('id', usuario.id)
      .maybeSingle();

    if (error) {
      console.error(
        'Erro ao carregar perfil:',
        error.message
      );
    }

    setPerfil(
      (data?.perfil || 'compras') as PerfilUsuario
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
    let ativo = true;

    const carregarSessao = async () => {
      setLoading(true);

      const { data, error } =
        await supabase.auth.getSession();

      if (error) {
        console.error(
          'Erro ao carregar sessão:',
          error.message
        );
      }

      if (!ativo) return;

      const currentSession = data.session;
      const currentUser =
        currentSession?.user || null;

      setSession(currentSession);
      setUser(currentUser);

      await carregarPerfil(currentUser);

      if (ativo) {
        setLoading(false);
      }
    };

    carregarSessao();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      async (_event, currentSession) => {
        const currentUser =
          currentSession?.user || null;

        setSession(currentSession);
        setUser(currentUser);

        await carregarPerfil(currentUser);

        if (ativo) {
          setLoading(false);
        }
      }
    );

    return () => {
      ativo = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (
    email: string,
    password: string
  ) => {
    const { error } =
      await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

    if (error) {
      throw error;
    }
  };

  const signUp = async (
    nome: string,
    email: string,
    password: string
  ) => {
    const nomeLimpo = nome.trim();
    const emailLimpo =
      email.trim().toLowerCase();

    if (!nomeLimpo) {
      throw new Error(
        'Informe o nome completo.'
      );
    }

    if (!emailLimpo) {
      throw new Error(
        'Informe o e-mail.'
      );
    }

    if (password.length < 6) {
      throw new Error(
        'A senha deve possuir pelo menos 6 caracteres.'
      );
    }

    /*
     * O trigger criado no Supabase é responsável por:
     * 1. criar o profile;
     * 2. criar uma organização exclusiva;
     * 3. vincular o novo usuário como admin.
     *
     * Não insira profiles ou usuarios_organizacoes
     * diretamente pelo frontend.
     */
    const { data, error } =
      await supabase.auth.signUp({
        email: emailLimpo,
        password,
        options: {
          data: {
            nome: nomeLimpo,
          },
        },
      });

    if (error) {
      throw error;
    }

    if (!data.user) {
      throw new Error(
        'Não foi possível criar o usuário.'
      );
    }

    return {
      precisaConfirmarEmail: !data.session,
    };
  };

  const signOut = async () => {
    const { error } =
      await supabase.auth.signOut();

    if (error) {
      throw error;
    }

    localStorage.removeItem(
      'flowfinance_organizacao_ativa_id'
    );

    setUser(null);
    setSession(null);
    setPerfil(null);
    setNomeUsuario('Usuário logado');
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
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};