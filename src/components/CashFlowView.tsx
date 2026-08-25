import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { useFinance } from '../context/FinanceContext';
import { usePermissions } from '../context/PermissionsContext';
import { formatarReal } from '../utils';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  TrendingUp,
  Upload,
  X,
} from 'lucide-react';
import {
  ContaReceber,
  ContaReceberDocumento,
  ContaReceberHistorico,
  faturamentoImportService,
  LinhaFaturamentoPreview,
} from '../services/faturamentoImportService';

type Aba = 'visao-geral' | 'contas-receber' | 'conciliacao';
type TipoPeriodoConciliacao = 'dia' | 'mes' | 'ano';

type LinhaConciliacao = {
  data: string;
  receber: number;
  pagar: number;
  saldoDia: number;
  saldoAcumulado: number;
};

type LinhaConciliacaoPeriodo = {
  data: string;
  receber: number;
  pagar: number;
  resultado: number;
};

const hojeIso = () => new Date().toISOString().slice(0, 10);

const dataValida = (data?: string | null) => Boolean(data && /^\d{4}-\d{2}-\d{2}$/.test(data));

const formatarData = (data?: string | null) => {
  if (!dataValida(data)) return 'Sem data';
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(
    new Date(`${data}T00:00:00Z`)
  );
};

const mesAtual = () => hojeIso().slice(0, 7);
const anoAtual = () => hojeIso().slice(0, 4);

const normalizarDataIso = (data?: string | null) => {
  if (!data) return '';
  const valor = String(data).slice(0, 10);
  return dataValida(valor) ? valor : '';
};

export const CashFlowView: React.FC = () => {
  const { temPermissao } = usePermissions();
  const {
    empresas,
    processos,
    empresaAtivaId,
    organizacaoAtivaId,
  } = useFinance();

  const empresa = empresas.find(e => e.id === empresaAtivaId) || empresas[0];
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [aba, setAba] = useState<Aba>('visao-geral');
  const [contas, setContas] = useState<ContaReceber[]>([]);
  const [selecionadas, setSelecionadas] = useState<Set<string>>(new Set());
  const [processandoMassa, setProcessandoMassa] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const [busca, setBusca] = useState('');
  const [statusFiltro, setStatusFiltro] = useState('todos');
  const [encargosFiltro, setEncargosFiltro] =
    useState<'todos' | 'com_encargos' | 'sem_encargos'>('todos');
  const [inicioFiltro, setInicioFiltro] = useState('');
  const [fimFiltro, setFimFiltro] = useState('');
  const [paginaContas, setPaginaContas] = useState(1);
  const itensPorPagina = 12;

  const [tipoPeriodoConciliacao, setTipoPeriodoConciliacao] =
    useState<TipoPeriodoConciliacao>('mes');
  const [diaConciliacao, setDiaConciliacao] = useState(hojeIso());
  const [mesConciliacao, setMesConciliacao] = useState(mesAtual());
  const [anoConciliacao, setAnoConciliacao] = useState(anoAtual());

  const [modalImportacao, setModalImportacao] = useState(false);
  const [arquivoNome, setArquivoNome] = useState('');
  const [preview, setPreview] = useState<LinhaFaturamentoPreview[]>([]);
  const [processandoArquivo, setProcessandoArquivo] = useState(false);
  const [importando, setImportando] = useState(false);

  const [modalManual, setModalManual] = useState(false);
  const [manual, setManual] = useState({
    clienteNome: '',
    clienteDocumento: '',
    medicao: '',
    numeroDocumento: '',
    dataVencimento: '',
    valorOriginal: '',
    observacao: '',
  });

  const [contaBaixa, setContaBaixa] = useState<ContaReceber | null>(null);
  const [baixa, setBaixa] = useState({
    valor: '',
    juros: '0',
    multa: '0',
    data: hojeIso(),
    forma: 'transferencia',
  });

  const detalheArquivoRef =
    useRef<HTMLInputElement>(null);

  const [contaDetalhes, setContaDetalhes] =
    useState<ContaReceber | null>(null);
  const [editandoContaDetalhes, setEditandoContaDetalhes] =
    useState(false);
  const [salvandoContaDetalhes, setSalvandoContaDetalhes] =
    useState(false);
  const [formContaDetalhes, setFormContaDetalhes] =
    useState({
      clienteNome: '',
      clienteDocumento: '',
      medicao: '',
      numeroDocumento: '',
      dataVencimento: '',
      valorOriginal: '',
      observacao: '',
    });

  const [documentosContaReceber, setDocumentosContaReceber] =
    useState<ContaReceberDocumento[]>([]);
  const [
    carregandoDocumentosContaReceber,
    setCarregandoDocumentosContaReceber,
  ] = useState(false);
  const [
    enviandoDocumentoContaReceber,
    setEnviandoDocumentoContaReceber,
  ] = useState(false);
  const [
    excluindoDocumentoContaReceberId,
    setExcluindoDocumentoContaReceberId,
  ] = useState<string | null>(null);

  const [historicoContaReceber, setHistoricoContaReceber] =
    useState<ContaReceberHistorico[]>([]);
  const [
    carregandoHistoricoContaReceber,
    setCarregandoHistoricoContaReceber,
  ] = useState(false);

  const carregar = async () => {
    if (!organizacaoAtivaId || !empresaAtivaId) {
      setContas([]);
      return;
    }

    setCarregando(true);
    setErro('');

    try {
      const dados = await faturamentoImportService.listar(
        organizacaoAtivaId,
        empresaAtivaId
      );
      setContas(dados);
      setSelecionadas(atual => new Set([...atual].filter(id => dados.some(conta => conta.id === id))));
    } catch (error: any) {
      console.error(error);
      setErro(error?.message || 'Não foi possível carregar as contas a receber.');
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregar();
  }, [organizacaoAtivaId, empresaAtivaId]);

  const contasComStatusCalculado = useMemo(() => {
    const hoje = hojeIso();

    return contas.map(conta => {
      let statusVisual = conta.status as string;

      if (
        conta.status === 'previsto' &&
        conta.dataVencimento &&
        conta.dataVencimento < hoje
      ) {
        statusVisual = 'vencido';
      } else if (
        conta.status === 'previsto' &&
        conta.dataVencimento === hoje
      ) {
        statusVisual = 'vence_hoje';
      }

      return { ...conta, statusVisual };
    });
  }, [contas]);

  const contasFiltradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    return contasComStatusCalculado.filter(conta => {
      const correspondeBusca =
        !termo ||
        conta.clienteNome.toLowerCase().includes(termo) ||
        conta.numeroDocumento.toLowerCase().includes(termo) ||
        conta.clienteDocumento.toLowerCase().includes(termo);

      const correspondeStatus =
        statusFiltro === 'todos' ||
        conta.statusVisual === statusFiltro;

      const possuiEncargos =
        Number(conta.jurosRecebidos || 0) > 0.001 ||
        Number(conta.multaRecebida || 0) > 0.001;

      const correspondeEncargos =
        encargosFiltro === 'todos' ||
        (encargosFiltro === 'com_encargos'
          ? possuiEncargos
          : !possuiEncargos);

      const correspondeInicio =
        !inicioFiltro ||
        Boolean(conta.dataVencimento && conta.dataVencimento >= inicioFiltro);

      const correspondeFim =
        !fimFiltro || Boolean(conta.dataVencimento && conta.dataVencimento <= fimFiltro);

      return (
        correspondeBusca &&
        correspondeStatus &&
        correspondeEncargos &&
        correspondeInicio &&
        correspondeFim
      );
    });
  }, [
    contasComStatusCalculado,
    busca,
    statusFiltro,
    encargosFiltro,
    inicioFiltro,
    fimFiltro,
  ]);

  useEffect(() => {
    setPaginaContas(1);
  }, [
    busca,
    statusFiltro,
    encargosFiltro,
    inicioFiltro,
    fimFiltro,
    empresaAtivaId,
  ]);

  /**
   * RESUMO DA ABA CONTAS A RECEBER
   *
   * Regra:
   * - sem filtros: considera todas as contas;
   * - com filtros: considera somente as contas que passaram pelos filtros;
   * - o período é sempre baseado no vencimento original;
   * - a data da baixa não define a competência;
   * - recebido soma valorRecebido das contas filtradas;
   * - vencido soma somente o saldo ainda em aberto das contas vencidas;
   * - a vencer soma somente o saldo ainda em aberto das contas não vencidas;
   * - saldo a receber soma todo o saldo ainda pendente das contas filtradas.
   */
  const resumoContasReceber = useMemo(() => {
    return contasFiltradas.reduce(
      (
        resumo,
        conta: any
      ) => {
        const saldo = Math.max(
          Number(conta.saldo || 0),
          0
        );

        const recebido = Math.max(
          Number(conta.valorRecebido || 0),
          0
        );

        const cancelada =
          String(conta.status) === 'cancelado';

        const recebida =
          String(conta.status) === 'recebido';

        const emAberto =
          !cancelada &&
          !recebida &&
          saldo > 0.001;

        if (emAberto) {
          resumo.titulosAbertos += 1;
          resumo.saldoReceber += saldo;

          if (
            conta.statusVisual === 'vencido'
          ) {
            resumo.vencido += saldo;
          } else {
            resumo.aVencer += saldo;
          }
        }

        if (
          !cancelada &&
          recebido > 0
        ) {
          resumo.recebido += recebido;
        }

        return resumo;
      },
      {
        titulosAbertos: 0,
        saldoReceber: 0,
        aVencer: 0,
        vencido: 0,
        recebido: 0,
      }
    );
  }, [contasFiltradas]);

  const totalPaginasContas = Math.max(
    1,
    Math.ceil(contasFiltradas.length / itensPorPagina)
  );

  const contasPaginadas = useMemo(() => {
    const inicio = (paginaContas - 1) * itensPorPagina;
    return contasFiltradas.slice(inicio, inicio + itensPorPagina);
  }, [contasFiltradas, paginaContas]);

  const contasSelecionadas = useMemo(
    () => contasFiltradas.filter(conta => selecionadas.has(conta.id)),
    [contasFiltradas, selecionadas]
  );

  const todasPaginaSelecionadas =
    contasPaginadas.length > 0 && contasPaginadas.every(conta => selecionadas.has(conta.id));

  const alternarSelecao = (id: string) => {
    setSelecionadas(atual => {
      const proximo = new Set(atual);
      if (proximo.has(id)) proximo.delete(id);
      else proximo.add(id);
      return proximo;
    });
  };

  const alternarPagina = () => {
    setSelecionadas(atual => {
      const proximo = new Set(atual);
      if (todasPaginaSelecionadas) contasPaginadas.forEach(conta => proximo.delete(conta.id));
      else contasPaginadas.forEach(conta => proximo.add(conta.id));
      return proximo;
    });
  };

  const limparFiltrosContas = () => {
    setBusca('');
    setStatusFiltro('todos');
    setEncargosFiltro('todos');
    setInicioFiltro('');
    setFimFiltro('');
  };

  const totalAReceber = useMemo(
    () =>
      contas
        .filter(c => !['recebido', 'cancelado'].includes(c.status))
        .reduce((sum, c) => sum + c.saldo, 0),
    [contas]
  );

  const totalRecebidoMes = useMemo(
  () =>
    contas
      .filter(
        c =>
          c.dataVencimento?.slice(0, 7) === mesAtual() &&
          Number(c.valorRecebido || 0) > 0
      )
      .reduce(
        (sum, c) =>
          sum +
          Number(c.valorRecebido || 0) +
          Number(c.jurosRecebidos || 0) +
          Number(c.multaRecebida || 0),
        0
      ),
  [contas]
);

  const totalVencido = useMemo(
    () =>
      contasComStatusCalculado
        .filter(c => c.statusVisual === 'vencido')
        .reduce((sum, c) => sum + c.saldo, 0),
    [contasComStatusCalculado]
  );

  const totalSaidasPlanejadas = useMemo(() => {
    return processos
      .filter(p => p.empresaId === empresaAtivaId && p.status !== 'finalizado')
      .reduce((sum, p) => sum + Number(p.valor ?? 0), 0);
  }, [processos, empresaAtivaId]);

  const saldoAtual = Number(empresa?.saldoAtual ?? empresa?.saldoInicial ?? 0);
  const saldoPrevisto = saldoAtual + totalAReceber - totalSaidasPlanejadas;

  // Mantém a projeção acumulada usada somente na aba Visão geral.
  // A aba Conciliação possui uma lógica independente mais abaixo.
  const conciliacao = useMemo<LinhaConciliacao[]>(() => {
    const mapa = new Map<string, { receber: number; pagar: number }>();

    contas
      .filter(c => !['recebido', 'cancelado'].includes(c.status) && c.dataVencimento)
      .forEach(conta => {
        const data = normalizarDataIso(conta.dataVencimento);
        if (!data) return;
        const atual = mapa.get(data) || { receber: 0, pagar: 0 };
        atual.receber += Number(conta.saldo || 0);
        mapa.set(data, atual);
      });

    processos
      .filter(p => p.empresaId === empresaAtivaId && p.status !== 'finalizado')
      .forEach(processo => {
        const data = normalizarDataIso(processo.prazo || processo.dataCriacao);
        if (!data) return;
        const atual = mapa.get(data) || { receber: 0, pagar: 0 };
        atual.pagar += Number(processo.valor ?? 0);
        mapa.set(data, atual);
      });

    let acumulado = saldoAtual;

    return Array.from(mapa.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([data, valores]) => {
        const saldoDia = valores.receber - valores.pagar;
        acumulado += saldoDia;
        return {
          data,
          receber: valores.receber,
          pagar: valores.pagar,
          saldoDia,
          saldoAcumulado: acumulado,
        };
      });
  }, [contas, processos, empresaAtivaId, saldoAtual]);

  const conciliacaoCompleta = useMemo<LinhaConciliacaoPeriodo[]>(() => {
    const receberPorData = new Map<string, number>();
    const pagarPorData = new Map<string, number>();

    const adicionarDiasIso = (
      dataIso: string,
      dias: number
    ) => {
      const [ano, mes, dia] = dataIso
        .split('-')
        .map(Number);

      const data = new Date(
        ano,
        mes - 1,
        dia
      );

      data.setDate(
        data.getDate() + dias
      );

      return [
        data.getFullYear(),
        String(
          data.getMonth() + 1
        ).padStart(2, '0'),
        String(
          data.getDate()
        ).padStart(2, '0'),
      ].join('-');
    };

    /*
     * DISPONIBILIDADE DE CAIXA
     *
     * O valor recebido em D-1 é o recurso disponível
     * para pagar as contas de D.
     *
     * Exemplo:
     * Receber de 13/08 -> disponível em 14/08
     * Pagar de 14/08   -> comparado na linha 14/08
     */

    // CONTAS A RECEBER:
    // considera somente o saldo ainda não recebido,
    // na data de vencimento original.
    contas
      .filter(conta => {
        const saldo = Number(
          conta.saldo || 0
        );

        return (
          !['recebido', 'cancelado'].includes(
            String(conta.status)
          ) &&
          saldo > 0.001 &&
          Boolean(conta.dataVencimento)
        );
      })
      .forEach(conta => {
        const dataReceber =
          normalizarDataIso(
            conta.dataVencimento
          );

        if (!dataReceber) return;

        receberPorData.set(
          dataReceber,
          (
            receberPorData.get(
              dataReceber
            ) || 0
          ) +
            Number(
              conta.saldo || 0
            )
        );
      });

    // CONTAS A PAGAR:
    // considera o saldo ainda não pago,
    // usando a data programada quando existir;
    // caso contrário, usa o vencimento.
    processos
      .filter((processo: any) => {
        if (
          String(
            processo.empresaId
          ) !==
          String(
            empresaAtivaId
          )
        ) {
          return false;
        }

        const status = String(
          processo.status || ''
        );

        if (
          ![
            'pagamento',
            'conciliacao',
            'finalizado',
          ].includes(status)
        ) {
          return false;
        }

        const valor = Number(
          processo.valor || 0
        );

        const valorPago = Number(
          processo.valorPago || 0
        );

        const saldo = Math.max(
          valor - valorPago,
          0
        );

        const contaPaga =
          saldo <= 0.001 ||
          [
            'conciliacao',
            'finalizado',
          ].includes(status);

        return (
          !contaPaga &&
          saldo > 0.001
        );
      })
      .forEach((processo: any) => {
        const dataPagar =
          normalizarDataIso(
            processo
              .dataProgramadaPagamento ||
              processo.prazo ||
              processo.vencimento
          );

        if (!dataPagar) return;

        const valor = Number(
          processo.valor || 0
        );

        const valorPago = Number(
          processo.valorPago || 0
        );

        const saldo = Math.max(
          valor - valorPago,
          0
        );

        pagarPorData.set(
          dataPagar,
          (
            pagarPorData.get(
              dataPagar
            ) || 0
          ) + saldo
        );
      });

    /*
     * Datas exibidas:
     * - todo dia que tenha valor a pagar;
     * - todo dia seguinte a um recebimento.
     *
     * Assim, um recebimento de 13/08 gera disponibilidade
     * na linha de 14/08, mesmo que 14/08 não tenha recebimento próprio.
     */
    const datas = new Set<string>();

    pagarPorData.forEach(
      (_, data) => {
        datas.add(data);
      }
    );

    receberPorData.forEach(
      (_, dataReceber) => {
        datas.add(
          adicionarDiasIso(
            dataReceber,
            1
          )
        );
      }
    );

    return Array.from(datas)
      .sort((a, b) =>
        a.localeCompare(b)
      )
      .map(dataAtual => {
        const dataAnterior =
          adicionarDiasIso(
            dataAtual,
            -1
          );

        const receber =
          receberPorData.get(
            dataAnterior
          ) || 0;

        const pagar =
          pagarPorData.get(
            dataAtual
          ) || 0;

        return {
          data: dataAtual,
          dataReceber:
            dataAnterior,
          receber,
          pagar,
          resultado:
            receber - pagar,
        };
      });
  }, [
    contas,
    processos,
    empresaAtivaId,
  ]);

  const conciliacaoFiltrada = useMemo(() => {
    return conciliacaoCompleta.filter(linha => {
      if (tipoPeriodoConciliacao === 'dia') {
        return linha.data === diaConciliacao;
      }

      if (tipoPeriodoConciliacao === 'mes') {
        return linha.data.slice(0, 7) === mesConciliacao;
      }

      return linha.data.slice(0, 4) === anoConciliacao;
    });
  }, [
    conciliacaoCompleta,
    tipoPeriodoConciliacao,
    diaConciliacao,
    mesConciliacao,
    anoConciliacao,
  ]);

  const resumoConciliacao = useMemo(() => {
    const receber = conciliacaoFiltrada.reduce(
      (total, linha) => total + linha.receber,
      0
    );
    const pagar = conciliacaoFiltrada.reduce(
      (total, linha) => total + linha.pagar,
      0
    );

    return {
      receber,
      pagar,
      resultado: receber - pagar,
    };
  }, [conciliacaoFiltrada]);

  const resumoImportacao = useMemo(() => {
    return {
      total: preview.length,
      validos: preview.filter(l => l.status === 'valido').length,
      atencao: preview.filter(l => l.status === 'atencao').length,
      erros: preview.filter(l => l.status === 'erro').length,
      duplicados: preview.filter(l => l.status === 'duplicado').length,
    };
  }, [preview]);

  const selecionarArquivo = async (file?: File) => {
    if (!file) return;
    if (!organizacaoAtivaId || !empresaAtivaId) {
      alert('Selecione uma empresa antes de importar.');
      return;
    }

    setProcessandoArquivo(true);
    setErro('');

    try {
      const linhas = await faturamentoImportService.lerArquivo(file);
      const validadas = await faturamentoImportService.marcarDuplicados(
        linhas,
        organizacaoAtivaId,
        empresaAtivaId
      );
      setArquivoNome(file.name);
      setPreview(validadas);
      setModalImportacao(true);
    } catch (error: any) {
      console.error(error);
      alert(error?.message || 'Não foi possível ler a planilha.');
    } finally {
      setProcessandoArquivo(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const corrigirDataPreview = (linha: number, dataVencimento: string) => {
    setPreview(atual =>
      atual.map(item =>
        item.linha === linha
          ? {
              ...item,
              dataVencimento,
              status:
                item.clienteNome && item.numeroDocumento && item.valorOriginal > 0
                  ? 'valido'
                  : 'erro',
              mensagem:
                item.clienteNome && item.numeroDocumento && item.valorOriginal > 0
                  ? 'Pronto para importar'
                  : item.mensagem,
            }
          : item
      )
    );
  };

  const confirmarImportacao = async () => {
    if (!temPermissao('contas_receber', 'importar')) { alert('Você não tem permissão para esta ação.'); return; }
    if (!organizacaoAtivaId || !empresaAtivaId) return;

    setImportando(true);
    try {
      const resultado = await faturamentoImportService.importar(
        preview,
        organizacaoAtivaId,
        empresaAtivaId,
        arquivoNome
      );

      alert(`${resultado.importados} contas a receber foram importadas com sucesso.`);
      setModalImportacao(false);
      setPreview([]);
      setArquivoNome('');
      await carregar();
      setAba('contas-receber');
    } catch (error: any) {
      console.error(error);
      alert(error?.message || 'Erro ao importar o faturamento.');
    } finally {
      setImportando(false);
    }
  };

  const cadastrarManual = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!organizacaoAtivaId || !empresaAtivaId) return;

    const valor = Number(manual.valorOriginal.replace(',', '.'));
    if (
      !manual.clienteNome.trim() ||
      !manual.numeroDocumento.trim() ||
      !manual.dataVencimento ||
      !Number.isFinite(valor) ||
      valor <= 0
    ) {
      alert('Preencha cliente, documento, vencimento e valor válido.');
      return;
    }

    try {
      await faturamentoImportService.criarManual(
        { ...manual, valorOriginal: valor },
        organizacaoAtivaId,
        empresaAtivaId
      );
      setModalManual(false);
      setManual({
        clienteNome: '',
        clienteDocumento: '',
        medicao: '',
        numeroDocumento: '',
        dataVencimento: '',
        valorOriginal: '',
        observacao: '',
      });
      await carregar();
    } catch (error: any) {
      console.error(error);
      alert(error?.message || 'Erro ao cadastrar a conta a receber.');
    }
  };

  const confirmarBaixa = async (event: React.FormEvent) => {
    if (!temPermissao('contas_receber', 'receber')) { alert('Você não tem permissão para esta ação.'); return; }
    event.preventDefault();
    if (!contaBaixa) return;

    const valor = Number(
      baixa.valor.replace(',', '.')
    );
    const juros = Number(
      baixa.juros.replace(',', '.')
    );
    const multa = Number(
      baixa.multa.replace(',', '.')
    );

    if (
      !Number.isFinite(valor) ||
      valor <= 0 ||
      valor > contaBaixa.saldo
    ) {
      alert(
        `Informe um valor entre R$ 0,01 e ${formatarReal(
          contaBaixa.saldo
        )}.`
      );
      return;
    }

    if (
      !Number.isFinite(juros) ||
      juros < 0 ||
      !Number.isFinite(multa) ||
      multa < 0
    ) {
      alert(
        'Juros e multa precisam ser valores iguais ou maiores que zero.'
      );
      return;
    }

    try {
      await faturamentoImportService.registrarRecebimento(
        contaBaixa,
        valor,
        baixa.data,
        baixa.forma,
        juros,
        multa
      );
      setContaBaixa(null);
      setBaixa({
        valor: '',
        juros: '0',
        multa: '0',
        data: hojeIso(),
        forma: 'transferencia',
      });
      await carregar();
    } catch (error: any) {
      console.error(error);
      alert(error?.message || 'Erro ao registrar o recebimento.');
    }
  };

  const pagarSelecionadas = async () => {
    const elegiveis = contasSelecionadas.filter(conta => Number(conta.saldo || 0) > 0);
    if (!elegiveis.length) {
      alert('Selecione ao menos um título com saldo em aberto.');
      return;
    }

    const total = elegiveis.reduce((soma, conta) => soma + Number(conta.saldo || 0), 0);
    const confirmar = window.confirm(
      `ATENÇÃO: deseja registrar como recebidos ${elegiveis.length} título(s), no valor total de ${formatarReal(total)}?\n\nA baixa será registrada com a data de hoje e forma Transferência.`
    );
    if (!confirmar) return;

    const confirmarFinal = window.confirm(
      'Confirma a baixa em massa? Esta ação altera o saldo e o status dos títulos selecionados.'
    );
    if (!confirmarFinal) return;

    setProcessandoMassa(true);
    try {
      const quantidade = await faturamentoImportService.registrarRecebimentosEmMassa(
        elegiveis,
        hojeIso(),
        'transferencia'
      );
      alert(`${quantidade} título(s) foram baixados com sucesso.`);
      setSelecionadas(new Set());
      await carregar();
    } catch (error: any) {
      console.error(error);
      alert(error?.message || 'Erro ao registrar os recebimentos em massa.');
    } finally {
      setProcessandoMassa(false);
    }
  };

  const excluirSelecionadas = async () => {
    if (!temPermissao('contas_receber', 'excluir')) { alert('Você não tem permissão para esta ação.'); return; }
    if (!contasSelecionadas.length) {
      alert('Selecione ao menos um título para excluir.');
      return;
    }

    const confirmar = window.confirm(
      `ATENÇÃO: você selecionou ${contasSelecionadas.length} título(s) para EXCLUSÃO PERMANENTE. Deseja continuar?`
    );
    if (!confirmar) return;

    const confirmarFinal = window.confirm(
      'CONFIRMAÇÃO FINAL: os títulos selecionados serão apagados do Contas a Receber. Esta ação não pode ser desfeita.'
    );
    if (!confirmarFinal) return;

    setProcessandoMassa(true);
    try {
      const quantidade = await faturamentoImportService.excluirEmMassa(contasSelecionadas);
      alert(`${quantidade} título(s) excluído(s) com sucesso.`);
      setSelecionadas(new Set());
      await carregar();
    } catch (error: any) {
      console.error(error);
      alert(error?.message || 'Erro ao excluir os títulos selecionados.');
    } finally {
      setProcessandoMassa(false);
    }
  };

  const montarFormContaDetalhes = (
    conta: ContaReceber
  ) => ({
    clienteNome: conta.clienteNome || '',
    clienteDocumento:
      conta.clienteDocumento || '',
    medicao: conta.medicao || '',
    numeroDocumento:
      conta.numeroDocumento || '',
    dataVencimento:
      conta.dataVencimento || '',
    valorOriginal: String(
      Number(conta.valorOriginal || 0)
    ),
    observacao: conta.observacao || '',
  });

  const carregarDocumentosContaReceber = async (
    conta: ContaReceber
  ) => {
    try {
      setCarregandoDocumentosContaReceber(true);

      const documentos =
        await faturamentoImportService.listarDocumentosConta(
          conta
        );

      setDocumentosContaReceber(documentos);
    } catch (error: any) {
      console.error(
        'Erro ao carregar anexos da conta a receber:',
        error
      );
      setDocumentosContaReceber([]);
    } finally {
      setCarregandoDocumentosContaReceber(false);
    }
  };


  const carregarHistoricoContaReceber = async (
    conta: ContaReceber
  ) => {
    try {
      setCarregandoHistoricoContaReceber(true);
      const historico =
        await faturamentoImportService.listarHistoricoConta(
          conta
        );
      setHistoricoContaReceber(historico);
    } catch (error: any) {
      console.error(
        'Erro ao carregar histórico da conta a receber:',
        error
      );
      setHistoricoContaReceber([]);
    } finally {
      setCarregandoHistoricoContaReceber(false);
    }
  };

  const labelCampoHistorico = (campo: string) => {
    const labels: Record<string, string> = {
      cliente_nome: 'Cliente',
      cliente_documento: 'CNPJ/CPF',
      medicao: 'Medição',
      numero_documento: 'Documento',
      data_vencimento: 'Vencimento',
      valor_original: 'Valor original',
      observacao: 'Observação',
      status: 'Status',
      valor_recebido: 'Valor recebido',
      juros_recebidos: 'Juros recebidos',
      multa_recebida: 'Multa recebida',
      data_recebimento: 'Data de recebimento',
      forma_recebimento: 'Forma de recebimento',
    };
    return labels[campo] || campo;
  };

  const formatarValorHistoricoReceber = (
    campo: string,
    valor: string | null
  ) => {
    if (valor == null || valor === '') {
      return 'Não informado';
    }

    if (
      ['data_vencimento', 'data_recebimento'].includes(
        campo
      )
    ) {
      return formatarData(String(valor).slice(0, 10));
    }

    if (
      [
        'valor_original',
        'valor_recebido',
        'juros_recebidos',
        'multa_recebida',
      ].includes(campo)
    ) {
      return formatarReal(Number(valor || 0));
    }

    return String(valor);
  };

  const formatarDataHoraHistoricoReceber = (
    valor?: string | null
  ) => {
    if (!valor) return 'Data não informada';
    const data = new Date(valor);
    if (Number.isNaN(data.getTime())) {
      return String(valor);
    }
    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(data);
  };

  const vencimentoOriginalContaReceber = (
    conta: ContaReceber
  ) => {
    const alteracoes = historicoContaReceber
      .filter(
        item => item.campo === 'data_vencimento'
      )
      .sort((a, b) =>
        String(a.createdAt).localeCompare(
          String(b.createdAt)
        )
      );

    return (
      alteracoes[0]?.valorAnterior ||
      conta.dataVencimento
    );
  };

  const abrirDetalhesContaReceber = (
    conta: ContaReceber
  ) => {
    setContaDetalhes(conta);
    setFormContaDetalhes(
      montarFormContaDetalhes(conta)
    );
    setEditandoContaDetalhes(false);
    setDocumentosContaReceber([]);
    setHistoricoContaReceber([]);
    carregarDocumentosContaReceber(conta);
    carregarHistoricoContaReceber(conta);
  };

  const fecharDetalhesContaReceber = () => {
    if (
      salvandoContaDetalhes ||
      enviandoDocumentoContaReceber ||
      Boolean(
        excluindoDocumentoContaReceberId
      )
    ) {
      return;
    }

    setContaDetalhes(null);
    setEditandoContaDetalhes(false);
    setDocumentosContaReceber([]);
    setHistoricoContaReceber([]);

    if (detalheArquivoRef.current) {
      detalheArquivoRef.current.value = '';
    }
  };

  const salvarContaReceberEditada = async () => {
    if (!temPermissao('contas_receber', 'editar')) { alert('Você não tem permissão para esta ação.'); return; }
    if (!contaDetalhes) return;

    const valorOriginal = Number(
      String(
        formContaDetalhes.valorOriginal
      ).replace(',', '.')
    );

    if (
      !formContaDetalhes.clienteNome.trim() ||
      !formContaDetalhes.numeroDocumento.trim() ||
      !formContaDetalhes.dataVencimento ||
      !Number.isFinite(valorOriginal) ||
      valorOriginal <= 0
    ) {
      alert(
        'Preencha cliente, documento, vencimento e valor válido.'
      );
      return;
    }

    if (
      valorOriginal + 0.001 <
      Number(contaDetalhes.valorRecebido || 0)
    ) {
      alert(
        `O valor original não pode ser menor que o valor já recebido (${formatarReal(
          contaDetalhes.valorRecebido
        )}).`
      );
      return;
    }

    try {
      setSalvandoContaDetalhes(true);

      const atualizada =
        await faturamentoImportService.editar(
          contaDetalhes,
          {
            clienteNome:
              formContaDetalhes.clienteNome,
            clienteDocumento:
              formContaDetalhes.clienteDocumento,
            medicao:
              formContaDetalhes.medicao,
            numeroDocumento:
              formContaDetalhes.numeroDocumento,
            dataVencimento:
              formContaDetalhes.dataVencimento,
            valorOriginal,
            observacao:
              formContaDetalhes.observacao,
          }
        );

      setContaDetalhes(atualizada);
      setFormContaDetalhes(
        montarFormContaDetalhes(atualizada)
      );
      setEditandoContaDetalhes(false);

      await Promise.all([
        carregar(),
        carregarHistoricoContaReceber(atualizada),
      ]);

      alert('Conta a receber atualizada com sucesso.');
    } catch (error: any) {
      console.error(
        'Erro ao editar conta a receber:',
        error
      );

      alert(
        error?.message ||
          'Não foi possível salvar as alterações.'
      );
    } finally {
      setSalvandoContaDetalhes(false);
    }
  };

  const anexarArquivoContaReceber = async (
    arquivo?: File
  ) => {
    if (!temPermissao('contas_receber', 'anexar')) { alert('Você não tem permissão para esta ação.'); return; }
    if (!arquivo || !contaDetalhes) return;

    try {
      setEnviandoDocumentoContaReceber(true);

      await faturamentoImportService.anexarDocumentoConta(
        contaDetalhes,
        arquivo
      );

      await carregarDocumentosContaReceber(
        contaDetalhes
      );

      alert('Arquivo anexado com sucesso.');
    } catch (error: any) {
      console.error(
        'Erro ao anexar arquivo:',
        error
      );

      alert(
        error?.message ||
          'Não foi possível anexar o arquivo.'
      );
    } finally {
      setEnviandoDocumentoContaReceber(false);

      if (detalheArquivoRef.current) {
        detalheArquivoRef.current.value = '';
      }
    }
  };

  const excluirArquivoContaReceber = async (
    documento: ContaReceberDocumento
  ) => {
    if (!temPermissao('contas_receber', 'excluir_anexo')) { alert('Você não tem permissão para esta ação.'); return; }
    if (!contaDetalhes) return;

    const confirmou = window.confirm(
      `Deseja realmente excluir o anexo "${documento.nome}"?\n\n` +
        'O arquivo será removido permanentemente.'
    );

    if (!confirmou) return;

    try {
      setExcluindoDocumentoContaReceberId(
        documento.id
      );

      await faturamentoImportService.excluirDocumentoConta(
        documento
      );

      await carregarDocumentosContaReceber(
        contaDetalhes
      );

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
      setExcluindoDocumentoContaReceberId(
        null
      );
    }
  };

  const excluirConta = async (conta: ContaReceber) => {
    if (!temPermissao('contas_receber', 'excluir')) { alert('Você não tem permissão para esta ação.'); return; }
    if (!window.confirm(`Excluir o título ${conta.numeroDocumento}?`)) return;

    try {
      await faturamentoImportService.excluir(conta);
      await carregar();
    } catch (error: any) {
      console.error(error);
      alert(error?.message || 'Erro ao excluir a conta.');
    }
  };

  const formatarDataExcel = (valor?: string | null) => {
    const data = normalizarDataIso(valor);

    if (!data) return '';

    const [ano, mes, dia] = data.split('-');
    return `${dia}/${mes}/${ano}`;
  };

  const ajustarLarguraPlanilha = (
    sheet: XLSX.WorkSheet,
    larguras: number[]
  ) => {
    sheet['!cols'] = larguras.map(wch => ({
      wch,
    }));
  };

  const exportarExcelAbaAtual = () => {
    const moduloExportacao = aba === 'contas-receber' ? 'contas_receber' : aba === 'conciliacao' ? 'conciliacao' : 'dashboard';
    if (!temPermissao(moduloExportacao as any, 'exportar')) { alert('Você não tem permissão para exportar.'); return; }
    try {
      const workbook = XLSX.utils.book_new();

      if (aba === 'visao-geral') {
        const resumo = [
          {
            Indicador: 'A receber',
            Valor: totalAReceber,
          },
          {
            Indicador: 'Recebido no mês',
            Valor: totalRecebidoMes,
          },
          {
            Indicador: 'Recebimentos vencidos',
            Valor: totalVencido,
          },
          {
            Indicador: 'Total a pagar',
            Valor: totalSaidasPlanejadas,
          },
          {
            Indicador: 'Saldo atual',
            Valor: saldoAtual,
          },
          {
            Indicador: 'Saldo projetado',
            Valor: saldoPrevisto,
          },
        ];

        const sheetResumo =
          XLSX.utils.json_to_sheet(resumo);

        ajustarLarguraPlanilha(
          sheetResumo,
          [28, 18]
        );

        XLSX.utils.book_append_sheet(
          workbook,
          sheetResumo,
          'Resumo'
        );

        const previsao = conciliacao.map(
          linha => ({
            Data: formatarDataExcel(linha.data),
            'A receber (dia anterior)': linha.receber,
            'Data do recebimento': (linha as any).dataReceber,
            'A pagar (dia atual)': linha.pagar,
            'Disponibilidade do dia': linha.saldoDia,
            'Saldo acumulado':
              linha.saldoAcumulado,
          })
        );

        const sheetPrevisao =
          XLSX.utils.json_to_sheet(previsao);

        ajustarLarguraPlanilha(
          sheetPrevisao,
          [14, 18, 18, 18, 20]
        );

        XLSX.utils.book_append_sheet(
          workbook,
          sheetPrevisao,
          'Previsão de liquidez'
        );
      }

      if (aba === 'contas-receber') {
        if (contasFiltradas.length === 0) {
          alert(
            'Não há contas a receber para exportar com os filtros atuais.'
          );
          return;
        }

        const linhas = contasFiltradas.map(
          (conta: any) => ({
            Cliente:
              conta.clienteNome || '',
            'CNPJ/CPF':
              conta.clienteDocumento || '',
            Documento:
              conta.numeroDocumento || '',
            Medição:
              conta.medicao || '',
            Vencimento:
              formatarDataExcel(
                conta.dataVencimento
              ),
            'Valor original':
              Number(
                conta.valorOriginal || 0
              ),
            Recebido:
              Number(
                conta.valorRecebido || 0
              ),
            Juros:
              Number(
                conta.jurosRecebidos || 0
              ),
            Multa:
              Number(
                conta.multaRecebida || 0
              ),
            'Total recebido com encargos':
              Number(
                conta.valorRecebido || 0
              ) +
              Number(
                conta.jurosRecebidos || 0
              ) +
              Number(
                conta.multaRecebida || 0
              ),
            Saldo:
              Number(conta.saldo || 0),
            Status:
              String(
                conta.statusVisual ??
                  conta.status ??
                  ''
              ),
            'Data do recebimento':
              formatarDataExcel(
                conta.dataRecebimento
              ),
            'Forma de recebimento':
              conta.formaRecebimento || '',
            Observação:
              conta.observacao || '',
          })
        );

        const sheet =
          XLSX.utils.json_to_sheet(linhas);

        ajustarLarguraPlanilha(
          sheet,
          [
            32,
            20,
            20,
            14,
            14,
            18,
            18,
            18,
            18,
            20,
            22,
            40,
          ]
        );

        XLSX.utils.book_append_sheet(
          workbook,
          sheet,
          'Contas a receber'
        );
      }

      if (aba === 'conciliacao') {
        if (conciliacaoFiltrada.length === 0) {
          alert(
            'Não há dados de conciliação para exportar no período selecionado.'
          );
          return;
        }

        const resumo = [
          {
            Indicador: 'Total disponível de recebimentos do dia anterior',
            Valor: resumoConciliacao.receber,
          },
          {
            Indicador: 'Total a pagar',
            Valor: resumoConciliacao.pagar,
          },
          {
            Indicador: 'Disponibilidade líquida',
            Valor: resumoConciliacao.resultado,
          },
        ];

        const sheetResumo =
          XLSX.utils.json_to_sheet(resumo);

        ajustarLarguraPlanilha(
          sheetResumo,
          [24, 18]
        );

        XLSX.utils.book_append_sheet(
          workbook,
          sheetResumo,
          'Resumo'
        );

        const linhas =
          conciliacaoFiltrada.map(linha => ({
            Data: formatarDataExcel(
              linha.data
            ),
            'A receber': linha.receber,
            'A pagar': linha.pagar,
            'Saldo do dia':
              linha.resultado,
          }));

        const sheet =
          XLSX.utils.json_to_sheet(linhas);

        ajustarLarguraPlanilha(
          sheet,
          [14, 18, 18, 18]
        );

        XLSX.utils.book_append_sheet(
          workbook,
          sheet,
          'Conciliação'
        );
      }

      const sufixo =
        aba === 'visao-geral'
          ? 'visao_geral'
          : aba === 'contas-receber'
          ? 'contas_a_receber'
          : 'conciliacao';

      const dataArquivo =
        new Date()
          .toISOString()
          .slice(0, 10);

      XLSX.writeFile(
        workbook,
        `fluxo_de_caixa_${sufixo}_${dataArquivo}.xlsx`
      );
    } catch (error: any) {
      console.error(
        'Erro ao exportar Fluxo de Caixa em Excel:',
        error
      );

      alert(
        error?.message ||
          'Não foi possível exportar os dados em Excel.'
      );
    }
  };

  if (!empresa) {
    return (
      <div className="bg-white p-8 rounded-[18px] border border-slate-100 text-center">
        <h2 className="text-lg font-bold text-slate-800">Nenhuma empresa cadastrada</h2>
      </div>
    );
  }

  return (
    <div className="space-y-7" id="cash-flow-view-container">
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={event => selecionarArquivo(event.target.files?.[0])}
      />

      <header className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">Fluxo de Caixa</h1>
          <p className="text-xs text-slate-400 mt-1">
            Faturamento, contas a receber e conciliação com as contas a pagar.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => faturamentoImportService.baixarModelo()}
            className="h-10 px-4 rounded-[12px] border border-slate-200 bg-white text-slate-700 text-xs font-semibold flex items-center gap-2 hover:bg-slate-50"
          >
            <Download className="w-4 h-4" />
            Baixar modelo
          </button>

          <button
            type="button"
            disabled={processandoArquivo}
            onClick={() => fileInputRef.current?.click()}
            className="h-10 px-4 rounded-[12px] border border-slate-200 bg-white text-slate-700 text-xs font-semibold flex items-center gap-2 hover:bg-slate-50 disabled:opacity-50"
          >
            {processandoArquivo ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            Importar faturamento
          </button>

          <button
            type="button"
            onClick={exportarExcelAbaAtual}
            className="h-10 px-4 rounded-[12px] border border-emerald-100 bg-emerald-50 text-emerald-700 text-xs font-bold flex items-center gap-2 hover:bg-emerald-100"
            title={
              aba === 'visao-geral'
                ? 'Exportar visão geral em Excel'
                : aba === 'contas-receber'
                ? 'Exportar contas a receber em Excel'
                : 'Exportar conciliação em Excel'
            }
          >
            <FileSpreadsheet className="w-4 h-4" />
            Excel
          </button>

          <button
            type="button"
            onClick={() => setModalManual(true)}
            className="h-10 px-4 rounded-[12px] bg-[#0F172A] text-white text-xs font-bold flex items-center gap-2 hover:bg-[#1E293B]"
          >
            <Plus className="w-4 h-4" />
            Novo recebimento
          </button>
        </div>
      </header>

      {erro && (
        <div className="p-4 rounded-[14px] bg-red-50 border border-red-100 text-xs text-red-700 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          {erro}
        </div>
      )}

      <div className="flex flex-wrap gap-2 border-b border-slate-200">
        {[
          ['visao-geral', 'Visão geral'],
          ['contas-receber', 'Contas a receber'],
          ['conciliacao', 'Conciliação'],
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setAba(id as Aba)}
            className={`px-4 py-3 text-xs font-bold border-b-2 transition ${
              aba === id
                ? 'border-[#0F172A] text-[#0F172A]'
                : 'border-transparent text-slate-400 hover:text-slate-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {aba === 'visao-geral' && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <Kpi
              titulo="A receber"
              valor={formatarReal(totalAReceber)}
              detalhe="Saldo dos títulos em aberto"
              icon={ArrowUpRight}
              destaque="emerald"
            />
            <Kpi
              titulo="Recebido no mês"
              valor={formatarReal(totalRecebidoMes)}
              detalhe="Recebido de títulos com vencimento no mês atual"
              icon={CheckCircle2}
              destaque="emerald"
            />
            <Kpi
              titulo="Recebimentos vencidos"
              valor={formatarReal(totalVencido)}
              detalhe="Títulos em atraso"
              icon={AlertTriangle}
              destaque="red"
            />
            <Kpi
              titulo="Saldo projetado"
              valor={formatarReal(saldoPrevisto)}
              detalhe="Saldo atual + receber - pagar"
              icon={TrendingUp}
              destaque={saldoPrevisto >= 0 ? 'default' : 'red'}
            />
          </div>

          <div className="bg-white p-6 rounded-[18px] border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-sm font-bold text-[#0F172A]">Previsão de liquidez</h2>
                <p className="text-[11px] text-slate-400 mt-1">
                  Saldo acumulado considerando vencimentos a receber e a pagar.
                </p>
              </div>
              <span className="text-[10px] text-slate-400">
                Saldo inicial: {formatarReal(saldoAtual)}
              </span>
            </div>

            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={conciliacao} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="saldoAcumuladoFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0F172A" stopOpacity={0.18} />
                      <stop offset="95%" stopColor="#0F172A" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis
                    dataKey="data"
                    tickFormatter={formatarData}
                    stroke="#94A3B8"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#94A3B8"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={valor => `R$ ${Math.round(Number(valor) / 1000)} mil`}
                  />
                  <Tooltip
                    labelFormatter={label => formatarData(String(label))}
                    formatter={(valor: any) => formatarReal(Number(valor))}
                  />
                  <Area
                    type="monotone"
                    dataKey="saldoAcumulado"
                    name="Saldo acumulado"
                    stroke="#0F172A"
                    strokeWidth={2.5}
                    fill="url(#saldoAcumuladoFill)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            <ResumoCard
              titulo="Entradas previstas"
              valor={totalAReceber}
              icon={ArrowUpRight}
              texto={`${contas.filter(c => !['recebido', 'cancelado'].includes(c.status)).length} títulos em aberto`}
              positivo
            />
            <ResumoCard
              titulo="Saídas previstas"
              valor={totalSaidasPlanejadas}
              icon={ArrowDownRight}
              texto="Processos e compras ainda não finalizados"
            />
          </div>
        </>
      )}

      {aba === 'contas-receber' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
            <Kpi
              titulo="Títulos em aberto"
              valor={String(
                resumoContasReceber.titulosAbertos
              )}
              detalhe={
                inicioFiltro ||
                fimFiltro ||
                busca ||
                statusFiltro !== 'todos' ||
                encargosFiltro !== 'todos'
                  ? 'Quantidade de contas pendentes nos filtros aplicados'
                  : 'Quantidade total de contas pendentes'
              }
              icon={FileSpreadsheet}
              destaque="default"
            />

            <Kpi
              titulo="A vencer"
              valor={formatarReal(
                resumoContasReceber.aVencer
              )}
              detalhe={
                inicioFiltro ||
                fimFiltro ||
                busca ||
                statusFiltro !== 'todos' ||
                encargosFiltro !== 'todos'
                  ? 'Saldo a vencer nos filtros aplicados'
                  : 'Saldo total de títulos a vencer'
              }
              icon={CalendarDays}
              destaque="default"
            />

            <Kpi
              titulo="Vencido"
              valor={formatarReal(
                resumoContasReceber.vencido
              )}
              detalhe={
                inicioFiltro ||
                fimFiltro ||
                busca ||
                statusFiltro !== 'todos' ||
                encargosFiltro !== 'todos'
                  ? 'Saldo vencido nos filtros aplicados'
                  : 'Saldo total de títulos vencidos'
              }
              icon={AlertTriangle}
              destaque="red"
            />

            <Kpi
              titulo="Recebido"
              valor={formatarReal(
                resumoContasReceber.recebido
              )}
              detalhe={
                inicioFiltro ||
                fimFiltro ||
                busca ||
                statusFiltro !== 'todos' ||
                encargosFiltro !== 'todos'
                  ? 'Recebido das contas dentro dos filtros'
                  : 'Valor total recebido'
              }
              icon={CheckCircle2}
              destaque="emerald"
            />

            <Kpi
              titulo="Saldo a receber"
              valor={formatarReal(
                resumoContasReceber.saldoReceber
              )}
              detalhe={
                inicioFiltro ||
                fimFiltro ||
                busca ||
                statusFiltro !== 'todos' ||
                encargosFiltro !== 'todos'
                  ? 'Saldo pendente nos filtros aplicados'
                  : 'Saldo total ainda não recebido'
              }
              icon={ArrowUpRight}
              destaque="emerald"
            />
          </div>

          <section className="bg-white rounded-[18px] border border-slate-100 shadow-sm">
            <div className="px-5 py-4 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-[#0F172A]">
                  Contas a receber
                </h2>
                <p className="text-[11px] text-slate-400 mt-1">
                  Consulte, filtre e registre o recebimento dos títulos importados.
                </p>
              </div>

              <div className="flex items-center gap-2 text-[10px] text-slate-500">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-100">
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  {contasFiltradas.length} título{contasFiltradas.length === 1 ? '' : 's'}
                </span>
              </div>
            </div>

            <div className="p-4 bg-slate-50/60 border-b border-slate-100">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-[minmax(240px,1.25fr)_minmax(155px,.7fr)_minmax(155px,.7fr)_minmax(145px,.65fr)_minmax(145px,.65fr)_auto] gap-3 items-end">
                <div>
                  <label className="text-[9px] font-bold uppercase tracking-wide text-slate-400 block mb-1.5">
                    Buscar
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      value={busca}
                      onChange={e => setBusca(e.target.value)}
                      placeholder="Cliente, CNPJ ou documento..."
                      className="w-full h-10 pl-9 pr-3 bg-white border border-slate-200 rounded-[12px] text-xs text-slate-700 outline-none focus:border-slate-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[9px] font-bold uppercase tracking-wide text-slate-400 block mb-1.5">
                    Status
                  </label>
                  <select
                    value={statusFiltro}
                    onChange={e => setStatusFiltro(e.target.value)}
                    className="w-full h-10 bg-white border border-slate-200 rounded-[12px] px-3 text-xs text-slate-700 outline-none focus:border-slate-400"
                  >
                    <option value="todos">Todos os status</option>
                    <option value="previsto">A vencer</option>
                    <option value="vence_hoje">Vence hoje</option>
                    <option value="vencido">Vencido</option>
                    <option value="recebido_parcial">Recebido parcialmente</option>
                    <option value="recebido">Recebido</option>
                  </select>
                </div>

                <div>
                  <label className="text-[9px] font-bold uppercase tracking-wide text-slate-400 block mb-1.5">
                    Encargos
                  </label>
                  <select
                    value={encargosFiltro}
                    onChange={e =>
                      setEncargosFiltro(
                        e.target.value as
                          | 'todos'
                          | 'com_encargos'
                          | 'sem_encargos'
                      )
                    }
                    className="w-full h-10 bg-white border border-slate-200 rounded-[12px] px-3 text-xs text-slate-700 outline-none focus:border-slate-400"
                  >
                    <option value="todos">Todos</option>
                    <option value="com_encargos">
                      Com juros ou multa
                    </option>
                    <option value="sem_encargos">
                      Sem encargos
                    </option>
                  </select>
                </div>

                <div>
                  <label className="text-[9px] font-bold uppercase tracking-wide text-slate-400 block mb-1.5">
                    Vencimento inicial
                  </label>
                  <input
                    type="date"
                    value={inicioFiltro}
                    onChange={e => setInicioFiltro(e.target.value)}
                    className="w-full h-10 bg-white border border-slate-200 rounded-[12px] px-3 text-xs text-slate-700 outline-none focus:border-slate-400"
                  />
                </div>

                <div>
                  <label className="text-[9px] font-bold uppercase tracking-wide text-slate-400 block mb-1.5">
                    Vencimento final
                  </label>
                  <input
                    type="date"
                    value={fimFiltro}
                    onChange={e => setFimFiltro(e.target.value)}
                    className="w-full h-10 bg-white border border-slate-200 rounded-[12px] px-3 text-xs text-slate-700 outline-none focus:border-slate-400"
                  />
                </div>

                <button
                  type="button"
                  onClick={limparFiltrosContas}
                  className="h-10 px-4 rounded-[12px] border border-slate-200 bg-white text-slate-600 text-xs font-semibold hover:bg-slate-50 whitespace-nowrap"
                >
                  Limpar filtros
                </button>
              </div>
            </div>

            <div className="px-4 py-3 border-b border-slate-100 bg-white flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-600">
                  {selecionadas.size} selecionado{selecionadas.size === 1 ? '' : 's'}
                </span>
                <button
                  type="button"
                  onClick={() => setSelecionadas(new Set(contasFiltradas.map(conta => conta.id)))}
                  disabled={!contasFiltradas.length}
                  className="h-9 px-3 rounded-[10px] border border-slate-200 bg-white text-[10px] font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                >
                  Selecionar filtradas
                </button>
                <button
                  type="button"
                  onClick={() => setSelecionadas(new Set())}
                  disabled={!selecionadas.size}
                  className="h-9 px-3 rounded-[10px] border border-slate-200 bg-white text-[10px] font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                >
                  Limpar seleção
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={pagarSelecionadas}
                  disabled={processandoMassa || contasSelecionadas.filter(conta => Number(conta.saldo || 0) > 0).length === 0}
                  className="h-9 px-4 rounded-[10px] bg-emerald-600 text-white text-[10px] font-bold hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {processandoMassa ? 'Processando...' : 'Pagar selecionadas'}
                </button>
                <button
                  type="button"
                  onClick={excluirSelecionadas}
                  disabled={processandoMassa || contasSelecionadas.length === 0}
                  className="h-9 px-4 rounded-[10px] bg-red-50 border border-red-100 text-red-600 text-[10px] font-bold hover:bg-red-100 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Excluir selecionadas
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1180px]">
                <thead className="bg-[#F8FAFC] border-b border-slate-200">
                  <tr className="text-left text-[9px] uppercase tracking-[0.08em] text-slate-500">
                    <th className="pl-5 pr-2 py-3.5 w-10">
                      <input type="checkbox" checked={todasPaginaSelecionadas} onChange={alternarPagina} aria-label="Selecionar página" />
                    </th>
                    <th className="px-4 py-3.5 font-bold">Cliente</th>
                    <th className="px-4 py-3.5 font-bold">Documento</th>
                    <th className="px-4 py-3.5 font-bold text-center">Medição</th>
                    <th className="px-4 py-3.5 font-bold">Vencimento</th>
                    <th className="px-4 py-3.5 font-bold text-right">Valor original</th>
                    <th className="px-4 py-3.5 font-bold text-right">Recebido</th>
                    <th className="px-4 py-3.5 font-bold text-right">Saldo</th>
                    <th className="px-4 py-3.5 font-bold">Status</th>
                    <th className="px-5 py-3.5 font-bold text-right">Ações</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {carregando ? (
                    <tr>
                      <td colSpan={10} className="px-5 py-16 text-center text-xs text-slate-400">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-3" />
                        Carregando contas a receber...
                      </td>
                    </tr>
                  ) : contasFiltradas.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-5 py-16 text-center">
                        <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center mx-auto mb-4">
                          <FileSpreadsheet className="w-7 h-7 text-slate-300" />
                        </div>
                        <p className="text-sm font-bold text-slate-700">
                          Nenhum título encontrado
                        </p>
                        <p className="text-[11px] text-slate-400 mt-1 max-w-sm mx-auto">
                          Ajuste os filtros, importe uma planilha de faturamento ou cadastre um novo recebimento.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    contasPaginadas.map((conta, index) => (
                      <tr
                        key={conta.id}
                        className={`transition-colors hover:bg-slate-50 ${
                          index % 2 === 1 ? 'bg-slate-50/30' : 'bg-white'
                        }`}
                      >
                        <td className="pl-5 pr-2 py-4 w-10">
                          <input
                            type="checkbox"
                            checked={selecionadas.has(conta.id)}
                            onChange={() => alternarSelecao(conta.id)}
                            aria-label={`Selecionar ${conta.numeroDocumento}`}
                          />
                        </td>
                        <td className="px-4 py-4">
                          <p
                            className="text-xs font-bold text-slate-800 max-w-[250px] truncate"
                            title={conta.clienteNome}
                          >
                            {conta.clienteNome}
                          </p>
                          <p className="text-[10px] text-slate-400 mt-1 font-mono">
                            {conta.clienteDocumento || 'Documento não informado'}
                          </p>
                        </td>

                        <td className="px-4 py-4 text-[11px] font-mono text-slate-600 whitespace-nowrap">
                          {conta.numeroDocumento}
                        </td>

                        <td className="px-4 py-4 text-xs text-slate-500 text-center">
                          {conta.medicao || '—'}
                        </td>

                        <td className="px-4 py-4">
                          <div className="inline-flex items-center gap-2 text-xs text-slate-600 whitespace-nowrap">
                            <CalendarDays className="w-3.5 h-3.5 text-slate-400" />
                            {formatarData(conta.dataVencimento)}
                          </div>
                        </td>

                        <td className="px-4 py-4 text-right text-[11px] font-mono font-bold text-slate-800 whitespace-nowrap">
                          {formatarReal(conta.valorOriginal)}
                        </td>

                        <td className="px-4 py-4 text-right text-[11px] font-mono font-semibold text-emerald-600 whitespace-nowrap">
                          {formatarReal(conta.valorRecebido)}
                        </td>

                        <td className="px-4 py-4 text-right text-[11px] font-mono font-semibold text-amber-600 whitespace-nowrap">
                          {formatarReal(
                            conta.jurosRecebidos || 0
                          )}
                        </td>

                        <td className="px-4 py-4 text-right text-[11px] font-mono font-semibold text-orange-600 whitespace-nowrap">
                          {formatarReal(
                            conta.multaRecebida || 0
                          )}
                        </td>

                        <td className="px-4 py-4 text-right text-[11px] font-mono font-bold text-emerald-700 whitespace-nowrap">
                          {formatarReal(
                            Number(
                              conta.valorRecebido || 0
                            ) +
                              Number(
                                conta.jurosRecebidos || 0
                              ) +
                              Number(
                                conta.multaRecebida || 0
                              )
                          )}
                        </td>

                        <td className="px-4 py-4 text-right text-[11px] font-mono font-bold text-slate-900 whitespace-nowrap">
                          {formatarReal(conta.saldo)}
                        </td>

                        <td className="px-4 py-4">
                          <StatusBadge status={conta.statusVisual} />
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                abrirDetalhesContaReceber(
                                  conta
                                )
                              }
                              className="h-9 px-3.5 rounded-[11px] border border-slate-200 bg-white text-slate-700 text-[10px] font-bold hover:bg-slate-50 whitespace-nowrap"
                            >
                              Detalhes
                            </button>

                            {conta.saldo > 0 && (
                              <button
                                type="button"
                                onClick={() => {
                                  setContaBaixa(conta);
                                  setBaixa({
                                    valor: conta.saldo.toFixed(2),
                                    juros: '0',
                                    multa: '0',
                                    data: hojeIso(),
                                    forma: 'transferencia',
                                  });
                                }}
                                className="h-9 px-3.5 rounded-[11px] bg-emerald-50 text-emerald-700 text-[10px] font-bold hover:bg-emerald-100 border border-emerald-100 whitespace-nowrap"
                              >
                                Receber
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => excluirConta(conta)}
                              className="w-9 h-9 rounded-[11px] bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100 border border-red-100"
                              title="Excluir título"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {contasFiltradas.length > 0 && (
              <div className="px-5 py-4 border-t border-slate-100 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <p className="text-[10px] text-slate-400">
                  Exibindo{' '}
                  <span className="font-bold text-slate-600">
                    {(paginaContas - 1) * itensPorPagina + 1}
                  </span>{' '}
                  até{' '}
                  <span className="font-bold text-slate-600">
                    {Math.min(paginaContas * itensPorPagina, contasFiltradas.length)}
                  </span>{' '}
                  de{' '}
                  <span className="font-bold text-slate-600">
                    {contasFiltradas.length}
                  </span>{' '}
                  títulos
                </p>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={paginaContas === 1}
                    onClick={() => setPaginaContas(p => Math.max(1, p - 1))}
                    className="h-9 px-3 rounded-[10px] border border-slate-200 text-[10px] font-bold text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
                  >
                    Anterior
                  </button>

                  <span className="h-9 min-w-[84px] px-3 rounded-[10px] bg-slate-50 border border-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-600">
                    Página {paginaContas} de {totalPaginasContas}
                  </span>

                  <button
                    type="button"
                    disabled={paginaContas >= totalPaginasContas}
                    onClick={() =>
                      setPaginaContas(p => Math.min(totalPaginasContas, p + 1))
                    }
                    className="h-9 px-3 rounded-[10px] border border-slate-200 text-[10px] font-bold text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
                  >
                    Próxima
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      )}

      {aba === 'conciliacao' && (
        <div className="space-y-5">
          <div className="bg-white rounded-[18px] border border-slate-100 shadow-sm p-4">
            <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-4">
              <div>
                <h2 className="text-sm font-bold text-[#0F172A]">Período da conciliação</h2>
                <p className="text-[11px] text-slate-400 mt-1">
                  Escolha como deseja consultar os vencimentos em aberto.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-end gap-3">
                <div>
                  <label className="text-[9px] font-bold uppercase tracking-wide text-slate-400 block mb-1.5">
                    Visualização
                  </label>
                  <div className="flex items-center p-1 bg-slate-100 rounded-[12px]">
                    {([
                      ['dia', 'Dia'],
                      ['mes', 'Mês'],
                      ['ano', 'Ano'],
                    ] as Array<[TipoPeriodoConciliacao, string]>).map(([id, label]) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setTipoPeriodoConciliacao(id)}
                        className={`h-9 px-4 rounded-[9px] text-[10px] font-bold transition ${
                          tipoPeriodoConciliacao === id
                            ? 'bg-white text-[#0F172A] shadow-sm'
                            : 'text-slate-400 hover:text-slate-700'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="min-w-[190px]">
                  <label className="text-[9px] font-bold uppercase tracking-wide text-slate-400 block mb-1.5">
                    Período
                  </label>

                  {tipoPeriodoConciliacao === 'dia' && (
                    <input
                      type="date"
                      value={diaConciliacao}
                      onChange={e => setDiaConciliacao(e.target.value)}
                      className="w-full h-11 bg-white border border-slate-200 rounded-[12px] px-3 text-xs text-slate-700 outline-none focus:border-slate-400"
                    />
                  )}

                  {tipoPeriodoConciliacao === 'mes' && (
                    <input
                      type="month"
                      value={mesConciliacao}
                      onChange={e => setMesConciliacao(e.target.value)}
                      className="w-full h-11 bg-white border border-slate-200 rounded-[12px] px-3 text-xs text-slate-700 outline-none focus:border-slate-400"
                    />
                  )}

                  {tipoPeriodoConciliacao === 'ano' && (
                    <input
                      type="number"
                      min="2000"
                      max="2100"
                      step="1"
                      value={anoConciliacao}
                      onChange={e => setAnoConciliacao(e.target.value)}
                      className="w-full h-11 bg-white border border-slate-200 rounded-[12px] px-3 text-xs text-slate-700 outline-none focus:border-slate-400"
                    />
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Kpi
              titulo="Total a receber"
              valor={formatarReal(resumoConciliacao.receber)}
              detalhe="Recebimentos do dia anterior disponíveis para o período"
              icon={ArrowUpRight}
              destaque="emerald"
            />
            <Kpi
              titulo="Total a pagar"
              valor={formatarReal(resumoConciliacao.pagar)}
              detalhe="Contas a pagar na data atual do período"
              icon={ArrowDownRight}
              destaque="default"
            />
            <Kpi
              titulo="Resultado do período"
              valor={formatarReal(resumoConciliacao.resultado)}
              detalhe="Disponibilidade do dia anterior menos pagamentos do dia atual"
              icon={TrendingUp}
              destaque={resumoConciliacao.resultado >= 0 ? 'emerald' : 'red'}
            />
          </div>

          <div className="bg-white rounded-[18px] border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-[#0F172A]">Conciliação por disponibilidade</h2>
                <p className="text-[11px] text-slate-400 mt-1">
                  O valor a receber do dia anterior é comparado com o valor a pagar da data atual.
                </p>
              </div>

              <span className="inline-flex self-start sm:self-auto items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-100 text-[10px] font-bold text-slate-500">
                <CalendarDays className="w-3.5 h-3.5" />
                {conciliacaoFiltrada.length} dia{conciliacaoFiltrada.length === 1 ? '' : 's'} com movimento
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px]">
                <thead className="bg-slate-50 text-[10px] uppercase text-slate-400">
                  <tr>
                    <th className="px-5 py-3 text-left">Data</th>
                    <th className="px-5 py-3 text-right">A receber (dia anterior)</th>
                    <th className="px-5 py-3 text-right">A pagar (dia atual)</th>
                    <th className="px-5 py-3 text-right">Disponibilidade do dia</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {conciliacaoFiltrada.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-5 py-12 text-center text-xs text-slate-400">
                        Não existem vencimentos em aberto para o período selecionado.
                      </td>
                    </tr>
                  ) : (
                    conciliacaoFiltrada.map(linha => (
                      <tr
                        key={linha.data}
                        className={linha.resultado < 0 ? 'bg-red-50/50' : 'hover:bg-slate-50/50'}
                      >
                        <td className="px-5 py-4 text-xs font-bold text-slate-700">
                          {formatarData(linha.data)}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="text-xs font-mono font-semibold text-emerald-600">
                            +{formatarReal(linha.receber)}
                          </div>
                          <div className="mt-0.5 text-[9px] font-medium text-slate-400">
                            ref. {formatarData(
                              (linha as any).dataReceber
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-4 text-right text-xs font-mono font-semibold text-slate-700">
                          -{formatarReal(linha.pagar)}
                        </td>
                        <td
                          className={`px-5 py-4 text-right text-xs font-mono font-bold ${
                            linha.resultado >= 0 ? 'text-emerald-600' : 'text-red-600'
                          }`}
                        >
                          {formatarReal(linha.resultado)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {modalImportacao && (
        <Modal title="Importar faturamento" onClose={() => setModalImportacao(false)} maxWidth="max-w-6xl">
          <div className="space-y-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 bg-slate-50 rounded-[14px]">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-800 truncate">{arquivoNome}</p>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Avisos e divergências são exibidos para conferência, mas todos os registros serão importados.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-5 gap-2 text-center">
                <MiniResumo label="Total" value={resumoImportacao.total} />
                <MiniResumo label="Válidos" value={resumoImportacao.validos} positivo />
                <MiniResumo label="Atenção" value={resumoImportacao.atencao} alerta />
                <MiniResumo label="Erros" value={resumoImportacao.erros} erro />
                <MiniResumo label="Duplicados" value={resumoImportacao.duplicados} />
              </div>
            </div>

            <div className="border border-slate-100 rounded-[14px] overflow-hidden max-h-[430px] overflow-auto">
              <table className="w-full min-w-[980px]">
                <thead className="sticky top-0 bg-slate-50 z-10 text-[10px] uppercase text-slate-400">
                  <tr>
                    <th className="px-3 py-3 text-left">Linha</th>
                    <th className="px-3 py-3 text-left">Situação</th>
                    <th className="px-3 py-3 text-left">Cliente</th>
                    <th className="px-3 py-3 text-left">CNPJ/CPF</th>
                    <th className="px-3 py-3 text-left">Documento</th>
                    <th className="px-3 py-3 text-left">Medição</th>
                    <th className="px-3 py-3 text-left">Vencimento</th>
                    <th className="px-3 py-3 text-right">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {preview.map(linha => (
                    <tr key={linha.linha}>
                      <td className="px-3 py-3 text-[10px] text-slate-400">{linha.linha}</td>
                      <td className="px-3 py-3">
                        <PreviewBadge status={linha.status} mensagem={linha.mensagem} />
                      </td>
                      <td className="px-3 py-3 text-xs text-slate-700 max-w-[250px] truncate">
                        {linha.clienteNome || '—'}
                      </td>
                      <td className="px-3 py-3 text-[10px] font-mono text-slate-500">
                        {linha.clienteDocumento || '—'}
                      </td>
                      <td className="px-3 py-3 text-xs font-mono text-slate-600">
                        {linha.numeroDocumento || '—'}
                      </td>
                      <td className="px-3 py-3 text-xs text-slate-500">{linha.medicao || '—'}</td>
                      <td className="px-3 py-3">
                        <input
                          type="date"
                          value={linha.dataVencimento}
                                                    onChange={e => corrigirDataPreview(linha.linha, e.target.value)}
                          className={`h-9 rounded-[10px] px-2 text-xs border ${
                            linha.status === 'atencao'
                              ? 'border-amber-300 bg-amber-50'
                              : 'border-slate-200 bg-white'
                          }`}
                        />
                      </td>
                      <td className="px-3 py-3 text-right text-xs font-mono font-bold text-slate-700">
                        {formatarReal(linha.valorOriginal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setModalImportacao(false)}
                className="h-10 px-4 rounded-[12px] border border-slate-200 text-xs font-semibold text-slate-600"
              >
                Cancelar
              </button>
              <div className="flex flex-col items-end gap-1">
                <button
                  type="button"
                  disabled={importando || resumoImportacao.total === 0}
                  onClick={confirmarImportacao}
                  className="h-10 px-5 rounded-[12px] bg-[#0F172A] text-white text-xs font-bold flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {importando ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                  Importar todos os {resumoImportacao.total} títulos
                </button>

                {(resumoImportacao.atencao > 0 ||
                  resumoImportacao.erros > 0 ||
                  resumoImportacao.duplicados > 0) && (
                  <p className="text-[10px] text-amber-600 text-right max-w-md">
                    Existem registros com avisos/divergências, mas nenhum será descartado.
                    Duplicados também serão importados.
                  </p>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {modalManual && (
        <Modal title="Novo recebimento previsto" onClose={() => setModalManual(false)}>
          <form onSubmit={cadastrarManual} className="space-y-4">
            <Campo label="Cliente *" value={manual.clienteNome} onChange={valor => setManual(v => ({ ...v, clienteNome: valor }))} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Campo label="CNPJ/CPF" value={manual.clienteDocumento} onChange={valor => setManual(v => ({ ...v, clienteDocumento: valor }))} />
              <Campo label="Medição" value={manual.medicao} onChange={valor => setManual(v => ({ ...v, medicao: valor }))} />
              <Campo label="Documento *" value={manual.numeroDocumento} onChange={valor => setManual(v => ({ ...v, numeroDocumento: valor }))} />
              <Campo label="Vencimento *" type="date" value={manual.dataVencimento} onChange={valor => setManual(v => ({ ...v, dataVencimento: valor }))} />
              <Campo label="Valor *" type="number" value={manual.valorOriginal} onChange={valor => setManual(v => ({ ...v, valorOriginal: valor }))} />
            </div>
            <Campo label="Observações" value={manual.observacao} onChange={valor => setManual(v => ({ ...v, observacao: valor }))} />
            <button type="submit" className="w-full h-11 rounded-[12px] bg-[#0F172A] text-white text-xs font-bold">
              Salvar conta a receber
            </button>
          </form>
        </Modal>
      )}

      {contaDetalhes && (
        <Modal
          title="Detalhes da conta a receber"
          onClose={fecharDetalhesContaReceber}
          maxWidth="max-w-4xl"
        >
          <div className="space-y-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-bold text-slate-800">
                  {contaDetalhes.clienteNome}
                </p>
                <p className="mt-1 text-[10px] text-slate-400">
                  {contaDetalhes.numeroDocumento}
                </p>
              </div>

              {!editandoContaDetalhes ? (
                <button
                  type="button"
                  onClick={() =>
                    setEditandoContaDetalhes(true)
                  }
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-[11px] bg-blue-50 px-3.5 text-[10px] font-bold text-blue-700 hover:bg-blue-100"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Editar
                </button>
              ) : null}
            </div>

            {editandoContaDetalhes ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <Campo
                    label="Cliente *"
                    value={formContaDetalhes.clienteNome}
                    onChange={(valor: string) =>
                      setFormContaDetalhes(v => ({
                        ...v,
                        clienteNome: valor,
                      }))
                    }
                  />

                  <Campo
                    label="CNPJ/CPF"
                    value={
                      formContaDetalhes.clienteDocumento
                    }
                    onChange={(valor: string) =>
                      setFormContaDetalhes(v => ({
                        ...v,
                        clienteDocumento: valor,
                      }))
                    }
                  />

                  <Campo
                    label="Documento *"
                    value={
                      formContaDetalhes.numeroDocumento
                    }
                    onChange={(valor: string) =>
                      setFormContaDetalhes(v => ({
                        ...v,
                        numeroDocumento: valor,
                      }))
                    }
                  />

                  <Campo
                    label="Medição"
                    value={formContaDetalhes.medicao}
                    onChange={(valor: string) =>
                      setFormContaDetalhes(v => ({
                        ...v,
                        medicao: valor,
                      }))
                    }
                  />

                  <Campo
                    label="Vencimento *"
                    type="date"
                    value={
                      formContaDetalhes.dataVencimento
                    }
                    onChange={(valor: string) =>
                      setFormContaDetalhes(v => ({
                        ...v,
                        dataVencimento: valor,
                      }))
                    }
                  />

                  <Campo
                    label="Valor original *"
                    type="number"
                    value={
                      formContaDetalhes.valorOriginal
                    }
                    onChange={(valor: string) =>
                      setFormContaDetalhes(v => ({
                        ...v,
                        valorOriginal: valor,
                      }))
                    }
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5">
                    Observação
                  </label>
                  <textarea
                    value={formContaDetalhes.observacao}
                    onChange={event =>
                      setFormContaDetalhes(v => ({
                        ...v,
                        observacao:
                          event.target.value,
                      }))
                    }
                    className="min-h-[90px] w-full rounded-[12px] border-0 bg-slate-50 px-3 py-3 text-xs text-slate-700 outline-none"
                  />
                </div>

                <div className="rounded-[14px] bg-slate-50 p-4 text-[10px] leading-5 text-slate-500">
                  Valor recebido, saldo, status e data de recebimento são controlados pelas baixas e não são editados manualmente.
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    disabled={salvandoContaDetalhes}
                    onClick={() => {
                      setFormContaDetalhes(
                        montarFormContaDetalhes(
                          contaDetalhes
                        )
                      );
                      setEditandoContaDetalhes(false);
                    }}
                    className="h-10 rounded-[11px] border border-slate-200 bg-white px-4 text-[10px] font-bold text-slate-600 disabled:opacity-40"
                  >
                    Cancelar
                  </button>

                  <button
                    type="button"
                    disabled={salvandoContaDetalhes}
                    onClick={salvarContaReceberEditada}
                    className="inline-flex h-10 items-center gap-2 rounded-[11px] bg-blue-600 px-4 text-[10px] font-bold text-white disabled:opacity-40"
                  >
                    {salvandoContaDetalhes ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : null}
                    {salvandoContaDetalhes
                      ? 'Salvando...'
                      : 'Salvar alterações'}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <DetalheReceber
                    label="Cliente"
                    value={contaDetalhes.clienteNome}
                  />
                  <DetalheReceber
                    label="CNPJ/CPF"
                    value={
                      contaDetalhes.clienteDocumento ||
                      'Não informado'
                    }
                  />
                  <DetalheReceber
                    label="Documento"
                    value={
                      contaDetalhes.numeroDocumento
                    }
                    mono
                  />
                  <DetalheReceber
                    label="Medição"
                    value={
                      contaDetalhes.medicao ||
                      'Não informada'
                    }
                  />
                  <DetalheReceber
                    label="Vencimento atual"
                    value={formatarData(
                      contaDetalhes.dataVencimento
                    )}
                    mono
                  />
                  <DetalheReceber
                    label="Vencimento original"
                    value={formatarData(
                      vencimentoOriginalContaReceber(
                        contaDetalhes
                      )
                    )}
                    mono
                  />
                  <DetalheReceber
                    label="Valor original"
                    value={formatarReal(
                      contaDetalhes.valorOriginal
                    )}
                    mono
                    destaque
                  />
                  <DetalheReceber
                    label="Recebido"
                    value={formatarReal(
                      contaDetalhes.valorRecebido
                    )}
                    mono
                  />
                  <DetalheReceber
                    label="Saldo"
                    value={formatarReal(
                      contaDetalhes.saldo
                    )}
                    mono
                  />
                  <DetalheReceber
                    label="Status"
                    value={
                      <StatusBadge
                        status={
                          (contasComStatusCalculado.find(
                            item =>
                              item.id ===
                              contaDetalhes.id
                          ) as any)?.statusVisual ??
                          contaDetalhes.status
                        }
                      />
                    }
                  />
                  <DetalheReceber
                    label="Data do recebimento"
                    value={
                      contaDetalhes.dataRecebimento
                        ? formatarData(
                            contaDetalhes.dataRecebimento
                          )
                        : 'Ainda não recebido'
                    }
                    mono
                  />
                  <DetalheReceber
                    label="Forma de recebimento"
                    value={
                      contaDetalhes.formaRecebimento
                        ? String(
                            contaDetalhes.formaRecebimento
                          ).toUpperCase()
                        : 'Não informada'
                    }
                  />
                  <DetalheReceber
                    label="Origem"
                    value={
                      contaDetalhes.origem ===
                      'importacao_excel'
                        ? 'Importação Excel'
                        : 'Cadastro manual'
                    }
                  />
                </div>

                <div className="rounded-[14px] bg-slate-50 p-4">
                  <p className="text-[9px] font-bold uppercase text-slate-400">
                    Observação
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-[11px] leading-5 text-slate-600">
                    {contaDetalhes.observacao ||
                      'Nenhuma observação cadastrada.'}
                  </p>
                </div>
              </>
            )}

            <section className="rounded-[16px] border border-slate-100 bg-white p-4 shadow-sm">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">
                    Histórico de alterações
                  </p>
                  <p className="mt-1 text-[10px] text-slate-400">
                    Mudanças feitas na conta, com valor anterior, novo valor, usuário e data.
                  </p>
                </div>
                <Clock3 className="h-4 w-4 shrink-0 text-slate-300" />
              </div>

              {carregandoHistoricoContaReceber ? (
                <div className="flex items-center justify-center gap-2 rounded-[14px] bg-slate-50 px-4 py-6 text-[10px] text-slate-400">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Carregando histórico...
                </div>
              ) : historicoContaReceber.length === 0 ? (
                <div className="rounded-[14px] bg-slate-50 px-4 py-6 text-center">
                  <p className="text-[10px] text-slate-400">
                    Nenhuma alteração registrada para esta conta.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {historicoContaReceber.map(item => (
                    <div
                      key={item.id}
                      className="rounded-[14px] border border-blue-100 bg-blue-50/40 p-3.5"
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-[10px] font-bold text-slate-700">
                            {labelCampoHistorico(item.campo)}
                          </p>
                          <p className="mt-1 text-[9px] text-slate-400">
                            Alterado por{' '}
                            <span className="font-semibold text-slate-500">
                              {item.usuarioNome}
                            </span>
                          </p>
                        </div>
                        <span className="shrink-0 text-[9px] font-medium text-slate-400">
                          {formatarDataHoraHistoricoReceber(
                            item.createdAt
                          )}
                        </span>
                      </div>

                      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
                        <div className="rounded-xl bg-white px-3 py-2.5">
                          <p className="text-[8px] font-bold uppercase text-slate-400">
                            Antes
                          </p>
                          <p className="mt-1 break-words text-[10px] font-semibold text-slate-600">
                            {formatarValorHistoricoReceber(
                              item.campo,
                              item.valorAnterior
                            )}
                          </p>
                        </div>

                        <span className="hidden text-center text-slate-300 sm:block">
                          →
                        </span>

                        <div className="rounded-xl bg-white px-3 py-2.5">
                          <p className="text-[8px] font-bold uppercase text-slate-400">
                            Depois
                          </p>
                          <p className="mt-1 break-words text-[10px] font-semibold text-blue-700">
                            {formatarValorHistoricoReceber(
                              item.campo,
                              item.valorNovo
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-[16px] border border-slate-100 bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">
                    Anexos
                  </p>
                  <p className="mt-1 text-[10px] text-slate-400">
                    Nota fiscal, boleto, comprovante, contrato ou outro documento.
                  </p>
                </div>

                <div>
                  <input
                    ref={detalheArquivoRef}
                    type="file"
                    className="hidden"
                    accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.xls,.xlsx,.csv,.txt"
                    onChange={event =>
                      anexarArquivoContaReceber(
                        event.target.files?.[0]
                      )
                    }
                  />

                  <button
                    type="button"
                    onClick={() =>
                      detalheArquivoRef.current?.click()
                    }
                    disabled={
                      enviandoDocumentoContaReceber ||
                      Boolean(
                        excluindoDocumentoContaReceberId
                      )
                    }
                    className="inline-flex h-9 items-center gap-2 rounded-[11px] bg-blue-50 px-3.5 text-[10px] font-bold text-blue-700 hover:bg-blue-100 disabled:opacity-40"
                  >
                    {enviandoDocumentoContaReceber ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Upload className="h-3.5 w-3.5" />
                    )}
                    {enviandoDocumentoContaReceber
                      ? 'Enviando...'
                      : 'Anexar arquivo'}
                  </button>
                </div>
              </div>

              <div className="mt-4">
                {carregandoDocumentosContaReceber ? (
                  <div className="flex items-center justify-center gap-2 rounded-[12px] bg-slate-50 px-4 py-5 text-[10px] font-semibold text-slate-400">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Carregando anexos...
                  </div>
                ) : documentosContaReceber.length ===
                  0 ? (
                  <div className="rounded-[12px] border border-dashed border-slate-200 bg-slate-50/60 px-4 py-5 text-center">
                    <FileText className="mx-auto h-5 w-5 text-slate-300" />
                    <p className="mt-2 text-[10px] font-bold text-slate-500">
                      Nenhum arquivo anexado
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {documentosContaReceber.map(
                      documento => {
                        const excluindo =
                          excluindoDocumentoContaReceberId ===
                          documento.id;

                        return (
                          <div
                            key={documento.id}
                            className="flex items-center gap-3 rounded-[12px] border border-slate-100 bg-slate-50/70 p-3"
                          >
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-white text-blue-600">
                              <FileText className="h-4 w-4" />
                            </div>

                            <div className="min-w-0 flex-1">
                              <p
                                className="truncate text-[10px] font-bold text-slate-700"
                                title={documento.nome}
                              >
                                {documento.nome}
                              </p>
                              <p className="mt-1 text-[8px] text-slate-400">
                                {formatarData(
                                  documento.createdAt.slice(
                                    0,
                                    10
                                  )
                                )}
                              </p>
                            </div>

                            <div className="flex shrink-0 gap-1.5">
                              <button
                                type="button"
                                onClick={() =>
                                  window.open(
                                    documento.url,
                                    '_blank',
                                    'noopener,noreferrer'
                                  )
                                }
                                disabled={
                                  excluindo ||
                                  !documento.url
                                }
                                className="h-8 rounded-[9px] border border-slate-200 bg-white px-2.5 text-[9px] font-bold text-slate-600 disabled:opacity-40"
                              >
                                Abrir
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  excluirArquivoContaReceber(
                                    documento
                                  )
                                }
                                disabled={
                                  excluindo ||
                                  enviandoDocumentoContaReceber
                                }
                                className="inline-flex h-8 items-center gap-1.5 rounded-[9px] border border-red-100 bg-red-50 px-2.5 text-[9px] font-bold text-red-600 disabled:opacity-40"
                              >
                                {excluindo ? (
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
        </Modal>
      )}

      {contaBaixa && (
        <Modal title="Registrar recebimento" onClose={() => setContaBaixa(null)}>
          <form onSubmit={confirmarBaixa} className="space-y-4">
            <div className="p-4 rounded-[14px] bg-slate-50">
              <p className="text-xs font-bold text-slate-800">{contaBaixa.clienteNome}</p>
              <p className="text-[10px] text-slate-400 mt-1">
                {contaBaixa.numeroDocumento} · Saldo {formatarReal(contaBaixa.saldo)}
              </p>
            </div>
            <Campo
              label="Valor principal recebido *"
              type="number"
              value={baixa.valor}
              onChange={valor =>
                setBaixa(v => ({
                  ...v,
                  valor,
                }))
              }
            />

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Campo
                label="Juros"
                type="number"
                value={baixa.juros}
                onChange={valor =>
                  setBaixa(v => ({
                    ...v,
                    juros: valor,
                  }))
                }
              />

              <Campo
                label="Multa"
                type="number"
                value={baixa.multa}
                onChange={valor =>
                  setBaixa(v => ({
                    ...v,
                    multa: valor,
                  }))
                }
              />
            </div>

            <div className="rounded-[14px] border border-emerald-100 bg-emerald-50 p-4">
              <p className="text-[9px] font-bold uppercase text-emerald-600">
                Total que entrará no caixa
              </p>
              <p className="mt-1 font-mono text-base font-bold text-emerald-700">
                {formatarReal(
                  Math.max(
                    Number(
                      baixa.valor.replace(',', '.')
                    ) || 0,
                    0
                  ) +
                    Math.max(
                      Number(
                        baixa.juros.replace(',', '.')
                      ) || 0,
                      0
                    ) +
                    Math.max(
                      Number(
                        baixa.multa.replace(',', '.')
                      ) || 0,
                      0
                    )
                )}
              </p>
            </div>

            <Campo
              label="Data do recebimento *"
              type="date"
              value={baixa.data}
              onChange={valor =>
                setBaixa(v => ({
                  ...v,
                  data: valor,
                }))
              }
            />
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5">Forma de recebimento</label>
              <select value={baixa.forma} onChange={e => setBaixa(v => ({ ...v, forma: e.target.value }))} className="w-full h-10 bg-slate-50 border-0 rounded-[12px] px-3 text-xs">
                <option value="transferencia">Transferência</option>
                <option value="pix">PIX</option>
                <option value="boleto">Boleto</option>
                <option value="dinheiro">Dinheiro</option>
                <option value="cartao">Cartão</option>
                <option value="outro">Outro</option>
              </select>
            </div>
            <button type="submit" className="w-full h-11 rounded-[12px] bg-emerald-600 text-white text-xs font-bold">
              Confirmar recebimento
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
};

const Kpi = ({ titulo, valor, detalhe, icon: Icon, destaque }: any) => {
  const cor =
    destaque === 'emerald'
      ? 'text-emerald-600 bg-emerald-50'
      : destaque === 'red'
      ? 'text-red-600 bg-red-50'
      : 'text-[#0F172A] bg-slate-100';

  return (
    <div className="bg-white p-5 rounded-[18px] border border-slate-100 shadow-sm min-h-[138px] flex flex-col justify-between">
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{titulo}</span>
          <p className={`text-lg font-bold font-mono mt-2 ${destaque === 'red' ? 'text-red-600' : destaque === 'emerald' ? 'text-emerald-600' : 'text-[#0F172A]'}`}>{valor}</p>
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${cor}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <p className="text-[10px] text-slate-400 mt-3">{detalhe}</p>
    </div>
  );
};

const ResumoCard = ({ titulo, valor, icon: Icon, texto, positivo }: any) => (
  <div className="bg-white p-5 rounded-[18px] border border-slate-100 shadow-sm flex items-center justify-between gap-4">
    <div>
      <p className="text-[10px] uppercase font-bold text-slate-400">{titulo}</p>
      <p className={`text-base font-bold font-mono mt-2 ${positivo ? 'text-emerald-600' : 'text-[#0F172A]'}`}>
        {formatarReal(valor)}
      </p>
      <p className="text-[10px] text-slate-400 mt-2">{texto}</p>
    </div>
    <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${positivo ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-700'}`}>
      <Icon className="w-5 h-5" />
    </div>
  </div>
);

const StatusBadge = ({ status }: { status: string }) => {
  const config: Record<string, { label: string; classe: string }> = {
    previsto: { label: 'A vencer', classe: 'bg-blue-50 text-blue-700' },
    vence_hoje: { label: 'Vence hoje', classe: 'bg-amber-50 text-amber-700' },
    vencido: { label: 'Vencido', classe: 'bg-red-50 text-red-700' },
    recebido_parcial: { label: 'Parcial', classe: 'bg-violet-50 text-violet-700' },
    recebido: { label: 'Recebido', classe: 'bg-emerald-50 text-emerald-700' },
  };
  const item = config[status] || { label: status, classe: 'bg-slate-100 text-slate-600' };
  return <span className={`inline-flex px-2.5 py-1 rounded-full text-[9px] font-bold ${item.classe}`}>{item.label}</span>;
};

const PreviewBadge = ({ status, mensagem }: { status: string; mensagem: string }) => {
  const classe =
    status === 'valido'
      ? 'bg-emerald-50 text-emerald-700'
      : status === 'atencao'
      ? 'bg-amber-50 text-amber-700'
      : status === 'duplicado'
      ? 'bg-slate-100 text-slate-600'
      : 'bg-red-50 text-red-700';
  const label =
    status === 'valido' ? 'Válido' : status === 'atencao' ? 'Atenção' : status === 'duplicado' ? 'Duplicado' : 'Erro';
  return <span title={mensagem} className={`inline-flex px-2 py-1 rounded-full text-[9px] font-bold cursor-help ${classe}`}>{label}</span>;
};

const MiniResumo = ({ label, value, positivo, alerta, erro }: any) => (
  <div className="min-w-[62px]">
    <p className={`text-sm font-bold font-mono ${positivo ? 'text-emerald-600' : alerta ? 'text-amber-600' : erro ? 'text-red-600' : 'text-slate-700'}`}>{value}</p>
    <p className="text-[8px] uppercase text-slate-400">{label}</p>
  </div>
);

const DetalheReceber = ({
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
    className={`min-w-0 rounded-[14px] p-4 ${
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

    <div
      className={`mt-2 break-words text-xs font-bold ${
        mono ? 'font-mono' : ''
      }`}
    >
      {value}
    </div>
  </div>
);

const Modal = ({ title, onClose, children, maxWidth = 'max-w-lg' }: any) => (
  <>
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
    <div className="fixed inset-0 z-50 p-4 flex items-center justify-center pointer-events-none">
      <div className={`w-full ${maxWidth} max-h-[92vh] overflow-auto bg-white rounded-[20px] shadow-2xl pointer-events-auto`}>
        <div className="sticky top-0 z-20 bg-white p-5 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-[#0F172A]">{title}</h2>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center hover:bg-slate-100">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  </>
);

const Campo = ({ label, value, onChange, type = 'text' }: any) => (
  <div>
    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5">{label}</label>
    <input
      type={type}
      step={type === 'number' ? '0.01' : undefined}
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full h-10 bg-slate-50 border-0 rounded-[12px] px-3 text-xs text-slate-700"
    />
  </div>
);

export default CashFlowView;