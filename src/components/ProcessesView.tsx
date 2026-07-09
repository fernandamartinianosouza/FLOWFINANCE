import React, { useState, useEffect } from 'react';
import { useFinance } from '../context/FinanceContext';
import { StatusProcesso, ProcessoCompra } from '../types';
import {
  formatarReal,
  ETAPAS_PROCESSO,
  PROXIMO_STATUS_MAP,
  STATUS_LABELS,
} from '../utils';
import {
  CheckCircle,
  Search,
  ArrowRight,
  Filter,
  FileText,
  Pencil,
  Trash2,
  Download,
  Eye,
  X,
  Save,
} from 'lucide-react';
import { ProcessPipelineRail } from './processes/ProcessPipelineRail';
import { ProcessDetailPanel } from './processes/ProcessDetailPanel';

export const ProcessesView: React.FC = () => {
  const {
    processos,
    empresas,
    fornecedores,
    planosFinanceiros,
    centrosCustos,
    avancarProcesso,
    reprovarProcesso,
    registrarPagamento,
    conciliarPagamento,
    editarProcesso,
    excluirProcesso,
    activeProcessId,
    setActiveProcessId,
  } = useFinance();

  const [etapaAtiva, setEtapaAtiva] = useState<StatusProcesso | 'todos'>('todos');
  const [modalOpen, setModalOpen] = useState(false);

  const [modalEdicaoOpen, setModalEdicaoOpen] = useState(false);
  const [processoEditandoId, setProcessoEditandoId] = useState<string | null>(null);

  const [comentarioAcao, setComentarioAcao] = useState('');
  const [metodoPagamento, setMetodoPagamento] =
    useState<'pix' | 'ted' | 'boleto' | 'dinheiro' | 'cartao'>('pix');

  const [busca, setBusca] = useState('');
  const [urgenciaFiltro, setUrgenciaFiltro] =
    useState<'todos' | 'baixa' | 'media' | 'alta'>('todos');
  const [empresaFiltro, setEmpresaFiltro] = useState('todos');
  const [fornecedorFiltro, setFornecedorFiltro] = useState('todos');

  const [editDescricao, setEditDescricao] = useState('');
  const [editValor, setEditValor] = useState('');
  const [editPrazo, setEditPrazo] = useState('');
  const [editUrgencia, setEditUrgencia] =
    useState<'baixa' | 'media' | 'alta'>('media');
  const [editEmpresaId, setEditEmpresaId] = useState('');
  const [editFornecedorId, setEditFornecedorId] = useState('');
  const [editPlanoId, setEditPlanoId] = useState('');
  const [editCentroId, setEditCentroId] = useState('');

  useEffect(() => {
    if (activeProcessId) {
      const proc = processos.find(p => p.id === activeProcessId);

      if (proc) {
        setEtapaAtiva(proc.status);
        setModalOpen(true);
      }
    }
  }, [activeProcessId, processos]);

  const fecharModal = () => {
    setModalOpen(false);
    setActiveProcessId(null);
    setComentarioAcao('');
  };

  const processoSelecionado = processos.find(p => p.id === activeProcessId);

  const metricasEtapas = ETAPAS_PROCESSO.reduce((acc, e) => {
    const procsEtapa = processos.filter(p => p.status === e.key);

    acc[e.key] = {
      qtd: procsEtapa.length,
      valor: procsEtapa.reduce((sum, p) => sum + p.valor, 0),
    };

    return acc;
  }, {} as Record<StatusProcesso, { qtd: number; valor: number }>);

  const processosFiltrados = processos.filter(processo => {
    const fornecedor = fornecedores.find(f => f.id === processo.fornecedorId);
    const empresa = empresas.find(e => e.id === processo.empresaId);
    const plano = planosFinanceiros.find(p => p.id === processo.planoFinanceiroId);
    const centro = centrosCustos.find(c => c.id === processo.centroCustoId);

    const termo = busca.toLowerCase();

    const matchBusca =
      processo.id.toLowerCase().includes(termo) ||
      processo.descricao.toLowerCase().includes(termo) ||
      fornecedor?.nome.toLowerCase().includes(termo) ||
      empresa?.nome.toLowerCase().includes(termo) ||
      plano?.nome.toLowerCase().includes(termo) ||
      centro?.nome.toLowerCase().includes(termo);

    const matchEtapa = etapaAtiva === 'todos' || processo.status === etapaAtiva;
    const matchUrgencia =
      urgenciaFiltro === 'todos' || processo.urgencia === urgenciaFiltro;
    const matchEmpresa =
      empresaFiltro === 'todos' || processo.empresaId === empresaFiltro;
    const matchFornecedor =
      fornecedorFiltro === 'todos' || processo.fornecedorId === fornecedorFiltro;

    return (
      matchBusca &&
      matchEtapa &&
      matchUrgencia &&
      matchEmpresa &&
      matchFornecedor
    );
  });

  const handleAcaoAvancar = (p: ProcessoCompra) => {
    const proximo = PROXIMO_STATUS_MAP[p.status];

    if (p.status === 'pagamento') {
      registrarPagamento(p.id, metodoPagamento);
    } else if (p.status === 'conciliacao') {
      conciliarPagamento(p.id);
    } else {
      const etapaLabel =
        ETAPAS_PROCESSO.find(e => e.key === p.status)?.label || 'Etapa anterior';

      avancarProcesso(
        p.id,
        proximo,
        'Diretoria / Operador Flow',
        comentarioAcao ||
          `Avançado de ${etapaLabel} para a próxima etapa produtiva.`
      );
    }

    setComentarioAcao('');
    fecharModal();
  };

  const handleAcaoRejeitar = (p: ProcessoCompra) => {
    reprovarProcesso(
      p.id,
      'Diretoria / Operador Flow',
      comentarioAcao || 'Solicitada revisão de valores e fornecedor.'
    );

    setComentarioAcao('');
    fecharModal();
  };

  const abrirEdicaoProcesso = (processo: ProcessoCompra) => {
    setProcessoEditandoId(processo.id);
    setEditDescricao(processo.descricao);
    setEditValor(String(processo.valor));
    setEditPrazo(processo.prazo);
    setEditUrgencia(processo.urgencia);
    setEditEmpresaId(processo.empresaId);
    setEditFornecedorId(processo.fornecedorId);
    setEditPlanoId(processo.planoFinanceiroId);
    setEditCentroId(processo.centroCustoId);
    setModalEdicaoOpen(true);
  };

  const fecharEdicaoProcesso = () => {
    setModalEdicaoOpen(false);
    setProcessoEditandoId(null);
  };

  const salvarEdicaoProcesso = (e: React.FormEvent) => {
    e.preventDefault();

    if (!processoEditandoId) return;

    editarProcesso(processoEditandoId, {
      descricao: editDescricao,
      valor: parseFloat(editValor),
      prazo: editPrazo,
      urgencia: editUrgencia,
      empresaId: editEmpresaId,
      fornecedorId: editFornecedorId,
      planoFinanceiroId: editPlanoId,
      centroCustoId: editCentroId,
    });

    fecharEdicaoProcesso();
  };

  const handleExcluirProcesso = (id: string) => {
    if (
      !window.confirm(
        'Deseja realmente excluir este processo? Essa ação não poderá ser desfeita.'
      )
    ) {
      return;
    }

    excluirProcesso(id);
  };

  const gerarPdfProcesso = (processo: ProcessoCompra) => {
    const fornecedor = fornecedores.find(f => f.id === processo.fornecedorId);
    const empresa = empresas.find(e => e.id === processo.empresaId);
    const plano = planosFinanceiros.find(p => p.id === processo.planoFinanceiroId);
    const centro = centrosCustos.find(c => c.id === processo.centroCustoId);

    const janela = window.open('', '_blank');

    if (!janela) {
      alert('Não foi possível abrir a janela de impressão.');
      return;
    }

    janela.document.write(`
      <html>
        <head>
          <title>${processo.id}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 40px;
              color: #0f172a;
              background: #ffffff;
            }

            .header {
              border-bottom: 2px solid #0f172a;
              padding-bottom: 16px;
              margin-bottom: 32px;
            }

            .brand {
              font-size: 11px;
              font-weight: bold;
              letter-spacing: 1.5px;
              color: #64748b;
              margin-bottom: 8px;
            }

            h1 {
              font-size: 22px;
              margin: 0;
            }

            .subtitle {
              color: #64748b;
              font-size: 12px;
              margin-top: 6px;
            }

            .grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 16px;
            }

            .box {
              border: 1px solid #e2e8f0;
              border-radius: 12px;
              padding: 16px;
              margin-bottom: 16px;
            }

            .label {
              font-size: 10px;
              color: #64748b;
              text-transform: uppercase;
              font-weight: bold;
              margin-bottom: 6px;
              letter-spacing: 0.5px;
            }

            .value {
              font-size: 14px;
              font-weight: bold;
            }

            .description {
              font-size: 13px;
              line-height: 1.6;
            }

            .history {
              margin-top: 24px;
            }

            .history-item {
              border-left: 3px solid #0f172a;
              padding-left: 12px;
              margin-bottom: 14px;
            }

            .history-date {
              font-size: 10px;
              color: #64748b;
              margin-bottom: 4px;
            }

            .history-text {
              font-size: 12px;
              color: #0f172a;
            }

            .footer {
              margin-top: 40px;
              font-size: 10px;
              color: #64748b;
              border-top: 1px solid #e2e8f0;
              padding-top: 16px;
            }
          </style>
        </head>

        <body>
          <div class="header">
            <div class="brand">FLOWFINANCE</div>
            <h1>Relatório do Processo ${processo.id}</h1>
            <div class="subtitle">Documento gerado automaticamente pelo sistema.</div>
          </div>

          <div class="box">
            <div class="label">Descrição</div>
            <div class="description">${processo.descricao}</div>
          </div>

          <div class="grid">
            <div class="box">
              <div class="label">Empresa</div>
              <div class="value">${empresa?.nome || '-'}</div>
            </div>

            <div class="box">
              <div class="label">Fornecedor</div>
              <div class="value">${fornecedor?.nome || '-'}</div>
            </div>

            <div class="box">
              <div class="label">Plano Financeiro</div>
              <div class="value">${plano?.nome || '-'}</div>
            </div>

            <div class="box">
              <div class="label">Centro de Custo</div>
              <div class="value">${centro?.nome || '-'}</div>
            </div>

            <div class="box">
              <div class="label">Valor</div>
              <div class="value">${formatarReal(processo.valor)}</div>
            </div>

            <div class="box">
              <div class="label">Prazo</div>
              <div class="value">${processo.prazo}</div>
            </div>

            <div class="box">
              <div class="label">Status</div>
              <div class="value">${STATUS_LABELS[processo.status]}</div>
            </div>

            <div class="box">
              <div class="label">Urgência</div>
              <div class="value">${processo.urgencia}</div>
            </div>

            <div class="box">
              <div class="label">Responsável</div>
              <div class="value">${processo.responsavel}</div>
            </div>

            <div class="box">
              <div class="label">Data de criação</div>
              <div class="value">${processo.dataCriacao}</div>
            </div>
          </div>

          ${
            processo.anexoNome || processo.comprovanteNome
              ? `
                <div class="box">
                  <div class="label">Anexos</div>
                  <div class="description">
                    ${processo.anexoNome || ''}
                    ${processo.comprovanteNome ? `<br/>${processo.comprovanteNome}` : ''}
                  </div>
                </div>
              `
              : ''
          }

          <div class="history">
            <h2 style="font-size: 15px;">Histórico do processo</h2>

            ${
              processo.historico?.length
                ? processo.historico
                    .map(
                      item => `
                        <div class="history-item">
                          <div class="history-date">${item.data} • ${item.usuario}</div>
                          <div class="history-text">
                            ${STATUS_LABELS[item.deStatus as StatusProcesso] || item.deStatus}
                            →
                            ${STATUS_LABELS[item.paraStatus as StatusProcesso] || item.paraStatus}
                            <br/>
                            ${item.observacao || ''}
                          </div>
                        </div>
                      `
                    )
                    .join('')
                : '<p style="font-size: 12px; color: #64748b;">Sem histórico registrado.</p>'
            }
          </div>

          <div class="footer">
            Gerado em ${new Date().toLocaleString('pt-BR')}. Este documento é uma representação do registro interno do processo.
          </div>

          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `);

    janela.document.close();
  };

  const visualizarAnexo = (processo: ProcessoCompra) => {

  const url = processo.anexoUrl || processo.comprovanteUrl;

  if (!url) {
    alert("Este processo não possui um PDF salvo.");
    return;
  }

  window.open(url, "_blank", "noopener,noreferrer");
};

  const getUrgenciaClass = (urgencia: string) => {
    if (urgencia === 'alta') return 'bg-red-50 text-red-600 border-red-100';
    if (urgencia === 'media') return 'bg-amber-50 text-amber-600 border-amber-100';
    return 'bg-emerald-50 text-emerald-600 border-emerald-100';
  };

  const getStatusClass = (status: StatusProcesso) => {
    if (status === 'finalizado') {
      return 'bg-slate-900 text-white border-slate-900';
    }

    if (status === 'conciliacao') {
      return 'bg-violet-50 text-violet-600 border-violet-100';
    }

    if (status === 'pagamento') {
      return 'bg-blue-50 text-blue-600 border-blue-100';
    }

    if (status === 'autorizacao_diretoria') {
      return 'bg-amber-50 text-amber-600 border-amber-100';
    }

    return 'bg-slate-50 text-slate-600 border-slate-100';
  };

  return (
    <div className="space-y-10" id="processes-view-container">
      <div>
        <h1 className="text-2xl font-bold font-sans tracking-tight text-[#0F172A]">
          Central de Processos
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Acompanhe compras corporativas do início até a baixa e arquivamento.
        </p>
      </div>

      <ProcessPipelineRail
        metricasEtapas={metricasEtapas}
        etapaAtiva={etapaAtiva === 'todos' ? 'solicitacao' : etapaAtiva}
        onEtapaChange={setEtapaAtiva}
      />

      <div className="bg-white border border-slate-100 rounded-[18px] p-5 shadow-sm space-y-4 max-w-[1180px]">
        <div className="flex items-center gap-2 text-[#0F172A]">
          <Filter className="w-4 h-4" />
          <h2 className="text-sm font-bold">Filtros de acompanhamento</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
          <div className="xl:col-span-2 bg-slate-50 rounded-[12px] px-3 flex items-center gap-2">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              value={busca}
              onChange={e => setBusca(e.target.value)}
              placeholder="Buscar por processo, fornecedor, empresa..."
              className="w-full bg-transparent border-0 focus:ring-0 text-xs text-slate-600 placeholder-slate-400 py-2.5"
            />
          </div>

          <select
            value={etapaAtiva}
            onChange={e => setEtapaAtiva(e.target.value as StatusProcesso | 'todos')}
            className="bg-slate-50 border-0 rounded-[12px] px-3 py-2.5 text-xs text-slate-600 focus:ring-1 focus:ring-[#0F172A]/20"
          >
            <option value="todos">Todas as etapas</option>
            {ETAPAS_PROCESSO.map(etapa => (
              <option key={etapa.key} value={etapa.key}>
                {etapa.label}
              </option>
            ))}
          </select>

          <select
            value={urgenciaFiltro}
            onChange={e => setUrgenciaFiltro(e.target.value as any)}
            className="bg-slate-50 border-0 rounded-[12px] px-3 py-2.5 text-xs text-slate-600 focus:ring-1 focus:ring-[#0F172A]/20"
          >
            <option value="todos">Todas urgências</option>
            <option value="alta">Alta</option>
            <option value="media">Média</option>
            <option value="baixa">Baixa</option>
          </select>

          <select
            value={empresaFiltro}
            onChange={e => setEmpresaFiltro(e.target.value)}
            className="bg-slate-50 border-0 rounded-[12px] px-3 py-2.5 text-xs text-slate-600 focus:ring-1 focus:ring-[#0F172A]/20"
          >
            <option value="todos">Todas empresas</option>
            {empresas.map(empresa => (
              <option key={empresa.id} value={empresa.id}>
                {empresa.nome}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          <select
            value={fornecedorFiltro}
            onChange={e => setFornecedorFiltro(e.target.value)}
            className="bg-slate-50 border-0 rounded-[12px] px-3 py-2.5 text-xs text-slate-600 focus:ring-1 focus:ring-[#0F172A]/20"
          >
            <option value="todos">Todos fornecedores</option>
            {fornecedores.map(fornecedor => (
              <option key={fornecedor.id} value={fornecedor.id}>
                {fornecedor.nome}
              </option>
            ))}
          </select>

          <button
            onClick={() => {
              setBusca('');
              setEtapaAtiva('todos');
              setUrgenciaFiltro('todos');
              setEmpresaFiltro('todos');
              setFornecedorFiltro('todos');
            }}
            className="px-4 py-2.5 rounded-[12px] bg-slate-50 hover:bg-slate-100 text-slate-600 font-semibold text-xs transition"
          >
            Limpar filtros
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-100 rounded-[18px] shadow-sm overflow-hidden max-w-[1180px]">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-[#0F172A]">
              Listagem de processos
            </h2>
            <p className="text-[11px] text-slate-400 mt-1">
              {processosFiltrados.length} processo(s) encontrado(s)
            </p>
          </div>

          <div className="w-9 h-9 rounded-[12px] bg-slate-50 flex items-center justify-center">
            <FileText className="w-4 h-4 text-slate-500" />
          </div>
        </div>

        {processosFiltrados.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-12 h-12 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-5 h-5" />
            </div>

            <h3 className="text-sm font-bold text-[#0F172A]">
              Nenhum processo encontrado
            </h3>

            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Ajuste os filtros ou selecione outra etapa do fluxo.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50/80">
                <tr className="text-[10px] uppercase tracking-wide text-slate-400">
                  <th className="px-5 py-3 font-bold">Processo</th>
                  <th className="px-5 py-3 font-bold">Descrição</th>
                  <th className="px-5 py-3 font-bold">Status</th>
                  <th className="px-5 py-3 font-bold">Fornecedor</th>
                  <th className="px-5 py-3 font-bold">Empresa</th>
                  <th className="px-5 py-3 font-bold">Valor</th>
                  <th className="px-5 py-3 font-bold">Prazo</th>
                  <th className="px-5 py-3 font-bold text-right">Ações</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-50">
                {processosFiltrados.map(processo => {
                  const fornecedor = fornecedores.find(
                    f => f.id === processo.fornecedorId
                  );
                  const empresa = empresas.find(e => e.id === processo.empresaId);
                  const centro = centrosCustos.find(
                    c => c.id === processo.centroCustoId
                  );

                  return (
                    <tr
                      key={processo.id}
                      className="hover:bg-slate-50/60 transition-colors"
                    >
                      <td className="px-5 py-4">
                        <div className="font-bold text-xs text-[#0F172A]">
                          {processo.id}
                        </div>

                        <span
                          className={`inline-flex mt-2 px-2 py-1 rounded-full border text-[9px] font-bold uppercase ${getUrgenciaClass(
                            processo.urgencia
                          )}`}
                        >
                          {processo.urgencia}
                        </span>
                      </td>

                      <td className="px-5 py-4 min-w-[260px]">
                        <p className="text-xs font-semibold text-slate-700 line-clamp-2">
                          {processo.descricao}
                        </p>

                        <p className="text-[10px] text-slate-400 mt-1">
                          {centro?.nome || 'Centro não informado'}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex px-2.5 py-1.5 rounded-full border text-[10px] font-bold ${getStatusClass(
                            processo.status
                          )}`}
                        >
                          {STATUS_LABELS[processo.status]}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-xs text-slate-500">
                        {fornecedor?.nome || 'Fornecedor não encontrado'}
                      </td>

                      <td className="px-5 py-4 text-xs text-slate-500">
                        {empresa?.nome || 'Empresa não encontrada'}
                      </td>

                      <td className="px-5 py-4 text-xs font-bold font-mono text-[#0F172A]">
                        {formatarReal(processo.valor)}
                      </td>

                      <td className="px-5 py-4 text-xs text-slate-500 font-mono">
                        {processo.prazo}
                      </td>

                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => visualizarAnexo(processo)}
                            className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-100 flex items-center justify-center transition"
                            title="Visualizar PDF em anexo"
                          >
                            <Eye className="w-3.5 h-3.5 text-slate-600" />
                          </button>

                          <button
                            onClick={() => gerarPdfProcesso(processo)}
                            className="w-8 h-8 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-100 flex items-center justify-center transition"
                            title="Gerar PDF"
                          >
                            <Download className="w-3.5 h-3.5 text-blue-600" />
                          </button>

                          <button
                            onClick={() => abrirEdicaoProcesso(processo)}
                            className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-100 flex items-center justify-center transition"
                            title="Editar processo"
                          >
                            <Pencil className="w-3.5 h-3.5 text-slate-600" />
                          </button>

                          <button
                            onClick={() => handleExcluirProcesso(processo.id)}
                            className="w-8 h-8 rounded-xl bg-red-50 hover:bg-red-100 border border-red-100 flex items-center justify-center transition"
                            title="Excluir processo"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-500" />
                          </button>

                          <button
                            onClick={() => {
                              setActiveProcessId(processo.id);
                              setModalOpen(true);
                            }}
                            className="inline-flex items-center gap-2 px-3 py-2 rounded-[12px] bg-[#0F172A] hover:bg-[#1E293B] text-white text-[10px] font-bold transition"
                          >
                            Acessar
                            <ArrowRight className="w-3 h-3" />
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

      {modalEdicaoOpen && (
        <>
          <div
            className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs z-50"
            onClick={fecharEdicaoProcesso}
          />

          <div className="fixed inset-y-0 right-0 max-w-md w-full bg-white shadow-2xl z-50 flex flex-col h-screen border-l border-slate-100 animate-in slide-in-from-right duration-300">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Pencil className="w-4 h-4 text-[#0F172A]" />
                <h2 className="text-sm font-bold text-[#0F172A]">
                  Editar Processo
                </h2>
              </div>

              <button
                onClick={fecharEdicaoProcesso}
                className="w-8 h-8 rounded-full bg-white border border-slate-100 flex items-center justify-center hover:bg-slate-50 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={salvarEdicaoProcesso}
              className="flex-1 p-6 space-y-5 overflow-y-auto"
            >
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">
                  Descrição
                </label>

                <textarea
                  value={editDescricao}
                  onChange={e => setEditDescricao(e.target.value)}
                  className="w-full bg-slate-50 border-0 focus:ring-1 focus:ring-[#0F172A]/25 rounded-[12px] px-3.5 py-2.5 text-xs text-slate-700 min-h-24"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">
                    Valor
                  </label>

                  <input
                    type="number"
                    value={editValor}
                    onChange={e => setEditValor(e.target.value)}
                    className="w-full bg-slate-50 border-0 focus:ring-1 focus:ring-[#0F172A]/25 rounded-[12px] px-3.5 py-2.5 text-xs text-slate-800 font-bold font-mono"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">
                    Prazo
                  </label>

                  <input
                    type="date"
                    value={editPrazo}
                    onChange={e => setEditPrazo(e.target.value)}
                    className="w-full bg-slate-50 border-0 focus:ring-1 focus:ring-[#0F172A]/25 rounded-[12px] px-3.5 py-2.5 text-xs text-slate-700"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">
                  Urgência
                </label>

                <select
                  value={editUrgencia}
                  onChange={e => setEditUrgencia(e.target.value as any)}
                  className="w-full bg-slate-50 border-0 focus:ring-1 focus:ring-[#0F172A]/25 rounded-[12px] px-3.5 py-2.5 text-xs text-slate-700"
                >
                  <option value="baixa">Baixa</option>
                  <option value="media">Média</option>
                  <option value="alta">Alta</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">
                  Empresa
                </label>

                <select
                  value={editEmpresaId}
                  onChange={e => setEditEmpresaId(e.target.value)}
                  className="w-full bg-slate-50 border-0 focus:ring-1 focus:ring-[#0F172A]/25 rounded-[12px] px-3.5 py-2.5 text-xs text-slate-700"
                >
                  {empresas.map(empresa => (
                    <option key={empresa.id} value={empresa.id}>
                      {empresa.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">
                  Fornecedor
                </label>

                <select
                  value={editFornecedorId}
                  onChange={e => setEditFornecedorId(e.target.value)}
                  className="w-full bg-slate-50 border-0 focus:ring-1 focus:ring-[#0F172A]/25 rounded-[12px] px-3.5 py-2.5 text-xs text-slate-700"
                >
                  {fornecedores.map(fornecedor => (
                    <option key={fornecedor.id} value={fornecedor.id}>
                      {fornecedor.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">
                  Plano Financeiro
                </label>

                <select
                  value={editPlanoId}
                  onChange={e => {
                    setEditPlanoId(e.target.value);
                    const primeiroCentro = centrosCustos.find(
                      centro => centro.planoFinanceiroId === e.target.value
                    );
                    setEditCentroId(primeiroCentro?.id || '');
                  }}
                  className="w-full bg-slate-50 border-0 focus:ring-1 focus:ring-[#0F172A]/25 rounded-[12px] px-3.5 py-2.5 text-xs text-slate-700"
                >
                  {planosFinanceiros.map(plano => (
                    <option key={plano.id} value={plano.id}>
                      {plano.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">
                  Centro de Custo
                </label>

                <select
                  value={editCentroId}
                  onChange={e => setEditCentroId(e.target.value)}
                  className="w-full bg-slate-50 border-0 focus:ring-1 focus:ring-[#0F172A]/25 rounded-[12px] px-3.5 py-2.5 text-xs text-slate-700"
                >
                  {centrosCustos
                    .filter(centro => !editPlanoId || centro.planoFinanceiroId === editPlanoId)
                    .map(centro => (
                      <option key={centro.id} value={centro.id}>
                        {centro.nome}
                      </option>
                    ))}
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-[#0F172A] hover:bg-[#1E293B] text-white font-bold text-xs rounded-[12px] flex items-center justify-center gap-2 transition-all mt-6 shadow-md"
              >
                <Save className="w-4 h-4" />
                <span>Salvar Alterações</span>
              </button>
            </form>
          </div>
        </>
      )}

      {modalOpen && processoSelecionado && (
        <ProcessDetailPanel
          process={processoSelecionado}
          comentarioAcao={comentarioAcao}
          metodoPagamento={metodoPagamento}
          onComentarioChange={setComentarioAcao}
          onMetodoPagamentoChange={setMetodoPagamento}
          onAvancar={handleAcaoAvancar}
          onRejeitar={handleAcaoRejeitar}
          onClose={fecharModal}
        />
      )}
    </div>
  );
};