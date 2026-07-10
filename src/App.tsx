import React from 'react';
import { FinanceProvider, useFinance } from './context/FinanceContext';
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


// Subcomponente interno para consumir o context useFinance
const AppContent: React.FC = () => {
  const { activeView, setActiveView } = useFinance();
const { user, loading, perfil } = useAuth();

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
    <div className="min-h-screen flex items-center justify-center bg-[#F6F8FC] text-sm font-bold text-slate-500">
      Carregando FlowFinance...
    </div>
  );
}

if (!user) {
  return <AuthView />;
}

if (user && perfil && !podeAcessar(perfil, activeView)) {
  setActiveView('dashboard');
  return null;
}

  return (
    <div className="ff-app-shell flex h-screen w-screen overflow-hidden text-slate-800 font-sans relative" id="flow_app_layout">
      {/* Decorative ambient blobs for glassmorphism */}
      <div className="absolute top-[-12%] left-[-12%] w-[52%] h-[52%] rounded-full bg-[#3557FF]/12 blur-[130px] pointer-events-none z-0" />
      <div className="absolute bottom-[-14%] right-[-10%] w-[62%] h-[62%] rounded-full bg-[#D4AF37]/14 blur-[140px] pointer-events-none z-0" />
      <div className="absolute top-[32%] left-[28%] w-[38%] h-[38%] rounded-full bg-sky-200/22 blur-[150px] pointer-events-none z-0" />

      {/* Sidebar - Fixado à esquerda */}
      <Sidebar />

      {/* Workspace Principal - Flex Column */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative z-10">
        {/* Header Superior */}
        <Header />

        {/* Painel de Conteúdo de Trabalho (Scrollable) */}
        <main className="flex-1 overflow-y-auto px-8 py-8 lg:px-10 relative scrollbar-none">
          <div className="ff-page-container ff-fade-up relative z-10">
            {renderView()}
          </div>
        </main>
      </div>
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
