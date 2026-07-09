import React from 'react';
import { PlanoFinanceiro, CentroCusto, ProcessoCompra } from '../../types';
import { formatarReal } from '../../utils';
import { Sliders, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import { CostCenterList } from './CostCenterList';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';

interface FinancialPlanCardProps {
  plan: PlanoFinanceiro;
  costCenters?: CentroCusto[];
  processes?: ProcessoCompra[];
  isExpanded: boolean;
  onToggle: (id: string) => void;
}

const numeroSeguro = (valor: any): number => {
  const numero = Number(valor ?? 0);
  return Number.isFinite(numero) ? numero : 0;
};

const STATUS_UTILIZADO = ['pagamento', 'conciliacao', 'finalizado'];

export const FinancialPlanCard: React.FC<FinancialPlanCardProps> = ({
  plan,
  costCenters = [],
  processes = [],
  isExpanded,
  onToggle
}) => {
  const tetoMensal = numeroSeguro(plan?.tetoMensal);
  const tetoAnual = numeroSeguro(plan?.tetoAnual);

  const processosPlano = processes.filter(
    p => p?.planoFinanceiroId === plan?.id
  );

  const utilizado = processosPlano
    .filter(p => STATUS_UTILIZADO.includes(p.status))
    .reduce((sum, p) => sum + numeroSeguro(p.valor), 0);

  const comprometido = processosPlano
    .filter(p => !STATUS_UTILIZADO.includes(p.status))
    .reduce((sum, p) => sum + numeroSeguro(p.valor), 0);

  const totalUtilizadoEComprometido = utilizado + comprometido;
  const saldoRestante = tetoMensal - totalUtilizadoEComprometido;

  const percentUtilizado = tetoMensal > 0 ? (utilizado / tetoMensal) * 100 : 0;
  const percentComprometido = tetoMensal > 0 ? (comprometido / tetoMensal) * 100 : 0;
  const percentTotal = Math.min(100, percentUtilizado + percentComprometido);

  const alertaAtivo = percentTotal > 80;

  const chartData = costCenters.map(cc => {
    const processosCentro = processosPlano.filter(
      p => p?.centroCustoId === cc?.id
    );

    const utilizadoCentro = processosCentro
      .filter(p => STATUS_UTILIZADO.includes(p.status))
      .reduce((sum, p) => sum + numeroSeguro(p.valor), 0);

    return {
      name: cc?.nome ?? 'Sem nome',
      realizado: utilizadoCentro,
      limite: numeroSeguro(cc?.tetoMensal)
    };
  });

  return (
    <div
      className="bg-white rounded-[18px] border border-slate-100 shadow-sm overflow-hidden transition-all duration-300"
      id={`plano-financeiro-${plan.id}`}
    >
      <div
        onClick={() => onToggle(plan.id)}
        className="p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 cursor-pointer hover:bg-slate-50/40 transition-all select-none"
      >
        <div className="space-y-2 flex-1">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#0F172A]/5 flex items-center justify-center text-[#0F172A]">
              <Sliders className="w-4 h-4" />
            </div>

            <div>
              <h2 className="text-sm font-bold text-[#0F172A] font-sans tracking-tight">
                {plan.nome}
              </h2>
              <span className="text-[10px] text-slate-400 font-semibold font-mono tracking-wider">
                CÓD: {(plan.id ?? '').toUpperCase()}
              </span>
            </div>

            {alertaAtivo && (
              <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-red-50 text-red-600 flex items-center gap-1 border border-red-100">
                <AlertTriangle className="w-2.5 h-2.5" />
                Alerta de Teto Mensal ({percentTotal.toFixed(0)}%)
              </span>
            )}
          </div>

          <div className="space-y-1 max-w-md pt-2">
            <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500">
              <span>Consumido: {percentTotal.toFixed(1)}%</span>
              <span>Teto Mensal: {formatarReal(tetoMensal)}</span>
            </div>

            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden flex">
              <div
                className="h-full bg-[#0F172A] rounded-l-full"
                style={{ width: `${Math.min(100, percentUtilizado)}%` }}
              />
              <div
                className="h-full bg-[#D4AF37] opacity-80"
                style={{ width: `${Math.min(100, percentComprometido)}%` }}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-xs md:text-right">
          <div>
            <span className="text-[10px] text-slate-400 font-semibold block uppercase">
              Teto Anual
            </span>
            <span className="font-bold text-slate-800 font-mono mt-1 block">
              {formatarReal(tetoAnual)}
            </span>
          </div>

          <div>
            <span className="text-[10px] text-slate-400 font-semibold block uppercase">
              Utilizado Pago
            </span>
            <span className="font-bold text-[#0F172A] font-mono mt-1 block">
              {formatarReal(utilizado)}
            </span>
          </div>

          <div>
            <span className="text-[10px] text-slate-400 font-semibold block uppercase">
              Comprometido
            </span>
            <span className="font-bold text-[#D4AF37] font-mono mt-1 block">
              {formatarReal(comprometido)}
            </span>
          </div>

          <div>
            <span className="text-[10px] text-slate-400 font-semibold block uppercase">
              Saldo Disponível
            </span>
            <span
              className={`font-bold font-mono mt-1 block ${
                saldoRestante < 0 ? 'text-red-600' : 'text-emerald-600'
              }`}
            >
              {formatarReal(saldoRestante)}
            </span>
          </div>
        </div>

        <div className="text-slate-400 shrink-0">
          {isExpanded ? (
            <ChevronUp className="w-5 h-5" />
          ) : (
            <ChevronDown className="w-5 h-5" />
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-slate-50 bg-slate-50/20 p-6 sm:p-8 space-y-8 animate-in fade-in duration-300">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-5 bg-white p-5 rounded-[14px] border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-4">
                Utilização Paga vs Limite Mensal
              </span>

              <div className="h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    margin={{ top: 0, right: 0, left: -25, bottom: 0 }}
                  >
                    <XAxis
                      dataKey="name"
                      stroke="#94A3B8"
                      fontSize={9}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="#94A3B8"
                      fontSize={9}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip formatter={(val: any) => formatarReal(numeroSeguro(val))} />
                    <Bar
                      dataKey="realizado"
                      fill="#0F172A"
                      radius={[4, 4, 0, 0]}
                      name="Utilizado Pago"
                    />
                    <Bar
                      dataKey="limite"
                      fill="#94A3B8"
                      opacity={0.15}
                      radius={[4, 4, 0, 0]}
                      name="Limite"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <CostCenterList
              costCenters={costCenters}
              processes={processosPlano}
            />
          </div>
        </div>
      )}
    </div>
  );
};