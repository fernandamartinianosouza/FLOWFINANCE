/**
 * FLOWFINANCE - CONTAS A PAGAR
 * VERSAO VISUAL NOVA - 07/08/2026
 *
 * ALTERACOES VISUAIS:
 * - Acoes em massa unificadas em um unico card
 * - Estorno em massa em amarelo/amber, menos agressivo
 * - Exclusao em massa compacta
 * - Acoes individuais recolhidas em "Mais acoes"
 * - Exclusao individual dentro do menu de acoes
 * - Layout mobile reorganizado
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { useFinance } from '../context/FinanceContext';
import { usePermissions } from '../context/PermissionsContext';
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
  Trash2,
  MoreHorizontal,
} from 'lucide-react';

import { gerarRelatorioContasPagar } from '../services/relatorioContasPagarService';
import { financeService } from '../services/financeService';
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
  const { temPermissao } = usePermissions();
  const {
    organizacaoAtivaId,
    empresaAtivaId,
    processos,
    fornecedores,
    empresas,
    planosFinanceiros,
    centrosCustos,
    cadastrarPlanoFinanceiro,
    cadastrarFornecedor,
    criarNovaConta,
    editarProcesso,
    getDocumentosProcesso,
    anexarDocumentoProcesso,
    excluirDocumentoProcesso,
    programarPagamento,
    registrarPagamento,
    desfazerUltimoPagamento,
    excluirProcesso,
    recarregarDados,
    loadingFinanceiro,
  } = useFinance() as any;

  const hoje = hojeISO();

  const [busca, setBusca] = useState('');
  const [situacao, setSituacao] =
    useState<FiltroSituacao>('todas');
  const [empresaFiltro, setEmpresaFiltro] =
    useState('');
  const [planoFiltro, setPlanoFiltro] =
    useState('');
  const [formaFiltro, setFormaFiltro] =
    useState('');
  const [dataInicio, setDataInicio] =
    useState('');
  const [dataFim, setDataFim] =
    useState('');
  const [ordenacaoVencimento, setOrdenacaoVencimento] =
    useState<'asc' | 'desc'>('asc');
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
  const [menuAcoesId, setMenuAcoesId] =
    useState<string | null>(null);

  // Detalhes da conta abertos diretamente em Contas a Pagar.
  const [contaDetalhes, setContaDetalhes] =
    useState<any | null>(null);

  const [editandoDetalhes, setEditandoDetalhes] =
    useState(false);
  const [salvandoDetalhes, setSalvandoDetalhes] =
    useState(false);
  const [formDetalhes, setFormDetalhes] =
    useState<any>({});

  // Anexos da conta exibidos dentro de Detalhes.
  const inputAnexoContaRef = useRef<HTMLInputElement>(null);
  const [documentosConta, setDocumentosConta] = useState<any[]>([]);
  const [carregandoDocumentosConta, setCarregandoDocumentosConta] =
    useState(false);
  const [enviandoDocumentoConta, setEnviandoDocumentoConta] =
    useState(false);
  const [documentoExcluindoId, setDocumentoExcluindoId] =
    useState<string | null>(null);

  // Exclusão individual e em massa
  const [processoExcluindo, setProcessoExcluindo] =
    useState<any | null>(null);
  const [confirmacaoExclusao, setConfirmacaoExclusao] =
    useState('');
  const [excluindoConta, setExcluindoConta] =
    useState(false);
  const [motivoExclusao, setMotivoExclusao] = useState('');
  const [modalExcluidosOpen, setModalExcluidosOpen] = useState(false);
  const [contasExcluidas, setContasExcluidas] = useState<any[]>([]);
  const [carregandoExcluidos, setCarregandoExcluidos] = useState(false);

  const [contasExclusaoSelecionadas, setContasExclusaoSelecionadas] =
    useState<Set<string>>(new Set());
  const [modalExclusaoMassaOpen, setModalExclusaoMassaOpen] =
    useState(false);
  const [confirmacaoExclusaoMassa, setConfirmacaoExclusaoMassa] =
    useState('');
  const [excluindoEmMassa, setExcluindoEmMassa] =
    useState(false);
  const [progressoExclusaoMassa, setProgressoExclusaoMassa] =
    useState({ atual: 0, total: 0 });

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

  const [contasEstornoSelecionadas, setContasEstornoSelecionadas] =
    useState<Set<string>>(new Set());
  const [modalEstornoMassaOpen, setModalEstornoMassaOpen] =
    useState(false);
  const [motivoEstornoMassa, setMotivoEstornoMassa] =
    useState('');
  const [confirmacaoEstornoMassa, setConfirmacaoEstornoMassa] =
    useState('');
  const [estornandoEmMassa, setEstornandoEmMassa] =
    useState(false);
  const [progressoEstornoMassa, setProgressoEstornoMassa] =
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
    String(
      processo.prazo ||
      processo.vencimento ||
      processo.dataVencimento ||
      processo.data_vencimento ||
      ''
    ).slice(0, 10);

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
    (processo: any) =>
      !contaPaga(processo) &&
      Boolean(dataBase(processo)) &&
      dataBase(processo) >= hoje
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

      const vencimentoOriginal = dataBase(item);

      return (
        (!dataInicio ||
          (vencimentoOriginal &&
            vencimentoOriginal >= dataInicio)) &&
        (!dataFim ||
          (vencimentoOriginal &&
            vencimentoOriginal <= dataFim))
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
          planoFiltro &&
          String(
            processo.planoFinanceiroId ||
              processo.planoId ||
              ''
          ) !== planoFiltro
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

        const vencimentoOriginal =
          dataBase(processo);

        if (
          dataInicio &&
          (!vencimentoOriginal ||
            vencimentoOriginal < dataInicio)
        ) {
          return false;
        }

        if (
          dataFim &&
          (!vencimentoOriginal ||
            vencimentoOriginal > dataFim)
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
      .sort((a: any, b: any) => {
        const dataA = dataBase(a);
        const dataB = dataBase(b);

        // Contas sem vencimento ficam sempre no final.
        if (!dataA && !dataB) return 0;
        if (!dataA) return 1;
        if (!dataB) return -1;

        return ordenacaoVencimento === 'desc'
          ? dataB.localeCompare(dataA)
          : dataA.localeCompare(dataB);
      });
  }, [
    todasContas,
    busca,
    situacao,
    empresaFiltro,
    formaFiltro,
    dataInicio,
    dataFim,
    ordenacaoVencimento,
    fornecedores,
    empresas,
    contasVencidas,
    contasAVencer,
  ]);

  const resumoFinanceiroFiltrado = useMemo(() => {
    return contasFiltradas.reduce(
      (
        resumo: {
          aVencer: number;
          vencido: number;
          pago: number;
          total: number;
        },
        processo: any
      ) => {
        const valorTotal = Math.max(
          Number(processo.valor || 0),
          0
        );
        const valorPago = obterValorPago(processo);
        const saldo = obterSaldoPagar(processo);
        const estaPaga = contaPaga(processo);
        const vencimento = dataBase(processo);

        // TOTAL = valor original de todas as contas que passaram
        // pelos filtros, independentemente de estarem pagas,
        // vencidas, parcialmente pagas ou a vencer.
        resumo.total += valorTotal;

        // PAGO = valor efetivamente pago nas contas filtradas.
        resumo.pago += valorPago;

        // VENCIDO / A VENCER = somente saldo ainda pendente.
        if (!estaPaga && saldo > 0.001) {
          if (vencimento && vencimento < hoje) {
            resumo.vencido += saldo;
          } else {
            resumo.aVencer += saldo;
          }
        }

        return resumo;
      },
      {
        aVencer: 0,
        vencido: 0,
        pago: 0,
        total: 0,
      }
    );
  }, [contasFiltradas, hoje]);

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

  const contasElegiveisEstornoMassa = useMemo(
    () =>
      contasFiltradas.filter(
        (processo: any) =>
          contaPaga(processo) &&
          obterValorPago(processo) > 0.001
      ),
    [contasFiltradas]
  );

  const contasEstornoSelecionadasDetalhes = useMemo(
    () =>
      contasElegiveisEstornoMassa.filter(
        (processo: any) =>
          contasEstornoSelecionadas.has(String(processo.id))
      ),
    [contasElegiveisEstornoMassa, contasEstornoSelecionadas]
  );

  const totalPagoSelecionadoEstorno = useMemo(
    () =>
      contasEstornoSelecionadasDetalhes.reduce(
        (total: number, processo: any) =>
          total + obterValorPago(processo),
        0
      ),
    [contasEstornoSelecionadasDetalhes]
  );

  const todasPagasElegiveisSelecionadas =
    contasElegiveisEstornoMassa.length > 0 &&
    contasElegiveisEstornoMassa.every(
      (processo: any) =>
        contasEstornoSelecionadas.has(String(processo.id))
    );

  useEffect(() => {
    const idsElegiveis = new Set(
      contasElegiveisEstornoMassa.map(
        (processo: any) => String(processo.id)
      )
    );

    setContasEstornoSelecionadas(anteriores => {
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
  }, [contasElegiveisEstornoMassa]);

  const alternarContaEstornoSelecionada = (processoId: string) => {
    setContasEstornoSelecionadas(anteriores => {
      const proximas = new Set(anteriores);

      if (proximas.has(processoId)) {
        proximas.delete(processoId);
      } else {
        proximas.add(processoId);
      }

      return proximas;
    });
  };

  const alternarTodasContasPagas = () => {
    if (todasPagasElegiveisSelecionadas) {
      setContasEstornoSelecionadas(new Set());
      return;
    }

    setContasEstornoSelecionadas(
      new Set(
        contasElegiveisEstornoMassa.map(
          (processo: any) => String(processo.id)
        )
      )
    );
  };

  const contasExclusaoSelecionadasDetalhes = useMemo(
    () =>
      contasFiltradas.filter((processo: any) =>
        contasExclusaoSelecionadas.has(String(processo.id))
      ),
    [contasFiltradas, contasExclusaoSelecionadas]
  );

  const todasContasExclusaoSelecionadas =
    contasFiltradas.length > 0 &&
    contasFiltradas.every((processo: any) =>
      contasExclusaoSelecionadas.has(String(processo.id))
    );

  useEffect(() => {
    const idsVisiveis = new Set(
      contasFiltradas.map((processo: any) => String(processo.id))
    );

    setContasExclusaoSelecionadas(anteriores => {
      const proximas = new Set(
        [...anteriores].filter(id => idsVisiveis.has(id))
      );

      if (
        proximas.size === anteriores.size &&
        [...proximas].every(id => anteriores.has(id))
      ) {
        return anteriores;
      }

      return proximas;
    });
  }, [contasFiltradas]);

  const alternarContaExclusaoSelecionada = (processoId: string) => {
    setContasExclusaoSelecionadas(anteriores => {
      const proximas = new Set(anteriores);

      if (proximas.has(processoId)) {
        proximas.delete(processoId);
      } else {
        proximas.add(processoId);
      }

      return proximas;
    });
  };

  const alternarTodasContasExclusao = () => {
    if (todasContasExclusaoSelecionadas) {
      setContasExclusaoSelecionadas(new Set());
      return;
    }

    setContasExclusaoSelecionadas(
      new Set(
        contasFiltradas.map((processo: any) => String(processo.id))
      )
    );
  };

  const abrirModalExclusao = (processo: any) => {
    setProcessoExcluindo(processo);
    setConfirmacaoExclusao('');
    setMotivoExclusao('');
  };

  const fecharModalExclusao = () => {
    if (excluindoConta) return;

    setProcessoExcluindo(null);
    setConfirmacaoExclusao('');
  };

  const confirmarExclusao = async () => {
    if (!temPermissao('contas_pagar', 'excluir')) { alert('Você não tem permissão para esta ação.'); return; }
    if (!processoExcluindo || excluindoConta) return;

    if (confirmacaoExclusao.trim().toUpperCase() !== 'EXCLUIR') {
      alert('Digite EXCLUIR para confirmar a exclusão.');
      return;
    }

    if (!motivoExclusao.trim()) { alert('Informe o motivo da exclusão.'); return; }

    const confirmado = window.confirm(
      `CONFIRMAÇÃO FINAL\n\nA conta ${processoExcluindo.id} será excluída permanentemente.\n\nDeseja continuar?`
    );

    if (!confirmado) return;

    try {
      setExcluindoConta(true);

      const sucesso = await excluirProcesso(String(processoExcluindo.id), motivoExclusao.trim());

      if (!sucesso) {
        return;
      }

      setContasSelecionadas(anteriores => {
        const proximas = new Set(anteriores);
        proximas.delete(String(processoExcluindo.id));
        return proximas;
      });

      setContasEstornoSelecionadas(anteriores => {
        const proximas = new Set(anteriores);
        proximas.delete(String(processoExcluindo.id));
        return proximas;
      });

      setContasExclusaoSelecionadas(anteriores => {
        const proximas = new Set(anteriores);
        proximas.delete(String(processoExcluindo.id));
        return proximas;
      });

      setProcessoExcluindo(null);
      setConfirmacaoExclusao('');
    } finally {
      setExcluindoConta(false);
    }
  };

  const abrirExclusaoMassa = () => {
    if (contasExclusaoSelecionadasDetalhes.length === 0) {
      alert('Selecione pelo menos uma conta para excluir.');
      return;
    }

    setConfirmacaoExclusaoMassa('');
    setProgressoExclusaoMassa({
      atual: 0,
      total: contasExclusaoSelecionadasDetalhes.length,
    });
    setModalExclusaoMassaOpen(true);
  };

  const fecharExclusaoMassa = () => {
    if (excluindoEmMassa) return;

    setModalExclusaoMassaOpen(false);
    setConfirmacaoExclusaoMassa('');
  };

  const confirmarExclusaoMassa = async () => {
    if (!temPermissao('contas_pagar', 'excluir')) { alert('Você não tem permissão para esta ação.'); return; }
    if (excluindoEmMassa) return;

    if (confirmacaoExclusaoMassa.trim().toUpperCase() !== 'EXCLUIR') {
      alert('Digite EXCLUIR para confirmar a exclusão em massa.');
      return;
    }

    const motivoMassa = window.prompt('Informe o motivo da exclusão em massa:')?.trim();
    if (!motivoMassa) { alert('O motivo da exclusão é obrigatório.'); return; }

    const contas = [...contasExclusaoSelecionadasDetalhes];

    if (contas.length === 0) {
      alert('Nenhuma conta permanece selecionada para exclusão.');
      fecharExclusaoMassa();
      return;
    }

    const confirmado = window.confirm(
      `CONFIRMAÇÃO FINAL\n\nVocê está prestes a excluir permanentemente ${contas.length} conta(s).\n\nEssa ação não pode ser desfeita. Deseja continuar?`
    );

    if (!confirmado) return;

    const sucessos: string[] = [];
    const falhas: string[] = [];

    try {
      setExcluindoEmMassa(true);
      setProgressoExclusaoMassa({ atual: 0, total: contas.length });

      for (let indice = 0; indice < contas.length; indice += 1) {
        const processo = contas[indice];
        const processoId = String(processo.id);

        setProgressoExclusaoMassa({
          atual: indice + 1,
          total: contas.length,
        });

        try {
          const sucesso = await excluirProcesso(processoId, motivoMassa);

          if (sucesso) {
            sucessos.push(processoId);
          } else {
            falhas.push(processoId);
          }
        } catch {
          falhas.push(processoId);
        }
      }

      setContasSelecionadas(anteriores => {
        const proximas = new Set(anteriores);
        sucessos.forEach(id => proximas.delete(id));
        return proximas;
      });

      setContasEstornoSelecionadas(anteriores => {
        const proximas = new Set(anteriores);
        sucessos.forEach(id => proximas.delete(id));
        return proximas;
      });

      setContasExclusaoSelecionadas(anteriores => {
        const proximas = new Set(anteriores);
        sucessos.forEach(id => proximas.delete(id));
        return proximas;
      });

      await recarregarDados?.();

      if (falhas.length === 0) {
        alert(`${sucessos.length} conta(s) excluída(s) com sucesso.`);
        setModalExclusaoMassaOpen(false);
        setConfirmacaoExclusaoMassa('');
        return;
      }

      alert(
        `${sucessos.length} conta(s) excluída(s). ${falhas.length} conta(s) não puderam ser excluídas.`
      );
    } finally {
      setExcluindoEmMassa(false);
    }
  };

  const abrirEstornoMassa = () => {
    if (contasEstornoSelecionadasDetalhes.length === 0) {
      alert('Selecione pelo menos uma conta paga.');
      return;
    }

    setMotivoEstornoMassa('');
    setConfirmacaoEstornoMassa('');
    setProgressoEstornoMassa({
      atual: 0,
      total: contasEstornoSelecionadasDetalhes.length,
    });
    setModalEstornoMassaOpen(true);
  };

  const fecharEstornoMassa = () => {
    if (estornandoEmMassa) return;

    setModalEstornoMassaOpen(false);
    setMotivoEstornoMassa('');
    setConfirmacaoEstornoMassa('');
  };

  const confirmarEstornoMassa = async () => {
    if (!temPermissao('contas_pagar', 'estornar')) { alert('Você não tem permissão para esta ação.'); return; }
    if (estornandoEmMassa) return;

    if (motivoEstornoMassa.trim().length < 5) {
      alert('Informe um motivo com pelo menos 5 caracteres.');
      return;
    }

    if (confirmacaoEstornoMassa.trim().toUpperCase() !== 'DESFAZER') {
      alert('Digite DESFAZER para confirmar a operação.');
      return;
    }

    const contas = [...contasEstornoSelecionadasDetalhes];

    if (contas.length === 0) {
      alert('Nenhuma conta paga permanece selecionada.');
      fecharEstornoMassa();
      return;
    }

    const confirmado = window.confirm(
      `CONFIRMAÇÃO FINAL\n\nVocê está prestes a desfazer o último pagamento ativo de ${contas.length} conta(s).\n\nValor pago atual das contas selecionadas: ${formatarReal(
        totalPagoSelecionadoEstorno
      )}.\n\nCada estorno ficará registrado na auditoria. Deseja continuar?`
    );

    if (!confirmado) return;

    const sucessos: string[] = [];
    const falhas: Array<{ id: string; erro: string }> = [];

    try {
      setEstornandoEmMassa(true);
      setProgressoEstornoMassa({ atual: 0, total: contas.length });

      for (let indice = 0; indice < contas.length; indice += 1) {
        const processo = contas[indice];
        const codigoVisual = String(processo.id);

        setProgressoEstornoMassa({
          atual: indice + 1,
          total: contas.length,
        });

        try {
          const identificadorProcesso = String(
            processo.dbId ??
              processo.processoDbId ??
              processo.processo_id ??
              processo.id
          ).trim();

          if (!identificadorProcesso) {
            throw new Error(
              'Não foi possível identificar o processo no banco.'
            );
          }

          await desfazerUltimoPagamento(
            identificadorProcesso,
            `${motivoEstornoMassa.trim()} Estorno realizado em lote.`
          );

          sucessos.push(codigoVisual);
        } catch (error: any) {
          falhas.push({
            id: codigoVisual,
            erro:
              error?.message ||
              'Não foi possível desfazer o pagamento.',
          });
        }
      }

      await recarregarDados?.();

      setContasEstornoSelecionadas(anteriores => {
        const proximas = new Set(anteriores);
        sucessos.forEach(id => proximas.delete(id));
        return proximas;
      });

      if (falhas.length === 0) {
        alert(
          `${sucessos.length} pagamento(s) desfeito(s) com sucesso.`
        );
        setModalEstornoMassaOpen(false);
        setMotivoEstornoMassa('');
        setConfirmacaoEstornoMassa('');
        return;
      }

      const resumoFalhas = falhas
        .slice(0, 5)
        .map(item => `${item.id}: ${item.erro}`)
        .join('\n');

      alert(
        `${sucessos.length} estorno(s) concluído(s).\n${falhas.length} estorno(s) falharam.\n\n${resumoFalhas}${
          falhas.length > 5
            ? `\n... e mais ${falhas.length - 5} falha(s).`
            : ''
        }`
      );
    } finally {
      setEstornandoEmMassa(false);
    }
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
    if (!temPermissao('contas_pagar', 'pagar')) { alert('Você não tem permissão para esta ação.'); return; }
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

  const exportarContasExcel = () => {
    if (!temPermissao('contas_pagar', 'exportar')) { alert('Você não tem permissão para exportar.'); return; }
    if (contasFiltradas.length === 0) {
      alert(
        'Não há contas para exportar com os filtros atuais.'
      );
      return;
    }

    try {
      const linhas = contasFiltradas.map(
        (processo: any) => {
          const fornecedor = fornecedores.find(
            (item: any) =>
              String(item.id) ===
              String(processo.fornecedorId)
          );

          const empresa = empresas.find(
            (item: any) =>
              String(item.id) ===
              String(processo.empresaId)
          );

          const plano = planosFinanceiros.find(
            (item: any) =>
              String(item.id ?? item.dbId ?? '') ===
              String(
                processo.planoFinanceiroId ??
                  processo.planoId ??
                  ''
              )
          );

          const centro = centrosCustos.find(
            (item: any) =>
              String(item.id ?? item.dbId ?? '') ===
              String(
                processo.centroCustoId ?? ''
              )
          );

          const valorTotal = Number(
            processo.valor || 0
          );

          const valorPago = Math.max(
            Number(processo.valorPago || 0),
            0
          );

          const saldo = Math.max(
            Number(
              processo.saldoPagar ??
                valorTotal - valorPago
            ),
            0
          );

          const vencimento = String(
            processo.prazo ??
              processo.vencimento ??
              ''
          ).slice(0, 10);

          const dataPagamento = String(
            processo.dataPagamento ??
              processo.data_pagamento ??
              ''
          ).slice(0, 10);

          const pago = contaPaga(processo);

          const vencido =
            !pago &&
            Boolean(vencimento) &&
            vencimento < hoje;

          const status = pago
            ? 'Paga'
            : valorPago > 0.001
            ? 'Pagamento parcial'
            : vencido
            ? 'Vencida'
            : processo.statusProgramacao ===
              'programado'
            ? 'Programada'
            : 'A vencer';

          const favorecido =
            processo.tipoPagamento === 'interno'
              ? processo.beneficiarioInterno ||
                'Pagamento interno'
              : fornecedor?.nome ||
                'Não informado';

          return {
            Conta: processo.id || '',
            Favorecido: favorecido,
            Empresa: empresa?.nome || '',
            'Plano de contas':
              plano?.nome || '',
            'Centro de custo':
              centro?.nome || '',
            Descrição: processo.descricao || '',
            Vencimento: vencimento,
            'Valor total': valorTotal,
            'Valor pago': valorPago,
            Saldo: saldo,
            Status: status,
            'Data de pagamento':
              dataPagamento,
            'Forma de pagamento': String(
              processo.formaPagamento ??
                processo.metodoPagamento ??
                ''
            ).toUpperCase(),
            Parcela:
              processo.parcela ??
              processo.numeroParcela ??
              '',
            PIX: processo.pixChave || '',
            'Favorecido PIX':
              processo.pixFavorecido || '',
            Observações:
              processo.observacao ??
              processo.observacoes ??
              '',
          };
        }
      );

      const planilha =
        XLSX.utils.json_to_sheet(linhas);

      planilha['!cols'] = [
        { wch: 24 }, // Conta
        { wch: 30 }, // Favorecido
        { wch: 26 }, // Empresa
        { wch: 28 }, // Plano
        { wch: 28 }, // Centro
        { wch: 42 }, // Descrição
        { wch: 14 }, // Vencimento
        { wch: 16 }, // Valor
        { wch: 16 }, // Pago
        { wch: 16 }, // Saldo
        { wch: 20 }, // Status
        { wch: 18 }, // Data pagamento
        { wch: 20 }, // Forma
        { wch: 12 }, // Parcela
        { wch: 28 }, // PIX
        { wch: 28 }, // Favorecido PIX
        { wch: 40 }, // Observações
      ];

      const workbook =
        XLSX.utils.book_new();

      XLSX.utils.book_append_sheet(
        workbook,
        planilha,
        'Contas a Pagar'
      );

      const dataArquivo =
        new Date()
          .toISOString()
          .slice(0, 10);

      XLSX.writeFile(
        workbook,
        `contas_a_pagar_${dataArquivo}.xlsx`
      );
    } catch (error: any) {
      console.error(
        'Erro ao exportar contas a pagar em Excel:',
        error
      );

      alert(
        error?.message ||
          'Não foi possível exportar as contas em Excel.'
      );
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
    setPlanoFiltro('');
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
    if (!temPermissao('contas_pagar', 'pagar')) { alert('Você não tem permissão para esta ação.'); return; }
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
    if (!temPermissao('contas_pagar', 'estornar')) { alert('Você não tem permissão para esta ação.'); return; }
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

  const obterProcessoDbId = (processo: any) =>
    String(
      processo?.dbId ??
        processo?.processoDbId ??
        processo?.processo_id ??
        ''
    ).trim();

  const carregarDocumentosConta = async (processo: any) => {
    const processoDbId = obterProcessoDbId(processo);

    if (!processoDbId) {
      setDocumentosConta([]);
      return;
    }

    if (typeof getDocumentosProcesso !== 'function') {
      setDocumentosConta([]);
      return;
    }

    try {
      setCarregandoDocumentosConta(true);

      const documentos =
        await getDocumentosProcesso(processoDbId);

      setDocumentosConta(
        Array.isArray(documentos) ? documentos : []
      );
    } catch (error: any) {
      console.error(
        'Erro ao carregar anexos da conta:',
        error
      );
      setDocumentosConta([]);
    } finally {
      setCarregandoDocumentosConta(false);
    }
  };

  const montarFormDetalhes = (processo: any) => ({
    empresaId: String(processo?.empresaId ?? ''),
    fornecedorId: String(processo?.fornecedorId ?? ''),
    planoFinanceiroId: String(
      processo?.planoFinanceiroId ??
        processo?.planoId ??
        ''
    ),
    centroCustoId: String(
      processo?.centroCustoId ?? ''
    ),
    descricao: String(processo?.descricao ?? ''),
    prazo: String(
      processo?.prazo ??
        processo?.vencimento ??
        ''
    ).slice(0, 10),
    valor: String(Number(processo?.valor ?? 0)),
    formaPagamento: String(
      processo?.formaPagamento ??
        processo?.metodoPagamento ??
        'boleto'
    ),
    pixChave: String(processo?.pixChave ?? ''),
    pixFavorecido: String(
      processo?.pixFavorecido ?? ''
    ),
    parcela: String(
      processo?.parcela ??
        processo?.numeroParcela ??
        '1/1'
    ),
    observacao: String(
      processo?.observacao ??
        processo?.observacoes ??
        ''
    ),
  });

  const abrirDetalhesConta = (processo: any) => {
    setMenuAcoesId(null);
    setContaDetalhes(processo);
    setFormDetalhes(montarFormDetalhes(processo));
    setEditandoDetalhes(false);
    setDocumentosConta([]);
    carregarDocumentosConta(processo);
  };

  const fecharDetalhesConta = () => {
    if (enviandoDocumentoConta || salvandoDetalhes) return;

    setContaDetalhes(null);
    setEditandoDetalhes(false);
    setFormDetalhes({});
    setDocumentosConta([]);

    if (inputAnexoContaRef.current) {
      inputAnexoContaRef.current.value = '';
    }
  };

  const atualizarCampoDetalhes = (
    campo: string,
    valor: any
  ) => {
    setFormDetalhes((prev: any) => ({
      ...prev,
      [campo]: valor,
    }));
  };

  const salvarEdicaoDetalhes = async () => {
    if (!temPermissao('contas_pagar', 'editar')) { alert('Você não tem permissão para esta ação.'); return; }
    if (!contaDetalhes) return;

    const valor = Number(
      String(formDetalhes.valor ?? '')
        .replace(',', '.')
    );

    const valorJaPago = Math.max(
      Number(contaDetalhes.valorPago ?? 0),
      0
    );

    if (!formDetalhes.empresaId) {
      alert('Selecione a empresa.');
      return;
    }

    if (
      contaDetalhes.tipoPagamento !== 'interno' &&
      !formDetalhes.fornecedorId
    ) {
      alert('Selecione o favorecido.');
      return;
    }

    if (!formDetalhes.planoFinanceiroId) {
      alert('Selecione o plano de contas.');
      return;
    }

    if (!formDetalhes.prazo) {
      alert('Informe o vencimento.');
      return;
    }

    if (!Number.isFinite(valor) || valor <= 0) {
      alert('Informe um valor válido.');
      return;
    }

    if (valor + 0.001 < valorJaPago) {
      alert(
        `O valor total não pode ser menor que o valor já pago (${formatarReal(
          valorJaPago
        )}).`
      );
      return;
    }

    try {
      setSalvandoDetalhes(true);

      const dadosAtualizados: any = {
        empresaId: formDetalhes.empresaId,
        fornecedorId:
          contaDetalhes.tipoPagamento === 'interno'
            ? contaDetalhes.fornecedorId
            : formDetalhes.fornecedorId,
        planoFinanceiroId:
          formDetalhes.planoFinanceiroId,
        centroCustoId:
          formDetalhes.centroCustoId || null,
        descricao: formDetalhes.descricao.trim(),
        prazo: formDetalhes.prazo,
        valor,
        formaPagamento: formDetalhes.formaPagamento,
        metodoPagamento: formDetalhes.formaPagamento,
        pixChave:
          formDetalhes.pixChave.trim() || null,
        pixFavorecido:
          formDetalhes.pixFavorecido.trim() || null,
        parcela:
          formDetalhes.parcela.trim() || '1/1',
        numeroParcela:
          formDetalhes.parcela.trim() || '1/1',
        observacao:
          formDetalhes.observacao.trim(),
        saldoPagar: Math.max(
          valor - valorJaPago,
          0
        ),
        pagamentoParcial:
          valorJaPago > 0 &&
          valorJaPago + 0.001 < valor,
      };

      await editarProcesso(
        contaDetalhes.id,
        dadosAtualizados
      );

      const alteracoesLocais: string[] = [];

      const compararLocal = (
        label: string,
        anterior: any,
        novo: any,
        formatador = (valor: any) =>
          String(
            valor ?? 'Não informado'
          )
      ) => {
        const a =
          anterior == null
            ? ''
            : String(anterior);
        const n =
          novo == null
            ? ''
            : String(novo);

        if (a !== n) {
          alteracoesLocais.push(
            `${label}: ${formatador(
              anterior
            )} → ${formatador(novo)}`
          );
        }
      };

      const formatarDataLocal = (
        valor: any
      ) => {
        const texto = String(
          valor || ''
        ).slice(0, 10);

        if (!texto) {
          return 'Não informado';
        }

        const [ano, mes, dia] =
          texto.split('-');

        return ano && mes && dia
          ? `${dia}/${mes}/${ano}`
          : texto;
      };

      const formatarValorLocal = (
        valor: any
      ) =>
        Number(valor || 0).toLocaleString(
          'pt-BR',
          {
            style: 'currency',
            currency: 'BRL',
          }
        );

      compararLocal(
        'Vencimento',
        contaDetalhes.prazo,
        dadosAtualizados.prazo,
        formatarDataLocal
      );

      compararLocal(
        'Valor',
        contaDetalhes.valor,
        dadosAtualizados.valor,
        formatarValorLocal
      );

      compararLocal(
        'Descrição',
        contaDetalhes.descricao,
        dadosAtualizados.descricao
      );

      compararLocal(
        'Observação',
        contaDetalhes.observacao ??
          contaDetalhes.observacoes,
        dadosAtualizados.observacao
      );

      const historicoLocal =
        alteracoesLocais.length > 0
          ? [
              ...(contaDetalhes.historico || []),
              {
                data: new Date()
                  .toISOString()
                  .replace('T', ' ')
                  .slice(0, 16),
                usuario: 'Usuário atual',
                deStatus:
                  contaDetalhes.status,
                paraStatus:
                  contaDetalhes.status,
                observacao: [
                  '[ALTERAÇÃO DE DADOS]',
                  ...alteracoesLocais,
                ].join('\n'),
              },
            ]
          : contaDetalhes.historico || [];

      const contaAtualizada = {
        ...contaDetalhes,
        ...dadosAtualizados,
        historico: historicoLocal,
      };

      setContaDetalhes(contaAtualizada);
      setFormDetalhes(
        montarFormDetalhes(contaAtualizada)
      );
      setEditandoDetalhes(false);

      await recarregarDados();

      alert('Conta atualizada com sucesso.');
    } catch (error: any) {
      console.error(
        'Erro ao editar conta:',
        error
      );
      alert(
        error?.message ||
          'Não foi possível salvar as alterações.'
      );
    } finally {
      setSalvandoDetalhes(false);
    }
  };

  const anexarArquivoNaConta = async (
    arquivo?: File
  ) => {
    if (!temPermissao('contas_pagar', 'anexar')) { alert('Você não tem permissão para esta ação.'); return; }
    if (!arquivo || !contaDetalhes) return;

    const processoDbId =
      obterProcessoDbId(contaDetalhes);

    if (!processoDbId) {
      alert(
        'Esta conta não possui o identificador interno necessário para receber anexos. Atualize os dados e tente novamente.'
      );
      return;
    }

    if (typeof anexarDocumentoProcesso !== 'function') {
      alert(
        'A função de anexar documentos não está disponível.'
      );
      return;
    }

    const limiteBytes = 15 * 1024 * 1024;

    if (arquivo.size > limiteBytes) {
      alert(
        'O arquivo ultrapassa o limite de 15 MB.'
      );
      return;
    }

    try {
      setEnviandoDocumentoConta(true);

      await anexarDocumentoProcesso({
        processoDbId,
        file: arquivo,
        tipo: 'conta_pagar',
        enviadoPor: 'Contas a Pagar',
      });

      await carregarDocumentosConta(contaDetalhes);

      alert('Arquivo anexado com sucesso.');
    } catch (error: any) {
      console.error(
        'Erro ao anexar arquivo na conta:',
        error
      );

      alert(
        error?.message ||
          'Não foi possível anexar o arquivo.'
      );
    } finally {
      setEnviandoDocumentoConta(false);

      if (inputAnexoContaRef.current) {
        inputAnexoContaRef.current.value = '';
      }
    }
  };

  const abrirDocumentoConta = (documento: any) => {
    const url = String(
      documento?.url ??
        documento?.arquivoUrl ??
        documento?.arquivo_url ??
        documento?.publicUrl ??
        ''
    ).trim();

    if (!url) {
      alert(
        'Este documento não possui uma URL disponível para abertura.'
      );
      return;
    }

    window.open(
      url,
      '_blank',
      'noopener,noreferrer'
    );
  };


  const excluirAnexoConta = async (
    documento: any
  ) => {
    if (!temPermissao('contas_pagar', 'excluir_anexo')) { alert('Você não tem permissão para esta ação.'); return; }
    const documentoId = String(
      documento?.id ?? ''
    ).trim();

    if (!documentoId) {
      alert(
        'Não foi possível identificar este anexo.'
      );
      return;
    }

    const nomeDocumento = String(
      documento?.nome ??
        documento?.nomeArquivo ??
        documento?.nome_arquivo ??
        'arquivo'
    );

    const confirmou = window.confirm(
      `Deseja realmente excluir o anexo "${nomeDocumento}"?\n\n` +
        'O arquivo será removido permanentemente. Esta ação não poderá ser desfeita.'
    );

    if (!confirmou) return;

    try {
      setDocumentoExcluindoId(documentoId);

      await excluirDocumentoProcesso(
        documentoId
      );

      setDocumentosConta(prev =>
        prev.filter(
          (item: any) =>
            String(item?.id ?? '') !==
            documentoId
        )
      );

      if (contaDetalhes) {
        await carregarDocumentosConta(
          contaDetalhes
        );
      }

      alert('Anexo excluído com sucesso.');
    } catch (error: any) {
      console.error(
        'Erro ao excluir anexo:',
        error
      );

      alert(
        error?.message ||
          'Não foi possível excluir o anexo.'
      );
    } finally {
      setDocumentoExcluindoId(null);
    }
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

      /*
       * Centro de custo é OPCIONAL na importação.
       *
       * Esta normalização também protege a tela caso exista
       * algum build/cache antigo do service ainda retornando
       * "Centro de custo não informado" como atenção.
       */
      const linhasNormalizadas = linhas.map(
        (linha: any) => {
          const mensagens = String(
            linha.mensagem || ''
          )
            .split('•')
            .map((item: string) => item.trim())
            .filter(Boolean)
            .filter(
              (item: string) =>
                item.toLocaleLowerCase('pt-BR') !==
                'centro de custo não informado'
            );

          return {
            ...linha,
            mensagem: mensagens.join(' • '),
            status:
              mensagens.length > 0
                ? 'atencao'
                : 'valido',
          };
        }
      );

      setArquivoImportacaoNome(arquivo.name);
      setPreviewImportacao(linhasNormalizadas);
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
    if (!temPermissao('contas_pagar', 'importar')) { alert('Você não tem permissão para esta ação.'); return; }
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

      const centrosMap = new Map<string, string>();

      (centrosCustos || []).forEach((centro: any) => {
        const id = String(centro.id ?? centro.dbId ?? '');
        const planoId = String(
          centro.planoFinanceiroId ??
            centro.plano_financeiro_id ??
            ''
        );

        if (id && planoId) {
          centrosMap.set(
            `${planoId}::${normalizarNomeImportacao(centro.nome || '')}`,
            id
          );
        }
      });

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

      let criadas = 0;

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

        let centroId: string | null = null;

        if (linha.centroCusto?.trim()) {
          const chaveCentro =
            `${planoId}::${normalizarNomeImportacao(
              linha.centroCusto
            )}`;

          centroId =
            centrosMap.get(chaveCentro) || null;

          if (!centroId) {
            if (
              typeof cadastrarCentroCusto !== 'function'
            ) {
              throw new Error(
                'Não foi possível criar o centro de custo informado.'
              );
            }

            const resultadoCentro =
              await cadastrarCentroCusto({
                nome: linha.centroCusto,
                descricao:
                  'Criado automaticamente pela importação de contas a pagar.',
                planoFinanceiroId: planoId,
                orcamentoMensal: 0,
                limiteMensal: 0,
                tetoMensal: 0,
                tetoAnual: 0,
                utilizado: 0,
                comprometido: 0,
              } as any);

            centroId =
              obterIdCadastro(resultadoCentro) || null;

            if (!centroId) {
              centroId =
                await contasPagarImportService.buscarCentro({
                  organizacaoId:
                    organizacaoAtivaId || undefined,
                  empresaId: empresaImportacaoId,
                  planoFinanceiroId: planoId,
                  nome: linha.centroCusto,
                });
            }

            if (!centroId) {
              throw new Error(
                `O centro "${linha.centroCusto}" foi criado, mas não foi possível localizar o ID no banco.`
              );
            }

            centrosMap.set(
              chaveCentro,
              centroId
            );
          }
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

        await criarNovaConta({
          organizacaoId:
            organizacaoAtivaId || undefined,
          empresaId: empresaImportacaoId,
          fornecedorId,
          planoFinanceiroId: planoId,
          planoId,
          centroCustoId: centroId,
          centroId: centroId || undefined,
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

        criadas += 1;
      }

      await recarregarDados?.();

      setModalImportacaoOpen(false);
      setPreviewImportacao([]);
      setArquivoImportacaoNome('');

      alert(
        `${criadas} conta(s) importada(s) com sucesso. Registros repetidos também foram mantidos.`
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

  const abrirExcluidos = async () => {
    setModalExcluidosOpen(true); setCarregandoExcluidos(true);
    try { setContasExcluidas(await financeService.listarProcessosExcluidos(organizacaoAtivaId, empresaAtivaId)); }
    catch(e:any) { alert(e?.message || 'Erro ao carregar excluídos.'); }
    finally { setCarregandoExcluidos(false); }
  };
  const restaurarExcluida = async (conta:any) => {
    if(!window.confirm(`Restaurar a conta ${conta.id}?`)) return;
    await financeService.restaurarProcesso(String(conta.id), organizacaoAtivaId);
    setContasExcluidas(v => v.filter(c => c.id !== conta.id));
    await recarregarDados();
  };

  return (
    <div
      className="w-full space-y-5 lg:space-y-8"
      id="accounts-payable-view-container"
    >
      {modalExcluidosOpen && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4"><div className="max-h-[85vh] w-full max-w-6xl overflow-auto rounded-[22px] bg-white p-6 shadow-2xl"><div className="mb-5 flex items-center justify-between"><div><h2 className="text-lg font-bold">Contas excluídas</h2><p className="text-xs text-slate-400">Histórico preservado para auditoria.</p></div><button onClick={() => setModalExcluidosOpen(false)} className="rounded-lg p-2 hover:bg-slate-100"><X className="h-5 w-5"/></button></div>{carregandoExcluidos ? <div className="p-8 text-center text-xs text-slate-400">Carregando...</div> : contasExcluidas.length===0 ? <div className="p-8 text-center text-xs text-slate-400">Nenhuma conta excluída.</div> : <div className="overflow-x-auto"><table className="min-w-full text-left text-xs"><thead className="bg-slate-50 text-slate-400"><tr><th className="p-3">Conta</th><th className="p-3">Favorecido/Descrição</th><th className="p-3">Vencimento</th><th className="p-3">Valor</th><th className="p-3">Excluído em</th><th className="p-3">Por</th><th className="p-3">Motivo</th><th className="p-3"></th></tr></thead><tbody>{contasExcluidas.map(c => <tr key={c.id} className="border-t"><td className="p-3 font-bold">{c.id}</td><td className="p-3">{c.descricao}</td><td className="p-3">{c.dataVencimento || c.prazo || '-'}</td><td className="p-3 font-mono">{formatarReal(c.valor)}</td><td className="p-3">{c.excluidoEm ? new Date(c.excluidoEm).toLocaleString('pt-BR') : '-'}</td><td className="p-3">{c.excluidoPorNome || '-'}</td><td className="p-3 max-w-[240px]">{c.motivoExclusao || '-'}</td><td className="p-3"><div className="flex gap-2"><button onClick={() => { abrirDetalhesConta(c); setModalExcluidosOpen(false); }} className="rounded-lg border px-3 py-2 font-bold">Detalhes</button><button onClick={() => restaurarExcluida(c)} className="rounded-lg bg-slate-900 px-3 py-2 font-bold text-white">Restaurar</button></div></td></tr>)}</tbody></table></div>}</div></div>}

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

          <button type="button" onClick={abrirExcluidos} className="flex flex-1 items-center justify-center gap-2 rounded-[12px] border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 transition hover:bg-slate-50 md:flex-none"><Trash2 className="h-4 w-4" />Excluídos</button>

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
            onClick={exportarContasExcel}
            disabled={
              contasFiltradas.length === 0
            }
            className="flex flex-1 items-center justify-center gap-2 rounded-[12px] bg-emerald-50 px-4 py-2.5 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50 md:flex-none"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Excel
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
          titulo="A vencer"
          valor={formatarReal(resumoFinanceiroFiltrado.aVencer)}
          icon={Clock}
          classe="text-amber-600 bg-amber-50"
        />

        <Card
          titulo="Vencido"
          valor={formatarReal(resumoFinanceiroFiltrado.vencido)}
          icon={AlertTriangle}
          classe="text-red-600 bg-red-50"
        />

        <Card
          titulo="Pago"
          valor={formatarReal(resumoFinanceiroFiltrado.pago)}
          icon={Check}
          classe="text-emerald-600 bg-emerald-50"
        />

        <Card
          titulo="Total"
          valor={formatarReal(resumoFinanceiroFiltrado.total)}
          icon={Wallet}
        />
      </div>

      <div className="rounded-[18px] border border-slate-100 bg-white p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-9">
          <div className="flex items-center gap-2 rounded-[12px] bg-slate-50 px-3.5">
            <Search className="h-4 w-4 text-slate-400" />

            <input
              value={busca}
              onChange={event =>
                setBusca(event.target.value)
              }
              placeholder="Processo, favorecido, nº da conta..."
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
            value={planoFiltro}
            onChange={event =>
              setPlanoFiltro(event.target.value)
            }
            className="rounded-[12px] border-0 bg-slate-50 px-3.5 py-2.5 text-xs"
          >
            <option value="">
              Todos os planos
            </option>

            {planosFinanceiros.map((plano: any) => (
              <option
                key={plano.id ?? plano.dbId}
                value={String(plano.id ?? plano.dbId)}
              >
                {plano.nome}
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

          <select
            value={ordenacaoVencimento}
            onChange={event =>
              setOrdenacaoVencimento(
                event.target.value as
                  | 'asc'
                  | 'desc'
              )
            }
            className="rounded-[12px] border-0 bg-slate-50 px-3.5 py-2.5 text-xs"
            title="Ordenar por vencimento"
          >
            <option value="asc">
              Vencimento: mais antigo
            </option>
            <option value="desc">
              Vencimento: mais recente
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

      {contasFiltradas.length > 0 && (
        <div className="rounded-[18px] border border-slate-100 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                  <CheckSquare2 className="h-4 w-4" />
                </div>

                <div>
                  <p className="text-xs font-bold text-slate-800">
                    Ações em massa
                  </p>
                  <p className="mt-0.5 text-[10px] text-slate-400">
                    Selecione as contas e escolha a operação desejada.
                  </p>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[9px] font-bold text-emerald-700">
                  {contasSelecionadasDetalhes.length} para pagar • {formatarReal(totalSelecionadoPagamentoMassa)}
                </span>

                <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[9px] font-bold text-amber-700">
                  {contasEstornoSelecionadasDetalhes.length} para estorno • {formatarReal(totalPagoSelecionadoEstorno)}
                </span>

                <span className="rounded-full bg-red-50 px-2.5 py-1 text-[9px] font-bold text-red-600">
                  {contasExclusaoSelecionadasDetalhes.length} para exclusão
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2 xl:items-end">
              <div className="flex flex-wrap gap-2">
                {contasElegiveisPagamentoMassa.length > 0 && (
                  <button
                    type="button"
                    onClick={alternarTodasContas}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[9px] font-bold text-slate-600 transition hover:bg-slate-50"
                  >
                    {todasElegiveisSelecionadas
                      ? 'Limpar em aberto'
                      : 'Selecionar em aberto'}
                  </button>
                )}

                {contasElegiveisEstornoMassa.length > 0 && (
                  <button
                    type="button"
                    onClick={alternarTodasContasPagas}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[9px] font-bold text-slate-600 transition hover:bg-slate-50"
                  >
                    {todasPagasElegiveisSelecionadas
                      ? 'Limpar pagas'
                      : 'Selecionar pagas'}
                  </button>
                )}

                <button
                  type="button"
                  onClick={alternarTodasContasExclusao}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[9px] font-bold text-slate-600 transition hover:bg-slate-50"
                >
                  {todasContasExclusaoSelecionadas
                    ? 'Limpar exclusão'
                    : 'Selecionar p/ excluir'}
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={abrirPagamentoMassa}
                  disabled={contasSelecionadasDetalhes.length === 0}
                  className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-[9px] font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-35"
                >
                  <Check className="h-3.5 w-3.5" />
                  Pagar selecionadas
                </button>

                <button
                  type="button"
                  onClick={abrirEstornoMassa}
                  disabled={contasEstornoSelecionadasDetalhes.length === 0}
                  className="flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2 text-[9px] font-bold text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-35"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Desfazer pagamentos
                </button>

                <button
                  type="button"
                  onClick={abrirExclusaoMassa}
                  disabled={contasExclusaoSelecionadasDetalhes.length === 0}
                  className="flex items-center gap-1.5 rounded-xl border border-red-200 bg-white px-3.5 py-2 text-[9px] font-bold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-35"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Excluir selecionadas
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="hidden w-full overflow-visible rounded-[18px] border border-slate-100 bg-white shadow-sm lg:block">
        {contasFiltradas.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-xs text-slate-400">Nenhuma conta encontrada.</p>
          </div>
        ) : (
          <div className="w-full">
            <div className="grid w-full grid-cols-[34px_1.2fr_1.35fr_1.1fr_.8fr_.8fr_1.15fr] items-center gap-3 border-b border-slate-100 bg-slate-50/80 px-4 py-3 text-[8px] font-bold uppercase tracking-[0.08em] text-slate-400">
              <button
                type="button"
                onClick={alternarTodasContas}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-200"
                title={todasElegiveisSelecionadas ? 'Limpar seleção' : 'Selecionar contas em aberto'}
              >
                {todasElegiveisSelecionadas ? (
                  <CheckSquare2 className="h-4 w-4 text-emerald-600" />
                ) : (
                  <Square className="h-4 w-4" />
                )}
              </button>

              <span>Conta</span>
              <span>Favorecido</span>
              <span>Plano de contas</span>
              <span>Vencimento</span>
              <span>Valor</span>
              <span className="text-right">Ações</span>
            </div>

            <div className="divide-y divide-slate-100">
              {contasPaginadas.map((processo: any, index: number) => {
                const fornecedor = fornecedores.find(
                  (item: any) => item.id === processo.fornecedorId
                );

                const empresa = empresas.find(
                  (item: any) => item.id === processo.empresaId
                );

                const plano = planosFinanceiros.find(
                  (item: any) =>
                    String(item.id ?? item.dbId ?? '') ===
                    String(
                      processo.planoFinanceiroId ??
                        processo.planoId ??
                        ''
                    )
                );

                const pago = contaPaga(processo);
                const vencimento = dataBase(processo);
                const vencida = !pago && Boolean(vencimento) && vencimento < hoje;

                const favorecido =
                  processo.tipoPagamento === 'interno'
                    ? processo.beneficiarioInterno || 'Pagamento interno'
                    : fornecedor?.nome || '-';

                const metodo = String(
                  processo.metodoPagamento ||
                    processo.formaPagamento ||
                    '-'
                ).toUpperCase();

                const saldo = obterSaldoPagar(processo);
                const valorPagoAtual = obterValorPago(processo);

                return (
                  <div
                    key={processo.id}
                    className={`relative grid w-full grid-cols-[34px_1.2fr_1.35fr_1.1fr_.8fr_.8fr_1.15fr] items-center gap-3 px-4 py-3 transition-colors hover:bg-slate-50/70 ${
                      contasSelecionadas.has(String(processo.id))
                        ? 'bg-emerald-50/40'
                        : index % 2 === 1
                        ? 'bg-slate-50/20'
                        : 'bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-center">
                      <button
                        type="button"
                        onClick={() =>
                          pago
                            ? alternarContaEstornoSelecionada(String(processo.id))
                            : alternarContaSelecionada(String(processo.id))
                        }
                        className="flex h-8 w-8 items-center justify-center rounded-[10px] border border-transparent text-slate-400 transition hover:border-slate-200 hover:bg-white hover:text-slate-700"
                        title={pago ? 'Selecionar para estorno' : 'Selecionar para pagamento'}
                      >
                        {(pago
                          ? contasEstornoSelecionadas.has(String(processo.id))
                          : contasSelecionadas.has(String(processo.id))) ? (
                          <CheckSquare2
                            className={`h-4 w-4 ${
                              pago ? 'text-amber-600' : 'text-emerald-600'
                            }`}
                          />
                        ) : (
                          <Square className="h-4 w-4" />
                        )}
                      </button>
                    </div>

                    <div className="min-w-0">
                      <p
                        className="truncate font-mono text-[9px] font-bold text-slate-700"
                        title={String(processo.id)}
                      >
                        {processo.id}
                      </p>
                      <p
                        className="mt-1 truncate text-[9px] font-medium text-slate-400"
                        title={processo.descricao || ''}
                      >
                        {processo.descricao ||
                          (processo.tipoPagamento === 'interno'
                            ? 'Pagamento interno'
                            : 'Conta a pagar')}
                      </p>
                    </div>

                    <div className="min-w-0">
                      <p
                        className="truncate text-[10px] font-bold text-slate-800"
                        title={favorecido}
                      >
                        {favorecido}
                      </p>
                      <p className="mt-1 truncate font-mono text-[8px] text-slate-400">
                        {fornecedor?.cnpj ||
                          fornecedor?.cnpjCpf ||
                          'Documento não informado'}
                      </p>
                    </div>

                    <div className="min-w-0">
                      <p
                        className="truncate text-[9px] font-bold text-slate-700"
                        title={plano?.nome || 'Plano não informado'}
                      >
                        {plano?.nome || 'Não informado'}
                      </p>
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <CalendarDays className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                        <p className="truncate font-mono text-[9px] font-semibold text-slate-700">
                          {vencimento || '-'}
                        </p>
                      </div>

                      <div className="mt-1.5">
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-[7px] font-bold ${
                            pago
                              ? 'bg-emerald-50 text-emerald-700'
                              : vencida
                              ? 'bg-red-50 text-red-700'
                              : valorPagoAtual > 0.001
                              ? 'bg-violet-50 text-violet-700'
                              : 'bg-amber-50 text-amber-700'
                          }`}
                        >
                          {pago
                            ? 'Paga'
                            : vencida
                            ? 'Vencida'
                            : valorPagoAtual > 0.001
                            ? 'Parcial'
                            : 'A vencer'}
                        </span>
                      </div>
                    </div>

                    <div className="min-w-0">
                      <p className="text-[7px] font-bold uppercase text-slate-400">
                        Valor
                      </p>
                      <p className="mt-1 truncate font-mono text-[10px] font-bold text-slate-800">
                        {formatarReal(Number(processo.valor || 0))}
                      </p>
                    </div>

                    <div className="relative min-w-0">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => abrirDetalhesConta(processo)}
                          className="inline-flex h-8 items-center justify-center rounded-[9px] border border-slate-200 bg-white px-2.5 text-[8px] font-bold text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-900"
                        >
                          Detalhes
                        </button>

                        {!pago && (
                          <button
                            type="button"
                            onClick={() => abrirModalPagamento(processo)}
                            className="inline-flex h-8 items-center justify-center rounded-[9px] bg-emerald-600 px-2.5 text-[8px] font-bold text-white shadow-sm transition hover:bg-emerald-700"
                          >
                            Pagar
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() =>
                            setMenuAcoesId(atual =>
                              atual === String(processo.id)
                                ? null
                                : String(processo.id)
                            )
                          }
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:bg-slate-50 hover:text-slate-800"
                          title="Mais ações"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      </div>

                      {!pago && (
                        <div className="mt-2 flex items-center justify-end gap-1.5">
                          <span className="text-[7px] font-bold uppercase tracking-wide text-slate-400">
                            Programar
                          </span>
                          <input
                            id={`data-programacao-${processo.id}`}
                            type="date"
                            defaultValue={processo.dataProgramadaPagamento || ''}
                            className="h-7 w-[112px] rounded-[8px] border border-slate-200 bg-slate-50 px-1.5 font-mono text-[8px] text-slate-600 outline-none focus:border-slate-400"
                          />
                          <button
                            type="button"
                            onClick={() => programar(processo.id)}
                            className="h-7 rounded-[8px] bg-slate-100 px-2 text-[8px] font-bold text-slate-600 transition hover:bg-slate-200"
                            title="Salvar programação"
                          >
                            Salvar
                          </button>
                        </div>
                      )}

                      {menuAcoesId === String(processo.id) && (
                        <div className="absolute right-0 top-10 z-30 w-56 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                          {valorPagoAtual > 0.001 && (
                            <button
                              type="button"
                              onClick={() => {
                                setMenuAcoesId(null);
                                abrirModalEstorno(processo);
                              }}
                              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[10px] font-bold text-amber-700 hover:bg-amber-50"
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                              Desfazer último pagamento
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              setMenuAcoesId(null);
                              alternarContaExclusaoSelecionada(
                                String(processo.id)
                              );
                            }}
                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[10px] font-bold text-slate-600 hover:bg-slate-50"
                          >
                            <CheckSquare2 className="h-3.5 w-3.5" />
                            Selecionar para exclusão
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setMenuAcoesId(null);
                              abrirModalExclusao(processo);
                            }}
                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[10px] font-bold text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Excluir conta
                          </button>
                        </div>
                      )}
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

            const marcadaExclusao =
              contasExclusaoSelecionadas.has(String(processo.id));

            return (
              <article
                key={processo.id}
                className={`rounded-[18px] border bg-white p-4 shadow-sm ${
                  marcadaExclusao
                    ? 'border-red-300 ring-2 ring-red-100'
                    : contasSelecionadas.has(String(processo.id))
                      ? 'border-emerald-300 ring-2 ring-emerald-100'
                      : contasEstornoSelecionadas.has(String(processo.id))
                        ? 'border-amber-300 ring-2 ring-amber-100'
                        : 'border-slate-100'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      pago
                        ? alternarContaEstornoSelecionada(
                            String(processo.id)
                          )
                        : alternarContaSelecionada(
                            String(processo.id)
                          )
                    }
                    className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                      pago ? 'bg-amber-50' : 'bg-emerald-50'
                    }`}
                    title={
                      pago
                        ? 'Selecionar para desfazer pagamento em massa'
                        : 'Selecionar para pagamento em massa'
                    }
                  >
                    {pago ? (
                      contasEstornoSelecionadas.has(
                        String(processo.id)
                      ) ? (
                        <CheckSquare2 className="h-5 w-5 text-amber-600" />
                      ) : (
                        <Square className="h-5 w-5 text-amber-500" />
                      )
                    ) : contasSelecionadas.has(
                        String(processo.id)
                      ) ? (
                      <CheckSquare2 className="h-5 w-5 text-emerald-600" />
                    ) : (
                      <Square className="h-5 w-5 text-emerald-500" />
                    )}
                  </button>

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
                      abrirDetalhesConta(processo)
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

                <button
                  type="button"
                  onClick={() =>
                    setMenuAcoesId(atual =>
                      atual === String(processo.id)
                        ? null
                        : String(processo.id)
                    )
                  }
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-3 text-[10px] font-bold text-slate-600"
                >
                  <MoreHorizontal className="h-4 w-4" />
                  Mais ações
                </button>

                {menuAcoesId === String(processo.id) && (
                  <div className="mt-2 space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    {obterValorPago(processo) > 0.001 && (
                      <button
                        type="button"
                        onClick={() => {
                          setMenuAcoesId(null);
                          abrirModalEstorno(processo);
                        }}
                        className="flex w-full items-center justify-center gap-2 rounded-xl border border-amber-200 bg-white py-3 text-[10px] font-bold text-amber-700"
                      >
                        <RotateCcw className="h-4 w-4" />
                        Desfazer último pagamento
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() =>
                        alternarContaExclusaoSelecionada(String(processo.id))
                      }
                      className={`flex w-full items-center justify-center gap-2 rounded-xl border py-3 text-[10px] font-bold ${
                        marcadaExclusao
                          ? 'border-red-200 bg-red-50 text-red-700'
                          : 'border-slate-200 bg-white text-slate-600'
                      }`}
                    >
                      {marcadaExclusao ? (
                        <CheckSquare2 className="h-4 w-4" />
                      ) : (
                        <Square className="h-4 w-4" />
                      )}
                      {marcadaExclusao
                        ? 'Marcada para exclusão'
                        : 'Selecionar para exclusão'}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setMenuAcoesId(null);
                        abrirModalExclusao(processo);
                      }}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 py-3 text-[10px] font-bold text-white"
                    >
                      <Trash2 className="h-4 w-4" />
                      Excluir conta
                    </button>
                  </div>
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

      {processoExcluindo && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-[24px] bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-100 p-5 sm:p-6">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-50">
                  <Trash2 className="h-5 w-5 text-red-600" />
                </div>

                <div>
                  <h2 className="text-base font-bold text-[#0F172A]">
                    Excluir conta
                  </h2>
                  <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                    Esta ação remove a conta permanentemente do FLOWFINANCE.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={fecharModalExclusao}
                disabled={excluindoConta}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 disabled:opacity-40"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 p-5 sm:p-6">
              <div className="rounded-2xl border border-red-100 bg-red-50 p-4">
                <p className="text-[10px] font-bold uppercase text-red-600">
                  Conta que será excluída
                </p>
                <p className="mt-2 font-mono text-xs font-bold text-red-800">
                  {processoExcluindo.id}
                </p>
                <p className="mt-1 text-xs font-semibold text-slate-700">
                  {processoExcluindo.descricao || 'Sem descrição'}
                </p>
                <p className="mt-2 font-mono text-sm font-bold text-[#0F172A]">
                  {formatarReal(Number(processoExcluindo.valor || 0))}
                </p>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-red-600">
                  Confirmação de segurança
                </label>
                <p className="mt-1 text-[10px] text-slate-500">
                  Digite <strong>EXCLUIR</strong> para liberar a exclusão.
                </p>
                <textarea value={motivoExclusao} onChange={e => setMotivoExclusao(e.target.value)} placeholder="Motivo da exclusão (obrigatório)" className="mb-3 min-h-[80px] w-full rounded-[12px] border border-slate-200 p-3 text-xs" />
                <input
                  value={confirmacaoExclusao}
                  onChange={event => setConfirmacaoExclusao(event.target.value)}
                  placeholder="DIGITE EXCLUIR"
                  disabled={excluindoConta}
                  className="mt-2 w-full rounded-xl border border-red-200 bg-white px-3.5 py-3 text-xs font-bold uppercase text-red-700 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={fecharModalExclusao}
                  disabled={excluindoConta}
                  className="flex-1 rounded-xl bg-slate-100 py-3 text-xs font-bold text-slate-600 hover:bg-slate-200 disabled:opacity-40"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={confirmarExclusao}
                  disabled={
                    excluindoConta ||
                    confirmacaoExclusao.trim().toUpperCase() !== 'EXCLUIR'
                  }
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 py-3 text-xs font-bold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {excluindoConta ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  {excluindoConta ? 'Excluindo...' : 'Excluir conta'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {modalExclusaoMassaOpen && (
        <div className="fixed inset-0 z-[96] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[24px] bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-100 p-5 sm:p-6">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-50">
                  <ShieldAlert className="h-5 w-5 text-red-600" />
                </div>

                <div>
                  <h2 className="text-base font-bold text-[#0F172A]">
                    Excluir contas em massa
                  </h2>
                  <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                    Revise com atenção. As contas selecionadas serão removidas permanentemente.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={fecharExclusaoMassa}
                disabled={excluindoEmMassa}
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
                    {contasExclusaoSelecionadasDetalhes.length}
                  </p>
                </div>

                <div className="rounded-2xl bg-red-50 p-4">
                  <p className="text-[10px] font-bold uppercase text-red-600">
                    Ação
                  </p>
                  <p className="mt-2 text-sm font-bold text-red-700">
                    Exclusão permanente
                  </p>
                </div>
              </div>

              <div className="max-h-48 space-y-2 overflow-y-auto pr-1">
                {contasExclusaoSelecionadasDetalhes.map((processo: any) => (
                  <div
                    key={processo.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 px-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[10px] font-bold text-slate-700">
                        {processo.descricao || processo.id}
                      </p>
                      <p className="mt-0.5 font-mono text-[9px] text-slate-400">
                        {processo.id}
                      </p>
                    </div>
                    <span className="shrink-0 font-mono text-[10px] font-bold text-slate-700">
                      {formatarReal(Number(processo.valor || 0))}
                    </span>
                  </div>
                ))}
              </div>

              <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
                <p className="text-[10px] font-bold text-red-700">
                  Confirmação de segurança
                </p>
                <p className="mt-1 text-[10px] leading-relaxed text-red-600">
                  Digite <strong>EXCLUIR</strong> abaixo. Depois ainda será exibida uma confirmação final do navegador.
                </p>

                <input
                  value={confirmacaoExclusaoMassa}
                  onChange={event => setConfirmacaoExclusaoMassa(event.target.value)}
                  placeholder="DIGITE EXCLUIR"
                  disabled={excluindoEmMassa}
                  className="mt-3 w-full rounded-xl border border-red-200 bg-white px-3.5 py-3 text-xs font-bold uppercase text-red-700 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
                />
              </div>

              {excluindoEmMassa && (
                <div className="rounded-xl bg-slate-50 p-3">
                  <div className="flex items-center justify-between text-[10px] font-bold text-slate-600">
                    <span>Excluindo contas...</span>
                    <span>
                      {progressoExclusaoMassa.atual}/{progressoExclusaoMassa.total}
                    </span>
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={fecharExclusaoMassa}
                  disabled={excluindoEmMassa}
                  className="flex-1 rounded-xl bg-slate-100 py-3 text-xs font-bold text-slate-600 hover:bg-slate-200 disabled:opacity-40"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={confirmarExclusaoMassa}
                  disabled={
                    excluindoEmMassa ||
                    confirmacaoExclusaoMassa.trim().toUpperCase() !== 'EXCLUIR'
                  }
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 py-3 text-xs font-bold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {excluindoEmMassa ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  {excluindoEmMassa
                    ? 'Excluindo...'
                    : `Excluir ${contasExclusaoSelecionadasDetalhes.length} conta(s)`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {modalEstornoMassaOpen && (
        <div className="fixed inset-0 z-[85] flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[24px] bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-100 p-5 sm:p-6">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-50">
                  <RotateCcw className="h-5 w-5 text-red-600" />
                </div>

                <div>
                  <h2 className="text-base font-bold text-[#0F172A]">
                    Desfazer pagamentos em massa
                  </h2>
                  <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                    Será estornado apenas o último pagamento ativo de cada conta selecionada.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={fecharEstornoMassa}
                disabled={estornandoEmMassa}
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
                    {contasEstornoSelecionadasDetalhes.length}
                  </p>
                </div>

                <div className="rounded-2xl bg-red-50 p-4">
                  <p className="text-[10px] font-bold uppercase text-red-600">
                    Valor pago atual
                  </p>
                  <p className="mt-2 font-mono text-xl font-bold text-red-700">
                    {formatarReal(totalPagoSelecionadoEstorno)}
                  </p>
                </div>
              </div>

              <div className="max-h-52 overflow-y-auto rounded-2xl border border-slate-100">
                {contasEstornoSelecionadasDetalhes.map((processo: any) => {
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
                          {processo.id}
                        </p>
                      </div>

                      <p className="shrink-0 font-mono text-xs font-bold text-red-700">
                        Pago: {formatarReal(obterValorPago(processo))}
                      </p>
                    </div>
                  );
                })}
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500">
                  Motivo do estorno em lote
                </label>
                <textarea
                  value={motivoEstornoMassa}
                  onChange={event =>
                    setMotivoEstornoMassa(event.target.value)
                  }
                  rows={3}
                  placeholder="Ex.: Pagamentos importados ou registrados incorretamente."
                  disabled={estornandoEmMassa}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 text-xs outline-none focus:border-red-300 disabled:bg-slate-50"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500">
                  Digite DESFAZER para confirmar
                </label>
                <input
                  value={confirmacaoEstornoMassa}
                  onChange={event =>
                    setConfirmacaoEstornoMassa(event.target.value)
                  }
                  disabled={estornandoEmMassa}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 text-xs font-bold uppercase outline-none focus:border-red-300 disabled:bg-slate-50"
                />
              </div>

              {estornandoEmMassa && (
                <div className="rounded-2xl bg-slate-50 p-4">
                  <div className="flex items-center justify-between text-[10px] font-bold text-slate-600">
                    <span>Processando estornos...</span>
                    <span>
                      {progressoEstornoMassa.atual}/{progressoEstornoMassa.total}
                    </span>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-red-600 transition-all"
                      style={{
                        width: `${
                          progressoEstornoMassa.total
                            ? (progressoEstornoMassa.atual /
                                progressoEstornoMassa.total) *
                              100
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-100 p-5">
              <button
                type="button"
                onClick={fecharEstornoMassa}
                disabled={estornandoEmMassa}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={confirmarEstornoMassa}
                disabled={
                  estornandoEmMassa ||
                  motivoEstornoMassa.trim().length < 5 ||
                  confirmacaoEstornoMassa.trim().toUpperCase() !==
                    'DESFAZER'
                }
                className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-40"
              >
                {estornandoEmMassa && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                Desfazer {contasEstornoSelecionadasDetalhes.length} pagamento(s)
              </button>
            </div>
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


      {contaDetalhes && (() => {
        const fornecedorDetalhes = fornecedores.find(
          (item: any) =>
            String(item.id) ===
            String(contaDetalhes.fornecedorId)
        );

        const empresaDetalhes = empresas.find(
          (item: any) =>
            String(item.id) ===
            String(contaDetalhes.empresaId)
        );

        const planoDetalhes = planosFinanceiros.find(
          (item: any) =>
            String(item.id ?? item.dbId ?? '') ===
            String(
              contaDetalhes.planoFinanceiroId ??
                contaDetalhes.planoId ??
                ''
            )
        );

        const centroDetalhes = centrosCustos.find(
          (item: any) =>
            String(item.id ?? item.dbId ?? '') ===
            String(contaDetalhes.centroCustoId ?? '')
        );

        const centrosDisponiveis = centrosCustos.filter(
          (centro: any) =>
            String(
              centro.planoFinanceiroId ??
                centro.planoId ??
                centro.plano_financeiro_id ??
                ''
            ) ===
            String(formDetalhes.planoFinanceiroId ?? '')
        );

        const pagaDetalhes = contaPaga(contaDetalhes);
        const vencimentoDetalhes = dataBase(contaDetalhes);
        const valorPagoDetalhes = Math.max(
          Number(contaDetalhes.valorPago ?? 0),
          0
        );
        const saldoDetalhes = Math.max(
          Number(
            contaDetalhes.saldoPagar ??
              Number(contaDetalhes.valor || 0) -
                valorPagoDetalhes
          ),
          0
        );

        const vencidaDetalhes =
          !pagaDetalhes &&
          Boolean(vencimentoDetalhes) &&
          vencimentoDetalhes < hoje;

        const favorecidoDetalhes =
          contaDetalhes.tipoPagamento === 'interno'
            ? contaDetalhes.beneficiarioInterno ||
              'Pagamento interno'
            : fornecedorDetalhes?.nome ||
              'Não informado';

        const statusTexto = pagaDetalhes
          ? 'Paga'
          : valorPagoDetalhes > 0.001
          ? 'Pagamento parcial'
          : vencidaDetalhes
          ? 'Vencida'
          : contaDetalhes.statusProgramacao ===
            'programado'
          ? 'Programada'
          : 'A vencer';

        const formatarDataBR = (data?: string) => {
          const valor = String(data || '').slice(0, 10);
          if (!valor) return 'Não informado';
          const [ano, mes, dia] = valor.split('-');
          return ano && mes && dia
            ? `${dia}/${mes}/${ano}`
            : valor;
        };

        const dataPagamentoDetalhes =
          String(
            contaDetalhes.dataPagamento ??
              contaDetalhes.data_pagamento ??
              ''
          ).slice(0, 10);

        const historicoDetalhes = [
          ...(
            contaDetalhes.historico ||
            contaDetalhes.historicoProcessos ||
            []
          ),
        ].sort((a: any, b: any) =>
          String(b.data || b.createdAt || '')
            .localeCompare(
              String(
                a.data ||
                  a.createdAt ||
                  ''
              )
            )
        );

        const formatarDataHoraHistorico = (
          valor?: string
        ) => {
          const texto = String(
            valor || ''
          );

          if (!texto) {
            return 'Data não informada';
          }

          const data = texto
            .replace('T', ' ')
            .slice(0, 16);

          const [
            parteData,
            parteHora,
          ] = data.split(' ');

          const [ano, mes, dia] =
            String(
              parteData || ''
            ).split('-');

          const dataBr =
            ano && mes && dia
              ? `${dia}/${mes}/${ano}`
              : parteData;

          return parteHora
            ? `${dataBr} às ${parteHora}`
            : dataBr;
        };

        const vencimentoAtualBR =
          formatarDataBR(
            vencimentoDetalhes
          );

        const historicoCronologico = [
          ...historicoDetalhes,
        ].reverse();

        let vencimentoOriginalDetalhes =
          vencimentoAtualBR;

        for (
          const item of
          historicoCronologico
        ) {
          const observacao = String(
            item.observacao || ''
          );

          const match =
            observacao.match(
              /Vencimento:\s*([^\n→]+?)\s*→/
            );

          if (match?.[1]) {
            vencimentoOriginalDetalhes =
              match[1].trim();
            break;
          }
        }

        const vencimentoFoiAlterado =
          vencimentoOriginalDetalhes !==
          vencimentoAtualBR;

        const campoClass =
          'mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[11px] font-semibold text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100';

        const areaClass =
          'mt-1.5 min-h-[88px] w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[11px] font-medium text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100';

        return (
          <>
            <div
              className="fixed inset-0 z-[70] bg-slate-950/45 backdrop-blur-sm"
              onClick={fecharDetalhesConta}
            />

            <div className="fixed inset-0 z-[71] flex items-center justify-center p-4">
              <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-[22px] bg-white shadow-2xl">
                <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-bold text-[#0F172A]">
                        Detalhes da conta
                      </h2>

                      <Situacao
                        pago={pagaDetalhes}
                        vencida={Boolean(vencidaDetalhes)}
                        programada={
                          contaDetalhes.statusProgramacao ===
                          'programado'
                        }
                      />
                    </div>

                    <p className="mt-1 text-[10px] text-slate-400">
                      {editandoDetalhes
                        ? 'Edite os dados do lançamento e salve as alterações.'
                        : 'Informações completas do lançamento financeiro.'}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    {!editandoDetalhes && (
                      <button
                        type="button"
                        onClick={() =>
                          setEditandoDetalhes(true)
                        }
                        className="inline-flex h-9 items-center justify-center rounded-xl bg-blue-50 px-4 text-[10px] font-bold text-blue-700 transition hover:bg-blue-100"
                      >
                        Editar conta
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={fecharDetalhesConta}
                      disabled={salvandoDetalhes}
                      className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 disabled:opacity-40"
                      title="Fechar"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto p-5">
                  {editandoDetalhes ? (
                    <div className="space-y-5">
                      <section>
                        <p className="mb-3 text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">
                          Identificação
                        </p>

                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                          <label className="text-[9px] font-bold uppercase text-slate-400">
                            Empresa
                            <select
                              value={formDetalhes.empresaId}
                              onChange={e =>
                                atualizarCampoDetalhes(
                                  'empresaId',
                                  e.target.value
                                )
                              }
                              className={campoClass}
                            >
                              <option value="">
                                Selecione
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
                          </label>

                          {contaDetalhes.tipoPagamento !==
                            'interno' && (
                            <label className="text-[9px] font-bold uppercase text-slate-400">
                              Favorecido
                              <select
                                value={
                                  formDetalhes.fornecedorId
                                }
                                onChange={e =>
                                  atualizarCampoDetalhes(
                                    'fornecedorId',
                                    e.target.value
                                  )
                                }
                                className={campoClass}
                              >
                                <option value="">
                                  Selecione
                                </option>
                                {fornecedores.map(
                                  (fornecedor: any) => (
                                    <option
                                      key={fornecedor.id}
                                      value={fornecedor.id}
                                    >
                                      {fornecedor.nome}
                                    </option>
                                  )
                                )}
                              </select>
                            </label>
                          )}

                          <label className="text-[9px] font-bold uppercase text-slate-400">
                            Plano de contas
                            <select
                              value={
                                formDetalhes.planoFinanceiroId
                              }
                              onChange={e => {
                                atualizarCampoDetalhes(
                                  'planoFinanceiroId',
                                  e.target.value
                                );
                                atualizarCampoDetalhes(
                                  'centroCustoId',
                                  ''
                                );
                              }}
                              className={campoClass}
                            >
                              <option value="">
                                Selecione
                              </option>
                              {planosFinanceiros.map(
                                (plano: any) => (
                                  <option
                                    key={
                                      plano.id ?? plano.dbId
                                    }
                                    value={
                                      plano.id ?? plano.dbId
                                    }
                                  >
                                    {plano.nome}
                                  </option>
                                )
                              )}
                            </select>
                          </label>

                          <label className="text-[9px] font-bold uppercase text-slate-400">
                            Centro de custo (opcional)
                            <select
                              value={
                                formDetalhes.centroCustoId
                              }
                              onChange={e =>
                                atualizarCampoDetalhes(
                                  'centroCustoId',
                                  e.target.value
                                )
                              }
                              className={campoClass}
                            >
                              <option value="">
                                Sem centro de custo
                              </option>
                              {centrosDisponiveis.map(
                                (centro: any) => (
                                  <option
                                    key={
                                      centro.id ??
                                      centro.dbId
                                    }
                                    value={
                                      centro.id ??
                                      centro.dbId
                                    }
                                  >
                                    {centro.nome}
                                  </option>
                                )
                              )}
                            </select>
                          </label>
                        </div>
                      </section>

                      <section>
                        <p className="mb-3 text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">
                          Financeiro
                        </p>

                        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                          <label className="text-[9px] font-bold uppercase text-slate-400">
                            Vencimento
                            <input
                              type="date"
                              value={formDetalhes.prazo}
                              onChange={e =>
                                atualizarCampoDetalhes(
                                  'prazo',
                                  e.target.value
                                )
                              }
                              className={campoClass}
                            />
                          </label>

                          <label className="text-[9px] font-bold uppercase text-slate-400">
                            Valor total
                            <input
                              type="number"
                              min="0.01"
                              step="0.01"
                              value={formDetalhes.valor}
                              onChange={e =>
                                atualizarCampoDetalhes(
                                  'valor',
                                  e.target.value
                                )
                              }
                              className={campoClass}
                            />
                          </label>

                          <label className="text-[9px] font-bold uppercase text-slate-400">
                            Parcela
                            <input
                              type="text"
                              value={formDetalhes.parcela}
                              onChange={e =>
                                atualizarCampoDetalhes(
                                  'parcela',
                                  e.target.value
                                )
                              }
                              placeholder="1/1"
                              className={campoClass}
                            />
                          </label>

                          <label className="text-[9px] font-bold uppercase text-slate-400">
                            Forma de pagamento
                            <select
                              value={
                                formDetalhes.formaPagamento
                              }
                              onChange={e =>
                                atualizarCampoDetalhes(
                                  'formaPagamento',
                                  e.target.value
                                )
                              }
                              className={campoClass}
                            >
                              <option value="boleto">
                                Boleto
                              </option>
                              <option value="pix">
                                PIX
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
                          </label>

                          <label className="text-[9px] font-bold uppercase text-slate-400">
                            Chave PIX
                            <input
                              type="text"
                              value={formDetalhes.pixChave}
                              onChange={e =>
                                atualizarCampoDetalhes(
                                  'pixChave',
                                  e.target.value
                                )
                              }
                              className={campoClass}
                            />
                          </label>

                          <label className="text-[9px] font-bold uppercase text-slate-400">
                            Favorecido PIX
                            <input
                              type="text"
                              value={
                                formDetalhes.pixFavorecido
                              }
                              onChange={e =>
                                atualizarCampoDetalhes(
                                  'pixFavorecido',
                                  e.target.value
                                )
                              }
                              className={campoClass}
                            />
                          </label>
                        </div>
                      </section>

                      <section className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        <label className="text-[9px] font-bold uppercase text-slate-400">
                          Descrição
                          <textarea
                            value={formDetalhes.descricao}
                            onChange={e =>
                              atualizarCampoDetalhes(
                                'descricao',
                                e.target.value
                              )
                            }
                            className={areaClass}
                          />
                        </label>

                        <label className="text-[9px] font-bold uppercase text-slate-400">
                          Observações
                          <textarea
                            value={formDetalhes.observacao}
                            onChange={e =>
                              atualizarCampoDetalhes(
                                'observacao',
                                e.target.value
                              )
                            }
                            className={areaClass}
                          />
                        </label>
                      </section>

                      <div className="rounded-[16px] border border-slate-100 bg-slate-50 p-4">
                        <p className="text-[9px] font-bold uppercase text-slate-400">
                          Dados de pagamento
                        </p>
                        <p className="mt-2 text-[10px] leading-5 text-slate-500">
                          Status, valor pago, saldo e data de pagamento são calculados pelo histórico de pagamentos. Para preservar o financeiro, eles não são alterados manualmente nesta edição.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-5">
                      <section>
                        <p className="mb-3 text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">
                          Informações da conta
                        </p>

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                          <DetalheConta
                            label="Conta"
                            value={
                              contaDetalhes.id ||
                              'Não informado'
                            }
                            mono
                          />
                          <DetalheConta
                            label="Favorecido"
                            value={favorecidoDetalhes}
                          />
                          <DetalheConta
                            label="Empresa"
                            value={
                              empresaDetalhes?.nome ||
                              'Não informada'
                            }
                          />
                          <DetalheConta
                            label="Plano de contas"
                            value={
                              planoDetalhes?.nome ||
                              'Não informado'
                            }
                          />
                          <DetalheConta
                            label="Centro de custo"
                            value={
                              centroDetalhes?.nome ||
                              'Não informado'
                            }
                          />
                          <DetalheConta
                            label="Vencimento atual"
                            value={
                              vencimentoAtualBR
                            }
                            mono
                          />
                          <DetalheConta
                            label="Vencimento original"
                            value={
                              vencimentoOriginalDetalhes
                            }
                            mono
                            destaque={
                              vencimentoFoiAlterado
                            }
                          />
                          <DetalheConta
                            label="Valor total"
                            value={formatarReal(
                              Number(
                                contaDetalhes.valor || 0
                              )
                            )}
                            mono
                            destaque
                          />
                          <DetalheConta
                            label="Valor pago"
                            value={formatarReal(
                              valorPagoDetalhes
                            )}
                            mono
                          />
                          <DetalheConta
                            label="Saldo"
                            value={formatarReal(
                              saldoDetalhes
                            )}
                            mono
                          />
                          <DetalheConta
                            label="Data de pagamento"
                            value={
                              dataPagamentoDetalhes
                                ? formatarDataBR(
                                    dataPagamentoDetalhes
                                  )
                                : 'Ainda não pago'
                            }
                            mono
                          />
                          <DetalheConta
                            label="Status"
                            value={statusTexto}
                          />
                          <DetalheConta
                            label="Forma de pagamento"
                            value={String(
                              contaDetalhes.formaPagamento ??
                                contaDetalhes.metodoPagamento ??
                                'Não informada'
                            ).toUpperCase()}
                          />
                          <DetalheConta
                            label="Parcela"
                            value={
                              contaDetalhes.parcela ??
                              contaDetalhes.numeroParcela ??
                              '1/1'
                            }
                          />
                          <DetalheConta
                            label="Chave PIX"
                            value={
                              contaDetalhes.pixChave ||
                              'Não informada'
                            }
                          />
                          <DetalheConta
                            label="Favorecido PIX"
                            value={
                              contaDetalhes.pixFavorecido ||
                              'Não informado'
                            }
                          />
                        </div>
                      </section>

                      <section className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        <div className="rounded-[16px] bg-slate-50 p-4">
                          <p className="text-[9px] font-bold uppercase text-slate-400">
                            Descrição
                          </p>
                          <p className="mt-2 whitespace-pre-wrap text-[11px] leading-5 text-slate-600">
                            {contaDetalhes.descricao ||
                              'Nenhuma descrição cadastrada.'}
                          </p>
                        </div>

                        <div className="rounded-[16px] bg-slate-50 p-4">
                          <p className="text-[9px] font-bold uppercase text-slate-400">
                            Observações
                          </p>
                          <p className="mt-2 whitespace-pre-wrap text-[11px] leading-5 text-slate-600">
                            {contaDetalhes.observacao ||
                              contaDetalhes.observacoes ||
                              'Nenhuma observação cadastrada.'}
                          </p>
                        </div>
                      </section>
                    </div>
                  )}

                  {!editandoDetalhes && (
                    <section className="mt-5 rounded-[18px] border border-slate-100 bg-white p-4 shadow-sm">
                      <div className="mb-4 flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">
                            Histórico de alterações
                          </p>
                          <p className="mt-1 text-[10px] text-slate-400">
                            Registro de mudanças, responsável e data da alteração.
                          </p>
                        </div>

                        <Clock className="h-4 w-4 shrink-0 text-slate-300" />
                      </div>

                      {historicoDetalhes.length === 0 ? (
                        <div className="rounded-[14px] bg-slate-50 px-4 py-5 text-center">
                          <p className="text-[10px] text-slate-400">
                            Nenhuma alteração registrada para esta conta.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {historicoDetalhes.map(
                            (
                              item: any,
                              index: number
                            ) => {
                              const observacao =
                                String(
                                  item.observacao ||
                                    'Alteração registrada.'
                                );

                              const alteracaoDados =
                                observacao.includes(
                                  '[ALTERAÇÃO DE DADOS]'
                                );

                              const textoObservacao =
                                observacao.replace(
                                  '[ALTERAÇÃO DE DADOS]\n',
                                  ''
                                );

                              return (
                                <div
                                  key={
                                    item.id ||
                                    `${item.data}-${index}`
                                  }
                                  className={`rounded-[14px] border p-3.5 ${
                                    alteracaoDados
                                      ? 'border-blue-100 bg-blue-50/50'
                                      : 'border-slate-100 bg-slate-50/70'
                                  }`}
                                >
                                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="min-w-0">
                                      <p className="text-[10px] font-bold text-slate-700">
                                        {alteracaoDados
                                          ? 'Alteração de dados'
                                          : item.paraStatus ||
                                            'Histórico da conta'}
                                      </p>

                                      <p className="mt-0.5 truncate text-[9px] text-slate-400">
                                        Por{' '}
                                        <span className="font-semibold text-slate-500">
                                          {item.usuario ||
                                            'Usuário não identificado'}
                                        </span>
                                      </p>
                                    </div>

                                    <span className="shrink-0 text-[9px] font-medium text-slate-400">
                                      {formatarDataHoraHistorico(
                                        item.data ||
                                          item.createdAt
                                      )}
                                    </span>
                                  </div>

                                  <div className="mt-3 whitespace-pre-wrap rounded-xl bg-white/80 px-3 py-2.5 text-[10px] leading-5 text-slate-600">
                                    {textoObservacao}
                                  </div>
                                </div>
                              );
                            }
                          )}
                        </div>
                      )}
                    </section>
                  )}

                  <section className="mt-5 rounded-[18px] border border-slate-100 bg-white p-4 shadow-sm">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">
                          Anexos
                        </p>
                        <p className="mt-1 text-[10px] text-slate-400">
                          Boleto, nota fiscal, contrato, comprovante ou outro documento.
                        </p>
                      </div>

                      <div className="shrink-0">
                        <input
                          ref={inputAnexoContaRef}
                          type="file"
                          className="hidden"
                          accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.xls,.xlsx,.csv,.txt"
                          onChange={event =>
                            anexarArquivoNaConta(
                              event.target.files?.[0]
                            )
                          }
                        />

                        <button
                          type="button"
                          onClick={() =>
                            inputAnexoContaRef.current?.click()
                          }
                          disabled={
                            enviandoDocumentoConta ||
                            !obterProcessoDbId(
                              contaDetalhes
                            )
                          }
                          className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-blue-50 px-3.5 text-[10px] font-bold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {enviandoDocumentoConta ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Upload className="h-3.5 w-3.5" />
                          )}
                          {enviandoDocumentoConta
                            ? 'Enviando...'
                            : 'Anexar arquivo'}
                        </button>
                      </div>
                    </div>

                    <div className="mt-4">
                      {carregandoDocumentosConta ? (
                        <div className="flex items-center justify-center gap-2 rounded-xl bg-slate-50 px-4 py-5 text-[10px] font-semibold text-slate-400">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Carregando anexos...
                        </div>
                      ) : documentosConta.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-5 text-center">
                          <FileText className="mx-auto h-5 w-5 text-slate-300" />
                          <p className="mt-2 text-[10px] font-bold text-slate-500">
                            Nenhum arquivo anexado
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {documentosConta.map(
                            (documento: any, index: number) => {
                              const nomeDocumento = String(
                                documento?.nome ??
                                  documento?.nomeArquivo ??
                                  documento?.nome_arquivo ??
                                  documento?.fileName ??
                                  documento?.filename ??
                                  `Documento ${index + 1}`
                              );

                              return (
                                <div
                                  key={
                                    documento?.id ??
                                    documento?.caminho ??
                                    documento?.url ??
                                    `${nomeDocumento}-${index}`
                                  }
                                  className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3"
                                >
                                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm">
                                    <FileText className="h-4 w-4" />
                                  </div>

                                  <p
                                    className="min-w-0 flex-1 truncate text-[10px] font-bold text-slate-700"
                                    title={nomeDocumento}
                                  >
                                    {nomeDocumento}
                                  </p>

                                  <div className="flex shrink-0 items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        abrirDocumentoConta(
                                          documento
                                        )
                                      }
                                      disabled={
                                        documentoExcluindoId ===
                                        String(documento?.id ?? '')
                                      }
                                      className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-[9px] font-bold text-slate-600 transition hover:bg-slate-100 disabled:opacity-40"
                                    >
                                      <Download className="h-3 w-3" />
                                      Abrir
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() =>
                                        excluirAnexoConta(
                                          documento
                                        )
                                      }
                                      disabled={
                                        documentoExcluindoId ===
                                          String(documento?.id ?? '') ||
                                        enviandoDocumentoConta
                                      }
                                      className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-red-100 bg-red-50 px-2.5 text-[9px] font-bold text-red-600 transition hover:bg-red-100 disabled:opacity-40"
                                    >
                                      {documentoExcluindoId ===
                                      String(documento?.id ?? '') ? (
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                      ) : (
                                        <Trash2 className="h-3 w-3" />
                                      )}
                                      Excluir
                                    </button>
                                  </div>
                                </div>
                              );
                            }
                          )}
                        </div>
                      )}
                    </div>
                  </section>
                </div>

                <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-slate-100 px-5 py-4">
                  {editandoDetalhes ? (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setFormDetalhes(
                            montarFormDetalhes(
                              contaDetalhes
                            )
                          );
                          setEditandoDetalhes(false);
                        }}
                        disabled={salvandoDetalhes}
                        className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[10px] font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                      >
                        Cancelar
                      </button>

                      <button
                        type="button"
                        onClick={salvarEdicaoDetalhes}
                        disabled={salvandoDetalhes}
                        className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-[10px] font-bold text-white hover:bg-blue-700 disabled:opacity-40"
                      >
                        {salvandoDetalhes && (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        )}
                        {salvandoDetalhes
                          ? 'Salvando...'
                          : 'Salvar alterações'}
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={fecharDetalhesConta}
                        className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[10px] font-bold text-slate-600 hover:bg-slate-50"
                      >
                        Fechar
                      </button>

                      {!pagaDetalhes && (
                        <button
                          type="button"
                          onClick={() => {
                            const conta =
                              contaDetalhes;
                            fecharDetalhesConta();
                            abrirModalPagamento(
                              conta
                            );
                          }}
                          className="rounded-xl bg-emerald-600 px-4 py-2.5 text-[10px] font-bold text-white hover:bg-emerald-700"
                        >
                          Registrar pagamento
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </>
        );
      })()}

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


const DetalheItem = ({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) => (
  <div className="min-w-0">
    <p className="text-[8px] font-bold uppercase tracking-wide text-slate-400">
      {label}
    </p>
    <p
      className={`mt-1 break-words text-[11px] font-semibold text-slate-700 ${
        mono ? 'font-mono' : ''
      }`}
    >
      {value || '—'}
    </p>
  </div>
);

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


const DetalheConta = ({
  label,
  value,
  mono = false,
  destaque = false,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
  destaque?: boolean;
}) => (
  <div
    className={`min-w-0 rounded-[16px] p-4 ${
      destaque
        ? 'bg-[#0F172A] text-white'
        : 'bg-slate-50 text-slate-800'
    }`}
  >
    <p
      className={`text-[9px] font-bold uppercase ${
        destaque
          ? 'text-white/50'
          : 'text-slate-400'
      }`}
    >
      {label}
    </p>
    <p
      className={`mt-2 break-words text-xs font-bold ${
        mono ? 'font-mono' : ''
      }`}
    >
      {value}
    </p>
  </div>
);

export default AccountsPayableView;