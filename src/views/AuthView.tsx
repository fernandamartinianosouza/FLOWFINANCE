import React, { useState } from 'react';
import {
  Lock,
  Mail,
  User,
  ArrowRight,
  Loader2,
  ShieldCheck,
  Building2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { PasswordAccessView } from '../components/auth/PasswordAccessView';

type ModoAuth =
  | 'login'
  | 'cadastro'
  | 'esqueci-senha';

export const AuthView: React.FC = () => {
  const { signIn, signUp } = useAuth();

  const [modo, setModo] =
    useState<ModoAuth>('login');

  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');

  const [loading, setLoading] =
    useState(false);

  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] =
    useState('');

  const limparMensagens = () => {
    setErro('');
    setSucesso('');
  };

  const trocarModo = (
    novoModo: ModoAuth
  ) => {
    limparMensagens();
    setModo(novoModo);

    if (novoModo !== 'cadastro') {
      setNome('');
    }

    if (
      novoModo === 'login' ||
      novoModo === 'cadastro'
    ) {
      setSenha('');
    }
  };

  const handleSubmit = async (
    event: React.FormEvent
  ) => {
    event.preventDefault();

    limparMensagens();
    setLoading(true);

    try {
      if (modo === 'login') {
        await signIn(email, senha);
        return;
      }

      if (!nome.trim()) {
        throw new Error(
          'Informe seu nome para criar a conta.'
        );
      }

      const resultado = await signUp(
        nome,
        email,
        senha
      );

      if (
        resultado?.precisaConfirmarEmail
      ) {
        setSucesso(
          'Conta criada. Confira seu e-mail para confirmar o cadastro.'
        );
      } else {
        setSucesso(
          'Conta criada com sucesso.'
        );
      }
    } catch (error: any) {
      setErro(
        error?.message ||
          'Não foi possível autenticar.'
      );
    } finally {
      setLoading(false);
    }
  };

  if (modo === 'esqueci-senha') {
    return (
      <PasswordAccessView
        modo="esqueci-senha"
        onVoltar={() =>
          trocarModo('login')
        }
      />
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F6F8FC] p-6">
      <div className="grid w-full max-w-6xl grid-cols-1 overflow-hidden rounded-[32px] border border-slate-100 bg-white shadow-2xl lg:grid-cols-2">
        <div className="hidden min-h-[680px] flex-col justify-between bg-[#0F172A] p-10 text-white lg:flex">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/10">
                <Building2 className="h-5 w-5 text-[#D4AF37]" />
              </div>

              <div>
                <h1 className="text-lg font-black tracking-tight">
                  FlowFinance
                </h1>

                <p className="text-[11px] text-slate-400">
                  Compras e Contas a Pagar
                </p>
              </div>
            </div>

            <div className="mt-24">
              <p className="mb-5 text-xs font-bold uppercase tracking-[0.3em] text-[#D4AF37]">
                SaaS financeiro corporativo
              </p>

              <h2 className="text-4xl font-black leading-tight tracking-tight">
                Controle compras, aprovações e
                pagamentos em um só lugar.
              </h2>

              <p className="mt-5 max-w-md text-sm leading-6 text-slate-400">
                Centralize solicitações,
                fornecedores, plano financeiro,
                centros de custo, conciliação e
                histórico auditável com uma
                experiência moderna.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <ShieldCheck className="mb-4 h-5 w-5 text-[#D4AF37]" />

              <p className="text-xs font-bold">
                Seguro
              </p>

              <p className="mt-1 text-[10px] text-slate-400">
                Supabase Auth
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <Lock className="mb-4 h-5 w-5 text-[#D4AF37]" />

              <p className="text-xs font-bold">
                Privado
              </p>

              <p className="mt-1 text-[10px] text-slate-400">
                RLS por organização
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <ArrowRight className="mb-4 h-5 w-5 text-[#D4AF37]" />

              <p className="text-xs font-bold">
                Ágil
              </p>

              <p className="mt-1 text-[10px] text-slate-400">
                Fluxo guiado
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center p-8 sm:p-12">
          <div className="mx-auto w-full max-w-md">
            <div className="mb-8">
              <span className="inline-flex rounded-full border border-slate-100 bg-slate-50 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                {modo === 'login'
                  ? 'Acesso ao sistema'
                  : 'Criar nova conta'}
              </span>

              <h2 className="mt-5 text-2xl font-black tracking-tight text-[#0F172A]">
                {modo === 'login'
                  ? 'Entre no FlowFinance'
                  : 'Comece no FlowFinance'}
              </h2>

              <p className="mt-2 text-xs text-slate-400">
                {modo === 'login'
                  ? 'Informe suas credenciais para acessar o painel.'
                  : 'Crie seu usuário para iniciar a configuração do ambiente.'}
              </p>
            </div>

            <form
              onSubmit={handleSubmit}
              className="space-y-4"
            >
              {modo === 'cadastro' && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    Nome completo
                  </label>

                  <div className="flex items-center gap-2 rounded-[14px] border border-slate-100 bg-slate-50 px-3">
                    <User className="h-4 w-4 text-slate-400" />

                    <input
                      type="text"
                      value={nome}
                      onChange={event =>
                        setNome(
                          event.target.value
                        )
                      }
                      placeholder="Seu nome"
                      autoComplete="name"
                      className="w-full border-0 bg-transparent py-3 text-sm text-slate-700 placeholder-slate-400 focus:ring-0"
                      required
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  E-mail
                </label>

                <div className="flex items-center gap-2 rounded-[14px] border border-slate-100 bg-slate-50 px-3">
                  <Mail className="h-4 w-4 text-slate-400" />

                  <input
                    type="email"
                    value={email}
                    onChange={event =>
                      setEmail(
                        event.target.value
                      )
                    }
                    placeholder="voce@empresa.com"
                    autoComplete="email"
                    className="w-full border-0 bg-transparent py-3 text-sm text-slate-700 placeholder-slate-400 focus:ring-0"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-3">
                  <label className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    Senha
                  </label>

                  {modo === 'login' && (
                    <button
                      type="button"
                      onClick={() =>
                        trocarModo(
                          'esqueci-senha'
                        )
                      }
                      className="text-xs font-medium text-slate-500 transition hover:text-[#0F172A]"
                    >
                      Esqueci minha senha
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 rounded-[14px] border border-slate-100 bg-slate-50 px-3">
                  <Lock className="h-4 w-4 text-slate-400" />

                  <input
                    type="password"
                    value={senha}
                    onChange={event =>
                      setSenha(
                        event.target.value
                      )
                    }
                    placeholder="••••••••"
                    autoComplete={
                      modo === 'login'
                        ? 'current-password'
                        : 'new-password'
                    }
                    minLength={
                      modo === 'cadastro'
                        ? 6
                        : undefined
                    }
                    className="w-full border-0 bg-transparent py-3 text-sm text-slate-700 placeholder-slate-400 focus:ring-0"
                    required
                  />
                </div>
              </div>

              {erro && (
                <div className="rounded-[14px] border border-red-100 bg-red-50 px-4 py-3 text-xs font-semibold text-red-600">
                  {erro}
                </div>
              )}

              {sucesso && (
                <div className="rounded-[14px] border border-emerald-100 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-700">
                  {sucesso}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-[14px] bg-[#0F172A] text-sm font-bold text-white transition-all hover:bg-[#1E293B] disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    {modo === 'login'
                      ? 'Entrar'
                      : 'Criar conta'}

                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() =>
                  trocarModo(
                    modo === 'login'
                      ? 'cadastro'
                      : 'login'
                  )
                }
                className="text-xs text-slate-500 transition hover:text-[#0F172A]"
              >
                {modo === 'login'
                  ? 'Ainda não tenho conta. Criar cadastro.'
                  : 'Já tenho conta. Entrar.'}
              </button>
            </div>

            {modo === 'cadastro' && (
              <p className="mt-4 text-center text-[11px] leading-5 text-slate-400">
                O cadastro público cria uma nova
                organização. Funcionários de uma
                organização existente devem usar
                o convite enviado pelo
                administrador.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};