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
  UserCog,
  ClipboardList,
  CalendarDays,
  ReceiptText,
  Package,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const {
    activeView,
    setActiveView,
    processos,
  } = useFinance();

  const {
    perfil,
    nomeUsuario,
  } = useAuth();

  const aguardandoAprovacao =
    processos.filter(
      processo =>
        processo.origem !== 'conta_pagar' &&
        (
          processo.status === 'autorizacao_cp' ||
          processo.status === 'autorizacao_diretoria' ||
          processo.status === 'autorizacao_contas'
        )
    ).length;

  const contasAPagar =
    processos.filter(
      processo =>
        processo.status === 'pagamento' &&
        processo.statusProgramacao !== 'pago'
    ).length;

  const pagamentosProgramados =
    processos.filter(
      processo =>
        processo.status === 'pagamento' &&
        processo.statusProgramacao === 'programado'
    ).length;

  const conciliacoesPendentes =
    processos.filter(
      processo =>
        processo.status === 'conciliacao'
    ).length;

  const menuGroups = [
    {
      title: 'Principal',
      items: [
        {
          id: 'dashboard',
          label: 'Dashboard',
          icon: LayoutDashboard,
        },
        {
          id: 'processos',
          label: 'Central de Processos',
          icon: GitBranch,
        },
      ],
    },

    {
      title: 'Compras',
      items: [
        {
          id: 'solicitacao',
          label: 'Nova Solicitação',
          icon: PlusCircle,
        },
        {
          id: 'catalogo-itens',
          label: 'Catálogo de Itens',
          icon: Package,
        },
        {
          id: 'cotacoes',
          label: 'Cotações',
          icon: ClipboardList,
        },
        {
          id: 'autorizacoes',
          label: 'Autorizações',
          icon: CheckSquare,
          badge: aguardandoAprovacao,
        },
      ],
    },

    {
      title: 'Contas a Pagar',
      items: [
        {
          id: 'nova-conta',
          label: 'Nova Conta',
          icon: ReceiptText,
        },
        {
          id: 'calendario',
          label: 'Calendário Financeiro',
          icon: Calendar,
        },
        {
          id: 'fluxo-caixa',
          label: 'Fluxo de Caixa',
          icon: TrendingUp,
        },
        {
          id: 'contas-pagar',
          label: 'Contas a Pagar',
          icon: Wallet,
          badge: contasAPagar,
        },
        {
          id: 'pagamentos-programados',
          label: 'Programação',
          icon: CalendarDays,
          badge: pagamentosProgramados,
        },
        {
          id: 'conciliacao',
          label: 'Conciliação',
          icon: RefreshCw,
          badge: conciliacoesPendentes,
        },
      ],
    },

    {
      title: 'Cadastros',
      items: [
        {
          id: 'centro-financeiro',
          label: 'Plano Financeiro',
          icon: Sliders,
        },
        {
          id: 'empresas',
          label: 'Empresas',
          icon: Building2,
        },
        {
          id: 'fornecedores',
          label: 'Fornecedores',
          icon: Users,
        },
      ],
    },

    {
      title: 'Administração',
      items: [
        {
          id: 'usuarios',
          label: 'Gestão de Usuários',
          icon: UserCog,
        },
      ],
    },
  ];

  const menuGroupsPermitidos =
    menuGroups
      .map(group => ({
        ...group,
        items: group.items.filter(
          item =>
            podeAcessar(
              perfil,
              item.id
            )
        ),
      }))
      .filter(
        group =>
          group.items.length > 0
      );

  useEffect(() => {
    if (!perfil) {
      return;
    }

    if (
      !podeAcessar(
        perfil,
        activeView
      )
    ) {
      const primeiraViewPermitida =
        menuGroupsPermitidos[0]
          ?.items[0]?.id ||
        'dashboard';

      setActiveView(
        primeiraViewPermitida
      );
    }
  }, [
    perfil,
    activeView,
    setActiveView,
  ]);

  const podeCriarSolicitacao =
    podeAcessar(
      perfil,
      'solicitacao'
    );

  const podeCriarConta =
    podeAcessar(
      perfil,
      'nova-conta'
    );

  return (
    <aside
      className="ff-sidebar sticky top-0 flex h-screen w-72 flex-col"
      id="flow_sidebar"
    >
      <div className="p-7 pb-5">
        <div className="flex items-center gap-3.5">
          <div className="relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl bg-slate-950 shadow-lg">
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />

            <Sparkles className="relative z-10 h-5 w-5 text-[#D4AF37]" />
          </div>

          <div>
            <span className="block text-[15px] font-black leading-none tracking-tight text-slate-950">
              FLOW
              <span className="text-[#3557FF]">
                FINANCE
              </span>
            </span>

            <span className="mt-1.5 block text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
              Sistema Financeiro
            </span>
          </div>
        </div>

        <div className="mt-7 space-y-2">
          {podeCriarSolicitacao && (
            <button
              type="button"
              onClick={() =>
                setActiveView(
                  'solicitacao'
                )
              }
              className="ff-button-primary flex h-11 w-full items-center justify-center gap-2 text-xs font-bold"
            >
              <PlusCircle className="h-4 w-4" />
              Nova solicitação
            </button>
          )}

          {podeCriarConta && (
            <button
              type="button"
              onClick={() =>
                setActiveView(
                  'nova-conta'
                )
              }
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#3557FF]/20 bg-[#EEF2FF] text-xs font-bold text-[#3557FF] transition hover:bg-[#E4E9FF]"
            >
              <ReceiptText className="h-4 w-4" />
              Nova conta
            </button>
          )}
        </div>
      </div>

      <div className="scrollbar-none flex-1 space-y-6 overflow-y-auto px-4 py-3">
        {menuGroupsPermitidos.map(
          group => (
            <div
              key={group.title}
              className="space-y-2"
            >
              <h3 className="px-3 text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                {group.title}
              </h3>

              <ul className="space-y-1.5">
                {group.items.map(
                  item => {
                    const Icon =
                      item.icon;

                    const isActive =
                      activeView ===
                      item.id;

                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() =>
                            setActiveView(
                              item.id
                            )
                          }
                          className={`group relative flex w-full items-center justify-between rounded-2xl px-3.5 py-3 text-[13px] font-semibold transition-all duration-200 ${
                            isActive
                              ? 'bg-slate-950 text-white shadow-[0_14px_35px_rgba(15,23,42,.18)]'
                              : 'text-slate-500 hover:bg-white/80 hover:text-slate-950'
                          }`}
                          id={`sidebar-item-${item.id}`}
                        >
                          {isActive && (
                            <span className="absolute left-0 top-1/2 h-7 w-1 -translate-y-1/2 rounded-r-full bg-[#D4AF37]" />
                          )}

                          <div className="flex min-w-0 items-center gap-3">
                            <span
                              className={`flex h-8 w-8 items-center justify-center rounded-xl transition-colors ${
                                isActive
                                  ? 'bg-white/10'
                                  : 'bg-slate-100/70 group-hover:bg-[#EEF2FF]'
                              }`}
                            >
                              <Icon
                                className={`h-4 w-4 transition-colors ${
                                  isActive
                                    ? 'text-[#D4AF37]'
                                    : 'text-slate-400 group-hover:text-[#3557FF]'
                                }`}
                              />
                            </span>

                            <span className="truncate">
                              {item.label}
                            </span>
                          </div>

                          {item.badge !==
                            undefined &&
                            item.badge >
                              0 && (
                              <span
                                className={`flex h-6 min-w-6 items-center justify-center rounded-full px-2 text-[10px] font-black ${
                                  isActive
                                    ? 'bg-[#D4AF37] text-slate-950'
                                    : 'bg-[#EEF2FF] text-[#3557FF]'
                                }`}
                              >
                                {
                                  item.badge
                                }
                              </span>
                            )}
                        </button>
                      </li>
                    );
                  }
                )}
              </ul>
            </div>
          )
        )}
      </div>

      <div className="mt-auto p-5">
        <div className="relative overflow-hidden rounded-[22px] bg-slate-950 p-4 text-white shadow-lg">
          <div className="absolute right-[-20px] top-[-20px] h-20 w-20 rounded-full bg-[#3557FF]/30 blur-2xl" />

          <div className="relative z-10 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10">
              <ShieldCheck className="h-5 w-5 text-[#D4AF37]" />
            </div>

            <div className="min-w-0">
              <span className="block truncate text-xs font-bold">
                {nomeUsuario ||
                  'FlowFinance'}
              </span>

              <span className="block text-[10px] uppercase tracking-wider text-white/45">
                {perfil
                  ?.replace(
                    '_',
                    ' '
                  ) ||
                  'sem perfil'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};