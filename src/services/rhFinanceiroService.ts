import * as XLSX from 'xlsx';
import { supabase } from '../lib/supabase';

export type RHTipo =
  | 'salario'
  | 'adiantamento'
  | 'passagem'
  | 'vale_alimentacao'
  | 'rescisao';

export type RHStatus = 'pendente' | 'programado' | 'pago' | 'cancelado';

export interface RHLancamento {
  id: string;
  organizacaoId: string;
  empresaId: string;
  colaborador: string;
  cpf: string;
  pix: string;
  valor: number;
  competencia: string;
  tipo: RHTipo;
  dataPagamento: string;
  status: RHStatus;
  contaPagarId?: string | null;
  observacao?: string | null;
  pagoEm?: string | null;
  createdAt: string;
}

export interface RHPreview {
  linha: number;
  colaborador: string;
  cpf: string;
  pix: string;
  valor: number;
  periodo: string;
  dataPagamento: string;
  status: 'valido' | 'atencao';
  mensagem?: string;
}

const somenteNumeros = (valor: unknown) =>
  String(valor ?? '').replace(/\D/g, '');

const parseValor = (valor: unknown): number => {
  if (typeof valor === 'number') return valor;
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

const competenciaIso = (valor: unknown): string => {
  if (valor instanceof Date && !Number.isNaN(valor.getTime())) {
    return `${valor.getFullYear()}-${String(valor.getMonth() + 1).padStart(2, '0')}-01`;
  }

  if (typeof valor === 'number') {
    const data = XLSX.SSF.parse_date_code(valor);
    if (data) return `${data.y}-${String(data.m).padStart(2, '0')}-01`;
  }

  const texto = String(valor ?? '').trim();
  const br = texto.match(/^(\d{1,2})[\/\-](\d{4})$/);
  if (br) return `${br[2]}-${br[1].padStart(2, '0')}-01`;

  const iso = texto.match(/^(\d{4})[\/\-](\d{1,2})/);
  if (iso) return `${iso[1]}-${iso[2].padStart(2, '0')}-01`;

  return '';
};

const isoLocal = (data: Date) =>
  `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(
    data.getDate()
  ).padStart(2, '0')}`;

const ultimoDiaUtilAnterior = (data: Date) => {
  while (data.getDay() === 0 || data.getDay() === 6) {
    data.setDate(data.getDate() - 1);
  }
  return data;
};

export const calcularDataPagamento = (
  tipo: RHTipo,
  competencia: string,
  dataRescisao?: string
) => {
  if (tipo === 'rescisao') return dataRescisao || '';

  const [ano, mes] = competencia.slice(0, 7).split('-').map(Number);

  if (tipo === 'passagem' || tipo === 'vale_alimentacao') {
    return isoLocal(ultimoDiaUtilAnterior(new Date(ano, mes - 1, 1)));
  }

  if (tipo === 'adiantamento') {
    return isoLocal(ultimoDiaUtilAnterior(new Date(ano, mes - 1, 20)));
  }

  let uteis = 0;
  const data = new Date(ano, mes - 1, 1);

  while (uteis < 5) {
    const dia = data.getDay();
    if (dia !== 0 && dia !== 6) uteis += 1;
    if (uteis < 5) data.setDate(data.getDate() + 1);
  }

  return isoLocal(data);
};

const mapDb = (item: any): RHLancamento => ({
  id: item.id,
  organizacaoId: item.organizacao_id,
  empresaId: item.empresa_id,
  colaborador: item.colaborador,
  cpf: item.cpf,
  pix: item.pix || '',
  valor: Number(item.valor || 0),
  competencia: String(item.competencia || '').slice(0, 10),
  tipo: item.tipo,
  dataPagamento: item.data_pagamento,
  status: item.status,
  contaPagarId: item.conta_pagar_id,
  observacao: item.observacao,
  pagoEm: item.pago_em,
  createdAt: item.created_at,
});

const getUserId = async () => {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error('Usuário não autenticado.');
  return data.user.id;
};

export const rhFinanceiroService = {
  async lerExcel(
    arquivo: File,
    tipo: RHTipo,
    competenciaSelecionada: string,
    dataRescisao?: string
  ): Promise<RHPreview[]> {
    const buffer = await arquivo.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: '',
      raw: true,
    });

    return rows.map((row, index) => {
      const normalizado: Record<string, unknown> = {};
      Object.entries(row).forEach(([chave, valor]) => {
        normalizado[
          chave
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .trim()
            .toLowerCase()
        ] = valor;
      });

      const colaborador = String(normalizado.colaborador ?? '').trim();
      const cpf = somenteNumeros(normalizado.cpf);
      const pix = String(normalizado.pix ?? '').trim();
      const valor = parseValor(normalizado.valor);
      const competencia =
        competenciaIso(normalizado.periodo) ||
        `${competenciaSelecionada.slice(0, 7)}-01`;
      const dataPagamento = calcularDataPagamento(tipo, competencia, dataRescisao);

      const erros: string[] = [];
      if (!colaborador) erros.push('Colaborador não informado');
      if (cpf.length !== 11) erros.push('CPF inválido');
      if (!pix) erros.push('PIX não informado');
      if (!Number.isFinite(valor) || valor <= 0) erros.push('Valor inválido');
      if (!competencia) erros.push('Período inválido');
      if (!dataPagamento) erros.push('Data da rescisão obrigatória');

      return {
        linha: index + 2,
        colaborador,
        cpf,
        pix,
        valor,
        periodo: competencia,
        dataPagamento,
        status: erros.length ? 'atencao' : 'valido',
        mensagem: erros.join(' • '),
      };
    });
  },

  async listar(
    organizacaoId: string,
    empresaId: string,
    competencia?: string
  ): Promise<RHLancamento[]> {
    let query = supabase
      .from('rh_lancamentos')
      .select('*')
      .eq('organizacao_id', organizacaoId)
      .eq('empresa_id', empresaId)
      .order('data_pagamento', { ascending: true })
      .order('colaborador', { ascending: true });

    if (competencia) {
      query = query.eq('competencia', `${competencia.slice(0, 7)}-01`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(mapDb);
  },

  async importar(params: {
    organizacaoId: string;
    empresaId: string;
    tipo: RHTipo;
    competencia: string;
    arquivoNome: string;
    linhas: RHPreview[];
  }) {
    const userId = await getUserId();
    const validas = params.linhas.filter(l => l.status === 'valido');

    if (!validas.length) {
      throw new Error('Não há registros válidos para importar.');
    }

    const { data: importacao, error: erroImportacao } = await supabase
      .from('rh_importacoes')
      .insert({
        organizacao_id: params.organizacaoId,
        empresa_id: params.empresaId,
        user_id: userId,
        tipo: params.tipo,
        competencia: `${params.competencia.slice(0, 7)}-01`,
        arquivo_nome: params.arquivoNome,
        quantidade_total: params.linhas.length,
        quantidade_importada: validas.length,
      })
      .select('id')
      .single();

    if (erroImportacao) throw erroImportacao;

    const payload = validas.map(linha => ({
      organizacao_id: params.organizacaoId,
      empresa_id: params.empresaId,
      user_id: userId,
      importacao_id: importacao.id,
      colaborador: linha.colaborador,
      cpf: linha.cpf,
      pix: linha.pix,
      valor: linha.valor,
      competencia: linha.periodo,
      tipo: params.tipo,
      data_pagamento: linha.dataPagamento,
      status: 'pendente',
    }));

    const { error } = await supabase
      .from('rh_lancamentos')
      .upsert(payload, {
        onConflict: 'organizacao_id,empresa_id,cpf,tipo,competencia',
        ignoreDuplicates: true,
      });

    if (error) throw error;
    return { importacaoId: importacao.id, quantidade: validas.length };
  },

  async atualizarStatus(
    id: string,
    organizacaoId: string,
    status: RHStatus
  ) {
    const alteracao: Record<string, unknown> = { status };
    if (status === 'pago') alteracao.pago_em = new Date().toISOString().slice(0, 10);

    const { data, error } = await supabase
      .from('rh_lancamentos')
      .update(alteracao)
      .eq('id', id)
      .eq('organizacao_id', organizacaoId)
      .select()
      .single();

    if (error) throw error;
    return mapDb(data);
  },

  async excluir(id: string, organizacaoId: string) {
    const { error } = await supabase
      .from('rh_lancamentos')
      .delete()
      .eq('id', id)
      .eq('organizacao_id', organizacaoId);

    if (error) throw error;
  },
};
