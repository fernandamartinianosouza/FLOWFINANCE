import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  AuthChangeEvent,
  Session,
  User,
} from '@supabase/supabase-js';

import { supabase } from '../lib/supabase';
import { PerfilUsuario } from '../config/permissions';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  perfil: PerfilUsuario | null;
  nomeUsuario: string;
  organizacaoId: string | null;
  vinculoAtivo: boolean;
  recuperandoSenha: boolean;

  signIn: (email: string, password: string) => Promise<void>;
  signUp: (nome: string, email: string, password: string) => Promise<void>;
  criarOrganizacaoInicial: (nomeOrganizacao: string) => Promise<string>;
  solicitarRecuperacaoSenha: (email: string) => Promise<void>;
  atualizarSenha: (novaSenha: string) => Promise<void>;
  concluirAtivacaoConvite: (novaSenha: string) => Promise<void>;
  recarregarAcesso: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const PERFIS_VALIDOS: PerfilUsuario[] = [
  'admin',
  'diretoria',
  'financeiro',
  'contas_pagar',
  'compras',
  'rh',
  'consulta',
] as PerfilUsuario[];

const normalizarPerfil = (valor: unknown): PerfilUsuario | null => {
  if (typeof valor === 'string' && PERFIS_VALIDOS.includes(valor as PerfilUsuario)) {
    return valor as PerfilUsuario;
  }
  return null;
};

const normalizarEmail = (email: string) => email.trim().toLowerCase();

const validarSenhaForte = (senha: string) => {
  const erros: string[] = [];

  if (senha.length < 10) erros.push('a senha deve ter pelo menos 10 caracteres');
  if (!/[a-z]/.test(senha)) erros.push('inclua ao menos uma letra minúscula');
  if (!/[A-Z]/.test(senha)) erros.push('inclua ao menos uma letra maiúscula');
  if (!/\d/.test(senha)) erros.push('inclua ao menos um número');
  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(senha)) {
    erros.push('inclua ao menos um caractere especial');
  }

  if (erros.length > 0) {
    throw new Error(`Senha inválida: ${erros.join('; ')}.`);
  }
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [perfil, setPerfil] = useState<PerfilUsuario | null>(null);
  const [nomeUsuario, setNomeUsuario] = useState('Usuário logado');
  const [organizacaoId, setOrganizacaoId] = useState<string | null>(null);
  const [vinculoAtivo, setVinculoAtivo] = useState(false);
  const [recuperandoSenha, setRecuperandoSenha] = useState(false);
  const [loading, setLoading] = useState(true);

  const limparDadosLocais = useCallback(() => {
    setUser(null);
    setSession(null);
    setPerfil(null);
    setOrganizacaoId(null);
    setVinculoAtivo(false);
    setRecuperandoSenha(false);
    setNomeUsuario('Usuário logado');
  }, []);

  const carregarAcesso = useCallback(async (usuario: User | null) => {
    if (!usuario) {
      limparDadosLocais();
      return;
    }

    const [perfilResult, vinculoResult] = await Promise.all([
      supabase.from('profiles').select('nome').eq('id', usuario.id).maybeSingle(),
      supabase
        .from('usuarios_organizacoes')
        .select('organizacao_id, perfil, ativo')
        .eq('user_id', usuario.id)
        .eq('ativo', true)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle(),
    ]);

    if (perfilResult.error) {
      console.error('Erro ao carregar nome do usuário:', perfilResult.error.message);
    }

    if (vinculoResult.error) {
      console.error('Erro ao carregar vínculo do usuário:', vinculoResult.error.message);
      setPerfil(null);
      setOrganizacaoId(null);
      setVinculoAtivo(false);
    } else {
      const vinculo = vinculoResult.data as {
        organizacao_id: string | null;
        perfil: string | null;
        ativo: boolean | null;
      } | null;

      const perfilSeguro = normalizarPerfil(vinculo?.perfil);
      const acessoAtivo = Boolean(vinculo?.ativo && vinculo.organizacao_id && perfilSeguro);

      setPerfil(acessoAtivo ? perfilSeguro : null);
      setOrganizacaoId(acessoAtivo ? vinculo!.organizacao_id : null);
      setVinculoAtivo(acessoAtivo);
    }

    setNomeUsuario(
      perfilResult.data?.nome ||
        usuario.user_metadata?.nome ||
        usuario.user_metadata?.name ||
        usuario.email ||
        'Usuário logado'
    );
  }, [limparDadosLocais]);

  const aplicarSessao = useCallback(async (currentSession: Session | null) => {
    if (!currentSession) {
      limparDadosLocais();
      return;
    }

    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      console.error('Sessão inválida:', userError?.message);
      await supabase.auth.signOut({ scope: 'local' });
      limparDadosLocais();
      return;
    }

    setSession(currentSession);
    setUser(userData.user);
    await carregarAcesso(userData.user);
  }, [carregarAcesso, limparDadosLocais]);

  useEffect(() => {
    let ativo = true;

    const carregarSessao = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (ativo) await aplicarSessao(data.session);
      } catch (error) {
        console.error('Erro ao carregar sessão:', error);
        if (ativo) limparDadosLocais();
      } finally {
        if (ativo) setLoading(false);
      }
    };

    void carregarSessao();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, currentSession) => {
        if (event === 'PASSWORD_RECOVERY') setRecuperandoSenha(true);

        if (event === 'SIGNED_OUT') {
          limparDadosLocais();
          setLoading(false);
          return;
        }

        window.setTimeout(() => {
          if (!ativo) return;
          setLoading(true);
          void aplicarSessao(currentSession).finally(() => {
            if (ativo) setLoading(false);
          });
        }, 0);
      }
    );

    return () => {
      ativo = false;
      subscription.unsubscribe();
    };
  }, [aplicarSessao, limparDadosLocais]);

  const signIn = useCallback(async (email: string, password: string) => {
    const emailSeguro = normalizarEmail(email);
    if (!emailSeguro) throw new Error('Informe o e-mail.');
    if (!password) throw new Error('Informe a senha.');

    const { data, error } = await supabase.auth.signInWithPassword({
      email: emailSeguro,
      password,
    });

    if (error) throw new Error('E-mail ou senha inválidos.');

    const { data: vinculo, error: vinculoError } = await supabase
      .from('usuarios_organizacoes')
      .select('id')
      .eq('user_id', data.user.id)
      .eq('ativo', true)
      .limit(1)
      .maybeSingle();

    if (vinculoError || !vinculo) {
      await supabase.auth.signOut({ scope: 'local' });
      limparDadosLocais();
      throw new Error('Seu usuário não possui acesso ativo a uma organização. Procure o administrador.');
    }

    await aplicarSessao(data.session);
  }, [aplicarSessao, limparDadosLocais]);

  const signUp = useCallback(async (_nome: string, _email: string, _password: string) => {
    throw new Error('O cadastro público está desativado. Solicite um convite ao administrador.');
  }, []);

  const criarOrganizacaoInicial = useCallback(async (nomeOrganizacao: string) => {
    if (!user) throw new Error('É necessário estar autenticado.');
    if (!nomeOrganizacao.trim()) throw new Error('Informe o nome da organização.');

    const { data, error } = await supabase.rpc('criar_organizacao_inicial', {
      p_nome_organizacao: nomeOrganizacao.trim(),
    });

    if (error) throw error;
    if (!data) throw new Error('Não foi possível criar a organização.');

    await carregarAcesso(user);
    return String(data);
  }, [carregarAcesso, user]);

  const solicitarRecuperacaoSenha = useCallback(async (email: string) => {
    const emailSeguro = normalizarEmail(email);
    if (!emailSeguro) throw new Error('Informe o e-mail.');

    const redirectTo = `${window.location.origin}/redefinir-senha`;
    const { error } = await supabase.auth.resetPasswordForEmail(emailSeguro, { redirectTo });

    if (error) {
      console.error('Erro ao solicitar recuperação:', error.message);
      return;
    }
  }, []);

  const atualizarSenha = useCallback(async (novaSenha: string) => {
    validarSenhaForte(novaSenha);

    const { error } = await supabase.auth.updateUser({ password: novaSenha });
    if (error) throw error;

    setRecuperandoSenha(false);

    const { error: signOutError } = await supabase.auth.signOut({ scope: 'others' });
    if (signOutError) {
      console.error('Não foi possível encerrar as demais sessões:', signOutError.message);
    }
  }, []);

  const concluirAtivacaoConvite = useCallback(async (novaSenha: string) => {
    validarSenhaForte(novaSenha);

    const {
      data: userData,
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      throw new Error(
        'O link de ativação é inválido ou expirou. Solicite um novo convite.'
      );
    }

    const { error: senhaError } =
      await supabase.auth.updateUser({
        password: novaSenha,
        data: {
          ...userData.user.user_metadata,
          flowfinance_activated_at:
            new Date().toISOString(),
        },
      });

    if (senhaError) {
      throw new Error(
        senhaError.message ||
          'Não foi possível definir a senha.'
      );
    }

    const {
      data: ativacaoData,
      error: ativacaoError,
    } = await supabase.rpc(
      'concluir_ativacao_convite'
    );

    if (ativacaoError) {
      throw new Error(
        ativacaoError.message ||
          'A senha foi definida, mas não foi possível ativar o acesso à organização.'
      );
    }

    if (!ativacaoData) {
      throw new Error(
        'Nenhum convite pendente válido foi encontrado para este usuário.'
      );
    }

    setRecuperandoSenha(false);

    const {
      data: sessaoAtual,
    } = await supabase.auth.getSession();

    await aplicarSessao(
      sessaoAtual.session
    );
  }, [aplicarSessao]);

  const recarregarAcesso = useCallback(async () => {
    if (!user) {
      limparDadosLocais();
      return;
    }

    setLoading(true);
    try {
      await carregarAcesso(user);
    } finally {
      setLoading(false);
    }
  }, [carregarAcesso, limparDadosLocais, user]);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut({ scope: 'global' });
    if (error) throw error;
    limparDadosLocais();
  }, [limparDadosLocais]);

  const value = useMemo<AuthContextType>(() => ({
    user,
    session,
    loading,
    perfil,
    nomeUsuario,
    organizacaoId,
    vinculoAtivo,
    recuperandoSenha,
    signIn,
    signUp,
    criarOrganizacaoInicial,
    solicitarRecuperacaoSenha,
    atualizarSenha,
    concluirAtivacaoConvite,
    recarregarAcesso,
    signOut,
  }), [
    user,
    session,
    loading,
    perfil,
    nomeUsuario,
    organizacaoId,
    vinculoAtivo,
    recuperandoSenha,
    signIn,
    signUp,
    criarOrganizacaoInicial,
    solicitarRecuperacaoSenha,
    atualizarSenha,
    concluirAtivacaoConvite,
    recarregarAcesso,
    signOut,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
