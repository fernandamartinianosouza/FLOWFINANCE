import React, { useEffect, useMemo, useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { useAuth } from '../context/AuthContext';
import { formatarReal } from '../utils';
import {
  Cotacao,
  CotacaoProposta,
  quotationService,
} from '../services/quotationService';
import {
  ClipboardList,
  Plus,
  X,
  Search,
  Trash2,
  CheckCircle2,
  Trophy,
  Building2,
  Package,
  CalendarDays,
  DollarSign,
  ArrowLeft,
  Save,
  AlertTriangle,
} from 'lucide-react';

interface ItemFormulario {
  idLocal: string;
  descricao: string;
  quantidade: string;
  unidade: string;
  especificacao: string;
}

interface PrecoItemFormulario {
  cotacaoItemId: string;
  valorUnitario: string;
  marca: string;
  observacao: string;
}

const criarIdLocal = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const numeroSeguro = (valor: unknown) => {
  const n = Number(valor ?? 0);
  return Number.isFinite(n) ? n : 0;
};

const normalizarTexto = (valor: unknown) =>
  String(valor ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();

const obterIdProcesso = (processo: any) =>
  String(processo?.id ?? processo?.dbId ?? '');

const obterDescricaoProcesso = (processo: any) =>
  String(
    processo?.descricao ??
      processo?.titulo ??
      processo?.nome ??
      'Processo sem descrição'
  );

export const QuotationsView: React.FC = () => {
  const {
    processos,
    fornecedores,
    editarProcesso,
  } = useFinance();

  const { nomeUsuario } = useAuth();

  const [cotacoes, setCotacoes] = useState<Cotacao[]>([]);
  const [loading, setLoading] = useState(false);
  const [busca, setBusca] = useState('');

  const [cotacaoSelecionadaId, setCotacaoSelecionadaId] =
    useState<string | null>(null);

  const [modalNovaCotacao, setModalNovaCotacao] = useState(false);
  const [salvandoCotacao, setSalvandoCotacao] = useState(false);

  const [processoId, setProcessoId] = useState('');
  const [titulo, setTitulo] = useState('');
  const [observacao, setObservacao] = useState('');

  const [itensFormulario, setItensFormulario] = useState<ItemFormulario[]>([
    {
      idLocal: criarIdLocal(),
      descricao: '',
      quantidade: '1',
      unidade: 'UN',
      especificacao: '',
    },
  ]);

  const [modalProposta, setModalProposta] = useState(false);
  const [salvandoProposta, setSalvandoProposta] = useState(false);

  const [fornecedorPropostaId, setFornecedorPropostaId] = useState('');
  const [prazoEntregaDias, setPrazoEntregaDias] = useState('');
  const [condicaoPagamento, setCondicaoPagamento] = useState('');
  const [frete, setFrete] = useState('');
  const [desconto, setDesconto] = useState('');
  const [observacaoProposta, setObservacaoProposta] = useState('');
  const [precosItens, setPrecosItens] = useState<PrecoItemFormulario[]>([]);

  const cotacaoSelecionada = useMemo(
    () =>
      cotacoes.find(cotacao => cotacao.id === cotacaoSelecionadaId) ||
      null,
    [cotacoes, cotacaoSelecionadaId]
  );

  const processosDisponiveis = useMemo(() => {
    const statusBloqueados = new Set([
      'finalizado',
      'finalizada',
      'cancelado',
      'cancelada',
      'reprovado',
      'reprovada',
    ]);

    return processos
      .filter(processo => {
        const id = obterIdProcesso(processo);
        const status = normalizarTexto(processo.status);

        return Boolean(id) && !statusBloqueados.has(status);
      })
      .sort((a, b) =>
        obterIdProcesso(a).localeCompare(
          obterIdProcesso(b),
          'pt-BR',
          { numeric: true }
        )
      );
  }, [processos]);

  const carregarCotacoes = async () => {
    try {
      setLoading(true);

      const lista = await quotationService.listarCotacoes();

      setCotacoes(lista);

      if (
        cotacaoSelecionadaId &&
        !lista.some(cotacao => cotacao.id === cotacaoSelecionadaId)
      ) {
        setCotacaoSelecionadaId(null);
      }
    } catch (error: any) {
      console.error('Erro ao carregar cotações:', error);
      alert(error.message || 'Erro ao carregar cotações.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarCotacoes();
  }, []);

  const cotacoesExibidas = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    if (!termo) return cotacoes;

    return cotacoes.filter(cotacao => {
      const processo = processos.find(
        item => item.dbId === cotacao.processoId
      );

      return (
        cotacao.titulo.toLowerCase().includes(termo) ||
        cotacao.status.toLowerCase().includes(termo) ||
        processo?.id.toLowerCase().includes(termo) ||
        processo?.descricao.toLowerCase().includes(termo)
      );
    });
  }, [cotacoes, busca, processos]);

  const totalAbertas = cotacoes.filter(
    cotacao =>
      cotacao.status === 'aberta' ||
      cotacao.status === 'em_analise'
  ).length;

  const totalFinalizadas = cotacoes.filter(
    cotacao => cotacao.status === 'finalizada'
  ).length;

  const totalPropostas = cotacoes.reduce(
    (total, cotacao) => total + cotacao.propostas.length,
    0
  );

  const limparNovaCotacao = () => {
    setProcessoId('');
    setTitulo('');
    setObservacao('');
    setItensFormulario([
      {
        idLocal: criarIdLocal(),
        descricao: '',
        quantidade: '1',
        unidade: 'UN',
        especificacao: '',
      },
    ]);
  };

  const abrirNovaCotacao = () => {
    limparNovaCotacao();
    setModalNovaCotacao(true);
  };

  const fecharNovaCotacao = () => {
    if (salvandoCotacao) return;

    setModalNovaCotacao(false);
    limparNovaCotacao();
  };

  const selecionarProcesso = (id: string) => {
    setProcessoId(id);

    const processo = processos.find(
      item =>
        String(item.id) === id ||
        String(item.dbId ?? '') === id
    );

    if (!processo) {
      setTitulo('');
      return;
    }

    const codigoProcesso = obterIdProcesso(processo);
    const descricaoProcesso =
      obterDescricaoProcesso(processo);

    setTitulo(
      `Cotação ${codigoProcesso} — ${descricaoProcesso}`
    );

    setItensFormulario([
      {
        idLocal: criarIdLocal(),
        descricao: descricaoProcesso,
        quantidade: '1',
        unidade: 'UN',
        especificacao: '',
      },
    ]);
  };

  const adicionarItemFormulario = () => {
    setItensFormulario(prev => [
      ...prev,
      {
        idLocal: criarIdLocal(),
        descricao: '',
        quantidade: '1',
        unidade: 'UN',
        especificacao: '',
      },
    ]);
  };

  const atualizarItemFormulario = (
    idLocal: string,
    campo: keyof Omit<ItemFormulario, 'idLocal'>,
    valor: string
  ) => {
    setItensFormulario(prev =>
      prev.map(item =>
        item.idLocal === idLocal
          ? {
              ...item,
              [campo]: valor,
            }
          : item
      )
    );
  };

  const removerItemFormulario = (idLocal: string) => {
    setItensFormulario(prev => {
      if (prev.length === 1) {
        return prev;
      }

      return prev.filter(item => item.idLocal !== idLocal);
    });
  };

  const salvarNovaCotacao = async (e: React.FormEvent) => {
    e.preventDefault();

    const processo = processos.find(
      item =>
        String(item.id) === processoId ||
        String(item.dbId ?? '') === processoId
    );

    if (!processo) {
      alert('Selecione um processo válido.');
      return;
    }

    if (!processo.dbId) {
      alert('Este processo não possui ID interno do banco.');
      return;
    }

    if (!titulo.trim()) {
      alert('Informe o título da cotação.');
      return;
    }

    const itensValidos = itensFormulario
      .filter(item => item.descricao.trim())
      .map(item => ({
        descricao: item.descricao.trim(),
        quantidade: numeroSeguro(item.quantidade),
        unidade: item.unidade.trim() || 'UN',
        especificacao: item.especificacao.trim(),
      }));

    if (!itensValidos.length) {
      alert('Adicione pelo menos um item à cotação.');
      return;
    }

    if (
      itensValidos.some(
        item => !item.quantidade || item.quantidade <= 0
      )
    ) {
      alert('Informe quantidades válidas para todos os itens.');
      return;
    }

    try {
      setSalvandoCotacao(true);

      const criada = await quotationService.criarCotacao({
        processoDbId: processo.dbId,
        titulo: titulo.trim(),
        observacao: observacao.trim(),
        criadoPor: nomeUsuario,
        itens: itensValidos,
      });

      const statusAtual = normalizarTexto(processo.status);

      if (
        statusAtual === 'solicitacao' ||
        statusAtual === 'solicitacao de compra' ||
        statusAtual === 'central'
      ) {
        await editarProcesso(processo.id, {
          status: 'cotacao',
        });
      }

      setCotacoes(prev => [criada, ...prev]);
      setCotacaoSelecionadaId(criada.id);

      fecharNovaCotacao();
    } catch (error: any) {
      console.error('Erro ao criar cotação:', error);
      alert(error.message || 'Erro ao criar cotação.');
    } finally {
      setSalvandoCotacao(false);
    }
  };

  const abrirNovaProposta = () => {
    if (!cotacaoSelecionada) return;

    setFornecedorPropostaId('');
    setPrazoEntregaDias('');
    setCondicaoPagamento('');
    setFrete('');
    setDesconto('');
    setObservacaoProposta('');

    setPrecosItens(
      cotacaoSelecionada.itens.map(item => ({
        cotacaoItemId: item.id,
        valorUnitario: '',
        marca: '',
        observacao: '',
      }))
    );

    setModalProposta(true);
  };

  const fecharNovaProposta = () => {
    if (salvandoProposta) return;
    setModalProposta(false);
  };

  const atualizarPrecoItem = (
    cotacaoItemId: string,
    campo: keyof Omit<PrecoItemFormulario, 'cotacaoItemId'>,
    valor: string
  ) => {
    setPrecosItens(prev =>
      prev.map(item =>
        item.cotacaoItemId === cotacaoItemId
          ? {
              ...item,
              [campo]: valor,
            }
          : item
      )
    );
  };

  const salvarProposta = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!cotacaoSelecionada) return;

    if (!fornecedorPropostaId) {
      alert('Selecione o fornecedor.');
      return;
    }

    const fornecedorJaParticipa =
      cotacaoSelecionada.propostas.some(
        proposta =>
          proposta.fornecedorId === fornecedorPropostaId
      );

    if (fornecedorJaParticipa) {
      alert(
        'Este fornecedor já possui uma proposta cadastrada nesta cotação.'
      );
      return;
    }

    const itensProposta = precosItens.map(item => ({
      cotacaoItemId: item.cotacaoItemId,
      valorUnitario: numeroSeguro(item.valorUnitario),
      marca: item.marca.trim(),
      observacao: item.observacao.trim(),
    }));

    if (
      itensProposta.some(item => item.valorUnitario <= 0)
    ) {
      alert('Informe o preço unitário de todos os itens.');
      return;
    }

    try {
      setSalvandoProposta(true);

      await quotationService.salvarProposta({
        cotacaoId: cotacaoSelecionada.id,
        fornecedorId: fornecedorPropostaId,
        prazoEntregaDias: prazoEntregaDias
          ? numeroSeguro(prazoEntregaDias)
          : null,
        condicaoPagamento:
          condicaoPagamento.trim() || null,
        frete: numeroSeguro(frete),
        desconto: numeroSeguro(desconto),
        observacao: observacaoProposta.trim() || null,
        itens: itensProposta,
      });

      const atualizada =
        await quotationService.buscarCotacaoPorId(
          cotacaoSelecionada.id
        );

      setCotacoes(prev =>
        prev.map(cotacao =>
          cotacao.id === atualizada.id
            ? atualizada
            : cotacao
        )
      );

      fecharNovaProposta();
    } catch (error: any) {
      console.error('Erro ao salvar proposta:', error);
      alert(error.message || 'Erro ao salvar proposta.');
    } finally {
      setSalvandoProposta(false);
    }
  };

  const excluirCotacao = async (cotacao: Cotacao) => {
    const confirmou = window.confirm(
      `Deseja excluir a cotação "${cotacao.titulo}"?`
    );

    if (!confirmou) return;

    try {
      await quotationService.excluirCotacao(cotacao.id);

      setCotacoes(prev =>
        prev.filter(item => item.id !== cotacao.id)
      );

      if (cotacaoSelecionadaId === cotacao.id) {
        setCotacaoSelecionadaId(null);
      }
    } catch (error: any) {
      alert(error.message || 'Erro ao excluir cotação.');
    }
  };

  const excluirProposta = async (
    proposta: CotacaoProposta
  ) => {
    if (!cotacaoSelecionada) return;

    const fornecedor = fornecedores.find(
      item => item.id === proposta.fornecedorId
    );

    const confirmou = window.confirm(
      `Deseja excluir a proposta de ${
        fornecedor?.nome || 'este fornecedor'
      }?`
    );

    if (!confirmou) return;

    try {
      await quotationService.excluirProposta(proposta.id);

      const atualizada =
        await quotationService.buscarCotacaoPorId(
          cotacaoSelecionada.id
        );

      setCotacoes(prev =>
        prev.map(cotacao =>
          cotacao.id === atualizada.id
            ? atualizada
            : cotacao
        )
      );
    } catch (error: any) {
      alert(error.message || 'Erro ao excluir proposta.');
    }
  };

  const selecionarProposta = async (
    proposta: CotacaoProposta
  ) => {
    if (!cotacaoSelecionada) return;

    const fornecedor = fornecedores.find(
      item => item.id === proposta.fornecedorId
    );

    const total =
      quotationService.calcularTotalProposta(proposta);

    const confirmou = window.confirm(
      `Selecionar a proposta de ${
        fornecedor?.nome || 'este fornecedor'
      } no valor de ${formatarReal(total)}?`
    );

    if (!confirmou) return;

    try {
      const atualizada =
        await quotationService.selecionarProposta(
          cotacaoSelecionada.id,
          proposta.id,
          proposta.fornecedorId
        );

      setCotacoes(prev =>
        prev.map(cotacao =>
          cotacao.id === atualizada.id
            ? atualizada
            : cotacao
        )
      );

      const processo = processos.find(
        item => item.dbId === atualizada.processoId
      );

      if (processo) {
        await editarProcesso(processo.id, {
          fornecedorId: proposta.fornecedorId,
          valor: total,
          status: 'conferencia',
        });
      }

      alert(
        'Proposta vencedora selecionada e processo encaminhado para conferência.'
      );
    } catch (error: any) {
      console.error(
        'Erro ao selecionar proposta:',
        error
      );
      alert(
        error.message ||
          'Erro ao selecionar proposta vencedora.'
      );
    }
  };

  const melhorProposta = cotacaoSelecionada
    ? quotationService.obterMelhorPreco(
        cotacaoSelecionada.propostas
      )
    : null;

  if (cotacaoSelecionada) {
    const processo = processos.find(
      item => item.dbId === cotacaoSelecionada.processoId
    );

    return (
      <div className="space-y-8">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={() => setCotacaoSelecionadaId(null)}
              className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center hover:bg-slate-50"
            >
              <ArrowLeft className="w-4 h-4 text-slate-500" />
            </button>

            <div>
              <h1 className="text-2xl font-bold text-[#0F172A]">
                {cotacaoSelecionada.titulo}
              </h1>

              <p className="text-xs text-slate-400 mt-1">
                Processo {processo?.id || '-'} •{' '}
                {cotacaoSelecionada.itens.length} item(ns) •{' '}
                {cotacaoSelecionada.propostas.length}{' '}
                proposta(s)
              </p>
            </div>
          </div>

          {cotacaoSelecionada.status !== 'finalizada' && (
            <button
              type="button"
              onClick={abrirNovaProposta}
              className="px-4 py-2.5 rounded-[12px] bg-[#0F172A] text-white hover:bg-[#1E293B] font-bold text-xs flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Cadastrar proposta
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Indicador
            titulo="Status"
            valor={cotacaoSelecionada.status.replace(
              '_',
              ' '
            )}
            icon={ClipboardList}
          />

          <Indicador
            titulo="Itens"
            valor={String(
              cotacaoSelecionada.itens.length
            )}
            icon={Package}
          />

          <Indicador
            titulo="Fornecedores"
            valor={String(
              cotacaoSelecionada.propostas.length
            )}
            icon={Building2}
          />

          <Indicador
            titulo="Melhor preço"
            valor={
              melhorProposta
                ? formatarReal(
                    quotationService.calcularTotalProposta(
                      melhorProposta
                    )
                  )
                : '-'
            }
            icon={Trophy}
            destaque
          />
        </div>

        <div className="bg-white rounded-[18px] border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100">
            <h2 className="text-sm font-bold text-[#0F172A]">
              Itens solicitados
            </h2>

            <p className="text-[11px] text-slate-400 mt-1">
              Relação dos produtos e serviços considerados
              na comparação.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50/80">
                <tr className="text-[10px] uppercase tracking-wide text-slate-400">
                  <th className="px-5 py-3">Descrição</th>
                  <th className="px-5 py-3">Especificação</th>
                  <th className="px-5 py-3">Quantidade</th>
                  <th className="px-5 py-3">Unidade</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-50">
                {cotacaoSelecionada.itens.map(item => (
                  <tr key={item.id}>
                    <td className="px-5 py-4 text-xs font-bold text-slate-800">
                      {item.descricao}
                    </td>

                    <td className="px-5 py-4 text-xs text-slate-500">
                      {item.especificacao || '-'}
                    </td>

                    <td className="px-5 py-4 text-xs font-mono text-slate-700">
                      {item.quantidade}
                    </td>

                    <td className="px-5 py-4 text-xs text-slate-500">
                      {item.unidade}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <h2 className="text-sm font-bold text-[#0F172A]">
              Comparação de fornecedores
            </h2>

            <p className="text-[11px] text-slate-400 mt-1">
              Compare preço total, prazo, frete e condição
              de pagamento.
            </p>
          </div>

          {cotacaoSelecionada.propostas.length === 0 ? (
            <div className="bg-white rounded-[18px] border border-slate-100 p-10 text-center">
              <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto" />

              <h3 className="text-sm font-bold text-slate-800 mt-3">
                Nenhuma proposta cadastrada
              </h3>

              <p className="text-xs text-slate-400 mt-1">
                Cadastre os preços informados pelos
                fornecedores para iniciar a comparação.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
              {cotacaoSelecionada.propostas.map(
                proposta => {
                  const fornecedor = fornecedores.find(
                    item =>
                      item.id === proposta.fornecedorId
                  );

                  const total =
                    quotationService.calcularTotalProposta(
                      proposta
                    );

                  const menorPreco =
                    melhorProposta?.id === proposta.id;

                  return (
                    <div
                      key={proposta.id}
                      className={`bg-white rounded-[18px] border p-5 shadow-sm ${
                        proposta.selecionada
                          ? 'border-emerald-300 ring-2 ring-emerald-100'
                          : menorPreco
                            ? 'border-amber-300'
                            : 'border-slate-100'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-[#0F172A]">
                              {fornecedor?.nome ||
                                'Fornecedor não encontrado'}
                            </h3>

                            {menorPreco && (
                              <span className="px-2 py-1 rounded-full bg-amber-50 text-amber-600 text-[9px] font-bold">
                                MENOR PREÇO
                              </span>
                            )}

                            {proposta.selecionada && (
                              <span className="px-2 py-1 rounded-full bg-emerald-50 text-emerald-600 text-[9px] font-bold">
                                VENCEDORA
                              </span>
                            )}
                          </div>

                          <p className="text-[10px] text-slate-400 mt-1">
                            {fornecedor?.cnpj || '-'}
                          </p>
                        </div>

                        {!proposta.selecionada &&
                          cotacaoSelecionada.status !==
                            'finalizada' && (
                            <button
                              type="button"
                              onClick={() =>
                                excluirProposta(proposta)
                              }
                              className="w-8 h-8 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-red-500" />
                            </button>
                          )}
                      </div>

                      <div className="grid grid-cols-2 gap-3 mt-5">
                        <Metrica
                          titulo="Subtotal"
                          valor={formatarReal(
                            proposta.itens.reduce(
                              (sum, item) =>
                                sum +
                                numeroSeguro(
                                  item.valorTotal
                                ),
                              0
                            )
                          )}
                        />

                        <Metrica
                          titulo="Frete"
                          valor={formatarReal(
                            proposta.frete
                          )}
                        />

                        <Metrica
                          titulo="Desconto"
                          valor={formatarReal(
                            proposta.desconto
                          )}
                        />

                        <Metrica
                          titulo="Total"
                          valor={formatarReal(total)}
                          destaque
                        />

                        <Metrica
                          titulo="Prazo"
                          valor={
                            proposta.prazoEntregaDias
                              ? `${proposta.prazoEntregaDias} dias`
                              : '-'
                          }
                        />

                        <Metrica
                          titulo="Pagamento"
                          valor={
                            proposta.condicaoPagamento ||
                            '-'
                          }
                        />
                      </div>

                      <div className="mt-5 border-t border-slate-100 pt-4 space-y-2">
                        {cotacaoSelecionada.itens.map(
                          itemCotacao => {
                            const itemProposta =
                              proposta.itens.find(
                                item =>
                                  item.cotacaoItemId ===
                                  itemCotacao.id
                              );

                            return (
                              <div
                                key={itemCotacao.id}
                                className="flex items-center justify-between gap-4 text-xs"
                              >
                                <div>
                                  <p className="font-semibold text-slate-700">
                                    {
                                      itemCotacao.descricao
                                    }
                                  </p>

                                  <p className="text-[10px] text-slate-400">
                                    {itemProposta?.marca ||
                                      'Sem marca informada'}
                                  </p>
                                </div>

                                <div className="text-right">
                                  <p className="font-bold font-mono text-[#0F172A]">
                                    {formatarReal(
                                      itemProposta?.valorUnitario ||
                                        0
                                    )}
                                  </p>

                                  <p className="text-[10px] text-slate-400">
                                    Total:{' '}
                                    {formatarReal(
                                      itemProposta?.valorTotal ||
                                        0
                                    )}
                                  </p>
                                </div>
                              </div>
                            );
                          }
                        )}
                      </div>

                      {!proposta.selecionada &&
                        cotacaoSelecionada.status !==
                          'finalizada' && (
                          <button
                            type="button"
                            onClick={() =>
                              selecionarProposta(proposta)
                            }
                            className={`w-full mt-5 py-3 rounded-[12px] text-xs font-bold flex items-center justify-center gap-2 ${
                              menorPreco
                                ? 'bg-amber-500 text-white hover:bg-amber-600'
                                : 'bg-[#0F172A] text-white hover:bg-[#1E293B]'
                            }`}
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            Selecionar proposta
                          </button>
                        )}
                    </div>
                  );
                }
              )}
            </div>
          )}
        </div>

        {modalProposta && (
          <>
            <div
              className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs z-50"
              onClick={fecharNovaProposta}
            />

            <div className="fixed inset-y-0 right-0 max-w-2xl w-full bg-white shadow-2xl z-50 flex flex-col h-screen border-l border-slate-100">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div>
                  <h2 className="text-sm font-bold text-[#0F172A]">
                    Cadastrar proposta
                  </h2>

                  <p className="text-[10px] text-slate-400 mt-1">
                    Registre os preços e condições
                    apresentados pelo fornecedor.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={fecharNovaProposta}
                  className="w-8 h-8 rounded-full bg-white border border-slate-100 flex items-center justify-center"
                >
                  <X className="w-4 h-4 text-slate-400" />
                </button>
              </div>

              <form
                onSubmit={salvarProposta}
                className="flex-1 overflow-y-auto p-6 space-y-6"
              >
                <CampoSelect
                  label="Fornecedor"
                  value={fornecedorPropostaId}
                  onChange={setFornecedorPropostaId}
                  options={fornecedores.map(fornecedor => ({
                    value: fornecedor.id,
                    label: fornecedor.nome,
                  }))}
                  placeholder="Selecione o fornecedor"
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <CampoInput
                    label="Prazo de entrega em dias"
                    type="number"
                    value={prazoEntregaDias}
                    onChange={setPrazoEntregaDias}
                  />

                  <CampoInput
                    label="Condição de pagamento"
                    value={condicaoPagamento}
                    onChange={setCondicaoPagamento}
                    placeholder="Ex.: 28 dias"
                  />

                  <CampoInput
                    label="Frete"
                    type="number"
                    step="0.01"
                    value={frete}
                    onChange={setFrete}
                  />

                  <CampoInput
                    label="Desconto"
                    type="number"
                    step="0.01"
                    value={desconto}
                    onChange={setDesconto}
                  />
                </div>

                <div className="space-y-4">
                  <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
                    Preços por item
                  </h3>

                  {cotacaoSelecionada.itens.map(
                    itemCotacao => {
                      const preco = precosItens.find(
                        item =>
                          item.cotacaoItemId ===
                          itemCotacao.id
                      );

                      return (
                        <div
                          key={itemCotacao.id}
                          className="border border-slate-100 rounded-[16px] p-4 space-y-4"
                        >
                          <div>
                            <h4 className="text-xs font-bold text-slate-800">
                              {itemCotacao.descricao}
                            </h4>

                            <p className="text-[10px] text-slate-400 mt-1">
                              {itemCotacao.quantidade}{' '}
                              {itemCotacao.unidade}
                            </p>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <CampoInput
                              label="Preço unitário"
                              type="number"
                              step="0.01"
                              value={
                                preco?.valorUnitario || ''
                              }
                              onChange={valor =>
                                atualizarPrecoItem(
                                  itemCotacao.id,
                                  'valorUnitario',
                                  valor
                                )
                              }
                            />

                            <CampoInput
                              label="Marca"
                              value={preco?.marca || ''}
                              onChange={valor =>
                                atualizarPrecoItem(
                                  itemCotacao.id,
                                  'marca',
                                  valor
                                )
                              }
                            />
                          </div>

                          <CampoInput
                            label="Observação do item"
                            value={
                              preco?.observacao || ''
                            }
                            onChange={valor =>
                              atualizarPrecoItem(
                                itemCotacao.id,
                                'observacao',
                                valor
                              )
                            }
                          />
                        </div>
                      );
                    }
                  )}
                </div>

                <CampoTextarea
                  label="Observação geral da proposta"
                  value={observacaoProposta}
                  onChange={setObservacaoProposta}
                />

                <button
                  type="submit"
                  disabled={salvandoProposta}
                  className="w-full py-3 rounded-[12px] bg-[#0F172A] text-white font-bold text-xs flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  <Save className="w-4 h-4" />
                  {salvandoProposta
                    ? 'Salvando...'
                    : 'Salvar proposta'}
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A]">
            Central de Cotações
          </h1>

          <p className="text-xs text-slate-400 mt-1">
            Compare preços, prazos e condições comerciais
            entre fornecedores.
          </p>
        </div>

        <button
          type="button"
          onClick={abrirNovaCotacao}
          className="px-4 py-2.5 rounded-[12px] bg-[#0F172A] text-white hover:bg-[#1E293B] font-bold text-xs flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Nova cotação
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Indicador
          titulo="Total"
          valor={String(cotacoes.length)}
          icon={ClipboardList}
        />

        <Indicador
          titulo="Em andamento"
          valor={String(totalAbertas)}
          icon={CalendarDays}
        />

        <Indicador
          titulo="Finalizadas"
          valor={String(totalFinalizadas)}
          icon={CheckCircle2}
          destaque
        />

        <Indicador
          titulo="Propostas recebidas"
          valor={String(totalPropostas)}
          icon={DollarSign}
        />
      </div>

      <div className="max-w-md bg-white border border-slate-100 rounded-[14px] px-4 py-2.5 shadow-sm flex items-center gap-2">
        <Search className="w-4 h-4 text-slate-400" />

        <input
          value={busca}
          onChange={e => setBusca(e.target.value)}
          placeholder="Pesquisar cotação ou processo..."
          className="w-full bg-transparent border-0 focus:ring-0 text-xs text-slate-600"
        />
      </div>

      {loading ? (
        <div className="bg-white rounded-[18px] border border-slate-100 p-10 text-center text-xs text-slate-400">
          Carregando cotações...
        </div>
      ) : cotacoesExibidas.length === 0 ? (
        <div className="bg-white rounded-[18px] border border-slate-100 p-10 text-center">
          <ClipboardList className="w-9 h-9 text-slate-300 mx-auto" />

          <h3 className="text-sm font-bold text-slate-800 mt-3">
            Nenhuma cotação cadastrada
          </h3>

          <p className="text-xs text-slate-400 mt-1">
            Crie uma cotação a partir de uma solicitação
            registrada.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          {cotacoesExibidas.map(cotacao => {
            const processo = processos.find(
              item => item.dbId === cotacao.processoId
            );

            const melhor =
              quotationService.obterMelhorPreco(
                cotacao.propostas
              );

            return (
              <div
                key={cotacao.id}
                className="bg-white rounded-[18px] border border-slate-100 p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <button
                    type="button"
                    onClick={() =>
                      setCotacaoSelecionadaId(cotacao.id)
                    }
                    className="text-left flex-1"
                  >
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-[#0F172A]">
                        {cotacao.titulo}
                      </h3>

                      <StatusCotacao
                        status={cotacao.status}
                      />
                    </div>

                    <p className="text-[10px] text-slate-400 mt-1">
                      Processo {processo?.id || '-'}
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      excluirCotacao(cotacao)
                    }
                    className="w-8 h-8 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-500" />
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-3 mt-5">
                  <Metrica
                    titulo="Itens"
                    valor={String(cotacao.itens.length)}
                  />

                  <Metrica
                    titulo="Propostas"
                    valor={String(
                      cotacao.propostas.length
                    )}
                  />

                  <Metrica
                    titulo="Melhor preço"
                    valor={
                      melhor
                        ? formatarReal(
                            quotationService.calcularTotalProposta(
                              melhor
                            )
                          )
                        : '-'
                    }
                    destaque
                  />
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setCotacaoSelecionadaId(cotacao.id)
                  }
                  className="w-full mt-5 py-2.5 rounded-[12px] bg-slate-50 hover:bg-slate-100 text-[#0F172A] font-bold text-xs"
                >
                  Abrir comparação
                </button>
              </div>
            );
          })}
        </div>
      )}

      {modalNovaCotacao && (
        <>
          <div
            className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs z-50"
            onClick={fecharNovaCotacao}
          />

          <div className="fixed inset-y-0 right-0 max-w-2xl w-full bg-white shadow-2xl z-50 flex flex-col h-screen border-l border-slate-100">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h2 className="text-sm font-bold text-[#0F172A]">
                  Nova cotação
                </h2>

                <p className="text-[10px] text-slate-400 mt-1">
                  Vincule a cotação a um processo e informe
                  os itens.
                </p>
              </div>

              <button
                type="button"
                onClick={fecharNovaCotacao}
                className="w-8 h-8 rounded-full bg-white border border-slate-100 flex items-center justify-center"
              >
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <form
              onSubmit={salvarNovaCotacao}
              className="flex-1 overflow-y-auto p-6 space-y-6"
            >
              <CampoSelect
                label="Processo de compra"
                value={processoId}
                onChange={selecionarProcesso}
                options={processosDisponiveis.map(
                  processo => ({
                    value: obterIdProcesso(processo),
                    label: `${obterIdProcesso(
                      processo
                    )} — ${obterDescricaoProcesso(
                      processo
                    )}`,
                  })
                )}
                placeholder="Selecione o processo"
              />

              {processosDisponiveis.length === 0 && (
                <div className="rounded-[12px] border border-amber-200 bg-amber-50 px-4 py-3">
                  <p className="text-xs font-semibold text-amber-700">
                    Nenhum processo disponível para cotação.
                  </p>
                  <p className="mt-1 text-[10px] text-amber-600">
                    Cadastre uma solicitação de compra ou verifique
                    se os processos foram carregados no FinanceContext.
                  </p>
                </div>
              )}

              <CampoInput
                label="Título da cotação"
                value={titulo}
                onChange={setTitulo}
              />

              <CampoTextarea
                label="Observação"
                value={observacao}
                onChange={setObservacao}
              />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
                    Itens da cotação
                  </h3>

                  <button
                    type="button"
                    onClick={adicionarItemFormulario}
                    className="px-3 py-2 rounded-[10px] bg-slate-100 text-slate-700 text-[10px] font-bold flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Adicionar item
                  </button>
                </div>

                {itensFormulario.map(
                  (item, index) => (
                    <div
                      key={item.idLocal}
                      className="border border-slate-100 rounded-[16px] p-4 space-y-4"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700">
                          Item {index + 1}
                        </span>

                        {itensFormulario.length > 1 && (
                          <button
                            type="button"
                            onClick={() =>
                              removerItemFormulario(
                                item.idLocal
                              )
                            }
                            className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-500" />
                          </button>
                        )}
                      </div>

                      <CampoInput
                        label="Descrição"
                        value={item.descricao}
                        onChange={valor =>
                          atualizarItemFormulario(
                            item.idLocal,
                            'descricao',
                            valor
                          )
                        }
                      />

                      <div className="grid grid-cols-2 gap-3">
                        <CampoInput
                          label="Quantidade"
                          type="number"
                          step="0.01"
                          value={item.quantidade}
                          onChange={valor =>
                            atualizarItemFormulario(
                              item.idLocal,
                              'quantidade',
                              valor
                            )
                          }
                        />

                        <CampoInput
                          label="Unidade"
                          value={item.unidade}
                          onChange={valor =>
                            atualizarItemFormulario(
                              item.idLocal,
                              'unidade',
                              valor
                            )
                          }
                        />
                      </div>

                      <CampoInput
                        label="Especificação"
                        value={item.especificacao}
                        onChange={valor =>
                          atualizarItemFormulario(
                            item.idLocal,
                            'especificacao',
                            valor
                          )
                        }
                      />
                    </div>
                  )
                )}
              </div>

              <button
                type="submit"
                disabled={
                  salvandoCotacao ||
                  processosDisponiveis.length === 0
                }
                className="w-full py-3 rounded-[12px] bg-[#0F172A] text-white font-bold text-xs flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Save className="w-4 h-4" />
                {salvandoCotacao
                  ? 'Criando...'
                  : 'Criar cotação'}
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
};

const Indicador = ({
  titulo,
  valor,
  icon: Icon,
  destaque,
}: any) => (
  <div className="bg-white rounded-[18px] border border-slate-100 p-5 shadow-sm">
    <div
      className={`w-10 h-10 rounded-xl flex items-center justify-center ${
        destaque ? 'bg-emerald-50' : 'bg-slate-100'
      }`}
    >
      <Icon
        className={`w-5 h-5 ${
          destaque
            ? 'text-emerald-600'
            : 'text-[#0F172A]'
        }`}
      />
    </div>

    <span className="text-[10px] uppercase font-bold text-slate-400 block mt-4">
      {titulo}
    </span>

    <p className="text-lg font-bold text-[#0F172A] mt-1 font-mono">
      {valor}
    </p>
  </div>
);

const Metrica = ({
  titulo,
  valor,
  destaque,
}: {
  titulo: string;
  valor: string;
  destaque?: boolean;
}) => (
  <div className="bg-slate-50 rounded-[12px] p-3">
    <span className="text-[9px] text-slate-400 uppercase font-bold">
      {titulo}
    </span>

    <p
      className={`text-xs font-bold mt-1 ${
        destaque
          ? 'text-emerald-600'
          : 'text-[#0F172A]'
      }`}
    >
      {valor}
    </p>
  </div>
);

const StatusCotacao = ({
  status,
}: {
  status: string;
}) => {
  const classes =
    status === 'finalizada'
      ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
      : status === 'cancelada'
        ? 'bg-red-50 text-red-600 border-red-100'
        : 'bg-amber-50 text-amber-600 border-amber-100';

  return (
    <span
      className={`px-2 py-1 rounded-full border text-[9px] font-bold uppercase ${classes}`}
    >
      {status.replace('_', ' ')}
    </span>
  );
};

const CampoInput = ({
  label,
  value,
  onChange,
  type = 'text',
  step,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (valor: string) => void;
  type?: string;
  step?: string;
  placeholder?: string;
}) => (
  <div className="space-y-1.5">
    <label className="text-[10px] font-bold text-slate-400 uppercase block">
      {label}
    </label>

    <input
      type={type}
      step={step}
      value={value}
      placeholder={placeholder}
      onChange={e => onChange(e.target.value)}
      className="w-full bg-slate-50 border-0 focus:ring-1 focus:ring-[#0F172A]/25 rounded-[12px] px-3.5 py-2.5 text-xs text-slate-700"
    />
  </div>
);

const CampoTextarea = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (valor: string) => void;
}) => (
  <div className="space-y-1.5">
    <label className="text-[10px] font-bold text-slate-400 uppercase block">
      {label}
    </label>

    <textarea
      rows={3}
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full bg-slate-50 border-0 focus:ring-1 focus:ring-[#0F172A]/25 rounded-[12px] px-3.5 py-2.5 text-xs text-slate-700"
    />
  </div>
);

const CampoSelect = ({
  label,
  value,
  onChange,
  options,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (valor: string) => void;
  options: Array<{
    value: string;
    label: string;
  }>;
  placeholder: string;
}) => (
  <div className="space-y-1.5">
    <label className="text-[10px] font-bold text-slate-400 uppercase block">
      {label}
    </label>

    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full bg-slate-50 border-0 focus:ring-1 focus:ring-[#0F172A]/25 rounded-[12px] px-3.5 py-2.5 text-xs text-slate-700"
    >
      <option value="">{placeholder}</option>

      {options.map(option => (
        <option
          key={option.value}
          value={option.value}
        >
          {option.label}
        </option>
      ))}
    </select>
  </div>
);

export default QuotationsView;