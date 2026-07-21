import React, { FormEvent, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Check,
  ChevronDown,
  Edit3,
  Loader2,
  Plus,
  Star,
  Trash2,
  Users,
  X,
} from "lucide-react";

import { catalogoService } from "../../services/catalogoService";
import {
  Fornecedor,
  ItemCatalogo,
  ItemFornecedor,
  VincularFornecedorItemInput,
} from "../../types";

type Props = {
  aberto: boolean;
  item: ItemCatalogo | null;
  onFechar: () => void;
  onAlterado: () => Promise<void> | void;
};

type FormState = {
  fornecedorId: string;
  codigoFornecedor: string;
  marcaFornecida: string;
  ultimoPreco: string;
  prazoEntregaDias: string;
  quantidadeMinima: string;
  observacoes: string;
  fornecedorPreferencial: boolean;
  ativo: boolean;
};

const initialForm: FormState = {
  fornecedorId: "",
  codigoFornecedor: "",
  marcaFornecida: "",
  ultimoPreco: "",
  prazoEntregaDias: "",
  quantidadeMinima: "",
  observacoes: "",
  fornecedorPreferencial: false,
  ativo: true,
};

const inputClassName =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100";

const labelClassName = "mb-1.5 block text-sm font-medium text-slate-700";

const moeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Não foi possível concluir a operação.";

const parseOptionalNumber = (value: string): number | null => {
  const cleaned = value.replace(/\./g, "").replace(",", ".").trim();
  if (!cleaned) return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
};

export const ItemSuppliersModal: React.FC<Props> = ({
  aberto,
  item,
  onFechar,
  onAlterado,
}) => {
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [vinculos, setVinculos] = useState<ItemFornecedor[]>([]);
  const [form, setForm] = useState<FormState>(initialForm);
  const [editando, setEditando] = useState<ItemFornecedor | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [removendoId, setRemovendoId] = useState<string | null>(null);
  const [erro, setErro] = useState("");

  const carregar = async () => {
    if (!item) return;

    try {
      setCarregando(true);
      setErro("");
      const [fornecedoresData, vinculosData] = await Promise.all([
        catalogoService.listarFornecedoresDisponiveis(),
        catalogoService.listarFornecedoresItem(item.id),
      ]);
      setFornecedores(fornecedoresData);
      setVinculos(vinculosData);
    } catch (error) {
      setErro(getErrorMessage(error));
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    if (!aberto || !item) return;
    setForm(initialForm);
    setEditando(null);
    void carregar();
  }, [aberto, item?.id]);

  const fornecedoresDisponiveis = useMemo(() => {
    const idsVinculados = new Set(vinculos.map((v) => v.fornecedorId));
    return fornecedores.filter(
      (fornecedor) =>
        fornecedor.id === editando?.fornecedorId || !idsVinculados.has(fornecedor.id),
    );
  }, [fornecedores, vinculos, editando]);

  const melhorPrecoId = useMemo(() => {
    const validos = vinculos.filter(
      (v) => v.ativo && v.ultimoPreco !== null && v.ultimoPreco !== undefined,
    );
    if (validos.length === 0) return null;
    return [...validos].sort((a, b) => Number(a.ultimoPreco) - Number(b.ultimoPreco))[0].id;
  }, [vinculos]);

  const limparFormulario = () => {
    setEditando(null);
    setForm(initialForm);
  };

  const iniciarEdicao = (vinculo: ItemFornecedor) => {
    setEditando(vinculo);
    setForm({
      fornecedorId: vinculo.fornecedorId,
      codigoFornecedor: vinculo.codigoFornecedor || "",
      marcaFornecida: vinculo.marcaFornecida || "",
      ultimoPreco:
        vinculo.ultimoPreco === null || vinculo.ultimoPreco === undefined
          ? ""
          : String(vinculo.ultimoPreco).replace(".", ","),
      prazoEntregaDias:
        vinculo.prazoEntregaDias === null || vinculo.prazoEntregaDias === undefined
          ? ""
          : String(vinculo.prazoEntregaDias),
      quantidadeMinima:
        vinculo.quantidadeMinima === null || vinculo.quantidadeMinima === undefined
          ? ""
          : String(vinculo.quantidadeMinima),
      observacoes: vinculo.observacoes || "",
      fornecedorPreferencial: Boolean(vinculo.fornecedorPreferencial),
      ativo: Boolean(vinculo.ativo),
    });
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!item) return;

    if (!form.fornecedorId) {
      setErro("Selecione um fornecedor.");
      return;
    }

    try {
      setSalvando(true);
      setErro("");

      const payload: VincularFornecedorItemInput = {
        itemId: item.id,
        fornecedorId: form.fornecedorId,
        codigoFornecedor: form.codigoFornecedor,
        marcaFornecida: form.marcaFornecida,
        ultimoPreco: parseOptionalNumber(form.ultimoPreco),
        prazoEntregaDias: parseOptionalNumber(form.prazoEntregaDias),
        quantidadeMinima: parseOptionalNumber(form.quantidadeMinima),
        observacoes: form.observacoes,
        fornecedorPreferencial: form.fornecedorPreferencial,
        ativo: form.ativo,
      };

      if (editando) {
        await catalogoService.editarFornecedorItem(editando.id, {
          codigoFornecedor: payload.codigoFornecedor,
          marcaFornecida: payload.marcaFornecida,
          ultimoPreco: payload.ultimoPreco,
          prazoEntregaDias: payload.prazoEntregaDias,
          quantidadeMinima: payload.quantidadeMinima,
          observacoes: payload.observacoes,
          fornecedorPreferencial: payload.fornecedorPreferencial,
          ativo: payload.ativo,
        });
      } else {
        await catalogoService.vincularFornecedor(payload);
      }

      limparFormulario();
      await carregar();
      await onAlterado();
    } catch (error) {
      setErro(getErrorMessage(error));
    } finally {
      setSalvando(false);
    }
  };

  const remover = async (vinculo: ItemFornecedor) => {
    const nome = vinculo.fornecedor?.nome || "este fornecedor";
    if (!window.confirm(`Remover o vínculo com ${nome}?`)) return;

    try {
      setRemovendoId(vinculo.id);
      setErro("");
      await catalogoService.removerFornecedor(vinculo.id);
      if (editando?.id === vinculo.id) limparFormulario();
      await carregar();
      await onAlterado();
    } catch (error) {
      setErro(getErrorMessage(error));
    } finally {
      setRemovendoId(null);
    }
  };

  if (!aberto || !item) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/55 p-3 backdrop-blur-sm sm:p-5">
      <div className="flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-white/20 bg-white shadow-2xl">
        <header className="flex items-start justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
              <Users size={22} />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Fornecedores do item</h2>
              <p className="mt-0.5 text-sm text-slate-500">
                {item.nome} {item.codigoInterno ? `• ${item.codigoInterno}` : ""}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onFechar}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Fechar"
          >
            <X size={20} />
          </button>
        </header>

        <div className="grid min-h-0 flex-1 overflow-y-auto lg:grid-cols-[390px_minmax(0,1fr)]">
          <form onSubmit={handleSubmit} className="border-b border-slate-100 p-5 lg:border-b-0 lg:border-r lg:p-6">
            <div className="mb-5">
              <h3 className="font-semibold text-slate-900">
                {editando ? "Editar vínculo" : "Novo vínculo"}
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Informe preço, prazo e condições deste fornecedor.
              </p>
            </div>

            {erro && (
              <div className="mb-4 flex gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
                <AlertCircle className="mt-0.5 shrink-0" size={17} />
                <span>{erro}</span>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className={labelClassName}>Fornecedor *</label>
                <div className="relative">
                  <select
                    required
                    disabled={Boolean(editando)}
                    value={form.fornecedorId}
                    onChange={(e) => setForm((f) => ({ ...f, fornecedorId: e.target.value }))}
                    className={`${inputClassName} appearance-none pr-9 disabled:bg-slate-100`}
                  >
                    <option value="">Selecione</option>
                    {fornecedoresDisponiveis.map((fornecedor) => (
                      <option key={fornecedor.id} value={fornecedor.id}>
                        {fornecedor.nome}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClassName}>Último preço</label>
                  <input
                    inputMode="decimal"
                    value={form.ultimoPreco}
                    onChange={(e) => setForm((f) => ({ ...f, ultimoPreco: e.target.value }))}
                    placeholder="0,00"
                    className={inputClassName}
                  />
                </div>
                <div>
                  <label className={labelClassName}>Prazo (dias)</label>
                  <input
                    type="number"
                    min="0"
                    value={form.prazoEntregaDias}
                    onChange={(e) => setForm((f) => ({ ...f, prazoEntregaDias: e.target.value }))}
                    placeholder="Ex.: 3"
                    className={inputClassName}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClassName}>Código no fornecedor</label>
                  <input
                    value={form.codigoFornecedor}
                    onChange={(e) => setForm((f) => ({ ...f, codigoFornecedor: e.target.value }))}
                    placeholder="Ex.: PN-001"
                    className={inputClassName}
                  />
                </div>
                <div>
                  <label className={labelClassName}>Quantidade mínima</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.quantidadeMinima}
                    onChange={(e) => setForm((f) => ({ ...f, quantidadeMinima: e.target.value }))}
                    placeholder="Ex.: 1"
                    className={inputClassName}
                  />
                </div>
              </div>

              <div>
                <label className={labelClassName}>Marca fornecida</label>
                <input
                  value={form.marcaFornecida}
                  onChange={(e) => setForm((f) => ({ ...f, marcaFornecida: e.target.value }))}
                  placeholder="Ex.: Michelin"
                  className={inputClassName}
                />
              </div>

              <div>
                <label className={labelClassName}>Observações</label>
                <textarea
                  rows={3}
                  value={form.observacoes}
                  onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))}
                  placeholder="Condições comerciais, garantia, frete..."
                  className={`${inputClassName} resize-none`}
                />
              </div>

              <label className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3">
                <div>
                  <p className="text-sm font-medium text-slate-700">Fornecedor preferencial</p>
                  <p className="text-xs text-slate-500">Somente um por item.</p>
                </div>
                <input
                  type="checkbox"
                  checked={form.fornecedorPreferencial}
                  onChange={(e) => setForm((f) => ({ ...f, fornecedorPreferencial: e.target.checked }))}
                  className="h-5 w-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
              </label>

              <label className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3">
                <span className="text-sm font-medium text-slate-700">Vínculo ativo</span>
                <input
                  type="checkbox"
                  checked={form.ativo}
                  onChange={(e) => setForm((f) => ({ ...f, ativo: e.target.checked }))}
                  className="h-5 w-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
              </label>
            </div>

            <div className="mt-5 flex gap-2 border-t border-slate-100 pt-5">
              {editando && (
                <button
                  type="button"
                  onClick={limparFormulario}
                  disabled={salvando}
                  className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>
              )}
              <button
                type="submit"
                disabled={salvando || carregando}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                {salvando ? <Loader2 className="animate-spin" size={17} /> : editando ? <Check size={17} /> : <Plus size={17} />}
                {editando ? "Salvar" : "Vincular"}
              </button>
            </div>
          </form>

          <section className="min-w-0 p-5 sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-slate-900">Fornecedores vinculados</h3>
                <p className="mt-0.5 text-sm text-slate-500">{vinculos.length} vínculo(s)</p>
              </div>
            </div>

            {carregando ? (
              <div className="flex min-h-72 items-center justify-center">
                <Loader2 className="animate-spin text-indigo-600" size={28} />
              </div>
            ) : vinculos.length === 0 ? (
              <div className="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
                <Users className="text-slate-400" size={30} />
                <h4 className="mt-3 font-semibold text-slate-800">Nenhum fornecedor vinculado</h4>
                <p className="mt-1 max-w-sm text-sm text-slate-500">Use o formulário ao lado para cadastrar preço e condições.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {vinculos.map((vinculo) => (
                  <article key={vinculo.id} className="rounded-2xl border border-slate-200 p-4 shadow-sm">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="font-semibold text-slate-900">{vinculo.fornecedor?.nome || "Fornecedor"}</h4>
                          {vinculo.fornecedorPreferencial && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
                              <Star size={13} fill="currentColor" /> Preferencial
                            </span>
                          )}
                          {vinculo.id === melhorPrecoId && (
                            <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">Melhor preço</span>
                          )}
                          {!vinculo.ativo && (
                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">Inativo</span>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                          {vinculo.fornecedor?.cnpj || "CNPJ não informado"}
                        </p>
                      </div>

                      <div className="flex gap-1 self-end sm:self-auto">
                        <button type="button" onClick={() => iniciarEdicao(vinculo)} className="rounded-lg p-2 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600" title="Editar vínculo">
                          <Edit3 size={17} />
                        </button>
                        <button type="button" onClick={() => void remover(vinculo)} disabled={removendoId === vinculo.id} className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50" title="Remover vínculo">
                          {removendoId === vinculo.id ? <Loader2 className="animate-spin" size={17} /> : <Trash2 size={17} />}
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3 sm:grid-cols-4">
                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-slate-400">Preço</p>
                        <p className="mt-1 font-semibold text-slate-900">{vinculo.ultimoPreco == null ? "—" : moeda.format(Number(vinculo.ultimoPreco))}</p>
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-slate-400">Prazo</p>
                        <p className="mt-1 font-medium text-slate-700">{vinculo.prazoEntregaDias == null ? "—" : `${vinculo.prazoEntregaDias} dia(s)`}</p>
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-slate-400">Marca</p>
                        <p className="mt-1 truncate font-medium text-slate-700">{vinculo.marcaFornecida || "—"}</p>
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-slate-400">Qtd. mínima</p>
                        <p className="mt-1 font-medium text-slate-700">{vinculo.quantidadeMinima ?? "—"}</p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

export default ItemSuppliersModal;