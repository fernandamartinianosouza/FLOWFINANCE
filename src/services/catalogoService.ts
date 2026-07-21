import { supabase } from "../lib/supabase";
import {
  AtualizarFornecedorItemInput,
  AtualizarItemCatalogoInput,
  AtualizarSegmentoItemInput,
  ItemCatalogo,
  ItemFornecedor,
  NovoItemCatalogoInput,
  NovoSegmentoItemInput,
  SegmentoItem,
  VincularFornecedorItemInput,
  Fornecedor,
} from "../types";

const getUserId = async (): Promise<string> => {
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    throw new Error("Usuário não autenticado.");
  }

  return data.user.id;
};

const resolverOrganizacaoId = async (
  organizacaoId?: string | null,
): Promise<string> => {
  if (organizacaoId) {
    return organizacaoId;
  }

  const userId = await getUserId();

  const { data, error } = await supabase
    .from("usuarios_organizacoes")
    .select("organizacao_id")
    .eq("user_id", userId)
    .eq("ativo", true)
    .limit(1)
    .maybeSingle();

  if (error) throw error;

  if (!data?.organizacao_id) {
    throw new Error("O usuário não está vinculado a uma organização ativa.");
  }

  return data.organizacao_id;
};

const mapSegmentoFromDb = (item: any): SegmentoItem => ({
  id: item.id,
  organizacaoId: item.organizacao_id,
  nome: item.nome,
  descricao: item.descricao,
  ativo: item.ativo,
  createdAt: item.created_at,
  updatedAt: item.updated_at,
});

const mapItemFromDb = (item: any): ItemCatalogo => ({
  id: item.id,
  organizacaoId: item.organizacao_id,
  segmentoId: item.segmento_id,
  nome: item.nome,
  descricao: item.descricao,
  unidadeMedida: item.unidade_medida,
  codigoInterno: item.codigo_interno,
  marcaReferencia: item.marca_referencia,
  especificacao: item.especificacao,
  ativo: item.ativo,
  segmento: item.segmentos_itens
    ? mapSegmentoFromDb(item.segmentos_itens)
    : undefined,
  fornecedores: Array.isArray(item.itens_fornecedores)
    ? item.itens_fornecedores.map(mapItemFornecedorFromDb)
    : undefined,
  createdAt: item.created_at,
  updatedAt: item.updated_at,
});

const mapItemFornecedorFromDb = (item: any): ItemFornecedor => ({
  id: item.id,
  organizacaoId: item.organizacao_id,
  itemId: item.item_id,
  fornecedorId: item.fornecedor_id,
  codigoFornecedor: item.codigo_fornecedor,
  marcaFornecida: item.marca_fornecida,
  ultimoPreco:
    item.ultimo_preco === null || item.ultimo_preco === undefined
      ? null
      : Number(item.ultimo_preco),
  prazoEntregaDias:
    item.prazo_entrega_dias === null ||
    item.prazo_entrega_dias === undefined
      ? null
      : Number(item.prazo_entrega_dias),
  quantidadeMinima:
    item.quantidade_minima === null ||
    item.quantidade_minima === undefined
      ? null
      : Number(item.quantidade_minima),
  observacoes: item.observacoes,
  fornecedorPreferencial: Boolean(item.fornecedor_preferencial),
  ativo: Boolean(item.ativo),
  fornecedor: item.fornecedores
    ? {
        id: item.fornecedores.id,
        organizacaoId: item.fornecedores.organizacao_id,
        nome: item.fornecedores.nome,
        cnpj: item.fornecedores.cnpj || "",
        email: item.fornecedores.email || "",
        telefone: item.fornecedores.telefone || "",
        historicoCompras: Number(item.fornecedores.historico_compras || 0),
        ultimaCompra: item.fornecedores.ultima_compra || "",
        tempoMedioPagamento: Number(
          item.fornecedores.tempo_medio_pagamento || 0,
        ),
      }
    : undefined,
  createdAt: item.created_at,
  updatedAt: item.updated_at,
});

const tratarErroDuplicidade = (
  error: any,
  mensagem: string,
): never => {
  if (error?.code === "23505") {
    throw new Error(mensagem);
  }

  throw error;
};

export const catalogoService = {
  async listarSegmentos(
    organizacaoId?: string,
  ): Promise<SegmentoItem[]> {
    const orgId = await resolverOrganizacaoId(organizacaoId);

    const { data, error } = await supabase
      .from("segmentos_itens")
      .select("*")
      .eq("organizacao_id", orgId)
      .order("nome", { ascending: true });

    if (error) throw error;

    return (data || []).map(mapSegmentoFromDb);
  },

  async criarSegmento(
    item: NovoSegmentoItemInput,
    organizacaoId?: string,
  ): Promise<SegmentoItem> {
    const orgId = await resolverOrganizacaoId(organizacaoId);
    const nome = item.nome?.trim();

    if (!nome) {
      throw new Error("Informe o nome do segmento.");
    }

    const { data, error } = await supabase
      .from("segmentos_itens")
      .insert({
        organizacao_id: orgId,
        nome,
        descricao: item.descricao?.trim() || null,
        ativo: item.ativo ?? true,
      })
      .select()
      .single();

    if (error) {
      tratarErroDuplicidade(
        error,
        "Já existe um segmento com esse nome.",
      );
    }

    return mapSegmentoFromDb(data);
  },

  async editarSegmento(
    id: string,
    item: AtualizarSegmentoItemInput,
    organizacaoId?: string,
  ): Promise<SegmentoItem> {
    const orgId = await resolverOrganizacaoId(organizacaoId);
    const payload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (item.nome !== undefined) {
      const nome = item.nome.trim();

      if (!nome) {
        throw new Error("Informe o nome do segmento.");
      }

      payload.nome = nome;
    }

    if (item.descricao !== undefined) {
      payload.descricao = item.descricao?.trim() || null;
    }

    if (item.ativo !== undefined) {
      payload.ativo = item.ativo;
    }

    const { data, error } = await supabase
      .from("segmentos_itens")
      .update(payload)
      .eq("id", id)
      .eq("organizacao_id", orgId)
      .select()
      .single();

    if (error) {
      tratarErroDuplicidade(
        error,
        "Já existe um segmento com esse nome.",
      );
    }

    return mapSegmentoFromDb(data);
  },

  async excluirSegmento(
    id: string,
    organizacaoId?: string,
  ): Promise<void> {
    const orgId = await resolverOrganizacaoId(organizacaoId);

    const { count, error: countError } = await supabase
      .from("itens_catalogo")
      .select("id", { count: "exact", head: true })
      .eq("organizacao_id", orgId)
      .eq("segmento_id", id);

    if (countError) throw countError;

    if ((count || 0) > 0) {
      throw new Error(
        "Este segmento possui itens cadastrados e não pode ser excluído.",
      );
    }

    const { error } = await supabase
      .from("segmentos_itens")
      .delete()
      .eq("id", id)
      .eq("organizacao_id", orgId);

    if (error) throw error;
  },

  async listarItens(
    organizacaoId?: string,
  ): Promise<ItemCatalogo[]> {
    const orgId = await resolverOrganizacaoId(organizacaoId);

    const { data, error } = await supabase
      .from("itens_catalogo")
      .select(
        `
          *,
          segmentos_itens (
            id,
            organizacao_id,
            nome,
            descricao,
            ativo,
            created_at,
            updated_at
          ),
          itens_fornecedores (
            *,
            fornecedores (*)
          )
        `,
      )
      .eq("organizacao_id", orgId)
      .order("nome", { ascending: true });

    if (error) throw error;

    return (data || []).map(mapItemFromDb);
  },

  async buscarItens(
    termo: string,
    organizacaoId?: string,
  ): Promise<ItemCatalogo[]> {
    const orgId = await resolverOrganizacaoId(organizacaoId);
    const pesquisa = termo.trim();

    if (!pesquisa) {
      return this.listarItens(orgId);
    }

    const { data, error } = await supabase
      .from("itens_catalogo")
      .select(
        `
          *,
          segmentos_itens (
            id,
            organizacao_id,
            nome,
            descricao,
            ativo,
            created_at,
            updated_at
          ),
          itens_fornecedores (
            *,
            fornecedores (*)
          )
        `,
      )
      .eq("organizacao_id", orgId)
      .or(
        `nome.ilike.%${pesquisa}%,codigo_interno.ilike.%${pesquisa}%,descricao.ilike.%${pesquisa}%,marca_referencia.ilike.%${pesquisa}%`,
      )
      .order("nome", { ascending: true });

    if (error) throw error;

    return (data || []).map(mapItemFromDb);
  },

  async listarItensPorSegmento(
    segmentoId: string,
    organizacaoId?: string,
  ): Promise<ItemCatalogo[]> {
    const orgId = await resolverOrganizacaoId(organizacaoId);

    const { data, error } = await supabase
      .from("itens_catalogo")
      .select(
        `
          *,
          segmentos_itens (
            id,
            organizacao_id,
            nome,
            descricao,
            ativo,
            created_at,
            updated_at
          ),
          itens_fornecedores (
            *,
            fornecedores (*)
          )
        `,
      )
      .eq("organizacao_id", orgId)
      .eq("segmento_id", segmentoId)
      .order("nome", { ascending: true });

    if (error) throw error;

    return (data || []).map(mapItemFromDb);
  },

  async criarItem(
    item: NovoItemCatalogoInput,
    organizacaoId?: string,
  ): Promise<ItemCatalogo> {
    const orgId = await resolverOrganizacaoId(organizacaoId);
    const nome = item.nome?.trim();
    const unidadeMedida = item.unidadeMedida?.trim().toUpperCase();

    if (!item.segmentoId) {
      throw new Error("Selecione o segmento do item.");
    }

    if (!nome) {
      throw new Error("Informe o nome do item.");
    }

    if (!unidadeMedida) {
      throw new Error("Informe a unidade de medida.");
    }

    const { data, error } = await supabase
      .from("itens_catalogo")
      .insert({
        organizacao_id: orgId,
        segmento_id: item.segmentoId,
        nome,
        descricao: item.descricao?.trim() || null,
        unidade_medida: unidadeMedida,
        codigo_interno: item.codigoInterno?.trim() || null,
        marca_referencia: item.marcaReferencia?.trim() || null,
        especificacao: item.especificacao?.trim() || null,
        ativo: item.ativo ?? true,
      })
      .select(
        `
          *,
          segmentos_itens (
            id,
            organizacao_id,
            nome,
            descricao,
            ativo,
            created_at,
            updated_at
          )
        `,
      )
      .single();

    if (error) {
      tratarErroDuplicidade(
        error,
        "Já existe um item com esse nome no segmento selecionado.",
      );
    }

    return mapItemFromDb(data);
  },

  async editarItem(
    id: string,
    item: AtualizarItemCatalogoInput,
    organizacaoId?: string,
  ): Promise<ItemCatalogo> {
    const orgId = await resolverOrganizacaoId(organizacaoId);
    const payload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (item.segmentoId !== undefined) {
      if (!item.segmentoId) {
        throw new Error("Selecione o segmento do item.");
      }

      payload.segmento_id = item.segmentoId;
    }

    if (item.nome !== undefined) {
      const nome = item.nome.trim();

      if (!nome) {
        throw new Error("Informe o nome do item.");
      }

      payload.nome = nome;
    }

    if (item.descricao !== undefined) {
      payload.descricao = item.descricao?.trim() || null;
    }

    if (item.unidadeMedida !== undefined) {
      const unidadeMedida = item.unidadeMedida.trim().toUpperCase();

      if (!unidadeMedida) {
        throw new Error("Informe a unidade de medida.");
      }

      payload.unidade_medida = unidadeMedida;
    }

    if (item.codigoInterno !== undefined) {
      payload.codigo_interno = item.codigoInterno?.trim() || null;
    }

    if (item.marcaReferencia !== undefined) {
      payload.marca_referencia = item.marcaReferencia?.trim() || null;
    }

    if (item.especificacao !== undefined) {
      payload.especificacao = item.especificacao?.trim() || null;
    }

    if (item.ativo !== undefined) {
      payload.ativo = item.ativo;
    }

    const { data, error } = await supabase
      .from("itens_catalogo")
      .update(payload)
      .eq("id", id)
      .eq("organizacao_id", orgId)
      .select(
        `
          *,
          segmentos_itens (
            id,
            organizacao_id,
            nome,
            descricao,
            ativo,
            created_at,
            updated_at
          )
        `,
      )
      .single();

    if (error) {
      tratarErroDuplicidade(
        error,
        "Já existe um item com esse nome no segmento selecionado.",
      );
    }

    return mapItemFromDb(data);
  },

  async excluirItem(
    id: string,
    organizacaoId?: string,
  ): Promise<void> {
    const orgId = await resolverOrganizacaoId(organizacaoId);

    const { count, error: countError } = await supabase
      .from("itens_fornecedores")
      .select("id", { count: "exact", head: true })
      .eq("organizacao_id", orgId)
      .eq("item_id", id);

    if (countError) throw countError;

    if ((count || 0) > 0) {
      throw new Error(
        "Este item possui fornecedores vinculados e não pode ser excluído.",
      );
    }

    const { error } = await supabase
      .from("itens_catalogo")
      .delete()
      .eq("id", id)
      .eq("organizacao_id", orgId);

    if (error) throw error;
  },

  async listarFornecedoresItem(
    itemId: string,
    organizacaoId?: string,
  ): Promise<ItemFornecedor[]> {
    const orgId = await resolverOrganizacaoId(organizacaoId);

    const { data, error } = await supabase
      .from("itens_fornecedores")
      .select(
        `
          *,
          fornecedores (*)
        `,
      )
      .eq("organizacao_id", orgId)
      .eq("item_id", itemId)
      .order("fornecedor_preferencial", { ascending: false })
      .order("created_at", { ascending: true });

    if (error) throw error;

    return (data || []).map(mapItemFornecedorFromDb);
  },

  async vincularFornecedor(
    item: VincularFornecedorItemInput,
    organizacaoId?: string,
  ): Promise<ItemFornecedor> {
    const orgId = await resolverOrganizacaoId(organizacaoId);

    if (!item.itemId) {
      throw new Error("Informe o item.");
    }

    if (!item.fornecedorId) {
      throw new Error("Selecione o fornecedor.");
    }

    if (item.fornecedorPreferencial) {
      const { error: preferencialError } = await supabase
        .from("itens_fornecedores")
        .update({
          fornecedor_preferencial: false,
          updated_at: new Date().toISOString(),
        })
        .eq("organizacao_id", orgId)
        .eq("item_id", item.itemId);

      if (preferencialError) throw preferencialError;
    }

    const { data, error } = await supabase
      .from("itens_fornecedores")
      .insert({
        organizacao_id: orgId,
        item_id: item.itemId,
        fornecedor_id: item.fornecedorId,
        codigo_fornecedor: item.codigoFornecedor?.trim() || null,
        marca_fornecida: item.marcaFornecida?.trim() || null,
        ultimo_preco:
          item.ultimoPreco === null || item.ultimoPreco === undefined
            ? null
            : Number(item.ultimoPreco),
        prazo_entrega_dias:
          item.prazoEntregaDias === null ||
          item.prazoEntregaDias === undefined
            ? null
            : Number(item.prazoEntregaDias),
        quantidade_minima:
          item.quantidadeMinima === null ||
          item.quantidadeMinima === undefined
            ? null
            : Number(item.quantidadeMinima),
        observacoes: item.observacoes?.trim() || null,
        fornecedor_preferencial: item.fornecedorPreferencial ?? false,
        ativo: item.ativo ?? true,
      })
      .select(
        `
          *,
          fornecedores (*)
        `,
      )
      .single();

    if (error) {
      tratarErroDuplicidade(
        error,
        "Este fornecedor já está vinculado ao item.",
      );
    }

    return mapItemFornecedorFromDb(data);
  },

  async editarFornecedorItem(
    id: string,
    item: AtualizarFornecedorItemInput,
    organizacaoId?: string,
  ): Promise<ItemFornecedor> {
    const orgId = await resolverOrganizacaoId(organizacaoId);

    const { data: vinculoAtual, error: vinculoError } = await supabase
      .from("itens_fornecedores")
      .select("item_id")
      .eq("id", id)
      .eq("organizacao_id", orgId)
      .single();

    if (vinculoError) throw vinculoError;

    if (item.fornecedorPreferencial === true) {
      const { error: preferencialError } = await supabase
        .from("itens_fornecedores")
        .update({
          fornecedor_preferencial: false,
          updated_at: new Date().toISOString(),
        })
        .eq("organizacao_id", orgId)
        .eq("item_id", vinculoAtual.item_id)
        .neq("id", id);

      if (preferencialError) throw preferencialError;
    }

    const payload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (item.codigoFornecedor !== undefined) {
      payload.codigo_fornecedor = item.codigoFornecedor?.trim() || null;
    }

    if (item.marcaFornecida !== undefined) {
      payload.marca_fornecida = item.marcaFornecida?.trim() || null;
    }

    if (item.ultimoPreco !== undefined) {
      payload.ultimo_preco =
        item.ultimoPreco === null ? null : Number(item.ultimoPreco);
    }

    if (item.prazoEntregaDias !== undefined) {
      payload.prazo_entrega_dias =
        item.prazoEntregaDias === null
          ? null
          : Number(item.prazoEntregaDias);
    }

    if (item.quantidadeMinima !== undefined) {
      payload.quantidade_minima =
        item.quantidadeMinima === null
          ? null
          : Number(item.quantidadeMinima);
    }

    if (item.observacoes !== undefined) {
      payload.observacoes = item.observacoes?.trim() || null;
    }

    if (item.fornecedorPreferencial !== undefined) {
      payload.fornecedor_preferencial =
        item.fornecedorPreferencial;
    }

    if (item.ativo !== undefined) {
      payload.ativo = item.ativo;
    }

    const { data, error } = await supabase
      .from("itens_fornecedores")
      .update(payload)
      .eq("id", id)
      .eq("organizacao_id", orgId)
      .select(
        `
          *,
          fornecedores (*)
        `,
      )
      .single();

    if (error) throw error;

    return mapItemFornecedorFromDb(data);
  },

  async removerFornecedor(
    id: string,
    organizacaoId?: string,
  ): Promise<void> {
    const orgId = await resolverOrganizacaoId(organizacaoId);

    const { error } = await supabase
      .from("itens_fornecedores")
      .delete()
      .eq("id", id)
      .eq("organizacao_id", orgId);

    if (error) throw error;
  },

  async listarFornecedoresDisponiveis(
    organizacaoId?: string,
  ): Promise<Fornecedor[]> {
    const orgId = await resolverOrganizacaoId(organizacaoId);

    const { data, error } = await supabase
      .from("fornecedores")
      .select("*")
      .eq("organizacao_id", orgId)
      .order("nome", { ascending: true });

    if (error) throw error;

    return (data || []).map((item: any) => ({
      id: item.id,
      organizacaoId: item.organizacao_id,
      nome: item.nome,
      cnpj: item.cnpj || "",
      email: item.email || "",
      telefone: item.telefone || "",
      historicoCompras: Number(item.historico_compras || 0),
      ultimaCompra: item.ultima_compra || "",
      tempoMedioPagamento: Number(item.tempo_medio_pagamento || 0),
    }));
  },

  async listarItensPorFornecedor(
    fornecedorId: string,
    organizacaoId?: string,
  ): Promise<ItemCatalogo[]> {
    const orgId = await resolverOrganizacaoId(organizacaoId);

    const { data: vinculos, error: vinculosError } = await supabase
      .from("itens_fornecedores")
      .select("item_id")
      .eq("organizacao_id", orgId)
      .eq("fornecedor_id", fornecedorId)
      .eq("ativo", true);

    if (vinculosError) throw vinculosError;

    const itemIds = (vinculos || []).map((item: any) => item.item_id);

    if (itemIds.length === 0) {
      return [];
    }

    const { data, error } = await supabase
      .from("itens_catalogo")
      .select(
        `
          *,
          segmentos_itens (
            id,
            organizacao_id,
            nome,
            descricao,
            ativo,
            created_at,
            updated_at
          ),
          itens_fornecedores (
            *,
            fornecedores (*)
          )
        `,
      )
      .eq("organizacao_id", orgId)
      .in("id", itemIds)
      .order("nome", { ascending: true });

    if (error) throw error;

    return (data || []).map(mapItemFromDb);
  },
};