import React, { useEffect } from 'react';
import {
  FinanceProvider,
  useFinance,
} from './context/FinanceContext';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { ProcessesView } from './components/ProcessesView';
import { NewRequestView } from './components/NewRequestView';
import { ApprovalsView } from './components/ApprovalsView';
import { AccountsPayableView } from './components/AccountsPayableView';
import { ReconciliationView } from './components/ReconciliationView';
import { FinancialCenterView } from './components/FinancialCenterView';
import { CalendarView } from './components/CalendarView';
import { CashFlowView } from './components/CashFlowView';
import { CompaniesView } from './components/CompaniesView';
import { SuppliersView } from './components/SuppliersView';
import { useAuth } from './context/AuthContext';
import { AuthView } from './views/AuthView';
import { PaymentScheduleView } from './components/PaymentScheduleView';
import { podeAcessar } from './config/permissions';
import { UsersAdminView } from './components/UsersAdminView';
import { QuotationsView } from './components/QuotationsView';
import { MobileNavigation } from './components/MobileNavigation';
import { MobileTopBar } from './components/MobileTopBar';

const AppContent: React.FC = () => {
  const {
    activeView,
    setActiveView,
  } = useFinance();

  const {
    user,
    loading,
    perfil,
  } = useAuth();

  useEffect(() => {
    if (
      user &&
      perfil &&
      !podeAcessar(perfil, activeView)
    ) {
      setActiveView('dashboard');
    }
  }, [
    user,
    perfil,
    activeView,
    setActiveView,
  ]);

  const renderView = () => {
    switch (activeView) {
      case 'dashboard':
        return <DashboardView />;
      case 'processos':
        return <ProcessesView />;
      case 'solicitacao':
        return <NewRequestView />;
      case 'autorizacoes':
        return <ApprovalsView />;
      case 'contas-pagar':
        return <AccountsPayableView />;
      case 'conciliacao':
        return <ReconciliationView />;
      case 'cotacoes':
        return <QuotationsView />;
      case 'centro-financeiro':
        return <FinancialCenterView />;
      case 'calendario':
        return <CalendarView />;
      case 'fluxo-caixa':
        return <CashFlowView />;
      case 'empresas':
        return <CompaniesView />;
      case 'fornecedores':
        return <SuppliersView />;
      case 'programacao':
      case 'pagamentos-programados':
        return <PaymentScheduleView />;
      case 'usuarios':
        return <UsersAdminView />;
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

  if (!user) {
    return <AuthView />;
  }

  if (
    perfil &&
    !podeAcessar(perfil, activeView)
  ) {
    return null;
  }

  return (
    <div
      className="ff-app-shell relative flex min-h-[100dvh] w-full overflow-hidden bg-[#F6F8FC] font-sans text-slate-800"
      id="flow_app_layout"
    >
      <div className="pointer-events-none absolute left-[-12%] top-[-12%] z-0 h-[52%] w-[52%] rounded-full bg-[#3557FF]/12 blur-[130px]" />
      <div className="pointer-events-none absolute bottom-[-14%] right-[-10%] z-0 h-[62%] w-[62%] rounded-full bg-[#D4AF37]/14 blur-[140px]" />
      <div className="pointer-events-none absolute left-[28%] top-[32%] z-0 h-[38%] w-[38%] rounded-full bg-sky-200/22 blur-[150px]" />

      <div className="relative z-20 hidden h-screen shrink-0 lg:block">
        <Sidebar />
      </div>

      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        <div className="hidden lg:block">
          <Header />
        </div>

        <MobileTopBar />

        <main className="min-h-0 flex-1 overflow-y-auto px-4 py-5 pb-28 sm:px-5 lg:h-screen lg:px-10 lg:py-8 lg:pb-8">
          <div className="ff-page-container ff-fade-up relative z-10 mx-auto w-full max-w-[1600px]">
            {renderView()}
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
      <AppContent />
    </FinanceProvider>
  );
}