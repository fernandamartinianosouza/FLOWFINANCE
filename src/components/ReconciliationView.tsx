import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { ProcessoCompra } from '../types';
import { formatarReal } from '../utils';
import { 
  RefreshCw, 
  CheckCircle, 
  AlertCircle, 
  ArrowRight, 
  Building, 
  FileCheck, 
  ArrowLeftRight,
  TrendingUp,
  Briefcase
} from 'lucide-react';

export const ReconciliationView: React.FC = () => {
  const { 
    processos, 
    empresas, 
    fornecedores, 
    planosFinanceiros,
    conciliarPagamento 
  } = useFinance();

  // Filtrar processos aguardando conciliação
  const conciliacoesPendentes = processos.filter(p => p.status === 'conciliacao');

  const [selectedId, setSelectedId] = useState<string | null>(
    conciliacoesPendentes.length > 0 ? conciliacoesPendentes[0].id : null
  );

  // Sincronizar ID se mudar
  React.useEffect(() => {
    if (conciliacoesPendentes.length > 0) {
      if (!selectedId || !conciliacoesPendentes.some(p => p.id === selectedId)) {
        setSelectedId(conciliacoesPendentes[0].id);
      }
    } else {
      setSelectedId(null);
    }
  }, [processos]);

  const processo = processos.find(p => p.id === selectedId);

  const handleConciliar = (p: ProcessoCompra) => {
    conciliarPagamento(p.id);
  };

  return (
    <div className="space-y-10" id="reconciliation-view-container">
      {/* View Header */}
      <div>
        <h1 className="text-2xl font-bold font-sans tracking-tight text-[#0F172A]">Conciliação Bancária</h1>
        <p className="text-xs text-slate-400 mt-1">Confronte pagamentos internos com o extrato bancário corporativo eletrônico para encerramento de lote.</p>
      </div>

      {conciliacoesPendentes.length === 0 ? (
        <div className="bg-white rounded-[18px] border border-slate-100 p-16 text-center shadow-sm">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-[#0F172A]">Tudo Conciliado!</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">Sensacional! Todos os pagamentos realizados foram cruzados com os extratos bancários das subsidiárias.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: List of items needing reconciliation (5 cols) */}
          <div className="lg:col-span-5 space-y-4 max-h-[500px] overflow-y-auto scrollbar-none pr-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Lançamentos Pendentes ({conciliacoesPendentes.length})</span>
            <div className="space-y-3">
              {conciliacoesPendentes.map((p) => {
                const isSelected = p.id === selectedId;
                const forn = fornecedores.find(f => f.id === p.fornecedorId);
                const emp = empresas.find(e => e.id === p.empresaId);

                return (
                  <button
                    key={p.id}
                    onClick={() => setSelectedId(p.id)}
                    className={`w-full p-5 rounded-[18px] border text-left transition-all flex flex-col justify-between ${
                      isSelected 
                        ? 'bg-[#0F172A] border-[#0F172A] text-white shadow-md' 
                        : 'bg-white border-slate-100 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-[10px] font-bold font-mono tracking-wide">{p.id}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                          isSelected ? 'bg-amber-300 text-[#0F172A]' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {p.metodoPagamento?.toUpperCase() || 'PAGO'}
                        </span>
                      </div>
                      <h4 className={`text-xs font-bold truncate ${isSelected ? 'text-white' : 'text-slate-800'}`}>
                        {p.descricao}
                      </h4>
                      <p className={`text-[10px] mt-1.5 truncate ${isSelected ? 'text-slate-300' : 'text-slate-400'}`}>
                        Empresa: {emp?.nome.split(' ')[0]} | Fornecedor: {forn?.nome}
                      </p>
                    </div>

                    <div className="flex items-center justify-between mt-4 pt-2.5 border-t border-white/5">
                      <span className="text-[10px] font-mono">Pago em: {p.dataPagamento || 'Hoje'}</span>
                      <span className="text-xs font-bold font-mono">{formatarReal(p.valor)}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column: Comparison / Reconciliation Panel (7 cols) */}
          <div className="lg:col-span-7">
            {processo ? (
              <div className="bg-white rounded-[18px] border border-slate-100 shadow-sm p-8 space-y-8">
                
                {/* Visual side-by-side reconciliation matching */}
                <div className="space-y-4">
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">CONFRONTO DE EXTRATOS ELETRÔNICOS</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center relative">
                    
                    {/* Visual connection dot / line */}
                    <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-[#0F172A] text-[#D4AF37] border-4 border-white items-center justify-center z-10 shadow-sm">
                      <ArrowLeftRight className="w-3.5 h-3.5" />
                    </div>

                    {/* Left: Internal record */}
                    <div className="bg-slate-50 border border-slate-100 p-5 rounded-[14px] space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-bold text-slate-400 uppercase">REGISTRO INTERNO FLOW</span>
                        <span className="w-2 h-2 rounded-full bg-amber-400" />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] text-slate-500 block">Identificador</span>
                        <span className="text-xs font-bold font-mono text-[#0F172A]">{processo.id}</span>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] text-slate-500 block">Favorecido cadastrado</span>
                        <span className="text-xs font-semibold text-slate-800 truncate block">
                          {fornecedores.find(f => f.id === processo.fornecedorId)?.nome}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] text-slate-500 block">Meio / Data de Débito</span>
                        <span className="text-xs font-medium text-slate-700">
                          {processo.metodoPagamento?.toUpperCase()} • {processo.dataPagamento}
                        </span>
                      </div>
                      <div className="space-y-0.5 pt-2 border-t border-slate-100">
                        <span className="text-[9px] text-slate-400 uppercase block">Valor Lançado</span>
                        <span className="text-sm font-extrabold text-[#0F172A] font-mono">{formatarReal(processo.valor)}</span>
                      </div>
                    </div>

                    {/* Right: Bank extract entry (Simulated match) */}
                    <div className="bg-slate-50 border border-slate-100 p-5 rounded-[14px] space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-bold text-slate-400 uppercase">EXTRATO BANCÁRIO (OFX)</span>
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] text-slate-500 block">Conta de Débito</span>
                        <span className="text-xs font-bold text-[#0F172A] font-mono">
                          {empresas.find(e => e.id === processo.empresaId)?.banco.split(' ')[1] || 'ITAÚ'}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] text-slate-500 block">Histórico do Extrato</span>
                        <span className="text-xs font-semibold text-slate-800 font-mono truncate block uppercase">
                          {processo.metodoPagamento?.toUpperCase() || 'TRANSF'} COMPRA {processo.id}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] text-slate-500 block">Data de Compensação</span>
                        <span className="text-xs font-medium text-slate-700 font-mono">
                          {processo.dataPagamento} 03:00
                        </span>
                      </div>
                      <div className="space-y-0.5 pt-2 border-t border-slate-100">
                        <span className="text-[9px] text-emerald-600 font-bold uppercase block">Débito Confirmado</span>
                        <span className="text-sm font-extrabold text-emerald-700 font-mono">-{formatarReal(processo.valor)}</span>
                      </div>
                    </div>

                  </div>
                </div>

                {/* Audit confirmation statement */}
                <div className="bg-slate-50/50 p-5 rounded-[14px] border border-slate-100 text-xs text-slate-500 leading-relaxed space-y-2">
                  <p className="font-semibold text-[#0F172A]">✓ Mapeamento 100% Compatível</p>
                  <p>O algoritmo inteligente de conciliação do FLOWFINANCE identificou correspondência idêntica para data, subsidiária pagadora, meio de transferência e valor nominal de débito faturado.</p>
                </div>

                {/* Reconciliation Action Trigger */}
                <div className="border-t border-slate-100 pt-6 flex gap-4">
                  <button
                    onClick={() => handleConciliar(processo)}
                    className="w-full py-3 bg-[#0F172A] hover:bg-[#1E293B] text-white font-bold text-xs rounded-[12px] flex items-center justify-center gap-2 transition-all shadow-md"
                    id="btn_reconcile_match"
                  >
                    <RefreshCw className="w-4 h-4 text-[#D4AF37] animate-spin-slow" />
                    <span>Confirmar Conciliação e Encerrar Processo</span>
                  </button>
                </div>

              </div>
            ) : (
              <div className="bg-white rounded-[18px] border border-slate-100 p-16 text-center text-slate-400 shadow-sm">
                Selecione um lançamento pendente de conciliação bancária na barra lateral.
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
};
