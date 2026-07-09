import React, { useEffect, useMemo, useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { PerfilUsuario } from '../config/permissions';
import { usersService, UsuarioSistema } from '../services/usersService';
import {
  UserCog,
  Search,
  ShieldCheck,
  Building2,
  Pencil,
  X,
  Save,
  CheckCircle,
  Ban,
} from 'lucide-react';

const PERFIS: { value: PerfilUsuario; label: string }[] = [
  { value: 'compras', label: 'Compras' },
  { value: 'contas_pagar', label: 'Contas a Pagar' },
  { value: 'diretoria', label: 'Diretoria' },
  { value: 'admin', label: 'Administrador' },
];

export const UsersAdminView: React.FC = () => {
  const { empresas } = useFinance();

  const [usuarios, setUsuarios] = useState<UsuarioSistema[]>([]);
  const [loading, setLoading] = useState(false);
  const [busca, setBusca] = useState('');
  const [perfilFiltro, setPerfilFiltro] = useState<'todos' | PerfilUsuario>('todos');
  const [statusFiltro, setStatusFiltro] = useState<'todos' | 'ativo' | 'bloqueado'>('todos');

  const [modalOpen, setModalOpen] = useState(false);
  const [usuarioEditando, setUsuarioEditando] = useState<UsuarioSistema | null>(null);

  const [editNome, setEditNome] = useState('');
  const [editPerfil, setEditPerfil] = useState<PerfilUsuario>('compras');
  const [editEmpresaId, setEditEmpresaId] = useState<string>('');
  const [editAtivo, setEditAtivo] = useState(true);
  const [salvando, setSalvando] = useState(false);

  const carregarUsuarios = async () => {
    try {
      setLoading(true);
      const lista = await usersService.listarUsuarios();
      setUsuarios(lista);
    } catch (error: any) {
      alert(error.message || 'Erro ao carregar usuários.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarUsuarios();
  }, []);

  const usuariosFiltrados = useMemo(() => {
    return usuarios.filter(usuario => {
      const termo = busca.toLowerCase();

      const matchBusca =
        usuario.nome.toLowerCase().includes(termo) ||
        usuario.email.toLowerCase().includes(termo);

      const matchPerfil =
        perfilFiltro === 'todos' || usuario.perfil === perfilFiltro;

      const matchStatus =
        statusFiltro === 'todos' ||
        (statusFiltro === 'ativo' && usuario.ativo) ||
        (statusFiltro === 'bloqueado' && !usuario.ativo);

      return matchBusca && matchPerfil && matchStatus;
    });
  }, [usuarios, busca, perfilFiltro, statusFiltro]);

  const totalAtivos = usuarios.filter(u => u.ativo).length;
  const totalBloqueados = usuarios.filter(u => !u.ativo).length;
  const totalAdmins = usuarios.filter(u => u.perfil === 'admin').length;

  const abrirEdicao = (usuario: UsuarioSistema) => {
    setUsuarioEditando(usuario);
    setEditNome(usuario.nome);
    setEditPerfil(usuario.perfil);
    setEditEmpresaId(usuario.empresaId || '');
    setEditAtivo(usuario.ativo);
    setModalOpen(true);
  };

  const fecharEdicao = () => {
    setModalOpen(false);
    setUsuarioEditando(null);
  };

  const salvarUsuario = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!usuarioEditando) return;

    try {
      setSalvando(true);

      const atualizado = await usersService.atualizarUsuario(usuarioEditando.id, {
        nome: editNome,
        perfil: editPerfil,
        ativo: editAtivo,
        empresaId: editEmpresaId || null,
      });

      setUsuarios(prev =>
        prev.map(usuario =>
          usuario.id === atualizado.id ? atualizado : usuario
        )
      );

      fecharEdicao();
    } catch (error: any) {
      alert(error.message || 'Erro ao salvar usuário.');
    } finally {
      setSalvando(false);
    }
  };

  const nomeEmpresa = (empresaId?: string | null) => {
    if (!empresaId) return 'Todas / Não vinculada';
    return empresas.find(e => e.id === empresaId)?.nome || 'Empresa não encontrada';
  };

  return (
    <div className="space-y-8" id="users-admin-view-container">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A]">
            Gestão de Usuários
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Controle de perfis, empresas e status de acesso ao FlowFinance.
          </p>
        </div>

        <button
          onClick={carregarUsuarios}
          className="px-4 py-2.5 rounded-[12px] bg-[#0F172A] text-white hover:bg-[#1E293B] font-semibold text-xs transition-all shadow-md"
        >
          Atualizar lista
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <Card title="Total de Usuários" value={usuarios.length} icon={UserCog} />
        <Card title="Ativos" value={totalAtivos} icon={CheckCircle} green />
        <Card title="Bloqueados" value={totalBloqueados} icon={Ban} red />
        <Card title="Admins" value={totalAdmins} icon={ShieldCheck} />
      </div>

      <div className="bg-white rounded-[18px] border border-slate-100 p-5 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-2 bg-slate-50 rounded-[12px] px-3 flex items-center gap-2">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              value={busca}
              onChange={e => setBusca(e.target.value)}
              placeholder="Buscar por nome ou e-mail..."
              className="w-full bg-transparent border-0 focus:ring-0 text-xs text-slate-600 placeholder-slate-400 py-2.5"
            />
          </div>

          <select
            value={perfilFiltro}
            onChange={e => setPerfilFiltro(e.target.value as any)}
            className="bg-slate-50 border-0 rounded-[12px] px-3 py-2.5 text-xs text-slate-600"
          >
            <option value="todos">Todos os perfis</option>
            {PERFIS.map(perfil => (
              <option key={perfil.value} value={perfil.value}>
                {perfil.label}
              </option>
            ))}
          </select>

          <select
            value={statusFiltro}
            onChange={e => setStatusFiltro(e.target.value as any)}
            className="bg-slate-50 border-0 rounded-[12px] px-3 py-2.5 text-xs text-slate-600"
          >
            <option value="todos">Todos os status</option>
            <option value="ativo">Ativos</option>
            <option value="bloqueado">Bloqueados</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-[18px] border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100">
          <h2 className="text-sm font-bold text-[#0F172A]">
            Usuários cadastrados
          </h2>
          <p className="text-[11px] text-slate-400 mt-1">
            {usuariosFiltrados.length} usuário(s) encontrado(s)
          </p>
        </div>

        {loading ? (
          <div className="p-10 text-center text-xs text-slate-400">
            Carregando usuários...
          </div>
        ) : usuariosFiltrados.length === 0 ? (
          <div className="p-10 text-center text-xs text-slate-400">
            Nenhum usuário encontrado.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50/80">
                <tr className="text-[10px] uppercase tracking-wide text-slate-400">
                  <th className="px-5 py-3 font-bold">Usuário</th>
                  <th className="px-5 py-3 font-bold">Perfil</th>
                  <th className="px-5 py-3 font-bold">Empresa</th>
                  <th className="px-5 py-3 font-bold">Status</th>
                  <th className="px-5 py-3 font-bold">Último acesso</th>
                  <th className="px-5 py-3 font-bold text-right">Ações</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-50">
                {usuariosFiltrados.map(usuario => (
                  <tr key={usuario.id} className="hover:bg-slate-50/60">
                    <td className="px-5 py-4">
                      <p className="text-xs font-bold text-[#0F172A]">
                        {usuario.nome}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-1">
                        {usuario.email}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <span className="inline-flex px-2.5 py-1 rounded-full bg-slate-50 border border-slate-100 text-[10px] font-bold text-slate-600 uppercase">
                        {usuario.perfil}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-xs text-slate-500">
                      {nomeEmpresa(usuario.empresaId)}
                    </td>

                    <td className="px-5 py-4">
                      {usuario.ativo ? (
                        <span className="inline-flex px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-[10px] font-bold text-emerald-600">
                          Ativo
                        </span>
                      ) : (
                        <span className="inline-flex px-2.5 py-1 rounded-full bg-red-50 border border-red-100 text-[10px] font-bold text-red-600">
                          Bloqueado
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-4 text-xs text-slate-500 font-mono">
                      {usuario.ultimoAcesso || '-'}
                    </td>

                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => abrirEdicao(usuario)}
                        className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-100 flex items-center justify-center transition ml-auto"
                        title="Editar usuário"
                      >
                        <Pencil className="w-3.5 h-3.5 text-slate-600" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalOpen && usuarioEditando && (
        <>
          <div
            className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs z-50"
            onClick={fecharEdicao}
          />

          <div className="fixed inset-y-0 right-0 max-w-md w-full bg-white shadow-2xl z-50 flex flex-col h-screen border-l border-slate-100">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <UserCog className="w-4 h-4 text-[#0F172A]" />
                <h2 className="text-sm font-bold text-[#0F172A]">
                  Editar Usuário
                </h2>
              </div>

              <button
                onClick={fecharEdicao}
                className="w-8 h-8 rounded-full bg-white border border-slate-100 flex items-center justify-center hover:bg-slate-50 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={salvarUsuario} className="flex-1 p-6 space-y-5 overflow-y-auto">
              <Input label="Nome" value={editNome} onChange={setEditNome} />

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">
                  E-mail
                </label>
                <input
                  value={usuarioEditando.email}
                  readOnly
                  className="w-full bg-slate-100 border-0 rounded-[12px] px-3.5 py-2.5 text-xs text-slate-500 cursor-not-allowed"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">
                  Perfil de Acesso
                </label>
                <select
                  value={editPerfil}
                  onChange={e => setEditPerfil(e.target.value as PerfilUsuario)}
                  className="w-full bg-slate-50 border-0 rounded-[12px] px-3.5 py-2.5 text-xs text-slate-700"
                >
                  {PERFIS.map(perfil => (
                    <option key={perfil.value} value={perfil.value}>
                      {perfil.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">
                  Empresa
                </label>
                <select
                  value={editEmpresaId}
                  onChange={e => setEditEmpresaId(e.target.value)}
                  className="w-full bg-slate-50 border-0 rounded-[12px] px-3.5 py-2.5 text-xs text-slate-700"
                >
                  <option value="">Todas / Não vinculada</option>
                  {empresas.map(empresa => (
                    <option key={empresa.id} value={empresa.id}>
                      {empresa.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-4 rounded-[14px] bg-slate-50 border border-slate-100 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-800">
                    Usuário ativo
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Usuários bloqueados não devem acessar o sistema.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setEditAtivo(prev => !prev)}
                  className={`w-12 h-6 rounded-full p-1 transition ${
                    editAtivo ? 'bg-emerald-500' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`block w-4 h-4 bg-white rounded-full transition ${
                      editAtivo ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <button
                type="submit"
                disabled={salvando}
                className="w-full py-3 bg-[#0F172A] hover:bg-[#1E293B] disabled:opacity-60 text-white font-bold text-xs rounded-[12px] flex items-center justify-center gap-2 transition-all mt-6 shadow-md"
              >
                <Save className="w-4 h-4" />
                <span>{salvando ? 'Salvando...' : 'Salvar Alterações'}</span>
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
};

const Card = ({ title, value, icon: Icon, green, red }: any) => (
  <div className="bg-white rounded-[18px] border border-slate-100 p-5 shadow-sm">
    <div className="flex items-center gap-3">
      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center ${
          green ? 'bg-emerald-50' : red ? 'bg-red-50' : 'bg-slate-100'
        }`}
      >
        <Icon
          className={`w-5 h-5 ${
            green ? 'text-emerald-600' : red ? 'text-red-600' : 'text-[#0F172A]'
          }`}
        />
      </div>
      <div>
        <span className="text-[10px] font-bold text-slate-400 uppercase">
          {title}
        </span>
        <p className="text-sm font-bold text-[#0F172A] font-mono">
          {value}
        </p>
      </div>
    </div>
  </div>
);

const Input = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) => (
  <div className="space-y-1.5">
    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">
      {label}
    </label>
    <input
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full bg-slate-50 border-0 focus:ring-1 focus:ring-[#0F172A]/25 rounded-[12px] px-3.5 py-2.5 text-xs text-slate-700"
    />
  </div>
);

export default UsersAdminView;