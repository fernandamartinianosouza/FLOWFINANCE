import React from 'react';
import {
  Home,
  CheckSquare,
  WalletCards,
  Workflow,
  User,
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';

const itens = [
  { id: 'dashboard', label: 'Início', icon: Home },
  { id: 'autorizacoes', label: 'Autorizações', icon: CheckSquare },
  { id: 'contas-pagar', label: 'Contas', icon: WalletCards },
  { id: 'processos', label: 'Processos', icon: Workflow },
  { id: 'usuarios', label: 'Perfil', icon: User },
];

export const MobileNavigation: React.FC = () => {
  const { activeView, setActiveView } = useFinance();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/95 px-2 pb-[max(8px,env(safe-area-inset-bottom))] pt-2 shadow-[0_-10px_30px_rgba(15,23,42,0.08)] backdrop-blur lg:hidden">
      <div className="grid grid-cols-5 gap-1">
        {itens.map(item => {
          const Icon = item.icon;
          const ativo = activeView === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveView(item.id)}
              className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 py-1.5 transition ${
                ativo ? 'text-[#0F172A]' : 'text-slate-400'
              }`}
            >
              <span
                className={`flex h-8 w-10 items-center justify-center rounded-xl transition ${
                  ativo
                    ? 'bg-[#0F172A] text-white shadow-sm'
                    : 'bg-transparent'
                }`}
              >
                <Icon className="h-4 w-4" />
              </span>

              <span className="max-w-full truncate text-[9px] font-semibold">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileNavigation;