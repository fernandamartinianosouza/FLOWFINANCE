import * as XLSX from 'xlsx';
import { supabase } from '../lib/supabase';

export interface ContaPagarImportPreview {
  linha: number;
  planoConta: string;
  fornecedor: string;
  pix: string;
  vencimento: string;
  parcela: string;
  valor: number;
  status: 'valido' | 'atencao';
  mensagem?: string;
}

const normalizarCabecalho = (valor: string) =>
  valor
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();

export const normalizarNomeImportacao = (valor: string) =>
  valor
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('pt-BR');

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
    return Number(
      texto.replace(/\./g, '').replace(',', '.')
    );
  }

  if (texto.includes(',')) {
    return Number(texto.replace(',', '.'));
  }

  return Number(texto);
};

const dataIso = (valor: unknown): string => {
  if (valor instanceof Date && !Number.isNaN(valor.getTime())) {
    return `${valor.getFullYear()}-${String(
      valor.getMonth() + 1
    ).padStart(2, '0')}-${String(valor.getDate()).padStart(
      2,
      '0'
    )}`;
  }

  if (typeof valor === 'number') {
    const data = XLSX.SSF.parse_date_code(valor);

    if (data) {
      return `${data.y}-${String(data.m).padStart(
        2,
        '0'
      )}-${String(data.d).padStart(2, '0')}`;
    }
  }

  const texto = String(valor ?? '').trim();

  const br = texto.match(
    /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/
  );

  if (br) {
    return `${br[3]}-${br[2].padStart(
      2,
      '0'
    )}-${br[1].padStart(2, '0')}`;
  }

  const iso = texto.match(
    /^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/
  );

  if (iso) {
    return `${iso[1]}-${iso[2].padStart(
      2,
      '0'
    )}-${iso[3].padStart(2, '0')}`;
  }

  return '';
};

export const contasPagarImportService = {
  async lerArquivo(
    arquivo: File
  ): Promise<ContaPagarImportPreview[]> {
    const nomeArquivo = arquivo.name.toLowerCase();

    if (
      !nomeArquivo.endsWith('.xlsx') &&
      !nomeArquivo.endsWith('.xls')
    ) {
      throw new Error(
        'Selecione uma planilha Excel nos formatos .xlsx ou .xls.'
      );
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
      throw new Error(
        'O arquivo selecionado não é uma planilha Excel válida. Provavelmente o botão Modelo baixou uma página HTML porque o arquivo não foi colocado em public/modelos. Copie modelo_importacao_contas_pagar.xlsx para public/modelos e baixe novamente.'
      );
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
        'Não foi possível abrir esta planilha. Baixe novamente o modelo do sistema ou salve o arquivo no Excel como Pasta de Trabalho do Excel (.xlsx).'
      );
    }

    const nomeAba = workbook.SheetNames[0];

    if (!nomeAba) {
      throw new Error('A planilha não possui nenhuma aba.');
    }

    const sheet = workbook.Sheets[nomeAba];

    const linhas =
      XLSX.utils.sheet_to_json<Record<string, unknown>>(
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
        dados['planos de contas'] ??
          dados['plano de contas'] ??
          dados['plano de conta'] ??
          dados['plano'] ??
          ''
      ).trim();

      const fornecedor = String(
        dados['fornecedor'] ??
          dados['favorecido'] ??
          ''
      ).trim();

      const pix = String(
        dados['pix'] ??
          dados['chave pix'] ??
          dados['pix copia e cola'] ??
          ''
      ).trim();

      const vencimento = dataIso(
        dados['vencimento'] ??
          dados['data de vencimento'] ??
          dados['data vencimento']
      );

      const parcela = String(
        dados['parcela'] ??
          dados['parcelas'] ??
          '1/1'
      ).trim();

      const valor = parseValor(
        dados['valor'] ??
          dados['valor da parcela'] ??
          dados['valor total'] ??
          0
      );

      const erros: string[] = [];

      if (!planoConta) {
        erros.push('Plano de contas não informado');
      }

      if (!fornecedor) {
        erros.push('Fornecedor não informado');
      }

      if (!vencimento) {
        erros.push('Vencimento inválido');
      }

      if (!parcela) {
        erros.push('Parcela não informada');
      }

      if (!Number.isFinite(valor) || valor <= 0) {
        erros.push('Valor inválido');
      }

      return {
        linha: index + 2,
        planoConta,
        fornecedor,
        pix,
        vencimento,
        parcela,
        valor,
        status: erros.length ? 'atencao' : 'valido',
        mensagem: erros.join(' • '),
      };
    });
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
      query = query.eq(
        'organizacao_id',
        params.organizacaoId
      );
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
      query = query.eq(
        'organizacao_id',
        params.organizacaoId
      );
    }

    const { data, error } = await query.maybeSingle();

    if (error) throw error;

    return data?.id ? String(data.id) : null;
  },
};