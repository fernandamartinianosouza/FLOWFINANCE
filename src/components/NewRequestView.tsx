import React, { useEffect, useMemo, useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { useAuth } from '../context/AuthContext';
import { Urgencia } from '../types';
import { Send, Upload, CheckCircle } from 'lucide-react';

export const NewRequestView: React.FC = () => {
  const finance = useFinance();
  const { user } = useAuth();

const usuarioLogado =
  user?.user_metadata?.nome ||
  user?.user_metadata?.name ||
  user?.email ||
  'Usuário logado';

  const empresas = finance.empresas ?? [];
  const fornecedores = finance.fornecedores ?? [];
  const planosFinanceiros = finance.planosFinanceiros ?? [];
  const centrosCustos = finance.centrosCustos ?? [];

  const { criarSolicitacao, setActiveView, uploadAnexoProcesso } = finance;

  const [fornecedorId, setFornecedorId] = useState('');
  const [empresaId, setEmpresaId] = useState('');
  const [planoId, setPlanoId] = useState('');
  const [centroId, setCentroId] = useState('');
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [urgencia, setUrgencia] = useState<Urgencia>('media');
  const [prazo, setPrazo] = useState('2026-07-20');
  const [responsavel, setResponsavel] = useState(usuarioLogado);

  const [isDragging, setIsDragging] = useState(false);
  const [anexoNome, setAnexoNome] = useState<string | null>(null);
  const [arquivoAnexo, setArquivoAnexo] = useState<File | null>(null);

  const [enviando, setEnviando] = useState(false);
  const [sucesso, setSucesso] = useState(false);

  useEffect(() => {
    if (!empresaId && empresas.length > 0) setEmpresaId(empresas[0].id);
  }, [empresas, empresaId]);

  useEffect(() => {
    if (!fornecedorId && fornecedores.length > 0) setFornecedorId(fornecedores[0].id);
  }, [fornecedores, fornecedorId]);

  useEffect(() => {
    if (!planoId && planosFinanceiros.length > 0) setPlanoId(planosFinanceiros[0].id);
  }, [planosFinanceiros, planoId]);

  useEffect(() => {
  setResponsavel(usuarioLogado);
}, [usuarioLogado]);

  const centrosFiltrados = useMemo(() => {
    return centrosCustos.filter((c: any) => c.planoFinanceiroId === planoId);
  }, [centrosCustos, planoId]);

  useEffect(() => {
    if (centrosFiltrados.length > 0) {
      setCentroId(centrosFiltrados[0].id);
    } else {
      setCentroId('');
    }
  }, [centrosFiltrados]);

  const handleFile = (file: File) => {
    setArquivoAnexo(file);
    setAnexoNome(file.name);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    handleFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    handleFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (enviando) return;

    if (!descricao || !valor || !fornecedorId || !empresaId || !planoId || !centroId) {
      alert('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    const valorNumerico = Number(valor);

    if (!Number.isFinite(valorNumerico) || valorNumerico <= 0) {
      alert('Informe um valor válido.');
      return;
    }

    setEnviando(true);

    try {
      let anexoUpload: { nome: string; url: string } | null = null;

      if (arquivoAnexo) {
        anexoUpload = await uploadAnexoProcesso(arquivoAnexo);
      }

      await criarSolicitacao({
        fornecedorId,
        empresaId,
        planoFinanceiroId: planoId,
        centroCustoId: centroId,
        descricao,
        valor: valorNumerico,
        urgencia,
        responsavel,
        prazo,
        anexoNome: anexoUpload?.nome ?? null,
        anexoUrl: anexoUpload?.url ?? null,
      });

      setSucesso(true);

      setTimeout(() => {
        setSucesso(false);
        setActiveView('processos');
      }, 1500);
    } catch (error: any) {
      console.error('Erro ao enviar solicitação:', error);
      alert(error.message || 'Erro ao enviar solicitação.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8" id="new-request-view-container">
      <div className="text-center space-y-1">
        <h1 className="text-2xl font-bold font-sans tracking-tight text-[#0F172A]">
          Nova Solicitação
        </h1>
        <p className="text-xs text-slate-400">
          Preencha os dados básicos da compra para abrir a rota operacional de aprovação.
        </p>
      </div>

      {sucesso ? (
        <div className="bg-emerald-50 border border-emerald-100 p-8 rounded-[18px] text-center space-y-4">
          <div className="w-12 h-12 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto shadow-md">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-emerald-800">
              Solicitação Enviada!
            </h3>
            <p className="text-xs text-emerald-600 mt-1">
              O processo foi registrado e encaminhado para aprovação.
            </p>
          </div>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="bg-white p-8 rounded-[18px] border border-slate-100 shadow-sm space-y-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">
                Empresa Solicitante
              </label>
              <select
                value={empresaId}
                onChange={(e) => setEmpresaId(e.target.value)}
                className="w-full bg-slate-50 border-0 focus:ring-1 focus:ring-[#0F172A]/25 rounded-[12px] px-3.5 py-2.5 text-xs text-[#0F172A] font-semibold"
                required
              >
                <option value="">Selecione</option>
                {empresas.map((emp: any) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.nome}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">
                Fornecedor
              </label>
              <select
                value={fornecedorId}
                onChange={(e) => setFornecedorId(e.target.value)}
                className="w-full bg-slate-50 border-0 focus:ring-1 focus:ring-[#0F172A]/25 rounded-[12px] px-3.5 py-2.5 text-xs text-[#0F172A] font-semibold"
                required
              >
                <option value="">Selecione</option>
                {fornecedores.map((forn: any) => (
                  <option key={forn.id} value={forn.id}>
                    {forn.nome}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">
                Plano Financeiro
              </label>
              <select
                value={planoId}
                onChange={(e) => setPlanoId(e.target.value)}
                className="w-full bg-slate-50 border-0 focus:ring-1 focus:ring-[#0F172A]/25 rounded-[12px] px-3.5 py-2.5 text-xs text-[#0F172A] font-semibold"
                required
              >
                <option value="">Selecione</option>
                {planosFinanceiros.map((plan: any) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.nome}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">
                Centro de Custo
              </label>
              <select
                value={centroId}
                onChange={(e) => setCentroId(e.target.value)}
                className="w-full bg-slate-50 border-0 focus:ring-1 focus:ring-[#0F172A]/25 rounded-[12px] px-3.5 py-2.5 text-xs text-slate-700 font-medium"
                required
              >
                <option value="">Selecione</option>
                {centrosFiltrados.map((cc: any) => (
                  <option key={cc.id} value={cc.id}>
                    {cc.nome}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">
                Valor Estimado (R$)
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="0,00"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                className="w-full bg-slate-50 border-0 focus:ring-1 focus:ring-[#0F172A]/25 rounded-[12px] px-3.5 py-2.5 text-xs text-slate-800 font-bold font-mono"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">
                Nível de Urgência
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['baixa', 'media', 'alta'] as Urgencia[]).map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setUrgencia(level)}
                    className={`py-2 text-[10px] font-bold uppercase rounded-[10px] transition-all border ${
                      urgencia === level
                        ? level === 'alta'
                          ? 'bg-red-50 border-red-200 text-red-600'
                          : level === 'media'
                            ? 'bg-amber-50 border-amber-200 text-amber-600'
                            : 'bg-slate-100 border-slate-200 text-slate-600'
                        : 'bg-white border-slate-100 text-slate-400 hover:bg-slate-50'
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">
                Data Limite de Liquidação
              </label>
              <input
                type="date"
                value={prazo}
                onChange={(e) => setPrazo(e.target.value)}
                className="w-full bg-slate-50 border-0 focus:ring-1 focus:ring-[#0F172A]/25 rounded-[12px] px-3.5 py-2.5 text-xs text-slate-600 font-mono"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">
                Gestor Responsável
              </label>
              <input
  type="text"
  value={responsavel}
  readOnly
  className="w-full bg-slate-100 border-0 rounded-[12px] px-3.5 py-2.5 text-xs text-slate-700 font-medium cursor-not-allowed"
/>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">
              Descrição Detalhada do Item / Serviço
            </label>
            <textarea
              rows={3}
              placeholder="Descreva a finalidade da contratação, quantidades e especificações técnicas..."
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              className="w-full bg-slate-50 border-0 focus:ring-1 focus:ring-[#0F172A]/25 rounded-[12px] px-3.5 py-2.5 text-xs text-slate-700 placeholder-slate-400 leading-relaxed"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">
              Upload de Proposta ou Justificativa
            </label>

            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border border-dashed rounded-[14px] p-6 text-center transition-all cursor-pointer ${
                isDragging
                  ? 'border-[#0F172A] bg-[#0F172A]/5'
                  : anexoNome
                    ? 'border-emerald-200 bg-emerald-50/20'
                    : 'border-slate-200 hover:bg-slate-50/50'
              }`}
            >
              <input
                type="file"
                id="file_upload_input"
                className="hidden"
                onChange={handleFileSelect}
                accept=".pdf,.docx,.xlsx"
              />

              <label htmlFor="file_upload_input" className="cursor-pointer space-y-2 block">
                <Upload className="w-6 h-6 text-slate-400 mx-auto" />
                {anexoNome ? (
                  <div>
                    <span className="text-xs font-semibold text-emerald-800 block">
                      Arquivo anexado com sucesso
                    </span>
                    <span className="text-[10px] text-emerald-600 font-mono block mt-1">
                      {anexoNome}
                    </span>
                  </div>
                ) : (
                  <div>
                    <span className="text-xs font-semibold text-slate-700 block">
                      Arraste a proposta ou clique para selecionar
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-1">
                      PDF, Word ou Excel
                    </span>
                  </div>
                )}
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={enviando}
            className="w-full py-3 bg-[#0F172A] hover:bg-[#1E293B] disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold text-xs rounded-[12px] flex items-center justify-center gap-2 transition-all shadow-md mt-4"
          >
            <Send className="w-3.5 h-3.5" />
            <span>
              {enviando ? 'Enviando...' : 'Enviar Solicitação para Aprovação'}
            </span>
          </button>
        </form>
      )}
    </div>
  );
};

export default NewRequestView;