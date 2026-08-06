import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
} from 'lucide-react';

import { useAuth } from '../../context/AuthContext';

type PasswordAccessMode =
  | 'esqueci-senha'
  | 'redefinir-senha'
  | 'definir-senha';

interface PasswordAccessViewProps {
  modo: PasswordAccessMode;
  onVoltar?: () => void;
  onConcluido?: () => void;
}

export const PasswordAccessView: React.FC<
  PasswordAccessViewProps
> = ({
  modo,
  onVoltar,
  onConcluido,
}) => {
  const {
    solicitarRecuperacaoSenha,
    atualizarSenha,
    concluirAtivacaoConvite,
  } = useAuth();

  const [email, setEmail] =
    useState('');
  const [senha, setSenha] =
    useState('');
  const [confirmarSenha, setConfirmarSenha] =
    useState('');
  const [mostrarSenha, setMostrarSenha] =
    useState(false);
  const [loading, setLoading] =
    useState(false);
  const [erro, setErro] =
    useState('');
  const [sucesso, setSucesso] =
    useState('');

  const definindoSenha =
    modo === 'definir-senha' ||
    modo === 'redefinir-senha';

  const titulo = useMemo(() => {
    if (modo === 'definir-senha') {
      return 'Ativar sua conta';
    }

    if (modo === 'redefinir-senha') {
      return 'Criar nova senha';
    }

    return 'Recuperar acesso';
  }, [modo]);

  const descricao = useMemo(() => {
    if (modo === 'definir-senha') {
      return 'Crie sua senha para concluir o convite e liberar seu acesso à organização.';
    }

    if (modo === 'redefinir-senha') {
      return 'Defina uma nova senha para voltar a acessar o FlowFinance.';
    }

    return 'Informe seu e-mail para receber o link de redefinição de senha.';
  }, [modo]);

  const validarSenhas = () => {
    if (senha !== confirmarSenha) {
      throw new Error(
        'As senhas informadas não são iguais.'
      );
    }

    if (!senha) {
      throw new Error(
        'Informe a nova senha.'
      );
    }
  };

  const enviar = async (
    event: React.FormEvent
  ) => {
    event.preventDefault();

    setErro('');
    setSucesso('');
    setLoading(true);

    try {
      if (modo === 'esqueci-senha') {
        await solicitarRecuperacaoSenha(
          email
        );

        setSucesso(
          'Se o e-mail estiver cadastrado, você receberá o link para criar uma nova senha.'
        );
        return;
      }

      validarSenhas();

      if (modo === 'definir-senha') {
        await concluirAtivacaoConvite(
          senha
        );

        setSucesso(
          'Conta ativada com sucesso. Seu acesso à organização foi liberado.'
        );
      } else {
        await atualizarSenha(senha);

        setSucesso(
          'Senha atualizada com sucesso.'
        );
      }

      window.setTimeout(() => {
        onConcluido?.();
      }, 700);
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
    <div className="flex min-h-screen items-center justify-center bg-[#F6F8FC] p-4 sm:p-6">
      <div className="w-full max-w-md rounded-[28px] border border-slate-100 bg-white p-6 shadow-2xl sm:p-8">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0F172A]">
          {modo === 'definir-senha' ? (
            <ShieldCheck className="h-7 w-7 text-[#D4AF37]" />
          ) : (
            <KeyRound className="h-7 w-7 text-[#D4AF37]" />
          )}
        </div>

        <h1 className="mt-6 text-2xl font-black text-[#0F172A]">
          {titulo}
        </h1>

        <p className="mt-2 text-sm leading-relaxed text-slate-500">
          {descricao}
        </p>

        {erro && (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {erro}
          </div>
        )}

        {sucesso && (
          <div className="mt-5 flex gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
            <span>{sucesso}</span>
          </div>
        )}

        <form
          onSubmit={enviar}
          className="mt-6 space-y-4"
        >
          {!definindoSenha && (
            <div>
              <label className="mb-2 block text-[10px] font-bold uppercase tracking-wide text-slate-400">
                E-mail
              </label>

              <div className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4">
                <Mail className="h-4 w-4 text-slate-400" />

                <input
                  type="email"
                  required
                  value={email}
                  onChange={event =>
                    setEmail(
                      event.target.value
                    )
                  }
                  className="w-full border-0 bg-transparent py-3 text-sm outline-none focus:ring-0"
                  placeholder="usuario@empresa.com"
                />
              </div>
            </div>
          )}

          {definindoSenha && (
            <>
              <div>
                <label className="mb-2 block text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  Nova senha
                </label>

                <div className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4">
                  <Lock className="h-4 w-4 text-slate-400" />

                  <input
                    type={
                      mostrarSenha
                        ? 'text'
                        : 'password'
                    }
                    required
                    value={senha}
                    onChange={event =>
                      setSenha(
                        event.target.value
                      )
                    }
                    className="min-w-0 flex-1 border-0 bg-transparent py-3 text-sm outline-none focus:ring-0"
                    placeholder="Mínimo de 10 caracteres"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setMostrarSenha(
                        atual => !atual
                      )
                    }
                    className="text-slate-400"
                    title={
                      mostrarSenha
                        ? 'Ocultar senha'
                        : 'Mostrar senha'
                    }
                  >
                    {mostrarSenha ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  Confirmar senha
                </label>

                <div className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4">
                  <Lock className="h-4 w-4 text-slate-400" />

                  <input
                    type={
                      mostrarSenha
                        ? 'text'
                        : 'password'
                    }
                    required
                    value={confirmarSenha}
                    onChange={event =>
                      setConfirmarSenha(
                        event.target.value
                      )
                    }
                    className="w-full border-0 bg-transparent py-3 text-sm outline-none focus:ring-0"
                    placeholder="Repita a nova senha"
                  />
                </div>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4 text-[11px] leading-relaxed text-slate-500">
                Use pelo menos 10 caracteres, incluindo letra maiúscula,
                letra minúscula, número e caractere especial.
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#0F172A] px-5 py-3.5 text-sm font-bold text-white transition hover:bg-[#1E293B] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading && (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}

            {modo === 'esqueci-senha'
              ? 'Enviar link'
              : modo === 'definir-senha'
              ? 'Ativar conta'
              : 'Atualizar senha'}
          </button>

          {onVoltar && (
            <button
              type="button"
              onClick={onVoltar}
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold text-slate-500 hover:bg-slate-50"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </button>
          )}
        </form>
      </div>
    </div>
  );
};
