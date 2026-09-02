import { supabase } from '../lib/supabase';

export type TipoMovimentacaoEstoque = 'entrada' | 'saida' | 'ajuste';
export type UrgenciaEstoque = 'baixa' | 'media' | 'alta';
export type StatusSolicitacaoEstoque = 'pendente' | 'em_cotacao' | 'atendida' | 'cancelada';

export interface EstoqueItem {
  id: string;
  organizacaoId: string;
  empresaId: string;
  itemCatalogoId: string;
  nome: string;
  codigo?: string | null;
  descricao?: string | null;
  unidade: string;
  quantidade: number;
  estoqueMinimo: number;
  localizacao?: string | null;
  ativo: boolean;
  updatedAt?: string | null;
}

export interface MovimentacaoEstoque {
  id: string;
  estoqueItemId: string;
  tipo: TipoMovimentacaoEstoque;
  quantidade: number;
  saldoAnterior: number;
  saldoPosterior: number;
  motivo?: string | null;
  documento?: string | null;
  responsavel?: string | null;
  createdAt: string;
}

export interface SolicitacaoEstoqueItem {
  id: string;
  solicitacaoId: string;
  itemCatalogoId: string;
  descricao: string;
  quantidade: number;
  unidade: string;
  saldoNoMomento: number;
  observacao?: string | null;
}

export interface SolicitacaoEstoque {
  id: string;
  organizacaoId: string;
  empresaId: string;
  titulo: string;
  justificativa?: string | null;
  urgencia: UrgenciaEstoque;
  status: StatusSolicitacaoEstoque;
  solicitadoPor?: string | null;
  cotacaoId?: string | null;
  createdAt: string;
  updatedAt?: string | null;
  itens: SolicitacaoEstoqueItem[];
}

const numero = (valor: unknown) => {
  const n = Number(valor ?? 0);
  return Number.isFinite(n) ? n : 0;
};

const mapEstoqueItem = (row: any): EstoqueItem => {
  const catalogo = row.itens_catalogo || {};
  return {
    id: String(row.id),
    organizacaoId: String(row.organizacao_id),
    empresaId: String(row.empresa_id),
    itemCatalogoId: String(row.item_catalogo_id),
    nome: catalogo.nome || catalogo.descricao || 'Item',
    codigo: catalogo.codigo || catalogo.sku || null,
    descricao: catalogo.descricao || null,
    unidade: catalogo.unidade || catalogo.unidade_medida || 'UN',
    quantidade: numero(row.quantidade),
    estoqueMinimo: numero(row.estoque_minimo),
    localizacao: row.localizacao || null,
    ativo: row.ativo !== false,
    updatedAt: row.updated_at || null,
  };
};

const mapMovimentacao = (row: any): MovimentacaoEstoque => ({
  id: String(row.id),
  estoqueItemId: String(row.estoque_item_id),
  tipo: row.tipo,
  quantidade: numero(row.quantidade),
  saldoAnterior: numero(row.saldo_anterior),
  saldoPosterior: numero(row.saldo_posterior),
  motivo: row.motivo || null,
  documento: row.documento || null,
  responsavel: row.responsavel || null,
  createdAt: row.created_at,
});

const mapSolicitacao = (row: any): SolicitacaoEstoque => ({
  id: String(row.id),
  organizacaoId: String(row.organizacao_id),
  empresaId: String(row.empresa_id),
  titulo: row.titulo || 'Solicitação do estoque',
  justificativa: row.justificativa || null,
  urgencia: row.urgencia || 'media',
  status: row.status || 'pendente',
  solicitadoPor: row.solicitado_por || null,
  cotacaoId: row.cotacao_id || null,
  createdAt: row.created_at,
  updatedAt: row.updated_at || null,
  itens: Array.isArray(row.estoque_solicitacao_itens)
    ? row.estoque_solicitacao_itens.map((item: any) => ({
        id: String(item.id),
        solicitacaoId: String(item.solicitacao_id),
        itemCatalogoId: String(item.item_catalogo_id),
        descricao: item.descricao || 'Item',
        quantidade: numero(item.quantidade),
        unidade: item.unidade || 'UN',
        saldoNoMomento: numero(item.saldo_no_momento),
        observacao: item.observacao || null,
      }))
    : [],
});

export const estoqueService = {
  async listarItens(organizacaoId: string, empresaId: string): Promise<EstoqueItem[]> {
    const { data, error } = await supabase
      .from('estoque_itens')
      .select(`
        *,
        itens_catalogo (*)
      `)
      .eq('organizacao_id', organizacaoId)
      .eq('empresa_id', empresaId)
      .eq('ativo', true)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return (data || []).map(mapEstoqueItem);
  },

  async adicionarItem(params: {
    organizacaoId: string;
    empresaId: string;
    itemCatalogoId: string;
    quantidadeInicial?: number;
    estoqueMinimo?: number;
    localizacao?: string;
    responsavel?: string;
  }): Promise<void> {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;

    const { data, error } = await supabase
      .from('estoque_itens')
      .insert({
        organizacao_id: params.organizacaoId,
        empresa_id: params.empresaId,
        item_catalogo_id: params.itemCatalogoId,
        quantidade: 0,
        estoque_minimo: numero(params.estoqueMinimo),
        localizacao: params.localizacao?.trim() || null,
        ativo: true,
        created_by: userId || null,
        updated_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error) throw error;

    if (numero(params.quantidadeInicial) > 0 && data?.id) {
      const { error: movError } = await supabase.rpc('registrar_movimentacao_estoque', {
        p_estoque_item_id: data.id,
        p_tipo: 'ajuste',
        p_quantidade: numero(params.quantidadeInicial),
        p_motivo: 'Saldo inicial do estoque',
        p_documento: null,
        p_responsavel: params.responsavel || null,
        p_definir_saldo: true,
      });
      if (movError) throw movError;
    }
  },

  async atualizarConfiguracao(itemId: string, params: { estoqueMinimo: number; localizacao?: string }): Promise<void> {
    const { error } = await supabase
      .from('estoque_itens')
      .update({
        estoque_minimo: numero(params.estoqueMinimo),
        localizacao: params.localizacao?.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', itemId);
    if (error) throw error;
  },

  async registrarMovimentacao(params: {
    estoqueItemId: string;
    tipo: 'entrada' | 'saida';
    quantidade: number;
    motivo?: string;
    documento?: string;
    responsavel?: string;
  }): Promise<void> {
    const { error } = await supabase.rpc('registrar_movimentacao_estoque', {
      p_estoque_item_id: params.estoqueItemId,
      p_tipo: params.tipo,
      p_quantidade: numero(params.quantidade),
      p_motivo: params.motivo?.trim() || null,
      p_documento: params.documento?.trim() || null,
      p_responsavel: params.responsavel?.trim() || null,
      p_definir_saldo: false,
    });
    if (error) throw error;
  },

  async listarMovimentacoes(organizacaoId: string, empresaId: string, limite = 100): Promise<MovimentacaoEstoque[]> {
    const { data, error } = await supabase
      .from('estoque_movimentacoes')
      .select('*')
      .eq('organizacao_id', organizacaoId)
      .eq('empresa_id', empresaId)
      .order('created_at', { ascending: false })
      .limit(limite);
    if (error) throw error;
    return (data || []).map(mapMovimentacao);
  },

  async criarSolicitacao(params: {
    organizacaoId: string;
    empresaId: string;
    titulo: string;
    justificativa?: string;
    urgencia: UrgenciaEstoque;
    solicitadoPor?: string;
    itens: Array<{
      itemCatalogoId: string;
      descricao: string;
      quantidade: number;
      unidade: string;
      saldoNoMomento: number;
      observacao?: string;
    }>;
  }): Promise<SolicitacaoEstoque> {
    if (!params.itens.length) throw new Error('Adicione ao menos um item à solicitação.');
    const { data: userData } = await supabase.auth.getUser();

    const { data: solicitacao, error } = await supabase
      .from('estoque_solicitacoes')
      .insert({
        organizacao_id: params.organizacaoId,
        empresa_id: params.empresaId,
        titulo: params.titulo.trim() || 'Solicitação do estoque',
        justificativa: params.justificativa?.trim() || null,
        urgencia: params.urgencia,
        status: 'pendente',
        solicitado_por: params.solicitadoPor?.trim() || null,
        user_id: userData.user?.id || null,
      })
      .select('*')
      .single();
    if (error) throw error;

    const { error: itensError } = await supabase
      .from('estoque_solicitacao_itens')
      .insert(params.itens.map(item => ({
        solicitacao_id: solicitacao.id,
        item_catalogo_id: item.itemCatalogoId,
        descricao: item.descricao,
        quantidade: numero(item.quantidade),
        unidade: item.unidade || 'UN',
        saldo_no_momento: numero(item.saldoNoMomento),
        observacao: item.observacao?.trim() || null,
      })));

    if (itensError) {
      await supabase.from('estoque_solicitacoes').delete().eq('id', solicitacao.id);
      throw itensError;
    }

    return this.buscarSolicitacao(String(solicitacao.id));
  },

  async buscarSolicitacao(id: string): Promise<SolicitacaoEstoque> {
    const { data, error } = await supabase
      .from('estoque_solicitacoes')
      .select('*, estoque_solicitacao_itens (*)')
      .eq('id', id)
      .single();
    if (error) throw error;
    return mapSolicitacao(data);
  },

  async listarSolicitacoes(organizacaoId: string, empresaId: string, status?: StatusSolicitacaoEstoque): Promise<SolicitacaoEstoque[]> {
    let query = supabase
      .from('estoque_solicitacoes')
      .select('*, estoque_solicitacao_itens (*)')
      .eq('organizacao_id', organizacaoId)
      .eq('empresa_id', empresaId)
      .order('created_at', { ascending: false });
    if (status) query = query.eq('status', status);
    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(mapSolicitacao);
  },

  async vincularCotacao(solicitacaoId: string, cotacaoId: string): Promise<void> {
    const { error } = await supabase
      .from('estoque_solicitacoes')
      .update({
        status: 'em_cotacao',
        cotacao_id: cotacaoId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', solicitacaoId);
    if (error) throw error;
  },

  async cancelarSolicitacao(solicitacaoId: string): Promise<void> {
    const { error } = await supabase
      .from('estoque_solicitacoes')
      .update({ status: 'cancelada', updated_at: new Date().toISOString() })
      .eq('id', solicitacaoId)
      .eq('status', 'pendente');
    if (error) throw error;
  },
};
