import React, { useMemo, useState } from 'react';
import {
  Bell,
  Building2,
  Check,
  ChevronDown,
  LogOut,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useFinance } from '../context/FinanceContext';

const TITULOS: Record<string, string> = {
  dashboard: 'Início',
  processos: 'Processos',
  solicitacao: 'Nova solicitação',
  autorizacoes: 'Autorizações',
  'contas-pagar': 'Contas a pagar',
  'planejamento-compras': 'Planejamento semanal',
  conciliacao: 'Conciliação',
  cotacoes: 'Cotações',
  'centro-financeiro': 'Plano financeiro',
  calendario: 'Calendário',
  'fluxo-caixa': 'Fluxo de caixa',
  empresas: 'Empresas',
  fornecedores: 'Fornecedores',
  'pagamentos-programados': 'Programação',
  programacao: 'Programação',
  usuarios: 'Perfil',
};

export const MobileTopBar: React.FC = () => {
  const {
    activeView,
    empresas,
    empresaAtivaId,
    setEmpresaAtivaId,
    alertas,
    marcarAlertaLido,
    setActiveView,
    setActiveProcessId,
  } = useFinance() as any;

  const { user, signOut } = useAuth() as any;

  const [empresaAberta, setEmpresaAberta] =
    useState(false);

  const [notificacoesAbertas, setNotificacoesAbertas] =
    useState(false);

  const empresaAtiva = useMemo(
    () =>
      empresas.find(
        (empresa: any) =>
          empresa.id === empresaAtivaId
      ),
    [empresas, empresaAtivaId]
  );

  const alertasOrdenados = useMemo(
    () =>
      [...(alertas || [])].sort(
        (a: any, b: any) =>
          new Date(b.data || b.created_at || 0).getTime() -
          new Date(a.data || a.created_at || 0).getTime()
      ),
    [alertas]
  );

  const alertasNaoLidos = alertasOrdenados.filter(
    (alerta: any) => !alerta.lido
  ).length;

  const selecionarEmpresa = (empresaId: string) => {
    setEmpresaAtivaId(empresaId);
    setEmpresaAberta(false);
  };

  const abrirNotificacao = async (alerta: any) => {
    try {
      if (!alerta.lido && marcarAlertaLido) {
        await marcarAlertaLido(alerta.id);
      }

      const processoId =
        alerta.processoId ||
        alerta.processo_id ||
        null;

      if (processoId && setActiveProcessId) {
        setActiveProcessId(processoId);
        setActiveView('processos');
      } else if (
        alerta.tipo === 'aprovacao' ||
        String(alerta.titulo || '')
          .toLowerCase()
          .includes('aprova')
      ) {
        setActiveView('autorizacoes');
      } else if (
        alerta.tipo === 'pagamento' ||
        String(alerta.titulo || '')
          .toLowerCase()
          .includes('pagamento')
      ) {
        setActiveView('contas-pagar');
      } else {
        setActiveView('dashboard');
      }

      setNotificacoesAbertas(false);
    } catch (error) {
      console.error(
        'Erro ao abrir notificação:',
        error
      );
    }
  };

  const marcarTodasComoLidas = async () => {
    const pendentes = alertasOrdenados.filter(
      (alerta: any) => !alerta.lido
    );

    for (const alerta of pendentes) {
      try {
        await marcarAlertaLido(alerta.id);
      } catch (error) {
        console.error(
          'Erro ao marcar notificação como lida:',
          error
        );
      }
    }
  };

  const sair = async () => {
    if (typeof signOut === 'function') {
      await signOut();
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 px-4 pb-3 pt-[max(12px,env(safe-area-inset-top))] backdrop-blur lg:hidden">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() =>
              setEmpresaAberta(true)
            }
            className="min-w-0 flex-1 text-left"
          >
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">
              <Building2 className="h-3.5 w-3.5 shrink-0" />

              <span className="truncate">
                {empresaAtiva?.nome ||
                  'Selecionar empresa'}
              </span>

              <ChevronDown className="h-3.5 w-3.5 shrink-0" />
            </div>

            <h1 className="mt-1 truncate text-lg font-bold text-[#0F172A]">
              {TITULOS[activeView] ||
                'FLOWFINANCE'}
            </h1>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                setNotificacoesAbertas(true)
              }
              className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-100 bg-slate-50 text-slate-600"
              title="Notificações"
            >
              <Bell className="h-4 w-4" />

              {alertasNaoLidos > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white ring-2 ring-white">
                  {alertasNaoLidos > 99
                    ? '99+'
                    : alertasNaoLidos}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={sair}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0F172A] text-white"
              title="Sair"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {empresaAberta && (
        <>
          <div
            className="fixed inset-0 z-[70] bg-slate-900/35 backdrop-blur-[2px] lg:hidden"
            onClick={() =>
              setEmpresaAberta(false)
            }
          />

          <section className="fixed inset-x-0 bottom-0 z-[80] max-h-[78dvh] overflow-hidden rounded-t-[24px] bg-white shadow-2xl lg:hidden">
            <div className="flex items-center justify-between border-b border-slate-100 p-5">
              <div>
                <h2 className="text-sm font-bold text-[#0F172A]">
                  Trocar empresa
                </h2>

                <p className="mt-1 text-[10px] text-slate-400">
                  Selecione a empresa que deseja visualizar.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setEmpresaAberta(false)
                }
                className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-[60dvh] space-y-2 overflow-y-auto p-4 pb-[max(20px,env(safe-area-inset-bottom))]">
              {empresas.length === 0 ? (
                <div className="rounded-xl bg-slate-50 p-5 text-center text-xs text-slate-400">
                  Nenhuma empresa cadastrada.
                </div>
              ) : (
                empresas.map((empresa: any) => {
                  const ativa =
                    empresa.id === empresaAtivaId;

                  return (
                    <button
                      key={empresa.id}
                      type="button"
                      onClick={() =>
                        selecionarEmpresa(
                          empresa.id
                        )
                      }
                      className={`flex w-full items-center gap-3 rounded-[16px] border p-4 text-left transition ${
                        ativa
                          ? 'border-[#0F172A] bg-[#0F172A] text-white'
                          : 'border-slate-100 bg-white text-slate-700'
                      }`}
                    >
                      <span
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                          ativa
                            ? 'bg-white/10'
                            : 'bg-slate-100'
                        }`}
                      >
                        <Building2 className="h-4 w-4" />
                      </span>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-bold">
                          {empresa.nome}
                        </p>

                        <p
                          className={`mt-1 truncate text-[10px] ${
                            ativa
                              ? 'text-slate-300'
                              : 'text-slate-400'
                          }`}
                        >
                          {empresa.cnpj ||
                            'CNPJ não informado'}
                        </p>
                      </div>

                      {ativa && (
                        <Check className="h-4 w-4 shrink-0 text-[#D4AF37]" />
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </section>
        </>
      )}

      {notificacoesAbertas && (
        <>
          <div
            className="fixed inset-0 z-[70] bg-slate-900/35 backdrop-blur-[2px] lg:hidden"
            onClick={() =>
              setNotificacoesAbertas(false)
            }
          />

          <section className="fixed inset-x-0 bottom-0 z-[80] max-h-[86dvh] overflow-hidden rounded-t-[24px] bg-white shadow-2xl lg:hidden">
            <div className="flex items-center justify-between border-b border-slate-100 p-5">
              <div>
                <h2 className="text-sm font-bold text-[#0F172A]">
                  Notificações
                </h2>

                <p className="mt-1 text-[10px] text-slate-400">
                  {alertasNaoLidos > 0
                    ? `${alertasNaoLidos} não lida(s)`
                    : 'Tudo em dia'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {alertasNaoLidos > 0 && (
                  <button
                    type="button"
                    onClick={marcarTodasComoLidas}
                    className="rounded-xl bg-slate-100 px-3 py-2 text-[9px] font-bold text-slate-600"
                  >
                    Marcar todas
                  </button>
                )}

                <button
                  type="button"
                  onClick={() =>
                    setNotificacoesAbertas(false)
                  }
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="max-h-[70dvh] space-y-2 overflow-y-auto p-4 pb-[max(20px,env(safe-area-inset-bottom))]">
              {alertasOrdenados.length === 0 ? (
                <div className="rounded-xl bg-slate-50 p-8 text-center">
                  <Bell className="mx-auto h-5 w-5 text-slate-300" />

                  <p className="mt-3 text-xs font-semibold text-slate-500">
                    Nenhuma notificação
                  </p>
                </div>
              ) : (
                alertasOrdenados.map(
                  (alerta: any) => (
                    <button
                      key={alerta.id}
                      type="button"
                      onClick={() =>
                        abrirNotificacao(alerta)
                      }
                      className={`w-full rounded-[16px] border p-4 text-left transition ${
                        alerta.lido
                          ? 'border-slate-100 bg-white'
                          : 'border-blue-100 bg-blue-50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span
                          className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${
                            alerta.lido
                              ? 'bg-slate-200'
                              : 'bg-blue-500'
                          }`}
                        />

                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-[#0F172A]">
                            {alerta.titulo ||
                              'Notificação'}
                          </p>

                          <p className="mt-1 line-clamp-3 text-[10px] leading-relaxed text-slate-500">
                            {alerta.mensagem ||
                              'Sem detalhes.'}
                          </p>

                          <p className="mt-2 font-mono text-[9px] text-slate-400">
                            {alerta.data ||
                              alerta.created_at ||
                              ''}
                          </p>
                        </div>
                      </div>
                    </button>
                  )
                )
              )}
            </div>
          </section>
        </>
      )}
    </>
  );
};

export default MobileTopBar;