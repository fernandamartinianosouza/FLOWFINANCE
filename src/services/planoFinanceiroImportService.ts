import * as XLSX from 'xlsx';
import { supabase } from '../lib/supabase';

export interface PlanoFinanceiroImportPreview {
  linha: number;
  planoConta: string;
  centroCusto: string;
  orcamentoMensal: number;
  status: 'valido' | 'atencao';
  mensagem?: string;
}

const normalizarCabecalho = (valor: string) =>
  valor
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();

const parseValor = (valor: unknown): number => {
  if (typeof valor === 'number') {
    return Number.isFinite(valor) ? valor : 0;
  }

  const texto = String(valor ?? '')
    .trim()
    .replace(/\s/g, '')
    .replace(/R\$/gi, '');

  if (!texto) return 0;

  if (texto.includes(',') && texto.includes('.')) {
    return Number(texto.replace(/\./g, '').replace(',', '.'));
  }

  if (texto.includes(',')) {
    return Number(texto.replace(',', '.'));
  }

  return Number(texto);
};

export const normalizarNomeFinanceiro = (valor: string) =>
  valor.trim().replace(/\s+/g, ' ').toLocaleLowerCase('pt-BR');

export const planoFinanceiroImportService = {
  async buscarPlanoPorNome(params: {
    empresaId: string;
    nome: string;
  }): Promise<string | null> {
    const nome = params.nome.trim();

    const { data: vinculado, error: erroVinculado } = await supabase
      .from('planos_financeiros')
      .select('id')
      .eq('empresa_id', params.empresaId)
      .ilike('nome', nome)
      .limit(1)
      .maybeSingle();

    if (erroVinculado) throw erroVinculado;
    if (vinculado?.id) return String(vinculado.id);

    // Cadastros antigos podem ter sido criados sem empresa_id.
    const { data: semEmpresa, error: erroSemEmpresa } = await supabase
      .from('planos_financeiros')
      .select('id, empresa_id')
      .is('empresa_id', null)
      .ilike('nome', nome)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (erroSemEmpresa) throw erroSemEmpresa;
    if (!semEmpresa?.id) return null;

    const { error: erroVinculo } = await supabase
      .from('planos_financeiros')
      .update({ empresa_id: params.empresaId })
      .eq('id', semEmpresa.id);

    if (erroVinculo) throw erroVinculo;

    return String(semEmpresa.id);
  },

  async buscarCentroPorNome(params: {
    empresaId: string;
    planoFinanceiroId: string;
    nome: string;
  }): Promise<string | null> {
    const nome = params.nome.trim();

    const { data: vinculado, error: erroVinculado } = await supabase
      .from('centros_custos')
      .select('id')
      .eq('empresa_id', params.empresaId)
      .eq('plano_financeiro_id', params.planoFinanceiroId)
      .ilike('nome', nome)
      .limit(1)
      .maybeSingle();

    if (erroVinculado) throw erroVinculado;
    if (vinculado?.id) return String(vinculado.id);

    // Cadastros antigos podem ter sido criados sem empresa_id.
    const { data: semEmpresa, error: erroSemEmpresa } = await supabase
      .from('centros_custos')
      .select('id, empresa_id')
      .eq('plano_financeiro_id', params.planoFinanceiroId)
      .is('empresa_id', null)
      .ilike('nome', nome)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (erroSemEmpresa) throw erroSemEmpresa;
    if (!semEmpresa?.id) return null;

    const { error: erroVinculo } = await supabase
      .from('centros_custos')
      .update({ empresa_id: params.empresaId })
      .eq('id', semEmpresa.id);

    if (erroVinculo) throw erroVinculo;

    return String(semEmpresa.id);
  },

  async salvarOrcamentoImportado(params: {
    organizacaoId: string;
    empresaId: string;
    planoFinanceiroId: string;
    centroCustoId: string;
    ano: number;
    mes: number;
    valorOrcado: number;
    observacao?: string | null;
  }) {
    const { data: authData, error: authError } =
      await supabase.auth.getUser();

    if (authError || !authData.user) {
      throw new Error('Usuário não autenticado.');
    }

    const { data: existente, error: erroBusca } = await supabase
      .from('orcamentos_mensais')
      .select('id')
      .eq('organizacao_id', params.organizacaoId)
      .eq('empresa_id', params.empresaId)
      .eq('plano_financeiro_id', params.planoFinanceiroId)
      .eq('centro_custo_id', params.centroCustoId)
      .eq('ano', params.ano)
      .eq('mes', params.mes)
      .limit(1)
      .maybeSingle();

    if (erroBusca) throw erroBusca;

    const payload = {
      organizacao_id: params.organizacaoId,
      empresa_id: params.empresaId,
      user_id: authData.user.id,
      plano_financeiro_id: params.planoFinanceiroId,
      centro_custo_id: params.centroCustoId,
      ano: params.ano,
      mes: params.mes,
      valor_orcado: params.valorOrcado,
      observacao: params.observacao || null,
    };

    if (existente?.id) {
      const { data, error } = await supabase
        .from('orcamentos_mensais')
        .update(payload)
        .eq('id', existente.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    }

    const { data, error } = await supabase
      .from('orcamentos_mensais')
      .insert(payload)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async lerArquivo(
    arquivo: File
  ): Promise<PlanoFinanceiroImportPreview[]> {
    const buffer = await arquivo.arrayBuffer();
    const workbook = XLSX.read(buffer, {
      type: 'array',
      cellDates: true,
    });

    const primeiraAba = workbook.SheetNames[0];

    if (!primeiraAba) {
      throw new Error('A planilha não possui nenhuma aba.');
    }

    const sheet = workbook.Sheets[primeiraAba];
    const linhas = XLSX.utils.sheet_to_json<Record<string, unknown>>(
      sheet,
      {
        defval: '',
        raw: true,
      }
    );

    return linhas.map((linha, index) => {
      const dados: Record<string, unknown> = {};

      Object.entries(linha).forEach(([chave, valor]) => {
        dados[normalizarCabecalho(chave)] = valor;
      });

      const planoConta = String(
        dados['plano de contas'] ??
          dados['plano de conta'] ??
          dados['plano'] ??
          ''
      ).trim();

      const centroCusto = String(
        dados['centro de custo'] ??
          dados['centro custo'] ??
          dados['centro'] ??
          ''
      ).trim();

      const orcamentoMensal = parseValor(
        dados['orcamento mensal do plano'] ??
          dados['orcamento mensal'] ??
          dados['orcamento'] ??
          dados['valor'] ??
          0
      );

      const erros: string[] = [];

      if (!planoConta) {
        erros.push('Plano de contas não informado');
      }

      if (!centroCusto) {
        erros.push('Centro de custo não informado');
      }

      if (
        !Number.isFinite(orcamentoMensal) ||
        orcamentoMensal < 0
      ) {
        erros.push('Orçamento mensal inválido');
      }

      return {
        linha: index + 2,
        planoConta,
        centroCusto,
        orcamentoMensal,
        status: erros.length ? 'atencao' : 'valido',
        mensagem: erros.join(' • '),
      };
    });
  },
};