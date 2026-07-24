import { supabase } from '../lib/supabase';

export type StatusCotacao =
  | 'aberta'
  | 'em_analise'
  | 'finalizada'
  | 'cancelada';

export interface ItemCatalogoCotacao {
  id: string;
  nome: string;
  descricao: string;
  unidade: string;
  codigo?: string | null;
}

export interface FornecedorCatalogoCotacao {
  vinculoId: string;
  itemCatalogoId: string;
  fornecedorId: string;
  fornecedorNome: string;
  fornecedorCnpj?: string | null;
  valorUnitario: number;
  marca?: string | null;
  prazoEntregaDias?: number | null;
  condicaoPagamento?: string | null;
  tipoFrete?: string | null;
  valorFrete: number;
  preferencial: boolean;
  ativo: boolean;
}

export interface CotacaoItem {
  id: string;
  cotacaoId: string;
  itemCatalogoId?: string | null;
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
  tipoFrete?: string | null;
  frete: number;
  desconto: number;
  observacao?: string | null;
  selecionada: boolean;
  itens: CotacaoPropostaItem[];
  createdAt?: string;
}

export interface Cotacao {
  id: string;
  processoId?: string | null;
  titulo: string;
  observacao?: string | null;
  justificativaEscolha?: string | null;
  solicitacaoGerada: boolean;
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
  titulo: string;
  observacao?: string;
  criadoPor?: string;
  itens: Array<{
    itemCatalogoId: string;
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
  tipoFrete?: string | null;
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

const primeiroTexto = (...valores: unknown[]): string => {
  const valor = valores.find(
    item =>
      item !== null &&
      item !== undefined &&
      String(item).trim() !== ''
  );

  return valor === undefined ? '' : String(valor);
};

const booleano = (...valores: unknown[]): boolean => {
  const valor = valores.find(
    item => item !== null && item !== undefined
  );

  if (typeof valor === 'string') {
    return ['true', '1', 'sim', 'ativo'].includes(
      valor.toLowerCase()
    );
  }

  return Boolean(valor);
};

const getUserId = async (): Promise<string> => {
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    throw new Error('Usuário não autenticado.');
  }

  return data.user.id;
};

const mapCotacaoItem = (item: any): CotacaoItem => ({
  id: String(item.id),
  cotacaoId: String(item.cotacao_id),
  itemCatalogoId: item.item_catalogo_id || null,
  descricao: item.descricao || '',
  quantidade: numeroSeguro(item.quantidade),
  unidade: item.unidade || 'UN',
  especificacao: item.especificacao || null,
  createdAt: item.created_at,
});

const mapPropostaItem = (item: any): CotacaoPropostaItem => ({
  id: String(item.id),
  propostaId: String(item.proposta_id),
  cotacaoItemId: String(item.cotacao_item_id),
  valorUnitario: numeroSeguro(item.valor_unitario),
  valorTotal: numeroSeguro(item.valor_total),
  marca: item.marca || null,
  observacao: item.observacao || null,
});

const mapProposta = (item: any): CotacaoProposta => ({
  id: String(item.id),
  cotacaoId: String(item.cotacao_id),
  fornecedorId: String(item.fornecedor_id),
  prazoEntregaDias:
    item.prazo_entrega_dias === null ||
    item.prazo_entrega_dias === undefined
      ? null
      : numeroSeguro(item.prazo_entrega_dias),
  condicaoPagamento: item.condicao_pagamento || null,
  tipoFrete: item.tipo_frete || null,
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
  id: String(item.id),
  processoId: item.processo_id || null,
  titulo: item.titulo || 'Cotação',
  observacao: item.observacao || null,
  justificativaEscolha: item.justificativa_escolha || null,
  solicitacaoGerada: Boolean(item.solicitacao_gerada),
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
  async listarItensCatalogo(): Promise<ItemCatalogoCotacao[]> {
    const { data, error } = await supabase
      .from('itens_catalogo')
      .select('*')
      .order('nome', { ascending: true });

    if (error) throw error;

    return (data || [])
      .filter((item: any) => item.ativo !== false)
      .map((item: any) => ({
        id: String(item.id),
        nome: primeiroTexto(
          item.nome,
          item.descricao,
          item.item,
          'Item sem nome'
        ),
        descricao: primeiroTexto(item.descricao, item.nome),
        unidade: primeiroTexto(
          item.unidade,
          item.unidade_medida,
          'UN'
        ),
        codigo:
          primeiroTexto(item.codigo, item.sku) || null,
      }));
  },

  async listarFornecedoresDoItem(
    itemCatalogoId: string
  ): Promise<FornecedorCatalogoCotacao[]> {
    const { data: vinculos, error } = await supabase
      .from('itens_fornecedores')
      .select('*')
      .eq('item_id', itemCatalogoId);

    if (error) throw error;

    const fornecedorIds = Array.from(
      new Set(
        (vinculos || [])
          .map((item: any) => String(item.fornecedor_id || ''))
          .filter(Boolean)
      )
    );

    let fornecedoresPorId = new Map<string, any>();

    if (fornecedorIds.length) {
      const { data: fornecedores, error: erroFornecedores } =
        await supabase
          .from('fornecedores')
          .select('id, nome, cnpj')
          .in('id', fornecedorIds);

      if (erroFornecedores) throw erroFornecedores;

      fornecedoresPorId = new Map(
        (fornecedores || []).map((fornecedor: any) => [
          String(fornecedor.id),
          fornecedor,
        ])
      );
    }

    return (vinculos || [])
      .map((item: any) => {
        const fornecedorId = String(item.fornecedor_id || '');
        const fornecedor = fornecedoresPorId.get(fornecedorId);

        return {
          vinculoId: String(item.id),
          itemCatalogoId: String(item.item_id),
          fornecedorId,
          fornecedorNome: primeiroTexto(
            fornecedor?.nome,
            item.fornecedor_nome,
            'Fornecedor'
          ),
          fornecedorCnpj:
            primeiroTexto(
              fornecedor?.cnpj,
              item.fornecedor_cnpj
            ) || null,
          valorUnitario:
            numeroSeguro(item.preco) ||
            numeroSeguro(item.preco_unitario) ||
            numeroSeguro(item.ultimo_preco) ||
            numeroSeguro(item.valor_unitario),
          marca:
            primeiroTexto(
              item.marca,
              item.marca_fornecida
            ) || null,
          prazoEntregaDias:
            item.prazo_entrega_dias === null ||
            item.prazo_entrega_dias === undefined
              ? item.prazo_dias === null ||
                item.prazo_dias === undefined
                ? null
                : numeroSeguro(item.prazo_dias)
              : numeroSeguro(item.prazo_entrega_dias),
          condicaoPagamento:
            primeiroTexto(
              item.condicao_pagamento,
              item.tipo_faturamento,
              item.faturamento,
              item.prazo_pagamento
            ) || null,
          tipoFrete:
            primeiroTexto(
              item.tipo_frete,
              item.frete_tipo
            ) || null,
          valorFrete:
            numeroSeguro(item.valor_frete) ||
            numeroSeguro(item.frete),
          preferencial: booleano(
            item.preferencial,
            item.fornecedor_preferencial
          ),
          ativo:
            item.ativo === undefined
              ? true
              : booleano(item.ativo),
        };
      })
      .filter(
        (item: FornecedorCatalogoCotacao) =>
          item.fornecedorId && item.ativo
      );
  },

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

  async criarCotacao(
    params: CriarCotacaoParams
  ): Promise<Cotacao> {
    const userId = await getUserId();

    if (!params.itens.length) {
      throw new Error('Adicione ao menos um item.');
    }

    const { data: cotacao, error: erroCotacao } = await supabase
      .from('cotacoes')
      .insert({
        user_id: userId,
        processo_id: null,
        titulo: params.titulo,
        observacao: params.observacao || null,
        criado_por: params.criadoPor || null,
        status: 'aberta',
        solicitacao_gerada: false,
      })
      .select()
      .single();

    if (erroCotacao) throw erroCotacao;

    const payload = params.itens.map(item => ({
      cotacao_id: cotacao.id,
      item_catalogo_id: item.itemCatalogoId,
      descricao: item.descricao,
      quantidade: numeroSeguro(item.quantidade),
      unidade: item.unidade || 'UN',
      especificacao: item.especificacao || null,
    }));

    const { error: erroItens } = await supabase
      .from('cotacao_itens')
      .insert(payload);

    if (erroItens) {
      await supabase
        .from('cotacoes')
        .delete()
        .eq('id', cotacao.id);

      throw erroItens;
    }

    return this.buscarCotacaoPorId(cotacao.id);
  },

  async salvarProposta(
    params: SalvarPropostaParams
  ): Promise<CotacaoProposta> {
    if (!params.itens.length) {
      throw new Error('Informe os preços dos itens.');
    }

    const { data: proposta, error: erroProposta } =
      await supabase
        .from('cotacao_propostas')
        .insert({
          cotacao_id: params.cotacaoId,
          fornecedor_id: params.fornecedorId,
          prazo_entrega_dias:
            params.prazoEntregaDias ?? null,
          condicao_pagamento:
            params.condicaoPagamento || null,
          tipo_frete: params.tipoFrete || null,
          frete: numeroSeguro(params.frete),
          desconto: numeroSeguro(params.desconto),
          observacao: params.observacao || null,
          selecionada: false,
        })
        .select()
        .single();

    if (erroProposta) throw erroProposta;

    const ids = params.itens.map(
      item => item.cotacaoItemId
    );

    const { data: itensCotacao, error: erroBusca } =
      await supabase
        .from('cotacao_itens')
        .select('id, quantidade')
        .in('id', ids);

    if (erroBusca) {
      await supabase
        .from('cotacao_propostas')
        .delete()
        .eq('id', proposta.id);

      throw erroBusca;
    }

    const quantidades = new Map(
      (itensCotacao || []).map((item: any) => [
        String(item.id),
        numeroSeguro(item.quantidade),
      ])
    );

    const itensPayload = params.itens.map(item => {
      const valorUnitario = numeroSeguro(
        item.valorUnitario
      );
      const quantidade =
        quantidades.get(item.cotacaoItemId) || 0;

      return {
        proposta_id: proposta.id,
        cotacao_item_id: item.cotacaoItemId,
        valor_unitario: valorUnitario,
        valor_total: valorUnitario * quantidade,
        marca: item.marca || null,
        observacao: item.observacao || null,
      };
    });

    const { error: erroItens } = await supabase
      .from('cotacao_proposta_itens')
      .insert(itensPayload);

    if (erroItens) {
      await supabase
        .from('cotacao_propostas')
        .delete()
        .eq('id', proposta.id);

      throw erroItens;
    }

    const atualizada = await this.buscarCotacaoPorId(
      params.cotacaoId
    );

    const criada = atualizada.propostas.find(
      item => item.id === proposta.id
    );

    if (!criada) {
      throw new Error(
        'Proposta criada, mas não foi possível carregá-la.'
      );
    }

    return criada;
  },

  async excluirProposta(
    propostaId: string
  ): Promise<void> {
    const { error } = await supabase
      .from('cotacao_propostas')
      .delete()
      .eq('id', propostaId);

    if (error) throw error;
  },

  async selecionarProposta(
    cotacaoId: string,
    propostaId: string,
    fornecedorId: string,
    justificativa?: string
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
        justificativa_escolha:
          justificativa || null,
        status: 'finalizada',
        updated_at: new Date().toISOString(),
      })
      .eq('id', cotacaoId);

    if (erroCotacao) throw erroCotacao;

    return this.buscarCotacaoPorId(cotacaoId);
  },

  async marcarSolicitacaoGerada(
    cotacaoId: string,
    processoId?: string | null
  ): Promise<void> {
    const payload: Record<string, unknown> = {
      solicitacao_gerada: true,
      updated_at: new Date().toISOString(),
    };

    if (processoId) {
      payload.processo_id = processoId;
    }

    const { error } = await supabase
      .from('cotacoes')
      .update(payload)
      .eq('id', cotacaoId);

    if (error) throw error;
  },

  calcularTotalProposta(
    proposta: CotacaoProposta
  ): number {
    const subtotal = proposta.itens.reduce(
      (total, item) =>
        total + numeroSeguro(item.valorTotal),
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