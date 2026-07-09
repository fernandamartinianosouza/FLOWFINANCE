import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { ProcessoCompra } from '../types';
import { formatarReal } from '../utils';
import { 
  CheckSquare, 
  ShieldCheck, 
  Crown, 
  ArrowRight, 
  FileText, 
  AlertTriangle, 
  X, 
  CornerDownRight, 
  ThumbsUp, 
  AlertCircle,
  Clock,
  Briefcase,
  Building,
  User,
  Check
} from 'lucide-react';

export const ApprovalsView: React.FC = () => {
  const { 
    processos, 
    empresas, 
    fornecedores, 
    planosFinanceiros, 
    centrosCustos,
    avancarProcesso,
    reprovarProcesso,
    solicitarAjustes 
  } = useFinance();

  // Filtrar apenas processos que necessitam de aprovação CP ou Diretoria
  const aprovacoesPendentes = processos.filter(
    p => p.status === 'autorizacao_cp' || p.status === 'autorizacao_diretoria'
  );

  // ID do processo selecionado para análise ativa
  const [selectedId, setSelectedId] = useState<string | null>(
    aprovacoesPendentes.length > 0 ? aprovacoesPendentes[0].id : null
  );

  const [comentarioAcao, setComentarioAcao] = useState('');

  // Garantir que temos um ID selecionado se a lista mudar
  React.useEffect(() => {
    if (aprovacoesPendentes.length > 0) {
      if (!selectedId || !aprovacoesPendentes.some(p => p.id === selectedId)) {
        setSelectedId(aprovacoesPendentes[0].id);
      }
    } else {
      setSelectedId(null);
    }
  }, [processos]);

  const processo = processos.find(p => p.id === selectedId);

  const handleAprovarCP = (p: ProcessoCompra) => {
    avancarProcesso(
      p.id, 
      'autorizacao_diretoria', 
      'Validador CP (Maurício)', 
      comentarioAcao || 'Aprovado Controle de Pagamentos. Limites e provisões de caixa validados.'
    );
    setComentarioAcao('');
  };

  const handleAutorizarDiretoria = (p: ProcessoCompra) => {
    avancarProcesso(
      p.id, 
      'pagamento', 
      'CFO (Cristeine)',
      comentarioAcao || 'Autorizado Diretoria. Encaminhado para liquidação no contas a pagar.'
    );
    setComentarioAcao('');
  };

  const handleReprovar = (p: ProcessoCompra) => {
    reprovarProcesso(
      p.id, 
      p.status === 'autorizacao_cp' ? 'Validador CP' : 'CFO', 
      comentarioAcao || 'Solicitação recusada. Revisar custos e justificativas.'
    );
    setComentarioAcao('');
  };

  const handleSolicitarAjustes = (p: ProcessoCompra) => {
    solicitarAjustes(
      p.id, 
      p.status === 'autorizacao_cp' ? 'Validador CP' : 'CFO', 
      comentarioAcao || 'Solicitada revisão de proposta comercial com fornecedor.'
    );
    setComentarioAcao('');
  };

  return (
    <div className="space-y-10" id="approvals-view-container">
      {/* View Header */}
      <div>
        <h1 className="text-2xl font-bold font-sans tracking-tight text-[#0F172A]">Central de Autorizações</h1>
        <p className="text-xs text-slate-400 mt-1">Valide e assine compras corporativas de acordo com as alçadas e conformidade fiscal.</p>
      </div>

      {aprovacoesPendentes.length === 0 ? (
        <div className="bg-white rounded-[18px] border border-slate-100 p-16 text-center shadow-sm">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-[#0F172A]">Tudo Autorizado!</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">Nenhuma compra pendente de aprovação CP ou de Diretoria no momento.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: List of Pendings (4 Cols) */}
          <div className="lg:col-span-5 space-y-4 max-h-[550px] overflow-y-auto scrollbar-none pr-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Fila de Pendências ({aprovacoesPendentes.length})</span>
            <div className="space-y-3">
              {aprovacoesPendentes.map((p) => {
                const isSelected = p.id === selectedId;
                const forn = fornecedores.find(f => f.id === p.fornecedorId);
                const emp = empresas.find(e => e.id === p.empresaId);

                return (
                  <button
                    key={p.id}
                    onClick={() => setSelectedId(p.id)}
                    className={`w-full p-4 rounded-[18px] border text-left transition-all flex flex-col justify-between ${
                      isSelected 
                        ? 'bg-[#0F172A] border-[#0F172A] text-white shadow-md' 
                        : 'bg-white border-slate-100 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-[10px] font-bold font-mono tracking-wide">{p.id}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                          p.status === 'autorizacao_cp' 
                            ? isSelected ? 'bg-[#D4AF37] text-[#0F172A]' : 'bg-amber-100 text-amber-800'
                            : isSelected ? 'bg-purple-200 text-purple-900' : 'bg-purple-100 text-purple-800'
                        }`}>
                          {p.status === 'autorizacao_cp' ? 'CP' : 'DIRETORIA'}
                        </span>
                      </div>
                      <h4 className={`text-xs font-bold truncate ${isSelected ? 'text-white' : 'text-slate-800'}`}>
                        {p.descricao}
                      </h4>
                      <p className={`text-[10px] mt-1 truncate ${isSelected ? 'text-slate-300' : 'text-slate-400'}`}>
                        Fornecedor: {forn?.nome} | Empresa: {emp?.nome.split(' ')[0]}
                      </p>
                    </div>

                    <div className="flex items-center justify-between mt-4 pt-2.5 border-t border-white/5">
                      <span className="text-[10px] font-mono font-medium">Prazo: {p.prazo}</span>
                      <span className="text-xs font-bold font-mono">{formatarReal(p.valor)}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column: Interaction Panel (7 Cols) */}
          <div className="lg:col-span-7">
            {processo ? (
              <div className="bg-white rounded-[18px] border border-slate-100 shadow-sm p-8 space-y-6">
                
                {/* Visual Header depending on status */}
                <div className={`p-5 rounded-[14px] flex items-center gap-4 ${
                  processo.status === 'autorizacao_cp' 
                    ? 'bg-amber-50/50 border border-amber-100/50 text-amber-900' 
                    : 'bg-purple-50/50 border border-purple-100/50 text-purple-900'
                }`}>
                  {processo.status === 'autorizacao_cp' ? (
                    <ShieldCheck className="w-8 h-8 text-amber-600 shrink-0" />
                  ) : (
                    <Crown className="w-8 h-8 text-purple-600 shrink-0" />
                  )}
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider">
                      {processo.status === 'autorizacao_cp' 
                        ? '🛡️ AGUARDANDO CONTROLE DE PAGAMENTOS (CP)' 
                        : '👑 AGUARDANDO ALÇADA DE DIRETORIA EXECUTIVE'}
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                      {processo.status === 'autorizacao_cp'
                        ? 'O CP valida adequação fiscal, teto anual do setor e consistência de fornecedor.'
                        : 'Demanda de alto valor faturado requer autorização expressa do CFO para emissão bancária.'}
                    </p>
                  </div>
                </div>

                {/* Core Attributes */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-50 pb-3">
                    <span className="text-xs font-bold text-slate-800">Finalidade:</span>
                    <span className="text-xs text-slate-600 max-w-[320px] text-right truncate" title={processo.descricao}>{processo.descricao}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-x-6 gap-y-4 text-xs">
                    <div>
                      <span className="text-slate-400 block font-medium">Empresa solicitante:</span>
                      <span className="font-semibold text-slate-800">{empresas.find(e => e.id === processo.empresaId)?.nome}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium">Fornecedor:</span>
                      <span className="font-semibold text-slate-800">{fornecedores.find(f => f.id === processo.fornecedorId)?.nome}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium">Plano de Budget:</span>
                      <span className="font-semibold text-slate-800">{planosFinanceiros.find(p => p.id === processo.planoFinanceiroId)?.nome}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium">Centro de Custo:</span>
                      <span className="font-semibold text-slate-800">{centrosCustos.find(c => c.id === processo.centroCustoId)?.nome}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium">Urgência:</span>
                      <span className="font-bold text-red-600 uppercase">{processo.urgencia}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium">Valor Solicitado:</span>
                      <span className="font-bold text-[#0F172A] font-mono text-sm">{formatarReal(processo.valor)}</span>
                    </div>
                  </div>
                </div>

                {/* File / Doc */}
                {processo.anexoNome && (
                  <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-[14px] flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-slate-400" />
                      <span className="font-medium text-slate-700">{processo.anexoNome}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">PDF | 1.4 MB</span>
                  </div>
                )}

                {/* Audit History Timeline */}
                <div className="border-t border-slate-50 pt-5 space-y-3">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Trilha de Operação</h4>
                  <div className="space-y-2 max-h-32 overflow-y-auto scrollbar-none">
                    {processo.historico.map((h, i) => (
                      <div key={i} className="flex gap-2 text-[11px] leading-relaxed">
                        <span className="text-[#D4AF37] shrink-0">↳</span>
                        <div className="text-slate-500">
                          <strong className="text-slate-700">{h.usuario}</strong> ({h.data}): De {h.deStatus === 'criacao' ? 'Início' : h.deStatus} para {h.paraStatus}. <span className="italic">"{h.observacao || 'Nenhum comentário'}"</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Decisive Action Panel */}
                <div className="border-t border-slate-50 pt-6 space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase block">Despacho de Aprovação / Auditoria</label>
                    <input 
                      type="text" 
                      placeholder="Anote considerações sobre limites orçamentários ou fiscais..."
                      value={comentarioAcao}
                      onChange={(e) => setComentarioAcao(e.target.value)}
                      className="w-full bg-slate-50 border-0 focus:ring-1 focus:ring-[#0F172A]/25 rounded-[12px] px-3.5 py-2.5 text-xs text-slate-700 placeholder-slate-400"
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => handleReprovar(processo)}
                      className="flex-1 py-3 border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs rounded-[12px] transition-all"
                    >
                      Reprovar Compra
                    </button>
                    <button
                      onClick={() => handleSolicitarAjustes(processo)}
                      className="flex-1 py-3 border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold text-xs rounded-[12px] transition-all"
                    >
                      Solicitar Ajustes
                    </button>
                    
                    {processo.status === 'autorizacao_cp' ? (
                      <button
                        onClick={() => handleAprovarCP(processo)}
                        className="flex-2 py-3 bg-[#0F172A] hover:bg-[#1E293B] text-white font-bold text-xs rounded-[12px] flex items-center justify-center gap-2 transition-all shadow-md flex-1"
                        id="btn_approve_cp"
                      >
                        <ShieldCheck className="w-4 h-4 text-[#D4AF37]" />
                        <span>Aprovar CP</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleAutorizarDiretoria(processo)}
                        className="flex-2 py-3 bg-[#0F172A] hover:bg-[#1E293B] text-white font-bold text-xs rounded-[12px] flex items-center justify-center gap-2 transition-all shadow-md flex-1"
                        id="btn_approve_diretoria"
                      >
                        <Crown className="w-4 h-4 text-[#D4AF37]" />
                        <span>Autorizar Diretoria</span>
                      </button>
                    )}
                  </div>
                </div>

              </div>
            ) : (
              <div className="bg-white rounded-[18px] border border-slate-100 p-16 text-center text-slate-400 shadow-sm">
                Selecione um processo na lista de pendências para analisar.
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
};
