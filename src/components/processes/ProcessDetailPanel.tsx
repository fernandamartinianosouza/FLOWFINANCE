import React, { useEffect, useState } from 'react';
import { ProcessoCompra } from '../../types';
import { formatarReal } from '../../utils';
import { useFinance } from '../../context/FinanceContext';
import {
  GitBranch,
  X,
  FileText,
  Check,
  CheckCircle,
  ShieldCheck,
  Eye,
  Download,
  Upload,
} from 'lucide-react';

interface ProcessDetailPanelProps {
  process: ProcessoCompra;
  comentarioAcao: string;
  metodoPagamento: 'pix' | 'ted' | 'boleto' | 'dinheiro' | 'cartao';
  onComentarioChange: (valor: string) => void;
  onMetodoPagamentoChange: (valor: 'pix' | 'ted' | 'boleto' | 'dinheiro' | 'cartao') => void;
  onAvancar: (processo: ProcessoCompra) => void;
  onRejeitar: (processo: ProcessoCompra) => void;
  onClose: () => void;
}

export const ProcessDetailPanel: React.FC<ProcessDetailPanelProps> = ({
  process,
  comentarioAcao,
  metodoPagamento,
  onComentarioChange,
  onMetodoPagamentoChange,
  onAvancar,
  onRejeitar,
  onClose,
}) => {
  const {
    empresas,
    fornecedores,
    planosFinanceiros,
    centrosCustos,
    obterSugeridoProximoPasso,
    getDocumentosProcesso,
    anexarDocumentoProcesso,
  } = useFinance() as any;

  const [documentos, setDocumentos] = useState<any[]>([]);
  const [tipoDocumento, setTipoDocumento] = useState('complementar');
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [comprovante, setComprovante] = useState<File | null>(null);
  const [enviandoDoc, setEnviandoDoc] = useState(false);

  const processoDbId = (process as any).dbId;

  const carregarDocumentos = async () => {
    if (!processoDbId || !getDocumentosProcesso) return;

    const docs = await getDocumentosProcesso(processoDbId);
    setDocumentos(docs || []);
  };

  useEffect(() => {
    carregarDocumentos();
  }, [processoDbId]);

  const abrirArquivo = (url?: string | null) => {
    if (!url) {
      alert('Este documento não possui URL salva.');
      return;
    }

    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const baixarArquivo = (url?: string | null, nome?: string) => {
    if (!url) {
      alert('Este documento não possui URL salva.');
      return;
    }

    const link = document.createElement('a');
    link.href = url;
    link.download = nome || 'documento.pdf';
    link.target = '_blank';
    link.click();
  };

  const anexarDocumento = async () => {
    if (!arquivo) {
      alert('Selecione um arquivo.');
      return;
    }

    if (!processoDbId) {
      alert('Processo sem ID interno do banco.');
      return;
    }

    try {
      setEnviandoDoc(true);

      await anexarDocumentoProcesso({
        processoDbId,
        file: arquivo,
        tipo: tipoDocumento,
        enviadoPor: 'Operador FlowFinance',
      });

      setArquivo(null);
      await carregarDocumentos();
    } catch (error: any) {
      alert(error.message || 'Erro ao anexar documento.');
    } finally {
      setEnviandoDoc(false);
    }
  };

  const confirmarAvanco = async () => {
    if (process.status === 'pagamento') {
      if (!comprovante) {
        alert('Anexe o comprovante de pagamento antes de confirmar a liquidação.');
        return;
      }

      if (processoDbId) {
        await anexarDocumentoProcesso({
          processoDbId,
          file: comprovante,
          tipo: 'comprovante',
          enviadoPor: 'Contas a Pagar',
        });

        await carregarDocumentos();
      }
    }

    onAvancar(process);
  };

  const documentosSolicitacao = [
    ...(process.anexoNome
      ? [
          {
            id: 'anexo-principal',
            tipo: 'solicitacao',
            nome: process.anexoNome,
            url: (process as any).anexoUrl,
          },
        ]
      : []),
    ...documentos.filter((d) => d.tipo === 'solicitacao'),
  ];

  const documentosComplementares = documentos.filter(
    (d) => d.tipo !== 'solicitacao' && d.tipo !== 'comprovante'
  );

  const comprovantes = [
    ...(process.comprovanteNome
      ? [
          {
            id: 'comprovante-principal',
            tipo: 'comprovante',
            nome: process.comprovanteNome,
            url: (process as any).comprovanteUrl,
          },
        ]
      : []),
    ...documentos.filter((d) => d.tipo === 'comprovante'),
  ];

  return (
    <>
      <div
        className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs z-50"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-2xl w-full bg-white shadow-2xl z-50 flex flex-col justify-between h-screen border-l border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#0F172A]/5 flex items-center justify-center text-[#0F172A]">
              <GitBranch className="w-4 h-4" />
            </div>

            <div>
              <span className="text-[10px] font-bold text-slate-400 tracking-wide font-mono block">
                CÓDIGO OPERACIONAL
              </span>
              <h2 className="text-sm font-bold text-[#0F172A] font-mono leading-none mt-0.5">
                {process.id}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white border border-slate-100 flex items-center justify-center hover:bg-slate-50 text-slate-400 hover:text-slate-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          <div className="p-5 rounded-[18px] bg-[#0F172A] text-white space-y-3">
            <span className="text-[10px] font-bold text-[#D4AF37] uppercase tracking-widest block">
              DIRETRIZ INTELIGENTE FLOW
            </span>
            <p className="text-[11px] text-slate-200 leading-relaxed">
              {obterSugeridoProximoPasso(process).texto}
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Descrição do Escopo
            </h3>
            <p className="text-xs font-medium text-slate-800 leading-relaxed bg-slate-50 p-4 rounded-[14px] border border-slate-100/50">
              {process.descricao}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-6 bg-slate-50/50 p-6 rounded-[18px] border border-slate-100">
            <Info label="Fornecedor" value={fornecedores.find((f: any) => f.id === process.fornecedorId)?.nome} />
            <Info label="Empresa" value={empresas.find((e: any) => e.id === process.empresaId)?.nome} />
            <Info label="Plano Financeiro" value={planosFinanceiros.find((p: any) => p.id === process.planoFinanceiroId)?.nome} />
            <Info label="Centro de Custo" value={centrosCustos.find((c: any) => c.id === process.centroCustoId)?.nome} />
            <Info label="Prazo" value={process.prazo} />
            <Info label="Valor" value={formatarReal(process.valor)} />
            <Info label="Responsável" value={process.responsavel} full />
          </div>

          <BlocoDocumentos
            titulo="Documentos da Solicitação"
            documentos={documentosSolicitacao}
            onAbrir={abrirArquivo}
            onBaixar={baixarArquivo}
          />

          <BlocoDocumentos
            titulo="Documentos Complementares"
            documentos={documentosComplementares}
            onAbrir={abrirArquivo}
            onBaixar={baixarArquivo}
          />

          <div className="space-y-3 border border-slate-100 rounded-[16px] p-4">
            <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Anexar Novo Documento
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <select
                value={tipoDocumento}
                onChange={(e) => setTipoDocumento(e.target.value)}
                className="bg-slate-50 border-0 rounded-[12px] px-3 py-2 text-xs"
              >
                <option value="complementar">Complementar</option>
                <option value="nf">NF</option>
                <option value="boleto">Boleto</option>
                <option value="orcamento">Orçamento</option>
                <option value="contrato">Contrato</option>
                <option value="solicitacao">Solicitação</option>
              </select>

              <input
                type="file"
                accept=".pdf,.doc,.docx,.xlsx,.png,.jpg,.jpeg"
                onChange={(e) => setArquivo(e.target.files?.[0] || null)}
                className="text-xs bg-slate-50 rounded-[12px] px-3 py-2"
              />

              <button
                type="button"
                onClick={anexarDocumento}
                disabled={enviandoDoc}
                className="bg-[#0F172A] text-white rounded-[12px] px-3 py-2 text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Upload className="w-3.5 h-3.5" />
                {enviandoDoc ? 'Enviando...' : 'Anexar'}
              </button>
            </div>
          </div>

          {comprovantes.length > 0 && (
            <BlocoDocumentos
              titulo="Comprovantes de Pagamento"
              documentos={comprovantes}
              onAbrir={abrirArquivo}
              onBaixar={baixarArquivo}
            />
          )}

          {process.metodoPagamento && (
            <div className="space-y-4 border-t border-slate-100 pt-6">
              <h4 className="text-[11px] font-bold text-[#D4AF37] uppercase tracking-wider">
                Informações de Liquidação
              </h4>

              <div className="grid grid-cols-2 gap-4 bg-amber-50/20 p-5 rounded-[14px] border border-amber-100/50 text-xs">
                <Info label="Método de Envio" value={process.metodoPagamento?.toUpperCase()} />
                <Info label="Data do Pagamento" value={process.dataPagamento} />
              </div>
            </div>
          )}

          <div className="space-y-4">
            <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Histórico e Rota de Auditoria
            </h4>

            <div className="relative border-l border-slate-100 pl-4 ml-2.5 space-y-6">
              {(process.historico || []).map((h, hidx) => (
                <div key={hidx} className="relative">
                  <span className="absolute -left-[24.5px] top-1 w-2.5 h-2.5 rounded-full bg-[#0F172A] border-2 border-white ring-4 ring-slate-50" />
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold text-slate-800">{h.usuario}</span>
                      <span className="text-[9px] text-slate-400 font-mono">{h.data}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed italic">
                      {h.observacao || `${h.deStatus} → ${h.paraStatus}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-slate-100 bg-slate-50 space-y-4">
          {process.status !== 'finalizado' ? (
            <>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase block">
                  Observação / Justificativa
                </label>
                <input
                  type="text"
                  value={comentarioAcao}
                  onChange={(e) => onComentarioChange(e.target.value)}
                  className="w-full bg-white border border-slate-200 focus:ring-1 focus:ring-[#0F172A]/25 rounded-[12px] px-3.5 py-2.5 text-xs text-slate-600"
                />
              </div>

              {process.status === 'pagamento' && (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase block">
                      Meio de Transferência
                    </label>

                    <select
                      value={metodoPagamento}
                      onChange={(e: any) => onMetodoPagamentoChange(e.target.value)}
                      className="w-full bg-white border border-slate-200 focus:ring-1 focus:ring-[#0F172A]/25 rounded-[12px] px-3.5 py-2.5 text-xs text-[#0F172A] font-semibold"
                    >
                      <option value="pix">PIX</option>
                      <option value="ted">TED / DOC</option>
                      <option value="boleto">Boleto</option>
                      <option value="dinheiro">Dinheiro</option>
                      <option value="cartao">Cartão</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase block">
                      Comprovante de Pagamento
                    </label>

                    <input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg"
                      onChange={(e) => setComprovante(e.target.files?.[0] || null)}
                      className="w-full bg-white border border-slate-200 rounded-[12px] px-3.5 py-2.5 text-xs"
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                {(process.status === 'autorizacao_cp' ||
                  process.status === 'autorizacao_diretoria') && (
                  <button
                    onClick={() => onRejeitar(process)}
                    className="flex-1 px-4 py-3 border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs rounded-[12px]"
                  >
                    Reprovar / Ajustes
                  </button>
                )}

                <button
                  onClick={confirmarAvanco}
                  className="px-4 py-3 bg-[#0F172A] hover:bg-[#1E293B] text-white font-bold text-xs rounded-[12px] flex items-center justify-center gap-2 shadow-md flex-1"
                >
                  <ShieldCheck className="w-4 h-4 text-[#D4AF37]" />
                  <span>
                    {process.status === 'solicitacao' && 'Enviar para Cotação'}
                    {process.status === 'cotacao' && 'Enviar para Conferência'}
                    {process.status === 'conferencia' && 'Enviar para CP'}
                    {process.status === 'autorizacao_cp' && 'Aprovar CP'}
                    {process.status === 'autorizacao_diretoria' && 'Autorizar Pagamento'}
                    {process.status === 'pagamento' && 'Confirmar Liquidação Bancária'}
                    {process.status === 'conciliacao' && 'Conciliar Lançamento'}
                  </span>
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2.5 text-emerald-600 font-bold text-xs bg-emerald-50 border border-emerald-100 p-4 rounded-[12px] justify-center">
              <CheckCircle className="w-5 h-5" />
              <span>Processo Concluído, Conciliado e Arquivado Digitalmente</span>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

const Info = ({ label, value, full }: { label: string; value?: any; full?: boolean }) => (
  <div className={`space-y-1 ${full ? 'col-span-2' : ''}`}>
    <span className="text-[10px] text-slate-400 block uppercase font-medium">
      {label}
    </span>
    <span className="text-xs font-semibold text-[#0F172A]">
      {value || '-'}
    </span>
  </div>
);

const BlocoDocumentos = ({
  titulo,
  documentos,
  onAbrir,
  onBaixar,
}: {
  titulo: string;
  documentos: any[];
  onAbrir: (url?: string | null) => void;
  onBaixar: (url?: string | null, nome?: string) => void;
}) => {
  if (!documentos.length) return null;

  return (
    <div className="space-y-3">
      <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
        {titulo}
      </h4>

      <div className="space-y-2">
        {documentos.map((doc) => (
          <div
            key={doc.id}
            className="flex items-center justify-between p-3.5 bg-white border border-slate-100 rounded-[14px] text-xs shadow-xs"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <FileText className="w-4 h-4 text-slate-400 shrink-0" />
              <div className="min-w-0">
                <span className="font-medium text-slate-700 truncate block">
                  {doc.nome}
                </span>
                <span className="text-[9px] text-slate-400 uppercase">
                  {doc.tipo || 'documento'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onAbrir(doc.url)}
                className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center"
                title="Visualizar"
              >
                <Eye className="w-3.5 h-3.5 text-slate-600" />
              </button>

              <button
                type="button"
                onClick={() => onBaixar(doc.url, doc.nome)}
                className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center"
                title="Baixar"
              >
                <Download className="w-3.5 h-3.5 text-blue-600" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};