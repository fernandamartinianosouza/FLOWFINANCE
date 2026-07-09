import React, { useEffect } from 'react';
import { useFinance } from '../context/FinanceContext';
import { useAuth } from '../context/AuthContext';
import { podeAcessar } from '../config/permissions';
import {
  LayoutDashboard,
  GitBranch,
  PlusCircle,
  CheckSquare,
  Wallet,
  RefreshCw,
  Sliders,
  Calendar,
  TrendingUp,
  Building2,
  Users,
  Sparkles,
  ShieldCheck,
  Usercog,
  UserCog,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { activeView, setActiveView, processos } = useFinance();
  const { perfil, nomeUsuario } = useAuth();

  const aguardandoAprovacao = processos.filter(
    p => p.status === 'autorizacao_cp' || p.status === 'autorizacao_diretoria'
  ).length;

  const contasAPagar = processos.filter(p => p.status === 'pagamento').length;

  const pagamentosProgramados = processos.filter(
    p => p.status === 'pagamento' && p.statusProgramacao === 'programado'
  ).length;

  const conciliacoesPendentes = processos.filter(
    p => p.status === 'conciliacao'
  ).length;

  const menuGroups = [
    {
      title: 'Principal',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      ],
    },
    {
      title: 'Operações',
      items: [
        { id: 'processos', label: 'Central de Processos', icon: GitBranch },
        { id: 'solicitacao', label: 'Nova Solicitação', icon: PlusCircle },
        {
          id: 'autorizacoes',
          label: 'Autorizações',
          icon: CheckSquare,
          badge: aguardandoAprovacao,
        },
      ],
    },
    {
      title: 'Financeiro',
      items: [
        {
          id: 'contas-pagar',
          label: 'Contas a Pagar',
          icon: Wallet,
          badge: contasAPagar,
        },
        {
          id: 'programacao-pagamentos',
          label: 'Programação de Pagamentos',
          icon: Calendar,
          badge: pagamentosProgramados,
        },
        {
          id: 'conciliacao',
          label: 'Conciliação',
          icon: RefreshCw,
          badge: conciliacoesPendentes,
        },
        { id: 'centro-financeiro', label: 'Plano Financeiro', icon: Sliders },
        { id: 'calendario', label: 'Calendário Financeiro', icon: Calendar },
        { id: 'fluxo-caixa', label: 'Fluxo de Caixa', icon: TrendingUp },
      ],
    },
    {
      title: 'Cadastros',
      items: [
        { id: 'empresas', label: 'Empresas', icon: Building2 },
        { id: 'fornecedores', label: 'Fornecedores', icon: Users },
      ],
    },
    {
  title: 'Administração',
  items: [
    { id: 'usuarios', label: 'Gestão de Usuários', icon: UserCog },
  ],
},
  ];

  const menuGroupsPermitidos = menuGroups
    .map(group => ({
      ...group,
      items: group.items.filter(item => podeAcessar(perfil, item.id)),
    }))
    .filter(group => group.items.length > 0);

  useEffect(() => {
    if (!perfil) return;

    if (!podeAcessar(perfil, activeView)) {
      const primeiraViewPermitida =
        menuGroupsPermitidos[0]?.items[0]?.id || 'dashboard';

      setActiveView(primeiraViewPermitida);
    }
  }, [perfil, activeView]);

  const podeCriarSolicitacao = podeAcessar(perfil, 'solicitacao');

  return (
    <aside className="ff-sidebar w-72 flex flex-col h-screen sticky top-0" id="flow_sidebar">
      <div className="p-7 pb-5">
        <div className="flex items-center gap-3.5">
          <div className="relative w-11 h-11 rounded-2xl bg-slate-950 flex items-center justify-center shadow-lg overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
            <Sparkles className="w-5 h-5 text-[#D4AF37] relative z-10" />
          </div>

          <div>
            <span className="font-black tracking-tight text-slate-950 text-[15px] block leading-none">
              FLOW<span className="text-[#3557FF]">FINANCE</span>
            </span>
            <span className="text-[10px] text-slate-400 tracking-[0.16em] font-bold block mt-1.5 uppercase">
              Sistema Financeiro
            </span>
          </div>
        </div>

        {podeCriarSolicitacao && (
          <button
            onClick={() => setActiveView('solicitacao')}
            className="ff-button-primary w-full mt-7 h-11 flex items-center justify-center gap-2 text-xs font-bold"
          >
            <PlusCircle className="w-4 h-4" />
            Nova solicitação
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-6 scrollbar-none">
        {menuGroupsPermitidos.map((group, index) => (
          <div key={index} className="space-y-2">
            <h3 className="text-[10px] font-black text-slate-400 tracking-[0.14em] uppercase px-3">
              {group.title}
            </h3>

            <ul className="space-y-1.5">
              {group.items.map(item => {
                const Icon = item.icon;
                const isActive = activeView === item.id;

                return (
                  <li key={item.id}>
                    <button
                      onClick={() => setActiveView(item.id)}
                      className={`relative w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-[13px] font-semibold transition-all duration-200 group ${
                        isActive
                          ? 'bg-slate-950 text-white shadow-[0_14px_35px_rgba(15,23,42,.18)]'
                          : 'text-slate-500 hover:text-slate-950 hover:bg-white/80'
                      }`}
                      id={`sidebar-item-${item.id}`}
                    >
                      {isActive && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-7 rounded-r-full bg-[#D4AF37]" />
                      )}

                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
                            isActive
                              ? 'bg-white/10'
                              : 'bg-slate-100/70 group-hover:bg-[#EEF2FF]'
                          }`}
                        >
                          <Icon
                            className={`w-4 h-4 transition-colors ${
                              isActive
                                ? 'text-[#D4AF37]'
                                : 'text-slate-400 group-hover:text-[#3557FF]'
                            }`}
                          />
                        </span>

                        <span className="truncate">{item.label}</span>
                      </div>

                      {item.badge !== undefined && item.badge > 0 && (
                        <span
                          className={`min-w-6 h-6 px-2 rounded-full text-[10px] font-black flex items-center justify-center ${
                            isActive
                              ? 'bg-[#D4AF37] text-slate-950'
                              : 'bg-[#EEF2FF] text-[#3557FF]'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      <div className="p-5 mt-auto">
        <div className="rounded-[22px] bg-slate-950 text-white p-4 shadow-lg relative overflow-hidden">
          <div className="absolute right-[-20px] top-[-20px] w-20 h-20 rounded-full bg-[#3557FF]/30 blur-2xl" />

          <div className="flex items-center gap-3 relative z-10">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-[#D4AF37]" />
            </div>

            <div className="min-w-0">
              <span className="text-xs font-bold block truncate">
                {nomeUsuario || 'FlowFinance'}
              </span>
              <span className="text-[10px] text-white/45 block tracking-wider uppercase">
                {perfil || 'sem perfil'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};