import React, { useMemo, useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { formatarReal } from '../utils';
import {
  CalendarDays,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Wallet,
} from 'lucide-react';

const hojeISO = () => new Date().toISOString().split('T')[0];

const diferencaDias = (data: string) => {
  const hoje = new Date(hojeISO());
  const alvo = new Date(data);
  return Math.ceil((alvo.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
};

export const PaymentScheduleView: React.FC = () => {
  const {
    processos,
    fornecedores,
    empresas,
    programarPagamento,
    registrarPagamento,
  } = useFinance() as any;

  const hoje = hojeISO();

  const [dataFiltro, setDataFiltro] = useState(hoje);
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'vencidas' | 'a_vencer' | 'programadas' | 'nao_programadas'>('todos');

  const contasPagamento = processos.filter((p: any) => p.status === 'pagamento');

  const contasVencidas = contasPagamento.filter((p: any) => {
    const dataBase = p.dataProgramadaPagamento || p.prazo;
    return dataBase && dataBase < hoje;
  });

  const contasAVencer = contasPagamento.filter((p: any) => {
    const dataBase = p.dataProgramadaPagamento || p.prazo;
    if (!dataBase) return false;
    const dias = diferencaDias(dataBase);
    return dias >= 0 && dias <= 7;
  });

  const contasProgramadasDia = contasPagamento.filter(
    (p: any) => p.dataProgramadaPagamento === dataFiltro
  );

  const totalProgramadoDia = contasProgramadasDia.reduce(
    (sum: number, p: any) => sum + Number(p.valor ?? 0),
    0
  );

  const totalVencido = contasVencidas.reduce(
    (sum: number, p: any) => sum + Number(p.valor ?? 0),
    0
  );

  const totalAVencer = contasAVencer.reduce(
    (sum: number, p: any) => sum + Number(p.valor ?? 0),
    0
  );

  const totalAguardandoProgramacao = contasPagamento
    .filter((p: any) => p.statusProgramacao !== 'programado')
    .reduce((sum: number, p: any) => sum + Number(p.valor ?? 0), 0);

  const contasFiltradas = useMemo(() => {
    let lista = [...contasPagamento];

    if (filtroStatus === 'vencidas') {
      lista = contasVencidas;
    }

    if (filtroStatus === 'a_vencer') {
      lista = contasAVencer;
    }

    if (filtroStatus === 'programadas') {
      lista = lista.filter((p: any) => p.statusProgramacao === 'programado');
    }

    if (filtroStatus === 'nao_programadas') {
      lista = lista.filter((p: any) => p.statusProgramacao !== 'programado');
    }

    return lista.sort((a: any, b: any) => {
      const dataA = a.dataProgramadaPagamento || a.prazo || '';
      const dataB = b.dataProgramadaPagamento || b.prazo || '';
      return dataA.localeCompare(dataB);
    });
  }, [contasPagamento, filtroStatus]);

  const agenda7Dias = useMemo(() => {
    return Array.from({ length: 7 }).map((_, index) => {
      const data = new Date();
      data.setDate(data.getDate() + index);
      const iso = data.toISOString().split('T')[0];

      const contas = contasPagamento.filter(
        (p: any) => p.dataProgramadaPagamento === iso
      );

      const total = contas.reduce(
        (sum: number, p: any) => sum + Number(p.valor ?? 0),
        0
      );

      return {
        data: iso,
        qtd: contas.length,
        total,
      };
    });
  }, [contasPagamento]);

  const handleProgramar = async (processoId: string, data: string) => {
    if (!data) {
      alert('Informe uma data para programação.');
      return;
    }

    await programarPagamento(processoId, data, 'Financeiro / Contas a Pagar');
  };

  const handleMarcarPago = async (processoId: string) => {
    const confirmar = window.confirm(
      'Deseja marcar esta conta como paga? Ela será enviada para conciliação.'
    );

    if (!confirmar) return;

    await registrarPagamento(processoId, 'pix', 'Pagamento marcado pela programação');
  };

  return (
    <div className="space-y-8" id="payment-schedule-view-container">
      <div>
        <h1 className="text-2xl font-bold text-[#0F172A]">
          Programação de Pagamentos
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Controle de vencimentos, agenda diária e execução de pagamentos.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <Card
          title="Programado no Dia"
          value={formatarReal(totalProgramadoDia)}
          icon={CalendarDays}
          color="text-emerald-600"
          bg="bg-emerald-50"
        />

        <Card
          title="Vencidas"
          value={formatarReal(totalVencido)}
          icon={AlertTriangle}
          color="text-red-600"
          bg="bg-red-50"
        />

        <Card
          title="A Vencer em 7 Dias"
          value={formatarReal(totalAVencer)}
          icon={Clock}
          color="text-amber-600"
          bg="bg-amber-50"
        />

        <Card
          title="Aguardando Programação"
          value={formatarReal(totalAguardandoProgramacao)}
          icon={Wallet}
          color="text-[#0F172A]"
          bg="bg-slate-100"
        />
      </div>

      <div className="bg-white rounded-[18px] border border-slate-100 p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
          <div>
            <h2 className="text-sm font-bold text-[#0F172A]">
              Agenda do Dia
            </h2>
            <p className="text-[11px] text-slate-400 mt-1">
              Contas programadas para a data selecionada.
            </p>
          </div>

          <input
            type="date"
            value={dataFiltro}
            onChange={e => setDataFiltro(e.target.value)}
            className="bg-slate-50 border-0 rounded-[12px] px-3.5 py-2.5 text-xs text-slate-700 font-mono"
          />
        </div>

        {contasProgramadasDia.length === 0 ? (
          <p className="text-xs text-slate-400">
            Nenhuma conta programada para esta data.
          </p>
        ) : (
          <div className="divide-y divide-slate-100">
            {contasProgramadasDia.map((p: any) => {
              const fornecedor = fornecedores.find((f: any) => f.id === p.fornecedorId);

              return (
                <div key={p.id} className="py-3 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold text-slate-800">
                      {p.id} — {fornecedor?.nome || 'Fornecedor não encontrado'}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Vencimento: {p.prazo}
                    </p>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className="text-xs font-bold font-mono text-[#0F172A]">
                      {formatarReal(p.valor)}
                    </span>

                    <button
                      onClick={() => handleMarcarPago(p.id)}
                      className="px-3 py-2 rounded-[10px] bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold"
                    >
                      Marcar Pago
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="bg-white rounded-[18px] border border-slate-100 p-5 shadow-sm">
        <h2 className="text-sm font-bold text-[#0F172A] mb-4">
          Próximos 7 dias
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
          {agenda7Dias.map(dia => (
            <button
              key={dia.data}
              onClick={() => setDataFiltro(dia.data)}
              className={`p-4 rounded-[14px] border text-left transition ${
                dia.data === dataFiltro
                  ? 'border-[#0F172A] bg-slate-950 text-white'
                  : 'border-slate-100 bg-slate-50 hover:bg-slate-100 text-slate-700'
              }`}
            >
              <span className="text-[10px] font-bold block">
                {dia.data}
              </span>
              <span className="text-xs font-bold block mt-2">
                {dia.qtd} conta(s)
              </span>
              <span className="text-[10px] font-mono block mt-1">
                {formatarReal(dia.total)}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-[18px] border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-bold text-[#0F172A]">
              Relação Geral de Contas
            </h2>
            <p className="text-[11px] text-slate-400 mt-1">
              Contas aprovadas disponíveis para programação e pagamento.
            </p>
          </div>

          <select
            value={filtroStatus}
            onChange={e => setFiltroStatus(e.target.value as any)}
            className="bg-slate-50 border-0 rounded-[12px] px-3.5 py-2.5 text-xs text-slate-700"
          >
            <option value="todos">Todas</option>
            <option value="vencidas">Vencidas</option>
            <option value="a_vencer">A vencer em 7 dias</option>
            <option value="programadas">Programadas</option>
            <option value="nao_programadas">Não programadas</option>
          </select>
        </div>

        {contasFiltradas.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-xs text-slate-400">
              Nenhuma conta encontrada.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50/80">
                <tr className="text-[10px] uppercase tracking-wide text-slate-400">
                  <th className="px-5 py-3 font-bold">Status</th>
                  <th className="px-5 py-3 font-bold">Processo</th>
                  <th className="px-5 py-3 font-bold">Fornecedor</th>
                  <th className="px-5 py-3 font-bold">Empresa</th>
                  <th className="px-5 py-3 font-bold">Valor</th>
                  <th className="px-5 py-3 font-bold">Vencimento</th>
                  <th className="px-5 py-3 font-bold">Programado Para</th>
                  <th className="px-5 py-3 font-bold text-right">Ações</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-50">
                {contasFiltradas.map((p: any) => {
                  const fornecedor = fornecedores.find((f: any) => f.id === p.fornecedorId);
                  const empresa = empresas.find((e: any) => e.id === p.empresaId);
                  const dataBase = p.dataProgramadaPagamento || p.prazo;
                  const vencida = dataBase && dataBase < hoje;

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/60">
                      <td className="px-5 py-4">
                        {vencida ? (
                          <span className="px-2 py-1 rounded-full bg-red-50 text-red-600 border border-red-100 text-[10px] font-bold">
                            Vencida
                          </span>
                        ) : p.statusProgramacao === 'programado' ? (
                          <span className="px-2 py-1 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 text-[10px] font-bold">
                            Programada
                          </span>
                        ) : (
                          <span className="px-2 py-1 rounded-full bg-amber-50 text-amber-600 border border-amber-100 text-[10px] font-bold">
                            Pendente
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-4 text-xs font-bold text-[#0F172A]">
                        {p.id}
                      </td>

                      <td className="px-5 py-4 text-xs text-slate-600">
                        {fornecedor?.nome || '-'}
                      </td>

                      <td className="px-5 py-4 text-xs text-slate-600">
                        {empresa?.nome || '-'}
                      </td>

                      <td className="px-5 py-4 text-xs font-bold font-mono text-[#0F172A]">
                        {formatarReal(p.valor)}
                      </td>

                      <td className="px-5 py-4 text-xs text-slate-500 font-mono">
                        {p.prazo}
                      </td>

                      <td className="px-5 py-4">
                        <input
                          type="date"
                          defaultValue={p.dataProgramadaPagamento || ''}
                          id={`programar-${p.id}`}
                          className="bg-slate-50 border-0 rounded-[10px] px-3 py-2 text-xs font-mono text-slate-700"
                        />
                      </td>

                      <td className="px-5 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => {
                              const input = document.getElementById(
                                `programar-${p.id}`
                              ) as HTMLInputElement | null;

                              handleProgramar(p.id, input?.value || '');
                            }}
                            className="px-3 py-2 rounded-[10px] bg-[#0F172A] hover:bg-[#1E293B] text-white text-[10px] font-bold"
                          >
                            Programar
                          </button>

                          <button
                            onClick={() => handleMarcarPago(p.id)}
                            className="px-3 py-2 rounded-[10px] bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold"
                          >
                            Pago
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

const Card = ({
  title,
  value,
  icon: Icon,
  color,
  bg,
}: any) => (
  <div className="bg-white rounded-[18px] border border-slate-100 p-5 shadow-sm">
    <div className="flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center`}>
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
      <div>
        <span className="text-[10px] font-bold text-slate-400 uppercase">
          {title}
        </span>
        <p className={`text-sm font-bold font-mono ${color}`}>
          {value}
        </p>
      </div>
    </div>
  </div>
);

export default PaymentScheduleView;