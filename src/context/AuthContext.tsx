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
  signUp: (nome: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }

  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [perfil, setPerfil] = useState<PerfilUsuario | null>(null);
  const [nomeUsuario, setNomeUsuario] = useState('Usuário logado');
  const [loading, setLoading] = useState(true);

  const carregarPerfil = async (usuario: User | null) => {
    if (!usuario) {
      setPerfil(null);
      setNomeUsuario('Usuário logado');
      return;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('nome, perfil')
      .eq('id', usuario.id)
      .single();

    if (error) {
      console.error('Erro ao carregar perfil:', error.message);

      setPerfil('compras');
      setNomeUsuario(
        usuario.user_metadata?.nome ||
          usuario.user_metadata?.name ||
          usuario.email ||
          'Usuário logado'
      );

      return;
    }

    setPerfil((data?.perfil || 'compras') as PerfilUsuario);
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

      const { data, error } = await supabase.auth.getSession();

      if (error) {
        console.error('Erro ao carregar sessão:', error.message);
      }

      const currentSession = data.session;
      const currentUser = currentSession?.user || null;

      setSession(currentSession);
      setUser(currentUser);

      await carregarPerfil(currentUser);

      setLoading(false);
    };

    carregarSessao();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, currentSession) => {
      const currentUser = currentSession?.user || null;

      setSession(currentSession);
      setUser(currentUser);

      await carregarPerfil(currentUser);

      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw error;
    }
  };

  const signUp = async (nome: string, email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          nome,
        },
      },
    });

    if (error) {
      throw error;
    }

    if (data.user) {
      await supabase.from('profiles').insert({
        id: data.user.id,
        nome,
        role: 'user',
        perfil: 'compras',
      });
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      throw error;
    }

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