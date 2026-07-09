import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { ProcessoCompra } from '../types';
import { formatarReal } from '../utils';
import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  Building, 
  DollarSign, 
  AlertTriangle,
  ArrowRight,
  User,
  X,
  Plus
} from 'lucide-react';

export const CalendarView: React.FC = () => {
  const { 
    processos, 
    fornecedores, 
    empresas, 
    setActiveView, 
    setActiveProcessId 
  } = useFinance();

  // Mês ativo de simulação: Julho 2026
  const [currentYear, setCurrentYear] = useState(2026);
  const [currentMonth, setCurrentMonth] = useState(6); // 0-indexed (6 = Julho)

  // Filtro rápido selecionado
  const [filtroRapido, setFiltroRapido] = useState<'todos' | 'hoje' | 'semana' | 'proximo_mes' | 'atrasados'>('todos');

  // Dia ativo selecionado para a barra lateral de faturas
  const [selectedDay, setSelectedDay] = useState<number | null>(6); // Default dia 6 (hoje)

  const nomesMeses = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  // Data de simulação "Hoje" é July 6, 2026
  const dataHojeStr = '2026-07-06';

  // Mudar mês de visualização
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  // Obter faturas filtradas pelos atalhos de tempo
  const faturasFiltradas = processos.filter(p => {
    // Apenas faturas financeiras em andamento para pagamento (ou pagas para registro)
    if (p.status !== 'pagamento' && p.status !== 'autorizacao_cp' && p.status !== 'autorizacao_diretoria' && p.status !== 'conciliacao') return false;

    if (filtroRapido === 'hoje') {
      return p.prazo === dataHojeStr;
    }
    if (filtroRapido === 'semana') {
      // Semana de July 6 a July 12, 2026
      return p.prazo >= '2026-07-06' && p.prazo <= '2026-07-12';
    }
    if (filtroRapido === 'proximo_mes') {
      // Agosto 2026
      return p.prazo >= '2026-08-01' && p.prazo <= '2026-08-31';
    }
    if (filtroRapido === 'atrasados') {
      return p.prazo < dataHojeStr && p.status === 'pagamento';
    }

    return true; // todos
  });

  // Obter faturas específicas de um determinado dia do calendário (ano-mês-dia)
  const obterFaturasDia = (dia: number) => {
    const diaFormatado = dia < 10 ? `0${dia}` : `${dia}`;
    const mesFormatado = (currentMonth + 1) < 10 ? `0${currentMonth + 1}` : `${currentMonth + 1}`;
    const dataStr = `${currentYear}-${mesFormatado}-${diaFormatado}`;

    return processos.filter(p => 
      p.prazo === dataStr && 
      (p.status === 'pagamento' || p.status === 'autorizacao_cp' || p.status === 'autorizacao_diretoria' || p.status === 'conciliacao' || p.status === 'finalizado')
    );
  };

  // Gerar grid do calendário para Julho 2026 (ou mês ativo)
  // Julho 2026: Primeiro dia cai em uma quarta-feira (3). Total 31 dias.
  const obterDiasCalendario = () => {
    const primeiroDiaMes = new Date(currentYear, currentMonth, 1);
    const diaDaSemanaInicial = primeiroDiaMes.getDay(); // 0 = Dom, 3 = Qua
    const totalDias = new Date(currentYear, currentMonth + 1, 0).getDate();

    const dias = [];
    // Espaços em branco do mês anterior
    for (let i = 0; i < diaDaSemanaInicial; i++) {
      dias.push(null);
    }
    // Dias do mês atual
    for (let i = 1; i <= totalDias; i++) {
      dias.push(i);
    }
    return dias;
  };

  const diasCalendario = obterDiasCalendario();
  const faturasDiaSelecionado = selectedDay ? obterFaturasDia(selectedDay) : [];

  return (
    <div className="space-y-10" id="calendar-view-container">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold font-sans tracking-tight text-[#0F172A]">Calendário Financeiro</h1>
        <p className="text-xs text-slate-400 mt-1">Navegue pelos compromissos a pagar distribuídos ao longo do mês corporativo.</p>
      </div>

      {/* Quick filters bar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 pb-5" id="calendar_filters">
        <button
          onClick={() => { setFiltroRapido('todos'); setSelectedDay(null); }}
          className={`px-4 py-2 text-xs font-semibold rounded-[10px] transition-all ${
            filtroRapido === 'todos' ? 'bg-[#0F172A] text-white shadow-sm' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
          }`}
        >
          Visualizar Todos
        </button>
        <button
          onClick={() => { setFiltroRapido('hoje'); setSelectedDay(6); }}
          className={`px-4 py-2 text-xs font-semibold rounded-[10px] transition-all ${
            filtroRapido === 'hoje' ? 'bg-[#0F172A] text-white shadow-sm' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
          }`}
        >
          Hoje (06/07)
        </button>
        <button
          onClick={() => { setFiltroRapido('semana'); setSelectedDay(null); }}
          className={`px-4 py-2 text-xs font-semibold rounded-[10px] transition-all ${
            filtroRapido === 'semana' ? 'bg-[#0F172A] text-white shadow-sm' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
          }`}
        >
          Esta Semana
        </button>
        <button
          onClick={() => { setFiltroRapido('proximo_mes'); setSelectedDay(null); }}
          className={`px-4 py-2 text-xs font-semibold rounded-[10px] transition-all ${
            filtroRapido === 'proximo_mes' ? 'bg-[#0F172A] text-white shadow-sm' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
          }`}
        >
          Próximo Mês
        </button>
        <button
          onClick={() => { setFiltroRapido('atrasados'); setSelectedDay(null); }}
          className={`px-4 py-2 text-xs font-semibold rounded-[10px] transition-all border ${
            filtroRapido === 'atrasados' ? 'bg-red-50 border-red-200 text-red-600 shadow-sm' : 'bg-slate-50 border-transparent text-slate-500 hover:bg-slate-100'
          }`}
        >
          Atrasados ⚠️
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Card: Monthly Calendar Grid (7 cols) */}
        <div className="lg:col-span-7 bg-white p-6 sm:p-8 rounded-[18px] border border-slate-100 shadow-sm space-y-6">
          {/* Header calendar navigation */}
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-extrabold text-[#0F172A] font-sans">
              {nomesMeses[currentMonth]} {currentYear}
            </h2>
            <div className="flex items-center gap-2">
              <button 
                onClick={handlePrevMonth}
                className="w-8 h-8 rounded-full bg-slate-50 hover:bg-slate-100 border border-slate-100 flex items-center justify-center text-[#0F172A] transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button 
                onClick={handleNextMonth}
                className="w-8 h-8 rounded-full bg-slate-50 hover:bg-slate-100 border border-slate-100 flex items-center justify-center text-[#0F172A] transition-all"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Weekday labels */}
          <div className="grid grid-cols-7 gap-y-2 text-center text-xs font-bold text-slate-400">
            {diasSemana.map(d => (
              <div key={d} className="py-1">{d}</div>
            ))}
          </div>

          {/* Month Days Grid */}
          <div className="grid grid-cols-7 gap-y-3.5 text-center">
            {diasCalendario.map((dia, idx) => {
              if (dia === null) {
                return <div key={`empty-${idx}`} />;
              }

              const isHoje = currentYear === 2026 && currentMonth === 6 && dia === 6;
              const isSelected = selectedDay === dia;
              
              const faturasDia = obterFaturasDia(dia);
              const temFaturas = faturasDia.length > 0;
              const valorDia = faturasDia.reduce((sum, item) => sum + item.valor, 0);

              return (
                <div 
                  key={`day-${dia}`} 
                  onClick={() => { setSelectedDay(dia); setFiltroRapido('todos'); }}
                  className="flex flex-col items-center justify-center"
                >
                  <button
                    type="button"
                    className={`w-10 h-10 rounded-[12px] text-xs font-bold font-mono transition-all flex flex-col items-center justify-center relative hover:scale-105 active:scale-95 ${
                      isHoje 
                        ? 'bg-red-50 border border-red-200 text-red-600' 
                        : isSelected 
                          ? 'bg-[#0F172A] text-white shadow-sm' 
                          : 'bg-slate-50 text-slate-700 hover:bg-slate-100/70'
                    }`}
                  >
                    <span>{dia}</span>
                    
                    {/* Small dots representing bills */}
                    {temFaturas && !isSelected && (
                      <span className={`w-1.5 h-1.5 rounded-full absolute bottom-1.5 ${
                        faturasDia.some(f => f.status === 'pagamento' && f.prazo < dataHojeStr) 
                          ? 'bg-red-500' 
                          : 'bg-[#D4AF37]'
                      }`} />
                    )}
                  </button>
                  
                  {/* Small currency summary on desktop */}
                  {temFaturas && (
                    <span className="text-[8px] font-mono font-medium text-slate-400 mt-1 truncate max-w-[50px]">
                      R$ {Math.round(valorDia/1000)}k
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Card: Lateral list showing selected day's bills (5 cols) */}
        <div className="lg:col-span-5 bg-white p-6 sm:p-8 rounded-[18px] border border-slate-100 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-50 mb-5">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Faturas e Demandas</span>
                <h3 className="text-sm font-bold text-[#0F172A] font-sans mt-0.5">
                  {selectedDay 
                    ? `Dia ${selectedDay} de ${nomesMeses[currentMonth]} de ${currentYear}` 
                    : 'Filtragem de Vencimentos'}
                </h3>
              </div>
              <Calendar className="w-5 h-5 text-slate-400" />
            </div>

            {/* List */}
            <div className="space-y-4 max-h-[350px] overflow-y-auto scrollbar-none">
              {selectedDay ? (
                faturasDiaSelecionado.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-400 font-medium">
                    Nenhum vencimento programado para este dia do calendário.
                  </div>
                ) : (
                  faturasDiaSelecionado.map((p) => {
                    const forn = fornecedores.find(f => f.id === p.fornecedorId);
                    return (
                      <div 
                        key={p.id}
                        onClick={() => {
                          setActiveProcessId(p.id);
                          setActiveView('processos');
                        }}
                        className="p-4 rounded-[14px] bg-slate-50 border border-slate-100/50 hover:bg-slate-100/40 transition-all cursor-pointer flex justify-between gap-3 text-xs"
                      >
                        <div className="min-w-0">
                          <span className="text-[10px] font-bold font-mono text-[#0F172A] block">{p.id}</span>
                          <span className="font-semibold text-slate-700 block truncate mt-0.5">{forn?.nome}</span>
                          <span className="text-[9px] text-slate-400 uppercase block mt-1">Status: {p.status}</span>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-bold text-slate-800 font-mono block">{formatarReal(p.valor)}</span>
                          <span className="text-[9px] font-mono text-[#D4AF37] block mt-1">Ver fluxo →</span>
                        </div>
                      </div>
                    );
                  })
                )
              ) : (
                faturasFiltradas.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-400 font-medium">
                    Nenhum vencimento encontrado para o filtro selecionado.
                  </div>
                ) : (
                  faturasFiltradas.map((p) => {
                    const forn = fornecedores.find(f => f.id === p.fornecedorId);
                    return (
                      <div 
                        key={p.id}
                        onClick={() => {
                          setActiveProcessId(p.id);
                          setActiveView('processos');
                        }}
                        className="p-4 rounded-[14px] bg-slate-50 border border-slate-100/50 hover:bg-slate-100/40 transition-all cursor-pointer flex justify-between gap-3 text-xs"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold font-mono text-[#0F172A]">{p.id}</span>
                            <span className="text-[9px] text-red-600 bg-red-50 px-1 rounded font-bold font-mono uppercase">Vencimento: {p.prazo}</span>
                          </div>
                          <span className="font-semibold text-slate-700 block truncate mt-1">{forn?.nome}</span>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-bold text-slate-800 font-mono block">{formatarReal(p.valor)}</span>
                          <span className="text-[9px] font-mono text-[#D4AF37] block mt-1">Acessar →</span>
                        </div>
                      </div>
                    );
                  })
                )
              )}
            </div>
          </div>

          <div className="border-t border-slate-100 pt-5 mt-5">
            <button
              onClick={() => setActiveView('solicitacao')}
              className="w-full py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-100 text-[#0F172A] font-bold text-xs rounded-[12px] flex items-center justify-center gap-2 transition-all"
            >
              <Plus className="w-4 h-4 text-[#D4AF37]" />
              <span>Programar Novo Vencimento</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
