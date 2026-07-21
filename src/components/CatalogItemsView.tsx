import React, { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Boxes,
  Check,
  ChevronDown,
  Edit3,
  Loader2,
  Package,
  Plus,
  RefreshCw,
  Search,
  Tags,
  Trash2,
  Users,
  Star,
  X,
} from "lucide-react";

import { catalogoService } from "../services/catalogoService";
import ItemSuppliersModal from "./catalogo/ItemSuppliersModal";
import {
  ItemCatalogo,
  NovoItemCatalogoInput,
  NovoSegmentoItemInput,
  SegmentoItem,
} from "../types";

type ModalItemState = {
  aberto: boolean;
  item: ItemCatalogo | null;
};

type ModalSegmentoState = {
  aberto: boolean;
  segmento: SegmentoItem | null;
};


type ModalFornecedorState = {
  aberto: boolean;
  item: ItemCatalogo | null;
};

type ConfirmacaoState =
  | {
      aberto: false;
      tipo: null;
      id: null;
      nome: "";
    }
  | {
      aberto: true;
      tipo: "item" | "segmento";
      id: string;
      nome: string;
    };

const UNIDADES_MEDIDA = [
  "UN",
  "CX",
  "PCT",
  "KG",
  "G",
  "L",
  "ML",
  "M",
  "M²",
  "M³",
  "PAR",
  "KIT",
  "ROLO",
  "FARDO",
  "SACO",
  "GALÃO",
];

const inputClassName =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100";

const labelClassName = "mb-1.5 block text-sm font-medium text-slate-700";

const formatarData = (data?: string | null) => {
  if (!data) return "—";

  const date = new Date(data);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
};

const obterMensagemErro = (erro: unknown) => {
  if (erro instanceof Error) {
    return erro.message;
  }

  return "Não foi possível concluir a operação.";
};

const ModalBase: React.FC<{
  titulo: string;
  subtitulo?: string;
  aberto: boolean;
  carregando?: boolean;
  onFechar: () => void;
  children: React.ReactNode;
}> = ({ titulo, subtitulo, aberto, carregando = false, onFechar, children }) => {
  if (!aberto) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-hidden rounded-2xl border border-white/20 bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">{titulo}</h2>
            {subtitulo && (
              <p className="mt-1 text-sm text-slate-500">{subtitulo}</p>
            )}
          </div>

          <button
            type="button"
            onClick={onFechar}
            disabled={carregando}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Fechar modal"
          >
            <X size={20} />
          </button>
        </div>

        <div className="max-h-[calc(92vh-89px)] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
};

const EmptyState: React.FC<{
  titulo: string;
  descricao: string;
  acaoTexto?: string;
  onAcao?: () => void;
}> = ({ titulo, descricao, acaoTexto, onAcao }) => (
  <div className="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
    <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600">
      <Package size={28} />
    </div>
    <h3 className="text-base font-semibold text-slate-900">{titulo}</h3>
    <p className="mt-1 max-w-md text-sm text-slate-500">{descricao}</p>

    {acaoTexto && onAcao && (
      <button
        type="button"
        onClick={onAcao}
        className="mt-5 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-700"
      >
        <Plus size={17} />
        {acaoTexto}
      </button>
    )}
  </div>
);

const LoadingState = () => (
  <div className="flex min-h-72 items-center justify-center">
    <div className="flex flex-col items-center gap-3 text-slate-500">
      <Loader2 className="animate-spin text-indigo-600" size={30} />
      <span className="text-sm">Carregando catálogo...</span>
    </div>
  </div>
);

export const CatalogItemsView: React.FC = () => {
  const [itens, setItens] = useState<ItemCatalogo[]>([]);
  const [segmentos, setSegmentos] = useState<SegmentoItem[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [excluindo, setExcluindo] = useState(false);

  const [busca, setBusca] = useState("");
  const [segmentoSelecionado, setSegmentoSelecionado] = useState("todos");
  const [statusSelecionado, setStatusSelecionado] = useState<
    "todos" | "ativos" | "inativos"
  >("todos");

  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  const [modalItem, setModalItem] = useState<ModalItemState>({
    aberto: false,
    item: null,
  });

  const [modalSegmento, setModalSegmento] =
    useState<ModalSegmentoState>({
      aberto: false,
      segmento: null,
    });

  const [modalFornecedor, setModalFornecedor] = useState<ModalFornecedorState>({
    aberto: false,
    item: null,
  });

  const [confirmacao, setConfirmacao] = useState<ConfirmacaoState>({
    aberto: false,
    tipo: null,
    id: null,
    nome: "",
  });

  const carregarDados = useCallback(async () => {
    try {
      setCarregando(true);
      setErro("");

      const [itensData, segmentosData] = await Promise.all([
        catalogoService.listarItens(),
        catalogoService.listarSegmentos(),
      ]);

      setItens(itensData);
      setSegmentos(segmentosData);
    } catch (error) {
      setErro(obterMensagemErro(error));
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void carregarDados();
  }, [carregarDados]);

  useEffect(() => {
    if (!sucesso) return;

    const timer = window.setTimeout(() => {
      setSucesso("");
    }, 3500);

    return () => window.clearTimeout(timer);
  }, [sucesso]);

  const itensFiltrados = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase("pt-BR");

    return itens.filter((item) => {
      const correspondeBusca =
        !termo ||
        item.nome.toLocaleLowerCase("pt-BR").includes(termo) ||
        item.codigoInterno
          ?.toLocaleLowerCase("pt-BR")
          .includes(termo) ||
        item.descricao?.toLocaleLowerCase("pt-BR").includes(termo) ||
        item.marcaReferencia
          ?.toLocaleLowerCase("pt-BR")
          .includes(termo) ||
        item.segmento?.nome
          ?.toLocaleLowerCase("pt-BR")
          .includes(termo);

      const correspondeSegmento =
        segmentoSelecionado === "todos" ||
        item.segmentoId === segmentoSelecionado;

      const correspondeStatus =
        statusSelecionado === "todos" ||
        (statusSelecionado === "ativos" && item.ativo) ||
        (statusSelecionado === "inativos" && !item.ativo);

      return (
        correspondeBusca && correspondeSegmento && correspondeStatus
      );
    });
  }, [busca, itens, segmentoSelecionado, statusSelecionado]);

  const estatisticas = useMemo(() => {
    const ativos = itens.filter((item) => item.ativo).length;
    const inativos = itens.length - ativos;
    const fornecedores = itens.reduce(
      (total, item) => total + (item.fornecedores?.length || 0),
      0,
    );

    return {
      total: itens.length,
      ativos,
      inativos,
      segmentos: segmentos.length,
      fornecedores,
    };
  }, [itens, segmentos]);

  const abrirNovoItem = () => {
    setErro("");
    setModalItem({
      aberto: true,
      item: null,
    });
  };

  const abrirEdicaoItem = (item: ItemCatalogo) => {
    setErro("");
    setModalItem({
      aberto: true,
      item,
    });
  };

  const abrirNovoSegmento = () => {
    setErro("");
    setModalSegmento({
      aberto: true,
      segmento: null,
    });
  };

  const abrirEdicaoSegmento = (segmento: SegmentoItem) => {
    setErro("");
    setModalSegmento({
      aberto: true,
      segmento,
    });
  };

  const abrirFornecedoresItem = (item: ItemCatalogo) => {
    setErro("");
    setModalFornecedor({ aberto: true, item });
  };

  const solicitarExclusaoItem = (item: ItemCatalogo) => {
    setConfirmacao({
      aberto: true,
      tipo: "item",
      id: item.id,
      nome: item.nome,
    });
  };

  const solicitarExclusaoSegmento = (segmento: SegmentoItem) => {
    setConfirmacao({
      aberto: true,
      tipo: "segmento",
      id: segmento.id,
      nome: segmento.nome,
    });
  };

  const confirmarExclusao = async () => {
    if (!confirmacao.aberto) return;

    try {
      setExcluindo(true);
      setErro("");

      if (confirmacao.tipo === "item") {
        await catalogoService.excluirItem(confirmacao.id);
        setSucesso("Item excluído com sucesso.");
      } else {
        await catalogoService.excluirSegmento(confirmacao.id);
        setSucesso("Segmento excluído com sucesso.");
      }

      setConfirmacao({
        aberto: false,
        tipo: null,
        id: null,
        nome: "",
      });

      await carregarDados();
    } catch (error) {
      setErro(obterMensagemErro(error));
    } finally {
      setExcluindo(false);
    }
  };

  const salvarItem = async (
    dados: NovoItemCatalogoInput,
    itemId?: string,
  ) => {
    try {
      setSalvando(true);
      setErro("");

      if (itemId) {
        await catalogoService.editarItem(itemId, dados);
        setSucesso("Item atualizado com sucesso.");
      } else {
        await catalogoService.criarItem(dados);
        setSucesso("Item cadastrado com sucesso.");
      }

      setModalItem({
        aberto: false,
        item: null,
      });

      await carregarDados();
    } catch (error) {
      setErro(obterMensagemErro(error));
    } finally {
      setSalvando(false);
    }
  };

  const salvarSegmento = async (
    dados: NovoSegmentoItemInput,
    segmentoId?: string,
  ) => {
    try {
      setSalvando(true);
      setErro("");

      if (segmentoId) {
        await catalogoService.editarSegmento(segmentoId, dados);
        setSucesso("Segmento atualizado com sucesso.");
      } else {
        await catalogoService.criarSegmento(dados);
        setSucesso("Segmento cadastrado com sucesso.");
      }

      setModalSegmento({
        aberto: false,
        segmento: null,
      });

      await carregarDados();
    } catch (error) {
      setErro(obterMensagemErro(error));
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="min-h-full bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1600px] space-y-6">
        <section className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-indigo-700">
              <Boxes size={14} />
              Compras
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Catálogo de Itens
            </h1>
            <p className="mt-1 text-sm text-slate-500 sm:text-base">
              Organize produtos, materiais, unidades e segmentos usados nas
              cotações.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={abrirNovoSegmento}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
            >
              <Tags size={18} />
              Novo segmento
            </button>

            <button
              type="button"
              onClick={abrirNovoItem}
              disabled={segmentos.length === 0}
              title={
                segmentos.length === 0
                  ? "Cadastre um segmento antes de criar um item."
                  : undefined
              }
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              <Plus size={18} />
              Novo item
            </button>
          </div>
        </section>

        {erro && (
          <div className="flex items-start justify-between gap-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 shrink-0" size={18} />
              <span>{erro}</span>
            </div>
            <button
              type="button"
              onClick={() => setErro("")}
              className="shrink-0 rounded p-1 hover:bg-red-100"
              aria-label="Fechar alerta"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {sucesso && (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            <Check size={18} />
            {sucesso}
          </div>
        )}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-500">
                Total de itens
              </span>
              <div className="rounded-xl bg-indigo-100 p-2 text-indigo-600">
                <Package size={19} />
              </div>
            </div>
            <p className="mt-3 text-3xl font-bold text-slate-900">
              {estatisticas.total}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              {estatisticas.ativos} ativos e {estatisticas.inativos} inativos
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-500">
                Segmentos
              </span>
              <div className="rounded-xl bg-violet-100 p-2 text-violet-600">
                <Tags size={19} />
              </div>
            </div>
            <p className="mt-3 text-3xl font-bold text-slate-900">
              {estatisticas.segmentos}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Categorias cadastradas
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-500">
                Itens ativos
              </span>
              <div className="rounded-xl bg-emerald-100 p-2 text-emerald-600">
                <Check size={19} />
              </div>
            </div>
            <p className="mt-3 text-3xl font-bold text-slate-900">
              {estatisticas.ativos}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Disponíveis para uso
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-500">
                Vínculos
              </span>
              <div className="rounded-xl bg-amber-100 p-2 text-amber-600">
                <Boxes size={19} />
              </div>
            </div>
            <p className="mt-3 text-3xl font-bold text-slate-900">
              {estatisticas.fornecedores}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Item × fornecedor
            </p>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-4 sm:p-5">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
              <div className="relative min-w-0 flex-1">
                <Search
                  size={18}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  value={busca}
                  onChange={(event) => setBusca(event.target.value)}
                  placeholder="Buscar por item, código, marca ou segmento..."
                  className={`${inputClassName} pl-10`}
                />
              </div>

              <div className="relative min-w-[210px]">
                <select
                  value={segmentoSelecionado}
                  onChange={(event) =>
                    setSegmentoSelecionado(event.target.value)
                  }
                  className={`${inputClassName} appearance-none pr-9`}
                >
                  <option value="todos">Todos os segmentos</option>
                  {segmentos.map((segmento) => (
                    <option key={segmento.id} value={segmento.id}>
                      {segmento.nome}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={17}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
              </div>

              <div className="relative min-w-[170px]">
                <select
                  value={statusSelecionado}
                  onChange={(event) =>
                    setStatusSelecionado(
                      event.target.value as
                        | "todos"
                        | "ativos"
                        | "inativos",
                    )
                  }
                  className={`${inputClassName} appearance-none pr-9`}
                >
                  <option value="todos">Todos os status</option>
                  <option value="ativos">Ativos</option>
                  <option value="inativos">Inativos</option>
                </select>
                <ChevronDown
                  size={17}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
              </div>

              <button
                type="button"
                onClick={() => void carregarDados()}
                disabled={carregando}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw
                  size={17}
                  className={carregando ? "animate-spin" : ""}
                />
                Atualizar
              </button>
            </div>
          </div>

          <div className="p-4 sm:p-5">
            {carregando ? (
              <LoadingState />
            ) : itens.length === 0 ? (
              <EmptyState
                titulo="Nenhum item cadastrado"
                descricao={
                  segmentos.length === 0
                    ? "Cadastre primeiro um segmento e depois adicione os itens que serão utilizados nas cotações."
                    : "Adicione o primeiro item do catálogo para começar a organizar suas compras."
                }
                acaoTexto={
                  segmentos.length === 0
                    ? "Cadastrar segmento"
                    : "Cadastrar item"
                }
                onAcao={
                  segmentos.length === 0
                    ? abrirNovoSegmento
                    : abrirNovoItem
                }
              />
            ) : itensFiltrados.length === 0 ? (
              <EmptyState
                titulo="Nenhum resultado encontrado"
                descricao="Tente alterar os filtros ou pesquisar usando outro termo."
              />
            ) : (
              <>
                <div className="hidden overflow-x-auto lg:block">
                  <table className="w-full min-w-[1050px] border-separate border-spacing-0">
                    <thead>
                      <tr className="text-left">
                        <th className="border-b border-slate-200 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Item
                        </th>
                        <th className="border-b border-slate-200 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Segmento
                        </th>
                        <th className="border-b border-slate-200 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Unidade
                        </th>
                        <th className="border-b border-slate-200 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Marca
                        </th>
                        <th className="border-b border-slate-200 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Fornecedores
                        </th>
                        <th className="border-b border-slate-200 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Status
                        </th>
                        <th className="border-b border-slate-200 px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Ações
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {itensFiltrados.map((item) => (
                        <tr
                          key={item.id}
                          className="group transition hover:bg-slate-50"
                        >
                          <td className="border-b border-slate-100 px-4 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                                <Package size={19} />
                              </div>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-slate-900">
                                  {item.nome}
                                </p>
                                <p className="mt-0.5 truncate text-xs text-slate-400">
                                  {item.codigoInterno
                                    ? `Código: ${item.codigoInterno}`
                                    : `Criado em ${formatarData(
                                        item.createdAt,
                                      )}`}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="border-b border-slate-100 px-4 py-4 text-sm text-slate-600">
                            {item.segmento?.nome || "—"}
                          </td>

                          <td className="border-b border-slate-100 px-4 py-4">
                            <span className="inline-flex rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                              {item.unidadeMedida}
                            </span>
                          </td>

                          <td className="border-b border-slate-100 px-4 py-4 text-sm text-slate-600">
                            {item.marcaReferencia || "—"}
                          </td>

                          <td className="border-b border-slate-100 px-4 py-4">
                            {(() => {
                              const ativos = (item.fornecedores || []).filter((v) => v.ativo);
                              const precos = ativos
                                .map((v) => v.ultimoPreco)
                                .filter((valor): valor is number => valor !== null && valor !== undefined);
                              const melhorPreco = precos.length > 0 ? Math.min(...precos) : null;

                              return (
                                <button
                                  type="button"
                                  onClick={() => abrirFornecedoresItem(item)}
                                  className="group/fornecedor text-left"
                                  title="Gerenciar fornecedores"
                                >
                                  <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-700 group-hover/fornecedor:text-emerald-700">
                                    <Users size={15} />
                                    {ativos.length} {ativos.length === 1 ? "fornecedor" : "fornecedores"}
                                  </span>
                                  {melhorPreco !== null && (
                                    <span className="mt-1 flex items-center gap-1 text-xs font-medium text-emerald-600">
                                      <Star size={12} />
                                      Melhor: {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(melhorPreco)}
                                    </span>
                                  )}
                                </button>
                              );
                            })()}
                          </td>

                          <td className="border-b border-slate-100 px-4 py-4">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                                item.ativo
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-slate-100 text-slate-500"
                              }`}
                            >
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${
                                  item.ativo
                                    ? "bg-emerald-500"
                                    : "bg-slate-400"
                                }`}
                              />
                              {item.ativo ? "Ativo" : "Inativo"}
                            </span>
                          </td>

                          <td className="border-b border-slate-100 px-4 py-4">
                            <div className="flex justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => abrirFornecedoresItem(item)}
                                className="rounded-lg p-2 text-slate-400 transition hover:bg-emerald-50 hover:text-emerald-600"
                                title="Gerenciar fornecedores"
                              >
                                <Users size={17} />
                              </button>

                              <button
                                type="button"
                                onClick={() => abrirEdicaoItem(item)}
                                className="rounded-lg p-2 text-slate-400 transition hover:bg-indigo-50 hover:text-indigo-600"
                                title="Editar item"
                              >
                                <Edit3 size={17} />
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  solicitarExclusaoItem(item)
                                }
                                className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                                title="Excluir item"
                              >
                                <Trash2 size={17} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="grid gap-3 lg:hidden">
                  {itensFiltrados.map((item) => (
                    <article
                      key={item.id}
                      className="rounded-xl border border-slate-200 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-start gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                            <Package size={19} />
                          </div>
                          <div className="min-w-0">
                            <h3 className="truncate text-sm font-semibold text-slate-900">
                              {item.nome}
                            </h3>
                            <p className="mt-0.5 text-xs text-slate-500">
                              {item.segmento?.nome || "Sem segmento"}
                            </p>
                          </div>
                        </div>

                        <span
                          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
                            item.ativo
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {item.ativo ? "Ativo" : "Inativo"}
                        </span>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-xs text-slate-400">Unidade</p>
                          <p className="mt-0.5 font-medium text-slate-700">
                            {item.unidadeMedida}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400">
                            Fornecedores
                          </p>
                          <button
                            type="button"
                            onClick={() => abrirFornecedoresItem(item)}
                            className="mt-0.5 inline-flex items-center gap-1 font-medium text-emerald-700"
                          >
                            <Users size={14} />
                            {(item.fornecedores || []).filter((v) => v.ativo).length}
                          </button>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400">Código</p>
                          <p className="mt-0.5 font-medium text-slate-700">
                            {item.codigoInterno || "—"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400">Marca</p>
                          <p className="mt-0.5 truncate font-medium text-slate-700">
                            {item.marcaReferencia || "—"}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 flex gap-2 border-t border-slate-100 pt-3">
                        <button
                          type="button"
                          onClick={() => abrirFornecedoresItem(item)}
                          className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100"
                        >
                          <Users size={16} />
                          Fornecedores
                        </button>
                        <button
                          type="button"
                          onClick={() => abrirEdicaoItem(item)}
                          className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-700 transition hover:bg-indigo-100"
                        >
                          <Edit3 size={16} />
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => solicitarExclusaoItem(item)}
                          className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-100"
                        >
                          <Trash2 size={16} />
                          Excluir
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Segmentos cadastrados
              </h2>
              <p className="mt-0.5 text-sm text-slate-500">
                Organize os itens por grupo de compra.
              </p>
            </div>
            <button
              type="button"
              onClick={abrirNovoSegmento}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3.5 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              <Plus size={16} />
              Adicionar
            </button>
          </div>

          {segmentos.length === 0 ? (
            <p className="rounded-xl bg-slate-50 px-4 py-5 text-center text-sm text-slate-500">
              Nenhum segmento cadastrado.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {segmentos.map((segmento) => {
                const quantidadeItens = itens.filter(
                  (item) => item.segmentoId === segmento.id,
                ).length;

                return (
                  <div
                    key={segmento.id}
                    className="group inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm"
                  >
                    <Tags size={15} className="text-indigo-500" />
                    <span className="text-sm font-medium text-slate-700">
                      {segmento.nome}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                      {quantidadeItens}
                    </span>
                    {!segmento.ativo && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-700">
                        Inativo
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => abrirEdicaoSegmento(segmento)}
                      className="ml-1 rounded p-1 text-slate-300 transition hover:bg-indigo-50 hover:text-indigo-600"
                      title="Editar segmento"
                    >
                      <Edit3 size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        solicitarExclusaoSegmento(segmento)
                      }
                      className="rounded p-1 text-slate-300 transition hover:bg-red-50 hover:text-red-600"
                      title="Excluir segmento"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      <ItemSuppliersModal
        aberto={modalFornecedor.aberto}
        item={modalFornecedor.item}
        onFechar={() => setModalFornecedor({ aberto: false, item: null })}
        onAlterado={carregarDados}
      />

      <ItemFormModal
        aberto={modalItem.aberto}
        item={modalItem.item}
        segmentos={segmentos}
        carregando={salvando}
        onFechar={() =>
          setModalItem({
            aberto: false,
            item: null,
          })
        }
        onSalvar={salvarItem}
      />

      <SegmentFormModal
        aberto={modalSegmento.aberto}
        segmento={modalSegmento.segmento}
        carregando={salvando}
        onFechar={() =>
          setModalSegmento({
            aberto: false,
            segmento: null,
          })
        }
        onSalvar={salvarSegmento}
      />

      <ModalBase
        aberto={confirmacao.aberto}
        titulo="Confirmar exclusão"
        subtitulo="Esta ação não poderá ser desfeita."
        carregando={excluindo}
        onFechar={() =>
          setConfirmacao({
            aberto: false,
            tipo: null,
            id: null,
            nome: "",
          })
        }
      >
        {confirmacao.aberto && (
          <div className="p-6">
            <div className="flex gap-4 rounded-xl border border-red-100 bg-red-50 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
                <Trash2 size={19} />
              </div>
              <div>
                <p className="font-medium text-slate-900">
                  Excluir {confirmacao.tipo === "item" ? "item" : "segmento"}{" "}
                  “{confirmacao.nome}”?
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {confirmacao.tipo === "segmento"
                    ? "Segmentos com itens vinculados não poderão ser excluídos."
                    : "Itens com fornecedores vinculados não poderão ser excluídos."}
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={excluindo}
                onClick={() =>
                  setConfirmacao({
                    aberto: false,
                    tipo: null,
                    id: null,
                    nome: "",
                  })
                }
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={excluindo}
                onClick={() => void confirmarExclusao()}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {excluindo ? (
                  <Loader2 size={17} className="animate-spin" />
                ) : (
                  <Trash2 size={17} />
                )}
                Excluir
              </button>
            </div>
          </div>
        )}
      </ModalBase>
    </div>
  );
};

const ItemFormModal: React.FC<{
  aberto: boolean;
  item: ItemCatalogo | null;
  segmentos: SegmentoItem[];
  carregando: boolean;
  onFechar: () => void;
  onSalvar: (
    dados: NovoItemCatalogoInput,
    itemId?: string,
  ) => Promise<void>;
}> = ({
  aberto,
  item,
  segmentos,
  carregando,
  onFechar,
  onSalvar,
}) => {
  const [form, setForm] = useState<NovoItemCatalogoInput>({
    segmentoId: "",
    nome: "",
    descricao: "",
    unidadeMedida: "UN",
    codigoInterno: "",
    marcaReferencia: "",
    especificacao: "",
    ativo: true,
  });

  useEffect(() => {
    if (!aberto) return;

    setForm({
      segmentoId: item?.segmentoId || segmentos[0]?.id || "",
      nome: item?.nome || "",
      descricao: item?.descricao || "",
      unidadeMedida: item?.unidadeMedida || "UN",
      codigoInterno: item?.codigoInterno || "",
      marcaReferencia: item?.marcaReferencia || "",
      especificacao: item?.especificacao || "",
      ativo: item?.ativo ?? true,
    });
  }, [aberto, item, segmentos]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    await onSalvar(form, item?.id);
  };

  return (
    <ModalBase
      aberto={aberto}
      titulo={item ? "Editar item" : "Novo item"}
      subtitulo="Preencha as informações usadas no catálogo e nas cotações."
      carregando={carregando}
      onFechar={onFechar}
    >
      <form onSubmit={handleSubmit} className="p-6">
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={labelClassName}>
              Nome do item <span className="text-red-500">*</span>
            </label>
            <input
              required
              value={form.nome}
              onChange={(event) =>
                setForm((atual) => ({
                  ...atual,
                  nome: event.target.value,
                }))
              }
              placeholder="Ex.: Parafuso sextavado 10 mm"
              className={inputClassName}
            />
          </div>

          <div>
            <label className={labelClassName}>
              Segmento <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                required
                value={form.segmentoId}
                onChange={(event) =>
                  setForm((atual) => ({
                    ...atual,
                    segmentoId: event.target.value,
                  }))
                }
                className={`${inputClassName} appearance-none pr-9`}
              >
                <option value="">Selecione</option>
                {segmentos
                  .filter(
                    (segmento) =>
                      segmento.ativo || segmento.id === item?.segmentoId,
                  )
                  .map((segmento) => (
                    <option key={segmento.id} value={segmento.id}>
                      {segmento.nome}
                    </option>
                  ))}
              </select>
              <ChevronDown
                size={17}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
            </div>
          </div>

          <div>
            <label className={labelClassName}>
              Unidade de medida <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                required
                value={form.unidadeMedida}
                onChange={(event) =>
                  setForm((atual) => ({
                    ...atual,
                    unidadeMedida: event.target.value,
                  }))
                }
                className={`${inputClassName} appearance-none pr-9`}
              >
                {UNIDADES_MEDIDA.map((unidade) => (
                  <option key={unidade} value={unidade}>
                    {unidade}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={17}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
            </div>
          </div>

          <div>
            <label className={labelClassName}>Código interno</label>
            <input
              value={form.codigoInterno || ""}
              onChange={(event) =>
                setForm((atual) => ({
                  ...atual,
                  codigoInterno: event.target.value,
                }))
              }
              placeholder="Ex.: MAT-001"
              className={inputClassName}
            />
          </div>

          <div>
            <label className={labelClassName}>Marca de referência</label>
            <input
              value={form.marcaReferencia || ""}
              onChange={(event) =>
                setForm((atual) => ({
                  ...atual,
                  marcaReferencia: event.target.value,
                }))
              }
              placeholder="Ex.: Tramontina"
              className={inputClassName}
            />
          </div>

          <div className="sm:col-span-2">
            <label className={labelClassName}>Descrição</label>
            <textarea
              rows={3}
              value={form.descricao || ""}
              onChange={(event) =>
                setForm((atual) => ({
                  ...atual,
                  descricao: event.target.value,
                }))
              }
              placeholder="Descrição resumida do item..."
              className={`${inputClassName} resize-none`}
            />
          </div>

          <div className="sm:col-span-2">
            <label className={labelClassName}>Especificação técnica</label>
            <textarea
              rows={3}
              value={form.especificacao || ""}
              onChange={(event) =>
                setForm((atual) => ({
                  ...atual,
                  especificacao: event.target.value,
                }))
              }
              placeholder="Medidas, composição, modelo, padrão ou outras exigências..."
              className={`${inputClassName} resize-none`}
            />
          </div>

          <label className="sm:col-span-2 flex cursor-pointer items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-slate-700">Item ativo</p>
              <p className="text-xs text-slate-500">
                Itens inativos permanecem no histórico, mas não devem ser
                usados em novas cotações.
              </p>
            </div>
            <input
              type="checkbox"
              checked={form.ativo ?? true}
              onChange={(event) =>
                setForm((atual) => ({
                  ...atual,
                  ativo: event.target.checked,
                }))
              }
              className="h-5 w-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
          </label>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-2 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onFechar}
            disabled={carregando}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            Cancelar
          </button>

          <button
            type="submit"
            disabled={carregando || segmentos.length === 0}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {carregando ? (
              <Loader2 size={17} className="animate-spin" />
            ) : (
              <Check size={17} />
            )}
            {item ? "Salvar alterações" : "Cadastrar item"}
          </button>
        </div>
      </form>
    </ModalBase>
  );
};

const SegmentFormModal: React.FC<{
  aberto: boolean;
  segmento: SegmentoItem | null;
  carregando: boolean;
  onFechar: () => void;
  onSalvar: (
    dados: NovoSegmentoItemInput,
    segmentoId?: string,
  ) => Promise<void>;
}> = ({
  aberto,
  segmento,
  carregando,
  onFechar,
  onSalvar,
}) => {
  const [form, setForm] = useState<NovoSegmentoItemInput>({
    nome: "",
    descricao: "",
    ativo: true,
  });

  useEffect(() => {
    if (!aberto) return;

    setForm({
      nome: segmento?.nome || "",
      descricao: segmento?.descricao || "",
      ativo: segmento?.ativo ?? true,
    });
  }, [aberto, segmento]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    await onSalvar(form, segmento?.id);
  };

  return (
    <ModalBase
      aberto={aberto}
      titulo={segmento ? "Editar segmento" : "Novo segmento"}
      subtitulo="Crie categorias para organizar os itens do catálogo."
      carregando={carregando}
      onFechar={onFechar}
    >
      <form onSubmit={handleSubmit} className="p-6">
        <div className="space-y-5">
          <div>
            <label className={labelClassName}>
              Nome do segmento <span className="text-red-500">*</span>
            </label>
            <input
              required
              value={form.nome}
              onChange={(event) =>
                setForm((atual) => ({
                  ...atual,
                  nome: event.target.value,
                }))
              }
              placeholder="Ex.: Material elétrico"
              className={inputClassName}
            />
          </div>

          <div>
            <label className={labelClassName}>Descrição</label>
            <textarea
              rows={4}
              value={form.descricao || ""}
              onChange={(event) =>
                setForm((atual) => ({
                  ...atual,
                  descricao: event.target.value,
                }))
              }
              placeholder="Informe quais tipos de itens fazem parte deste segmento..."
              className={`${inputClassName} resize-none`}
            />
          </div>

          <label className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-slate-700">
                Segmento ativo
              </p>
              <p className="text-xs text-slate-500">
                Segmentos inativos não aparecerão em novos cadastros.
              </p>
            </div>
            <input
              type="checkbox"
              checked={form.ativo ?? true}
              onChange={(event) =>
                setForm((atual) => ({
                  ...atual,
                  ativo: event.target.checked,
                }))
              }
              className="h-5 w-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
          </label>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-2 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onFechar}
            disabled={carregando}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            Cancelar
          </button>

          <button
            type="submit"
            disabled={carregando}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {carregando ? (
              <Loader2 size={17} className="animate-spin" />
            ) : (
              <Check size={17} />
            )}
            {segmento ? "Salvar alterações" : "Cadastrar segmento"}
          </button>
        </div>
      </form>
    </ModalBase>
  );
};

export default CatalogItemsView;