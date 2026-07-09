import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { ProcessoCompra } from '../types';
import { formatarReal } from '../utils';
import { 
  Wallet, 
  ArrowRight, 
  CreditCard, 
  DollarSign, 
  FileText, 
  CheckCircle,
  Clock,
  Briefcase,
  Building,
  User,
  ShieldCheck
} from 'lucide-react';

export const AccountsPayableView: React.FC = () => {
  const { 
    processos, 
    empresas, 
    fornecedores, 
    planosFinanceiros,
    registrarPagamento,
    setActiveView 
  } = useFinance();

  // Filtrar apenas contas prontas para pagamento
  const contasPendentes = processos.filter(p => p.status === 'pagamento');

  // Selecionado
  const [selectedId, setSelectedId] = useState<string | null>(
    contasPendentes.length > 0 ? contasPendentes[0].id : null
  );

  const [metodo, setMetodo] = useState<'pix' | 'ted' | 'boleto' | 'dinheiro' | 'cartao'>('pix');
  const [comprovanteNome, setComprovanteNome] = useState('');

  // Sincronizar ID selecionado se a lista mudar
  React.useEffect(() => {
    if (contasPendentes.length > 0) {
      if (!selectedId || !contasPendentes.some(p => p.id === selectedId)) {
        setSelectedId(contasPendentes[0].id);
      }
    } else {
      setSelectedId(null);
    }
  }, [processos]);

  const processo = processos.find(p => p.id === selectedId);

  const handlePagar = (p: ProcessoCompra) => {
    const nomeComprovanteReal = comprovanteNome || `comprovante_bancario_${metodo}_${p.id.toLowerCase()}.pdf`;
    registrarPagamento(p.id, metodo, nomeComprovanteReal);
    setComprovanteNome('');
  };

  return (
    <div className="space-y-10" id="accounts-payable-view-container">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold font-sans tracking-tight text-[#0F172A]">Contas a Pagar</h1>
        <p className="text-xs text-slate-400 mt-1">Gerencie a liquidação de faturas e compromissos comerciais totalmente autorizados.</p>
      </div>

      {contasPendentes.length === 0 ? (
        <div className="bg-white rounded-[18px] border border-slate-100 p-16 text-center shadow-sm">
          <div className="w-12 h-12 bg-emerald-50 text-[#10B981] rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-[#0F172A]">Nenhum pagamento pendente</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">Excelente! Todas as faturas faturadas foram registradas ou estão em etapas anteriores de aprovação.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Authorized payments list (5 Cols) */}
          <div className="lg:col-span-5 space-y-4 max-h-[500px] overflow-y-auto scrollbar-none pr-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Fila de Liquidação ({contasPendentes.length})</span>
            <div className="space-y-3">
              {contasPendentes.map((p) => {
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
                          p.urgencia === 'alta' ? 'bg-red-500/10 text-red-500' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {p.urgencia}
                        </span>
                      </div>
                      <h4 className={`text-xs font-bold truncate ${isSelected ? 'text-white' : 'text-slate-800'}`}>
                        {p.descricao}
                      </h4>
                      <p className={`text-[10px] mt-1.5 truncate ${isSelected ? 'text-slate-300' : 'text-slate-400'}`}>
                        Favorecido: {forn?.nome}
                      </p>
                      <p className={`text-[10px] truncate ${isSelected ? 'text-slate-300' : 'text-slate-400'}`}>
                        Empresa: {emp?.nome}
                      </p>
                    </div>

                    <div className="flex items-center justify-between mt-4 pt-2.5 border-t border-white/5">
                      <span className="text-[10px] font-mono">Vencimento: {p.prazo}</span>
                      <span className="text-xs font-bold font-mono">{formatarReal(p.valor)}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column: Recording Panel (7 Cols) */}
          <div className="lg:col-span-7">
            {processo ? (
              <div className="bg-white rounded-[18px] border border-slate-100 shadow-sm p-8 space-y-6">
                
                {/* Visual indicator of total safety */}
                <div className="p-4 rounded-[14px] bg-emerald-50/50 border border-emerald-100/50 text-emerald-900 flex items-center gap-3.5">
                  <ShieldCheck className="w-6 h-6 text-emerald-600 shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wide">Fatura Autorizada para Pagamento</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">Este processo passou por todas as alçadas de auditoria de compras e diretoria financeira.</p>
                  </div>
                </div>

                {/* Info summary */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-xs border-b border-slate-50 pb-2.5">
                    <span className="text-slate-400 font-medium">Favorecido (Fornecedor)</span>
                    <span className="font-bold text-[#0F172A]">{fornecedores.find(f => f.id === processo.fornecedorId)?.nome}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs border-b border-slate-50 pb-2.5">
                    <span className="text-slate-400 font-medium">CNPJ Credor</span>
                    <span className="font-semibold text-slate-600 font-mono">{fornecedores.find(f => f.id === processo.fornecedorId)?.cnpj}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs border-b border-slate-50 pb-2.5">
                    <span className="text-slate-400 font-medium">Subsidiária Pagadora</span>
                    <span className="font-bold text-[#0F172A]">{empresas.find(e => e.id === processo.empresaId)?.nome}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs border-b border-slate-50 pb-2.5">
                    <span className="text-slate-400 font-medium">Conta de Débito Sugerida</span>
                    <span className="font-semibold text-slate-600 font-mono">{empresas.find(e => e.id === processo.empresaId)?.contaBancaria}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs border-b border-slate-50 pb-2.5">
                    <span className="text-slate-400 font-medium">Plano de Budget</span>
                    <span className="font-bold text-slate-700">{planosFinanceiros.find(p => p.id === processo.planoFinanceiroId)?.nome}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-slate-400 font-medium text-sm">Valor Líquido a Pagar</span>
                    <span className="font-extrabold text-[#0F172A] font-mono text-lg">{formatarReal(processo.valor)}</span>
                  </div>
                </div>

                {/* Payment setup Form */}
                <div className="border-t border-slate-100 pt-6 space-y-4">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Registrar Liquidação de Título</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Method */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase block">Meio de Transferência</label>
                      <select 
                        value={metodo}
                        onChange={(e: any) => setMetodo(e.target.value)}
                        className="w-full bg-slate-50 border-0 focus:ring-1 focus:ring-[#0F172A]/25 rounded-[12px] px-3.5 py-2.5 text-xs text-[#0F172A] font-semibold"
                      >
                        <option value="pix">PIX Eletrônico (Instantâneo)</option>
                        <option value="ted">TED / DOC (Mesmo Dia)</option>
                        <option value="boleto">Boleto Registrado (Compensação 24h)</option>
                        <option value="dinheiro">Espécie / Caixa Pequeno</option>
                        <option value="cartao">Cartão de Crédito Corporativo</option>
                      </select>
                    </div>

                    {/* Receipt Voucher simulated title */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase block">Chave / ID do Comprovante (Opcional)</label>
                      <input 
                        type="text" 
                        placeholder="Ex: tx_9812739812"
                        value={comprovanteNome}
                        onChange={(e) => setComprovanteNome(e.target.value)}
                        className="w-full bg-slate-50 border-0 focus:ring-1 focus:ring-[#0F172A]/25 rounded-[12px] px-3.5 py-2.5 text-xs text-slate-700 placeholder-slate-400"
                      />
                    </div>
                  </div>

                  {/* Button Trigger */}
                  <button
                    onClick={() => handlePagar(processo)}
                    className="w-full py-3 bg-[#0F172A] hover:bg-[#1E293B] text-white font-bold text-xs rounded-[12px] flex items-center justify-center gap-2 transition-all shadow-md mt-2"
                  >
                    <Wallet className="w-4 h-4 text-[#D4AF37]" />
                    <span>Dar Baixa e Enviar para Conciliação</span>
                  </button>
                </div>

              </div>
            ) : (
              <div className="bg-white rounded-[18px] border border-slate-100 p-16 text-center text-slate-400 shadow-sm">
                Selecione uma conta na lista à esquerda para registrar a baixa bancária.
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
};
