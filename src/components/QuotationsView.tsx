import React, { useEffect, useMemo, useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { useAuth } from '../context/AuthContext';
import { formatarReal } from '../utils';
import {
  Cotacao,
  CotacaoProposta,
  FornecedorCatalogoCotacao,
  ItemCatalogoCotacao,
  quotationService,
} from '../services/quotationService';
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
  const { fornecedores = [] } = finance;
  const { nomeUsuario } = useAuth();

  const [catalogo, setCatalogo] = useState<
    ItemCatalogoCotacao[]
  >([]);
  const [cotacoes, setCotacoes] = useState<Cotacao[]>([]);
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

      const [listaCatalogo, listaCotacoes] =
        await Promise.all([
          quotationService.listarItensCatalogo(),
          quotationService.listarCotacoes(),
        ]);

      setCatalogo(listaCatalogo);
      setCotacoes(listaCotacoes);
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
    carregar();
  }, []);

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

  const abrirNova = () => {
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

    try {
      setSalvando(true);

      const criada =
        await quotationService.criarCotacao({
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
            item.itemCatalogoId!
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
                item.itemCatalogoId!
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
              item.itemCatalogoId!
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
    if (
      !cotacao?.propostaEscolhidaId ||
      !cotacao.fornecedorEscolhidoId
    ) {
      alert(
        'Selecione primeiro a melhor opção.'
      );
      return;
    }

    const proposta = cotacao.propostas.find(
      item =>
        item.id === cotacao.propostaEscolhidaId
    );

    if (!proposta) return;

    const fornecedor = fornecedores.find(
      (item: any) =>
        item.id === proposta.fornecedorId
    );

    const total =
      quotationService.calcularTotalProposta(
        proposta
      );

    const criarProcesso =
      finance.adicionarProcesso ||
      finance.criarProcesso ||
      finance.novoProcesso;

    if (typeof criarProcesso !== 'function') {
      alert(
        'Não encontrei adicionarProcesso/criarProcesso no FinanceContext. Envie o FinanceContext para conectar este botão ao cadastro de solicitações.'
      );
      return;
    }

    const payload = {
      descricao: cotacao.itens
        .map(
          item =>
            `${item.quantidade} ${item.unidade} - ${item.descricao}`
        )
        .join(' | '),
      titulo: `Solicitação: ${cotacao.titulo}`,
      fornecedorId: proposta.fornecedorId,
      valor: total,
      status: 'solicitacao',
      observacao: [
        `Cotação: ${cotacao.titulo}`,
        `Fornecedor: ${
          fornecedor?.nome ||
          'Fornecedor selecionado'
        }`,
        `Faturamento: ${
          proposta.condicaoPagamento || '-'
        }`,
        `Entrega: ${
          proposta.prazoEntregaDias
            ? `${proposta.prazoEntregaDias} dias`
            : '-'
        }`,
        `Frete: ${
          proposta.tipoFrete || '-'
        } - ${formatarReal(proposta.frete)}`,
      ].join('\n'),
      cotacaoId: cotacao.id,
    };

    try {
      setGerandoSolicitacao(true);

      const processoCriado =
        await criarProcesso(payload);

      const processoId =
        processoCriado?.dbId ||
        processoCriado?.id ||
        null;

      await quotationService.marcarSolicitacaoGerada(
        cotacao.id,
        processoId
      );

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

      alert('Solicitação gerada com sucesso.');
    } catch (error: any) {
      console.error(error);
      alert(
        error.message ||
          'Erro ao gerar solicitação.'
      );
    } finally {
      setGerandoSolicitacao(false);
    }
  };

  const gerarPdf = () => {
    if (!cotacao) return;

    const linhas = cotacao.propostas
      .map(proposta => {
        const fornecedor = fornecedores.find(
          (item: any) =>
            item.id === proposta.fornecedorId
        );

        return `
          <tr class="${
            proposta.selecionada ? 'vencedora' : ''
          }">
            <td>${
              fornecedor?.nome || 'Fornecedor'
            }</td>
            <td>${
              proposta.condicaoPagamento || '-'
            }</td>
            <td>${
              proposta.prazoEntregaDias
                ? `${proposta.prazoEntregaDias} dias`
                : '-'
            }</td>
            <td>${proposta.tipoFrete || '-'}</td>
            <td>${formatarReal(
              proposta.frete
            )}</td>
            <td>${formatarReal(
              quotationService.calcularTotalProposta(
                proposta
              )
            )}</td>
          </tr>
        `;
      })
      .join('');

    const janela = window.open(
      '',
      '_blank',
      'width=1100,height=800'
    );

    if (!janela) {
      alert(
        'Permita pop-ups para gerar o PDF.'
      );
      return;
    }

    janela.document.write(`
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${cotacao.titulo}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              color: #0f172a;
              padding: 32px;
              font-size: 12px;
            }
            h1 { font-size: 22px; }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 18px;
            }
            th, td {
              border: 1px solid #cbd5e1;
              padding: 9px;
              text-align: left;
            }
            th { background: #f1f5f9; }
            .vencedora {
              background: #dcfce7;
              font-weight: bold;
            }
            @media print {
              button { display: none; }
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          <button onclick="window.print()">
            Imprimir / Salvar como PDF
          </button>
          <h1>Mapa comparativo de cotação</h1>
          <p>
            <strong>${cotacao.titulo}</strong><br>
            Responsável: ${
              cotacao.criadoPor || '-'
            }
          </p>
          <table>
            <thead>
              <tr>
                <th>Fornecedor</th>
                <th>Faturamento</th>
                <th>Entrega</th>
                <th>Frete</th>
                <th>Valor do frete</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${
                linhas ||
                '<tr><td colspan="6">Sem fornecedores.</td></tr>'
              }
            </tbody>
          </table>
          <p>
            <strong>Justificativa:</strong>
            ${
              cotacao.justificativaEscolha || '-'
            }
          </p>
          <script>
            setTimeout(() => window.print(), 400);
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
                    : 'Gerar solicitação'}
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