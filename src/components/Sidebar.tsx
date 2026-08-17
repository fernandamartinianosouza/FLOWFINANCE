import React, { useEffect } from 'react';

import { useFinance } from '../context/FinanceContext';
import { useAuth } from '../context/AuthContext';
import { podeAcessar } from '../config/permissions';

import {
  LayoutDashboard,
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
  CalendarRange,
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
          id: 'planejamento-compras',
          label: 'Planejamento semanal',
          icon: CalendarRange,
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
      title: 'Recursos Humanos',
      items: [
        {
          id: 'rh-financeiro',
          label: 'RH Financeiro',
          icon: Users,
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

  const formatarBadge = (
    valor?: number
  ) => {
    if (
      valor === undefined ||
      valor <= 0
    ) {
      return null;
    }

    /*
     * Mantém o menu organizado mesmo com muitos registros.
     * Ex.:
     * 927  -> 927
     * 1927 -> 1.9k
     * 12500 -> 12.5k
     */
    if (valor >= 10000) {
      return `${(valor / 1000)
        .toFixed(1)
        .replace('.0', '')}k`;
    }

    if (valor >= 1000) {
      return `${(valor / 1000)
        .toFixed(1)
        .replace('.0', '')}k`;
    }

    return String(valor);
  };

  return (
    <aside
  className="
    ff-sidebar
    fixed
    left-0
    top-0
    z-40
    hidden
    h-dvh
    w-72
    flex-col
    overflow-hidden
    lg:flex
  "
  id="flow_sidebar"
>
      {/* CABEÇALHO / LOGO */}
      <div className="shrink-0 px-5 pb-4 pt-5">
        <div className="flex min-w-0 items-center gap-3">
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-slate-950 shadow-lg">
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />

            <Sparkles className="relative z-10 h-5 w-5 text-[#D4AF37]" />
          </div>

          <div className="min-w-0 flex-1">
            <span className="block truncate text-[14px] font-black leading-none tracking-tight text-slate-950">
              FLOW
              <span className="text-[#3557FF]">
                FINANCE
              </span>
            </span>

            <span className="mt-1.5 block truncate text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400">
              Sistema Financeiro
            </span>
          </div>
        </div>

        <div className="mt-5 space-y-2">
          {podeCriarSolicitacao && (
            <button
              type="button"
              onClick={() =>
                setActiveView(
                  'solicitacao'
                )
              }
              className="
                ff-button-primary
                flex
                h-10
                w-full
                items-center
                justify-center
                gap-2
                whitespace-nowrap
                text-xs
                font-bold
              "
            >
              <PlusCircle className="h-4 w-4 shrink-0" />
              <span className="truncate">
                Nova solicitação
              </span>
            </button>
          )}

          {podeCriarConta && (
  <button
    type="button"
    onClick={() =>
      setActiveView('nova-conta')
    }
    className="
      ff-button-primary
      flex
      h-10
      w-full
      items-center
      justify-center
      gap-2
      whitespace-nowrap
      text-xs
      font-bold
    "
  >
    <ReceiptText className="h-4 w-4 shrink-0" />

    <span className="truncate">
      Nova conta
    </span>
  </button>
)}
        </div>
      </div>

      {/* MENU CENTRAL */}
      <div
        className="
          scrollbar-none
          min-h-0
          flex-1
          overflow-x-hidden
          overflow-y-auto
          px-3
          py-2
        "
      >
        <div className="space-y-5 pb-4">
          {menuGroupsPermitidos.map(
            group => (
              <div
                key={group.title}
                className="space-y-1.5"
              >
                <h3 className="truncate px-3 text-[9px] font-black uppercase tracking-[0.13em] text-slate-400">
                  {group.title}
                </h3>

                <ul className="space-y-1">
                  {group.items.map(
                    item => {
                      const Icon =
                        item.icon;

                      const isActive =
                        activeView ===
                        item.id;

                      const badge =
                        formatarBadge(
                          item.badge
                        );

                      return (
                        <li
                          key={item.id}
                          className="min-w-0"
                        >
                          <button
                            type="button"
                            onClick={() =>
                              setActiveView(
                                item.id
                              )
                            }
                            className={`
                              group
                              relative
                              flex
                              h-11
                              w-full
                              min-w-0
                              items-center
                              gap-2.5
                              overflow-hidden
                              rounded-2xl
                              px-3
                              text-left
                              text-[12px]
                              font-semibold
                              transition-all
                              duration-200
                              ${
                                isActive
                                  ? 'bg-slate-950 text-white shadow-[0_12px_30px_rgba(15,23,42,.16)]'
                                  : 'text-slate-500 hover:bg-white/80 hover:text-slate-950'
                              }
                            `}
                            id={`sidebar-item-${item.id}`}
                          >
                            {isActive && (
                              <span className="absolute left-0 top-1/2 h-7 w-1 -translate-y-1/2 rounded-r-full bg-[#D4AF37]" />
                            )}

                            <span
                              className={`
                                flex
                                h-7
                                w-7
                                shrink-0
                                items-center
                                justify-center
                                rounded-xl
                                transition-colors
                                ${
                                  isActive
                                    ? 'bg-white/10'
                                    : 'bg-slate-100/70 group-hover:bg-[#EEF2FF]'
                                }
                              `}
                            >
                              <Icon
                                className={`
                                  h-3.5
                                  w-3.5
                                  transition-colors
                                  ${
                                    isActive
                                      ? 'text-[#D4AF37]'
                                      : 'text-slate-400 group-hover:text-[#3557FF]'
                                  }
                                `}
                              />
                            </span>

                            <span className="min-w-0 flex-1 truncate whitespace-nowrap">
                              {item.label}
                            </span>

                            {badge && (
                              <span
                                title={`${item.badge} item(ns)`}
                                className={`
                                  ml-auto
                                  flex
                                  h-5
                                  min-w-[22px]
                                  max-w-[42px]
                                  shrink-0
                                  items-center
                                  justify-center
                                  whitespace-nowrap
                                  rounded-full
                                  px-1.5
                                  text-[9px]
                                  font-black
                                  leading-none
                                  ${
                                    isActive
                                      ? 'bg-[#D4AF37] text-slate-950'
                                      : 'bg-[#EEF2FF] text-[#3557FF]'
                                  }
                                `}
                              >
                                {badge}
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
      </div>

      {/* USUÁRIO / RODAPÉ */}
      <div className="shrink-0 border-t border-slate-100/80 bg-white/70 p-3 backdrop-blur-sm">
        <div className="relative overflow-hidden rounded-[18px] bg-slate-950 p-3 text-white shadow-lg">
          <div className="absolute right-[-20px] top-[-20px] h-20 w-20 rounded-full bg-[#3557FF]/30 blur-2xl" />

          <div className="relative z-10 flex min-w-0 items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10">
              <ShieldCheck className="h-4 w-4 text-[#D4AF37]" />
            </div>

            <div className="min-w-0 flex-1">
              <span className="block truncate text-[11px] font-bold">
                {nomeUsuario ||
                  'FlowFinance'}
              </span>

              <span className="block truncate text-[8px] uppercase tracking-wider text-white/45">
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