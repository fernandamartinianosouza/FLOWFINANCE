import { supabase } from '../lib/supabase';

export interface OrcamentoMensal {
  id: string;
  empresaId: string;
  planoFinanceiroId: string;
  centroCustoId: string | null;
  ano: number;
  mes: number;
  valorOrcado: number;
  valorComprometido: number;
  valorUtilizado: number;
  disponivel: number;
  observacao: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CriarOrcamentoMensalInput {
  empresaId: string;
  planoFinanceiroId: string;
  centroCustoId?: string | null;
  ano: number;
  mes: number;
  valorOrcado: number;
  valorComprometido?: number;
  valorUtilizado?: number;
  observacao?: string | null;
}

export interface AtualizarOrcamentoMensalInput {
  valorOrcado?: number;
  valorComprometido?: number;
  valorUtilizado?: number;
  observacao?: string | null;
}

export interface CopiarOrcamentoInput {
  orcamentoId: string;
  anoDestino: number;
  mesDestino: number;
}

const numeroSeguro = (valor: unknown) => {
  const numero = Number(valor ?? 0);
  return Number.isFinite(numero) ? numero : 0;
};

const validarCompetencia = (ano: number, mes: number) => {
  if (!Number.isInteger(ano) || ano < 2000 || ano > 2200) {
    throw new Error('Ano da competência inválido.');
  }

  if (!Number.isInteger(mes) || mes < 1 || mes > 12) {
    throw new Error('Mês da competência inválido.');
  }
};

const validarValorNaoNegativo = (
  valor: number,
  nomeCampo: string
) => {
  if (!Number.isFinite(valor) || valor < 0) {
    throw new Error(`${nomeCampo} deve ser maior ou igual a zero.`);
  }
};

const mapOrcamentoFromDb = (item: any): OrcamentoMensal => {
  const valorOrcado = numeroSeguro(item.valor_orcado);
  const valorComprometido = numeroSeguro(item.valor_comprometido);
  const valorUtilizado = numeroSeguro(item.valor_utilizado);

  return {
    id: item.id,
    empresaId: item.empresa_id,
    planoFinanceiroId: item.plano_financeiro_id,
    centroCustoId: item.centro_custo_id ?? null,
    ano: Number(item.ano),
    mes: Number(item.mes),
    valorOrcado,
    valorComprometido,
    valorUtilizado,
    disponivel: valorOrcado - valorComprometido - valorUtilizado,
    observacao: item.observacao ?? null,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
  };
};

const getUserId = async () => {
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    throw new Error('Usuário não autenticado.');
  }

  return data.user.id;
};

export const orcamentoService = {
  async listarPorCompetencia(params: {
    empresaId: string;
    ano: number;
    mes: number;
    planoFinanceiroId?: string;
    centroCustoId?: string | null;
  }): Promise<OrcamentoMensal[]> {
    validarCompetencia(params.ano, params.mes);

    let query = supabase
      .from('orcamentos_mensais')
      .select('*')
      .eq('empresa_id', params.empresaId)
      .eq('ano', params.ano)
      .eq('mes', params.mes)
      .order('created_at', { ascending: true });

    if (params.planoFinanceiroId) {
      query = query.eq('plano_financeiro_id', params.planoFinanceiroId);
    }

    if (params.centroCustoId !== undefined) {
      query =
        params.centroCustoId === null
          ? query.is('centro_custo_id', null)
          : query.eq('centro_custo_id', params.centroCustoId);
    }

    const { data, error } = await query;

    if (error) throw error;

    return (data || []).map(mapOrcamentoFromDb);
  },

  async buscarPorId(id: string): Promise<OrcamentoMensal> {
    const { data, error } = await supabase
      .from('orcamentos_mensais')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    return mapOrcamentoFromDb(data);
  },

  async buscarUnico(params: {
    empresaId: string;
    planoFinanceiroId: string;
    centroCustoId?: string | null;
    ano: number;
    mes: number;
  }): Promise<OrcamentoMensal | null> {
    validarCompetencia(params.ano, params.mes);

    let query = supabase
      .from('orcamentos_mensais')
      .select('*')
      .eq('empresa_id', params.empresaId)
      .eq('plano_financeiro_id', params.planoFinanceiroId)
      .eq('ano', params.ano)
      .eq('mes', params.mes);

    query =
      params.centroCustoId == null
        ? query.is('centro_custo_id', null)
        : query.eq('centro_custo_id', params.centroCustoId);

    const { data, error } = await query.maybeSingle();

    if (error) throw error;

    return data ? mapOrcamentoFromDb(data) : null;
  },

  async criar(
    input: CriarOrcamentoMensalInput
  ): Promise<OrcamentoMensal> {
    validarCompetencia(input.ano, input.mes);

    validarValorNaoNegativo(input.valorOrcado, 'O valor orçado');
    validarValorNaoNegativo(
      input.valorComprometido ?? 0,
      'O valor comprometido'
    );
    validarValorNaoNegativo(
      input.valorUtilizado ?? 0,
      'O valor utilizado'
    );

    const existente = await this.buscarUnico({
      empresaId: input.empresaId,
      planoFinanceiroId: input.planoFinanceiroId,
      centroCustoId: input.centroCustoId ?? null,
      ano: input.ano,
      mes: input.mes,
    });

    if (existente) {
      throw new Error(
        'Já existe um orçamento para este plano, centro de custo e competência.'
      );
    }

    const userId = await getUserId();

    const { data, error } = await supabase
      .from('orcamentos_mensais')
      .insert({
        user_id: userId,
        empresa_id: input.empresaId,
        plano_financeiro_id: input.planoFinanceiroId,
        centro_custo_id: input.centroCustoId ?? null,
        ano: input.ano,
        mes: input.mes,
        valor_orcado: numeroSeguro(input.valorOrcado),
        valor_comprometido: numeroSeguro(input.valorComprometido),
        valor_utilizado: numeroSeguro(input.valorUtilizado),
        observacao: input.observacao?.trim() || null,
      })
      .select()
      .single();

    if (error) throw error;

    return mapOrcamentoFromDb(data);
  },

  async salvar(
    input: CriarOrcamentoMensalInput
  ): Promise<OrcamentoMensal> {
    const existente = await this.buscarUnico({
      empresaId: input.empresaId,
      planoFinanceiroId: input.planoFinanceiroId,
      centroCustoId: input.centroCustoId ?? null,
      ano: input.ano,
      mes: input.mes,
    });

    if (!existente) {
      return this.criar(input);
    }

    return this.editar(existente.id, {
      valorOrcado: input.valorOrcado,
      valorComprometido:
        input.valorComprometido ?? existente.valorComprometido,
      valorUtilizado:
        input.valorUtilizado ?? existente.valorUtilizado,
      observacao:
        input.observacao === undefined
          ? existente.observacao
          : input.observacao,
    });
  },

  async editar(
    id: string,
    input: AtualizarOrcamentoMensalInput
  ): Promise<OrcamentoMensal> {
    const payload: Record<string, unknown> = {};

    if (input.valorOrcado !== undefined) {
      validarValorNaoNegativo(input.valorOrcado, 'O valor orçado');
      payload.valor_orcado = numeroSeguro(input.valorOrcado);
    }

    if (input.valorComprometido !== undefined) {
      validarValorNaoNegativo(
        input.valorComprometido,
        'O valor comprometido'
      );
      payload.valor_comprometido = numeroSeguro(
        input.valorComprometido
      );
    }

    if (input.valorUtilizado !== undefined) {
      validarValorNaoNegativo(
        input.valorUtilizado,
        'O valor utilizado'
      );
      payload.valor_utilizado = numeroSeguro(input.valorUtilizado);
    }

    if (input.observacao !== undefined) {
      payload.observacao = input.observacao?.trim() || null;
    }

    if (Object.keys(payload).length === 0) {
      return this.buscarPorId(id);
    }

    const { data, error } = await supabase
      .from('orcamentos_mensais')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return mapOrcamentoFromDb(data);
  },

  async excluir(id: string): Promise<void> {
    const { error } = await supabase
      .from('orcamentos_mensais')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async copiar(input: CopiarOrcamentoInput): Promise<OrcamentoMensal> {
    validarCompetencia(input.anoDestino, input.mesDestino);

    const origem = await this.buscarPorId(input.orcamentoId);

    return this.criar({
      empresaId: origem.empresaId,
      planoFinanceiroId: origem.planoFinanceiroId,
      centroCustoId: origem.centroCustoId,
      ano: input.anoDestino,
      mes: input.mesDestino,
      valorOrcado: origem.valorOrcado,
      valorComprometido: 0,
      valorUtilizado: 0,
      observacao: origem.observacao,
    });
  },

  async atualizarValores(
    id: string,
    valores: {
      valorComprometido: number;
      valorUtilizado: number;
    }
  ): Promise<OrcamentoMensal> {
    return this.editar(id, {
      valorComprometido: valores.valorComprometido,
      valorUtilizado: valores.valorUtilizado,
    });
  },

  async obterResumoCompetencia(params: {
    empresaId: string;
    ano: number;
    mes: number;
  }) {
    const orcamentos = await this.listarPorCompetencia(params);

    const resumo = orcamentos.reduce(
      (acumulado, item) => {
        acumulado.valorOrcado += item.valorOrcado;
        acumulado.valorComprometido += item.valorComprometido;
        acumulado.valorUtilizado += item.valorUtilizado;
        acumulado.disponivel += item.disponivel;
        return acumulado;
      },
      {
        valorOrcado: 0,
        valorComprometido: 0,
        valorUtilizado: 0,
        disponivel: 0,
      }
    );

    return {
      ...resumo,
      quantidade: orcamentos.length,
    };
  },

  async listarCompetenciasDisponiveis(
    empresaId: string
  ): Promise<Array<{ ano: number; mes: number }>> {
    const { data, error } = await supabase
      .from('orcamentos_mensais')
      .select('ano, mes')
      .eq('empresa_id', empresaId)
      .order('ano', { ascending: false })
      .order('mes', { ascending: false });

    if (error) throw error;

    const unicas = new Map<string, { ano: number; mes: number }>();

    for (const item of data || []) {
      const ano = Number(item.ano);
      const mes = Number(item.mes);
      unicas.set(`${ano}-${mes}`, { ano, mes });
    }

    return Array.from(unicas.values());
  },
};

export default orcamentoService;