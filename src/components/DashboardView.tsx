import React, { useMemo, useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { FinancialPlanCard } from './financial/FinancialPlanCard';
import {
  Building2,
  FileText,
  Wallet,
  AlertTriangle,
  CheckCircle2,
  Clock,
  CalendarDays,
  TrendingUp,
} from 'lucide-react';
import { formatarReal, STATUS_LABELS } from '../utils';

const hojeISO = () => new Date().toISOString().split('T')[0];

const emAteDias = (data: string, dias: number) => {
  const hoje = new Date(hojeISO());
  const alvo = new Date(data);
  const diff = Math.ceil((alvo.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
  return diff >= 0 && diff <= dias;
};

export const DashboardView: React.FC = () => {
  const finance = useFinance();

  const empresas = finance.empresas ?? [];
  const empresaAtivaId = finance.empresaAtivaId ?? '';
  const planosFinanceiros = finance.planosFinanceiros ?? [];
  const centrosCusto = finance.centrosCustos ?? [];
  const processos = finance.processos ?? [];
  const alertas = finance.alertas ?? [];

  const [expandedPlanId, setExpandedPlanId] = useState<string | null>(null);

  const hoje = hojeISO();

  const empresaAtiva = useMemo(() => {
    return empresas.find(e => e.id === empresaAtivaId) ?? empresas[0];
  }, [empresas, empresaAtivaId]);

  const empresaSelecionadaId = empresaAtiva?.id ?? '';

  const processosEmpresa = useMemo(() => {
    return processos.filter(p => p.empresaId === empresaSelecionadaId);
  }, [processos, empresaSelecionadaId]);

  const planosEmpresa = useMemo(() => {
    return planosFinanceiros.filter(p => p.empresaId === empresaSelecionadaId);
  }, [planosFinanceiros, empresaSelecionadaId]);

  const centrosCustoEmpresa = useMemo(() => {
    return centrosCusto.filter(c => c.empresaId === empresaSelecionadaId);
  }, [centrosCusto, empresaSelecionadaId]);

  const totalOrcamentoMensal = planosEmpresa.reduce(
    (sum, p) => sum + Number(p.tetoMensal ?? 0),
    0
  );

  const contasAPagar = processosEmpresa.filter(p => p.status === 'pagamento');

  const contasVencidas = contasAPagar.filter(p => {
    const data = p.dataProgramadaPagamento || p.prazo;
    return data && data < hoje;
  });

  const contasAVencer = contasAPagar.filter(p => {
    const data = p.dataProgramadaPagamento || p.prazo;
    return data && emAteDias(data, 7);
  });

  const contasProgramadasHoje = contasAPagar.filter(
    p => p.dataProgramadaPagamento === hoje
  );

  const totalVencido = contasVencidas.reduce((sum, p) => sum + Number(p.valor ?? 0), 0);
  const totalAVencer = contasAVencer.reduce((sum, p) => sum + Number(p.valor ?? 0), 0);
  const totalProgramadoHoje = contasProgramadasHoje.reduce((sum, p) => sum + Number(p.valor ?? 0), 0);

  const totalComprometido = processosEmpresa
    .filter(p => !['pagamento', 'conciliacao', 'finalizado'].includes(p.status))
    .reduce((sum, p) => sum + Number(p.valor ?? 0), 0);

  const totalUtilizado = processosEmpresa
    .filter(p => ['pagamento', 'conciliacao', 'finalizado'].includes(p.status))
    .reduce((sum, p) => sum + Number(p.valor ?? 0), 0);

  const saldoDisponivel = totalOrcamentoMensal - totalComprometido - totalUtilizado;

  const processosPendentes = processosEmpresa.filter(
    p => !['conciliacao', 'finalizado'].includes(p.status)
  );

  const processosFinalizados = processosEmpresa.filter(p => p.status === 'finalizado');

  const alertasNaoLidos = alertas.filter(a => !a.lido);

  const proximasContas = [...contasAPagar]
    .sort((a, b) =>
      String(a.dataProgramadaPagamento || a.prazo || '').localeCompare(
        String(b.dataProgramadaPagamento || b.prazo || '')
      )
    )
    .slice(0, 6);

  const processosRecentes = [...processosEmpresa]
    .sort((a, b) => String(b.dataCriacao).localeCompare(String(a.dataCriacao)))
    .slice(0, 5);

  const handleTogglePlan = (id: string) => {
    setExpandedPlanId(prev => (prev === id ? null : id));
  };

  if (!empresaAtiva) {
    return (
      <div className="p-8">
        <div className="bg-white border border-slate-100 rounded-2xl p-8 text-center">
          <h2 className="text-lg font-bold text-slate-800">
            Nenhuma empresa cadastrada
          </h2>
          <p className="text-sm text-slate-500 mt-2">
            Cadastre uma empresa para visualizar o dashboard financeiro.
          </p>
        </div>
      </div>
    );
  }

  const cards = [
    {
      title: 'Orçamento Mensal',
      value: formatarReal(totalOrcamentoMensal),
      icon: Wallet,
      description: 'Soma dos tetos mensais',
    },
    {
      title: 'Programado Hoje',
      value: formatarReal(totalProgramadoHoje),
      icon: CalendarDays,
      description: `${contasProgramadasHoje.length} conta(s)`,
    },
    {
      title: 'Vencido',
      value: formatarReal(totalVencido),
      icon: AlertTriangle,
      description: `${contasVencidas.length} conta(s) atrasada(s)`,
    },
    {
      title: 'A Vencer 7 Dias',
      value: formatarReal(totalAVencer),
      icon: Clock,
      description: `${contasAVencer.length} conta(s)`,
    },
  ];

  return (
    <div className="p-6 sm:p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[#0F172A]">
          Dashboard Financeiro
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Visão geral da empresa {empresaAtiva.nome}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {cards.map(card => {
          const Icon = card.icon;

          return (
            <div
              key={card.title}
              className="bg-white rounded-[18px] border border-slate-100 p-5 shadow-sm"
            >
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-[#0F172A]">
                <Icon className="w-5 h-5" />
              </div>

              <div className="mt-4">
                <span className="text-[10px] uppercase tracking-wide font-bold text-slate-400">
                  {card.title}
                </span>
                <h3 className="text-xl font-bold text-[#0F172A] mt-1 font-mono">
                  {card.value}
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  {card.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        <MiniCard title="Comprometido" value={formatarReal(totalComprometido)} icon={Clock} />
        <MiniCard title="Utilizado" value={formatarReal(totalUtilizado)} icon={CheckCircle2} />
        <MiniCard title="Saldo Disponível" value={formatarReal(saldoDisponivel)} icon={Building2} />
        <MiniCard title="Alertas Ativos" value={String(alertasNaoLidos.length)} icon={AlertTriangle} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <ResumoCard
          title="Processos em Aberto"
          value={processosPendentes.length}
          description="Solicitações, aprovações e pagamentos pendentes."
        />

        <ResumoCard
          title="Processos Finalizados"
          value={processosFinalizados.length}
          description="Compras concluídas e arquivadas."
          green
        />

        <ResumoCard
          title="Contas a Pagar"
          value={contasAPagar.length}
          description="Processos liberados para pagamento."
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <div className="bg-white rounded-[18px] border border-slate-100 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <CalendarDays className="w-4 h-4 text-slate-500" />
            <h2 className="text-sm font-bold text-[#0F172A]">
              Próximas Contas
            </h2>
          </div>

          {proximasContas.length === 0 ? (
            <p className="text-xs text-slate-400">
              Nenhuma conta a pagar no momento.
            </p>
          ) : (
            <div className="divide-y divide-slate-100">
              {proximasContas.map(p => {
                const dataBase = p.dataProgramadaPagamento || p.prazo;
                const vencida = dataBase && dataBase < hoje;

                return (
                  <div key={p.id} className="py-3 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold text-slate-800">
                        {p.id} — {p.descricao}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-1">
                        {p.dataProgramadaPagamento
                          ? `Programado: ${p.dataProgramadaPagamento}`
                          : `Vencimento: ${p.prazo}`}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-bold font-mono text-[#0F172A]">
                        {formatarReal(p.valor)}
                      </span>
                      <span
                        className={`block text-[9px] font-bold mt-1 ${
                          vencida ? 'text-red-600' : 'text-emerald-600'
                        }`}
                      >
                        {vencida ? 'VENCIDA' : 'NO PRAZO'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-white rounded-[18px] border border-slate-100 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-4 h-4 text-slate-500" />
            <h2 className="text-sm font-bold text-[#0F172A]">
              Processos Recentes
            </h2>
          </div>

          {processosRecentes.length === 0 ? (
            <p className="text-xs text-slate-400">
              Nenhum processo registrado ainda.
            </p>
          ) : (
            <div className="divide-y divide-slate-100">
              {processosRecentes.map(p => (
                <div key={p.id} className="py-3 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold text-slate-800">
                      {p.id} — {p.descricao}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Status: {STATUS_LABELS[p.status] || p.status} • Responsável: {p.responsavel}
                    </p>
                  </div>

                  <span className="text-xs font-bold font-mono text-[#0F172A]">
                    {formatarReal(p.valor)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-5">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-slate-500" />
          <h2 className="text-sm font-bold text-[#0F172A]">
            Plano Financeiro e Centros de Custo
          </h2>
        </div>

        {planosEmpresa.length === 0 ? (
          <div className="bg-white border border-slate-100 rounded-2xl p-8 text-center">
            <h2 className="text-lg font-bold text-slate-800">
              Nenhum plano financeiro cadastrado
            </h2>
          </div>
        ) : (
          planosEmpresa.map(plano => {
            const centrosDoPlano = centrosCustoEmpresa.filter(
              cc => cc.planoFinanceiroId === plano.id
            );

            return (
              <FinancialPlanCard
                key={plano.id}
                plan={plano}
                costCenters={centrosDoPlano}
                processes={processosEmpresa}
                isExpanded={expandedPlanId === plano.id}
                onToggle={handleTogglePlan}
              />
            );
          })
        )}
      </div>
    </div>
  );
};

const MiniCard = ({ title, value, icon: Icon }: any) => (
  <div className="bg-white rounded-[18px] border border-slate-100 p-5 shadow-sm">
    <Icon className="w-4 h-4 text-slate-400" />
    <span className="text-[10px] uppercase tracking-wide font-bold text-slate-400 block mt-3">
      {title}
    </span>
    <h3 className="text-lg font-bold text-[#0F172A] mt-1 font-mono">
      {value}
    </h3>
  </div>
);

const ResumoCard = ({ title, value, description, green }: any) => (
  <div className="bg-white rounded-[18px] border border-slate-100 p-5 shadow-sm">
    <span className="text-[10px] uppercase tracking-wide font-bold text-slate-400">
      {title}
    </span>
    <h3 className={`text-3xl font-bold mt-2 ${green ? 'text-emerald-600' : 'text-[#0F172A]'}`}>
      {value}
    </h3>
    <p className="text-xs text-slate-400 mt-1">
      {description}
    </p>
  </div>
);

export default DashboardView;