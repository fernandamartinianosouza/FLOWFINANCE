import React, {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  Ban,
  CheckCircle2,
  Edit3,
  Mail,
  MoreVertical,
  RefreshCw,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
  X,
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

const statusConviteLabels = {
  pendente: 'Pendente',
  aceito: 'Aceito',
  expirado: 'Expirado',
  cancelado: 'Cancelado',
};

export const UsersAdminView:
  React.FC = () => {
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

    const [usuarioEditando,
      setUsuarioEditando] =
      useState<UsuarioOrganizacaoAdmin | null>(
        null
      );

    const [menuAberto,
      setMenuAberto] =
      useState<string | null>(null);

    const [loading, setLoading] =
      useState(false);

    const [erro, setErro] =
      useState<string | null>(null);

    const organizacao =
      organizacoes.find(
        item =>
          item.id ===
          organizacaoAtivaId
      );

    const usuariosAtivos =
      useMemo(
        () =>
          usuarios.filter(
            usuario => usuario.ativo
          ).length,
        [usuarios]
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

        const dados =
          await organizacaoUsuariosService
            .listar(
              organizacaoAtivaId
            );

        setUsuarios(dados.usuarios);
        setConvites(dados.convites);
      } catch (error: any) {
        setErro(
          error?.message ||
            'Erro ao carregar usuários.'
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
            'Convite processado.'
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

    const salvarUsuario = async (
      event: FormEvent
    ) => {
      event.preventDefault();

      if (!usuarioEditando) return;

      try {
        setLoading(true);
        setErro(null);

        await organizacaoUsuariosService
          .editarUsuario({
            organizacaoId:
              organizacaoAtivaId,
            userId:
              usuarioEditando.userId,
            nome:
              usuarioEditando.nome,
            email:
              usuarioEditando.email,
            perfil:
              usuarioEditando.perfil,
          });

        setUsuarioEditando(null);
        await carregar();
      } catch (error: any) {
        setErro(
          error?.message ||
            'Erro ao atualizar usuário.'
        );
      } finally {
        setLoading(false);
      }
    };

    const alterarStatus = async (
      usuario: UsuarioOrganizacaoAdmin
    ) => {
      const acao =
        usuario.ativo
          ? 'desativar'
          : 'reativar';

      if (
        !window.confirm(
          `Deseja ${acao} o acesso de ${usuario.nome}?`
        )
      ) {
        return;
      }

      try {
        setLoading(true);
        setErro(null);

        await organizacaoUsuariosService
          .alterarStatus({
            organizacaoId:
              organizacaoAtivaId,
            userId: usuario.userId,
            ativo: !usuario.ativo,
          });

        setMenuAberto(null);
        await carregar();
      } catch (error: any) {
        setErro(
          error?.message ||
            'Erro ao alterar status.'
        );
      } finally {
        setLoading(false);
      }
    };

    const remover = async (
      usuario: UsuarioOrganizacaoAdmin
    ) => {
      if (
        !window.confirm(
          `Remover ${usuario.nome} desta organização? A conta global do usuário não será apagada.`
        )
      ) {
        return;
      }

      try {
        setLoading(true);
        setErro(null);

        await organizacaoUsuariosService
          .removerUsuario({
            organizacaoId:
              organizacaoAtivaId,
            userId: usuario.userId,
          });

        setMenuAberto(null);
        await carregar();
      } catch (error: any) {
        setErro(
          error?.message ||
            'Erro ao remover acesso.'
        );
      } finally {
        setLoading(false);
      }
    };

    const cancelarConvite = async (
      convite: ConviteOrganizacao
    ) => {
      if (
        !window.confirm(
          `Cancelar o convite de ${convite.email}?`
        )
      ) {
        return;
      }

      try {
        setLoading(true);
        setErro(null);

        await organizacaoUsuariosService
          .cancelarConvite({
            organizacaoId:
              organizacaoAtivaId,
            conviteId: convite.id,
          });

        await carregar();
      } catch (error: any) {
        setErro(
          error?.message ||
            'Erro ao cancelar convite.'
        );
      } finally {
        setLoading(false);
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
              podem gerenciar os usuários.
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
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

          <button
            type="button"
            onClick={carregar}
            className="inline-flex items-center justify-center gap-2 rounded-xl border bg-white px-4 py-2.5 text-sm font-semibold"
          >
            <RefreshCw
              size={17}
              className={
                loading
                  ? 'animate-spin'
                  : ''
              }
            />
            Atualizar
          </button>
        </div>

        {erro && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {erro}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <Users className="text-slate-500" />
              <div>
                <p className="text-2xl font-bold">
                  {usuarios.length}
                </p>
                <p className="text-xs text-slate-500">
                  Usuários vinculados
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="text-emerald-600" />
              <div>
                <p className="text-2xl font-bold">
                  {usuariosAtivos}
                </p>
                <p className="text-xs text-slate-500">
                  Acessos ativos
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <Mail className="text-slate-500" />
              <div>
                <p className="text-2xl font-bold">
                  {
                    convites.filter(
                      convite =>
                        convite.status ===
                        'pendente'
                    ).length
                  }
                </p>
                <p className="text-xs text-slate-500">
                  Convites pendentes
                </p>
              </div>
            </div>
          </div>
        </div>

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

        <div className="overflow-visible rounded-2xl border bg-white shadow-sm">
          <div className="border-b p-5">
            <h2 className="font-bold text-slate-900">
              Usuários da organização
            </h2>

            <p className="text-sm text-slate-500">
              Edite dados, permissões e
              status de acesso.
            </p>
          </div>

          <div className="divide-y">
            {usuarios.map(usuario => (
              <div
                key={usuario.userId}
                className="relative flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-semibold text-slate-900">
                      {usuario.nome}
                    </p>

                    {usuario.perfil ===
                      'admin' && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-700">
                        <ShieldCheck size={12} />
                        ADMIN
                      </span>
                    )}

                    <span
                      className={
                        usuario.ativo
                          ? 'rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700'
                          : 'rounded-full bg-red-50 px-2 py-1 text-[10px] font-bold text-red-700'
                      }
                    >
                      {usuario.ativo
                        ? 'ATIVO'
                        : 'DESATIVADO'}
                    </span>

                    {usuario.isCurrentUser && (
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600">
                        VOCÊ
                      </span>
                    )}
                  </div>

                  <p className="mt-1 truncate text-sm text-slate-500">
                    {usuario.email}
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    {
                      perfilLabels[
                        usuario.perfil
                      ]
                    }
                    {usuario.ultimoAcesso
                      ? ` · Último acesso: ${new Date(
                          usuario.ultimoAcesso
                        ).toLocaleString(
                          'pt-BR'
                        )}`
                      : ' · Ainda não acessou'}
                  </p>
                </div>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() =>
                      setMenuAberto(
                        atual =>
                          atual ===
                          usuario.userId
                            ? null
                            : usuario.userId
                      )
                    }
                    className="rounded-xl border p-2.5"
                    aria-label="Ações do usuário"
                  >
                    <MoreVertical size={18} />
                  </button>

                  {menuAberto ===
                    usuario.userId && (
                    <div className="absolute right-0 top-12 z-30 w-56 overflow-hidden rounded-xl border bg-white py-1 shadow-xl">
                      <button
                        type="button"
                        onClick={() => {
                          setUsuarioEditando(
                            usuario
                          );
                          setMenuAberto(null);
                        }}
                        className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm hover:bg-slate-50"
                      >
                        <Edit3 size={16} />
                        Editar dados e perfil
                      </button>

                      {!usuario.isCurrentUser && (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              alterarStatus(
                                usuario
                              )
                            }
                            className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm hover:bg-slate-50"
                          >
                            {usuario.ativo ? (
                              <Ban size={16} />
                            ) : (
                              <CheckCircle2 size={16} />
                            )}

                            {usuario.ativo
                              ? 'Desativar acesso'
                              : 'Reativar acesso'}
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              remover(
                                usuario
                              )
                            }
                            className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-red-600 hover:bg-red-50"
                          >
                            <Trash2 size={16} />
                            Remover da organização
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {!loading &&
              usuarios.length === 0 && (
                <div className="p-10 text-center text-sm text-slate-500">
                  Nenhum usuário vinculado.
                </div>
              )}
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
          <div className="border-b p-5">
            <h2 className="font-bold text-slate-900">
              Convites
            </h2>

            <p className="text-sm text-slate-500">
              Histórico de convites enviados.
            </p>
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
                      · {
                        statusConviteLabels[
                          convite.status
                        ]
                      }
                    </p>
                  </div>
                </div>

                {convite.status ===
                  'pendente' && (
                  <button
                    type="button"
                    onClick={() =>
                      cancelarConvite(
                        convite
                      )
                    }
                    className="flex items-center gap-2 rounded-xl border px-3 py-2 text-sm text-red-600"
                  >
                    <XCircle size={16} />
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
        </div>

        {usuarioEditando && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
            <form
              onSubmit={salvarUsuario}
              className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold">
                    Editar usuário
                  </h2>

                  <p className="text-sm text-slate-500">
                    Altere login, nome e permissões.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setUsuarioEditando(
                      null
                    )
                  }
                  className="rounded-xl border p-2"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="mt-6 space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-500">
                    NOME
                  </label>

                  <input
                    value={
                      usuarioEditando.nome
                    }
                    onChange={event =>
                      setUsuarioEditando({
                        ...usuarioEditando,
                        nome:
                          event.target.value,
                      })
                    }
                    required
                    className="w-full rounded-xl border px-3 py-2.5"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-500">
                    LOGIN / E-MAIL
                  </label>

                  <input
                    type="email"
                    value={
                      usuarioEditando.email
                    }
                    onChange={event =>
                      setUsuarioEditando({
                        ...usuarioEditando,
                        email:
                          event.target.value,
                      })
                    }
                    required
                    className="w-full rounded-xl border px-3 py-2.5"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-500">
                    PERFIL E PERMISSÕES
                  </label>

                  <select
                    value={
                      usuarioEditando.perfil
                    }
                    onChange={event =>
                      setUsuarioEditando({
                        ...usuarioEditando,
                        perfil:
                          event.target
                            .value as PerfilOrganizacao,
                      })
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
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setUsuarioEditando(
                      null
                    )
                  }
                  className="rounded-xl border px-4 py-2.5 font-semibold"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-xl bg-slate-950 px-4 py-2.5 font-semibold text-white disabled:opacity-50"
                >
                  Salvar alterações
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    );
  };
