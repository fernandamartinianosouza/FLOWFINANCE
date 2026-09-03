import React, {
  Suspense,
  lazy,
  useEffect,
  useState,
} from 'react';

import {
  FinanceProvider,
  useFinance,
} from './context/FinanceContext';

import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { MobileNavigation } from './components/MobileNavigation';
import { MobileTopBar } from './components/MobileTopBar';
import { PasswordAccessView } from './components/auth/PasswordAccessView';
// Telas carregadas sob demanda para reduzir o JavaScript inicial do sistema.
const DashboardView = lazy(() =>
  import('./components/DashboardView').then(m => ({ default: m.DashboardView }))
);
const NewRequestView = lazy(() =>
  import('./components/NewRequestView').then(m => ({ default: m.NewRequestView }))
);
const ApprovalsView = lazy(() =>
  import('./components/ApprovalsView').then(m => ({ default: m.ApprovalsView }))
);
const AccountsPayableView = lazy(() =>
  import('./components/AccountsPayableView').then(m => ({ default: m.AccountsPayableView }))
);
const ReconciliationView = lazy(() =>
  import('./components/ReconciliationView').then(m => ({ default: m.ReconciliationView }))
);
const FinancialCenterView = lazy(() =>
  import('./components/FinancialCenterView').then(m => ({ default: m.FinancialCenterView }))
);
const CalendarView = lazy(() =>
  import('./components/CalendarView').then(m => ({ default: m.CalendarView }))
);
const CashFlowView = lazy(() =>
  import('./components/CashFlowView').then(m => ({ default: m.CashFlowView }))
);
const CompaniesView = lazy(() =>
  import('./components/CompaniesView').then(m => ({ default: m.CompaniesView }))
);
const SuppliersView = lazy(() =>
  import('./components/SuppliersView').then(m => ({ default: m.SuppliersView }))
);
const PaymentScheduleView = lazy(() =>
  import('./components/PaymentScheduleView').then(m => ({ default: m.PaymentScheduleView }))
);
const QuotationsView = lazy(() =>
  import('./components/QuotationsView').then(m => ({ default: m.QuotationsView }))
);
const NewAccountView = lazy(() =>
  import('./components/NewAccountView').then(m => ({ default: m.NewAccountView }))
);
const WeeklyPurchasingPlanView = lazy(() =>
  import('./components/WeeklyPurchasingPlanView').then(m => ({ default: m.WeeklyPurchasingPlanView }))
);
const RHFinanceiroView = lazy(() =>
  import('./components/RHFinanceiroView').then(m => ({ default: m.RHFinanceiroView }))
);
const CatalogItemsView = lazy(() => import('./components/CatalogItemsView'));
const StockView = lazy(() => import('./components/StockView'));
const UsersAdminView = lazy(() =>
  import('./views/UsersAdminView').then(m => ({ default: m.UsersAdminView }))
);

import { AuthView } from './views/AuthView';

import { useAuth } from './context/AuthContext';
import { usePermissions } from './context/PermissionsContext';
import { obterPermissaoView } from './config/viewPermissions';
import { PermissionsProvider } from './context/PermissionsContext';

const verificarDefinicaoSenhaNaUrl = () => {
  const url = new URL(window.location.href);

  const hashParams = new URLSearchParams(
    url.hash.replace(/^#/, '')
  );

  const definirSenha =
    url.searchParams.get('definir-senha') === '1';

  const tipoAuth =
    url.searchParams.get('type') ||
    hashParams.get('type');

  return definirSenha || tipoAuth === 'invite';
};

const limparParametroDefinirSenha = () => {
  const url = new URL(window.location.href);

  url.searchParams.delete('definir-senha');
  url.searchParams.delete('type');

  const hashParams = new URLSearchParams(
    url.hash.replace(/^#/, '')
  );

  hashParams.delete('type');

  url.hash = hashParams.toString()
    ? `#${hashParams.toString()}`
    : '';

  const novaUrl =
    `${url.pathname}${url.search}${url.hash}`;

  window.history.replaceState(
    {},
    '',
    novaUrl || '/'
  );
};

const ViewLoading: React.FC = () => (
  <div className="flex min-h-[40vh] items-center justify-center">
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-500 shadow-sm">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700" />
      Carregando módulo...
    </div>
  </div>
);

const AppContent: React.FC = () => {
  const {
    activeView,
    setActiveView,
  } = useFinance();

  const {
    user,
    loading,
  } = useAuth();

  const {
    temPermissao,
    carregandoPermissoes,
  } = usePermissions();

  const [
    deveDefinirSenha,
    setDeveDefinirSenha,
  ] = useState<boolean>(() =>
    verificarDefinicaoSenhaNaUrl()
  );

  useEffect(() => {
    const atualizarPelaUrl = () => {
      setDeveDefinirSenha(
        verificarDefinicaoSenhaNaUrl()
      );
    };

    atualizarPelaUrl();

    window.addEventListener(
      'popstate',
      atualizarPelaUrl
    );

    window.addEventListener(
      'hashchange',
      atualizarPelaUrl
    );

    return () => {
      window.removeEventListener(
        'popstate',
        atualizarPelaUrl
      );

      window.removeEventListener(
        'hashchange',
        atualizarPelaUrl
      );
    };
  }, []);

  /**
   * A antiga Central de Processos foi removida.
   * Se algum estado salvo, link antigo ou notificação ainda tentar
   * abrir "processos", o usuário é levado para Contas a Pagar.
   */
  useEffect(() => {
    if (activeView === 'processos') {
      setActiveView('contas-pagar');
    }
  }, [activeView, setActiveView]);

  useEffect(() => {
    if (!user || carregandoPermissoes) return;

    const permissao = obterPermissaoView(activeView);

    if (!temPermissao(permissao.modulo, permissao.acao)) {
      const fallback = [
        'dashboard',
        'contas-pagar',
        'fluxo-caixa',
        'solicitacao',
        'catalogo-itens',
        'estoque',
        'cotacoes',
        'planejamento-compras',
        'autorizacoes',
        'fornecedores',
        'empresas',
        'rh-financeiro',
        'usuarios',
      ].find(view => {
        const regra = obterPermissaoView(view);
        return temPermissao(regra.modulo, regra.acao);
      });

      if (fallback && fallback !== activeView) {
        setActiveView(fallback);
      }
    }
  }, [
    user,
    activeView,
    setActiveView,
    temPermissao,
    carregandoPermissoes,
  ]);

  const concluirDefinicaoSenha = () => {
    limparParametroDefinirSenha();
    setDeveDefinirSenha(false);
  };

  const renderView = () => {
    switch (activeView) {
      case 'usuarios':
        return <UsersAdminView />;

      case 'dashboard':
        return <DashboardView />;

      case 'solicitacao':
        return <NewRequestView />;

      case 'catalogo-itens':
        return <CatalogItemsView />;

      case 'estoque':
        return <StockView />;

      case 'cotacoes':
        return <QuotationsView />;

      case 'autorizacoes':
        return <ApprovalsView />;

      case 'planejamento-compras':
        return <WeeklyPurchasingPlanView />;

      case 'nova-conta':
        return <NewAccountView />;

      case 'contas-pagar':
        return <AccountsPayableView />;

      case 'programacao':
      case 'pagamentos-programados':
        return <PaymentScheduleView />;

      case 'conciliacao':
        return <ReconciliationView />;

      case 'centro-financeiro':
        return <FinancialCenterView />;

      case 'calendario':
        return <CalendarView />;

      case 'fluxo-caixa':
        return <CashFlowView />;

      case 'empresas':
        return <CompaniesView />;

      case 'rh-financeiro':
        return <RHFinanceiroView />;

      case 'fornecedores':
        return <SuppliersView />;

      case 'processos':
        return <AccountsPayableView />;

      default:
        return <DashboardView />;
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F6F8FC] text-sm font-bold text-slate-500">
        Carregando FlowFinance...
      </div>
    );
  }

  if (deveDefinirSenha) {
    return (
      <PasswordAccessView
        modo="definir-senha"
        onVoltar={concluirDefinicaoSenha}
        onConcluido={concluirDefinicaoSenha}
      />
    );
  }

  if (!user) {
    return <AuthView />;
  }

  if (!carregandoPermissoes) {
    const permissaoAtual = obterPermissaoView(activeView);

    if (!temPermissao(permissaoAtual.modulo, permissaoAtual.acao)) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-[#F6F8FC] text-sm font-bold text-slate-500">
          Acesso não permitido. Redirecionando...
        </div>
      );
    }
  }

  return (
    <div
      className="ff-app-shell relative flex min-h-[100dvh] w-full overflow-hidden bg-[#F6F8FC] font-sans text-slate-800"
      id="flow_app_layout"
    >
      <div className="pointer-events-none absolute left-[-12%] top-[-12%] z-0 h-[52%] w-[52%] rounded-full bg-[#3557FF]/12 blur-[130px]" />
      <div className="pointer-events-none absolute bottom-[-14%] right-[-10%] z-0 h-[62%] w-[62%] rounded-full bg-[#D4AF37]/14 blur-[140px]" />
      <div className="pointer-events-none absolute left-[28%] top-[32%] z-0 h-[38%] w-[38%] rounded-full bg-sky-200/22 blur-[150px]" />

      <div className="relative z-20 hidden h-screen w-72 min-w-72 shrink-0 lg:block">
        <Sidebar />
      </div>

      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        <div className="hidden lg:block">
          <Header />
        </div>

        <MobileTopBar />

        <main className="min-h-0 flex-1 overflow-y-auto px-4 py-5 pb-28 sm:px-5 lg:h-screen lg:px-10 lg:py-8 lg:pb-8">
          <div className="ff-page-container relative z-10 mx-auto w-full max-w-[1600px]">
            <Suspense fallback={<ViewLoading />}>{renderView()}</Suspense>
          </div>
        </main>
      </div>

      <MobileNavigation />
    </div>
  );
};

export default function App() {
  return (
    <FinanceProvider>
      <PermissionsProvider>
        <AppContent />
      </PermissionsProvider>
    </FinanceProvider>
  );
}