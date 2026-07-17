import React, {
  FormEvent,
  useState,
} from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Mail,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface PasswordAccessViewProps {
  modo:
    | 'esqueci-senha'
    | 'definir-senha';

  onVoltar: () => void;
  onConcluido?: () => void;
}

export const PasswordAccessView:
  React.FC<PasswordAccessViewProps> = ({
    modo,
    onVoltar,
    onConcluido,
  }) => {
    const {
      solicitarRedefinicaoSenha,
      atualizarSenha,
    } = useAuth();

    const [email, setEmail] =
      useState('');

    const [senha, setSenha] =
      useState('');

    const [confirmarSenha,
      setConfirmarSenha] =
      useState('');

    const [mostrarSenha,
      setMostrarSenha] =
      useState(false);

    const [loading, setLoading] =
      useState(false);

    const [erro, setErro] =
      useState<string | null>(null);

    const [sucesso, setSucesso] =
      useState<string | null>(null);

    const definirSenha =
      modo === 'definir-senha';

    const enviar = async (
      event: FormEvent
    ) => {
      event.preventDefault();

      try {
        setLoading(true);
        setErro(null);
        setSucesso(null);

        if (definirSenha) {
          if (senha !== confirmarSenha) {
            throw new Error(
              'As senhas não coincidem.'
            );
          }

          await atualizarSenha(senha);

          setSucesso(
            'Senha definida com sucesso. Você já pode acessar o FlowFinance.'
          );

          window.setTimeout(() => {
            onConcluido?.();
          }, 1200);

          return;
        }

        await solicitarRedefinicaoSenha(
          email
        );

        setSucesso(
          'Enviamos um link para o seu e-mail. Abra a mensagem e clique para definir uma nova senha.'
        );
      } catch (error: any) {
        setErro(
          error?.message ||
            'Não foi possível concluir a operação.'
        );
      } finally {
        setLoading(false);
      }
    };

    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
        <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-xl md:p-8">
          <button
            type="button"
            onClick={onVoltar}
            className="mb-6 flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900"
          >
            <ArrowLeft size={17} />
            Voltar para o login
          </button>

          <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white">
            {definirSenha ? (
              <KeyRound size={22} />
            ) : (
              <Mail size={22} />
            )}
          </div>

          <h1 className="text-2xl font-bold text-slate-950">
            {definirSenha
              ? 'Definir minha senha'
              : 'Esqueci minha senha'}
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            {definirSenha
              ? 'Crie uma senha segura para concluir o acesso à sua organização.'
              : 'Informe seu e-mail para receber o link de redefinição de senha.'}
          </p>

          {erro && (
            <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {erro}
            </div>
          )}

          {sucesso && (
            <div className="mt-5 flex gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
              <CheckCircle2
                className="mt-0.5 shrink-0"
                size={18}
              />
              {sucesso}
            </div>
          )}

          <form
            onSubmit={enviar}
            className="mt-6 space-y-4"
          >
            {!definirSenha && (
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  E-mail
                </label>

                <input
                  type="email"
                  value={email}
                  onChange={event =>
                    setEmail(
                      event.target.value
                    )
                  }
                  required
                  autoComplete="email"
                  placeholder="seuemail@empresa.com"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-slate-900"
                />
              </div>
            )}

            {definirSenha && (
              <>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Nova senha
                  </label>

                  <div className="relative">
                    <input
                      type={
                        mostrarSenha
                          ? 'text'
                          : 'password'
                      }
                      value={senha}
                      onChange={event =>
                        setSenha(
                          event.target.value
                        )
                      }
                      required
                      minLength={8}
                      autoComplete="new-password"
                      placeholder="Mínimo de 8 caracteres"
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 pr-12 outline-none transition focus:border-slate-900"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setMostrarSenha(
                          atual => !atual
                        )
                      }
                      className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-slate-400"
                    >
                      {mostrarSenha ? (
                        <EyeOff size={18} />
                      ) : (
                        <Eye size={18} />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Confirmar senha
                  </label>

                  <input
                    type={
                      mostrarSenha
                        ? 'text'
                        : 'password'
                    }
                    value={confirmarSenha}
                    onChange={event =>
                      setConfirmarSenha(
                        event.target.value
                      )
                    }
                    required
                    minLength={8}
                    autoComplete="new-password"
                    placeholder="Digite novamente"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-slate-900"
                  />
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-slate-950 px-4 py-3 font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading
                ? 'Aguarde...'
                : definirSenha
                ? 'Salvar nova senha'
                : 'Enviar link'}
            </button>
          </form>
        </div>
      </div>
    );
  };
