import React, { useEffect, useMemo, useRef, useState } from 'react';
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
  RefreshCw,
  RotateCcw,
  Upload,
  FileSpreadsheet,
  CheckSquare2,
  Square,
  ShieldAlert,
  Loader2,
} from 'lucide-react';

import { gerarRelatorioContasPagar } from '../services/relatorioContasPagarService';
import {
  ContaPagarImportPreview,
  contasPagarImportService,
  normalizarNomeImportacao,
} from '../services/contasPagarImportService';

type MetodoPagamentoMassa =
  | 'cadastrado'
  | 'pix'
  | 'ted'
  | 'boleto'
  | 'dinheiro'
  | 'cartao';

const ITENS_POR_PAGINA = 30;

type FiltroSituacao =
  | 'todas'
  | 'vencidas'
  | 'a_vencer'
  | 'programadas'
  | 'nao_programadas'
  | 'pagas';

const hojeISO = () =>
  new Date().toISOString().split('T')[0];

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
    organizacaoAtivaId,
    empresaAtivaId,
    processos,
    fornecedores,
    empresas,
    planosFinanceiros,
    cadastrarPlanoFinanceiro,
    cadastrarFornecedor,
    criarNovaConta,
    programarPagamento,
    registrarPagamento,
    desfazerUltimoPagamento,
    setActiveProcessId,
    setActiveView,
    recarregarDados,
    loadingFinanceiro,
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
    useState('');
  const [dataFim, setDataFim] =
    useState('');
  const [paginaAtual, setPaginaAtual] =
    useState(1);
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
  const [processoEstornando, setProcessoEstornando] =
    useState<any | null>(null);
  const [motivoEstorno, setMotivoEstorno] = useState('');
  const [confirmacaoEstorno, setConfirmacaoEstorno] = useState('');
  const [estornandoPagamento, setEstornandoPagamento] =
    useState(false);
  const [atualizando, setAtualizando] =
    useState(false);

  const [contasSelecionadas, setContasSelecionadas] =
    useState<Set<string>>(new Set());
  const [modalPagamentoMassaOpen, setModalPagamentoMassaOpen] =
    useState(false);
  const [metodoPagamentoMassa, setMetodoPagamentoMassa] =
    useState<MetodoPagamentoMassa>('cadastrado');
  const [observacaoPagamentoMassa, setObservacaoPagamentoMassa] =
    useState('');
  const [confirmacaoPagamentoMassa, setConfirmacaoPagamentoMassa] =
    useState('');
  const [pagandoEmMassa, setPagandoEmMassa] =
    useState(false);
  const [progressoPagamentoMassa, setProgressoPagamentoMassa] =
    useState({ atual: 0, total: 0 });

  const inputImportacaoRef =
    useRef<HTMLInputElement>(null);
  const [modalImportacaoOpen, setModalImportacaoOpen] =
    useState(false);
  const [arquivoImportacaoNome, setArquivoImportacaoNome] =
    useState('');
  const [previewImportacao, setPreviewImportacao] =
    useState<ContaPagarImportPreview[]>([]);
  const [importandoContas, setImportandoContas] =
    useState(false);

  useEffect(() => {
    recarregarDados?.();
  }, [recarregarDados]);

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

  const totalPaginas = Math.max(
    1,
    Math.ceil(contasFiltradas.length / ITENS_POR_PAGINA)
  );

  const contasPaginadas = useMemo(() => {
    const inicio = (paginaAtual - 1) * ITENS_POR_PAGINA;

    return contasFiltradas.slice(
      inicio,
      inicio + ITENS_POR_PAGINA
    );
  }, [contasFiltradas, paginaAtual]);

  const primeiroItemPagina =
    contasFiltradas.length === 0
      ? 0
      : (paginaAtual - 1) * ITENS_POR_PAGINA + 1;

  const ultimoItemPagina = Math.min(
    paginaAtual * ITENS_POR_PAGINA,
    contasFiltradas.length
  );

  useEffect(() => {
    setPaginaAtual(1);
  }, [
    busca,
    situacao,
    empresaFiltro,
    formaFiltro,
    dataInicio,
    dataFim,
  ]);

  useEffect(() => {
    if (paginaAtual > totalPaginas) {
      setPaginaAtual(totalPaginas);
    }
  }, [paginaAtual, totalPaginas]);

  const contasElegiveisPagamentoMassa = useMemo(
    () =>
      contasFiltradas.filter(
        (processo: any) =>
          !contaPaga(processo) &&
          obterSaldoPagar(processo) > 0.001
      ),
    [contasFiltradas]
  );

  const contasSelecionadasDetalhes = useMemo(
    () =>
      contasElegiveisPagamentoMassa.filter(
        (processo: any) =>
          contasSelecionadas.has(String(processo.id))
      ),
    [contasElegiveisPagamentoMassa, contasSelecionadas]
  );

  const totalSelecionadoPagamentoMassa = useMemo(
    () =>
      contasSelecionadasDetalhes.reduce(
        (total: number, processo: any) =>
          total + obterSaldoPagar(processo),
        0
      ),
    [contasSelecionadasDetalhes]
  );

  const todasElegiveisSelecionadas =
    contasElegiveisPagamentoMassa.length > 0 &&
    contasElegiveisPagamentoMassa.every(
      (processo: any) =>
        contasSelecionadas.has(String(processo.id))
    );

  useEffect(() => {
    const idsElegiveis = new Set(
      contasElegiveisPagamentoMassa.map(
        (processo: any) => String(processo.id)
      )
    );

    setContasSelecionadas(anteriores => {
      const proximas = new Set(
        [...anteriores].filter(id => idsElegiveis.has(id))
      );

      if (
        proximas.size === anteriores.size &&
        [...proximas].every(id => anteriores.has(id))
      ) {
        return anteriores;
      }

      return proximas;
    });
  }, [contasElegiveisPagamentoMassa]);

  const alternarContaSelecionada = (processoId: string) => {
    setContasSelecionadas(anteriores => {
      const proximas = new Set(anteriores);

      if (proximas.has(processoId)) {
        proximas.delete(processoId);
      } else {
        proximas.add(processoId);
      }

      return proximas;
    });
  };

  const alternarTodasContas = () => {
    if (todasElegiveisSelecionadas) {
      setContasSelecionadas(new Set());
      return;
    }

    setContasSelecionadas(
      new Set(
        contasElegiveisPagamentoMassa.map(
          (processo: any) => String(processo.id)
        )
      )
    );
  };

  const abrirPagamentoMassa = () => {
    if (contasSelecionadasDetalhes.length === 0) {
      alert('Selecione pelo menos uma conta em aberto.');
      return;
    }

    setMetodoPagamentoMassa('cadastrado');
    setObservacaoPagamentoMassa('');
    setConfirmacaoPagamentoMassa('');
    setProgressoPagamentoMassa({
      atual: 0,
      total: contasSelecionadasDetalhes.length,
    });
    setModalPagamentoMassaOpen(true);
  };

  const fecharPagamentoMassa = () => {
    if (pagandoEmMassa) return;

    setModalPagamentoMassaOpen(false);
    setConfirmacaoPagamentoMassa('');
    setObservacaoPagamentoMassa('');
  };

  const normalizarMetodoPagamentoMassa = (processo: any) => {
    const metodo = String(
      processo.metodoPagamento ||
        processo.formaPagamento ||
        'pix'
    ).toLowerCase();

    if (
      ['pix', 'ted', 'boleto', 'dinheiro', 'cartao'].includes(
        metodo
      )
    ) {
      return metodo as Exclude<
        MetodoPagamentoMassa,
        'cadastrado'
      >;
    }

    return 'pix';
  };

  const confirmarPagamentoMassa = async () => {
    if (pagandoEmMassa) return;

    if (confirmacaoPagamentoMassa.trim().toUpperCase() !== 'PAGAR') {
      alert('Digite PAGAR para confirmar a operação.');
      return;
    }

    const contas = [...contasSelecionadasDetalhes];

    if (contas.length === 0) {
      alert('Nenhuma conta elegível permanece selecionada.');
      fecharPagamentoMassa();
      return;
    }

    const confirmacaoFinal = window.confirm(
      `CONFIRMAÇÃO FINAL\n\nVocê está prestes a registrar o pagamento integral de ${contas.length} conta(s), totalizando ${formatarReal(
        totalSelecionadoPagamentoMassa
      )}.\n\nEssa ação será registrada na auditoria e pode gerar pagamentos parcialmente concluídos se houver falha de conexão durante o processamento. Deseja continuar?`
    );

    if (!confirmacaoFinal) return;

    const sucessos: string[] = [];
    const falhas: Array<{ id: string; erro: string }> = [];

    try {
      setPagandoEmMassa(true);
      setProgressoPagamentoMassa({ atual: 0, total: contas.length });

      for (let indice = 0; indice < contas.length; indice += 1) {
        const processo = contas[indice];
        const processoId = String(processo.id);
        const saldo = obterSaldoPagar(processo);
        const metodo =
          metodoPagamentoMassa === 'cadastrado'
            ? normalizarMetodoPagamentoMassa(processo)
            : metodoPagamentoMassa;

        setProgressoPagamentoMassa({
          atual: indice + 1,
          total: contas.length,
        });

        try {
          await registrarPagamento(
            processoId,
            metodo,
            saldo,
            undefined,
            [
              'Pagamento integral registrado em massa.',
              observacaoPagamentoMassa.trim(),
            ]
              .filter(Boolean)
              .join(' ')
          );

          sucessos.push(processoId);
        } catch (error: any) {
          falhas.push({
            id: processoId,
            erro:
              error?.message ||
              'Não foi possível registrar o pagamento.',
          });
        }
      }

      await recarregarDados?.();

      setContasSelecionadas(anteriores => {
        const proximas = new Set(anteriores);
        sucessos.forEach(id => proximas.delete(id));
        return proximas;
      });

      if (falhas.length === 0) {
        alert(
          `${sucessos.length} pagamento(s) registrado(s) com sucesso, no total de ${formatarReal(
            totalSelecionadoPagamentoMassa
          )}.`
        );
        setModalPagamentoMassaOpen(false);
        setConfirmacaoPagamentoMassa('');
        setObservacaoPagamentoMassa('');
        return;
      }

      const resumoFalhas = falhas
        .slice(0, 5)
        .map(item => `${item.id}: ${item.erro}`)
        .join('\n');

      alert(
        `${sucessos.length} pagamento(s) concluído(s).\n${falhas.length} pagamento(s) falharam.\n\n${resumoFalhas}${
          falhas.length > 5
            ? `\n... e mais ${falhas.length - 5} falha(s).`
            : ''
        }`
      );
    } finally {
      setPagandoEmMassa(false);
    }
  };

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

  const atualizarDados = async () => {
    if (
      atualizando ||
      loadingFinanceiro
    ) {
      return;
    }

    try {
      setAtualizando(true);
      await recarregarDados();
    } finally {
      setAtualizando(false);
    }
  };

  const limparFiltros = () => {
    setBusca('');
    setSituacao('todas');
    setEmpresaFiltro('');
    setFormaFiltro('');
    setDataInicio('');
    setDataFim('');
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

  const abrirModalEstorno = (processo: any) => {
    if (obterValorPago(processo) <= 0.001) {
      alert('Esta conta não possui pagamento ativo para desfazer.');
      return;
    }

    setProcessoEstornando(processo);
    setMotivoEstorno('');
    setConfirmacaoEstorno('');
  };

  const fecharModalEstorno = () => {
    if (estornandoPagamento) return;

    setProcessoEstornando(null);
    setMotivoEstorno('');
    setConfirmacaoEstorno('');
  };

  const confirmarEstorno = async () => {
    if (!processoEstornando || estornandoPagamento) return;

    if (!motivoEstorno.trim()) {
      alert('Informe o motivo do estorno.');
      return;
    }

    if (confirmacaoEstorno.trim().toUpperCase() !== 'DESFAZER') {
      alert('Digite DESFAZER para confirmar.');
      return;
    }

    const confirmado = window.confirm(
      `Confirma o estorno do último pagamento da conta ${processoEstornando.id}?\n\nA operação ficará registrada na auditoria.`
    );

    if (!confirmado) return;

    try {
      setEstornandoPagamento(true);
      const identificadorProcesso = String(
        processoEstornando.dbId ??
          processoEstornando.processoDbId ??
          processoEstornando.processo_id ??
          processoEstornando.id
      ).trim();

      if (!identificadorProcesso) {
        throw new Error(
          'Não foi possível identificar o processo para desfazer o pagamento.'
        );
      }

      await desfazerUltimoPagamento(
        identificadorProcesso,
        motivoEstorno.trim()
      );

      alert('Pagamento desfeito com sucesso.');
      setProcessoEstornando(null);
      setMotivoEstorno('');
      setConfirmacaoEstorno('');
    } catch (error: any) {
      alert(
        error?.message || 'Não foi possível desfazer o pagamento.'
      );
    } finally {
      setEstornandoPagamento(false);
    }
  };

  const abrirProcesso = (id: string) => {
    setActiveProcessId(id);
    setActiveView('processos');
  };


  const empresaImportacaoId =
    empresaFiltro ||
    empresaAtivaId ||
    empresas?.[0]?.id ||
    empresas?.[0]?.dbId ||
    '';

  const fecharImportacao = () => {
    if (importandoContas) return;

    setModalImportacaoOpen(false);
    setArquivoImportacaoNome('');
    setPreviewImportacao([]);

    if (inputImportacaoRef.current) {
      inputImportacaoRef.current.value = '';
    }
  };

  const selecionarPlanilhaImportacao = async (
    arquivo?: File
  ) => {
    if (!arquivo) return;

    try {
      const linhas =
        await contasPagarImportService.lerArquivo(
          arquivo
        );

      setArquivoImportacaoNome(arquivo.name);
      setPreviewImportacao(linhas);
      setModalImportacaoOpen(true);
    } catch (error: any) {
      console.error(
        'Erro ao ler planilha de contas a pagar:',
        error
      );

      alert(
        error?.message ||
          'Não foi possível ler a planilha.'
      );
    } finally {
      if (inputImportacaoRef.current) {
        inputImportacaoRef.current.value = '';
      }
    }
  };

  const obterIdCadastro = (resultado: any) =>
    String(
      resultado?.id ??
        resultado?.dbId ??
        resultado?.data?.id ??
        resultado?.data?.dbId ??
        ''
    );

  const confirmarImportacaoContas = async () => {
    if (!empresaImportacaoId) {
      alert(
        'Selecione uma empresa antes de importar.'
      );
      return;
    }

    if (
      typeof cadastrarPlanoFinanceiro !== 'function' ||
      typeof cadastrarFornecedor !== 'function' ||
      typeof criarNovaConta !== 'function'
    ) {
      alert(
        'O FinanceContext precisa disponibilizar cadastrarPlanoFinanceiro, cadastrarFornecedor e criarNovaConta.'
      );
      return;
    }

    const validas = previewImportacao.filter(
      item => item.status === 'valido'
    );

    if (validas.length === 0) {
      alert('Não há registros válidos para importar.');
      return;
    }

    try {
      setImportandoContas(true);

      const planosMap = new Map<string, string>();

      (planosFinanceiros || []).forEach(
        (plano: any) => {
          const id = String(
            plano.id ?? plano.dbId ?? ''
          );

          if (id) {
            planosMap.set(
              normalizarNomeImportacao(
                plano.nome || ''
              ),
              id
            );
          }
        }
      );

      const fornecedoresMap = new Map<string, string>();

      (fornecedores || []).forEach(
        (fornecedor: any) => {
          const id = String(
            fornecedor.id ??
              fornecedor.dbId ??
              ''
          );

          if (id) {
            fornecedoresMap.set(
              normalizarNomeImportacao(
                fornecedor.nome || ''
              ),
              id
            );
          }
        }
      );

      const chavesCriadas = new Set<string>();
      let criadas = 0;
      let duplicadas = 0;

      for (const linha of validas) {
        const chavePlano =
          normalizarNomeImportacao(
            linha.planoConta
          );

        let planoId = planosMap.get(chavePlano);

        if (!planoId) {
          const resultadoPlano =
            await cadastrarPlanoFinanceiro({
              nome: linha.planoConta,
              descricao:
                'Criado automaticamente pela importação de contas a pagar.',
              orcamentoAnual: 0,
              limiteAnual: 0,
              tetoAnual: 0,
              tetoMensal: 0,
              utilizado: 0,
              comprometido: 0,
            });

          planoId = obterIdCadastro(resultadoPlano);

          if (!planoId) {
            planoId =
              await contasPagarImportService.buscarPlano({
                organizacaoId:
                  organizacaoAtivaId || undefined,
                empresaId: empresaImportacaoId,
                nome: linha.planoConta,
              });
          }

          if (!planoId) {
            throw new Error(
              `O plano "${linha.planoConta}" foi criado, mas não foi possível localizar o ID no banco.`
            );
          }

          planosMap.set(chavePlano, planoId);
        }

        const chaveFornecedor =
          normalizarNomeImportacao(
            linha.fornecedor
          );

        let fornecedorId =
          fornecedoresMap.get(chaveFornecedor);

        let fornecedorExistente = (fornecedores || []).find(
          (item: any) =>
            normalizarNomeImportacao(item.nome || '') ===
            chaveFornecedor
        );

        if (!fornecedorId) {
          const identificadorFornecedor =
            `SEM-CNPJ-${Date.now()}-${linha.linha}`;

          const resultadoFornecedor =
            await cadastrarFornecedor({
              nome: linha.fornecedor,
              razaoSocial: linha.fornecedor,
              cnpj: identificadorFornecedor,
              cnpjCpf: identificadorFornecedor,
              email: '',
              telefone: '',
              pix: linha.pix || '',
              pixChave: linha.pix || '',
              ativo: true,
            } as any);

          fornecedorId =
            obterIdCadastro(resultadoFornecedor);

          if (!fornecedorId) {
            fornecedorId =
              await contasPagarImportService.buscarFornecedor({
                organizacaoId:
                  organizacaoAtivaId || undefined,
                empresaId: empresaImportacaoId,
                nome: linha.fornecedor,
              });
          }

          if (!fornecedorId) {
            throw new Error(
              `O fornecedor "${linha.fornecedor}" foi criado, mas não foi possível localizar o ID no banco.`
            );
          }

          fornecedoresMap.set(
            chaveFornecedor,
            fornecedorId
          );

          fornecedorExistente = resultadoFornecedor || {
            id: fornecedorId,
            nome: linha.fornecedor,
            pix: linha.pix || '',
            pixChave: linha.pix || '',
          };
        }

        const pixConta =
          linha.pix ||
          fornecedorExistente?.pix ||
          fornecedorExistente?.pixChave ||
          fornecedorExistente?.chavePix ||
          '';

        const chaveDuplicidade = [
          empresaImportacaoId,
          fornecedorId,
          planoId,
          linha.vencimento,
          linha.parcela,
          linha.valor.toFixed(2),
        ].join('|');

        const duplicadaCarregada = processos.some(
          (processo: any) => {
            const parcelaProcesso = String(
              processo.parcela ??
                processo.numeroParcela ??
                ''
            ).trim();

            return (
              String(
                processo.empresaId ??
                  processo.empresa_id ??
                  ''
              ) === String(empresaImportacaoId) &&
              String(
                processo.fornecedorId ??
                  processo.fornecedor_id ??
                  ''
              ) === String(fornecedorId) &&
              String(
                processo.planoFinanceiroId ??
                  processo.plano_financeiro_id ??
                  processo.planoId ??
                  ''
              ) === String(planoId) &&
              String(
                processo.prazo ??
                  processo.vencimento ??
                  ''
              ).slice(0, 10) ===
                linha.vencimento &&
              parcelaProcesso === linha.parcela &&
              Math.abs(
                Number(processo.valor || 0) -
                  linha.valor
              ) < 0.001
            );
          }
        );

        if (
          duplicadaCarregada ||
          chavesCriadas.has(chaveDuplicidade)
        ) {
          duplicadas += 1;
          continue;
        }

        await criarNovaConta({
          organizacaoId:
            organizacaoAtivaId || undefined,
          empresaId: empresaImportacaoId,
          fornecedorId,
          planoFinanceiroId: planoId,
          planoId,
          descricao: `${linha.fornecedor} • Parcela ${linha.parcela}`,
          valor: linha.valor,
          prazo: linha.vencimento,
          vencimento: linha.vencimento,
          parcela: linha.parcela,
          numeroParcela: linha.parcela,
          status: 'pagamento',
          tipoPagamento: 'fornecedor',
          statusProgramacao: 'nao_programado',
          formaPagamento: pixConta ? 'pix' : 'boleto',
          metodoPagamento: pixConta ? 'pix' : 'boleto',
          pixChave: pixConta || null,
          pixFavorecido: linha.fornecedor,
          urgencia: 'media',
          origem: 'importacao_excel',
          observacao: `Importado do arquivo ${arquivoImportacaoNome}`,
        });

        chavesCriadas.add(chaveDuplicidade);
        criadas += 1;
      }

      await recarregarDados?.();

      setModalImportacaoOpen(false);
      setPreviewImportacao([]);
      setArquivoImportacaoNome('');

      alert(
        `${criadas} conta(s) criada(s). ${duplicadas} duplicada(s) ignorada(s).`
      );
    } catch (error: any) {
      console.error(
        'Erro ao importar contas a pagar:',
        error
      );

      alert(
        error?.message ||
          'Não foi possível concluir a importação.'
      );
    } finally {
      setImportandoContas(false);
    }
  };

  const totalImportacaoValido =
    previewImportacao.filter(
      item => item.status === 'valido'
    ).length;

  const totalImportacaoAtencao =
    previewImportacao.length -
    totalImportacaoValido;

  return (
    <div
      className="space-y-5 lg:space-y-8"
      id="accounts-payable-view-container"
    >
      <input
        ref={inputImportacaoRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={event =>
          selecionarPlanilhaImportacao(
            event.target.files?.[0]
          )
        }
      />

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#0F172A] sm:text-2xl">
            Contas a Pagar
          </h1>

          <p className="mt-1 text-xs text-slate-400">
            Consulte contas vencidas, a vencer,
            programadas e pagas.
          </p>
        </div>

        <div className="flex w-full flex-wrap gap-2 md:w-auto md:justify-end">
          <a
            href="/modelos/modelo_importacao_contas_pagar.xlsx"
            download
            className="flex flex-1 items-center justify-center gap-2 rounded-[12px] border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 transition hover:bg-slate-50 md:flex-none"
          >
            <Download className="h-4 w-4" />
            Modelo
          </a>

          <button
            type="button"
            onClick={() =>
              inputImportacaoRef.current?.click()
            }
            className="flex flex-1 items-center justify-center gap-2 rounded-[12px] bg-blue-50 px-4 py-2.5 text-xs font-bold text-blue-700 transition hover:bg-blue-100 md:flex-none"
          >
            <Upload className="h-4 w-4" />
            Importar Excel
          </button>

          <button
            type="button"
            onClick={atualizarDados}
            disabled={
              atualizando ||
              loadingFinanceiro
            }
            className="flex flex-1 items-center justify-center gap-2 rounded-[12px] bg-slate-100 px-4 py-2.5 text-xs font-bold text-slate-600 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50 md:flex-none"
          >
            <RefreshCw
              className={`h-4 w-4 ${
                atualizando ||
                loadingFinanceiro
                  ? 'animate-spin'
                  : ''
              }`}
            />
            Atualizar
          </button>

          <button
            type="button"
            onClick={abrirPagamentoMassa}
            disabled={contasSelecionadasDetalhes.length === 0}
            className="flex flex-1 items-center justify-center gap-2 rounded-[12px] bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-md transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40 md:flex-none"
            title="Registrar pagamento integral das contas selecionadas"
          >
            <CheckSquare2 className="h-4 w-4" />
            Pagar selecionadas
            {contasSelecionadasDetalhes.length > 0 && (
              <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px]">
                {contasSelecionadasDetalhes.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={gerarRelatorioPDF}
            disabled={
              contasFiltradas.length === 0
            }
            className="flex flex-1 items-center justify-center gap-2 rounded-[12px] bg-[#0F172A] px-4 py-2.5 text-xs font-bold text-white shadow-md transition hover:bg-[#1E293B] disabled:cursor-not-allowed disabled:opacity-50 md:flex-none"
          >
            <Download className="h-4 w-4" />
            PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-2 xl:grid-cols-4">
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
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-7">
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

          <button
            type="button"
            onClick={limparFiltros}
            className="flex items-center justify-center gap-2 rounded-[12px] bg-slate-100 px-3.5 py-2.5 text-xs font-bold text-slate-600 transition hover:bg-slate-200"
          >
            <RotateCcw className="h-4 w-4" />
            Limpar
          </button>
        </div>
      </div>

      {contasElegiveisPagamentoMassa.length > 0 && (
        <div className="flex flex-col gap-3 rounded-[16px] border border-emerald-100 bg-emerald-50/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold text-emerald-800">
              Pagamento em massa
            </p>
            <p className="mt-1 text-[10px] text-emerald-700">
              {contasSelecionadasDetalhes.length} conta(s) selecionada(s) • {formatarReal(
                totalSelecionadoPagamentoMassa
              )}
            </p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={alternarTodasContas}
              className="rounded-xl border border-emerald-200 bg-white px-3 py-2 text-[10px] font-bold text-emerald-700 hover:bg-emerald-100"
            >
              {todasElegiveisSelecionadas
                ? 'Limpar seleção'
                : 'Selecionar contas filtradas'}
            </button>

            <button
              type="button"
              onClick={abrirPagamentoMassa}
              disabled={contasSelecionadasDetalhes.length === 0}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-[10px] font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Revisar pagamento
            </button>
          </div>
        </div>
      )}

      <div className="hidden overflow-hidden rounded-[18px] border border-slate-100 bg-white shadow-sm lg:block">
        {contasFiltradas.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-xs text-slate-400">
              Nenhuma conta encontrada.
            </p>
          </div>
        ) : (
          <div className="w-full">
            <div className="grid grid-cols-[52px_1.05fr_1.25fr_0.8fr_1fr_1.35fr] items-center gap-3 border-b border-slate-100 bg-slate-50 px-4 py-3 text-[9px] font-bold uppercase tracking-wide text-slate-400">
              <button
                type="button"
                onClick={alternarTodasContas}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-200"
                title={
                  todasElegiveisSelecionadas
                    ? 'Limpar seleção'
                    : 'Selecionar todas as contas filtradas'
                }
              >
                {todasElegiveisSelecionadas ? (
                  <CheckSquare2 className="h-4 w-4 text-emerald-600" />
                ) : (
                  <Square className="h-4 w-4" />
                )}
              </button>

              <span>Conta</span>
              <span>Favorecido e descrição</span>
              <span>Empresa e PIX</span>
              <span>Valores e vencimento</span>
              <span>Programação, pagamento e ações</span>
            </div>

            <div className="divide-y divide-slate-100">
              {contasPaginadas.map((processo: any) => {
                const fornecedor = fornecedores.find(
                  (item: any) =>
                    item.id === processo.fornecedorId
                );

                const empresa = empresas.find(
                  (item: any) =>
                    item.id === processo.empresaId
                );

                const pago = contaPaga(processo);
                const vencida =
                  !pago &&
                  dataBase(processo) &&
                  dataBase(processo) < hoje;

                const favorecido =
                  processo.tipoPagamento === 'interno'
                    ? processo.beneficiarioInterno ||
                      'Pagamento interno'
                    : fornecedor?.nome || '-';

                return (
                  <div
                    key={processo.id}
                    className={`grid grid-cols-[52px_1.05fr_1.25fr_0.8fr_1fr_1.35fr] items-start gap-3 px-4 py-4 transition hover:bg-slate-50/70 ${
                      contasSelecionadas.has(String(processo.id))
                        ? 'bg-emerald-50/50'
                        : ''
                    }`}
                  >
                    <div className="flex flex-col items-center gap-2 pt-0.5">
                      {!pago ? (
                        <button
                          type="button"
                          onClick={() =>
                            alternarContaSelecionada(
                              String(processo.id)
                            )
                          }
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-emerald-100"
                          title="Selecionar para pagamento em massa"
                        >
                          {contasSelecionadas.has(
                            String(processo.id)
                          ) ? (
                            <CheckSquare2 className="h-5 w-5 text-emerald-600" />
                          ) : (
                            <Square className="h-5 w-5" />
                          )}
                        </button>
                      ) : (
                        <Check className="h-4 w-4 text-emerald-500" />
                      )}

                      <Situacao
                        pago={pago}
                        vencida={Boolean(vencida)}
                        programada={
                          processo.statusProgramacao ===
                          'programado'
                        }
                      />
                    </div>

                    <div className="min-w-0">
                      <p className="break-all font-mono text-[10px] font-bold leading-relaxed text-slate-700">
                        {processo.id}
                      </p>

                      <p className="mt-2 text-[9px] font-bold uppercase text-slate-400">
                        {processo.tipoPagamento === 'interno'
                          ? 'Pagamento interno'
                          : 'Fornecedor'}
                      </p>
                    </div>

                    <div className="min-w-0">
                      <p className="text-xs font-bold leading-snug text-slate-800">
                        {favorecido}
                      </p>

                      <p className="mt-1 break-words text-[10px] leading-relaxed text-slate-500">
                        {processo.descricao || '-'}
                      </p>
                    </div>

                    <div className="min-w-0">
                      <p className="break-words text-[10px] font-semibold leading-relaxed text-slate-600">
                        {empresa?.nome || '-'}
                      </p>

                      <div className="mt-2">
                        {processo.pixChave ? (
                          <div className="flex items-start gap-1.5">
                            <p className="min-w-0 flex-1 break-all font-mono text-[9px] leading-relaxed text-slate-500">
                              {processo.pixChave}
                            </p>

                            <button
                              type="button"
                              onClick={() =>
                                copiarPix(
                                  processo.id,
                                  processo.pixChave
                                )
                              }
                              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                                pixCopiadoId === processo.id
                                  ? 'bg-emerald-50 text-emerald-600'
                                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                              }`}
                              title="Copiar PIX"
                            >
                              {pixCopiadoId === processo.id ? (
                                <Check className="h-3.5 w-3.5" />
                              ) : (
                                <Copy className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </div>
                        ) : (
                          <span className="text-[9px] text-slate-400">
                            PIX não informado
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="min-w-0 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[9px] font-bold uppercase text-slate-400">
                          Total
                        </span>
                        <span className="font-mono text-[10px] font-bold text-slate-800">
                          {formatarReal(processo.valor)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[9px] font-bold uppercase text-slate-400">
                          Pago
                        </span>
                        <span className="font-mono text-[10px] font-semibold text-emerald-600">
                          {formatarReal(
                            obterValorPago(processo)
                          )}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[9px] font-bold uppercase text-slate-400">
                          Saldo
                        </span>
                        <span className="font-mono text-[10px] font-bold text-amber-600">
                          {formatarReal(
                            obterSaldoPagar(processo)
                          )}
                        </span>
                      </div>

                      <div className="mt-2 rounded-lg bg-slate-50 px-2.5 py-2">
                        <p className="text-[8px] font-bold uppercase text-slate-400">
                          Vencimento
                        </p>
                        <p className="mt-1 font-mono text-[10px] font-semibold text-slate-600">
                          {processo.prazo || '-'}
                        </p>
                      </div>
                    </div>

                    <div className="min-w-0 space-y-2">
                      {pago ? (
                        <div className="rounded-xl bg-emerald-50 p-2.5">
                          <p className="font-mono text-[10px] font-semibold text-emerald-700">
                            {processo.dataPagamento || 'Pago'}
                          </p>
                          <p className="mt-1 text-[8px] font-bold uppercase text-emerald-600">
                            {processo.metodoPagamento ||
                              processo.formaPagamento ||
                              '-'}
                          </p>
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-center gap-2">
                          <input
                            id={`data-programacao-${processo.id}`}
                            type="date"
                            defaultValue={
                              processo.dataProgramadaPagamento ||
                              ''
                            }
                            className="min-w-[125px] flex-1 rounded-[9px] border-0 bg-slate-50 px-2 py-2 font-mono text-[9px]"
                          />

                          <button
                            type="button"
                            onClick={() =>
                              programar(processo.id)
                            }
                            className="rounded-[9px] bg-slate-100 px-2.5 py-2 text-[9px] font-bold text-slate-700 hover:bg-slate-200"
                          >
                            Programar
                          </button>
                        </div>
                      )}

                      {!pago && (
                        <p className="text-[8px] text-slate-400">
                          Pagamento aguardando registro
                        </p>
                      )}

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            abrirProcesso(processo.id)
                          }
                          className="rounded-[9px] border border-slate-200 bg-white px-3 py-2 text-[9px] font-bold text-slate-600 hover:bg-slate-50"
                        >
                          Detalhes
                        </button>

                        {processo.anexoUrl && (
                          <a
                            href={processo.anexoUrl}
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
                              abrirModalPagamento(processo)
                            }
                            className="rounded-[9px] bg-emerald-600 px-3 py-2 text-[9px] font-bold text-white hover:bg-emerald-700"
                          >
                            {obterValorPago(processo) > 0
                              ? 'Novo pagamento'
                              : 'Registrar pagamento'}
                          </button>
                        )}

                        {obterValorPago(processo) > 0.001 && (
                          <button
                            type="button"
                            onClick={() => abrirModalEstorno(processo)}
                            className="rounded-[9px] border border-red-200 bg-red-50 px-3 py-2 text-[9px] font-bold text-red-700 hover:bg-red-100"
                          >
                            Desfazer pagamento
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>


      <div className="space-y-3 lg:hidden">
        {contasFiltradas.length === 0 ? (
          <div className="rounded-[18px] border border-slate-100 bg-white p-8 text-center shadow-sm">
            <p className="text-xs text-slate-400">
              Nenhuma conta encontrada.
            </p>
          </div>
        ) : (
          contasPaginadas.map((processo: any) => {
            const fornecedor = fornecedores.find(
              (item: any) =>
                item.id === processo.fornecedorId
            );

            const empresa = empresas.find(
              (item: any) =>
                item.id === processo.empresaId
            );

            const pago = contaPaga(processo);

            const vencida =
              !pago &&
              dataBase(processo) &&
              dataBase(processo) < hoje;

            const favorecido =
              processo.tipoPagamento === 'interno'
                ? processo.beneficiarioInterno ||
                  'Pagamento interno'
                : fornecedor?.nome || '-';

            return (
              <article
                key={processo.id}
                className={`rounded-[18px] border bg-white p-4 shadow-sm ${
                  contasSelecionadas.has(String(processo.id))
                    ? 'border-emerald-300 ring-2 ring-emerald-100'
                    : 'border-slate-100'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  {!pago && (
                    <button
                      type="button"
                      onClick={() =>
                        alternarContaSelecionada(
                          String(processo.id)
                        )
                      }
                      className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-50"
                      title="Selecionar para pagamento em massa"
                    >
                      {contasSelecionadas.has(
                        String(processo.id)
                      ) ? (
                        <CheckSquare2 className="h-5 w-5 text-emerald-600" />
                      ) : (
                        <Square className="h-5 w-5 text-slate-400" />
                      )}
                    </button>
                  )}

                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-[10px] font-bold text-slate-400">
                      {processo.id}
                    </p>

                    <h3 className="mt-1 truncate text-sm font-bold text-[#0F172A]">
                      {favorecido}
                    </h3>

                    <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-slate-500">
                      {processo.descricao || '-'}
                    </p>
                  </div>

                  <Situacao
                    pago={pago}
                    vencida={Boolean(vencida)}
                    programada={
                      processo.statusProgramacao ===
                      'programado'
                    }
                  />
                </div>

                <div className="mt-3 flex items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2">
                  <span className="truncate text-[10px] text-slate-500">
                    {empresa?.nome || '-'}
                  </span>

                  <span className="shrink-0 font-mono text-[10px] text-slate-500">
                    Venc.: {processo.prazo || '-'}
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2">
                  <ResumoMobile
                    label="Total"
                    value={formatarReal(
                      processo.valor
                    )}
                  />

                  <ResumoMobile
                    label="Pago"
                    value={formatarReal(
                      obterValorPago(processo)
                    )}
                    classe="bg-emerald-50 text-emerald-700"
                  />

                  <ResumoMobile
                    label="Saldo"
                    value={formatarReal(
                      obterSaldoPagar(processo)
                    )}
                    classe="bg-amber-50 text-amber-700"
                  />
                </div>

                {processo.pixChave && (
                  <div className="mt-3 flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 p-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-[9px] font-bold uppercase text-emerald-600">
                        Chave PIX
                      </p>

                      <p className="mt-1 truncate font-mono text-[10px] text-slate-700">
                        {processo.pixChave}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        copiarPix(
                          processo.id,
                          processo.pixChave
                        )
                      }
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                        pixCopiadoId === processo.id
                          ? 'bg-emerald-600 text-white'
                          : 'bg-white text-emerald-600'
                      }`}
                    >
                      {pixCopiadoId === processo.id ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                )}

                {!pago && (
                  <div className="mt-3 rounded-xl bg-slate-50 p-3">
                    <label className="text-[9px] font-bold uppercase text-slate-400">
                      Programar pagamento
                    </label>

                    <div className="mt-2 flex gap-2">
                      <input
                        id={`data-programacao-${processo.id}`}
                        type="date"
                        defaultValue={
                          processo.dataProgramadaPagamento ||
                          ''
                        }
                        className="min-w-0 flex-1 rounded-xl border-0 bg-white px-3 py-2.5 font-mono text-[10px]"
                      />

                      <button
                        type="button"
                        onClick={() =>
                          programar(processo.id)
                        }
                        className="rounded-xl bg-slate-200 px-3 text-[10px] font-bold text-slate-700"
                      >
                        Salvar
                      </button>
                    </div>
                  </div>
                )}

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      abrirProcesso(processo.id)
                    }
                    className="rounded-xl bg-slate-100 py-3 text-[10px] font-bold text-slate-700"
                  >
                    Ver detalhes
                  </button>

                  {!pago ? (
                    <button
                      type="button"
                      onClick={() =>
                        abrirModalPagamento(
                          processo
                        )
                      }
                      className="rounded-xl bg-emerald-600 py-3 text-[10px] font-bold text-white"
                    >
                      {obterValorPago(processo) > 0
                        ? 'Novo pagamento'
                        : 'Registrar pagamento'}
                    </button>
                  ) : (
                    <span className="flex items-center justify-center rounded-xl bg-emerald-50 py-3 text-[10px] font-bold text-emerald-600">
                      Conta paga
                    </span>
                  )}
                </div>

                {obterValorPago(processo) > 0.001 && (
                  <button
                    type="button"
                    onClick={() => abrirModalEstorno(processo)}
                    className="mt-2 w-full rounded-xl border border-red-200 bg-red-50 py-3 text-[10px] font-bold text-red-700"
                  >
                    Desfazer último pagamento
                  </button>
                )}
              </article>
            );
          })
        )}
      </div>

      {contasFiltradas.length > 0 && (
        <div className="flex flex-col gap-3 rounded-[16px] border border-slate-100 bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[10px] font-semibold text-slate-500">
            Exibindo {primeiroItemPagina}–{ultimoItemPagina} de{' '}
            {contasFiltradas.length} conta(s)
          </p>

          <div className="flex items-center justify-between gap-2 sm:justify-end">
            <button
              type="button"
              onClick={() =>
                setPaginaAtual(pagina => Math.max(1, pagina - 1))
              }
              disabled={paginaAtual === 1}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-[10px] font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Anterior
            </button>

            <span className="min-w-[92px] text-center text-[10px] font-bold text-slate-600">
              Página {paginaAtual} de {totalPaginas}
            </span>

            <button
              type="button"
              onClick={() =>
                setPaginaAtual(pagina =>
                  Math.min(totalPaginas, pagina + 1)
                )
              }
              disabled={paginaAtual === totalPaginas}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-[10px] font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Próxima
            </button>
          </div>
        </div>
      )}

      {processoEstornando && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-[24px] bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-100 p-5">
              <div>
                <h2 className="text-base font-bold text-[#0F172A]">
                  Desfazer pagamento
                </h2>
                <p className="mt-1 text-[11px] text-slate-500">
                  O último pagamento ativo será estornado e o saldo será recalculado.
                </p>
              </div>

              <button
                type="button"
                onClick={fecharModalEstorno}
                disabled={estornandoPagamento}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 p-5">
              <div className="rounded-2xl border border-red-100 bg-red-50 p-4">
                <p className="text-[10px] font-bold uppercase text-red-600">Conta</p>
                <p className="mt-1 font-mono text-xs font-bold text-slate-800">
                  {processoEstornando.id}
                </p>
                <p className="mt-2 text-xs text-slate-600">
                  Valor pago atual: {formatarReal(obterValorPago(processoEstornando))}
                </p>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500">
                  Motivo do estorno
                </label>
                <textarea
                  value={motivoEstorno}
                  onChange={event => setMotivoEstorno(event.target.value)}
                  rows={3}
                  placeholder="Ex.: Pagamento lançado na conta errada."
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 text-xs outline-none focus:border-red-300"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500">
                  Digite DESFAZER para confirmar
                </label>
                <input
                  value={confirmacaoEstorno}
                  onChange={event => setConfirmacaoEstorno(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 text-xs font-bold uppercase outline-none focus:border-red-300"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-100 p-5">
              <button
                type="button"
                onClick={fecharModalEstorno}
                disabled={estornandoPagamento}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmarEstorno}
                disabled={
                  estornandoPagamento ||
                  !motivoEstorno.trim() ||
                  confirmacaoEstorno.trim().toUpperCase() !== 'DESFAZER'
                }
                className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-40"
              >
                {estornandoPagamento && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                Confirmar estorno
              </button>
            </div>
          </div>
        </div>
      )}

      {modalImportacaoOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-[22px] bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-100 p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
                  <FileSpreadsheet className="h-5 w-5 text-blue-600" />
                </div>

                <div>
                  <h2 className="text-base font-bold text-[#0F172A]">
                    Prévia da importação
                  </h2>

                  <p className="mt-1 text-[10px] text-slate-400">
                    {arquivoImportacaoNome}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={fecharImportacao}
                disabled={importandoContas}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-100 bg-white text-slate-400 hover:bg-slate-50 disabled:opacity-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 border-b border-slate-100 bg-slate-50 p-4 sm:grid-cols-3">
              <div className="rounded-[14px] bg-white p-4">
                <p className="text-[9px] font-bold uppercase text-slate-400">
                  Total
                </p>
                <p className="mt-1 text-xl font-black">
                  {previewImportacao.length}
                </p>
              </div>

              <div className="rounded-[14px] bg-emerald-50 p-4">
                <p className="text-[9px] font-bold uppercase text-emerald-600">
                  Válidos
                </p>
                <p className="mt-1 text-xl font-black text-emerald-700">
                  {totalImportacaoValido}
                </p>
              </div>

              <div className="rounded-[14px] bg-amber-50 p-4">
                <p className="text-[9px] font-bold uppercase text-amber-600">
                  Atenção
                </p>
                <p className="mt-1 text-xl font-black text-amber-700">
                  {totalImportacaoAtencao}
                </p>
              </div>
            </div>

            <div className="overflow-auto">
              <table className="w-full min-w-[1000px]">
                <thead className="sticky top-0 z-10 border-b border-slate-200 bg-[#F8FAFC]">
                  <tr className="text-left text-[9px] uppercase text-slate-500">
                    <th className="px-4 py-3">Linha</th>
                    <th className="px-4 py-3">Plano de contas</th>
                    <th className="px-4 py-3">Fornecedor</th>
                    <th className="px-4 py-3">PIX</th>
                    <th className="px-4 py-3">Vencimento</th>
                    <th className="px-4 py-3">Parcela</th>
                    <th className="px-4 py-3 text-right">Valor</th>
                    <th className="px-4 py-3">Validação</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {previewImportacao.map(item => (
                    <tr
                      key={item.linha}
                      className="hover:bg-slate-50"
                    >
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {item.linha}
                      </td>
                      <td className="px-4 py-3 text-xs font-bold text-slate-800">
                        {item.planoConta || '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">
                        {item.fornecedor || '—'}
                      </td>
                      <td className="max-w-[220px] truncate px-4 py-3 font-mono text-[10px] text-slate-600" title={item.pix}>
                        {item.pix || 'Usar PIX cadastrado'}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-600">
                        {item.vencimento || '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">
                        {item.parcela || '—'}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs font-bold">
                        {formatarReal(item.valor || 0)}
                      </td>
                      <td className="px-4 py-3">
                        {item.status === 'valido' ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[9px] font-bold text-emerald-700">
                            <Check className="h-3 w-3" />
                            Válido
                          </span>
                        ) : (
                          <span
                            title={item.mensagem}
                            className="inline-flex max-w-[280px] items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[9px] font-bold text-amber-700"
                          >
                            <AlertTriangle className="h-3 w-3 shrink-0" />
                            <span className="truncate">
                              {item.mensagem}
                            </span>
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[10px] text-slate-400">
                Planos e fornecedores inexistentes serão criados automaticamente.
              </p>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={fecharImportacao}
                  disabled={importandoContas}
                  className="h-10 rounded-xl border border-slate-200 px-4 text-xs font-bold text-slate-600"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={confirmarImportacaoContas}
                  disabled={
                    importandoContas ||
                    totalImportacaoValido === 0
                  }
                  className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#0F172A] px-5 text-xs font-bold text-white disabled:opacity-40"
                >
                  {importandoContas && (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  )}

                  {importandoContas
                    ? 'Importando...'
                    : `Importar ${totalImportacaoValido} conta(s)`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {modalPagamentoMassaOpen && (
        <div className="fixed inset-0 z-[75] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[24px] bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-100 p-5 sm:p-6">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-50">
                  <ShieldAlert className="h-5 w-5 text-amber-600" />
                </div>

                <div>
                  <h2 className="text-base font-bold text-[#0F172A]">
                    Confirmar pagamento em massa
                  </h2>
                  <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                    Revise com atenção. Cada conta será quitada pelo saldo integral existente.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={fecharPagamentoMassa}
                disabled={pagandoEmMassa}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 disabled:opacity-40"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-5 p-5 sm:p-6">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-[10px] font-bold uppercase text-slate-400">
                    Contas selecionadas
                  </p>
                  <p className="mt-2 text-2xl font-bold text-[#0F172A]">
                    {contasSelecionadasDetalhes.length}
                  </p>
                </div>

                <div className="rounded-2xl bg-emerald-50 p-4">
                  <p className="text-[10px] font-bold uppercase text-emerald-600">
                    Total a pagar
                  </p>
                  <p className="mt-2 font-mono text-xl font-bold text-emerald-700">
                    {formatarReal(totalSelecionadoPagamentoMassa)}
                  </p>
                </div>
              </div>

              <div className="max-h-52 overflow-y-auto rounded-2xl border border-slate-100">
                {contasSelecionadasDetalhes.map((processo: any) => {
                  const fornecedor = fornecedores.find(
                    (item: any) => item.id === processo.fornecedorId
                  );
                  const favorecido =
                    processo.tipoPagamento === 'interno'
                      ? processo.beneficiarioInterno || 'Pagamento interno'
                      : fornecedor?.nome || processo.descricao || '-';

                  return (
                    <div
                      key={processo.id}
                      className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 last:border-0"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold text-slate-700">
                          {favorecido}
                        </p>
                        <p className="mt-1 font-mono text-[9px] text-slate-400">
                          {processo.id} • Venc. {processo.prazo || '-'}
                        </p>
                      </div>
                      <p className="shrink-0 font-mono text-xs font-bold text-slate-800">
                        {formatarReal(obterSaldoPagar(processo))}
                      </p>
                    </div>
                  );
                })}
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400">
                  Forma de pagamento
                </label>
                <select
                  value={metodoPagamentoMassa}
                  onChange={event =>
                    setMetodoPagamentoMassa(
                      event.target.value as MetodoPagamentoMassa
                    )
                  }
                  disabled={pagandoEmMassa}
                  className="mt-2 w-full rounded-xl border-0 bg-slate-50 px-4 py-3 text-xs"
                >
                  <option value="cadastrado">Usar a forma cadastrada em cada conta</option>
                  <option value="pix">PIX para todas</option>
                  <option value="boleto">Boleto para todas</option>
                  <option value="ted">TED para todas</option>
                  <option value="dinheiro">Dinheiro para todas</option>
                  <option value="cartao">Cartão para todas</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400">
                  Observação geral (opcional)
                </label>
                <textarea
                  value={observacaoPagamentoMassa}
                  onChange={event =>
                    setObservacaoPagamentoMassa(event.target.value)
                  }
                  disabled={pagandoEmMassa}
                  rows={3}
                  placeholder="Ex.: Pagamentos autorizados pela diretoria em 05/08/2026."
                  className="mt-2 w-full resize-none rounded-xl border-0 bg-slate-50 px-4 py-3 text-xs"
                />
              </div>

              <div className="rounded-2xl border border-red-100 bg-red-50 p-4">
                <p className="text-xs font-bold text-red-700">
                  Confirmação de segurança
                </p>
                <p className="mt-1 text-[10px] leading-relaxed text-red-600">
                  Digite <strong>PAGAR</strong> abaixo. Depois ainda será exibida uma confirmação final do navegador.
                </p>
                <input
                  value={confirmacaoPagamentoMassa}
                  onChange={event =>
                    setConfirmacaoPagamentoMassa(event.target.value)
                  }
                  disabled={pagandoEmMassa}
                  placeholder="Digite PAGAR"
                  autoComplete="off"
                  className="mt-3 w-full rounded-xl border border-red-200 bg-white px-4 py-3 text-sm font-bold uppercase text-red-700 outline-none focus:border-red-400"
                />
              </div>

              {pagandoEmMassa && (
                <div className="rounded-2xl bg-blue-50 p-4">
                  <div className="flex items-center gap-3">
                    <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                    <div>
                      <p className="text-xs font-bold text-blue-700">
                        Processando pagamentos
                      </p>
                      <p className="mt-1 text-[10px] text-blue-600">
                        {progressoPagamentoMassa.atual} de {progressoPagamentoMassa.total}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={fecharPagamentoMassa}
                  disabled={pagandoEmMassa}
                  className="rounded-xl bg-slate-100 px-5 py-3 text-xs font-bold text-slate-600 hover:bg-slate-200 disabled:opacity-40"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={confirmarPagamentoMassa}
                  disabled={
                    pagandoEmMassa ||
                    confirmacaoPagamentoMassa.trim().toUpperCase() !== 'PAGAR'
                  }
                  className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-xs font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {pagandoEmMassa ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckSquare2 className="h-4 w-4" />
                  )}
                  Confirmar {contasSelecionadasDetalhes.length} pagamento(s)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {processoPagando && (
        <>
          <div
            className="fixed inset-0 z-50 bg-slate-900/30"
            onClick={fecharModalPagamento}
          />

          <div className="fixed inset-x-0 bottom-0 z-50 flex max-h-[92dvh] w-full flex-col rounded-t-[24px] bg-white shadow-2xl sm:inset-y-0 sm:left-auto sm:right-0 sm:h-screen sm:max-h-none sm:max-w-md sm:rounded-none">
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


const ResumoMobile = ({
  label,
  value,
  classe = 'bg-slate-50 text-[#0F172A]',
}: {
  label: string;
  value: string;
  classe?: string;
}) => (
  <div
    className={`min-w-0 rounded-xl p-2.5 ${classe}`}
  >
    <p className="text-[8px] font-bold uppercase opacity-70">
      {label}
    </p>

    <p className="mt-1 truncate font-mono text-[10px] font-bold">
      {value}
    </p>
  </div>
);

export default AccountsPayableView;