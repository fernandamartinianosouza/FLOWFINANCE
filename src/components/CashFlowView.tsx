import React, { useMemo, useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { formatarReal } from '../utils';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import {
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Trash2,
} from 'lucide-react';

type RecebimentoPrevisto = {
  id: string;
  data: string;
  valor: number;
};

export const CashFlowView: React.FC = () => {
  const { empresas, processos, empresaAtivaId } = useFinance();

  const empresa = empresas.find(e => e.id === empresaAtivaId) || empresas[0];

  const [dataRecebimento, setDataRecebimento] = useState('');
  const [valorRecebimento, setValorRecebimento] = useState('');
  const [recebimentos, setRecebimentos] = useState<RecebimentoPrevisto[]>(() => {
  const salvos = localStorage.getItem('flowfinance_recebimentos_previstos');

  if (!salvos) return [];

  try {
    return JSON.parse(salvos);
  } catch {
    return [];
  }
});

React.useEffect(() => {
  localStorage.setItem(
    'flowfinance_recebimentos_previstos',
    JSON.stringify(recebimentos)
  );
}, [recebimentos]);

  const totalSaidasPlanejadas = useMemo(() => {
    return processos
      .filter(p => p.empresaId === empresaAtivaId && p.status !== 'finalizado')
      .reduce((sum, p) => sum + Number(p.valor ?? 0), 0);
  }, [processos, empresaAtivaId]);

  const totalEntradasPrevistas = useMemo(() => {
    return recebimentos.reduce((sum, item) => sum + Number(item.valor ?? 0), 0);
  }, [recebimentos]);

  const saldoAtual = Number(empresa?.saldoAtual ?? empresa?.saldoInicial ?? 0);
  const saldoPrevisto = saldoAtual + totalEntradasPrevistas - totalSaidasPlanejadas;

  const adicionarRecebimento = () => {
    const valor = Number(valorRecebimento);

    if (!dataRecebimento || !Number.isFinite(valor) || valor <= 0) {
      alert('Informe uma data e um valor válido.');
      return;
    }

    setRecebimentos(prev => [
      ...prev,
      {
        id: crypto.randomUUID(),
        data: dataRecebimento,
        valor,
      },
    ]);

    setDataRecebimento('');
    setValorRecebimento('');
  };

  const removerRecebimento = (id: string) => {
    setRecebimentos(prev => prev.filter(item => item.id !== id));
  };

  const dadosGraficoFluxo = useMemo(() => {
    const mapa = new Map<string, { periodo: string; Entradas: number; Saidas: number }>();

    recebimentos.forEach(item => {
      const key = item.data;
      const atual = mapa.get(key) || {
        periodo: key,
        Entradas: 0,
        Saidas: 0,
      };

      atual.Entradas += Number(item.valor ?? 0);
      mapa.set(key, atual);
    });

    processos
      .filter(p => p.empresaId === empresaAtivaId && p.status !== 'finalizado')
      .forEach(p => {
        const key = p.prazo || p.dataCriacao || 'Sem data';
        const atual = mapa.get(key) || {
          periodo: key,
          Entradas: 0,
          Saidas: 0,
        };

        atual.Saidas += Number(p.valor ?? 0);
        mapa.set(key, atual);
      });

    return Array.from(mapa.values()).sort((a, b) =>
      a.periodo.localeCompare(b.periodo)
    );
  }, [recebimentos, processos, empresaAtivaId]);

  const resumoMensal = useMemo(() => {
    const mapa = new Map<string, { mes: string; entradas: number; saidas: number }>();

    recebimentos.forEach(item => {
      const mes = item.data.slice(0, 7);
      const atual = mapa.get(mes) || { mes, entradas: 0, saidas: 0 };
      atual.entradas += Number(item.valor ?? 0);
      mapa.set(mes, atual);
    });

    processos
      .filter(p => p.empresaId === empresaAtivaId && p.status !== 'finalizado')
      .forEach(p => {
        const mes = (p.prazo || p.dataCriacao || '').slice(0, 7);
        if (!mes) return;

        const atual = mapa.get(mes) || { mes, entradas: 0, saidas: 0 };
        atual.saidas += Number(p.valor ?? 0);
        mapa.set(mes, atual);
      });

    return Array.from(mapa.values()).sort((a, b) => a.mes.localeCompare(b.mes));
  }, [recebimentos, processos, empresaAtivaId]);

  if (!empresa) {
    return (
      <div className="bg-white p-8 rounded-[18px] border border-slate-100 text-center">
        <h2 className="text-lg font-bold text-slate-800">
          Nenhuma empresa cadastrada
        </h2>
      </div>
    );
  }

  return (
    <div className="space-y-10" id="cash-flow-view-container">
      <div>
        <h1 className="text-2xl font-bold font-sans tracking-tight text-[#0F172A]">
          Fluxo de Caixa
        </h1>
        <p className="text-xs text-slate-400 mt-1 font-sans">
          Conciliação simples entre valores a receber e contas a pagar.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-[18px] border border-slate-100 shadow-sm flex flex-col justify-between h-32">
          <div>
            <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase block">
              Entradas Previstas
            </span>
            <span className="text-lg font-bold text-emerald-600 mt-2 block font-mono">
              +{formatarReal(totalEntradasPrevistas)}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-emerald-600">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span className="text-[10px] font-semibold">
              Valores a receber lançados
            </span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-[18px] border border-slate-100 shadow-sm flex flex-col justify-between h-32">
          <div>
            <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase block">
              Saídas Previstas
            </span>
            <span className="text-lg font-bold text-[#0F172A] mt-2 block font-mono">
              -{formatarReal(totalSaidasPlanejadas)}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-amber-500">
            <ArrowDownRight className="w-3.5 h-3.5" />
            <span className="text-[10px] font-semibold">
              Compras em aberto
            </span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-[18px] border border-slate-100 shadow-sm flex flex-col justify-between h-32">
          <div>
            <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase block">
              Saldo Previsto Final
            </span>
            <span className="text-lg font-bold text-[#0F172A] mt-2 block font-mono">
              {formatarReal(saldoPrevisto)}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-500">
            <TrendingUp className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-[10px] font-semibold">
              Saldo atual + entradas - saídas
            </span>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-[18px] border border-slate-100 shadow-sm">
        <h2 className="text-sm font-bold text-[#0F172A] mb-4">
          Adicionar Valor a Receber
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            type="date"
            value={dataRecebimento}
            onChange={e => setDataRecebimento(e.target.value)}
            className="bg-slate-50 border-0 rounded-[12px] px-3.5 py-2.5 text-xs text-slate-700"
          />

          <input
            type="number"
            step="0.01"
            placeholder="Valor a receber"
            value={valorRecebimento}
            onChange={e => setValorRecebimento(e.target.value)}
            className="bg-slate-50 border-0 rounded-[12px] px-3.5 py-2.5 text-xs text-slate-700 font-mono"
          />

          <button
            type="button"
            onClick={adicionarRecebimento}
            className="bg-[#0F172A] text-white rounded-[12px] px-4 py-2.5 text-xs font-bold flex items-center justify-center gap-2"
          >
            <Plus className="w-3.5 h-3.5" />
            Adicionar
          </button>
        </div>

        {recebimentos.length > 0 && (
          <div className="mt-5 divide-y divide-slate-100">
            {recebimentos.map(item => (
              <div
                key={item.id}
                className="py-3 flex items-center justify-between"
              >
                <div>
                  <p className="text-xs font-bold text-slate-800">
                    {item.data}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    Valor previsto a receber
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  <span className="text-xs font-bold font-mono text-emerald-600">
                    +{formatarReal(item.valor)}
                  </span>

                  <button
                    type="button"
                    onClick={() => removerRecebimento(item.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white p-8 rounded-[18px] border border-slate-100 shadow-sm">
        <div className="mb-6">
          <h2 className="text-sm font-bold text-[#0F172A] font-sans">
            Previsão de Liquidez por Data
          </h2>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Entradas previstas versus contas a pagar.
          </p>
        </div>

        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={dadosGraficoFluxo}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorEntradasFlow" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorSaidasFlow" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0F172A" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#0F172A" stopOpacity={0} />
                </linearGradient>
              </defs>

              <XAxis dataKey="periodo" stroke="#94A3B8" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis stroke="#94A3B8" fontSize={10} tickLine={false} axisLine={false} />
              <Tooltip formatter={(val: any) => formatarReal(Number(val))} />
              <Area type="monotone" dataKey="Entradas" stroke="#10B981" strokeWidth={2} fill="url(#colorEntradasFlow)" name="Entradas Previstas" />
              <Area type="monotone" dataKey="Saidas" stroke="#0F172A" strokeWidth={2} fill="url(#colorSaidasFlow)" name="Saídas Planejadas" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {resumoMensal.length > 0 && (
        <div className="bg-white p-6 rounded-[18px] border border-slate-100 shadow-sm">
          <h2 className="text-sm font-bold text-[#0F172A] mb-4">
            Resumo Mensal
          </h2>

          <div className="divide-y divide-slate-100">
            {resumoMensal.map(item => (
              <div
                key={item.mes}
                className="py-3 grid grid-cols-4 gap-3 text-xs items-center"
              >
                <span className="font-bold text-slate-700">{item.mes}</span>
                <span className="font-mono text-emerald-600">
                  +{formatarReal(item.entradas)}
                </span>
                <span className="font-mono text-slate-700">
                  -{formatarReal(item.saidas)}
                </span>
                <span
                  className={`font-mono font-bold ${
                    item.entradas - item.saidas >= 0
                      ? 'text-emerald-600'
                      : 'text-red-600'
                  }`}
                >
                  {formatarReal(item.entradas - item.saidas)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CashFlowView;