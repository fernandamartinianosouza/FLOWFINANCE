import React, { useState } from 'react';

import {
  Bell,
  Search,
  ChevronDown,
  Building2,
  Check,
  ExternalLink,
  Command,
  LogOut,
  Sparkles,
} from 'lucide-react';

import { useFinance } from '../context/FinanceContext';
import { useAuth } from '../context/AuthContext';

export const Header: React.FC = () => {
  const {
    empresas,
    empresaAtivaId,
    setEmpresaAtivaId,
    alertas,
    marcarAlertaLido,
    setActiveView,
    setActiveProcessId,
  } = useFinance();

  const {
    user,
    signOut,
  } = useAuth();

  const [
    companyDropdownOpen,
    setCompanyDropdownOpen,
  ] = useState(false);

  const [
    notificationOpen,
    setNotificationOpen,
  ] = useState(false);

  const empresaAtiva =
    empresas.find(
      empresa =>
        empresa.id === empresaAtivaId
    ) || empresas[0];

  const alertasNaoLidos =
    alertas.filter(
      alerta => !alerta.lido
    );

  const nomeUsuario =
    user?.user_metadata?.nome ||
    user?.user_metadata?.name ||
    user?.email?.split('@')[0] ||
    'Usuário';

  const iniciaisUsuario =
    nomeUsuario
      .split(' ')
      .filter(Boolean)
      .map(nome => nome[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();

  const handleSair = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error(
        'Erro ao sair do sistema:',
        error
      );
    }
  };

  const handleAlertaClick = async (
    alerta: any
  ) => {
    try {
      await marcarAlertaLido(
        alerta.id
      );
    } catch (error) {
      console.error(
        'Erro ao marcar alerta como lido:',
        error
      );
    }

    if (alerta.processoId) {
      setActiveProcessId(
        alerta.processoId
      );

      setActiveView(
        'processos'
      );
    }

    setNotificationOpen(false);
  };

  return (
    <header
      className="
        relative
        z-30
        flex
        min-h-[78px]
        w-full
        items-center
        justify-between
        gap-5
        border-b
        border-slate-100
        bg-white/90
        px-6
        backdrop-blur-xl
        lg:px-10
      "
    >
      {/* ESQUERDA */}
      <div className="flex min-w-0 flex-1 items-center gap-5">
        {/* MARCA */}
        <div className="hidden shrink-0 xl:block">
          <div className="flex items-center gap-3">
            <div
              className="
                flex
                h-10
                w-10
                items-center
                justify-center
                rounded-2xl
                bg-slate-950
                shadow-lg
              "
            >
              <Sparkles className="h-4.5 w-4.5 text-[#D4AF37]" />
            </div>

            <div className="min-w-0">
              <div className="flex items-end gap-2">
                <span
                  className="
                    text-[15px]
                    font-black
                    tracking-tight
                    text-slate-950
                  "
                >
                  FLOW
                  <span className="text-[#3557FF]">
                    FINANCE
                  </span>
                </span>

                <span
                  className="
                    mb-[1px]
                    text-[8px]
                    font-black
                    uppercase
                    tracking-[0.13em]
                    text-slate-400
                  "
                >
                  ERP
                </span>
              </div>

              <div className="mt-1 flex items-center gap-1.5">
                <span className="text-[9px] font-medium text-slate-400">
                  Sistema Financeiro Inteligente
                </span>

                <span className="text-[8px] text-slate-300">
                  •
                </span>

                <span
                  className="
                    text-[8px]
                    font-black
                    uppercase
                    tracking-[0.12em]
                    text-[#3557FF]
                  "
                >
                  by FLOWEXP TECH
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* SEPARADOR */}
        <div className="hidden h-9 w-px bg-slate-200 xl:block" />

        {/* EMPRESA */}
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() =>
              setCompanyDropdownOpen(
                atual => !atual
              )
            }
            className="
              ff-button-soft
              flex
              max-w-[280px]
              items-center
              gap-3
              px-4
              py-2.5
              text-xs
              font-bold
            "
            id="company_switcher_btn"
          >
            <div
              className="
                flex
                h-8
                w-8
                shrink-0
                items-center
                justify-center
                rounded-xl
                bg-[#EEF2FF]
              "
            >
              <Building2 className="h-4 w-4 text-[#3557FF]" />
            </div>

            <div className="min-w-0 text-left">
              <span
                className="
                  block
                  text-[8px]
                  font-black
                  uppercase
                  tracking-[0.13em]
                  text-slate-400
                "
              >
                Empresa ativa
              </span>

              <span className="block truncate text-xs font-bold text-slate-700">
                {empresaAtiva?.nome ||
                  'Selecione uma empresa'}
              </span>
            </div>

            <ChevronDown
              className={`
                h-3.5
                w-3.5
                shrink-0
                text-slate-400
                transition-transform
                ${
                  companyDropdownOpen
                    ? 'rotate-180'
                    : ''
                }
              `}
            />
          </button>

          {companyDropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() =>
                  setCompanyDropdownOpen(
                    false
                  )
                }
              />

              <div
                className="
                  ff-surface
                  absolute
                  left-0
                  z-50
                  mt-3
                  w-80
                  overflow-hidden
                  rounded-[22px]
                  py-3
                  shadow-2xl
                "
              >
                <div className="mb-1 border-b border-slate-200/70 px-4 pb-3">
                  <span
                    className="
                      text-[10px]
                      font-black
                      uppercase
                      tracking-[0.14em]
                      text-slate-400
                    "
                  >
                    Selecionar empresa
                  </span>
                </div>

                <div className="max-h-[320px] overflow-y-auto">
                  {empresas.length === 0 ? (
                    <div className="px-4 py-6 text-center">
                      <span className="text-xs text-slate-400">
                        Nenhuma empresa cadastrada.
                      </span>
                    </div>
                  ) : (
                    empresas.map(
                      empresa => {
                        const ativa =
                          empresa.id ===
                          empresaAtivaId;

                        return (
                          <button
                            key={empresa.id}
                            type="button"
                            onClick={() => {
                              setEmpresaAtivaId(
                                empresa.id
                              );

                              setCompanyDropdownOpen(
                                false
                              );
                            }}
                            className="
                              flex
                              w-full
                              items-center
                              justify-between
                              gap-3
                              px-4
                              py-3
                              text-left
                              transition-all
                              hover:bg-[#EEF2FF]/55
                            "
                          >
                            <div className="min-w-0 flex-1">
                              <span
                                className={`
                                  block
                                  truncate
                                  text-xs
                                  ${
                                    ativa
                                      ? 'font-bold text-slate-950'
                                      : 'font-medium text-slate-700'
                                  }
                                `}
                              >
                                {empresa.nome}
                              </span>

                              <span
                                className="
                                  mt-0.5
                                  block
                                  truncate
                                  font-mono
                                  text-[10px]
                                  text-slate-400
                                "
                              >
                                {empresa.cnpj ||
                                  'CNPJ não informado'}
                              </span>
                            </div>

                            {ativa && (
                              <Check className="h-4 w-4 shrink-0 text-[#3557FF]" />
                            )}
                          </button>
                        );
                      }
                    )
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* BUSCA */}
        <div className="relative hidden max-w-xl flex-1 md:block">
          <Search
            className="
              absolute
              left-4
              top-1/2
              z-10
              h-4
              w-4
              -translate-y-1/2
              text-slate-400
            "
          />

          <input
            type="text"
            placeholder="Buscar processos, fornecedores, contas..."
            className="
              w-full
              rounded-[14px]
              border
              border-slate-100
              bg-slate-50
              py-3
              pl-11
              pr-20
              text-sm
              text-slate-700
              outline-none
              placeholder:text-slate-400
            "
            disabled
          />

          <div
            className="
              absolute
              right-3
              top-1/2
              hidden
              -translate-y-1/2
              items-center
              gap-1
              rounded-lg
              bg-white
              px-2
              py-1
              text-[9px]
              font-bold
              text-slate-400
              shadow-sm
              lg:flex
            "
          >
            <Command className="h-3 w-3" />
            K
          </div>
        </div>
      </div>

      {/* DIREITA */}
      <div className="flex shrink-0 items-center gap-3">
        {/* NOTIFICAÇÕES */}
        <div className="relative">
          <button
            type="button"
            onClick={() =>
              setNotificationOpen(
                atual => !atual
              )
            }
            className="
              ff-button-soft
              relative
              flex
              h-11
              w-11
              items-center
              justify-center
            "
            id="notifications_btn"
          >
            <Bell className="h-4 w-4 text-slate-600" />

            {alertasNaoLidos.length >
              0 && (
              <>
                <span
                  className="
                    absolute
                    right-2.5
                    top-2.5
                    h-2.5
                    w-2.5
                    rounded-full
                    bg-red-500
                    ring-4
                    ring-white
                  "
                />

                <span
                  className="
                    absolute
                    -right-1
                    -top-1
                    flex
                    min-w-[18px]
                    items-center
                    justify-center
                    rounded-full
                    bg-red-500
                    px-1
                    py-0.5
                    text-[8px]
                    font-black
                    text-white
                  "
                >
                  {alertasNaoLidos.length >
                  99
                    ? '99+'
                    : alertasNaoLidos.length}
                </span>
              </>
            )}
          </button>

          {notificationOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() =>
                  setNotificationOpen(false)
                }
              />

              <div
                className="
                  ff-surface
                  absolute
                  right-0
                  z-50
                  mt-3.5
                  w-96
                  max-w-[90vw]
                  overflow-hidden
                  rounded-[22px]
                  py-3
                  shadow-2xl
                "
              >
                <div
                  className="
                    flex
                    items-center
                    justify-between
                    border-b
                    border-slate-200/70
                    px-5
                    py-2
                  "
                >
                  <div>
                    <span className="block text-sm font-black text-slate-950">
                      Central de Alertas
                    </span>

                    <span className="mt-0.5 block text-[9px] text-slate-400">
                      Notificações do sistema
                    </span>
                  </div>

                  {alertasNaoLidos.length >
                    0 && (
                    <span
                      className="
                        rounded-full
                        bg-red-50
                        px-2.5
                        py-1
                        text-[10px]
                        font-black
                        uppercase
                        text-red-600
                      "
                    >
                      {
                        alertasNaoLidos.length
                      }{' '}
                      novos
                    </span>
                  )}
                </div>

                <div
                  className="
                    max-h-[360px]
                    divide-y
                    divide-slate-100/80
                    overflow-y-auto
                  "
                >
                  {alertas.length === 0 ? (
                    <div className="p-8 text-center">
                      <Bell className="mx-auto mb-3 h-6 w-6 text-slate-300" />

                      <span className="block text-xs text-slate-400">
                        Nenhum alerta recente
                      </span>
                    </div>
                  ) : (
                    alertas.map(
                      alerta => (
                        <button
                          key={
                            alerta.id
                          }
                          type="button"
                          onClick={() =>
                            handleAlertaClick(
                              alerta
                            )
                          }
                          className={`
                            flex
                            w-full
                            gap-3
                            p-4
                            text-left
                            transition-all
                            hover:bg-[#EEF2FF]/55
                            ${
                              !alerta.lido
                                ? 'bg-[#EEF2FF]/35'
                                : ''
                            }
                          `}
                        >
                          <span
                            className={`
                              mt-1.5
                              h-2.5
                              w-2.5
                              shrink-0
                              rounded-full
                              ${
                                alerta.tipo ===
                                'urgente'
                                  ? 'bg-red-500'
                                  : alerta.tipo ===
                                      'alerta'
                                    ? 'bg-amber-400'
                                    : alerta.tipo ===
                                        'sucesso'
                                      ? 'bg-emerald-500'
                                      : 'bg-blue-500'
                              }
                            `}
                          />

                          <div className="min-w-0 flex-1">
                            <div
                              className="
                                mb-1
                                flex
                                items-start
                                justify-between
                                gap-2
                              "
                            >
                              <span
                                className={`
                                  block
                                  text-xs
                                  ${
                                    !alerta.lido
                                      ? 'font-bold text-slate-950'
                                      : 'text-slate-600'
                                  }
                                `}
                              >
                                {
                                  alerta.titulo
                                }
                              </span>

                              <span
                                className="
                                  shrink-0
                                  font-mono
                                  text-[9px]
                                  tracking-tighter
                                  text-slate-400
                                "
                              >
                                {
                                  alerta.data
                                }
                              </span>
                            </div>

                            <p
                              className="
                                line-clamp-2
                                text-[11px]
                                leading-relaxed
                                text-slate-500
                              "
                            >
                              {
                                alerta.mensagem
                              }
                            </p>

                            {alerta.processoId && (
                              <span
                                className="
                                  mt-1.5
                                  flex
                                  items-center
                                  gap-1
                                  font-mono
                                  text-[10px]
                                  font-bold
                                  text-[#3557FF]
                                "
                              >
                                Ver processo{' '}
                                {
                                  alerta.processoId
                                }

                                <ExternalLink className="h-2.5 w-2.5" />
                              </span>
                            )}
                          </div>
                        </button>
                      )
                    )
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="hidden h-8 w-px bg-slate-200 sm:block" />

        {/* USUÁRIO */}
        <div className="flex items-center gap-3 pl-1">
          <div className="hidden flex-col text-right sm:flex">
            <span className="max-w-[160px] truncate text-xs font-black text-slate-900">
              {nomeUsuario}
            </span>

            <span className="text-[9px] font-mono uppercase tracking-wider text-slate-400">
              FLOWFINANCE
            </span>
          </div>

          <div
            className="
              flex
              h-11
              w-11
              items-center
              justify-center
              rounded-2xl
              bg-slate-950
              text-xs
              font-black
              text-white
              shadow-lg
              ring-1
              ring-white/60
            "
          >
            {iniciaisUsuario}
          </div>
        </div>

        {/* SAIR */}
        <button
          type="button"
          onClick={handleSair}
          className="
            flex
            h-10
            w-10
            items-center
            justify-center
            rounded-[14px]
            border
            border-slate-100
            bg-white
            text-slate-400
            transition-all
            hover:border-red-100
            hover:bg-red-50
            hover:text-red-500
          "
          title="Sair do sistema"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
};