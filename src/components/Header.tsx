import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { Bell, Search, ChevronDown, Building2, Check, ExternalLink, Command } from 'lucide-react';
import { LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';


export const Header: React.FC = () => {
  const { 
    empresas, 
    empresaAtivaId, 
    setEmpresaAtivaId, 
    alertas, 
    marcarAlertaLido,
    setActiveView,
    setActiveProcessId
  } = useFinance();

  const { user, signOut } = useAuth();

const handleSair = async () => {
  await signOut();
};

  const [companyDropdownOpen, setCompanyDropdownOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);

  const empresaAtiva = empresas.find(e => e.id === empresaAtivaId) || empresas[0];
  const alertasNaoLidos = alertas.filter(a => !a.lido);

  const handleAlertaClick = (alerta: any) => {
    marcarAlertaLido(alerta.id);
    if (alerta.processoId) {
      setActiveProcessId(alerta.processoId);
      setActiveView('processos');
    }
    setNotificationOpen(false);
  };

  const nomeUsuario = user?.user_metadata?.nome || user?.email?.split('@')[0] || 'Usuário';

const iniciaisUsuario = nomeUsuario
  .split(' ')
  .map(nome => nome[0])
  .slice(0, 2)
  .join('')
  .toUpperCase();

  return (
    <header className="ff-header h-20 flex items-center justify-between px-8 lg:px-10 relative z-40" id="flow_header">
      <div className="flex items-center gap-5 min-w-0 flex-1">
        <div className="relative shrink-0">
          <button 
            onClick={() => setCompanyDropdownOpen(!companyDropdownOpen)}
            className="ff-button-soft flex items-center gap-3.5 px-4 py-2.5 text-xs font-bold"
            id="company_switcher_btn"
          >
            <span className="w-8 h-8 rounded-xl bg-[#EEF2FF] flex items-center justify-center">
              <Building2 className="w-4 h-4 text-[#3557FF]" />
            </span>
            <span className="max-w-[220px] truncate text-slate-800">{empresaAtiva?.nome || 'Selecione uma empresa'}</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {companyDropdownOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setCompanyDropdownOpen(false)} />
              <div className="absolute left-0 mt-3 w-80 ff-surface rounded-[22px] shadow-xl py-3 z-50 ff-fade-up">
                <div className="px-4 pb-2 mb-1 border-b border-slate-200/70">
                  <span className="text-[10px] font-black text-slate-400 tracking-[0.14em] uppercase">Selecionar empresa</span>
                </div>
                {empresas.map((emp) => (
                  <button
                    key={emp.id}
                    onClick={() => {
                      setEmpresaAtivaId(emp.id);
                      setCompanyDropdownOpen(false);
                    }}
                    className="w-full flex items-center justify-between px-4 py-3 text-left text-xs font-medium hover:bg-[#EEF2FF]/55 transition-all text-slate-700"
                  >
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className={emp.id === empresaAtivaId ? 'text-slate-950 font-bold truncate' : 'truncate'}>{emp.nome}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{emp.cnpj}</span>
                    </div>
                    {emp.id === empresaAtivaId && <Check className="w-4 h-4 text-[#3557FF] shrink-0" />}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="relative max-w-xl flex-1 hidden md:block">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 z-10" />
          <input 
            type="text" 
            placeholder="Buscar processos, fornecedores, contas..."
            className="w-full pl-11 pr-20 py-3 text-sm text-slate-700 placeholder-slate-400"
            disabled
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 hidden lg:flex items-center gap-1 text-[10px] text-slate-400 font-bold">
            <Command className="w-3 h-3" /> K
          </div>
        </div>
      </div>

      <button
  onClick={handleSair}
  className="w-10 h-10 rounded-[14px] bg-white border border-slate-100 hover:bg-red-50 hover:border-red-100 flex items-center justify-center transition-all"
  title="Sair do sistema"
>
  <LogOut className="w-4 h-4 text-slate-500 hover:text-red-500" />
</button>

      <div className="flex items-center gap-3 shrink-0">
        <div className="relative">
          <button 
            onClick={() => setNotificationOpen(!notificationOpen)}
            className="ff-button-soft w-11 h-11 flex items-center justify-center relative"
            id="notifications_btn"
          >
            <Bell className="w-4 h-4 text-slate-600" />
            {alertasNaoLidos.length > 0 && (
              <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 rounded-full bg-red-500 ring-4 ring-white animate-pulse" />
            )}
          </button>

          

          {notificationOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setNotificationOpen(false)} />
              <div className="absolute right-0 mt-3.5 w-96 ff-surface rounded-[22px] shadow-xl py-3 z-50 ff-fade-up">
                <div className="px-5 py-2 border-b border-slate-200/70 flex items-center justify-between">
                  <span className="text-sm font-black text-slate-950">Central de Alertas</span>
                  {alertasNaoLidos.length > 0 && (
                    <span className="bg-red-50 text-red-600 font-black text-[10px] px-2.5 py-1 rounded-full uppercase">
                      {alertasNaoLidos.length} novos
                    </span>
                  )}
                </div>
                <div className="max-h-[340px] overflow-y-auto scrollbar-none divide-y divide-slate-100/80">
                  {alertas.length === 0 ? (
                    <div className="p-8 text-center">
                      <span className="text-xs text-slate-400 block">Nenhum alerta recente</span>
                    </div>
                  ) : (
                    alertas.map((alerta) => (
                      <div 
                        key={alerta.id}
                        onClick={() => handleAlertaClick(alerta)}
                        className={`p-4 hover:bg-[#EEF2FF]/55 transition-all cursor-pointer flex gap-3 text-left ${!alerta.lido ? 'bg-[#EEF2FF]/35' : ''}`}
                      >
                        <span className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${
                          alerta.tipo === 'urgente' ? 'bg-red-500' :
                          alerta.tipo === 'alerta' ? 'bg-amber-400' :
                          alerta.tipo === 'sucesso' ? 'bg-emerald-500' : 'bg-blue-500'
                        }`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className={`text-xs block ${!alerta.lido ? 'font-bold text-slate-950' : 'text-slate-600'}`}>{alerta.titulo}</span>
                            <span className="text-[9px] text-slate-400 font-mono tracking-tighter shrink-0">{alerta.data}</span>
                          </div>
                          <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">{alerta.mensagem}</p>
                          {alerta.processoId && (
                            <span className="text-[10px] text-[#3557FF] font-bold flex items-center gap-1 mt-1.5 font-mono">
                              Ver processo {alerta.processoId} <ExternalLink className="w-2.5 h-2.5" />
                            </span>
                            
                          )}
                          
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="w-[1px] h-8 bg-slate-200 hidden sm:block" />

        <div className="flex items-center gap-3 pl-1">
          <div className="hidden sm:flex flex-col text-right">
            <span className="text-xs font-black text-slate-900">{nomeUsuario}</span>
            <span className="text-[10px] text-slate-400 tracking-wider font-mono">CFO | CONTAS A PAGAR</span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-slate-950 flex items-center justify-center font-black text-xs text-white shadow-lg ring-1 ring-white/60">
            {iniciaisUsuario}
          </div>
        </div>
      </div>
    </header>
  );
};
