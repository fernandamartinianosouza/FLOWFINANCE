import * as XLSX from 'xlsx';
import { supabase } from '../lib/supabase';

export interface ContaPagarImportPreview {
  aba: string;
  linha: number;
  planoConta: string;
  fornecedor: string;
  vencimento: string;
  parcela: string;
  valorTotal: number;
  valorReal: number | null;
  valorPagoPlanilha: number | null;
  possivelmentePago: boolean;
  status: 'valido' | 'atencao';
  mensagem?: string;
}

const normalizarCabecalho = (valor: unknown) =>
  String(valor ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();

export const normalizarNomeImportacao = (valor: string) =>
  valor
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('pt-BR');

const parseValor = (valor: unknown): number | null => {
  if (valor === null || valor === undefined || valor === '') {
    return null;
  }

  if (typeof valor === 'number') {
    return Number.isFinite(valor) ? valor : null;
  }

  const texto = String(valor)
    .trim()
    .replace(/\s/g, '')
    .replace(/R\$/gi, '');

  if (!texto || texto === '-') return null;

  let numero: number;

  if (texto.includes(',') && texto.includes('.')) {
    numero = Number(texto.replace(/\./g, '').replace(',', '.'));
  } else if (texto.includes(',')) {
    numero = Number(texto.replace(',', '.'));
  } else {
    numero = Number(texto);
  }

  return Number.isFinite(numero) ? numero : null;
};

const dataIso = (valor: unknown): string => {
  if (valor instanceof Date && !Number.isNaN(valor.getTime())) {
    return `${valor.getFullYear()}-${String(valor.getMonth() + 1).padStart(2, '0')}-${String(valor.getDate()).padStart(2, '0')}`;
  }

  if (typeof valor === 'number') {
    const data = XLSX.SSF.parse_date_code(valor);
    if (data) {
      return `${data.y}-${String(data.m).padStart(2, '0')}-${String(data.d).padStart(2, '0')}`;
    }
  }

  const texto = String(valor ?? '').trim();

  const br = texto.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (br) {
    const ano = br[3].length === 2 ? `20${br[3]}` : br[3];
    return `${ano}-${br[2].padStart(2, '0')}-${br[1].padStart(2, '0')}`;
  }

  const iso = texto.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (iso) {
    return `${iso[1]}-${iso[2].padStart(2, '0')}-${iso[3].padStart(2, '0')}`;
  }

  return '';
};

const localizarColuna = (
  cabecalhos: unknown[],
  opcoes: string[]
): number => {
  const normalizados = cabecalhos.map(normalizarCabecalho);

  for (const opcao of opcoes) {
    const indice = normalizados.indexOf(normalizarCabecalho(opcao));
    if (indice >= 0) return indice;
  }

  return -1;
};

const montarParcela = (
  atual: unknown,
  total: unknown
): string => {
  const parteAtual = String(atual ?? '').trim();
  const parteTotal = String(total ?? '').trim();

  const atualValida =
    parteAtual && parteAtual !== '-' && parteAtual !== '0';
  const totalValida =
    parteTotal && parteTotal !== '-' && parteTotal !== '0';

  if (atualValida && totalValida) {
    if (parteAtual.includes('/')) return parteAtual;
    return `${parteAtual}/${parteTotal}`;
  }

  if (atualValida) return parteAtual;
  if (totalValida) return parteTotal;

  return '';
};

const ehAbaMensal = (nome: string) => {
  const normalizado = normalizarCabecalho(nome).toUpperCase();
  return [
    'JAN',
    'FEV',
    'MAR',
    'ABR',
    'MAI',
    'JUN',
    'JUL',
    'AGO',
    'SET',
    'OUT',
    'NOV',
    'DEZ',
  ].includes(normalizado);
};

export const contasPagarImportService = {
  async lerArquivo(arquivo: File): Promise<ContaPagarImportPreview[]> {
    const nomeArquivo = arquivo.name.toLowerCase();

    if (!nomeArquivo.endsWith('.xlsx') && !nomeArquivo.endsWith('.xls')) {
      throw new Error('Selecione uma planilha Excel nos formatos .xlsx ou .xls.');
    }

    const buffer = await arquivo.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const inicioTexto = new TextDecoder()
      .decode(bytes.slice(0, 300))
      .trim()
      .toLowerCase();

    if (
      inicioTexto.startsWith('<!doctype html') ||
      inicioTexto.startsWith('<html') ||
      inicioTexto.includes('<head>') ||
      inicioTexto.includes('<body')
    ) {
      throw new Error('O arquivo selecionado não é uma planilha Excel válida.');
    }

    let workbook: XLSX.WorkBook;

    try {
      workbook = XLSX.read(buffer, {
        type: 'array',
        cellDates: true,
      });
    } catch (error: any) {
      console.error('Erro interno do XLSX:', error);
      throw new Error(
        'Não foi possível abrir esta planilha. Salve o arquivo no Excel como Pasta de Trabalho do Excel (.xlsx) e tente novamente.'
      );
    }

    const abasPreferenciais = workbook.SheetNames.filter(ehAbaMensal);
    const abasParaLer = abasPreferenciais.length
      ? abasPreferenciais
      : workbook.SheetNames;

    const resultado: ContaPagarImportPreview[] = [];

    for (const nomeAba of abasParaLer) {
      const sheet = workbook.Sheets[nomeAba];
      if (!sheet) continue;

      const matriz = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
        header: 1,
        defval: '',
        raw: true,
      });

      const indiceCabecalho = matriz.findIndex((linha) => {
        const textos = (linha || []).map(normalizarCabecalho);
        return (
          textos.includes('vencimentos') &&
          textos.includes('plano de contas') &&
          textos.includes('fornecedor') &&
          (textos.includes('previsto') ||
            textos.includes('valor total') ||
            textos.includes('valor'))
        );
      });

      if (indiceCabecalho < 0) continue;

      const cabecalhos = matriz[indiceCabecalho] || [];

      const colVencimento = localizarColuna(cabecalhos, [
        'vencimentos',
        'vencimento',
        'data de vencimento',
      ]);
      const colParcela = localizarColuna(cabecalhos, [
        'parcelas',
        'parcela',
      ]);
      const colPlano = localizarColuna(cabecalhos, [
        'plano de contas',
        'planos de contas',
        'plano de conta',
      ]);
      const colFornecedor = localizarColuna(cabecalhos, [
        'fornecedor',
        'favorecido',
      ]);
      const colValorTotal = localizarColuna(cabecalhos, [
        'valor total',
        'previsto',
        'valor previsto',
        'valor',
      ]);
      const colValorReal = localizarColuna(cabecalhos, ['real', 'valor real']);
      const colPago = localizarColuna(cabecalhos, ['pago', 'valor pago']);

      const colTotalParcelas =
        colParcela >= 0 &&
        normalizarCabecalho(cabecalhos[colParcela + 1]) === ''
          ? colParcela + 1
          : -1;

      for (let i = indiceCabecalho + 1; i < matriz.length; i += 1) {
        const linha = matriz[i] || [];

        const vencimento =
          colVencimento >= 0 ? dataIso(linha[colVencimento]) : '';
        const planoConta =
          colPlano >= 0 ? String(linha[colPlano] ?? '').trim() : '';
        const fornecedor =
          colFornecedor >= 0
            ? String(linha[colFornecedor] ?? '').trim()
            : '';
        // Regra da importação: a coluna REAL da planilha é o valor oficial da conta.
        // PREVISTO não deve definir o Valor Total importado.
        const valorReal =
          colValorReal >= 0 ? parseValor(linha[colValorReal]) : null;

        // Só importamos linhas com REAL preenchido e maior que zero.
        if (!valorReal || valorReal <= 0) {
          continue;
        }

        // O Valor Total do FLOWFINANCE deve ser exatamente o REAL da planilha.
        const valorTotal = valorReal;
        const valorPagoPlanilha =
          colPago >= 0 ? parseValor(linha[colPago]) : null;
        const parcela =
          colParcela >= 0
            ? montarParcela(
                linha[colParcela],
                colTotalParcelas >= 0 ? linha[colTotalParcelas] : ''
              )
            : '';

        const linhaVazia =
          !vencimento &&
          !planoConta &&
          !fornecedor &&
          !(valorTotal && valorTotal > 0) &&
          !(valorReal && valorReal > 0) &&
          !(valorPagoPlanilha && valorPagoPlanilha > 0);

        if (linhaVazia) continue;

        const erros: string[] = [];

        if (!vencimento) erros.push('Vencimento inválido');
        if (!planoConta) erros.push('Plano de contas não informado');
        if (!fornecedor) erros.push('Fornecedor não informado');
        if (!valorReal || valorReal <= 0) erros.push('Valor Real inválido');

        resultado.push({
          aba: nomeAba,
          linha: i + 1,
          planoConta,
          fornecedor,
          vencimento,
          parcela,
          valorTotal: valorTotal || 0,
          valorReal,
          valorPagoPlanilha:
            valorPagoPlanilha !== null && valorPagoPlanilha > 0
              ? valorPagoPlanilha
              : null,
          possivelmentePago:
            valorPagoPlanilha !== null && valorPagoPlanilha > 0,
          status: erros.length ? 'atencao' : 'valido',
          mensagem: erros.join(' • '),
        });
      }
    }

    if (resultado.length === 0) {
      throw new Error(
        'Não foram encontrados lançamentos com Vencimento, Plano de Contas, Fornecedor e Valor Total/Previsto nas abas da planilha.'
      );
    }

    return resultado;
  },

  async buscarPlano(params: {
    organizacaoId?: string;
    empresaId: string;
    nome: string;
  }): Promise<string | null> {
    let query = supabase
      .from('planos_financeiros')
      .select('id')
      .eq('empresa_id', params.empresaId)
      .ilike('nome', params.nome.trim())
      .limit(1);

    if (params.organizacaoId) {
      query = query.eq('organizacao_id', params.organizacaoId);
    }

    const { data, error } = await query.maybeSingle();
    if (error) throw error;

    return data?.id ? String(data.id) : null;
  },

  async buscarFornecedor(params: {
    organizacaoId?: string;
    empresaId: string;
    nome: string;
  }): Promise<string | null> {
    let query = supabase
      .from('fornecedores')
      .select('id')
      .eq('empresa_id', params.empresaId)
      .ilike('nome', params.nome.trim())
      .limit(1);

    if (params.organizacaoId) {
      query = query.eq('organizacao_id', params.organizacaoId);
    }

    const { data, error } = await query.maybeSingle();
    if (error) throw error;

    return data?.id ? String(data.id) : null;
  },
};
