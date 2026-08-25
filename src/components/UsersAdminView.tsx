import React, {
  FormEvent,
  useEffect,
  useState,
} from 'react';

import {
  Building2,
  Check,
  CheckCircle2,
  Mail,
  RefreshCw,
  Settings2,
  ShieldCheck,
  UserCog,
  UserPlus,
  Users,
  XCircle,
} from 'lucide-react';

import { useFinance } from '../context/FinanceContext';
import { supabase } from '../lib/supabase';

import {
  ConviteOrganizacao,
  organizacaoUsuariosService,
  PerfilOrganizacao,
  UsuarioOrganizacaoAdmin,
} from '../services/organizacaoUsuariosService';
import { MODULOS_PERMISSOES, ACAO_LABELS, permissoesPadraoPerfil, ModuloPermissao, AcaoPermissao } from '../config/actionPermissions';
import { permissoesService, PermissaoUsuario } from '../services/permissoesService';

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
      empresas,
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

    const [usuarioEmpresas, setUsuarioEmpresas] =
      useState<UsuarioOrganizacaoAdmin | null>(null);

    const [empresasSelecionadas, setEmpresasSelecionadas] =
      useState<string[]>([]);

    const [carregandoEmpresas, setCarregandoEmpresas] =
      useState(false);

    const [salvandoEmpresas, setSalvandoEmpresas] =
      useState(false);

    const [usuarioPermissoes, setUsuarioPermissoes] = useState<UsuarioOrganizacaoAdmin | null>(null);
    const [permissoesSelecionadas, setPermissoesSelecionadas] = useState<PermissaoUsuario[]>([]);
    const [carregandoPermissoes, setCarregandoPermissoes] = useState(false);
    const [salvandoPermissoes, setSalvandoPermissoes] = useState(false);

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

    const abrirEmpresasUsuario = async (
      usuario: UsuarioOrganizacaoAdmin
    ) => {
      if (!organizacaoAtivaId) return;

      try {
        setUsuarioEmpresas(usuario);
        setEmpresasSelecionadas([]);
        setCarregandoEmpresas(true);
        setErro(null);

        const { data, error } = await supabase.rpc(
          'listar_empresas_usuario',
          {
            p_user_id: usuario.userId,
            p_organizacao_id:
              organizacaoAtivaId,
          }
        );

        if (error) throw error;

        setEmpresasSelecionadas(
          (data ?? [])
            .filter(
              (item: any) =>
                item.ativo !== false
            )
            .map((item: any) =>
              String(item.empresa_id)
            )
        );
      } catch (error: any) {
        setErro(
          error?.message ||
            'Erro ao carregar empresas do usuário.'
        );
      } finally {
        setCarregandoEmpresas(false);
      }
    };

    const alternarEmpresa = (
      empresaId: string
    ) => {
      setEmpresasSelecionadas(prev =>
        prev.includes(empresaId)
          ? prev.filter(
              id => id !== empresaId
            )
          : [...prev, empresaId]
      );
    };

    const salvarEmpresasUsuario =
      async () => {
        if (
          !usuarioEmpresas ||
          !organizacaoAtivaId
        ) {
          return;
        }

        try {
          setSalvandoEmpresas(true);
          setErro(null);

          const { error } = await supabase.rpc(
            'definir_empresas_usuario',
            {
              p_user_id:
                usuarioEmpresas.userId,
              p_organizacao_id:
                organizacaoAtivaId,
              p_empresa_ids:
                empresasSelecionadas,
            }
          );

          if (error) throw error;

          setUsuarioEmpresas(null);

          alert(
            'Empresas liberadas atualizadas com sucesso.'
          );
        } catch (error: any) {
          setErro(
            error?.message ||
              'Erro ao salvar empresas do usuário.'
          );
        } finally {
          setSalvandoEmpresas(false);
        }
      };

    const abrirPermissoesUsuario = async (usuario: UsuarioOrganizacaoAdmin) => {
      if (!organizacaoAtivaId) return;
      setUsuarioPermissoes(usuario);
      setCarregandoPermissoes(true);
      setErro(null);
      try {
        const atuais = await permissoesService.listar(organizacaoAtivaId, usuario.userId);
        setPermissoesSelecionadas(atuais.length > 0 ? atuais : permissoesPadraoPerfil(usuario.perfil));
      } catch (error: any) {
        setErro(error?.message || 'Erro ao carregar permissões.');
      } finally { setCarregandoPermissoes(false); }
    };

    const marcadaPermissao = (modulo: ModuloPermissao, acao: AcaoPermissao) =>
      permissoesSelecionadas.some(p => p.modulo === modulo && p.acao === acao && p.permitido);

    const alternarPermissao = (modulo: ModuloPermissao, acao: AcaoPermissao) => {
      setPermissoesSelecionadas(prev => {
        const existe = prev.some(p => p.modulo === modulo && p.acao === acao);
        if (existe) return prev.filter(p => !(p.modulo === modulo && p.acao === acao));
        return [...prev, { modulo, acao, permitido: true }];
      });
    };

    const marcarTudoPermissoes = () => setPermissoesSelecionadas(
      MODULOS_PERMISSOES.flatMap(m => m.acoes.map(acao => ({ modulo: m.id, acao, permitido: true })))
    );

    const somenteLeitura = () => setPermissoesSelecionadas(
      MODULOS_PERMISSOES.map(m => ({ modulo: m.id, acao: 'visualizar' as AcaoPermissao, permitido: true }))
    );

    const salvarPermissoesUsuario = async () => {
      if (!usuarioPermissoes || !organizacaoAtivaId) return;
      try {
        setSalvandoPermissoes(true);
        setErro(null);
        await permissoesService.salvar(organizacaoAtivaId, usuarioPermissoes.userId, permissoesSelecionadas);
        setUsuarioPermissoes(null);
        alert('Permissões atualizadas com sucesso.');
      } catch (error: any) {
        setErro(error?.message || 'Erro ao salvar permissões.');
      } finally { setSalvandoPermissoes(false); }
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
                className="grid gap-4 p-5 md:grid-cols-[1fr_190px_135px_145px_130px] md:items-center"
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
                    abrirEmpresasUsuario(
                      usuario
                    )
                  }
                  className="flex items-center justify-center gap-2 rounded-xl border border-blue-200 px-4 py-2.5 text-sm font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-50"
                >
                  <Building2 size={16} />
                  Empresas
                </button>

                <button
                  type="button"
                  disabled={salvandoId === usuario.id}
                  onClick={() => abrirPermissoesUsuario(usuario)}
                  className="flex items-center justify-center gap-2 rounded-xl border border-violet-200 px-4 py-2.5 text-sm font-semibold text-violet-700 hover:bg-violet-50 disabled:opacity-50"
                >
                  <Settings2 size={16} />
                  Permissões
                </button>

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

        {usuarioPermissoes && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/45 p-4">
            <div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
              <div className="flex items-start justify-between border-b p-5">
                <div>
                  <h3 className="font-bold text-slate-900">Permissões do usuário</h3>
                  <p className="mt-1 text-sm text-slate-500">{usuarioPermissoes.nome} · {usuarioPermissoes.email}</p>
                  {usuarioPermissoes.perfil === 'admin' && <p className="mt-2 text-xs font-semibold text-amber-600">Administradores sempre possuem acesso total.</p>}
                </div>
                <button type="button" onClick={() => setUsuarioPermissoes(null)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><XCircle size={20}/></button>
              </div>

              <div className="flex flex-wrap gap-2 border-b bg-slate-50 px-5 py-3">
                <button type="button" onClick={marcarTudoPermissoes} disabled={usuarioPermissoes.perfil === 'admin'} className="rounded-lg bg-slate-950 px-3 py-2 text-xs font-semibold text-white disabled:opacity-40">Marcar tudo</button>
                <button type="button" onClick={somenteLeitura} disabled={usuarioPermissoes.perfil === 'admin'} className="rounded-lg border bg-white px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-40">Somente leitura</button>
                <button type="button" onClick={() => setPermissoesSelecionadas([])} disabled={usuarioPermissoes.perfil === 'admin'} className="rounded-lg border bg-white px-3 py-2 text-xs font-semibold text-red-600 disabled:opacity-40">Limpar</button>
              </div>

              <div className="overflow-y-auto p-5">
                {carregandoPermissoes ? <div className="p-10 text-center text-sm text-slate-500">Carregando permissões...</div> : (
                  <div className="space-y-4">
                    {MODULOS_PERMISSOES.map(modulo => (
                      <div key={modulo.id} className="rounded-xl border p-4">
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <p className="font-semibold text-slate-800">{modulo.label}</p>
                          <span className="text-xs text-slate-400">{modulo.acoes.filter(a => marcadaPermissao(modulo.id,a)).length}/{modulo.acoes.length}</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {modulo.acoes.map(acao => {
                            const marcada = usuarioPermissoes.perfil === 'admin' || marcadaPermissao(modulo.id, acao);
                            return <button key={acao} type="button" disabled={usuarioPermissoes.perfil === 'admin'} onClick={() => alternarPermissao(modulo.id, acao)} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition ${marcada ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-500'}`}>
                              <span className={`flex h-4 w-4 items-center justify-center rounded border ${marcada ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300 text-transparent'}`}><Check size={11}/></span>
                              {ACAO_LABELS[acao]}
                            </button>;
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 border-t bg-slate-50 p-4">
                <button type="button" onClick={() => setUsuarioPermissoes(null)} className="rounded-xl border bg-white px-4 py-2.5 text-sm font-semibold text-slate-600">Cancelar</button>
                <button type="button" disabled={salvandoPermissoes || carregandoPermissoes || usuarioPermissoes.perfil === 'admin'} onClick={salvarPermissoesUsuario} className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40">{salvandoPermissoes ? 'Salvando...' : 'Salvar permissões'}</button>
              </div>
            </div>
          </div>
        )}

        {usuarioEmpresas && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 p-4"
            onMouseDown={event => {
              if (
                event.target ===
                  event.currentTarget &&
                !salvandoEmpresas
              ) {
                setUsuarioEmpresas(null);
              }
            }}
          >
            <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
              <div className="flex items-start justify-between border-b p-5">
                <div>
                  <h3 className="font-bold text-slate-900">
                    Empresas com acesso
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    {usuarioEmpresas.nome}
                  </p>

                  <p className="text-xs text-slate-400">
                    {usuarioEmpresas.email}
                  </p>
                </div>

                <button
                  type="button"
                  disabled={salvandoEmpresas}
                  onClick={() =>
                    setUsuarioEmpresas(null)
                  }
                  className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 disabled:opacity-40"
                >
                  <XCircle size={20} />
                </button>
              </div>

              <div className="p-5">
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={
                      carregandoEmpresas ||
                      empresas.length === 0
                    }
                    onClick={() =>
                      setEmpresasSelecionadas(
                        empresas.map(item =>
                          String(item.id)
                        )
                      )
                    }
                    className="rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-40"
                  >
                    Marcar todas
                  </button>

                  <button
                    type="button"
                    disabled={
                      carregandoEmpresas ||
                      empresasSelecionadas.length ===
                        0
                    }
                    onClick={() =>
                      setEmpresasSelecionadas([])
                    }
                    className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 disabled:opacity-40"
                  >
                    Limpar
                  </button>

                  <span className="ml-auto text-xs font-semibold text-slate-400">
                    {empresasSelecionadas.length} de{' '}
                    {empresas.length}
                  </span>
                </div>

                <div className="max-h-[360px] overflow-y-auto rounded-xl border">
                  {carregandoEmpresas ? (
                    <div className="p-8 text-center text-sm text-slate-500">
                      Carregando empresas...
                    </div>
                  ) : empresas.length === 0 ? (
                    <div className="p-8 text-center text-sm text-slate-500">
                      Nenhuma empresa cadastrada.
                    </div>
                  ) : (
                    <div className="divide-y">
                      {empresas.map(empresa => {
                        const marcada =
                          empresasSelecionadas.includes(
                            String(empresa.id)
                          );

                        return (
                          <button
                            key={empresa.id}
                            type="button"
                            onClick={() =>
                              alternarEmpresa(
                                String(
                                  empresa.id
                                )
                              )
                            }
                            className={`flex w-full items-center gap-3 p-4 text-left transition ${
                              marcada
                                ? 'bg-blue-50'
                                : 'bg-white hover:bg-slate-50'
                            }`}
                          >
                            <span
                              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                                marcada
                                  ? 'border-blue-600 bg-blue-600 text-white'
                                  : 'border-slate-300 bg-white text-transparent'
                              }`}
                            >
                              <Check size={14} />
                            </span>

                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-semibold text-slate-800">
                                {empresa.nome}
                              </span>

                              <span className="mt-0.5 block text-xs text-slate-400">
                                {marcada
                                  ? 'Acesso liberado'
                                  : 'Sem acesso'}
                              </span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {empresasSelecionadas.length ===
                  0 && (
                  <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
                    Nenhuma empresa selecionada. Este login não terá acesso aos dados de nenhuma empresa.
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2 border-t bg-slate-50 p-4">
                <button
                  type="button"
                  disabled={salvandoEmpresas}
                  onClick={() =>
                    setUsuarioEmpresas(null)
                  }
                  className="rounded-xl border bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 disabled:opacity-40"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  disabled={
                    salvandoEmpresas ||
                    carregandoEmpresas
                  }
                  onClick={
                    salvarEmpresasUsuario
                  }
                  className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
                >
                  {salvandoEmpresas
                    ? 'Salvando...'
                    : 'Salvar empresas'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };