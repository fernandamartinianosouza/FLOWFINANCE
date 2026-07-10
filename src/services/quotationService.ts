import { supabase } from '../lib/supabase';

export type StatusCotacao =
  | 'aberta'
  | 'em_analise'
  | 'finalizada'
  | 'cancelada';

export interface CotacaoItem {
  id: string;
  cotacaoId: string;
  descricao: string;
  quantidade: number;
  unidade: string;
  especificacao?: string | null;
  createdAt?: string;
}

export interface CotacaoPropostaItem {
  id: string;
  propostaId: string;
  cotacaoItemId: string;
  valorUnitario: number;
  valorTotal: number;
  marca?: string | null;
  observacao?: string | null;
}

export interface CotacaoProposta {
  id: string;
  cotacaoId: string;
  fornecedorId: string;
  prazoEntregaDias?: number | null;
  condicaoPagamento?: string | null;
  frete: number;
  desconto: number;
  observacao?: string | null;
  selecionada: boolean;
  itens: CotacaoPropostaItem[];
  createdAt?: string;
}

export interface Cotacao {
  id: string;
  processoId: string;
  titulo: string;
  observacao?: string | null;
  status: StatusCotacao;
  fornecedorEscolhidoId?: string | null;
  propostaEscolhidaId?: string | null;
  criadoPor?: string | null;
  itens: CotacaoItem[];
  propostas: CotacaoProposta[];
  createdAt?: string;
  updatedAt?: string;
}

interface CriarCotacaoParams {
  processoDbId: string;
  titulo: string;
  observacao?: string;
  criadoPor?: string;
  itens: Array<{
    descricao: string;
    quantidade: number;
    unidade: string;
    especificacao?: string;
  }>;
}

interface SalvarPropostaParams {
  cotacaoId: string;
  fornecedorId: string;
  prazoEntregaDias?: number | null;
  condicaoPagamento?: string | null;
  frete?: number;
  desconto?: number;
  observacao?: string | null;
  itens: Array<{
    cotacaoItemId: string;
    valorUnitario: number;
    marca?: string;
    observacao?: string;
  }>;
}

const numeroSeguro = (valor: unknown): number => {
  const numero = Number(valor ?? 0);
  return Number.isFinite(numero) ? numero : 0;
};

const getUserId = async (): Promise<string> => {
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    throw new Error('Usuário não autenticado.');
  }

  return data.user.id;
};

const mapCotacaoItem = (item: any): CotacaoItem => ({
  id: item.id,
  cotacaoId: item.cotacao_id,
  descricao: item.descricao,
  quantidade: numeroSeguro(item.quantidade),
  unidade: item.unidade || 'UN',
  especificacao: item.especificacao || null,
  createdAt: item.created_at,
});

const mapPropostaItem = (item: any): CotacaoPropostaItem => ({
  id: item.id,
  propostaId: item.proposta_id,
  cotacaoItemId: item.cotacao_item_id,
  valorUnitario: numeroSeguro(item.valor_unitario),
  valorTotal: numeroSeguro(item.valor_total),
  marca: item.marca || null,
  observacao: item.observacao || null,
});

const mapProposta = (item: any): CotacaoProposta => ({
  id: item.id,
  cotacaoId: item.cotacao_id,
  fornecedorId: item.fornecedor_id,
  prazoEntregaDias:
    item.prazo_entrega_dias === null
      ? null
      : numeroSeguro(item.prazo_entrega_dias),
  condicaoPagamento: item.condicao_pagamento || null,
  frete: numeroSeguro(item.frete),
  desconto: numeroSeguro(item.desconto),
  observacao: item.observacao || null,
  selecionada: Boolean(item.selecionada),
  itens: Array.isArray(item.cotacao_proposta_itens)
    ? item.cotacao_proposta_itens.map(mapPropostaItem)
    : [],
  createdAt: item.created_at,
});

const mapCotacao = (item: any): Cotacao => ({
  id: item.id,
  processoId: item.processo_id,
  titulo: item.titulo,
  observacao: item.observacao || null,
  status: item.status || 'aberta',
  fornecedorEscolhidoId: item.fornecedor_escolhido_id || null,
  propostaEscolhidaId: item.proposta_escolhida_id || null,
  criadoPor: item.criado_por || null,
  itens: Array.isArray(item.cotacao_itens)
    ? item.cotacao_itens.map(mapCotacaoItem)
    : [],
  propostas: Array.isArray(item.cotacao_propostas)
    ? item.cotacao_propostas.map(mapProposta)
    : [],
  createdAt: item.created_at,
  updatedAt: item.updated_at,
});

export const quotationService = {
  async listarCotacoes(): Promise<Cotacao[]> {
    const { data, error } = await supabase
      .from('cotacoes')
      .select(`
        *,
        cotacao_itens (*),
        cotacao_propostas (
          *,
          cotacao_proposta_itens (*)
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(mapCotacao);
  },

  async buscarCotacaoPorId(id: string): Promise<Cotacao> {
    const { data, error } = await supabase
      .from('cotacoes')
      .select(`
        *,
        cotacao_itens (*),
        cotacao_propostas (
          *,
          cotacao_proposta_itens (*)
        )
      `)
      .eq('id', id)
      .single();

    if (error) throw error;

    return mapCotacao(data);
  },

  async buscarCotacaoPorProcesso(
    processoDbId: string
  ): Promise<Cotacao | null> {
    const { data, error } = await supabase
      .from('cotacoes')
      .select(`
        *,
        cotacao_itens (*),
        cotacao_propostas (
          *,
          cotacao_proposta_itens (*)
        )
      `)
      .eq('processo_id', processoDbId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    return data ? mapCotacao(data) : null;
  },

  async criarCotacao(params: CriarCotacaoParams): Promise<Cotacao> {
    const userId = await getUserId();

    if (!params.itens.length) {
      throw new Error('Adicione ao menos um item à cotação.');
    }

    const { data: cotacaoCriada, error: erroCotacao } = await supabase
      .from('cotacoes')
      .insert({
        user_id: userId,
        processo_id: params.processoDbId,
        titulo: params.titulo,
        observacao: params.observacao || null,
        criado_por: params.criadoPor || null,
        status: 'aberta',
      })
      .select()
      .single();

    if (erroCotacao) throw erroCotacao;

    const itensPayload = params.itens.map(item => ({
      cotacao_id: cotacaoCriada.id,
      descricao: item.descricao,
      quantidade: numeroSeguro(item.quantidade),
      unidade: item.unidade || 'UN',
      especificacao: item.especificacao || null,
    }));

    const { error: erroItens } = await supabase
      .from('cotacao_itens')
      .insert(itensPayload);

    if (erroItens) {
      await supabase
        .from('cotacoes')
        .delete()
        .eq('id', cotacaoCriada.id);

      throw erroItens;
    }

    return this.buscarCotacaoPorId(cotacaoCriada.id);
  },

  async atualizarCotacao(
    id: string,
    dados: {
      titulo?: string;
      observacao?: string | null;
      status?: StatusCotacao;
    }
  ): Promise<Cotacao> {
    const payload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (dados.titulo !== undefined) {
      payload.titulo = dados.titulo;
    }

    if (dados.observacao !== undefined) {
      payload.observacao = dados.observacao;
    }

    if (dados.status !== undefined) {
      payload.status = dados.status;
    }

    const { error } = await supabase
      .from('cotacoes')
      .update(payload)
      .eq('id', id);

    if (error) throw error;

    return this.buscarCotacaoPorId(id);
  },

  async adicionarItem(
    cotacaoId: string,
    item: {
      descricao: string;
      quantidade: number;
      unidade: string;
      especificacao?: string;
    }
  ): Promise<CotacaoItem> {
    const { data, error } = await supabase
      .from('cotacao_itens')
      .insert({
        cotacao_id: cotacaoId,
        descricao: item.descricao,
        quantidade: numeroSeguro(item.quantidade),
        unidade: item.unidade || 'UN',
        especificacao: item.especificacao || null,
      })
      .select()
      .single();

    if (error) throw error;

    return mapCotacaoItem(data);
  },

  async excluirItem(itemId: string): Promise<void> {
    const { error } = await supabase
      .from('cotacao_itens')
      .delete()
      .eq('id', itemId);

    if (error) throw error;
  },

  async salvarProposta(
    params: SalvarPropostaParams
  ): Promise<CotacaoProposta> {
    if (!params.itens.length) {
      throw new Error('Informe os preços dos itens da proposta.');
    }

    const { data: propostaCriada, error: erroProposta } = await supabase
      .from('cotacao_propostas')
      .insert({
        cotacao_id: params.cotacaoId,
        fornecedor_id: params.fornecedorId,
        prazo_entrega_dias: params.prazoEntregaDias ?? null,
        condicao_pagamento: params.condicaoPagamento || null,
        frete: numeroSeguro(params.frete),
        desconto: numeroSeguro(params.desconto),
        observacao: params.observacao || null,
        selecionada: false,
      })
      .select()
      .single();

    if (erroProposta) throw erroProposta;

    const itensCotacaoIds = params.itens.map(item => item.cotacaoItemId);

    const { data: itensCotacao, error: erroBuscaItens } = await supabase
      .from('cotacao_itens')
      .select('id, quantidade')
      .in('id', itensCotacaoIds);

    if (erroBuscaItens) {
      await supabase
        .from('cotacao_propostas')
        .delete()
        .eq('id', propostaCriada.id);

      throw erroBuscaItens;
    }

    const quantidades = new Map(
      (itensCotacao || []).map(item => [
        item.id,
        numeroSeguro(item.quantidade),
      ])
    );

    const itensPropostaPayload = params.itens.map(item => {
      const quantidade = quantidades.get(item.cotacaoItemId) || 0;
      const valorUnitario = numeroSeguro(item.valorUnitario);

      return {
        proposta_id: propostaCriada.id,
        cotacao_item_id: item.cotacaoItemId,
        valor_unitario: valorUnitario,
        valor_total: valorUnitario * quantidade,
        marca: item.marca || null,
        observacao: item.observacao || null,
      };
    });

    const { error: erroItens } = await supabase
      .from('cotacao_proposta_itens')
      .insert(itensPropostaPayload);

    if (erroItens) {
      await supabase
        .from('cotacao_propostas')
        .delete()
        .eq('id', propostaCriada.id);

      throw erroItens;
    }

    const cotacaoAtualizada = await this.buscarCotacaoPorId(
      params.cotacaoId
    );

    const proposta = cotacaoAtualizada.propostas.find(
      item => item.id === propostaCriada.id
    );

    if (!proposta) {
      throw new Error('Proposta criada, mas não foi possível carregá-la.');
    }

    return proposta;
  },

  async excluirProposta(propostaId: string): Promise<void> {
    const { error } = await supabase
      .from('cotacao_propostas')
      .delete()
      .eq('id', propostaId);

    if (error) throw error;
  },

  async selecionarProposta(
    cotacaoId: string,
    propostaId: string,
    fornecedorId: string
  ): Promise<Cotacao> {
    const { error: erroLimpar } = await supabase
      .from('cotacao_propostas')
      .update({ selecionada: false })
      .eq('cotacao_id', cotacaoId);

    if (erroLimpar) throw erroLimpar;

    const { error: erroSelecionar } = await supabase
      .from('cotacao_propostas')
      .update({ selecionada: true })
      .eq('id', propostaId)
      .eq('cotacao_id', cotacaoId);

    if (erroSelecionar) throw erroSelecionar;

    const { error: erroCotacao } = await supabase
      .from('cotacoes')
      .update({
        fornecedor_escolhido_id: fornecedorId,
        proposta_escolhida_id: propostaId,
        status: 'finalizada',
        updated_at: new Date().toISOString(),
      })
      .eq('id', cotacaoId);

    if (erroCotacao) throw erroCotacao;

    return this.buscarCotacaoPorId(cotacaoId);
  },

  calcularTotalProposta(proposta: CotacaoProposta): number {
    const subtotal = proposta.itens.reduce(
      (total, item) => total + numeroSeguro(item.valorTotal),
      0
    );

    return Math.max(
      0,
      subtotal +
        numeroSeguro(proposta.frete) -
        numeroSeguro(proposta.desconto)
    );
  },

  obterMelhorPreco(
    propostas: CotacaoProposta[]
  ): CotacaoProposta | null {
    if (!propostas.length) return null;

    return [...propostas].sort(
      (a, b) =>
        this.calcularTotalProposta(a) -
        this.calcularTotalProposta(b)
    )[0];
  },

  async excluirCotacao(id: string): Promise<void> {
    const { error } = await supabase
      .from('cotacoes')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },
};