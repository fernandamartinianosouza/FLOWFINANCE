import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useFinance } from '../context/FinanceContext';
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
  Download,
  FileSpreadsheet,
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
  faturamentoImportService,
  LinhaFaturamentoPreview,
} from '../services/faturamentoImportService';

type Aba = 'visao-geral' | 'contas-receber' | 'conciliacao';

type LinhaConciliacao = {
  data: string;
  receber: number;
  pagar: number;
  saldoDia: number;
  saldoAcumulado: number;
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

export const CashFlowView: React.FC = () => {
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
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const [busca, setBusca] = useState('');
  const [statusFiltro, setStatusFiltro] = useState('todos');
  const [inicioFiltro, setInicioFiltro] = useState('');
  const [fimFiltro, setFimFiltro] = useState('');
  const [paginaContas, setPaginaContas] = useState(1);
  const itensPorPagina = 12;

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
    data: hojeIso(),
    forma: 'transferencia',
  });

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
        statusFiltro === 'todos' || conta.statusVisual === statusFiltro;

      const correspondeInicio =
        !inicioFiltro ||
        Boolean(conta.dataVencimento && conta.dataVencimento >= inicioFiltro);

      const correspondeFim =
        !fimFiltro || Boolean(conta.dataVencimento && conta.dataVencimento <= fimFiltro);

      return correspondeBusca && correspondeStatus && correspondeInicio && correspondeFim;
    });
  }, [contasComStatusCalculado, busca, statusFiltro, inicioFiltro, fimFiltro]);

  useEffect(() => {
    setPaginaContas(1);
  }, [busca, statusFiltro, inicioFiltro, fimFiltro, empresaAtivaId]);

  const totalPaginasContas = Math.max(
    1,
    Math.ceil(contasFiltradas.length / itensPorPagina)
  );

  const contasPaginadas = useMemo(() => {
    const inicio = (paginaContas - 1) * itensPorPagina;
    return contasFiltradas.slice(inicio, inicio + itensPorPagina);
  }, [contasFiltradas, paginaContas]);

  const limparFiltrosContas = () => {
    setBusca('');
    setStatusFiltro('todos');
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
        .filter(c => c.dataRecebimento?.slice(0, 7) === mesAtual())
        .reduce((sum, c) => sum + c.valorRecebido, 0),
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

  const conciliacao = useMemo<LinhaConciliacao[]>(() => {
    const mapa = new Map<string, { receber: number; pagar: number }>();

    contas
      .filter(c => !['recebido', 'cancelado'].includes(c.status) && c.dataVencimento)
      .forEach(conta => {
        const data = conta.dataVencimento!;
        const atual = mapa.get(data) || { receber: 0, pagar: 0 };
        atual.receber += conta.saldo;
        mapa.set(data, atual);
      });

    processos
      .filter(p => p.empresaId === empresaAtivaId && p.status !== 'finalizado')
      .forEach(processo => {
        const data = processo.prazo || processo.dataCriacao;
        if (!dataValida(data)) return;
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
    event.preventDefault();
    if (!contaBaixa) return;

    const valor = Number(baixa.valor.replace(',', '.'));
    if (!Number.isFinite(valor) || valor <= 0 || valor > contaBaixa.saldo) {
      alert(`Informe um valor entre R$ 0,01 e ${formatarReal(contaBaixa.saldo)}.`);
      return;
    }

    try {
      await faturamentoImportService.registrarRecebimento(
        contaBaixa,
        valor,
        baixa.data,
        baixa.forma
      );
      setContaBaixa(null);
      setBaixa({ valor: '', data: hojeIso(), forma: 'transferencia' });
      await carregar();
    } catch (error: any) {
      console.error(error);
      alert(error?.message || 'Erro ao registrar o recebimento.');
    }
  };

  const excluirConta = async (conta: ContaReceber) => {
    if (!window.confirm(`Excluir o título ${conta.numeroDocumento}?`)) return;

    try {
      await faturamentoImportService.excluir(conta);
      await carregar();
    } catch (error: any) {
      console.error(error);
      alert(error?.message || 'Erro ao excluir a conta.');
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
              detalhe="Baixas registradas no mês atual"
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
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <Kpi
              titulo="Títulos em aberto"
              valor={String(
                contas.filter(c => !['recebido', 'cancelado'].includes(c.status)).length
              )}
              detalhe="Quantidade de contas pendentes"
              icon={FileSpreadsheet}
              destaque="default"
            />
            <Kpi
              titulo="Saldo a receber"
              valor={formatarReal(totalAReceber)}
              detalhe="Valor total ainda não recebido"
              icon={ArrowUpRight}
              destaque="emerald"
            />
            <Kpi
              titulo="Total vencido"
              valor={formatarReal(totalVencido)}
              detalhe="Títulos com vencimento em atraso"
              icon={AlertTriangle}
              destaque="red"
            />
            <Kpi
              titulo="Recebido no mês"
              valor={formatarReal(totalRecebidoMes)}
              detalhe="Baixas registradas no mês atual"
              icon={CheckCircle2}
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
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-[minmax(260px,1.4fr)_minmax(170px,.7fr)_minmax(155px,.65fr)_minmax(155px,.65fr)_auto] gap-3 items-end">
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

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1120px]">
                <thead className="bg-[#F8FAFC] border-b border-slate-200">
                  <tr className="text-left text-[9px] uppercase tracking-[0.08em] text-slate-500">
                    <th className="px-5 py-3.5 font-bold">Cliente</th>
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
                      <td colSpan={9} className="px-5 py-16 text-center text-xs text-slate-400">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-3" />
                        Carregando contas a receber...
                      </td>
                    </tr>
                  ) : contasFiltradas.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-5 py-16 text-center">
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
                        <td className="px-5 py-4">
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

                        <td className="px-4 py-4 text-right text-[11px] font-mono font-bold text-slate-900 whitespace-nowrap">
                          {formatarReal(conta.saldo)}
                        </td>

                        <td className="px-4 py-4">
                          <StatusBadge status={conta.statusVisual} />
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex items-center justify-end gap-2">
                            {conta.saldo > 0 && (
                              <button
                                type="button"
                                onClick={() => {
                                  setContaBaixa(conta);
                                  setBaixa({
                                    valor: conta.saldo.toFixed(2),
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Kpi
              titulo="Total a receber"
              valor={formatarReal(totalAReceber)}
              detalhe="Entradas ainda não recebidas"
              icon={ArrowUpRight}
              destaque="emerald"
            />
            <Kpi
              titulo="Total a pagar"
              valor={formatarReal(totalSaidasPlanejadas)}
              detalhe="Saídas ainda não finalizadas"
              icon={ArrowDownRight}
              destaque="default"
            />
            <Kpi
              titulo="Resultado projetado"
              valor={formatarReal(totalAReceber - totalSaidasPlanejadas)}
              detalhe="Receber menos pagar, sem saldo inicial"
              icon={TrendingUp}
              destaque={totalAReceber - totalSaidasPlanejadas >= 0 ? 'emerald' : 'red'}
            />
          </div>

          <div className="bg-white rounded-[18px] border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100">
              <h2 className="text-sm font-bold text-[#0F172A]">Conciliação por vencimento</h2>
              <p className="text-[11px] text-slate-400 mt-1">
                Comparação diária entre entradas, saídas e saldo acumulado.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px]">
                <thead className="bg-slate-50 text-[10px] uppercase text-slate-400">
                  <tr>
                    <th className="px-5 py-3 text-left">Data</th>
                    <th className="px-5 py-3 text-right">A receber</th>
                    <th className="px-5 py-3 text-right">A pagar</th>
                    <th className="px-5 py-3 text-right">Saldo do dia</th>
                    <th className="px-5 py-3 text-right">Saldo acumulado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {conciliacao.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-12 text-center text-xs text-slate-400">
                        Não existem vencimentos para conciliar.
                      </td>
                    </tr>
                  ) : (
                    conciliacao.map(linha => (
                      <tr key={linha.data} className={linha.saldoAcumulado < 0 ? 'bg-red-50/50' : ''}>
                        <td className="px-5 py-4 text-xs font-bold text-slate-700">
                          {formatarData(linha.data)}
                        </td>
                        <td className="px-5 py-4 text-right text-xs font-mono text-emerald-600">
                          +{formatarReal(linha.receber)}
                        </td>
                        <td className="px-5 py-4 text-right text-xs font-mono text-slate-700">
                          -{formatarReal(linha.pagar)}
                        </td>
                        <td
                          className={`px-5 py-4 text-right text-xs font-mono font-bold ${
                            linha.saldoDia >= 0 ? 'text-emerald-600' : 'text-red-600'
                          }`}
                        >
                          {formatarReal(linha.saldoDia)}
                        </td>
                        <td
                          className={`px-5 py-4 text-right text-xs font-mono font-bold ${
                            linha.saldoAcumulado >= 0 ? 'text-[#0F172A]' : 'text-red-600'
                          }`}
                        >
                          {formatarReal(linha.saldoAcumulado)}
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
                    Corrija os vencimentos sinalizados antes de importar.
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
                          disabled={linha.status === 'duplicado'}
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
                  disabled={importando || resumoImportacao.validos === 0}
                  onClick={confirmarImportacao}
                  className="h-10 px-5 rounded-[12px] bg-[#0F172A] text-white text-xs font-bold flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {importando ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                  Importar {resumoImportacao.validos} títulos válidos
                </button>

                {(resumoImportacao.atencao > 0 ||
                  resumoImportacao.erros > 0 ||
                  resumoImportacao.duplicados > 0) && (
                  <p className="text-[10px] text-slate-400 text-right">
                    {resumoImportacao.atencao +
                      resumoImportacao.erros +
                      resumoImportacao.duplicados}{' '}
                    registro(s) serão ignorados nesta importação.
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

      {contaBaixa && (
        <Modal title="Registrar recebimento" onClose={() => setContaBaixa(null)}>
          <form onSubmit={confirmarBaixa} className="space-y-4">
            <div className="p-4 rounded-[14px] bg-slate-50">
              <p className="text-xs font-bold text-slate-800">{contaBaixa.clienteNome}</p>
              <p className="text-[10px] text-slate-400 mt-1">
                {contaBaixa.numeroDocumento} · Saldo {formatarReal(contaBaixa.saldo)}
              </p>
            </div>
            <Campo label="Valor recebido *" type="number" value={baixa.valor} onChange={valor => setBaixa(v => ({ ...v, valor }))} />
            <Campo label="Data do recebimento *" type="date" value={baixa.data} onChange={valor => setBaixa(v => ({ ...v, data: valor }))} />
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