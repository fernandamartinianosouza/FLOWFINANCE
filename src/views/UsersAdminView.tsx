import React, {
  FormEvent,
  useEffect,
  useState,
} from 'react';

import {
  CheckCircle2,
  Mail,
  RefreshCw,
  ShieldCheck,
  UserCog,
  UserPlus,
  Users,
  XCircle,
} from 'lucide-react';

import { useFinance } from '../context/FinanceContext';

import {
  ConviteOrganizacao,
  organizacaoUsuariosService,
  PerfilOrganizacao,
  UsuarioOrganizacaoAdmin,
} from '../services/organizacaoUsuariosService';

const perfilLabels:
  Record<PerfilOrganizacao, string> = {
    admin: 'Administrador',
    diretoria: 'Diretoria',
    compras: 'Compras',
    financeiro: 'Financeiro',
    contas_pagar: 'Contas a pagar',
    consulta: 'Consulta',
  };

export const UsersAdminView: React.FC =
  () => {
    const {
      organizacaoAtivaId,
      perfilOrganizacaoAtiva,
      organizacoes,
    } = useFinance();

    const [usuarios, setUsuarios] =
      useState<UsuarioOrganizacaoAdmin[]>([]);

    const [convites, setConvites] =
      useState<ConviteOrganizacao[]>([]);

    const [nome, setNome] =
      useState('');

    const [email, setEmail] =
      useState('');

    const [perfil, setPerfil] =
      useState<PerfilOrganizacao>(
        'compras'
      );

    const [loading, setLoading] =
      useState(false);

    const [salvandoId, setSalvandoId] =
      useState<string | null>(null);

    const [erro, setErro] =
      useState<string | null>(null);

    const organizacao =
      organizacoes.find(
        item =>
          item.id ===
          organizacaoAtivaId
      );

    const carregar = async () => {
      if (!organizacaoAtivaId) {
        setUsuarios([]);
        setConvites([]);
        return;
      }

      try {
        setLoading(true);
        setErro(null);

        const [
          usuariosDados,
          convitesDados,
        ] = await Promise.all([
          organizacaoUsuariosService
            .listarUsuarios(
              organizacaoAtivaId
            ),
          organizacaoUsuariosService
            .listarConvites(
              organizacaoAtivaId
            ),
        ]);

        setUsuarios(usuariosDados);
        setConvites(convitesDados);
      } catch (error: any) {
        setErro(
          error?.message ||
            'Erro ao carregar usuários e convites.'
        );
      } finally {
        setLoading(false);
      }
    };

    useEffect(() => {
      carregar();
    }, [organizacaoAtivaId]);

    const enviarConvite = async (
      event: FormEvent
    ) => {
      event.preventDefault();

      if (
        perfilOrganizacaoAtiva !==
        'admin'
      ) {
        setErro(
          'Somente administradores podem convidar usuários.'
        );
        return;
      }

      try {
        setLoading(true);
        setErro(null);

        const resposta =
          await organizacaoUsuariosService
            .convidar({
              organizacaoId:
                organizacaoAtivaId,
              nome,
              email,
              perfil,
            });

        alert(
          resposta?.message ||
            'Convite enviado. O usuário deverá criar a própria senha.'
        );

        setNome('');
        setEmail('');
        setPerfil('compras');

        await carregar();
      } catch (error: any) {
        setErro(
          error?.message ||
            'Erro ao enviar convite.'
        );
      } finally {
        setLoading(false);
      }
    };

    const cancelar = async (
      conviteId: string
    ) => {
      try {
        setErro(null);

        await organizacaoUsuariosService
          .cancelarConvite(
            conviteId
          );

        await carregar();
      } catch (error: any) {
        setErro(
          error?.message ||
            'Erro ao cancelar convite.'
        );
      }
    };

    const atualizarUsuario = async (
      usuario: UsuarioOrganizacaoAdmin,
      alteracoes: {
        perfil?: PerfilOrganizacao;
        ativo?: boolean;
      }
    ) => {
      try {
        setSalvandoId(usuario.id);
        setErro(null);

        await organizacaoUsuariosService
          .atualizarAcesso({
            vinculoId:
              usuario.id,
            perfil:
              alteracoes.perfil ??
              usuario.perfil,
            ativo:
              alteracoes.ativo ??
              usuario.ativo,
          });

        await carregar();
      } catch (error: any) {
        setErro(
          error?.message ||
            'Erro ao atualizar acesso.'
        );
      } finally {
        setSalvandoId(null);
      }
    };

    if (
      perfilOrganizacaoAtiva !==
      'admin'
    ) {
      return (
        <div className="p-6">
          <div className="rounded-2xl border bg-white p-6">
            <h1 className="text-xl font-bold">
              Usuários e acessos
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Somente administradores
              podem gerenciar os usuários
              da organização.
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6 p-4 md:p-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Usuários e acessos
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Organização:{' '}
            <strong>
              {organizacao?.nome ||
                'Não selecionada'}
            </strong>
          </p>
        </div>

        {erro && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {erro}
          </div>
        )}

        <form
          onSubmit={enviarConvite}
          className="grid gap-4 rounded-2xl border bg-white p-5 shadow-sm md:grid-cols-4"
        >
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">
              NOME
            </label>

            <input
              value={nome}
              onChange={event =>
                setNome(
                  event.target.value
                )
              }
              required
              className="w-full rounded-xl border px-3 py-2.5"
              placeholder="Nome completo"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">
              E-MAIL
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
              className="w-full rounded-xl border px-3 py-2.5"
              placeholder="usuario@empresa.com"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">
              PERFIL
            </label>

            <select
              value={perfil}
              onChange={event =>
                setPerfil(
                  event.target
                    .value as PerfilOrganizacao
                )
              }
              className="w-full rounded-xl border px-3 py-2.5"
            >
              {Object.entries(
                perfilLabels
              ).map(
                ([valor, label]) => (
                  <option
                    key={valor}
                    value={valor}
                  >
                    {label}
                  </option>
                )
              )}
            </select>
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={
                loading ||
                !organizacaoAtivaId
              }
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 font-semibold text-white disabled:opacity-50"
            >
              <UserPlus size={18} />
              Convidar
            </button>
          </div>
        </form>

        <section className="overflow-hidden rounded-2xl border bg-white shadow-sm">
          <div className="flex items-center justify-between border-b p-5">
            <div>
              <div className="flex items-center gap-2">
                <Users
                  size={19}
                  className="text-slate-500"
                />

                <h2 className="font-bold text-slate-900">
                  Acessos existentes
                </h2>
              </div>

              <p className="mt-1 text-sm text-slate-500">
                Usuários vinculados a esta organização.
              </p>
            </div>

            <button
              type="button"
              onClick={carregar}
              className="rounded-xl border p-2"
              title="Atualizar"
            >
              <RefreshCw
                size={18}
                className={
                  loading
                    ? 'animate-spin'
                    : ''
                }
              />
            </button>
          </div>

          <div className="divide-y">
            {usuarios.map(usuario => (
              <div
                key={usuario.id}
                className="grid gap-4 p-5 md:grid-cols-[1fr_210px_150px] md:items-center"
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`rounded-xl p-2 ${
                      usuario.ativo
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {usuario.ativo ? (
                      <ShieldCheck size={18} />
                    ) : (
                      <UserCog size={18} />
                    )}
                  </div>

                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900">
                      {usuario.nome}
                    </p>

                    <p className="truncate text-sm text-slate-500">
                      {usuario.email}
                    </p>

                    <p className="mt-1 flex items-center gap-1 text-xs text-slate-400">
                      {usuario.ativo ? (
                        <>
                          <CheckCircle2 size={12} />
                          Acesso ativo
                        </>
                      ) : (
                        'Acesso desativado'
                      )}
                    </p>
                  </div>
                </div>

                <select
                  value={usuario.perfil}
                  disabled={
                    salvandoId === usuario.id
                  }
                  onChange={event =>
                    atualizarUsuario(
                      usuario,
                      {
                        perfil:
                          event.target
                            .value as PerfilOrganizacao,
                      }
                    )
                  }
                  className="w-full rounded-xl border px-3 py-2.5 text-sm disabled:opacity-50"
                >
                  {Object.entries(
                    perfilLabels
                  ).map(
                    ([valor, label]) => (
                      <option
                        key={valor}
                        value={valor}
                      >
                        {label}
                      </option>
                    )
                  )}
                </select>

                <button
                  type="button"
                  disabled={
                    salvandoId === usuario.id
                  }
                  onClick={() =>
                    atualizarUsuario(
                      usuario,
                      {
                        ativo:
                          !usuario.ativo,
                      }
                    )
                  }
                  className={`rounded-xl border px-4 py-2.5 text-sm font-semibold disabled:opacity-50 ${
                    usuario.ativo
                      ? 'border-red-200 text-red-600 hover:bg-red-50'
                      : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                  }`}
                >
                  {salvandoId === usuario.id
                    ? 'Salvando...'
                    : usuario.ativo
                    ? 'Desativar'
                    : 'Ativar'}
                </button>
              </div>
            ))}

            {!loading &&
              usuarios.length === 0 && (
                <div className="p-10 text-center text-sm text-slate-500">
                  Nenhum acesso ativo encontrado.
                </div>
              )}
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border bg-white shadow-sm">
          <div className="flex items-center justify-between border-b p-5">
            <div>
              <h2 className="font-bold text-slate-900">
                Convites
              </h2>

              <p className="text-sm text-slate-500">
                Convites enviados para esta organização.
              </p>
            </div>

            <button
              type="button"
              onClick={carregar}
              className="rounded-xl border p-2"
              title="Atualizar"
            >
              <RefreshCw
                size={18}
                className={
                  loading
                    ? 'animate-spin'
                    : ''
                }
              />
            </button>
          </div>

          <div className="divide-y">
            {convites.map(convite => (
              <div
                key={convite.id}
                className="flex flex-col gap-3 p-5 md:flex-row md:items-center md:justify-between"
              >
                <div className="flex items-start gap-3">
                  <div className="rounded-xl bg-slate-100 p-2">
                    <Mail size={18} />
                  </div>

                  <div>
                    <p className="font-semibold text-slate-900">
                      {convite.nome ||
                        convite.email}
                    </p>

                    <p className="text-sm text-slate-500">
                      {convite.email}
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      {
                        perfilLabels[
                          convite.perfil
                        ]
                      }{' '}
                      · {convite.status}
                    </p>
                  </div>
                </div>

                {convite.status ===
                  'pendente' && (
                  <button
                    type="button"
                    onClick={() =>
                      cancelar(
                        convite.id
                      )
                    }
                    className="flex items-center gap-2 rounded-xl border px-3 py-2 text-sm text-red-600"
                  >
                    <XCircle
                      size={16}
                    />
                    Cancelar
                  </button>
                )}
              </div>
            ))}

            {!loading &&
              convites.length === 0 && (
                <div className="p-10 text-center text-sm text-slate-500">
                  Nenhum convite enviado.
                </div>
              )}
          </div>
        </section>
      </div>
    );
  };
