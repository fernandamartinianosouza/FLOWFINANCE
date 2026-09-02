import React, { useEffect, useMemo, useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../context/PermissionsContext';
import { formatarReal } from '../utils';
import {
  Cotacao,
  CotacaoProposta,
  FornecedorCatalogoCotacao,
  ItemCatalogoCotacao,
  quotationService,
} from '../services/quotationService';
import { SolicitacaoEstoque, estoqueService } from '../services/estoqueService';
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardList,
  Download,
  Package,
  Plus,
  Save,
  Search,
  ShoppingCart,
  Trash2,
  X,
  Warehouse,
  ArrowRight,
} from 'lucide-react';

interface ItemRascunho {
  idLocal: string;
  itemCatalogoId: string;
  quantidade: string;
  especificacao: string;
}

interface PrecoItem {
  cotacaoItemId: string;
  valorUnitario: string;
  marca: string;
}

const criarId = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const numeroSeguro = (valor: unknown) => {
  const numero = Number(valor ?? 0);
  return Number.isFinite(numero) ? numero : 0;
};

const normalizar = (valor: unknown) =>
  String(valor ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();

const novoItem = (): ItemRascunho => ({
  idLocal: criarId(),
  itemCatalogoId: '',
  quantidade: '1',
  especificacao: '',
});

export const QuotationsView: React.FC = () => {
  const finance = useFinance() as any;
  const { fornecedores = [], empresas = [], organizacaoAtivaId, empresaAtivaId } = finance;
  const { nomeUsuario } = useAuth();
  const { temPermissao } = usePermissions();

  const [catalogo, setCatalogo] = useState<
    ItemCatalogoCotacao[]
  >([]);
  const [cotacoes, setCotacoes] = useState<Cotacao[]>([]);
  const [solicitacoesEstoque, setSolicitacoesEstoque] = useState<SolicitacaoEstoque[]>([]);
  const [convertendoSolicitacaoId, setConvertendoSolicitacaoId] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState('');
  const [selecionadaId, setSelecionadaId] =
    useState<string | null>(null);

  const [modalNova, setModalNova] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [observacao, setObservacao] = useState('');
  const [itens, setItens] = useState<ItemRascunho[]>([
    novoItem(),
  ]);
  const [salvando, setSalvando] = useState(false);

  const [modalFornecedor, setModalFornecedor] =
    useState(false);
  const [
    fornecedoresDisponiveis,
    setFornecedoresDisponiveis,
  ] = useState<FornecedorCatalogoCotacao[]>([]);
  const [fornecedorId, setFornecedorId] = useState('');
  const [prazo, setPrazo] = useState('');
  const [faturamento, setFaturamento] = useState('');
  const [tipoFrete, setTipoFrete] = useState('');
  const [frete, setFrete] = useState('');
  const [desconto, setDesconto] = useState('');
  const [precos, setPrecos] = useState<PrecoItem[]>([]);
  const [salvandoProposta, setSalvandoProposta] =
    useState(false);
  const [gerandoSolicitacao, setGerandoSolicitacao] =
    useState(false);

  const [
    importandoFornecedores,
    setImportandoFornecedores,
  ] = useState(false);

  const cotacao = useMemo(
    () =>
      cotacoes.find(item => item.id === selecionadaId) ||
      null,
    [cotacoes, selecionadaId]
  );

  const melhor = cotacao
    ? quotationService.obterMelhorPreco(
        cotacao.propostas
      )
    : null;

  const carregar = async () => {
    try {
      setCarregando(true);

      if (!organizacaoAtivaId || !empresaAtivaId) {
        setCatalogo([]);
        setCotacoes([]);
        setSolicitacoesEstoque([]);
        setSelecionadaId(null);
        return;
      }

      const [listaCatalogo, listaCotacoes, listaSolicitacoesEstoque] =
        await Promise.all([
          quotationService.listarItensCatalogo(organizacaoAtivaId, empresaAtivaId),
          quotationService.listarCotacoes(organizacaoAtivaId, empresaAtivaId),
          estoqueService.listarSolicitacoes(organizacaoAtivaId, empresaAtivaId, 'pendente'),
        ]);

      setCatalogo(listaCatalogo);
      setCotacoes(listaCotacoes);
      setSolicitacoesEstoque(listaSolicitacoesEstoque);
    } catch (error: any) {
      console.error(error);
      alert(
        error.message ||
          'Não foi possível carregar as cotações.'
      );
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    setSelecionadaId(null);
    setModalNova(false);
    carregar();
  }, [organizacaoAtivaId, empresaAtivaId]);

  useEffect(() => {
    if (
      !cotacao ||
      cotacao.propostas.length > 0 ||
      importandoFornecedores
    ) {
      return;
    }

    carregarFornecedoresAutomaticamente();
  }, [cotacao?.id]);

  const transformarSolicitacaoEstoqueEmCotacao = async (solicitacao: SolicitacaoEstoque) => {
    if (!temPermissao('compras', 'criar')) {
      alert('Você não tem permissão para criar cotações.');
      return;
    }

    if (!organizacaoAtivaId || !empresaAtivaId) {
      alert('Selecione uma empresa antes de criar a cotação.');
      return;
    }

    try {
      setConvertendoSolicitacaoId(solicitacao.id);

      const cotacaoCriada = await quotationService.criarCotacao({
        organizacaoId: organizacaoAtivaId,
        empresaId: empresaAtivaId,
        titulo: solicitacao.titulo || `Cotação - Estoque ${new Date().toLocaleDateString('pt-BR')}`,
        observacao: [
          'Origem: solicitação do Estoque / Almoxarifado.',
          solicitacao.solicitadoPor ? `Solicitado por: ${solicitacao.solicitadoPor}.` : '',
          solicitacao.urgencia ? `Urgência: ${solicitacao.urgencia}.` : '',
          solicitacao.justificativa || '',
        ].filter(Boolean).join('\n'),
        criadoPor: nomeUsuario || undefined,
        itens: solicitacao.itens.map(item => ({
          itemCatalogoId: item.itemCatalogoId,
          descricao: item.descricao,
          quantidade: item.quantidade,
          unidade: item.unidade,
          especificacao: [
            item.observacao || '',
            `Saldo no estoque ao solicitar: ${item.saldoNoMomento} ${item.unidade}`,
          ].filter(Boolean).join(' • '),
        })),
      });

      await estoqueService.vincularCotacao(solicitacao.id, cotacaoCriada.id);
      setSolicitacoesEstoque(atual => atual.filter(item => item.id !== solicitacao.id));
      setCotacoes(atual => [cotacaoCriada, ...atual.filter(item => item.id !== cotacaoCriada.id)]);
      setSelecionadaId(cotacaoCriada.id);
    } catch (error: any) {
      console.error(error);
      alert(error.message || 'Não foi possível transformar a solicitação em cotação.');
    } finally {
      setConvertendoSolicitacaoId(null);
    }
  };

  const abrirNova = () => {
    if (!temPermissao('compras', 'criar')) { alert('Você não tem permissão para criar cotações.'); return; }
    setTitulo(
      `Cotação ${new Date().toLocaleDateString('pt-BR')}`
    );
    setObservacao('');
    setItens([novoItem()]);
    setModalNova(true);
  };

  const salvarCotacao = async (
    event: React.FormEvent
  ) => {
    event.preventDefault();
    if (!temPermissao('compras', 'criar')) { alert('Você não tem permissão para criar cotações.'); return; }

    const itensValidos = itens
      .map(item => {
        const produto = catalogo.find(
          registro =>
            registro.id === item.itemCatalogoId
        );

        return {
          itemCatalogoId: item.itemCatalogoId,
          descricao:
            produto?.descricao || produto?.nome || '',
          quantidade: numeroSeguro(item.quantidade),
          unidade: produto?.unidade || 'UN',
          especificacao: item.especificacao.trim(),
        };
      })
      .filter(
        item =>
          item.itemCatalogoId &&
          item.descricao &&
          item.quantidade > 0
      );

    if (!itensValidos.length) {
      alert(
        'Adicione ao menos um item do catálogo.'
      );
      return;
    }

    if (!organizacaoAtivaId || !empresaAtivaId) {
      alert('Selecione uma empresa antes de criar a cotação.');
      return;
    }

    try {
      setSalvando(true);

      const criada =
        await quotationService.criarCotacao({
          organizacaoId: organizacaoAtivaId,
          empresaId: empresaAtivaId,
          titulo: titulo.trim() || 'Nova cotação',
          observacao: observacao.trim(),
          criadoPor: nomeUsuario,
          itens: itensValidos,
        });

      setCotacoes(atual => [criada, ...atual]);
      setSelecionadaId(criada.id);
      setModalNova(false);
    } catch (error: any) {
      alert(error.message || 'Erro ao criar cotação.');
    } finally {
      setSalvando(false);
    }
  };

  const buscarFornecedores = async () => {
    if (!cotacao) return;

    try {
      const itensComCatalogo = cotacao.itens.filter(
        item => item.itemCatalogoId
      );

      if (!itensComCatalogo.length) {
        alert(
          'A cotação não possui item vinculado ao catálogo.'
        );
        return;
      }

      const listas = await Promise.all(
        itensComCatalogo.map(item =>
          quotationService.listarFornecedoresDoItem(
            item.itemCatalogoId!,
            organizacaoAtivaId,
            empresaAtivaId
          )
        )
      );

      const contagem = new Map<string, number>();
      const primeiroVinculo = new Map<
        string,
        FornecedorCatalogoCotacao
      >();

      listas.forEach(lista =>
        lista.forEach(vinculo => {
          contagem.set(
            vinculo.fornecedorId,
            (contagem.get(vinculo.fornecedorId) || 0) +
              1
          );

          if (
            !primeiroVinculo.has(
              vinculo.fornecedorId
            )
          ) {
            primeiroVinculo.set(
              vinculo.fornecedorId,
              vinculo
            );
          }
        })
      );

      const aptos = Array.from(
        primeiroVinculo.values()
      ).filter(
        vinculo =>
          contagem.get(vinculo.fornecedorId) ===
            listas.length &&
          !cotacao.propostas.some(
            proposta =>
              proposta.fornecedorId ===
              vinculo.fornecedorId
          )
      );

      setFornecedoresDisponiveis(aptos);
      setFornecedorId('');
      setPrazo('');
      setFaturamento('');
      setTipoFrete('');
      setFrete('');
      setDesconto('');
      setPrecos(
        cotacao.itens.map(item => ({
          cotacaoItemId: item.id,
          valorUnitario: '',
          marca: '',
        }))
      );
      setModalFornecedor(true);
    } catch (error: any) {
      alert(
        error.message ||
          'Erro ao buscar fornecedores do catálogo.'
      );
    }
  };


  const carregarFornecedoresAutomaticamente =
    async (mostrarAviso = false) => {
      if (!cotacao || importandoFornecedores) return;

      const itensComCatalogo = cotacao.itens.filter(
        item => item.itemCatalogoId
      );

      if (!itensComCatalogo.length) {
        if (mostrarAviso) {
          alert(
            'A cotação não possui item vinculado ao catálogo.'
          );
        }
        return;
      }

      try {
        setImportandoFornecedores(true);

        const listasPorItem = await Promise.all(
          itensComCatalogo.map(async item => ({
            itemCotacao: item,
            fornecedores:
              await quotationService.listarFornecedoresDoItem(
                item.itemCatalogoId!,
                organizacaoAtivaId,
                empresaAtivaId
          ),
          }))
        );

        const fornecedoresPorId = new Map<
          string,
          FornecedorCatalogoCotacao[]
        >();

        listasPorItem.forEach(({ fornecedores }) => {
          fornecedores.forEach(vinculo => {
            fornecedoresPorId.set(
              vinculo.fornecedorId,
              [
                ...(fornecedoresPorId.get(
                  vinculo.fornecedorId
                ) || []),
                vinculo,
              ]
            );
          });
        });

        const fornecedoresJaAdicionados = new Set(
          cotacao.propostas.map(
            proposta => proposta.fornecedorId
          )
        );

        const fornecedoresAptos = Array.from(
          fornecedoresPorId.entries()
        ).filter(
          ([fornecedorSelecionadoId, vinculos]) =>
            !fornecedoresJaAdicionados.has(
              fornecedorSelecionadoId
            ) &&
            itensComCatalogo.every(item =>
              vinculos.some(
                vinculo =>
                  vinculo.itemCatalogoId ===
                  item.itemCatalogoId
              )
            )
        );

        let quantidadeImportada = 0;

        for (const [
          fornecedorSelecionadoId,
          vinculos,
        ] of fornecedoresAptos) {
          const itensProposta =
            itensComCatalogo.map(itemCotacao => {
              const vinculo = vinculos.find(
                registro =>
                  registro.itemCatalogoId ===
                  itemCotacao.itemCatalogoId
              );

              return {
                cotacaoItemId: itemCotacao.id,
                valorUnitario:
                  vinculo?.valorUnitario || 0,
                marca: vinculo?.marca || '',
                observacao: vinculo?.preferencial
                  ? 'Fornecedor preferencial no catálogo'
                  : '',
              };
            });

          if (
            itensProposta.some(
              item => item.valorUnitario <= 0
            )
          ) {
            continue;
          }

          const primeiroVinculo = vinculos[0];

          await quotationService.salvarProposta({
            cotacaoId: cotacao.id,
            fornecedorId:
              fornecedorSelecionadoId,
            prazoEntregaDias:
              primeiroVinculo
                ?.prazoEntregaDias ?? null,
            condicaoPagamento:
              primeiroVinculo
                ?.condicaoPagamento || null,
            tipoFrete:
              primeiroVinculo?.tipoFrete ||
              null,
            frete:
              primeiroVinculo?.valorFrete || 0,
            desconto: 0,
            observacao:
              'Fornecedor carregado automaticamente do catálogo.',
            itens: itensProposta,
          });

          quantidadeImportada += 1;
        }

        if (quantidadeImportada > 0) {
          const atualizada =
            await quotationService.buscarCotacaoPorId(
              cotacao.id
            );

          setCotacoes(atual =>
            atual.map(item =>
              item.id === atualizada.id
                ? atualizada
                : item
            )
          );
        } else if (
          mostrarAviso &&
          cotacao.propostas.length === 0
        ) {
          alert(
            'Nenhum fornecedor com preço maior que zero foi encontrado para todos os itens.'
          );
        }
      } catch (error: any) {
        console.error(
          'Erro ao carregar fornecedores automaticamente:',
          error
        );

        if (mostrarAviso) {
          alert(
            error.message ||
              'Não foi possível carregar os fornecedores.'
          );
        }
      } finally {
        setImportandoFornecedores(false);
      }
    };

  const preencherFornecedor = async (id: string) => {
    setFornecedorId(id);

    if (!cotacao || !id) return;

    const vinculos = (
      await Promise.all(
        cotacao.itens
          .filter(item => item.itemCatalogoId)
          .map(item =>
            quotationService.listarFornecedoresDoItem(
              item.itemCatalogoId!,
              organizacaoAtivaId,
              empresaAtivaId
          )
          )
      )
    )
      .flat()
      .filter(item => item.fornecedorId === id);

    const base = vinculos[0];

    setPrazo(
      base?.prazoEntregaDias === null ||
        base?.prazoEntregaDias === undefined
        ? ''
        : String(base.prazoEntregaDias)
    );

    setFaturamento(
      base?.condicaoPagamento || ''
    );
    setTipoFrete(base?.tipoFrete || '');
    setFrete(
      base?.valorFrete
        ? String(base.valorFrete)
        : ''
    );

    setPrecos(
      cotacao.itens.map(item => {
        const vinculo = vinculos.find(
          valor =>
            valor.itemCatalogoId ===
            item.itemCatalogoId
        );

        return {
          cotacaoItemId: item.id,
          valorUnitario: vinculo?.valorUnitario
            ? String(vinculo.valorUnitario)
            : '',
          marca: vinculo?.marca || '',
        };
      })
    );
  };

  const salvarFornecedor = async (
    event: React.FormEvent
  ) => {
    event.preventDefault();
    if (!temPermissao('compras', 'editar')) { alert('Você não tem permissão para editar cotações.'); return; }

    if (!cotacao || !fornecedorId) return;

    const itensProposta = precos.map(item => ({
      cotacaoItemId: item.cotacaoItemId,
      valorUnitario: numeroSeguro(
        item.valorUnitario
      ),
      marca: item.marca,
    }));

    if (
      itensProposta.some(
        item => item.valorUnitario <= 0
      )
    ) {
      alert(
        'Informe o valor de todos os itens.'
      );
      return;
    }

    try {
      setSalvandoProposta(true);

      await quotationService.salvarProposta({
        cotacaoId: cotacao.id,
        fornecedorId,
        prazoEntregaDias: prazo
          ? numeroSeguro(prazo)
          : null,
        condicaoPagamento: faturamento || null,
        tipoFrete: tipoFrete || null,
        frete: numeroSeguro(frete),
        desconto: numeroSeguro(desconto),
        itens: itensProposta,
      });

      const atualizada =
        await quotationService.buscarCotacaoPorId(
          cotacao.id
        );

      setCotacoes(atual =>
        atual.map(item =>
          item.id === atualizada.id
            ? atualizada
            : item
        )
      );

      setModalFornecedor(false);
    } catch (error: any) {
      alert(
        error.message ||
          'Erro ao salvar fornecedor.'
      );
    } finally {
      setSalvandoProposta(false);
    }
  };

  const selecionarMelhorOpcao = async (
    proposta: CotacaoProposta
  ) => {
    if (!temPermissao('compras', 'editar')) { alert('Você não tem permissão para selecionar propostas.'); return; }
    if (!cotacao) return;

    const menor = melhor?.id === proposta.id;

    const justificativa = menor
      ? 'Melhor custo total.'
      : window.prompt(
          'Esta não é a opção de menor custo. Informe o motivo da escolha:'
        );

    if (!menor && !justificativa?.trim()) {
      return;
    }

    try {
      const atualizada =
        await quotationService.selecionarProposta(
          cotacao.id,
          proposta.id,
          proposta.fornecedorId,
          justificativa || undefined
        );

      setCotacoes(atual =>
        atual.map(item =>
          item.id === atualizada.id
            ? atualizada
            : item
        )
      );
    } catch (error: any) {
      alert(
        error.message ||
          'Erro ao escolher fornecedor.'
      );
    }
  };

  const gerarSolicitacao = async () => {
    if (!temPermissao('compras', 'criar')) {
      alert('Você não tem permissão para gerar solicitações.');
      return;
    }

    if (
      !cotacao?.propostaEscolhidaId ||
      !cotacao.fornecedorEscolhidoId
    ) {
      alert('Selecione primeiro a melhor opção.');
      return;
    }

    const proposta = cotacao.propostas.find(
      item => item.id === cotacao.propostaEscolhidaId
    );

    if (!proposta) return;

    const fornecedor = fornecedores.find(
      (item: any) => item.id === proposta.fornecedorId
    );

    const total = quotationService.calcularTotalProposta(proposta);

    const descricaoItens = cotacao.itens
      .map(item => {
        const especificacao = item.especificacao
          ? ` - ${item.especificacao}`
          : '';
        return `${item.quantidade} ${item.unidade} - ${item.descricao}${especificacao}`;
      })
      .join(' | ');

    const observacaoCotacao = [
      `Cotação: ${cotacao.titulo}`,
      `Fornecedor selecionado: ${fornecedor?.nome || 'Fornecedor selecionado'}`,
      `Condição de pagamento: ${proposta.condicaoPagamento || '-'}`,
      `Prazo de entrega: ${
        proposta.prazoEntregaDias
          ? `${proposta.prazoEntregaDias} dias`
          : '-'
      }`,
      `Frete: ${proposta.tipoFrete || '-'} - ${formatarReal(proposta.frete)}`,
      `Valor da proposta: ${formatarReal(total)}`,
    ].join('\n');

    const rascunhoSolicitacao = {
      origem: 'cotacao',
      cotacaoId: cotacao.id,
      empresaId: empresaAtivaId,
      fornecedorId: proposta.fornecedorId,
      tipoPagamento: 'fornecedor',
      descricao: descricaoItens,
      valor: total,
      observacaoPagamento: observacaoCotacao,
    };

    try {
      setGerandoSolicitacao(true);

      sessionStorage.setItem(
        'flowfinance:solicitacao-cotacao',
        JSON.stringify(rascunhoSolicitacao)
      );

      if (typeof finance.setActiveView !== 'function') {
        throw new Error('Não foi possível abrir a página de Nova Solicitação.');
      }

      finance.setActiveView('solicitacao');
    } catch (error: any) {
      console.error(error);
      alert(
        error.message ||
          'Não foi possível enviar a cotação para Nova Solicitação.'
      );
    } finally {
      setGerandoSolicitacao(false);
    }
  };

  const gerarPdf = () => {
    if (!temPermissao('compras', 'exportar')) {
      alert('Você não tem permissão para exportar cotações.');
      return;
    }
    if (!cotacao) return;

    const escaparHtml = (valor: unknown) =>
      String(valor ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');

    const formatarData = (valor?: string | null) => {
      if (!valor) return '-';
      const data = new Date(valor);
      return Number.isNaN(data.getTime())
        ? escaparHtml(valor)
        : data.toLocaleDateString('pt-BR');
    };

    const empresa = empresas.find(
      (item: any) => String(item.id) === String(empresaAtivaId)
    );

    const propostaVencedora = cotacao.propostas.find(
      proposta => proposta.selecionada
    );

    const fornecedorVencedor = propostaVencedora
      ? fornecedores.find(
          (item: any) =>
            String(item.id) ===
            String(propostaVencedora.fornecedorId)
        )
      : null;

    const linhasItensCotacao = cotacao.itens
      .map((item, indice) => {
        const itemCatalogo = catalogo.find(
          registro =>
            String(registro.id) ===
            String(item.itemCatalogoId)
        );

        return `
          <tr>
            <td class="center">${indice + 1}</td>
            <td>${escaparHtml(itemCatalogo?.codigo || '-')}</td>
            <td>
              <strong>${escaparHtml(item.descricao || itemCatalogo?.nome || 'Item')}</strong>
              ${
                item.especificacao
                  ? `<div class="muted small">${escaparHtml(item.especificacao)}</div>`
                  : ''
              }
            </td>
            <td class="center">${escaparHtml(item.quantidade)}</td>
            <td class="center">${escaparHtml(item.unidade || itemCatalogo?.unidade || 'UN')}</td>
          </tr>
        `;
      })
      .join('');

    const blocosPropostas = cotacao.propostas
      .map((proposta, propostaIndex) => {
        const fornecedor = fornecedores.find(
          (item: any) =>
            String(item.id) === String(proposta.fornecedorId)
        );

        const subtotalItens = proposta.itens.reduce(
          (total, item) => total + numeroSeguro(item.valorTotal),
          0
        );
        const totalFinal =
          quotationService.calcularTotalProposta(proposta);

        const linhas = cotacao.itens
          .map((item, indice) => {
            const itemCatalogo = catalogo.find(
              registro =>
                String(registro.id) ===
                String(item.itemCatalogoId)
            );
            const preco = proposta.itens.find(
              registro =>
                String(registro.cotacaoItemId) ===
                String(item.id)
            );
            const valorUnitario = numeroSeguro(
              preco?.valorUnitario
            );
            const valorTotal = preco
              ? numeroSeguro(preco.valorTotal) ||
                valorUnitario * numeroSeguro(item.quantidade)
              : 0;

            return `
              <tr>
                <td class="center">${indice + 1}</td>
                <td>${escaparHtml(itemCatalogo?.codigo || '-')}</td>
                <td>
                  <strong>${escaparHtml(item.descricao || itemCatalogo?.nome || 'Item')}</strong>
                  ${
                    preco?.marca
                      ? `<div class="muted small">Marca: ${escaparHtml(preco.marca)}</div>`
                      : ''
                  }
                </td>
                <td class="center">${escaparHtml(item.quantidade)}</td>
                <td class="center">${escaparHtml(item.unidade || itemCatalogo?.unidade || 'UN')}</td>
                <td class="money">${preco ? formatarReal(valorUnitario) : '-'}</td>
                <td class="money"><strong>${preco ? formatarReal(valorTotal) : '-'}</strong></td>
              </tr>
            `;
          })
          .join('');

        return `
          <section class="proposal ${proposta.selecionada ? 'winner' : ''}">
            <div class="proposal-header">
              <div>
                <div class="proposal-title">
                  ${proposta.selecionada ? '<span class="badge">VENCEDOR</span>' : ''}
                  ${escaparHtml(fornecedor?.nome || `Fornecedor ${propostaIndex + 1}`)}
                </div>
                ${
                  fornecedor?.cnpj
                    ? `<div class="muted">CNPJ: ${escaparHtml(fornecedor.cnpj)}</div>`
                    : ''
                }
              </div>
              <div class="proposal-total">${formatarReal(totalFinal)}</div>
            </div>

            <div class="info-grid">
              <div><span>Pagamento</span><strong>${escaparHtml(proposta.condicaoPagamento || '-')}</strong></div>
              <div><span>Prazo de entrega</span><strong>${proposta.prazoEntregaDias ? `${proposta.prazoEntregaDias} dias` : '-'}</strong></div>
              <div><span>Frete</span><strong>${escaparHtml(proposta.tipoFrete || '-')}</strong></div>
              <div><span>Valor do frete</span><strong>${formatarReal(proposta.frete)}</strong></div>
            </div>

            <table>
              <thead>
                <tr>
                  <th class="center">#</th>
                  <th>Código</th>
                  <th>Item / Marca</th>
                  <th class="center">Qtd.</th>
                  <th class="center">Un.</th>
                  <th class="money">Valor unit.</th>
                  <th class="money">Total item</th>
                </tr>
              </thead>
              <tbody>${linhas || '<tr><td colspan="7">Sem itens informados.</td></tr>'}</tbody>
            </table>

            <div class="totals">
              <div><span>Subtotal dos itens</span><strong>${formatarReal(subtotalItens)}</strong></div>
              <div><span>Frete</span><strong>${formatarReal(proposta.frete)}</strong></div>
              <div><span>Desconto</span><strong>- ${formatarReal(proposta.desconto)}</strong></div>
              <div class="grand-total"><span>Total da proposta</span><strong>${formatarReal(totalFinal)}</strong></div>
            </div>

            ${
              proposta.observacao
                ? `<div class="note"><strong>Observações do fornecedor:</strong><br>${escaparHtml(proposta.observacao)}</div>`
                : ''
            }
          </section>
        `;
      })
      .join('');

    const resumoComparativo = cotacao.propostas
      .map(proposta => {
        const fornecedor = fornecedores.find(
          (item: any) =>
            String(item.id) === String(proposta.fornecedorId)
        );
        return `
          <tr class="${proposta.selecionada ? 'vencedora' : ''}">
            <td>${escaparHtml(fornecedor?.nome || 'Fornecedor')}</td>
            <td>${escaparHtml(proposta.condicaoPagamento || '-')}</td>
            <td class="center">${proposta.prazoEntregaDias ? `${proposta.prazoEntregaDias} dias` : '-'}</td>
            <td>${escaparHtml(proposta.tipoFrete || '-')}</td>
            <td class="money">${formatarReal(proposta.frete)}</td>
            <td class="money"><strong>${formatarReal(quotationService.calcularTotalProposta(proposta))}</strong></td>
          </tr>
        `;
      })
      .join('');

    const janela = window.open(
      '',
      '_blank',
      'width=1200,height=900'
    );

    if (!janela) {
      alert('Permita pop-ups para gerar o PDF.');
      return;
    }

    janela.document.write(`
      <!doctype html>
      <html lang="pt-BR">
        <head>
          <meta charset="utf-8">
          <title>${escaparHtml(cotacao.titulo)}</title>
          <style>
            @page { size: A4; margin: 12mm; }
            * { box-sizing: border-box; }
            body {
              margin: 0;
              font-family: Arial, Helvetica, sans-serif;
              color: #0f172a;
              background: #ffffff;
              font-size: 10.5px;
              line-height: 1.35;
            }
            .toolbar {
              display: flex;
              justify-content: flex-end;
              margin-bottom: 14px;
            }
            .toolbar button {
              border: 0;
              border-radius: 8px;
              padding: 9px 14px;
              background: #111827;
              color: white;
              cursor: pointer;
            }
            .header {
              border-bottom: 2px solid #0f172a;
              padding-bottom: 12px;
              margin-bottom: 14px;
              display: flex;
              justify-content: space-between;
              gap: 20px;
            }
            .brand { font-size: 12px; font-weight: 700; letter-spacing: .08em; }
            h1 { font-size: 20px; line-height: 1.1; margin: 4px 0; }
            h2 { font-size: 13px; margin: 0 0 8px; }
            .document-meta { text-align: right; min-width: 210px; }
            .document-meta div { margin-bottom: 3px; }
            .muted { color: #64748b; }
            .small { font-size: 9px; margin-top: 2px; }
            .section { margin: 15px 0; page-break-inside: avoid; }
            .section-title {
              font-size: 12px;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: .04em;
              margin: 0 0 7px;
            }
            table { width: 100%; border-collapse: collapse; }
            th, td {
              border: 1px solid #cbd5e1;
              padding: 6px 7px;
              vertical-align: top;
            }
            th {
              background: #f1f5f9;
              font-size: 9px;
              text-transform: uppercase;
              color: #334155;
            }
            .center { text-align: center; }
            .money { text-align: right; white-space: nowrap; }
            .proposal {
              margin-top: 16px;
              border: 1px solid #cbd5e1;
              border-radius: 8px;
              padding: 11px;
              page-break-inside: avoid;
            }
            .proposal.winner { border: 2px solid #15803d; }
            .proposal-header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              gap: 12px;
              margin-bottom: 9px;
            }
            .proposal-title { font-size: 13px; font-weight: 700; }
            .proposal-total { font-size: 16px; font-weight: 700; }
            .badge {
              display: inline-block;
              padding: 2px 6px;
              margin-right: 6px;
              border-radius: 4px;
              background: #dcfce7;
              color: #166534;
              font-size: 8px;
            }
            .info-grid {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 6px;
              margin-bottom: 9px;
            }
            .info-grid > div {
              border: 1px solid #e2e8f0;
              padding: 6px;
              border-radius: 5px;
            }
            .info-grid span { display: block; color: #64748b; font-size: 8px; }
            .info-grid strong { display: block; margin-top: 2px; }
            .totals {
              width: 300px;
              margin: 8px 0 0 auto;
            }
            .totals > div {
              display: flex;
              justify-content: space-between;
              gap: 12px;
              padding: 3px 0;
            }
            .grand-total {
              border-top: 1px solid #94a3b8;
              margin-top: 3px;
              padding-top: 6px !important;
              font-size: 12px;
            }
            .note {
              margin-top: 8px;
              padding: 7px;
              background: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 5px;
            }
            .vencedora { background: #f0fdf4; }
            .decision {
              border: 1px solid #cbd5e1;
              border-left: 4px solid #0f172a;
              padding: 10px;
              margin-top: 15px;
              page-break-inside: avoid;
            }
            .decision-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 8px 18px;
              margin-bottom: 8px;
            }
            .footer {
              margin-top: 18px;
              padding-top: 8px;
              border-top: 1px solid #e2e8f0;
              color: #64748b;
              font-size: 8px;
              text-align: center;
            }
            @media print {
              .toolbar { display: none; }
              body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>
          <div class="toolbar">
            <button onclick="window.print()">Imprimir / Salvar como PDF</button>
          </div>

          <header class="header">
            <div>
              <div class="brand">FLOWFINANCE</div>
              <h1>Mapa Comparativo de Cotação</h1>
              <div><strong>${escaparHtml(cotacao.titulo)}</strong></div>
            </div>
            <div class="document-meta">
              <div><strong>Empresa:</strong> ${escaparHtml(empresa?.nome || '-')}</div>
              ${empresa?.cnpj ? `<div><strong>CNPJ:</strong> ${escaparHtml(empresa.cnpj)}</div>` : ''}
              <div><strong>Responsável:</strong> ${escaparHtml(cotacao.criadoPor || '-')}</div>
              <div><strong>Data:</strong> ${formatarData(cotacao.createdAt)}</div>
              <div><strong>Status:</strong> ${escaparHtml(cotacao.status || '-')}</div>
            </div>
          </header>

          <section class="section">
            <div class="section-title">Itens solicitados</div>
            <table>
              <thead>
                <tr>
                  <th class="center">#</th>
                  <th>Código</th>
                  <th>Item / Especificação</th>
                  <th class="center">Qtd.</th>
                  <th class="center">Un.</th>
                </tr>
              </thead>
              <tbody>${linhasItensCotacao || '<tr><td colspan="5">Nenhum item informado.</td></tr>'}</tbody>
            </table>
          </section>

          <section class="section">
            <div class="section-title">Resumo comparativo</div>
            <table>
              <thead>
                <tr>
                  <th>Fornecedor</th>
                  <th>Pagamento</th>
                  <th class="center">Entrega</th>
                  <th>Frete</th>
                  <th class="money">Valor frete</th>
                  <th class="money">Total</th>
                </tr>
              </thead>
              <tbody>${resumoComparativo || '<tr><td colspan="6">Nenhuma proposta cadastrada.</td></tr>'}</tbody>
            </table>
          </section>

          <section class="section">
            <div class="section-title">Detalhamento das propostas</div>
            ${blocosPropostas || '<div class="note">Nenhuma proposta cadastrada.</div>'}
          </section>

          <section class="decision">
            <h2>Resultado da cotação</h2>
            <div class="decision-grid">
              <div><strong>Fornecedor selecionado:</strong><br>${escaparHtml(fornecedorVencedor?.nome || 'Não selecionado')}</div>
              <div><strong>Valor final:</strong><br>${propostaVencedora ? formatarReal(quotationService.calcularTotalProposta(propostaVencedora)) : '-'}</div>
            </div>
            <div><strong>Justificativa da escolha:</strong><br>${escaparHtml(cotacao.justificativaEscolha || '-')}</div>
          </section>

          ${
            cotacao.observacao
              ? `<section class="note"><strong>Observações gerais:</strong><br>${escaparHtml(cotacao.observacao)}</section>`
              : ''
          }

          <div class="footer">
            Documento gerado pelo FLOWFINANCE - ${new Date().toLocaleString('pt-BR')}
          </div>

          <script>
            setTimeout(() => window.print(), 500);
          </script>
        </body>
      </html>
    `);

    janela.document.close();
  };

  if (cotacao) {
    const vencedora = cotacao.propostas.find(
      item => item.selecionada
    );

    return (
      <div className="space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={() => setSelecionadaId(null)}
              className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            <div>
              <h1 className="text-2xl font-bold text-[#0F172A]">
                {cotacao.titulo}
              </h1>

              <p className="text-xs text-slate-400 mt-1">
                {cotacao.itens.length} item(ns) •{' '}
                {cotacao.propostas.length}{' '}
                fornecedor(es)
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={gerarPdf}
              className="px-4 py-2.5 rounded-[12px] bg-white border border-slate-200 text-xs font-bold flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              PDF comparativo
            </button>

            {!cotacao.solicitacaoGerada &&
              vencedora && (
                <button
                  type="button"
                  onClick={gerarSolicitacao}
                  disabled={gerandoSolicitacao}
                  className="px-4 py-2.5 rounded-[12px] bg-emerald-600 text-white text-xs font-bold flex items-center gap-2 disabled:opacity-60"
                >
                  <ShoppingCart className="w-4 h-4" />
                  {gerandoSolicitacao
                    ? 'Gerando...'
                    : 'Enviar para solicitação'}
                </button>
              )}
          </div>
        </div>

        <div className="bg-white rounded-[18px] border border-slate-100 p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-bold">
                Itens
              </h2>

              <p className="text-[11px] text-slate-400 mt-1">
                Fornecedores puxados automaticamente
                do catálogo.
              </p>
            </div>

            {!cotacao.solicitacaoGerada && (
              <button
                type="button"
                onClick={() =>
                  carregarFornecedoresAutomaticamente(
                    true
                  )
                }
                disabled={importandoFornecedores}
                className="px-4 py-2.5 rounded-[12px] bg-[#0F172A] text-white text-xs font-bold flex items-center gap-2 disabled:opacity-60"
              >
                <Plus className="w-4 h-4" />
                {importandoFornecedores
                  ? 'Carregando...'
                  : 'Atualizar fornecedores'}
              </button>
            )}
          </div>

          <div className="mt-4 divide-y divide-slate-100">
            {cotacao.itens.map(item => (
              <div
                key={item.id}
                className="py-3 flex justify-between gap-4"
              >
                <div>
                  <p className="text-xs font-bold">
                    {item.descricao}
                  </p>

                  <p className="text-[10px] text-slate-400">
                    {item.especificacao ||
                      'Sem especificação'}
                  </p>
                </div>

                <p className="text-xs font-bold">
                  {item.quantidade} {item.unidade}
                </p>
              </div>
            ))}
          </div>
        </div>

        {cotacao.propostas.length === 0 ? (
          <div className="bg-white rounded-[18px] border border-slate-100 p-10 text-center">
            <Package className="w-8 h-8 text-slate-300 mx-auto" />

            <p className="text-sm font-bold mt-3">
              {importandoFornecedores
                ? 'Buscando fornecedores...'
                : 'Nenhum fornecedor disponível'}
            </p>

            <p className="text-xs text-slate-400 mt-1">
              {importandoFornecedores
                ? 'Consultando os vínculos e preços do catálogo.'
                : 'Cadastre preço, faturamento, prazo e frete no vínculo do catálogo.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            {cotacao.propostas.map(proposta => {
              const fornecedor = fornecedores.find(
                (item: any) =>
                  item.id === proposta.fornecedorId
              );

              const total =
                quotationService.calcularTotalProposta(
                  proposta
                );

              const menor =
                melhor?.id === proposta.id;

              return (
                <div
                  key={proposta.id}
                  className={`bg-white rounded-[18px] border p-5 ${
                    proposta.selecionada
                      ? 'border-emerald-300 ring-2 ring-emerald-100'
                      : menor
                        ? 'border-amber-300'
                        : 'border-slate-100'
                  }`}
                >
                  <div className="flex justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-bold">
                        {fornecedor?.nome ||
                          'Fornecedor'}
                      </h3>

                      <div className="flex gap-2 mt-2">
                        {menor && (
                          <Badge texto="MELHOR CUSTO" />
                        )}

                        {proposta.selecionada && (
                          <Badge
                            texto="SELECIONADA"
                            verde
                          />
                        )}
                      </div>
                    </div>

                    {!proposta.selecionada &&
                      !cotacao.solicitacaoGerada && (
                        <button
                          type="button"
                          onClick={async () => {
                            if (
                              !confirm(
                                'Excluir este fornecedor da comparação?'
                              )
                            ) {
                              return;
                            }

                            await quotationService.excluirProposta(
                              proposta.id
                            );

                            const atualizada =
                              await quotationService.buscarCotacaoPorId(
                                cotacao.id
                              );

                            setCotacoes(atual =>
                              atual.map(item =>
                                item.id ===
                                atualizada.id
                                  ? atualizada
                                  : item
                              )
                            );
                          }}
                          className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 mt-5">
                    <Metrica
                      titulo="Faturamento"
                      valor={
                        proposta.condicaoPagamento ||
                        '-'
                      }
                    />

                    <Metrica
                      titulo="Entrega"
                      valor={
                        proposta.prazoEntregaDias
                          ? `${proposta.prazoEntregaDias} dias`
                          : '-'
                      }
                    />

                    <Metrica
                      titulo="Frete"
                      valor={`${
                        proposta.tipoFrete || '-'
                      } • ${formatarReal(
                        proposta.frete
                      )}`}
                    />

                    <Metrica
                      titulo="Total"
                      valor={formatarReal(total)}
                      destaque
                    />
                  </div>

                  {!proposta.selecionada &&
                    !cotacao.solicitacaoGerada && (
                      <button
                        type="button"
                        onClick={() =>
                          selecionarMelhorOpcao(
                            proposta
                          )
                        }
                        className="w-full mt-5 py-3 rounded-[12px] bg-[#0F172A] text-white text-xs font-bold flex items-center justify-center gap-2"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Selecionar melhor opção
                      </button>
                    )}
                </div>
              );
            })}
          </div>
        )}

        {cotacao.solicitacaoGerada && (
          <div className="rounded-[16px] border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">
            Solicitação gerada com sucesso.
          </div>
        )}

        {modalFornecedor && (
          <Painel
            titulo="Fornecedores do catálogo"
            fechar={() =>
              setModalFornecedor(false)
            }
          >
            {fornecedoresDisponiveis.length ===
            0 ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-700">
                Nenhum fornecedor cadastrado atende
                a todos os itens selecionados.
              </div>
            ) : (
              <form
                onSubmit={salvarFornecedor}
                className="space-y-5"
              >
                <CampoSelect
                  label="Fornecedor"
                  value={fornecedorId}
                  onChange={preencherFornecedor}
                  options={fornecedoresDisponiveis.map(
                    item => ({
                      value: item.fornecedorId,
                      label: `${
                        item.fornecedorNome
                      }${
                        item.preferencial
                          ? ' — Preferencial'
                          : ''
                      }`,
                    })
                  )}
                  placeholder="Selecione"
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <CampoInput
                    label="Tipo de faturamento"
                    value={faturamento}
                    onChange={setFaturamento}
                  />

                  <CampoInput
                    label="Prazo de entrega (dias)"
                    type="number"
                    value={prazo}
                    onChange={setPrazo}
                  />

                  <CampoSelect
                    label="Frete"
                    value={tipoFrete}
                    onChange={setTipoFrete}
                    options={[
                      {
                        value: 'CIF',
                        label: 'CIF',
                      },
                      {
                        value: 'FOB',
                        label: 'FOB',
                      },
                      {
                        value: 'GRATIS',
                        label: 'Grátis',
                      },
                      {
                        value: 'RETIRADA',
                        label: 'Retirada',
                      },
                      {
                        value: 'A_COMBINAR',
                        label: 'A combinar',
                      },
                    ]}
                    placeholder="Selecione"
                  />

                  <CampoInput
                    label="Valor do frete"
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

                {cotacao.itens.map(itemCotacao => {
                  const preco = precos.find(
                    item =>
                      item.cotacaoItemId ===
                      itemCotacao.id
                  );

                  return (
                    <div
                      key={itemCotacao.id}
                      className="border border-slate-100 rounded-[16px] p-4"
                    >
                      <p className="text-xs font-bold mb-3">
                        {itemCotacao.descricao}
                      </p>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <CampoInput
                          label="Preço unitário"
                          type="number"
                          step="0.01"
                          value={
                            preco?.valorUnitario || ''
                          }
                          onChange={(valor: string) =>
                            setPrecos(atual =>
                              atual.map(item =>
                                item.cotacaoItemId ===
                                itemCotacao.id
                                  ? {
                                      ...item,
                                      valorUnitario:
                                        valor,
                                    }
                                  : item
                              )
                            )
                          }
                        />

                        <CampoInput
                          label="Marca"
                          value={preco?.marca || ''}
                          onChange={(valor: string) =>
                            setPrecos(atual =>
                              atual.map(item =>
                                item.cotacaoItemId ===
                                itemCotacao.id
                                  ? {
                                      ...item,
                                      marca: valor,
                                    }
                                  : item
                              )
                            )
                          }
                        />
                      </div>
                    </div>
                  );
                })}

                <button
                  type="submit"
                  disabled={
                    salvandoProposta ||
                    !fornecedorId
                  }
                  className="w-full py-3 rounded-[12px] bg-[#0F172A] text-white text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  <Save className="w-4 h-4" />
                  {salvandoProposta
                    ? 'Salvando...'
                    : 'Adicionar à comparação'}
                </button>
              </form>
            )}
          </Painel>
        )}
      </div>
    );
  }

  const filtradas = cotacoes.filter(item =>
    normalizar(item.titulo).includes(
      normalizar(busca)
    )
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A]">
            Central de Cotações
          </h1>

          <p className="text-xs text-slate-400 mt-1">
            Item → fornecedores → melhor opção →
            solicitação.
          </p>
        </div>

        <button
          type="button"
          onClick={abrirNova}
          className="px-4 py-2.5 rounded-[12px] bg-[#0F172A] text-white text-xs font-bold flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Nova cotação
        </button>
      </div>

      {solicitacoesEstoque.length > 0 && (
        <div className="rounded-[18px] border border-blue-100 bg-blue-50/40 p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-blue-100 text-blue-700">
              <Warehouse className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Solicitações do Almoxarifado</h2>
              <p className="mt-1 text-[10px] text-slate-500">
                {solicitacoesEstoque.length} solicitação(ões) aguardando o setor de Compras iniciar a cotação.
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 xl:grid-cols-2">
            {solicitacoesEstoque.map(solicitacao => (
              <div key={solicitacao.id} className="rounded-[14px] border border-blue-100 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-xs font-bold text-slate-900">{solicitacao.titulo}</h3>
                    <p className="mt-1 text-[9px] text-slate-400">
                      {new Date(solicitacao.createdAt).toLocaleString('pt-BR')} • {solicitacao.solicitadoPor || 'Almoxarifado'}
                    </p>
                  </div>
                  <span className={`rounded-full px-2 py-1 text-[9px] font-bold ${
                    solicitacao.urgencia === 'alta'
                      ? 'bg-red-50 text-red-700'
                      : solicitacao.urgencia === 'baixa'
                        ? 'bg-slate-100 text-slate-600'
                        : 'bg-amber-50 text-amber-700'
                  }`}>
                    {solicitacao.urgencia.toUpperCase()}
                  </span>
                </div>

                <div className="mt-3 space-y-1.5">
                  {solicitacao.itens.slice(0, 4).map(item => (
                    <div key={item.id} className="flex items-center justify-between gap-3 rounded-[9px] bg-slate-50 px-3 py-2">
                      <span className="min-w-0 truncate text-[10px] font-semibold text-slate-700">{item.descricao}</span>
                      <span className="shrink-0 text-[10px] font-bold text-slate-900">{item.quantidade} {item.unidade}</span>
                    </div>
                  ))}
                  {solicitacao.itens.length > 4 && (
                    <div className="text-[9px] text-slate-400">+ {solicitacao.itens.length - 4} outro(s) item(ns)</div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => transformarSolicitacaoEstoqueEmCotacao(solicitacao)}
                  disabled={convertendoSolicitacaoId === solicitacao.id}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-[11px] bg-blue-700 px-3 py-2.5 text-[10px] font-bold text-white disabled:opacity-60"
                >
                  {convertendoSolicitacaoId === solicitacao.id ? 'Criando cotação...' : 'Transformar em cotação'}
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="max-w-md bg-white border border-slate-100 rounded-[14px] px-4 py-2.5 flex items-center gap-2">
        <Search className="w-4 h-4 text-slate-400" />

        <input
          value={busca}
          onChange={event =>
            setBusca(event.target.value)
          }
          placeholder="Pesquisar cotação..."
          className="w-full bg-transparent border-0 focus:ring-0 text-xs"
        />
      </div>

      {carregando ? (
        <Vazio texto="Carregando..." />
      ) : filtradas.length === 0 ? (
        <Vazio texto="Nenhuma cotação cadastrada." />
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          {filtradas.map(item => {
            const melhorItem =
              quotationService.obterMelhorPreco(
                item.propostas
              );

            return (
              <div
                key={item.id}
                className="bg-white rounded-[18px] border border-slate-100 p-5"
              >
                <div className="flex justify-between gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setSelecionadaId(item.id)
                    }
                    className="text-left"
                  >
                    <h3 className="text-sm font-bold">
                      {item.titulo}
                    </h3>

                    <p className="text-[10px] text-slate-400 mt-1">
                      {item.itens.length} item(ns) •{' '}
                      {item.propostas.length}{' '}
                      fornecedor(es)
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      if (
                        !confirm(
                          'Excluir esta cotação?'
                        )
                      ) {
                        return;
                      }

                      await quotationService.excluirCotacao(
                        item.id
                      );

                      setCotacoes(atual =>
                        atual.filter(
                          valor =>
                            valor.id !== item.id
                        )
                      );
                    }}
                    className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center"
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-3 mt-5">
                  <Metrica
                    titulo="Itens"
                    valor={String(
                      item.itens.length
                    )}
                  />

                  <Metrica
                    titulo="Fornecedores"
                    valor={String(
                      item.propostas.length
                    )}
                  />

                  <Metrica
                    titulo="Melhor custo"
                    valor={
                      melhorItem
                        ? formatarReal(
                            quotationService.calcularTotalProposta(
                              melhorItem
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
                    setSelecionadaId(item.id)
                  }
                  className="w-full mt-5 py-2.5 rounded-[12px] bg-slate-50 text-xs font-bold"
                >
                  Abrir
                </button>
              </div>
            );
          })}
        </div>
      )}

      {modalNova && (
        <Painel
          titulo="Nova cotação"
          fechar={() => setModalNova(false)}
        >
          <form
            onSubmit={salvarCotacao}
            className="space-y-5"
          >
            <CampoInput
              label="Título"
              value={titulo}
              onChange={setTitulo}
            />

            <CampoTextarea
              label="Observação"
              value={observacao}
              onChange={setObservacao}
            />

            {itens.map((item, index) => (
              <div
                key={item.idLocal}
                className="border border-slate-100 rounded-[16px] p-4 space-y-4"
              >
                <div className="flex justify-between">
                  <span className="text-xs font-bold">
                    Item {index + 1}
                  </span>

                  {itens.length > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        setItens(atual =>
                          atual.filter(
                            valor =>
                              valor.idLocal !==
                              item.idLocal
                          )
                        )
                      }
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  )}
                </div>

                <CampoSelect
                  label="Item do catálogo"
                  value={item.itemCatalogoId}
                  onChange={(valor: string) =>
                    setItens(atual =>
                      atual.map(registro =>
                        registro.idLocal ===
                        item.idLocal
                          ? {
                              ...registro,
                              itemCatalogoId:
                                valor,
                            }
                          : registro
                      )
                    )
                  }
                  options={catalogo.map(produto => ({
                    value: produto.id,
                    label: `${
                      produto.codigo
                        ? `${produto.codigo} — `
                        : ''
                    }${produto.nome}`,
                  }))}
                  placeholder="Selecione o item"
                />

                <CampoInput
                  label="Quantidade"
                  type="number"
                  step="0.01"
                  value={item.quantidade}
                  onChange={(valor: string) =>
                    setItens(atual =>
                      atual.map(registro =>
                        registro.idLocal ===
                        item.idLocal
                          ? {
                              ...registro,
                              quantidade: valor,
                            }
                          : registro
                      )
                    )
                  }
                />

                <CampoInput
                  label="Especificação"
                  value={item.especificacao}
                  onChange={(valor: string) =>
                    setItens(atual =>
                      atual.map(registro =>
                        registro.idLocal ===
                        item.idLocal
                          ? {
                              ...registro,
                              especificacao:
                                valor,
                            }
                          : registro
                      )
                    )
                  }
                />
              </div>
            ))}

            <button
              type="button"
              onClick={() =>
                setItens(atual => [
                  ...atual,
                  novoItem(),
                ])
              }
              className="px-3 py-2 rounded-[10px] bg-slate-100 text-xs font-bold flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Adicionar item
            </button>

            <button
              type="submit"
              disabled={salvando}
              className="w-full py-3 rounded-[12px] bg-[#0F172A] text-white text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-60"
            >
              <Save className="w-4 h-4" />
              {salvando
                ? 'Criando...'
                : 'Criar e ver fornecedores'}
            </button>
          </form>
        </Painel>
      )}
    </div>
  );
};

const Metrica = ({
  titulo,
  valor,
  destaque,
}: any) => (
  <div className="bg-slate-50 rounded-[12px] p-3">
    <span className="text-[9px] text-slate-400 uppercase font-bold">
      {titulo}
    </span>

    <p
      className={`text-xs font-bold mt-1 ${
        destaque ? 'text-emerald-600' : ''
      }`}
    >
      {valor}
    </p>
  </div>
);

const Badge = ({ texto, verde }: any) => (
  <span
    className={`px-2 py-1 rounded-full text-[9px] font-bold ${
      verde
        ? 'bg-emerald-50 text-emerald-600'
        : 'bg-amber-50 text-amber-600'
    }`}
  >
    {texto}
  </span>
);

const Vazio = ({
  texto,
}: {
  texto: string;
}) => (
  <div className="bg-white rounded-[18px] border border-slate-100 p-10 text-center text-xs text-slate-400">
    <ClipboardList className="w-8 h-8 mx-auto mb-3 text-slate-300" />
    {texto}
  </div>
);

const Painel = ({
  titulo,
  fechar,
  children,
}: any) => (
  <>
    <div
      className="fixed inset-0 bg-slate-900/30 z-50"
      onClick={fechar}
    />

    <div className="fixed inset-y-0 right-0 max-w-2xl w-full bg-white shadow-2xl z-50 flex flex-col">
      <div className="p-6 border-b flex justify-between">
        <h2 className="text-sm font-bold">
          {titulo}
        </h2>

        <button type="button" onClick={fechar}>
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {children}
      </div>
    </div>
  </>
);

const CampoInput = ({
  label,
  value,
  onChange,
  type = 'text',
  step,
}: any) => (
  <div className="space-y-1.5">
    <label className="text-[10px] font-bold text-slate-400 uppercase block">
      {label}
    </label>

    <input
      type={type}
      step={step}
      value={value}
      onChange={event =>
        onChange(event.target.value)
      }
      className="w-full bg-slate-50 border-0 rounded-[12px] px-3.5 py-2.5 text-xs"
    />
  </div>
);

const CampoTextarea = ({
  label,
  value,
  onChange,
}: any) => (
  <div className="space-y-1.5">
    <label className="text-[10px] font-bold text-slate-400 uppercase block">
      {label}
    </label>

    <textarea
      rows={3}
      value={value}
      onChange={event =>
        onChange(event.target.value)
      }
      className="w-full bg-slate-50 border-0 rounded-[12px] px-3.5 py-2.5 text-xs"
    />
  </div>
);

const CampoSelect = ({
  label,
  value,
  onChange,
  options,
  placeholder,
}: any) => (
  <div className="space-y-1.5">
    <label className="text-[10px] font-bold text-slate-400 uppercase block">
      {label}
    </label>

    <select
      value={value}
      onChange={event =>
        onChange(event.target.value)
      }
      className="w-full bg-slate-50 border-0 rounded-[12px] px-3.5 py-2.5 text-xs"
    >
      <option value="">{placeholder}</option>

      {options.map((option: any) => (
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