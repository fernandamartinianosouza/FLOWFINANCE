import React, { useEffect, useMemo, useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { formatarReal } from '../utils';
import {
  OrcamentoMensal,
  orcamentoService,
} from '../services/orcamentoService';
import {
  Plus,
  X,
  CheckCircle,
  Pencil,
  Trash2,
  Wallet,
  Layers,
  CalendarDays,
  RefreshCw,
  Copy,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Clock3,
  CircleDollarSign,
} from 'lucide-react';

const nomesMeses = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

const numeroSeguro = (valor: unknown) => {
  const numero = Number(valor ?? 0);
  return Number.isFinite(numero) ? numero : 0;
};

const competenciaAtual = () => {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = String(hoje.getMonth() + 1).padStart(2, '0');

  return `${ano}-${mes}`;
};

const competenciaParaAnoMes = (competencia: string) => {
  const [anoTexto, mesTexto] = competencia.split('-');
  const ano = Number(anoTexto);
  const mes = Number(mesTexto);

  return {
    ano: Number.isFinite(ano) ? ano : new Date().getFullYear(),
    mes:
      Number.isFinite(mes) && mes >= 1 && mes <= 12
        ? mes
        : new Date().getMonth() + 1,
  };
};

const obterEmpresaId = (valor: unknown) =>
  String(valor ?? '').trim();

const obterPlanoId = (plano: any) =>
  String(plano?.id ?? plano?.dbId ?? '');

const obterCentroId = (centro: any) =>
  String(centro?.id ?? centro?.dbId ?? '');

export const FinancialCenterView: React.FC = () => {
  const {
    empresaAtivaId,
    empresas,
    planosFinanceiros,
    centrosCustos,
    cadastrarPlanoFinanceiro,
    editarPlanoFinanceiro,
    excluirPlanoFinanceiro,
    cadastrarCentroCusto,
    editarCentroCusto,
    excluirCentroCusto,
  } = useFinance() as any;

  const [competencia, setCompetencia] = useState(
    competenciaAtual()
  );
  const [orcamentos, setOrcamentos] = useState<
    OrcamentoMensal[]
  >([]);
  const [carregandoOrcamentos, setCarregandoOrcamentos] =
    useState(false);
  const [erroOrcamentos, setErroOrcamentos] = useState('');

  const [planosExpandidos, setPlanosExpandidos] = useState<
    Record<string, boolean>
  >({});

  const [modalPlanoOpen, setModalPlanoOpen] =
    useState(false);
  const [modalCentroOpen, setModalCentroOpen] =
    useState(false);
  const [modalOrcamentoOpen, setModalOrcamentoOpen] =
    useState(false);
  const [modalCopiarOpen, setModalCopiarOpen] =
    useState(false);

  const [planoEditandoId, setPlanoEditandoId] = useState<
    string | null
  >(null);
  const [centroEditandoId, setCentroEditandoId] =
    useState<string | null>(null);
  const [orcamentoEditandoId, setOrcamentoEditandoId] =
    useState<string | null>(null);
  const [orcamentoCopiando, setOrcamentoCopiando] =
    useState<OrcamentoMensal | null>(null);

  const [salvando, setSalvando] = useState(false);
  const [sucesso, setSucesso] = useState(false);

  const [planoNome, setPlanoNome] = useState('');
  const [planoDescricao, setPlanoDescricao] =
    useState('');

  const [centroNome, setCentroNome] = useState('');
  const [centroDescricao, setCentroDescricao] =
    useState('');
  const [centroPlanoId, setCentroPlanoId] =
    useState('');

  const [orcamentoPlanoId, setOrcamentoPlanoId] =
    useState('');
  const [orcamentoCentroId, setOrcamentoCentroId] =
    useState('');
  const [orcamentoValor, setOrcamentoValor] =
    useState('');
  const [orcamentoObservacao, setOrcamentoObservacao] =
    useState('');

  const [competenciaDestino, setCompetenciaDestino] =
    useState('');

  const empresaSelecionadaId = useMemo(() => {
    const idAtivo = obterEmpresaId(empresaAtivaId);

    if (idAtivo) return idAtivo;

    const primeiraEmpresa = empresas?.[0];

    return obterEmpresaId(
      primeiraEmpresa?.id ?? primeiraEmpresa?.dbId
    );
  }, [empresaAtivaId, empresas]);

  const { ano, mes } = useMemo(
    () => competenciaParaAnoMes(competencia),
    [competencia]
  );

  const labelCompetencia = `${nomesMeses[mes - 1]}/${ano}`;

  const carregarOrcamentos = async () => {
    if (!empresaSelecionadaId) {
      setOrcamentos([]);
      setErroOrcamentos(
        'Selecione uma empresa antes de consultar os orçamentos.'
      );
      return;
    }

    try {
      setCarregandoOrcamentos(true);
      setErroOrcamentos('');

      const lista =
        await orcamentoService.listarPorCompetencia({
          empresaId: empresaSelecionadaId,
          ano,
          mes,
        });

      setOrcamentos(lista);
    } catch (error: any) {
      console.error(
        'Erro ao carregar orçamentos mensais:',
        error
      );
      setErroOrcamentos(
        error?.message ||
          'Não foi possível carregar os orçamentos mensais.'
      );
    } finally {
      setCarregandoOrcamentos(false);
    }
  };

  useEffect(() => {
    carregarOrcamentos();
  }, [empresaSelecionadaId, ano, mes]);

  const resumo = useMemo(
    () =>
      orcamentos.reduce(
        (acumulado, item) => {
          acumulado.valorOrcado += numeroSeguro(
            item.valorOrcado
          );
          acumulado.valorComprometido += numeroSeguro(
            item.valorComprometido
          );
          acumulado.valorUtilizado += numeroSeguro(
            item.valorUtilizado
          );
          acumulado.disponivel += numeroSeguro(
            item.disponivel
          );

          return acumulado;
        },
        {
          valorOrcado: 0,
          valorComprometido: 0,
          valorUtilizado: 0,
          disponivel: 0,
        }
      ),
    [orcamentos]
  );

  const orcamentoPorCentro = useMemo(() => {
    const mapa = new Map<string, OrcamentoMensal>();

    for (const item of orcamentos) {
      if (item.centroCustoId) {
        mapa.set(item.centroCustoId, item);
      }
    }

    return mapa;
  }, [orcamentos]);

  const orcamentoPorPlano = useMemo(() => {
    const mapa = new Map<string, OrcamentoMensal>();

    for (const item of orcamentos) {
      if (!item.centroCustoId) {
        mapa.set(item.planoFinanceiroId, item);
      }
    }

    return mapa;
  }, [orcamentos]);

  const centrosDoPlanoSelecionado = useMemo(
    () =>
      centrosCustos.filter(
        (centro: any) =>
          String(centro.planoFinanceiroId) ===
          orcamentoPlanoId
      ),
    [centrosCustos, orcamentoPlanoId]
  );

  const togglePlano = (id: string) => {
    setPlanosExpandidos(prev => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const mostrarSucessoTemporario = () => {
    setSucesso(true);

    window.setTimeout(() => {
      setSucesso(false);
    }, 1000);
  };

  const limparPlano = () => {
    setPlanoEditandoId(null);
    setPlanoNome('');
    setPlanoDescricao('');
  };

  const limparCentro = () => {
    setCentroEditandoId(null);
    setCentroNome('');
    setCentroDescricao('');
    setCentroPlanoId('');
  };

  const limparOrcamento = () => {
    setOrcamentoEditandoId(null);
    setOrcamentoPlanoId('');
    setOrcamentoCentroId('');
    setOrcamentoValor('');
    setOrcamentoObservacao('');
  };

  const abrirNovoPlano = () => {
    limparPlano();
    setModalPlanoOpen(true);
  };

  const abrirNovoCentro = () => {
    limparCentro();
    setCentroPlanoId(
      planosFinanceiros[0]
        ? obterPlanoId(planosFinanceiros[0])
        : ''
    );
    setModalCentroOpen(true);
  };

  const abrirNovoOrcamento = (
    planoId?: string,
    centroId?: string
  ) => {
    limparOrcamento();

    const planoInicial =
      planoId ||
      (planosFinanceiros[0]
        ? obterPlanoId(planosFinanceiros[0])
        : '');

    setOrcamentoPlanoId(planoInicial);
    setOrcamentoCentroId(centroId || '');
    setModalOrcamentoOpen(true);
  };

  const abrirEdicaoPlano = (plano: any) => {
    setPlanoEditandoId(obterPlanoId(plano));
    setPlanoNome(plano.nome || '');
    setPlanoDescricao(plano.descricao || '');
    setModalPlanoOpen(true);
  };

  const abrirEdicaoCentro = (centro: any) => {
    setCentroEditandoId(obterCentroId(centro));
    setCentroNome(centro.nome || '');
    setCentroDescricao(centro.descricao || '');
    setCentroPlanoId(
      String(centro.planoFinanceiroId || '')
    );
    setModalCentroOpen(true);
  };

  const abrirEdicaoOrcamento = (
    orcamento: OrcamentoMensal
  ) => {
    setOrcamentoEditandoId(orcamento.id);
    setOrcamentoPlanoId(
      orcamento.planoFinanceiroId
    );
    setOrcamentoCentroId(
      orcamento.centroCustoId || ''
    );
    setOrcamentoValor(String(orcamento.valorOrcado));
    setOrcamentoObservacao(
      orcamento.observacao || ''
    );
    setModalOrcamentoOpen(true);
  };

  const abrirCopiarOrcamento = (
    orcamento: OrcamentoMensal
  ) => {
    const proximo = new Date(
      orcamento.ano,
      orcamento.mes,
      1
    );
    const destino = `${proximo.getFullYear()}-${String(
      proximo.getMonth() + 1
    ).padStart(2, '0')}`;

    setOrcamentoCopiando(orcamento);
    setCompetenciaDestino(destino);
    setModalCopiarOpen(true);
  };

  const fecharPlano = () => {
    if (salvando) return;
    limparPlano();
    setModalPlanoOpen(false);
  };

  const fecharCentro = () => {
    if (salvando) return;
    limparCentro();
    setModalCentroOpen(false);
  };

  const fecharOrcamento = () => {
    if (salvando) return;
    limparOrcamento();
    setModalOrcamentoOpen(false);
  };

  const fecharCopiar = () => {
    if (salvando) return;
    setOrcamentoCopiando(null);
    setCompetenciaDestino('');
    setModalCopiarOpen(false);
  };

  const handleSalvarPlano = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    if (!planoNome.trim()) {
      alert('Informe o nome do plano de conta.');
      return;
    }

    try {
      setSalvando(true);

      const dadosPlano = {
        nome: planoNome.trim(),
        descricao: planoDescricao.trim(),
        orcamentoAnual: 0,
        limiteAnual: 0,
        tetoAnual: 0,
        tetoMensal: 0,
        utilizado: 0,
        comprometido: 0,
      };

      if (planoEditandoId) {
        await editarPlanoFinanceiro(
          planoEditandoId,
          dadosPlano
        );
      } else {
        await cadastrarPlanoFinanceiro(dadosPlano);
      }

      mostrarSucessoTemporario();
      fecharPlano();
    } catch (error: any) {
      console.error('Erro ao salvar plano:', error);
      alert(
        error?.message ||
          'Não foi possível salvar o plano de conta.'
      );
    } finally {
      setSalvando(false);
    }
  };

  const handleSalvarCentro = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    if (!centroNome.trim() || !centroPlanoId) {
      alert(
        'Informe o nome e o plano vinculado ao centro.'
      );
      return;
    }

    try {
      setSalvando(true);

      const dadosCentro = {
        nome: centroNome.trim(),
        descricao: centroDescricao.trim(),
        planoFinanceiroId: centroPlanoId,
        orcamentoMensal: 0,
        limiteMensal: 0,
        tetoMensal: 0,
        tetoAnual: 0,
        utilizado: 0,
        comprometido: 0,
      };

      if (centroEditandoId) {
        await editarCentroCusto(
          centroEditandoId,
          dadosCentro
        );
      } else {
        await cadastrarCentroCusto(dadosCentro);
      }

      mostrarSucessoTemporario();
      fecharCentro();
    } catch (error: any) {
      console.error(
        'Erro ao salvar centro de custo:',
        error
      );
      alert(
        error?.message ||
          'Não foi possível salvar o centro de custo.'
      );
    } finally {
      setSalvando(false);
    }
  };

  const handleSalvarOrcamento = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    if (!empresaSelecionadaId) {
      alert('Selecione uma empresa.');
      return;
    }

    if (!orcamentoPlanoId) {
      alert('Selecione o plano de conta.');
      return;
    }

    const valor = numeroSeguro(orcamentoValor);

    if (valor < 0) {
      alert(
        'O orçamento mensal não pode ser negativo.'
      );
      return;
    }

    try {
      setSalvando(true);

      if (orcamentoEditandoId) {
        await orcamentoService.editar(
          orcamentoEditandoId,
          {
            valorOrcado: valor,
            observacao:
              orcamentoObservacao.trim() || null,
          }
        );
      } else {
        await orcamentoService.salvar({
          empresaId: empresaSelecionadaId,
          planoFinanceiroId: orcamentoPlanoId,
          centroCustoId:
            orcamentoCentroId || null,
          ano,
          mes,
          valorOrcado: valor,
          observacao:
            orcamentoObservacao.trim() || null,
        });
      }

      await carregarOrcamentos();
      mostrarSucessoTemporario();
      fecharOrcamento();
    } catch (error: any) {
      console.error(
        'Erro ao salvar orçamento mensal:',
        error
      );
      alert(
        error?.message ||
          'Não foi possível salvar o orçamento mensal.'
      );
    } finally {
      setSalvando(false);
    }
  };

  const handleCopiarOrcamento = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    if (!orcamentoCopiando || !competenciaDestino) {
      alert('Informe a competência de destino.');
      return;
    }

    const destino =
      competenciaParaAnoMes(competenciaDestino);

    try {
      setSalvando(true);

      await orcamentoService.copiar({
        orcamentoId: orcamentoCopiando.id,
        anoDestino: destino.ano,
        mesDestino: destino.mes,
      });

      fecharCopiar();

      if (competenciaDestino === competencia) {
        await carregarOrcamentos();
      }

      alert(
        `Orçamento copiado para ${
          nomesMeses[destino.mes - 1]
        }/${destino.ano}.`
      );
    } catch (error: any) {
      console.error('Erro ao copiar orçamento:', error);
      alert(
        error?.message ||
          'Não foi possível copiar o orçamento.'
      );
    } finally {
      setSalvando(false);
    }
  };

  const handleExcluirPlano = async (id: string) => {
    if (
      !window.confirm(
        'Deseja realmente excluir este plano de conta? Os centros e orçamentos vinculados também poderão ser excluídos.'
      )
    ) {
      return;
    }

    try {
      await excluirPlanoFinanceiro(id);
      await carregarOrcamentos();
    } catch (error: any) {
      alert(
        error?.message ||
          'Não foi possível excluir o plano.'
      );
    }
  };

  const handleExcluirCentro = async (id: string) => {
    if (
      !window.confirm(
        'Deseja realmente excluir este centro de custo? O orçamento mensal vinculado também poderá ser excluído.'
      )
    ) {
      return;
    }

    try {
      await excluirCentroCusto(id);
      await carregarOrcamentos();
    } catch (error: any) {
      alert(
        error?.message ||
          'Não foi possível excluir o centro de custo.'
      );
    }
  };

  const handleExcluirOrcamento = async (
    orcamento: OrcamentoMensal
  ) => {
    if (
      !window.confirm(
        `Deseja excluir o orçamento de ${formatarReal(
          orcamento.valorOrcado
        )} da competência ${labelCompetencia}?`
      )
    ) {
      return;
    }

    try {
      await orcamentoService.excluir(orcamento.id);
      await carregarOrcamentos();
    } catch (error: any) {
      alert(
        error?.message ||
          'Não foi possível excluir o orçamento.'
      );
    }
  };

    return (
  <div className="space-y-8">
  <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
  <div className="min-w-0">
    <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">
      Plano de Contas & Orçamentos
    </h1>

    <p className="mt-1 max-w-xl text-xs text-slate-400">
      Gerencie os planos, centros de custo e orçamentos por
      competência mensal.
    </p>
  </div>

  <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center xl:justify-end">
    <div className="flex h-[42px] items-center gap-2 rounded-[12px] border border-slate-100 bg-white px-3 shadow-sm">
  <CalendarDays className="h-4 w-4 shrink-0 text-slate-400" />

  <select
    value={mes}
    onChange={e => {
      const novoMes = String(e.target.value).padStart(2, '0');
      setCompetencia(`${ano}-${novoMes}`);
    }}
    className="border-0 bg-transparent p-0 pr-6 text-xs font-semibold text-slate-700 focus:ring-0"
  >
    {nomesMeses.map((nome, index) => (
      <option key={nome} value={index + 1}>
        {nome}
      </option>
    ))}
  </select>

  <div className="h-4 w-px bg-slate-200" />

  <select
    value={ano}
    onChange={e => {
      const novoAno = Number(e.target.value);
      setCompetencia(
        `${novoAno}-${String(mes).padStart(2, '0')}`
      );
    }}
    className="border-0 bg-transparent p-0 pr-6 text-xs font-semibold text-slate-700 focus:ring-0"
  >
    {Array.from({ length: 7 }, (_, index) => {
      const anoOpcao = new Date().getFullYear() - 2 + index;

      return (
        <option key={anoOpcao} value={anoOpcao}>
          {anoOpcao}
        </option>
      );
    })}
  </select>
</div>

    <button
      type="button"
      onClick={carregarOrcamentos}
      disabled={carregandoOrcamentos}
      className="inline-flex h-[42px] items-center justify-center gap-2 rounded-[12px] border border-slate-100 bg-white px-4 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <RefreshCw
        className={`h-4 w-4 ${
          carregandoOrcamentos ? 'animate-spin' : ''
        }`}
      />
      Atualizar
    </button>

    <button
      type="button"
      onClick={abrirNovoCentro}
      disabled={planosFinanceiros.length === 0}
      className="inline-flex h-[42px] items-center justify-center gap-2 rounded-[12px] border border-slate-100 bg-white px-4 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <Plus className="h-4 w-4" />
      Novo Centro
    </button>

    <button
      type="button"
      onClick={() => abrirNovoOrcamento()}
      disabled={planosFinanceiros.length === 0}
      className="inline-flex h-[42px] items-center justify-center gap-2 rounded-[12px] bg-emerald-600 px-4 text-xs font-semibold text-white shadow-md transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <DollarSign className="h-4 w-4" />
      Novo Orçamento
    </button>

    <button
      type="button"
      onClick={abrirNovoPlano}
      className="inline-flex h-[42px] items-center justify-center gap-2 rounded-[12px] bg-[#0F172A] px-4 text-xs font-semibold text-[#D4AF37] shadow-md transition hover:bg-[#1E293B]"
    >
      <Plus className="h-4 w-4" />
      Novo Plano
    </button>
  </div>
</div>

      <div className="rounded-[18px] border border-slate-100 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
              Competência selecionada
            </p>

            <h2 className="mt-1 text-base font-bold text-[#0F172A]">
              {labelCompetencia}
            </h2>
          </div>

          <p className="text-xs text-slate-400">
            Os valores abaixo pertencem somente a esta
            competência.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Indicador
          titulo="Orçamento do mês"
          valor={formatarReal(resumo.valorOrcado)}
          icon={Wallet}
        />

        <Indicador
          titulo="Comprometido"
          valor={formatarReal(
            resumo.valorComprometido
          )}
          icon={Clock3}
        />

        <Indicador
          titulo="Utilizado"
          valor={formatarReal(resumo.valorUtilizado)}
          icon={CircleDollarSign}
        />

        <Indicador
          titulo="Disponível"
          valor={formatarReal(resumo.disponivel)}
          icon={DollarSign}
          destaque={resumo.disponivel >= 0}
          alerta={resumo.disponivel < 0}
        />
      </div>

      {sucesso && (
        <div className="flex items-center gap-2 rounded-[14px] border border-emerald-100 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-700">
          <CheckCircle className="h-4 w-4" />
          Informações salvas com sucesso.
        </div>
      )}

      {erroOrcamentos && (
        <div className="flex items-start gap-2 rounded-[14px] border border-amber-200 bg-amber-50 px-4 py-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />

          <div>
            <p className="text-xs font-semibold text-amber-700">
              Não foi possível carregar os orçamentos.
            </p>

            <p className="mt-1 text-[10px] text-amber-600">
              {erroOrcamentos}
            </p>
          </div>
        </div>
      )}

      <div className="max-w-[1180px] space-y-5">
        {planosFinanceiros.length === 0 ? (
          <div className="rounded-[18px] border border-slate-100 bg-white p-10 text-center shadow-sm">
            <Wallet className="mx-auto h-9 w-9 text-slate-300" />

            <h3 className="mt-3 text-sm font-bold text-slate-800">
              Nenhum plano de conta cadastrado
            </h3>

            <p className="mt-1 text-xs text-slate-400">
              Cadastre o primeiro plano para organizar os
              centros de custo e orçamentos mensais.
            </p>
          </div>
        ) : (
          planosFinanceiros.map((plano: any) => {
            const planoId = obterPlanoId(plano);
            const centros = centrosCustos.filter(
              (centro: any) =>
                String(centro.planoFinanceiroId) ===
                planoId
            );
            const expandido =
              planosExpandidos[planoId] ?? true;
            const orcamentoPlano =
              orcamentoPorPlano.get(planoId);

            const totaisCentros = centros.reduce(
              (total, centro: any) => {
                const item = orcamentoPorCentro.get(
                  obterCentroId(centro)
                );

                if (!item) return total;

                total.orcado += item.valorOrcado;
                total.comprometido +=
                  item.valorComprometido;
                total.utilizado += item.valorUtilizado;
                total.disponivel += item.disponivel;

                return total;
              },
              {
                orcado: 0,
                comprometido: 0,
                utilizado: 0,
                disponivel: 0,
              }
            );

            const valoresPlano = orcamentoPlano
              ? {
                  orcado: orcamentoPlano.valorOrcado,
                  comprometido:
                    orcamentoPlano.valorComprometido,
                  utilizado:
                    orcamentoPlano.valorUtilizado,
                  disponivel: orcamentoPlano.disponivel,
                }
              : totaisCentros;

            return (
              <div
                key={planoId}
                className="overflow-hidden rounded-[18px] border border-slate-100 bg-white shadow-sm"
              >
                <div className="p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <button
                      type="button"
                      onClick={() =>
                        togglePlano(planoId)
                      }
                      className="flex flex-1 items-start gap-3 text-left"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100">
                        <Wallet className="h-5 w-5 text-[#0F172A]" />
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-[#0F172A]">
                            {plano.nome}
                          </h3>

                          {expandido ? (
                            <ChevronUp className="h-4 w-4 text-slate-400" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-slate-400" />
                          )}
                        </div>

                        <p className="mt-1 text-[10px] text-slate-400">
                          {plano.descricao ||
                            'Plano financeiro sem descrição.'}
                        </p>

                        <p className="mt-2 text-[10px] font-semibold text-slate-500">
                          {centros.length} centro(s) de
                          custo • {labelCompetencia}
                        </p>
                      </div>
                    </button>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          abrirNovoOrcamento(planoId)
                        }
                        className="flex h-9 items-center gap-1.5 rounded-xl bg-emerald-50 px-3 text-[10px] font-bold text-emerald-700 hover:bg-emerald-100"
                      >
                        <DollarSign className="h-3.5 w-3.5" />
                        Orçamento do plano
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          abrirEdicaoPlano(plano)
                        }
                        className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-100 bg-white hover:bg-slate-50"
                        title="Editar plano"
                      >
                        <Pencil className="h-3.5 w-3.5 text-slate-600" />
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          handleExcluirPlano(planoId)
                        }
                        className="flex h-9 w-9 items-center justify-center rounded-xl border border-red-100 bg-red-50 hover:bg-red-100"
                        title="Excluir plano"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-red-500" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
                    <Metrica
                      titulo="Orçado"
                      valor={formatarReal(
                        valoresPlano.orcado
                      )}
                    />

                    <Metrica
                      titulo="Comprometido"
                      valor={formatarReal(
                        valoresPlano.comprometido
                      )}
                    />

                    <Metrica
                      titulo="Utilizado"
                      valor={formatarReal(
                        valoresPlano.utilizado
                      )}
                    />

                    <Metrica
                      titulo="Disponível"
                      valor={formatarReal(
                        valoresPlano.disponivel
                      )}
                      destaque={
                        valoresPlano.disponivel >= 0
                      }
                      alerta={
                        valoresPlano.disponivel < 0
                      }
                    />
                  </div>
                </div>

                {expandido && (
                  <div className="border-t border-slate-100 bg-slate-50/50 p-4">
                    {centros.length === 0 ? (
                      <div className="rounded-[14px] border border-dashed border-slate-200 bg-white p-6 text-center">
                        <p className="text-xs font-semibold text-slate-600">
                          Nenhum centro de custo neste
                          plano.
                        </p>

                        <button
                          type="button"
                          onClick={() => {
                            limparCentro();
                            setCentroPlanoId(planoId);
                            setModalCentroOpen(true);
                          }}
                          className="mt-3 text-[10px] font-bold text-[#0F172A]"
                        >
                          + Adicionar centro de custo
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                        {centros.map((centro: any) => {
                          const centroId =
                            obterCentroId(centro);
                          const orcamento =
                            orcamentoPorCentro.get(
                              centroId
                            );

                          return (
                            <div
                              key={centroId}
                              className="rounded-[16px] border border-slate-100 bg-white p-4 shadow-sm"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <h4 className="text-xs font-bold text-slate-800">
                                    {centro.nome}
                                  </h4>

                                  <p className="mt-1 text-[10px] text-slate-400">
                                    {centro.descricao ||
                                      'Centro de custo vinculado ao plano.'}
                                  </p>
                                </div>

                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      orcamento
                                        ? abrirEdicaoOrcamento(
                                            orcamento
                                          )
                                        : abrirNovoOrcamento(
                                            planoId,
                                            centroId
                                          )
                                    }
                                    className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 hover:bg-emerald-100"
                                    title={
                                      orcamento
                                        ? 'Editar orçamento'
                                        : 'Cadastrar orçamento'
                                    }
                                  >
                                    <DollarSign className="h-3.5 w-3.5 text-emerald-600" />
                                  </button>

                                  {orcamento && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        abrirCopiarOrcamento(
                                          orcamento
                                        )
                                      }
                                      className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 hover:bg-blue-100"
                                      title="Copiar orçamento"
                                    >
                                      <Copy className="h-3.5 w-3.5 text-blue-600" />
                                    </button>
                                  )}

                                  <button
                                    type="button"
                                    onClick={() =>
                                      abrirEdicaoCentro(
                                        centro
                                      )
                                    }
                                    className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-50 hover:bg-slate-100"
                                    title="Editar centro"
                                  >
                                    <Pencil className="h-3.5 w-3.5 text-slate-600" />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleExcluirCentro(
                                        centroId
                                      )
                                    }
                                    className="flex h-8 w-8 items-center justify-center rounded-xl bg-red-50 hover:bg-red-100"
                                    title="Excluir centro"
                                  >
                                    <Trash2 className="h-3.5 w-3.5 text-red-500" />
                                  </button>
                                </div>
                              </div>

                              {orcamento ? (
                                <>
                                  <div className="mt-4 grid grid-cols-2 gap-2">
                                    <Metrica
                                      titulo="Orçado"
                                      valor={formatarReal(
                                        orcamento.valorOrcado
                                      )}
                                    />

                                    <Metrica
                                      titulo="Disponível"
                                      valor={formatarReal(
                                        orcamento.disponivel
                                      )}
                                      destaque={
                                        orcamento.disponivel >=
                                        0
                                      }
                                      alerta={
                                        orcamento.disponivel <
                                        0
                                      }
                                    />

                                    <Metrica
                                      titulo="Comprometido"
                                      valor={formatarReal(
                                        orcamento.valorComprometido
                                      )}
                                    />

                                    <Metrica
                                      titulo="Utilizado"
                                      valor={formatarReal(
                                        orcamento.valorUtilizado
                                      )}
                                    />
                                  </div>

                                  <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                                    <p className="text-[9px] text-slate-400">
                                      {orcamento.observacao ||
                                        'Sem observação.'}
                                    </p>

                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleExcluirOrcamento(
                                          orcamento
                                        )
                                      }
                                      className="text-[9px] font-bold text-red-500 hover:text-red-600"
                                    >
                                      Excluir orçamento
                                    </button>
                                  </div>
                                </>
                              ) : (
                                <div className="mt-4 rounded-[12px] border border-dashed border-amber-200 bg-amber-50 p-3">
                                  <p className="text-[10px] font-semibold text-amber-700">
                                    Sem orçamento em{' '}
                                    {labelCompetencia}
                                  </p>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      abrirNovoOrcamento(
                                        planoId,
                                        centroId
                                      )
                                    }
                                    className="mt-2 text-[9px] font-bold text-amber-700"
                                  >
                                    Cadastrar agora
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {modalPlanoOpen && (
        <ModalLateral
          titulo={
            planoEditandoId
              ? 'Editar Plano de Conta'
              : 'Novo Plano de Conta'
          }
          descricao="O plano organiza a estrutura financeira. Os valores são cadastrados separadamente por mês."
          icon={Wallet}
          onClose={fecharPlano}
        >
          <form
            onSubmit={handleSalvarPlano}
            className="space-y-5"
          >
            <CampoInput
              label="Nome do plano"
              value={planoNome}
              onChange={setPlanoNome}
              placeholder="Ex.: Salários"
              required
            />

            <CampoTextarea
              label="Descrição"
              value={planoDescricao}
              onChange={setPlanoDescricao}
              placeholder="Descrição opcional do plano"
            />

            <BotaoSalvar
              salvando={salvando}
              texto={
                planoEditandoId
                  ? 'Salvar alterações'
                  : 'Criar plano de conta'
              }
            />
          </form>
        </ModalLateral>
      )}

      {modalCentroOpen && (
        <ModalLateral
          titulo={
            centroEditandoId
              ? 'Editar Centro de Custo'
              : 'Novo Centro de Custo'
          }
          descricao="O centro de custo será vinculado a um plano. O orçamento será informado por competência."
          icon={Layers}
          onClose={fecharCentro}
        >
          <form
            onSubmit={handleSalvarCentro}
            className="space-y-5"
          >
            <CampoSelect
              label="Plano vinculado"
              value={centroPlanoId}
              onChange={setCentroPlanoId}
              placeholder="Selecione um plano"
              options={planosFinanceiros.map(
                (plano: any) => ({
                  value: obterPlanoId(plano),
                  label: plano.nome,
                })
              )}
              required
            />

            <CampoInput
              label="Nome do centro de custo"
              value={centroNome}
              onChange={setCentroNome}
              placeholder="Ex.: Funcionários"
              required
            />

            <CampoTextarea
              label="Descrição"
              value={centroDescricao}
              onChange={setCentroDescricao}
              placeholder="Descrição opcional do centro"
            />

            <BotaoSalvar
              salvando={salvando}
              texto={
                centroEditandoId
                  ? 'Salvar alterações'
                  : 'Criar centro de custo'
              }
            />
          </form>
        </ModalLateral>
      )}

      {modalOrcamentoOpen && (
        <ModalLateral
          titulo={
            orcamentoEditandoId
              ? 'Editar Orçamento Mensal'
              : 'Novo Orçamento Mensal'
          }
          descricao={`Competência: ${labelCompetencia}`}
          icon={DollarSign}
          onClose={fecharOrcamento}
        >
          <form
            onSubmit={handleSalvarOrcamento}
            className="space-y-5"
          >
            <CampoSelect
              label="Plano de conta"
              value={orcamentoPlanoId}
              onChange={valor => {
                setOrcamentoPlanoId(valor);
                setOrcamentoCentroId('');
              }}
              placeholder="Selecione o plano"
              options={planosFinanceiros.map(
                (plano: any) => ({
                  value: obterPlanoId(plano),
                  label: plano.nome,
                })
              )}
              required
              disabled={Boolean(orcamentoEditandoId)}
            />

            <CampoSelect
              label="Centro de custo"
              value={orcamentoCentroId}
              onChange={setOrcamentoCentroId}
              placeholder="Orçamento geral do plano"
              options={centrosDoPlanoSelecionado.map(
                (centro: any) => ({
                  value: obterCentroId(centro),
                  label: centro.nome,
                })
              )}
              disabled={Boolean(orcamentoEditandoId)}
            />

            <div className="rounded-[12px] border border-blue-100 bg-blue-50 p-3 text-[10px] text-blue-700">
              Deixe o centro vazio para cadastrar um
              orçamento geral do plano. Selecione um centro
              para controlar o valor separadamente.
            </div>

            <CampoInput
              label="Valor orçado no mês"
              type="number"
              step="0.01"
              min="0"
              value={orcamentoValor}
              onChange={setOrcamentoValor}
              placeholder="0,00"
              required
            />

            <CampoTextarea
              label="Observação"
              value={orcamentoObservacao}
              onChange={setOrcamentoObservacao}
              placeholder="Informação opcional sobre o orçamento"
            />

            <BotaoSalvar
              salvando={salvando}
              texto={
                orcamentoEditandoId
                  ? 'Salvar orçamento'
                  : 'Cadastrar orçamento'
              }
            />
          </form>
        </ModalLateral>
      )}

      {modalCopiarOpen && orcamentoCopiando && (
        <ModalLateral
          titulo="Copiar Orçamento"
          descricao={`Origem: ${
            nomesMeses[orcamentoCopiando.mes - 1]
          }/${orcamentoCopiando.ano}`}
          icon={Copy}
          onClose={fecharCopiar}
        >
          <form
            onSubmit={handleCopiarOrcamento}
            className="space-y-5"
          >
            <div className="rounded-[14px] border border-slate-100 bg-slate-50 p-4">
              <p className="text-[10px] font-bold uppercase text-slate-400">
                Valor que será copiado
              </p>

              <p className="mt-1 text-lg font-bold text-[#0F172A]">
                {formatarReal(
                  orcamentoCopiando.valorOrcado
                )}
              </p>

              <p className="mt-2 text-[10px] text-slate-400">
                Os valores comprometido e utilizado do novo
                mês começarão em zero.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-400">
                Competência de destino
              </label>

              <input
                type="month"
                value={competenciaDestino}
                onChange={e =>
                  setCompetenciaDestino(e.target.value)
                }
                className="w-full rounded-[12px] border-0 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-700 focus:ring-1 focus:ring-[#0F172A]/25"
                required
              />
            </div>

            <BotaoSalvar
              salvando={salvando}
              texto="Copiar orçamento"
            />
          </form>
        </ModalLateral>
      )}
    </div>
  );
};

const Indicador = ({
  titulo,
  valor,
  icon: Icon,
  destaque,
  alerta,
}: any) => (
  <div className="rounded-[18px] border border-slate-100 bg-white p-5 shadow-sm">
    <div
      className={`flex h-10 w-10 items-center justify-center rounded-xl ${
        alerta
          ? 'bg-red-50'
          : destaque
            ? 'bg-emerald-50'
            : 'bg-slate-100'
      }`}
    >
      <Icon
        className={`h-5 w-5 ${
          alerta
            ? 'text-red-600'
            : destaque
              ? 'text-emerald-600'
              : 'text-[#0F172A]'
        }`}
      />
    </div>

    <span className="mt-4 block text-[10px] font-bold uppercase text-slate-400">
      {titulo}
    </span>

    <p
      className={`mt-1 font-mono text-lg font-bold ${
        alerta
          ? 'text-red-600'
          : destaque
            ? 'text-emerald-600'
            : 'text-[#0F172A]'
      }`}
    >
      {valor}
    </p>
  </div>
);

const Metrica = ({
  titulo,
  valor,
  destaque,
  alerta,
}: {
  titulo: string;
  valor: string;
  destaque?: boolean;
  alerta?: boolean;
}) => (
  <div className="rounded-[12px] bg-slate-50 p-3">
    <span className="text-[9px] font-bold uppercase text-slate-400">
      {titulo}
    </span>

    <p
      className={`mt-1 text-xs font-bold ${
        alerta
          ? 'text-red-600'
          : destaque
            ? 'text-emerald-600'
            : 'text-[#0F172A]'
      }`}
    >
      {valor}
    </p>
  </div>
);

const ModalLateral = ({
  titulo,
  descricao,
  icon: Icon,
  onClose,
  children,
}: any) => (
  <>
    <div
      className="fixed inset-0 z-50 bg-slate-900/30 backdrop-blur-xs"
      onClick={onClose}
    />

    <div className="fixed inset-y-0 right-0 z-50 flex h-screen w-full max-w-md flex-col border-l border-slate-100 bg-white shadow-2xl">
      <div className="flex items-start justify-between border-b border-slate-100 bg-slate-50 p-6">
        <div className="flex items-start gap-2">
          <Icon className="mt-0.5 h-4 w-4 text-[#0F172A]" />

          <div>
            <h2 className="text-sm font-bold text-[#0F172A]">
              {titulo}
            </h2>

            <p className="mt-1 text-[10px] text-slate-400">
              {descricao}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-100 bg-white text-slate-400 hover:bg-slate-50"
        >
          <X className="h-4 w-4" />
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
  min,
  placeholder,
  required,
}: any) => (
  <div className="space-y-1.5">
    <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-400">
      {label}
    </label>

    <input
      type={type}
      step={step}
      min={min}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      required={required}
      className="w-full rounded-[12px] border-0 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-700 focus:ring-1 focus:ring-[#0F172A]/25"
    />
  </div>
);

const CampoTextarea = ({
  label,
  value,
  onChange,
  placeholder,
}: any) => (
  <div className="space-y-1.5">
    <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-400">
      {label}
    </label>

    <textarea
      rows={4}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-[12px] border-0 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-700 focus:ring-1 focus:ring-[#0F172A]/25"
    />
  </div>
);

const CampoSelect = ({
  label,
  value,
  onChange,
  placeholder,
  options,
  required,
  disabled,
}: any) => (
  <div className="space-y-1.5">
    <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-400">
      {label}
    </label>

    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      required={required}
      disabled={disabled}
      className="w-full rounded-[12px] border-0 bg-slate-50 px-3.5 py-2.5 text-xs font-medium text-slate-700 focus:ring-1 focus:ring-[#0F172A]/25 disabled:cursor-not-allowed disabled:opacity-60"
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

const BotaoSalvar = ({
  salvando,
  texto,
}: {
  salvando: boolean;
  texto: string;
}) => (
  <button
    type="submit"
    disabled={salvando}
    className="mt-6 flex w-full items-center justify-center gap-2 rounded-[12px] bg-[#0F172A] py-3 text-xs font-bold text-white shadow-md transition-all hover:bg-[#1E293B] disabled:cursor-not-allowed disabled:opacity-60"
  >
    {salvando && (
      <RefreshCw className="h-4 w-4 animate-spin" />
    )}

    {salvando ? 'Salvando...' : texto}
  </button>
);

export default FinancialCenterView;