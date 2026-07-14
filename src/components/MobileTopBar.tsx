import React from 'react';
import {
  Bell,
  Building2,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useFinance } from '../context/FinanceContext';

const TITULOS: Record<string, string> = {
  dashboard: 'Início',
  processos: 'Processos',
  solicitacao: 'Nova solicitação',
  autorizacoes: 'Autorizações',
  'contas-pagar': 'Contas a pagar',
  conciliacao: 'Conciliação',
  cotacoes: 'Cotações',
  'centro-financeiro': 'Plano financeiro',
  calendario: 'Calendário',
  'fluxo-caixa': 'Fluxo de caixa',
  empresas: 'Empresas',
  fornecedores: 'Fornecedores',
  'pagamentos-programados': 'Programação',
  usuarios: 'Perfil',
};

export const MobileTopBar: React.FC = () => {
  const {
    activeView,
    empresas,
    empresaAtivaId,
    alertas,
  } = useFinance();

  const { user, signOut } = useAuth() as any;

  const empresaAtiva = empresas.find(
    empresa => empresa.id === empresaAtivaId
  );

  const alertasNaoLidos = alertas.filter(
    alerta => !alerta.lido
  ).length;

  const sair = async () => {
    if (typeof signOut === 'function') {
      await signOut();
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 px-4 pb-3 pt-[max(12px,env(safe-area-inset-top))] backdrop-blur lg:hidden">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">
            <Building2 className="h-3.5 w-3.5" />
            <span className="truncate">
              {empresaAtiva?.nome || 'FLOWFINANCE'}
            </span>
          </div>

          <h1 className="mt-1 truncate text-lg font-bold text-[#0F172A]">
            {TITULOS[activeView] || 'FLOWFINANCE'}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-100 bg-slate-50 text-slate-600"
            title="Alertas"
          >
            <Bell className="h-4 w-4" />
            {alertasNaoLidos > 0 && (
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
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
  );
};

export default MobileTopBar;