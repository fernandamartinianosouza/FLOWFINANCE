import React, {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Edit3,
  History,
  Loader2,
  Lock,
  Plus,
  RefreshCw,
  Save,
  Target,
  Trash2,
  TrendingDown,
  Wallet,
  X,
} from "lucide-react";
import { useFinance } from "../context/FinanceContext";
import {
  ItemPlanejamentoSemanal,
  OrcamentoSemanalCompra,
  planejamentoSemanalService,
  PrioridadeCompra,
} from "../services/planejamentoSemanalService";

const dinheiro = (
  valor: number
) =>
  Number(valor || 0).toLocaleString(
    "pt-BR",
    {
      style: "currency",
      currency: "BRL",
    }
  );

const isoLocal = (data: Date) => {
  const ano = data.getFullYear();
  const mes = String(
    data.getMonth() + 1
  ).padStart(2, "0");
  const dia = String(
    data.getDate()
  ).padStart(2, "0");

  return `${ano}-${mes}-${dia}`;
};

const inicioDaSemana = (data: Date) => {
  const copia = new Date(data);
  const dia = copia.getDay();
  const diferenca =
    dia === 0 ? -6 : 1 - dia;

  copia.setDate(
    copia.getDate() + diferenca
  );
  copia.setHours(12, 0, 0, 0);

  return copia;
};

const fimDaSemana = (inicio: Date) => {
  const fim = new Date(inicio);
  fim.setDate(fim.getDate() + 6);
  fim.setHours(12, 0, 0, 0);
  return fim;
};

const formatarData = (valor: string) =>
  new Date(
    `${valor}T12:00:00`
  ).toLocaleDateString("pt-BR");

const prioridadeLabel: Record<
  PrioridadeCompra,
  string
> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
  urgente: "Urgente",
};

const prioridadeClass: Record<
  PrioridadeCompra,
  string
> = {
  baixa:
    "bg-slate-100 text-slate-600",
  media:
    "bg-amber-50 text-amber-700",
  alta:
    "bg-orange-50 text-orange-700",
  urgente:
    "bg-red-50 text-red-700",
};

interface FormItem {
  processoId: string;
  descricao: string;
  fornecedorId: string;
  valor: string;
  prioridade: PrioridadeCompra;
  urgente: boolean;
  dataPlanejada: string;
  observacao: string;
}

const formItemInicial: FormItem = {
  processoId: "",
  descricao: "",
  fornecedorId: "",
  valor: "",
  prioridade: "media",
  urgente: false,
  dataPlanejada: "",
  observacao: "",
};

export const WeeklyPurchasingPlanView:
  React.FC = () => {
    const {
      organizacaoAtivaId,
      empresaAtivaId,
      empresas,
      fornecedores,
      processos,
      setActiveView,
    } = useFinance();

    const [
      referenciaSemana,
      setReferenciaSemana,
    ] = useState(new Date());

    const [
      orcamento,
      setOrcamento,
    ] =
      useState<OrcamentoSemanalCompra | null>(
        null
      );

    const [historico, setHistorico] =
      useState<
        OrcamentoSemanalCompra[]
      >([]);

    const [itens, setItens] =
      useState<ItemPlanejamentoSemanal[]>(
        []
      );

    const [carregando, setCarregando] =
      useState(true);

    const [salvando, setSalvando] =
      useState(false);

    const [erro, setErro] =
      useState<string | null>(null);

    const [modalTeto, setModalTeto] =
      useState(false);

    const [modalItem, setModalItem] =
      useState(false);

    const [tetoDigitado, setTetoDigitado] =
      useState("");

    const [
      observacaoTeto,
      setObservacaoTeto,
    ] = useState("");

    const [formItem, setFormItem] =
      useState<FormItem>(formItemInicial);

    const [
      itemEditando,
      setItemEditando,
    ] =
      useState<ItemPlanejamentoSemanal | null>(
        null
      );

    const inicio = useMemo(
      () =>
        inicioDaSemana(
          referenciaSemana
        ),
      [referenciaSemana]
    );

    const fim = useMemo(
      () => fimDaSemana(inicio),
      [inicio]
    );

    const dataInicio = isoLocal(inicio);
    const dataFim = isoLocal(fim);

    const empresaAtiva = empresas.find(
      empresa =>
        empresa.id === empresaAtivaId
    );

    const resumo = useMemo(
      () =>
        planejamentoSemanalService.calcularResumo(
          orcamento,
          itens
        ),
      [orcamento, itens]
    );

    const comprasElegiveis = useMemo(
      () =>
        processos.filter(processo => {
          const mesmoEmpresa =
            !empresaAtivaId ||
            processo.empresaId ===
              empresaAtivaId;

          const jaAdicionado =
            itens.some(
              item =>
                item.processoId ===
                ((processo as any).dbId ||
                  processo.id)
            );

          return (
            mesmoEmpresa &&
            !jaAdicionado &&
            processo.status !==
              "finalizado"
          );
        }),
      [
        processos,
        empresaAtivaId,
        itens,
      ]
    );

    const sugestoes = useMemo(() => {
      if (resumo.excesso <= 0) {
        return [];
      }

      let restante = resumo.excesso;

      return itens
        .filter(
          item =>
            item.status ===
              "planejado" &&
            !item.urgente
        )
        .sort((a, b) => {
          const peso = {
            baixa: 1,
            media: 2,
            alta: 3,
            urgente: 4,
          };

          return (
            peso[a.prioridade] -
              peso[b.prioridade] ||
            b.valor - a.valor
          );
        })
        .filter(item => {
          if (restante <= 0) {
            return false;
          }

          restante -= item.valor;
          return true;
        });
    }, [itens, resumo.excesso]);

    const carregar = async () => {
      if (!organizacaoAtivaId) {
        setCarregando(false);
        return;
      }

      try {
        setCarregando(true);
        setErro(null);

        const [
          semana,
          semanas,
        ] = await Promise.all([
          planejamentoSemanalService.buscarOrcamentoPorPeriodo(
            organizacaoAtivaId,
            dataInicio,
            empresaAtivaId || null
          ),
          planejamentoSemanalService.listarOrcamentos(
            organizacaoAtivaId,
            empresaAtivaId || null
          ),
        ]);

        setOrcamento(semana);
        setHistorico(semanas);

        if (semana) {
          const itensSemana =
            await planejamentoSemanalService.listarItens(
              semana.id,
              organizacaoAtivaId
            );

          setItens(itensSemana);
          setTetoDigitado(
            String(semana.teto)
          );
          setObservacaoTeto(
            semana.observacao || ""
          );
        } else {
          setItens([]);
          setTetoDigitado("");
          setObservacaoTeto("");
        }
      } catch (error: any) {
        console.error(error);
        setErro(
          error?.message ||
            "Não foi possível carregar o planejamento semanal."
        );
      } finally {
        setCarregando(false);
      }
    };

    useEffect(() => {
      carregar();
    }, [
      organizacaoAtivaId,
      empresaAtivaId,
      dataInicio,
    ]);

    const mudarSemana = (
      quantidade: number
    ) => {
      const proxima = new Date(
        referenciaSemana
      );

      proxima.setDate(
        proxima.getDate() +
          quantidade * 7
      );

      setReferenciaSemana(proxima);
    };

    const salvarTeto = async (
      event: FormEvent
    ) => {
      event.preventDefault();

      const teto = Number(
        tetoDigitado
          .replace(/\./g, "")
          .replace(",", ".")
      );

      if (
        !Number.isFinite(teto) ||
        teto <= 0
      ) {
        alert(
          "Informe um teto semanal válido."
        );
        return;
      }

      try {
        setSalvando(true);

        const salvo =
          await planejamentoSemanalService.salvarOrcamento(
            {
              id: orcamento?.id,
              organizacaoId:
                organizacaoAtivaId,
              empresaId:
                empresaAtivaId || null,
              dataInicio,
              dataFim,
              teto,
              observacao:
                observacaoTeto,
            }
          );

        setOrcamento(salvo);
        setModalTeto(false);
        await carregar();
      } catch (error: any) {
        alert(
          error?.message ||
            "Erro ao salvar o teto semanal."
        );
      } finally {
        setSalvando(false);
      }
    };

    const abrirNovoItem = () => {
      if (!orcamento) {
        alert(
          "Cadastre o teto da semana antes de adicionar compras."
        );
        setModalTeto(true);
        return;
      }

      setItemEditando(null);
      setFormItem({
        ...formItemInicial,
        dataPlanejada: dataInicio,
      });
      setModalItem(true);
    };

    const selecionarProcesso = (
      processoId: string
    ) => {
      const processo =
        comprasElegiveis.find(
          item =>
            String(
              (item as any).dbId ||
                item.id
            ) === processoId
        );

      if (!processo) {
        setFormItem(atual => ({
          ...atual,
          processoId: "",
        }));
        return;
      }

      setFormItem(atual => ({
        ...atual,
        processoId,
        descricao:
          processo.descricao || "",
        fornecedorId:
          processo.fornecedorId || "",
        valor: String(
          processo.valor || ""
        ),
        prioridade:
          processo.urgencia === "alta"
            ? "alta"
            : "media",
        urgente:
          processo.urgencia === "alta",
        dataPlanejada:
          processo.prazo ||
          dataInicio,
      }));
    };

    const salvarItem = async (
      event: FormEvent
    ) => {
      event.preventDefault();

      if (!orcamento) return;

      const valor = Number(
        formItem.valor
          .replace(/\./g, "")
          .replace(",", ".")
      );

      if (
        !formItem.descricao.trim() ||
        !Number.isFinite(valor) ||
        valor <= 0
      ) {
        alert(
          "Preencha a descrição e um valor válido."
        );
        return;
      }

      try {
        setSalvando(true);

        if (itemEditando) {
          await planejamentoSemanalService.atualizarItem(
            itemEditando.id,
            organizacaoAtivaId,
            {
              descricao:
                formItem.descricao,
              fornecedorId:
                formItem.fornecedorId ||
                null,
              valor,
              prioridade:
                formItem.prioridade,
              urgente:
                formItem.urgente,
              dataPlanejada:
                formItem.dataPlanejada ||
                null,
              observacao:
                formItem.observacao ||
                null,
            }
          );
        } else {
          await planejamentoSemanalService.adicionarItem(
            {
              organizacaoId:
                organizacaoAtivaId,
              orcamentoSemanalId:
                orcamento.id,
              processoId:
                formItem.processoId ||
                null,
              descricao:
                formItem.descricao,
              fornecedorId:
                formItem.fornecedorId ||
                null,
              valor,
              prioridade:
                formItem.prioridade,
              urgente:
                formItem.urgente,
              dataPlanejada:
                formItem.dataPlanejada ||
                null,
              observacao:
                formItem.observacao ||
                null,
            }
          );
        }

        setModalItem(false);
        setItemEditando(null);
        setFormItem(formItemInicial);
        await carregar();
      } catch (error: any) {
        alert(
          error?.message ||
            "Erro ao salvar a compra planejada."
        );
      } finally {
        setSalvando(false);
      }
    };

    const editarItem = (
      item: ItemPlanejamentoSemanal
    ) => {
      setItemEditando(item);
      setFormItem({
        processoId:
          item.processoId || "",
        descricao: item.descricao,
        fornecedorId:
          item.fornecedorId || "",
        valor: String(item.valor),
        prioridade: item.prioridade,
        urgente: item.urgente,
        dataPlanejada:
          item.dataPlanejada || "",
        observacao:
          item.observacao || "",
      });
      setModalItem(true);
    };

    const moverProximaSemana = async (
      item: ItemPlanejamentoSemanal
    ) => {
      const proximoInicio = new Date(
        inicio
      );
      proximoInicio.setDate(
        proximoInicio.getDate() + 7
      );

      const proximoFim =
        fimDaSemana(proximoInicio);

      try {
        setSalvando(true);

        let proximoOrcamento =
          await planejamentoSemanalService.buscarOrcamentoPorPeriodo(
            organizacaoAtivaId,
            isoLocal(proximoInicio),
            empresaAtivaId || null
          );

        if (!proximoOrcamento) {
          proximoOrcamento =
            await planejamentoSemanalService.salvarOrcamento(
              {
                organizacaoId:
                  organizacaoAtivaId,
                empresaId:
                  empresaAtivaId ||
                  null,
                dataInicio:
                  isoLocal(
                    proximoInicio
                  ),
                dataFim:
                  isoLocal(proximoFim),
                teto:
                  orcamento?.teto || 0,
                observacao:
                  "Teto criado automaticamente com base na semana anterior.",
              }
            );
        }

        await planejamentoSemanalService.atualizarItem(
          item.id,
          organizacaoAtivaId,
          {
            orcamentoSemanalId:
              proximoOrcamento.id,
            status: "planejado",
            dataPlanejada:
              isoLocal(proximoInicio),
            observacao: [
              item.observacao,
              `Transferido da semana ${formatarData(
                dataInicio
              )} - ${formatarData(
                dataFim
              )}.`,
            ]
              .filter(Boolean)
              .join(" "),
          }
        );

        await carregar();
      } catch (error: any) {
        alert(
          error?.message ||
            "Erro ao mover a compra."
        );
      } finally {
        setSalvando(false);
      }
    };

    const alterarStatus = async (
      item: ItemPlanejamentoSemanal,
      status:
        | "planejado"
        | "concluido"
        | "cancelado"
    ) => {
      try {
        await planejamentoSemanalService.atualizarItem(
          item.id,
          organizacaoAtivaId,
          { status }
        );
        await carregar();
      } catch (error: any) {
        alert(
          error?.message ||
            "Erro ao atualizar a compra."
        );
      }
    };

    const excluirItem = async (
      item: ItemPlanejamentoSemanal
    ) => {
      if (
        !confirm(
          `Excluir "${item.descricao}" do planejamento?`
        )
      ) {
        return;
      }

      try {
        await planejamentoSemanalService.excluirItem(
          item.id,
          organizacaoAtivaId
        );
        await carregar();
      } catch (error: any) {
        alert(
          error?.message ||
            "Erro ao excluir a compra."
        );
      }
    };

    const fecharOuReabrir = async () => {
      if (!orcamento) return;

      try {
        setSalvando(true);

        if (
          orcamento.status === "fechado"
        ) {
          await planejamentoSemanalService.reabrirSemana(
            orcamento.id,
            organizacaoAtivaId
          );
        } else {
          if (
            resumo.excesso > 0 &&
            !confirm(
              `A semana está ${dinheiro(
                resumo.excesso
              )} acima do teto. Deseja fechar mesmo assim?`
            )
          ) {
            return;
          }

          await planejamentoSemanalService.fecharSemana(
            orcamento.id,
            organizacaoAtivaId
          );
        }

        await carregar();
      } catch (error: any) {
        alert(
          error?.message ||
            "Erro ao alterar o fechamento."
        );
      } finally {
        setSalvando(false);
      }
    };

    if (carregando) {
      return (
        <div className="flex min-h-[500px] items-center justify-center">
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-semibold text-slate-600 shadow-sm">
            <Loader2 className="h-5 w-5 animate-spin" />
            Carregando planejamento...
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-indigo-600">
              <Target className="h-4 w-4" />
              Compras
            </div>

            <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
              Planejamento semanal de compras
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
              Controle o teto semanal, organize as compras e transfira despesas para a próxima semana quando necessário.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => carregar()}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
            >
              <RefreshCw className="h-4 w-4" />
              Atualizar
            </button>

            <button
              type="button"
              onClick={() => {
                setTetoDigitado(
                  orcamento
                    ? String(
                        orcamento.teto
                      )
                    : ""
                );
                setObservacaoTeto(
                  orcamento
                    ?.observacao || ""
                );
                setModalTeto(true);
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-xs font-bold text-indigo-700 transition hover:bg-indigo-100"
            >
              <Wallet className="h-4 w-4" />
              {orcamento
                ? "Editar teto"
                : "Definir teto"}
            </button>

            <button
              type="button"
              onClick={abrirNovoItem}
              disabled={
                orcamento?.status ===
                "fechado"
              }
              className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              Adicionar compra
            </button>
          </div>
        </div>

        {erro && (
          <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-bold">
                Não foi possível carregar
              </p>
              <p className="mt-1">
                {erro}
              </p>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                mudarSemana(-1)
              }
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
              title="Semana anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <div className="min-w-[230px] text-center">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Semana selecionada
              </p>
              <p className="mt-1 text-sm font-black text-slate-900">
                {formatarData(
                  dataInicio
                )}{" "}
                até{" "}
                {formatarData(dataFim)}
              </p>
            </div>

            <button
              type="button"
              onClick={() => mudarSemana(1)}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
              title="Próxima semana"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Empresa
              </p>
              <p className="mt-1 text-sm font-bold text-slate-800">
                {empresaAtiva?.nome ||
                  "Todas as empresas"}
              </p>
            </div>

            {orcamento && (
              <button
                type="button"
                onClick={fecharOuReabrir}
                disabled={salvando}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold ${
                  orcamento.status ===
                  "fechado"
                    ? "border border-slate-200 bg-white text-slate-700"
                    : "bg-emerald-600 text-white"
                }`}
              >
                {orcamento.status ===
                "fechado" ? (
                  <RefreshCw className="h-4 w-4" />
                ) : (
                  <Lock className="h-4 w-4" />
                )}
                {orcamento.status ===
                "fechado"
                  ? "Reabrir semana"
                  : "Fechar semana"}
              </button>
            )}
          </div>
        </div>

        {!orcamento ? (
          <div className="rounded-3xl border border-dashed border-indigo-300 bg-indigo-50/70 px-6 py-12 text-center">
            <CircleDollarSign className="mx-auto h-12 w-12 text-indigo-500" />
            <h2 className="mt-4 text-xl font-black text-slate-900">
              Defina o teto desta semana
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
              O saldo não utilizado não será acumulado. Ao iniciar uma nova semana, o controle começa novamente com o teto definido para aquele período.
            </p>
            <button
              type="button"
              onClick={() =>
                setModalTeto(true)
              }
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white"
            >
              <Wallet className="h-4 w-4" />
              Cadastrar teto semanal
            </button>
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              {[
                {
                  titulo:
                    "Teto semanal",
                  valor: dinheiro(
                    resumo.teto
                  ),
                  icone: Wallet,
                  detalhe:
                    orcamento.status ===
                    "fechado"
                      ? "Semana fechada"
                      : "Semana aberta",
                  classe:
                    "text-indigo-600 bg-indigo-50",
                },
                {
                  titulo:
                    "Comprometido",
                  valor: dinheiro(
                    resumo.comprometido
                  ),
                  icone: Target,
                  detalhe: `${resumo.itensAtivos} compra(s) ativa(s)`,
                  classe:
                    "text-slate-700 bg-slate-100",
                },
                {
                  titulo:
                    resumo.excesso > 0
                      ? "Excesso"
                      : "Disponível",
                  valor: dinheiro(
                    resumo.excesso > 0
                      ? resumo.excesso
                      : resumo.disponivel
                  ),
                  icone:
                    resumo.excesso > 0
                      ? AlertTriangle
                      : CheckCircle2,
                  detalhe:
                    resumo.excesso > 0
                      ? "Reorganização necessária"
                      : "Ainda pode ser utilizado",
                  classe:
                    resumo.excesso > 0
                      ? "text-red-600 bg-red-50"
                      : "text-emerald-600 bg-emerald-50",
                },
                {
                  titulo:
                    "Economia prevista",
                  valor: dinheiro(
                    resumo.economiaPrevista
                  ),
                  icone:
                    TrendingDown,
                  detalhe:
                    "Não acumula para a próxima semana",
                  classe:
                    "text-emerald-600 bg-emerald-50",
                },
                {
                  titulo:
                    "Compras urgentes",
                  valor: String(
                    resumo.itensUrgentes
                  ),
                  icone: Clock3,
                  detalhe: `${resumo.itensAdiados} adiada(s)`,
                  classe:
                    "text-orange-600 bg-orange-50",
                },
              ].map(card => (
                <div
                  key={card.titulo}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        {card.titulo}
                      </p>
                      <p className="mt-2 text-xl font-black text-slate-900">
                        {card.valor}
                      </p>
                    </div>
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-xl ${card.classe}`}
                    >
                      <card.icone className="h-5 w-5" />
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-slate-500">
                    {card.detalhe}
                  </p>
                </div>
              ))}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-slate-900">
                    Utilização do teto
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {resumo.percentualUtilizado.toFixed(
                      1
                    )}
                    % comprometido
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-black ${
                    resumo.excesso > 0
                      ? "bg-red-50 text-red-700"
                      : resumo.percentualUtilizado >=
                        90
                      ? "bg-amber-50 text-amber-700"
                      : "bg-emerald-50 text-emerald-700"
                  }`}
                >
                  {resumo.excesso > 0
                    ? "ACIMA DO TETO"
                    : resumo.percentualUtilizado >=
                      90
                    ? "PRÓXIMO DO LIMITE"
                    : "DENTRO DO TETO"}
                </span>
              </div>

              <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full transition-all ${
                    resumo.excesso > 0
                      ? "bg-red-500"
                      : resumo.percentualUtilizado >=
                        90
                      ? "bg-amber-500"
                      : "bg-emerald-500"
                  }`}
                  style={{
                    width: `${Math.min(
                      resumo.percentualUtilizado,
                      100
                    )}%`,
                  }}
                />
              </div>
            </div>

            {resumo.excesso > 0 && (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
                  <div className="flex-1">
                    <h3 className="font-black text-red-900">
                      Reorganização necessária
                    </h3>
                    <p className="mt-1 text-sm leading-6 text-red-700">
                      O planejamento está{" "}
                      <strong>
                        {dinheiro(
                          resumo.excesso
                        )}
                      </strong>{" "}
                      acima do teto. As compras abaixo podem ser transferidas para a próxima semana:
                    </p>

                    <div className="mt-4 grid gap-3 lg:grid-cols-2">
                      {sugestoes.length >
                      0 ? (
                        sugestoes.map(
                          item => (
                            <div
                              key={item.id}
                              className="flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-white p-3"
                            >
                              <div className="min-w-0">
                                <p className="truncate text-sm font-bold text-slate-900">
                                  {
                                    item.descricao
                                  }
                                </p>
                                <p className="mt-1 text-xs text-slate-500">
                                  {dinheiro(
                                    item.valor
                                  )}{" "}
                                  ·{" "}
                                  {
                                    prioridadeLabel[
                                      item.prioridade
                                    ]
                                  }
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() =>
                                  moverProximaSemana(
                                    item
                                  )
                                }
                                className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-red-600 px-3 py-2 text-[11px] font-bold text-white"
                              >
                                Mover
                                <ArrowRight className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          )
                        )
                      ) : (
                        <p className="text-sm text-red-700">
                          Todas as compras ativas estão marcadas como urgentes. Revise valores, quantidades ou fornecedores.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="font-black text-slate-900">
                    Compras planejadas
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Organize prioridades e transfira compras quando o teto for ultrapassado.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={abrirNovoItem}
                  disabled={
                    orcamento.status ===
                    "fechado"
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50"
                >
                  <Plus className="h-4 w-4" />
                  Adicionar compra
                </button>
              </div>

              {itens.length === 0 ? (
                <div className="px-6 py-14 text-center">
                  <CalendarDays className="mx-auto h-10 w-10 text-slate-300" />
                  <p className="mt-3 text-sm font-bold text-slate-700">
                    Nenhuma compra nesta semana
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Adicione uma compra manualmente ou selecione uma solicitação existente.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {itens.map(item => {
                    const fornecedor =
                      fornecedores.find(
                        fornecedorItem =>
                          fornecedorItem.id ===
                          item.fornecedorId
                      );

                    return (
                      <div
                        key={item.id}
                        className={`p-5 ${
                          item.status ===
                          "cancelado"
                            ? "opacity-50"
                            : ""
                        }`}
                      >
                        <div className="flex flex-col gap-4 xl:flex-row xl:items-center">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="truncate text-sm font-black text-slate-900">
                                {
                                  item.descricao
                                }
                              </h3>

                              <span
                                className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${prioridadeClass[item.prioridade]}`}
                              >
                                {
                                  prioridadeLabel[
                                    item.prioridade
                                  ]
                                }
                              </span>

                              {item.urgente && (
                                <span className="rounded-full bg-red-600 px-2.5 py-1 text-[10px] font-bold text-white">
                                  URGENTE
                                </span>
                              )}

                              {item.status ===
                                "concluido" && (
                                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700">
                                  CONCLUÍDA
                                </span>
                              )}

                              {item.status ===
                                "cancelado" && (
                                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">
                                  CANCELADA
                                </span>
                              )}
                            </div>

                            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                              <span>
                                Fornecedor:{" "}
                                <strong className="text-slate-700">
                                  {fornecedor?.nome ||
                                    "Não informado"}
                                </strong>
                              </span>

                              <span>
                                Planejado:{" "}
                                <strong className="text-slate-700">
                                  {item.dataPlanejada
                                    ? formatarData(
                                        item.dataPlanejada
                                      )
                                    : "-"}
                                </strong>
                              </span>
                            </div>

                            {item.observacao && (
                              <p className="mt-2 text-xs leading-5 text-slate-500">
                                {
                                  item.observacao
                                }
                              </p>
                            )}
                          </div>

                          <div className="xl:w-40">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                              Valor
                            </p>
                            <p className="mt-1 text-base font-black text-slate-900">
                              {dinheiro(
                                item.valor
                              )}
                            </p>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            {item.status !==
                              "concluido" && (
                              <button
                                type="button"
                                onClick={() =>
                                  alterarStatus(
                                    item,
                                    "concluido"
                                  )
                                }
                                className="flex h-9 w-9 items-center justify-center rounded-lg border border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                                title="Marcar como concluída"
                              >
                                <Check className="h-4 w-4" />
                              </button>
                            )}

                            {item.status ===
                              "concluido" && (
                              <button
                                type="button"
                                onClick={() =>
                                  alterarStatus(
                                    item,
                                    "planejado"
                                  )
                                }
                                className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600"
                                title="Voltar para planejada"
                              >
                                <RefreshCw className="h-4 w-4" />
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() =>
                                editarItem(item)
                              }
                              disabled={
                                orcamento.status ===
                                "fechado"
                              }
                              className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                              title="Editar"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                moverProximaSemana(
                                  item
                                )
                              }
                              disabled={
                                orcamento.status ===
                                "fechado"
                              }
                              className="inline-flex h-9 items-center gap-1 rounded-lg border border-indigo-200 px-3 text-[11px] font-bold text-indigo-700 hover:bg-indigo-50 disabled:opacity-40"
                              title="Mover para próxima semana"
                            >
                              Próxima
                              <ArrowRight className="h-3.5 w-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                excluirItem(item)
                              }
                              disabled={
                                orcamento.status ===
                                "fechado"
                              }
                              className="flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-40"
                              title="Excluir"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center gap-3 border-b border-slate-100 p-5">
                <History className="h-5 w-5 text-indigo-600" />
                <div>
                  <h2 className="font-black text-slate-900">
                    Histórico semanal
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    O saldo de uma semana não é transferido para a seguinte.
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      <th className="px-5 py-3">
                        Semana
                      </th>
                      <th className="px-5 py-3">
                        Teto
                      </th>
                      <th className="px-5 py-3">
                        Status
                      </th>
                      <th className="px-5 py-3 text-right">
                        Ação
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {historico
                      .slice(0, 10)
                      .map(semana => (
                        <tr
                          key={semana.id}
                          className="text-sm"
                        >
                          <td className="px-5 py-4 font-bold text-slate-800">
                            {formatarData(
                              semana.dataInicio
                            )}{" "}
                            até{" "}
                            {formatarData(
                              semana.dataFim
                            )}
                          </td>
                          <td className="px-5 py-4 font-black text-slate-900">
                            {dinheiro(
                              semana.teto
                            )}
                          </td>
                          <td className="px-5 py-4">
                            <span
                              className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
                                semana.status ===
                                "fechado"
                                  ? "bg-slate-100 text-slate-600"
                                  : "bg-emerald-50 text-emerald-700"
                              }`}
                            >
                              {semana.status ===
                              "fechado"
                                ? "FECHADA"
                                : "ABERTA"}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-right">
                            <button
                              type="button"
                              onClick={() =>
                                setReferenciaSemana(
                                  new Date(
                                    `${semana.dataInicio}T12:00:00`
                                  )
                                )
                              }
                              className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
                            >
                              Abrir
                            </button>
                          </td>
                        </tr>
                      ))}

                    {historico.length ===
                      0 && (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-5 py-10 text-center text-sm text-slate-500"
                        >
                          Nenhuma semana cadastrada.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {modalTeto && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
            <div className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl">
              <div className="flex items-start justify-between border-b border-slate-100 p-6">
                <div>
                  <h2 className="text-xl font-black text-slate-900">
                    Teto semanal
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {formatarData(
                      dataInicio
                    )}{" "}
                    até{" "}
                    {formatarData(
                      dataFim
                    )}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setModalTeto(false)
                  }
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form
                onSubmit={salvarTeto}
                className="p-6"
              >
                <label className="text-xs font-bold text-slate-700">
                  Valor do teto
                </label>
                <div className="mt-2 flex items-center rounded-xl border border-slate-200 bg-white px-4 focus-within:border-indigo-400">
                  <span className="text-sm font-bold text-slate-400">
                    R$
                  </span>
                  <input
                    autoFocus
                    required
                    value={tetoDigitado}
                    onChange={event =>
                      setTetoDigitado(
                        event.target.value
                      )
                    }
                    placeholder="15.000,00"
                    className="w-full border-0 bg-transparent px-3 py-3 text-lg font-black text-slate-900 outline-none"
                  />
                </div>

                <label className="mt-5 block text-xs font-bold text-slate-700">
                  Observação
                </label>
                <textarea
                  rows={3}
                  value={observacaoTeto}
                  onChange={event =>
                    setObservacaoTeto(
                      event.target.value
                    )
                  }
                  placeholder="Ex.: Teto definido pela diretoria para esta semana."
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-400"
                />

                <div className="mt-6 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setModalTeto(false)
                    }
                    className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={salvando}
                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"
                  >
                    {salvando ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Salvar teto
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {modalItem && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
            <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
              <div className="flex items-start justify-between border-b border-slate-100 p-6">
                <div>
                  <h2 className="text-xl font-black text-slate-900">
                    {itemEditando
                      ? "Editar compra"
                      : "Adicionar compra"}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Vincule uma solicitação existente ou registre uma previsão manual.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setModalItem(false)
                  }
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form
                onSubmit={salvarItem}
                className="space-y-5 p-6"
              >
                {!itemEditando && (
                  <div>
                    <label className="text-xs font-bold text-slate-700">
                      Solicitação existente
                    </label>
                    <select
                      value={
                        formItem.processoId
                      }
                      onChange={event =>
                        selecionarProcesso(
                          event.target.value
                        )
                      }
                      className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-400"
                    >
                      <option value="">
                        Compra manual
                      </option>
                      {comprasElegiveis.map(
                        processo => (
                          <option
                            key={
                              processo.id
                            }
                            value={String(
                              (processo as any)
                                .dbId ||
                                processo.id
                            )}
                          >
                            {processo.id} -{" "}
                            {
                              processo.descricao
                            }{" "}
                            (
                            {dinheiro(
                              processo.valor
                            )}
                            )
                          </option>
                        )
                      )}
                    </select>
                  </div>
                )}

                <div>
                  <label className="text-xs font-bold text-slate-700">
                    Descrição
                  </label>
                  <input
                    required
                    value={
                      formItem.descricao
                    }
                    onChange={event =>
                      setFormItem(atual => ({
                        ...atual,
                        descricao:
                          event.target
                            .value,
                      }))
                    }
                    className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-400"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-bold text-slate-700">
                      Fornecedor
                    </label>
                    <select
                      value={
                        formItem.fornecedorId
                      }
                      onChange={event =>
                        setFormItem(atual => ({
                          ...atual,
                          fornecedorId:
                            event.target
                              .value,
                        }))
                      }
                      className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-400"
                    >
                      <option value="">
                        Não informado
                      </option>
                      {fornecedores.map(
                        fornecedor => (
                          <option
                            key={
                              fornecedor.id
                            }
                            value={
                              fornecedor.id
                            }
                          >
                            {
                              fornecedor.nome
                            }
                          </option>
                        )
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700">
                      Valor
                    </label>
                    <input
                      required
                      value={
                        formItem.valor
                      }
                      onChange={event =>
                        setFormItem(atual => ({
                          ...atual,
                          valor:
                            event.target
                              .value,
                        }))
                      }
                      placeholder="0,00"
                      className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:border-indigo-400"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700">
                      Prioridade
                    </label>
                    <select
                      value={
                        formItem.prioridade
                      }
                      onChange={event =>
                        setFormItem(atual => ({
                          ...atual,
                          prioridade:
                            event.target
                              .value as PrioridadeCompra,
                        }))
                      }
                      className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-400"
                    >
                      <option value="baixa">
                        Baixa
                      </option>
                      <option value="media">
                        Média
                      </option>
                      <option value="alta">
                        Alta
                      </option>
                      <option value="urgente">
                        Urgente
                      </option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700">
                      Data planejada
                    </label>
                    <input
                      type="date"
                      value={
                        formItem.dataPlanejada
                      }
                      onChange={event =>
                        setFormItem(atual => ({
                          ...atual,
                          dataPlanejada:
                            event.target
                              .value,
                        }))
                      }
                      className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-400"
                    />
                  </div>
                </div>

                <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-red-100 bg-red-50 p-4">
                  <input
                    type="checkbox"
                    checked={
                      formItem.urgente
                    }
                    onChange={event =>
                      setFormItem(atual => ({
                        ...atual,
                        urgente:
                          event.target
                            .checked,
                        prioridade:
                          event.target
                            .checked
                            ? "urgente"
                            : atual.prioridade ===
                              "urgente"
                            ? "alta"
                            : atual.prioridade,
                      }))
                    }
                    className="h-4 w-4"
                  />
                  <div>
                    <p className="text-sm font-bold text-red-800">
                      Compra urgente
                    </p>
                    <p className="mt-1 text-xs text-red-600">
                      Compras urgentes não entram nas sugestões automáticas de adiamento.
                    </p>
                  </div>
                </label>

                <div>
                  <label className="text-xs font-bold text-slate-700">
                    Observação
                  </label>
                  <textarea
                    rows={3}
                    value={
                      formItem.observacao
                    }
                    onChange={event =>
                      setFormItem(atual => ({
                        ...atual,
                        observacao:
                          event.target
                            .value,
                      }))
                    }
                    className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-400"
                  />
                </div>

                <div className="flex justify-end gap-2 border-t border-slate-100 pt-5">
                  <button
                    type="button"
                    onClick={() =>
                      setModalItem(false)
                    }
                    className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={salvando}
                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"
                  >
                    {salvando ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Salvar compra
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  };

export default WeeklyPurchasingPlanView;
