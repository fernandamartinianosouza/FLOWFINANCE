import { supabase } from "../lib/supabase";

export type StatusOrcamentoSemanal =
  | "aberto"
  | "fechado";

export type PrioridadeCompra =
  | "baixa"
  | "media"
  | "alta"
  | "urgente";

export type StatusItemPlanejamento =
  | "planejado"
  | "adiado"
  | "concluido"
  | "cancelado";

export interface OrcamentoSemanalCompra {
  id: string;
  organizacaoId: string;
  empresaId: string | null;
  dataInicio: string;
  dataFim: string;
  teto: number;
  status: StatusOrcamentoSemanal;
  observacao: string | null;
  fechadoEm: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ItemPlanejamentoSemanal {
  id: string;
  organizacaoId: string;
  orcamentoSemanalId: string;
  processoId: string | null;
  descricao: string;
  fornecedorId: string | null;
  valor: number;
  prioridade: PrioridadeCompra;
  urgente: boolean;
  status: StatusItemPlanejamento;
  dataPlanejada: string | null;
  observacao: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ResumoPlanejamentoSemanal {
  teto: number;
  comprometido: number;
  realizado: number;
  disponivel: number;
  excesso: number;
  economiaPrevista: number;
  percentualUtilizado: number;
  itensAtivos: number;
  itensAdiados: number;
  itensUrgentes: number;
}

const getUser = async () => {
  const { data, error } =
    await supabase.auth.getUser();

  if (error || !data.user) {
    throw new Error("Usuário não autenticado.");
  }

  return data.user;
};

const getUserId = async () =>
  (await getUser()).id;

const mapOrcamento = (
  item: any
): OrcamentoSemanalCompra => ({
  id: item.id,
  organizacaoId: item.organizacao_id,
  empresaId: item.empresa_id,
  dataInicio: item.data_inicio,
  dataFim: item.data_fim,
  teto: Number(item.teto || 0),
  status: item.status,
  observacao: item.observacao,
  fechadoEm: item.fechado_em,
  createdAt: item.created_at,
  updatedAt: item.updated_at,
});

const mapItem = (
  item: any
): ItemPlanejamentoSemanal => ({
  id: item.id,
  organizacaoId: item.organizacao_id,
  orcamentoSemanalId:
    item.orcamento_semanal_id,
  processoId: item.processo_id,
  descricao: item.descricao,
  fornecedorId: item.fornecedor_id,
  valor: Number(item.valor || 0),
  prioridade: item.prioridade,
  urgente: Boolean(item.urgente),
  status: item.status,
  dataPlanejada: item.data_planejada,
  observacao: item.observacao,
  createdAt: item.created_at,
  updatedAt: item.updated_at,
});

export const planejamentoSemanalService = {
  async listarOrcamentos(
    organizacaoId: string,
    empresaId?: string | null
  ) {
    let query = supabase
      .from("orcamentos_semanais_compras")
      .select("*")
      .eq("organizacao_id", organizacaoId)
      .order("data_inicio", {
        ascending: false,
      });

    if (empresaId) {
      query = query.eq(
        "empresa_id",
        empresaId
      );
    }

    const { data, error } = await query;

    if (error) throw error;

    return (data || []).map(mapOrcamento);
  },

  async buscarOrcamentoPorPeriodo(
    organizacaoId: string,
    dataInicio: string,
    empresaId?: string | null
  ) {
    let query = supabase
      .from("orcamentos_semanais_compras")
      .select("*")
      .eq("organizacao_id", organizacaoId)
      .eq("data_inicio", dataInicio);

    if (empresaId) {
      query = query.eq(
        "empresa_id",
        empresaId
      );
    } else {
      query = query.is("empresa_id", null);
    }

    const { data, error } =
      await query.maybeSingle();

    if (error) throw error;

    return data ? mapOrcamento(data) : null;
  },

  async salvarOrcamento(params: {
    id?: string;
    organizacaoId: string;
    empresaId?: string | null;
    dataInicio: string;
    dataFim: string;
    teto: number;
    observacao?: string | null;
  }) {
    const userId = await getUserId();

    const payload = {
      organizacao_id: params.organizacaoId,
      empresa_id: params.empresaId || null,
      data_inicio: params.dataInicio,
      data_fim: params.dataFim,
      teto: Number(params.teto || 0),
      observacao:
        params.observacao?.trim() || null,
      user_id: userId,
      updated_at: new Date().toISOString(),
    };

    if (params.id) {
      const { data, error } = await supabase
        .from("orcamentos_semanais_compras")
        .update(payload)
        .eq("id", params.id)
        .eq(
          "organizacao_id",
          params.organizacaoId
        )
        .select()
        .single();

      if (error) throw error;
      return mapOrcamento(data);
    }

    const { data, error } = await supabase
      .from("orcamentos_semanais_compras")
      .insert(payload)
      .select()
      .single();

    if (error) throw error;

    return mapOrcamento(data);
  },

  async listarItens(
    orcamentoSemanalId: string,
    organizacaoId: string
  ) {
    const { data, error } = await supabase
      .from("orcamento_semanal_itens")
      .select("*")
      .eq(
        "orcamento_semanal_id",
        orcamentoSemanalId
      )
      .eq("organizacao_id", organizacaoId)
      .order("urgente", {
        ascending: false,
      })
      .order("created_at", {
        ascending: true,
      });

    if (error) throw error;

    return (data || []).map(mapItem);
  },

  async adicionarItem(params: {
    organizacaoId: string;
    orcamentoSemanalId: string;
    processoId?: string | null;
    descricao: string;
    fornecedorId?: string | null;
    valor: number;
    prioridade: PrioridadeCompra;
    urgente?: boolean;
    dataPlanejada?: string | null;
    observacao?: string | null;
  }) {
    const userId = await getUserId();

    const { data, error } = await supabase
      .from("orcamento_semanal_itens")
      .insert({
        organizacao_id:
          params.organizacaoId,
        orcamento_semanal_id:
          params.orcamentoSemanalId,
        processo_id:
          params.processoId || null,
        descricao: params.descricao.trim(),
        fornecedor_id:
          params.fornecedorId || null,
        valor: Number(params.valor || 0),
        prioridade: params.prioridade,
        urgente: Boolean(params.urgente),
        status: "planejado",
        data_planejada:
          params.dataPlanejada || null,
        observacao:
          params.observacao?.trim() || null,
        user_id: userId,
      })
      .select()
      .single();

    if (error) throw error;

    return mapItem(data);
  },

  async atualizarItem(
    id: string,
    organizacaoId: string,
    dados: Partial<{
      descricao: string;
      fornecedorId: string | null;
      valor: number;
      prioridade: PrioridadeCompra;
      urgente: boolean;
      status: StatusItemPlanejamento;
      dataPlanejada: string | null;
      observacao: string | null;
      orcamentoSemanalId: string;
    }>
  ) {
    const payload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (dados.descricao !== undefined) {
      payload.descricao =
        dados.descricao.trim();
    }

    if (dados.fornecedorId !== undefined) {
      payload.fornecedor_id =
        dados.fornecedorId || null;
    }

    if (dados.valor !== undefined) {
      payload.valor = Number(
        dados.valor || 0
      );
    }

    if (dados.prioridade !== undefined) {
      payload.prioridade =
        dados.prioridade;
    }

    if (dados.urgente !== undefined) {
      payload.urgente =
        Boolean(dados.urgente);
    }

    if (dados.status !== undefined) {
      payload.status = dados.status;
    }

    if (
      dados.dataPlanejada !== undefined
    ) {
      payload.data_planejada =
        dados.dataPlanejada || null;
    }

    if (dados.observacao !== undefined) {
      payload.observacao =
        dados.observacao?.trim() || null;
    }

    if (
      dados.orcamentoSemanalId !==
      undefined
    ) {
      payload.orcamento_semanal_id =
        dados.orcamentoSemanalId;
    }

    const { data, error } = await supabase
      .from("orcamento_semanal_itens")
      .update(payload)
      .eq("id", id)
      .eq("organizacao_id", organizacaoId)
      .select()
      .single();

    if (error) throw error;

    return mapItem(data);
  },

  async excluirItem(
    id: string,
    organizacaoId: string
  ) {
    const { error } = await supabase
      .from("orcamento_semanal_itens")
      .delete()
      .eq("id", id)
      .eq("organizacao_id", organizacaoId);

    if (error) throw error;
  },

  async fecharSemana(
    id: string,
    organizacaoId: string
  ) {
    const { data, error } = await supabase
      .from("orcamentos_semanais_compras")
      .update({
        status: "fechado",
        fechado_em:
          new Date().toISOString(),
        updated_at:
          new Date().toISOString(),
      })
      .eq("id", id)
      .eq("organizacao_id", organizacaoId)
      .select()
      .single();

    if (error) throw error;

    return mapOrcamento(data);
  },

  async reabrirSemana(
    id: string,
    organizacaoId: string
  ) {
    const { data, error } = await supabase
      .from("orcamentos_semanais_compras")
      .update({
        status: "aberto",
        fechado_em: null,
        updated_at:
          new Date().toISOString(),
      })
      .eq("id", id)
      .eq("organizacao_id", organizacaoId)
      .select()
      .single();

    if (error) throw error;

    return mapOrcamento(data);
  },

  calcularResumo(
    orcamento:
      | OrcamentoSemanalCompra
      | null,
    itens: ItemPlanejamentoSemanal[]
  ): ResumoPlanejamentoSemanal {
    const teto = Number(
      orcamento?.teto || 0
    );

    const itensAtivos = itens.filter(
      item =>
        item.status === "planejado" ||
        item.status === "concluido"
    );

    const comprometido =
      itensAtivos.reduce(
        (total, item) =>
          total + Number(item.valor || 0),
        0
      );

    const realizado = itens
      .filter(
        item => item.status === "concluido"
      )
      .reduce(
        (total, item) =>
          total + Number(item.valor || 0),
        0
      );

    const disponivel = Math.max(
      teto - comprometido,
      0
    );

    const excesso = Math.max(
      comprometido - teto,
      0
    );

    const percentualUtilizado =
      teto > 0
        ? (comprometido / teto) * 100
        : 0;

    return {
      teto,
      comprometido,
      realizado,
      disponivel,
      excesso,
      economiaPrevista:
        excesso > 0 ? 0 : disponivel,
      percentualUtilizado,
      itensAtivos: itensAtivos.length,
      itensAdiados: itens.filter(
        item => item.status === "adiado"
      ).length,
      itensUrgentes: itens.filter(
        item =>
          item.urgente &&
          item.status === "planejado"
      ).length,
    };
  },
};
