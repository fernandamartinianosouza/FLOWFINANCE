import React, { useMemo, useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { formatarReal } from '../utils';
import {
  AlertTriangle,
  CalendarDays,
  Check,
  Clock,
  Copy,
  FileText,
  Search,
  Wallet,
  X,
  Download,
} from 'lucide-react';

import { gerarRelatorioContasPagar } from '../services/relatorioContasPagarService';

type FiltroSituacao =
  | 'todas'
  | 'vencidas'
  | 'a_vencer'
  | 'programadas'
  | 'nao_programadas'
  | 'pagas';

const hojeISO = () =>
  new Date().toISOString().split('T')[0];

const inicioMesISO = () => {
  const hoje = new Date();
  return `${hoje.getFullYear()}-${String(
    hoje.getMonth() + 1
  ).padStart(2, '0')}-01`;
};

const fimMesISO = () => {
  const hoje = new Date();
  const ultimoDia = new Date(
    hoje.getFullYear(),
    hoje.getMonth() + 1,
    0
  );

  return ultimoDia.toISOString().split('T')[0];
};

const diferencaDias = (data: string) => {
  const hoje = new Date(`${hojeISO()}T00:00:00`);
  const alvo = new Date(`${data}T00:00:00`);

  return Math.ceil(
    (alvo.getTime() - hoje.getTime()) /
      (1000 * 60 * 60 * 24)
  );
};

export const AccountsPayableView: React.FC = () => {
  const {
    processos,
    fornecedores,
    empresas,
    programarPagamento,
    registrarPagamento,
    setActiveProcessId,
    setActiveView,
  } = useFinance() as any;

  const hoje = hojeISO();

  const [busca, setBusca] = useState('');
  const [situacao, setSituacao] =
    useState<FiltroSituacao>('todas');
  const [empresaFiltro, setEmpresaFiltro] =
    useState('');
  const [formaFiltro, setFormaFiltro] =
    useState('');
  const [dataInicio, setDataInicio] =
    useState(inicioMesISO());
  const [dataFim, setDataFim] =
    useState(fimMesISO());
  const [pixCopiadoId, setPixCopiadoId] =
    useState<string | null>(null);
  const [processoPagando, setProcessoPagando] =
    useState<any | null>(null);
  const [metodoPagamento, setMetodoPagamento] =
    useState('pix');
  const [comprovante, setComprovante] =
    useState('');
  const [observacaoPagamento, setObservacaoPagamento] =
    useState('');
  const [valorPagamento, setValorPagamento] =
    useState('');
  const [salvandoPagamento, setSalvandoPagamento] =
    useState(false);

  const todasContas = useMemo(
    () =>
      processos.filter((processo: any) =>
        [
          'pagamento',
          'conciliacao',
          'finalizado',
        ].includes(String(processo.status))
      ),
    [processos]
  );

  const contaPaga = (processo: any) =>
    obterSaldoPagar(processo) <= 0.001 ||
    ['conciliacao', 'finalizado'].includes(
      String(processo.status)
    );

  const dataBase = (processo: any) =>
    processo.dataProgramadaPagamento ||
    processo.prazo ||
    '';

  const obterValorPago = (processo: any) =>
    Number(processo.valorPago || 0);

  const obterSaldoPagar = (processo: any) =>
    Math.max(
      Number(processo.valor || 0) -
        obterValorPago(processo),
      0
    );

  const contasVencidas = todasContas.filter(
    (processo: any) =>
      !contaPaga(processo) &&
      dataBase(processo) &&
      dataBase(processo) < hoje
  );

  const contasAVencer = todasContas.filter(
    (processo: any) => {
      if (
        contaPaga(processo) ||
        !dataBase(processo)
      ) {
        return false;
      }

      const dias = diferencaDias(
        dataBase(processo)
      );

      return dias >= 0 && dias <= 7;
    }
  );

  const totalEmAberto = todasContas
    .filter((item: any) => !contaPaga(item))
    .reduce(
      (total: number, item: any) =>
        total + Number(item.valor || 0),
      0
    );

  const totalVencido = contasVencidas.reduce(
    (total: number, item: any) =>
      total + Number(item.valor || 0),
    0
  );

  const totalAVencer = contasAVencer.reduce(
    (total: number, item: any) =>
      total + Number(item.valor || 0),
    0
  );

  const totalPagoPeriodo = todasContas
    .filter((item: any) => {
      if (!contaPaga(item)) return false;

      const data =
        item.dataPagamento || item.prazo || '';

      return (
        (!dataInicio || data >= dataInicio) &&
        (!dataFim || data <= dataFim)
      );
    })
    .reduce(
      (total: number, item: any) =>
        total + Number(item.valor || 0),
      0
    );

  const contasFiltradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    return todasContas
      .filter((processo: any) => {
        const fornecedor = fornecedores.find(
          (item: any) =>
            item.id === processo.fornecedorId
        );

        const empresa = empresas.find(
          (item: any) =>
            item.id === processo.empresaId
        );

        const favorecido =
          processo.tipoPagamento === 'interno'
            ? processo.beneficiarioInterno ||
              'Pagamento interno'
            : fornecedor?.nome || '';

        const correspondeBusca =
          !termo ||
          String(processo.id)
            .toLowerCase()
            .includes(termo) ||
          String(processo.descricao || '')
            .toLowerCase()
            .includes(termo) ||
          String(favorecido)
            .toLowerCase()
            .includes(termo) ||
          String(empresa?.nome || '')
            .toLowerCase()
            .includes(termo);

        if (!correspondeBusca) return false;

        if (
          empresaFiltro &&
          processo.empresaId !== empresaFiltro
        ) {
          return false;
        }

        if (
          formaFiltro &&
          String(
            processo.formaPagamento ||
              processo.metodoPagamento ||
              ''
          ) !== formaFiltro
        ) {
          return false;
        }

        const data =
          processo.dataPagamento ||
          processo.dataProgramadaPagamento ||
          processo.prazo ||
          '';

        if (
          dataInicio &&
          data &&
          data < dataInicio
        ) {
          return false;
        }

        if (
          dataFim &&
          data &&
          data > dataFim
        ) {
          return false;
        }

        if (
          situacao === 'vencidas' &&
          !contasVencidas.some(
            (item: any) =>
              item.id === processo.id
          )
        ) {
          return false;
        }

        if (
          situacao === 'a_vencer' &&
          !contasAVencer.some(
            (item: any) =>
              item.id === processo.id
          )
        ) {
          return false;
        }

        if (
          situacao === 'programadas' &&
          processo.statusProgramacao !==
            'programado'
        ) {
          return false;
        }

        if (
          situacao === 'nao_programadas' &&
          (contaPaga(processo) ||
            processo.statusProgramacao ===
              'programado')
        ) {
          return false;
        }

        if (
          situacao === 'pagas' &&
          !contaPaga(processo)
        ) {
          return false;
        }

        return true;
      })
      .sort((a: any, b: any) =>
        dataBase(a).localeCompare(dataBase(b))
      );
  }, [
    todasContas,
    busca,
    situacao,
    empresaFiltro,
    formaFiltro,
    dataInicio,
    dataFim,
    fornecedores,
    empresas,
    contasVencidas,
    contasAVencer,
  ]);

  const gerarRelatorioPDF = () => {
    try {
      const empresaSelecionada = empresas.find(
        (empresa: any) =>
          empresa.id === empresaFiltro
      );

      const nomesSituacoes: Record<
        FiltroSituacao,
        string
      > = {
        todas: 'Todas as contas',
        vencidas: 'Contas vencidas',
        a_vencer: 'Contas a vencer',
        programadas: 'Contas programadas',
        nao_programadas:
          'Contas não programadas',
        pagas: 'Contas pagas',
      };

      const filtrosAplicados = [
        nomesSituacoes[situacao],
        empresaSelecionada
          ? `Empresa: ${empresaSelecionada.nome}`
          : 'Todas as empresas',
        formaFiltro
          ? `Forma: ${formaFiltro.toUpperCase()}`
          : 'Todas as formas',
        busca.trim()
          ? `Busca: ${busca.trim()}`
          : null,
      ]
        .filter(Boolean)
        .join(' | ');

      gerarRelatorioContasPagar({
        contas: contasFiltradas,
        fornecedores,
        empresas,
        titulo: nomesSituacoes[situacao],
        periodoInicio: dataInicio || undefined,
        periodoFim: dataFim || undefined,
        filtrosDescricao: filtrosAplicados,
      });
    } catch (error: any) {
      console.error(
        'Erro ao gerar relatório de contas a pagar:',
        error
      );

      alert(
        error?.message ||
          'Não foi possível gerar o relatório PDF.'
      );
    }
  };

  const copiarPix = async (
    processoId: string,
    chave?: string | null
  ) => {
    const pix = chave?.trim();

    if (!pix) {
      alert(
        'Esta conta não possui chave PIX cadastrada.'
      );
      return;
    }

    try {
      await navigator.clipboard.writeText(pix);
      setPixCopiadoId(processoId);

      window.setTimeout(
        () => setPixCopiadoId(null),
        1800
      );
    } catch {
      alert(
        'Não foi possível copiar a chave PIX.'
      );
    }
  };

  const programar = async (
    processoId: string
  ) => {
    const input = document.getElementById(
      `data-programacao-${processoId}`
    ) as HTMLInputElement | null;

    if (!input?.value) {
      alert(
        'Informe a data de programação.'
      );
      return;
    }

    await programarPagamento(
      processoId,
      input.value,
      'Contas a Pagar'
    );
  };

  const confirmarPagamento = async () => {
    if (!processoPagando || salvandoPagamento) {
      return;
    }

    const valorNumerico = Number(valorPagamento);
    const saldo = obterSaldoPagar(
      processoPagando
    );

    if (
      !Number.isFinite(valorNumerico) ||
      valorNumerico <= 0
    ) {
      alert(
        'Informe um valor de pagamento válido.'
      );
      return;
    }

    if (valorNumerico > saldo + 0.001) {
      alert(
        `O valor informado é maior que o saldo de ${formatarReal(
          saldo
        )}.`
      );
      return;
    }

    try {
      setSalvandoPagamento(true);

      await registrarPagamento(
        processoPagando.id,
        metodoPagamento,
        valorNumerico,
        comprovante.trim() || undefined,
        observacaoPagamento.trim() || undefined
      );

      setProcessoPagando(null);
      setComprovante('');
      setObservacaoPagamento('');
      setValorPagamento('');
      setMetodoPagamento('pix');
    } finally {
      setSalvandoPagamento(false);
    }
  };

  const abrirModalPagamento = (
    processo: any
  ) => {
    const saldo = obterSaldoPagar(processo);

    setProcessoPagando(processo);
    setMetodoPagamento(
      processo.formaPagamento || 'pix'
    );
    setValorPagamento(
      saldo > 0 ? String(saldo) : ''
    );
    setComprovante('');
    setObservacaoPagamento('');
  };

  const fecharModalPagamento = () => {
    if (salvandoPagamento) return;

    setProcessoPagando(null);
    setComprovante('');
    setObservacaoPagamento('');
    setValorPagamento('');
  };

  const abrirProcesso = (id: string) => {
    setActiveProcessId(id);
    setActiveView('processos');
  };

  return (
    <div
      className="space-y-8"
      id="accounts-payable-view-container"
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A]">
            Contas a Pagar
          </h1>

          <p className="mt-1 text-xs text-slate-400">
            Consulte contas vencidas, a vencer,
            programadas e pagas.
          </p>
        </div>

        <button
          type="button"
          onClick={gerarRelatorioPDF}
          disabled={contasFiltradas.length === 0}
          className="flex items-center justify-center gap-2 rounded-[12px] bg-[#0F172A] px-4 py-2.5 text-xs font-bold text-white shadow-md transition hover:bg-[#1E293B] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Download className="h-4 w-4" />
          Baixar relatório PDF
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card
          titulo="Em aberto"
          valor={formatarReal(totalEmAberto)}
          icon={Wallet}
        />

        <Card
          titulo="Vencidas"
          valor={formatarReal(totalVencido)}
          icon={AlertTriangle}
          classe="text-red-600 bg-red-50"
        />

        <Card
          titulo="A vencer em 7 dias"
          valor={formatarReal(totalAVencer)}
          icon={Clock}
          classe="text-amber-600 bg-amber-50"
        />

        <Card
          titulo="Pago no período"
          valor={formatarReal(
            totalPagoPeriodo
          )}
          icon={Check}
          classe="text-emerald-600 bg-emerald-50"
        />
      </div>

      <div className="rounded-[18px] border border-slate-100 bg-white p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
          <div className="flex items-center gap-2 rounded-[12px] bg-slate-50 px-3.5">
            <Search className="h-4 w-4 text-slate-400" />

            <input
              value={busca}
              onChange={event =>
                setBusca(event.target.value)
              }
              placeholder="Processo, favorecido..."
              className="w-full border-0 bg-transparent py-2.5 text-xs focus:ring-0"
            />
          </div>

          <select
            value={situacao}
            onChange={event =>
              setSituacao(
                event.target
                  .value as FiltroSituacao
              )
            }
            className="rounded-[12px] border-0 bg-slate-50 px-3.5 py-2.5 text-xs"
          >
            <option value="todas">
              Todas
            </option>
            <option value="vencidas">
              Vencidas
            </option>
            <option value="a_vencer">
              A vencer
            </option>
            <option value="programadas">
              Programadas
            </option>
            <option value="nao_programadas">
              Não programadas
            </option>
            <option value="pagas">
              Pagas
            </option>
          </select>

          <select
            value={empresaFiltro}
            onChange={event =>
              setEmpresaFiltro(
                event.target.value
              )
            }
            className="rounded-[12px] border-0 bg-slate-50 px-3.5 py-2.5 text-xs"
          >
            <option value="">
              Todas as empresas
            </option>

            {empresas.map((empresa: any) => (
              <option
                key={empresa.id}
                value={empresa.id}
              >
                {empresa.nome}
              </option>
            ))}
          </select>

          <select
            value={formaFiltro}
            onChange={event =>
              setFormaFiltro(event.target.value)
            }
            className="rounded-[12px] border-0 bg-slate-50 px-3.5 py-2.5 text-xs"
          >
            <option value="">
              Todas as formas
            </option>
            <option value="pix">PIX</option>
            <option value="boleto">
              Boleto
            </option>
            <option value="ted">TED</option>
            <option value="deposito">
              Depósito
            </option>
            <option value="dinheiro">
              Dinheiro
            </option>
            <option value="cartao">
              Cartão
            </option>
          </select>

          <input
            type="date"
            value={dataInicio}
            onChange={event =>
              setDataInicio(event.target.value)
            }
            className="rounded-[12px] border-0 bg-slate-50 px-3.5 py-2.5 text-xs"
            title="Data inicial"
          />

          <input
            type="date"
            value={dataFim}
            onChange={event =>
              setDataFim(event.target.value)
            }
            className="rounded-[12px] border-0 bg-slate-50 px-3.5 py-2.5 text-xs"
            title="Data final"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-[18px] border border-slate-100 bg-white shadow-sm">
        {contasFiltradas.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-xs text-slate-400">
              Nenhuma conta encontrada.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1450px] text-left">
              <thead className="bg-slate-50">
                <tr className="text-[10px] uppercase text-slate-400">
                  <th className="px-4 py-3">
                    Situação
                  </th>
                  <th className="px-4 py-3">
                    Processo
                  </th>
                  <th className="px-4 py-3">
                    Favorecido
                  </th>
                  <th className="px-4 py-3">
                    Empresa
                  </th>
                  <th className="px-4 py-3">
                    Descrição
                  </th>
                  <th className="px-4 py-3">
                    PIX
                  </th>
                  <th className="px-4 py-3">
                    Valor total
                  </th>
                  <th className="px-4 py-3">
                    Pago
                  </th>
                  <th className="px-4 py-3">
                    Saldo
                  </th>
                  <th className="px-4 py-3">
                    Vencimento
                  </th>
                  <th className="px-4 py-3">
                    Programação
                  </th>
                  <th className="px-4 py-3">
                    Pagamento
                  </th>
                  <th className="px-4 py-3 text-right">
                    Ações
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-50">
                {contasFiltradas.map(
                  (processo: any) => {
                    const fornecedor =
                      fornecedores.find(
                        (item: any) =>
                          item.id ===
                          processo.fornecedorId
                      );

                    const empresa =
                      empresas.find(
                        (item: any) =>
                          item.id ===
                          processo.empresaId
                      );

                    const pago =
                      contaPaga(processo);
                    const vencida =
                      !pago &&
                      dataBase(processo) &&
                      dataBase(processo) < hoje;

                    const favorecido =
                      processo.tipoPagamento ===
                      'interno'
                        ? processo.beneficiarioInterno ||
                          'Pagamento interno'
                        : fornecedor?.nome || '-';

                    return (
                      <tr
                        key={processo.id}
                        className="hover:bg-slate-50/60"
                      >
                        <td className="px-4 py-4">
                          <Situacao
                            pago={pago}
                            vencida={Boolean(vencida)}
                            programada={
                              processo.statusProgramacao ===
                              'programado'
                            }
                          />
                        </td>

                        <td className="px-4 py-4 font-mono text-xs font-bold">
                          {processo.id}
                        </td>

                        <td className="px-4 py-4">
                          <p className="text-xs font-semibold text-slate-700">
                            {favorecido}
                          </p>

                          <p className="mt-1 text-[9px] uppercase text-slate-400">
                            {processo.tipoPagamento ===
                            'interno'
                              ? 'Interno'
                              : 'Fornecedor'}
                          </p>
                        </td>

                        <td className="px-4 py-4 text-xs text-slate-600">
                          {empresa?.nome || '-'}
                        </td>

                        <td className="px-4 py-4">
                          <p
                            className="max-w-[220px] truncate text-xs text-slate-600"
                            title={
                              processo.descricao
                            }
                          >
                            {processo.descricao ||
                              '-'}
                          </p>
                        </td>

                        <td className="px-4 py-4">
                          {processo.pixChave ? (
                            <div className="flex min-w-[180px] items-center gap-2">
                              <p
                                className="max-w-[130px] truncate font-mono text-[10px] text-slate-600"
                                title={
                                  processo.pixChave
                                }
                              >
                                {
                                  processo.pixChave
                                }
                              </p>

                              <button
                                type="button"
                                onClick={() =>
                                  copiarPix(
                                    processo.id,
                                    processo.pixChave
                                  )
                                }
                                className={`flex h-8 w-8 items-center justify-center rounded-[9px] ${
                                  pixCopiadoId ===
                                  processo.id
                                    ? 'bg-emerald-50 text-emerald-600'
                                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                }`}
                                title="Copiar PIX"
                              >
                                {pixCopiadoId ===
                                processo.id ? (
                                  <Check className="h-4 w-4" />
                                ) : (
                                  <Copy className="h-4 w-4" />
                                )}
                              </button>
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-400">
                              Não informado
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-4 font-mono text-xs font-bold">
                          {formatarReal(
                            processo.valor
                          )}
                        </td>

                        <td className="px-4 py-4 font-mono text-xs font-semibold text-emerald-600">
                          {formatarReal(
                            obterValorPago(processo)
                          )}
                        </td>

                        <td className="px-4 py-4 font-mono text-xs font-bold text-amber-600">
                          {formatarReal(
                            obterSaldoPagar(processo)
                          )}
                        </td>

                        <td className="px-4 py-4 font-mono text-xs text-slate-500">
                          {processo.prazo || '-'}
                        </td>

                        <td className="px-4 py-4">
                          {pago ? (
                            <span className="text-[10px] text-slate-400">
                              Encerrada
                            </span>
                          ) : (
                            <div className="flex items-center gap-2">
                              <input
                                id={`data-programacao-${processo.id}`}
                                type="date"
                                defaultValue={
                                  processo.dataProgramadaPagamento ||
                                  ''
                                }
                                className="rounded-[9px] border-0 bg-slate-50 px-2 py-2 font-mono text-[10px]"
                              />

                              <button
                                type="button"
                                onClick={() =>
                                  programar(
                                    processo.id
                                  )
                                }
                                className="rounded-[9px] bg-slate-100 px-2.5 py-2 text-[9px] font-bold text-slate-700 hover:bg-slate-200"
                              >
                                Programar
                              </button>
                            </div>
                          )}
                        </td>

                        <td className="px-4 py-4">
                          {pago ? (
                            <div>
                              <p className="font-mono text-[10px] font-semibold text-emerald-600">
                                {processo.dataPagamento ||
                                  'Pago'}
                              </p>

                              <p className="mt-1 text-[9px] uppercase text-slate-400">
                                {processo.metodoPagamento ||
                                  processo.formaPagamento ||
                                  '-'}
                              </p>
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-400">
                              Aguardando
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                abrirProcesso(
                                  processo.id
                                )
                              }
                              className="rounded-[9px] border border-slate-100 bg-white px-3 py-2 text-[9px] font-bold text-slate-600 hover:bg-slate-50"
                            >
                              Detalhes
                            </button>

                            {processo.anexoUrl && (
                              <a
                                href={
                                  processo.anexoUrl
                                }
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-1 rounded-[9px] bg-slate-100 px-3 py-2 text-[9px] font-bold text-slate-600 hover:bg-slate-200"
                              >
                                <FileText className="h-3.5 w-3.5" />
                                Anexo
                              </a>
                            )}

                            {!pago && (
                              <button
                                type="button"
                                onClick={() =>
                                  abrirModalPagamento(
                                    processo
                                  )
                                }
                                className="rounded-[9px] bg-emerald-600 px-3 py-2 text-[9px] font-bold text-white hover:bg-emerald-700"
                              >
                                {obterValorPago(processo) > 0
                                  ? 'Novo pagamento'
                                  : 'Registrar pagamento'}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  }
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {processoPagando && (
        <>
          <div
            className="fixed inset-0 z-50 bg-slate-900/30"
            onClick={fecharModalPagamento}
          />

          <div className="fixed inset-y-0 right-0 z-50 flex h-screen w-full max-w-md flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 p-6">
              <div>
                <h2 className="text-sm font-bold text-[#0F172A]">
                  Registrar pagamento
                </h2>

                <p className="mt-1 text-[10px] text-slate-400">
                  {processoPagando.id} •{' '}
                  {formatarReal(
                    processoPagando.valor
                  )}
                </p>
              </div>

              <button
                type="button"
                onClick={fecharModalPagamento}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto p-6">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <ResumoValor
                  label="Valor total"
                  value={formatarReal(
                    processoPagando.valor
                  )}
                />

                <ResumoValor
                  label="Já pago"
                  value={formatarReal(
                    obterValorPago(
                      processoPagando
                    )
                  )}
                  classe="bg-emerald-50 text-emerald-700"
                />

                <ResumoValor
                  label="Saldo restante"
                  value={formatarReal(
                    obterSaldoPagar(
                      processoPagando
                    )
                  )}
                  classe="bg-amber-50 text-amber-700"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase text-slate-400">
                  Valor deste pagamento
                </label>

                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={obterSaldoPagar(
                    processoPagando
                  )}
                  value={valorPagamento}
                  onChange={event =>
                    setValorPagamento(
                      event.target.value
                    )
                  }
                  placeholder="0,00"
                  className="w-full rounded-[12px] border-0 bg-slate-50 px-3.5 py-2.5 font-mono text-xs font-bold"
                />

                <p className="text-[9px] text-slate-400">
                  Informe um valor menor que o saldo para registrar pagamento parcial.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase text-slate-400">
                  Método
                </label>

                <select
                  value={metodoPagamento}
                  onChange={event =>
                    setMetodoPagamento(
                      event.target.value
                    )
                  }
                  className="w-full rounded-[12px] border-0 bg-slate-50 px-3.5 py-2.5 text-xs"
                >
                  <option value="pix">
                    PIX
                  </option>
                  <option value="boleto">
                    Boleto
                  </option>
                  <option value="ted">
                    TED
                  </option>
                  <option value="dinheiro">
                    Dinheiro
                  </option>
                  <option value="cartao">
                    Cartão
                  </option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase text-slate-400">
                  Comprovante ou observação
                </label>

                <input
                  value={comprovante}
                  onChange={event =>
                    setComprovante(
                      event.target.value
                    )
                  }
                  placeholder="Nome, número ou observação do comprovante"
                  className="w-full rounded-[12px] border-0 bg-slate-50 px-3.5 py-2.5 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase text-slate-400">
                  Observação
                </label>

                <textarea
                  rows={3}
                  value={observacaoPagamento}
                  onChange={event =>
                    setObservacaoPagamento(
                      event.target.value
                    )
                  }
                  placeholder="Observação opcional sobre este pagamento"
                  className="w-full rounded-[12px] border-0 bg-slate-50 px-3.5 py-2.5 text-xs"
                />
              </div>

              <button
                type="button"
                onClick={confirmarPagamento}
                disabled={salvandoPagamento}
                className="w-full rounded-[12px] bg-emerald-600 py-3 text-xs font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {salvandoPagamento
                  ? 'Registrando...'
                  : Number(valorPagamento) <
                      obterSaldoPagar(
                        processoPagando
                      )
                    ? 'Registrar pagamento parcial'
                    : 'Quitar conta'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const Card = ({
  titulo,
  valor,
  icon: Icon,
  classe = 'text-[#0F172A] bg-slate-100',
}: any) => (
  <div className="rounded-[18px] border border-slate-100 bg-white p-5 shadow-sm">
    <div
      className={`flex h-10 w-10 items-center justify-center rounded-xl ${classe}`}
    >
      <Icon className="h-5 w-5" />
    </div>

    <p className="mt-4 text-[10px] font-bold uppercase text-slate-400">
      {titulo}
    </p>

    <p className="mt-1 font-mono text-lg font-bold text-[#0F172A]">
      {valor}
    </p>
  </div>
);

const Situacao = ({
  pago,
  vencida,
  programada,
}: {
  pago: boolean;
  vencida: boolean;
  programada: boolean;
}) => {
  if (pago) {
    return (
      <span className="rounded-full border border-emerald-100 bg-emerald-50 px-2 py-1 text-[9px] font-bold text-emerald-600">
        PAGA
      </span>
    );
  }

  if (vencida) {
    return (
      <span className="rounded-full border border-red-100 bg-red-50 px-2 py-1 text-[9px] font-bold text-red-600">
        VENCIDA
      </span>
    );
  }

  if (programada) {
    return (
      <span className="rounded-full border border-blue-100 bg-blue-50 px-2 py-1 text-[9px] font-bold text-blue-600">
        PROGRAMADA
      </span>
    );
  }

  return (
    <span className="rounded-full border border-amber-100 bg-amber-50 px-2 py-1 text-[9px] font-bold text-amber-600">
      A VENCER
    </span>
  );
};

const ResumoValor = ({
  label,
  value,
  classe = 'bg-slate-50 text-[#0F172A]',
}: {
  label: string;
  value: string;
  classe?: string;
}) => (
  <div
    className={`rounded-[12px] p-3 ${classe}`}
  >
    <p className="text-[9px] font-bold uppercase opacity-70">
      {label}
    </p>

    <p className="mt-1 font-mono text-sm font-bold">
      {value}
    </p>
  </div>
);

export default AccountsPayableView;