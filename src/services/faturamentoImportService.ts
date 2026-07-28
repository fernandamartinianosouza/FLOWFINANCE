import * as XLSX from 'xlsx';
import { supabase } from '../lib/supabase';

export type StatusContaReceber =
  | 'previsto'
  | 'recebido_parcial'
  | 'recebido'
  | 'cancelado';

export type ContaReceber = {
  id: string;
  organizacaoId: string;
  empresaId: string;
  clienteNome: string;
  clienteDocumento: string;
  medicao: string;
  numeroDocumento: string;
  dataVencimento: string | null;
  valorOriginal: number;
  valorRecebido: number;
  saldo: number;
  status: StatusContaReceber;
  dataRecebimento: string | null;
  formaRecebimento: string | null;
  origem: 'manual' | 'importacao_excel';
  loteImportacaoId: string | null;
  observacao: string | null;
  createdAt: string;
};

export type LinhaFaturamentoPreview = {
  linha: number;
  clienteNome: string;
  clienteDocumento: string;
  medicao: string;
  numeroDocumento: string;
  dataVencimento: string;
  valorOriginal: number;
  status: 'valido' | 'atencao' | 'erro' | 'duplicado';
  mensagem: string;
};

const normalizarCabecalho = (valor: unknown) =>
  String(valor ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase();

const texto = (valor: unknown) => String(valor ?? '').trim();

const numeroDocumentoLimpo = (valor: unknown) =>
  texto(valor).replace(/\s+/g, ' ').toUpperCase();

const documentoClienteLimpo = (valor: unknown) =>
  texto(valor).replace(/\s+/g, ' ');

const valorParaNumero = (valor: unknown): number => {
  if (typeof valor === 'number') return Number.isFinite(valor) ? valor : 0;

  const bruto = texto(valor)
    .replace(/R\$/gi, '')
    .replace(/\s/g, '');

  if (!bruto) return 0;

  const normalizado = bruto.includes(',')
    ? bruto.replace(/\./g, '').replace(',', '.')
    : bruto;

  const numero = Number(normalizado);
  return Number.isFinite(numero) ? numero : 0;
};

const excelSerialParaData = (serial: number): string => {
  const parsed = XLSX.SSF.parse_date_code(serial);
  if (!parsed) return '';
  const ano = String(parsed.y).padStart(4, '0');
  const mes = String(parsed.m).padStart(2, '0');
  const dia = String(parsed.d).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
};

const dataParaIso = (valor: unknown): string => {
  if (typeof valor === 'number' && Number.isFinite(valor)) {
    return excelSerialParaData(valor);
  }

  const bruto = texto(valor);
  if (!bruto) return '';

  if (/^\d{4}-\d{2}-\d{2}$/.test(bruto)) return bruto;

  const match = bruto.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})$/);
  if (match) {
    const [, d, m, y] = match;
    const ano = y.length === 2 ? `20${y}` : y;
    return `${ano.padStart(4, '0')}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  const data = new Date(bruto);
  if (!Number.isNaN(data.getTime())) return data.toISOString().slice(0, 10);

  return '';
};

const mapConta = (row: any): ContaReceber => ({
  id: row.id,
  organizacaoId: row.organizacao_id,
  empresaId: row.empresa_id,
  clienteNome: row.cliente_nome,
  clienteDocumento: row.cliente_documento ?? '',
  medicao: row.medicao ?? '',
  numeroDocumento: row.numero_documento,
  dataVencimento: row.data_vencimento,
  valorOriginal: Number(row.valor_original ?? 0),
  valorRecebido: Number(row.valor_recebido ?? 0),
  saldo: Number(row.saldo ?? 0),
  status: row.status,
  dataRecebimento: row.data_recebimento,
  formaRecebimento: row.forma_recebimento,
  origem: row.origem,
  loteImportacaoId: row.lote_importacao_id,
  observacao: row.observacao,
  createdAt: row.created_at,
});

export const faturamentoImportService = {
  async lerArquivo(file: File): Promise<LinhaFaturamentoPreview[]> {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array', cellDates: false });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];

    if (!sheet) throw new Error('A planilha não possui uma aba válida.');

    const matriz = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      raw: true,
      defval: '',
    });

    if (!matriz.length) throw new Error('A planilha está vazia.');

    const cabecalhos = (matriz[0] ?? []).map(normalizarCabecalho);
    const indice = (nomes: string[]) =>
      cabecalhos.findIndex(cabecalho => nomes.includes(cabecalho));

    const idxCliente = indice(['CLIENTE', 'RAZAO SOCIAL', 'NOME']);
    const idxDocumentoCliente = indice(['CNPJ/CPF', 'CNPJ CPF', 'DOCUMENTO CLIENTE']);
    const idxMedicao = indice(['MEDICAO']);
    const idxVencimento = indice(['VENCIMENTO', 'DATA VENCIMENTO']);
    const idxValor = indice(['VALOR', 'VALOR ORIGINAL']);
    const idxDocumento = indice(['DOCUMENTO', 'NUMERO DOCUMENTO', 'NF', 'NOTA FISCAL']);

    const faltantes = [
      ['CLIENTE', idxCliente],
      ['VENCIMENTO', idxVencimento],
      ['VALOR', idxValor],
      ['DOCUMENTO', idxDocumento],
    ]
      .filter(([, pos]) => Number(pos) < 0)
      .map(([nome]) => nome);

    if (faltantes.length) {
      throw new Error(`Colunas obrigatórias não encontradas: ${faltantes.join(', ')}.`);
    }

    return matriz
      .slice(1)
      .map((row, index) => {
        const linha = Array.isArray(row) ? row : [];
        const clienteNome = texto(linha[idxCliente]);
        const clienteDocumento =
          idxDocumentoCliente >= 0 ? documentoClienteLimpo(linha[idxDocumentoCliente]) : '';
        const medicao = idxMedicao >= 0 ? texto(linha[idxMedicao]) : '';
        const numeroDocumento = numeroDocumentoLimpo(linha[idxDocumento]);
        const dataVencimento = dataParaIso(linha[idxVencimento]);
        const valorOriginal = valorParaNumero(linha[idxValor]);
        const vencimentoOriginal = texto(linha[idxVencimento]);

        let status: LinhaFaturamentoPreview['status'] = 'valido';
        let mensagem = 'Pronto para importar';

        if (!clienteNome || !numeroDocumento || valorOriginal <= 0) {
          status = 'erro';
          mensagem = 'Cliente, documento e valor maior que zero são obrigatórios.';
        } else if (!dataVencimento) {
          status = 'atencao';
          mensagem = vencimentoOriginal
            ? `Vencimento “${vencimentoOriginal}” precisa ser corrigido.`
            : 'Informe a data de vencimento.';
        }

        return {
          linha: index + 2,
          clienteNome,
          clienteDocumento,
          medicao,
          numeroDocumento,
          dataVencimento,
          valorOriginal,
          status,
          mensagem,
        };
      })
      .filter(item =>
        Boolean(
          item.clienteNome ||
            item.clienteDocumento ||
            item.numeroDocumento ||
            item.valorOriginal ||
            item.dataVencimento
        )
      );
  },

  async marcarDuplicados(
    linhas: LinhaFaturamentoPreview[],
    organizacaoId: string,
    empresaId: string
  ): Promise<LinhaFaturamentoPreview[]> {
    const documentos = linhas.map(l => l.numeroDocumento).filter(Boolean);
    if (!documentos.length) return linhas;

    const { data, error } = await supabase
      .from('contas_receber')
      .select('numero_documento, cliente_documento, valor_original')
      .eq('organizacao_id', organizacaoId)
      .eq('empresa_id', empresaId)
      .in('numero_documento', documentos);

    if (error) throw error;

    const chaves = new Set(
      (data ?? []).map(
        row =>
          `${numeroDocumentoLimpo(row.numero_documento)}|${documentoClienteLimpo(
            row.cliente_documento
          )}|${Number(row.valor_original ?? 0).toFixed(2)}`
      )
    );

    const vistas = new Set<string>();

    return linhas.map(linha => {
      const chave = `${linha.numeroDocumento}|${linha.clienteDocumento}|${linha.valorOriginal.toFixed(2)}`;

      if (chaves.has(chave) || vistas.has(chave)) {
        return {
          ...linha,
          status: 'duplicado',
          mensagem: 'Este título já existe nesta empresa ou está repetido na planilha.',
        };
      }

      vistas.add(chave);
      return linha;
    });
  },

  async listar(organizacaoId: string, empresaId: string): Promise<ContaReceber[]> {
    const { data, error } = await supabase
      .from('contas_receber')
      .select('*')
      .eq('organizacao_id', organizacaoId)
      .eq('empresa_id', empresaId)
      .neq('status', 'cancelado')
      .order('data_vencimento', { ascending: true, nullsFirst: false });

    if (error) throw error;
    return (data ?? []).map(mapConta);
  },

  async importar(
    linhas: LinhaFaturamentoPreview[],
    organizacaoId: string,
    empresaId: string,
    nomeArquivo: string
  ): Promise<{ importados: number; loteId: string }> {
    const validas = linhas.filter(l => l.status === 'valido' && l.dataVencimento);
    if (!validas.length) throw new Error('Não existem linhas válidas para importar.');

    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!authData.user) throw new Error('Usuário não autenticado.');

    const total = validas.reduce((sum, l) => sum + l.valorOriginal, 0);

    const { data: lote, error: loteError } = await supabase
      .from('importacoes_faturamento')
      .insert({
        organizacao_id: organizacaoId,
        empresa_id: empresaId,
        user_id: authData.user.id,
        nome_arquivo: nomeArquivo,
        quantidade_registros: validas.length,
        valor_total: total,
        status: 'concluida',
      })
      .select('id')
      .single();

    if (loteError) throw loteError;

    const payload = validas.map(l => ({
      organizacao_id: organizacaoId,
      empresa_id: empresaId,
      user_id: authData.user!.id,
      cliente_nome: l.clienteNome,
      cliente_documento: l.clienteDocumento || null,
      medicao: l.medicao || null,
      numero_documento: l.numeroDocumento,
      data_vencimento: l.dataVencimento,
      valor_original: l.valorOriginal,
      valor_recebido: 0,
      status: 'previsto',
      origem: 'importacao_excel',
      lote_importacao_id: lote.id,
    }));

    const { error } = await supabase.from('contas_receber').insert(payload);

    if (error) {
      await supabase.from('importacoes_faturamento').delete().eq('id', lote.id);
      throw error;
    }

    return { importados: payload.length, loteId: lote.id };
  },

  async criarManual(
    dados: {
      clienteNome: string;
      clienteDocumento?: string;
      medicao?: string;
      numeroDocumento: string;
      dataVencimento: string;
      valorOriginal: number;
      observacao?: string;
    },
    organizacaoId: string,
    empresaId: string
  ): Promise<ContaReceber> {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!authData.user) throw new Error('Usuário não autenticado.');

    const { data, error } = await supabase
      .from('contas_receber')
      .insert({
        organizacao_id: organizacaoId,
        empresa_id: empresaId,
        user_id: authData.user.id,
        cliente_nome: dados.clienteNome.trim(),
        cliente_documento: dados.clienteDocumento?.trim() || null,
        medicao: dados.medicao?.trim() || null,
        numero_documento: dados.numeroDocumento.trim().toUpperCase(),
        data_vencimento: dados.dataVencimento,
        valor_original: dados.valorOriginal,
        valor_recebido: 0,
        status: 'previsto',
        origem: 'manual',
        observacao: dados.observacao?.trim() || null,
      })
      .select('*')
      .single();

    if (error) throw error;
    return mapConta(data);
  },

  async registrarRecebimento(
    conta: ContaReceber,
    valor: number,
    dataRecebimento: string,
    formaRecebimento: string
  ): Promise<ContaReceber> {
    const novoRecebido = Math.min(conta.valorOriginal, conta.valorRecebido + valor);
    const novoStatus: StatusContaReceber =
      novoRecebido >= conta.valorOriginal ? 'recebido' : 'recebido_parcial';

    const { data, error } = await supabase
      .from('contas_receber')
      .update({
        valor_recebido: novoRecebido,
        status: novoStatus,
        data_recebimento: dataRecebimento,
        forma_recebimento: formaRecebimento,
        updated_at: new Date().toISOString(),
      })
      .eq('id', conta.id)
      .eq('organizacao_id', conta.organizacaoId)
      .select('*')
      .single();

    if (error) throw error;
    return mapConta(data);
  },

  async excluir(conta: ContaReceber): Promise<void> {
    const { error } = await supabase
      .from('contas_receber')
      .delete()
      .eq('id', conta.id)
      .eq('organizacao_id', conta.organizacaoId);

    if (error) throw error;
  },

  baixarModelo(): void {
    const dados = [
      {
        CLIENTE: 'CLIENTE EXEMPLO LTDA',
        'CNPJ/CPF': '00.000.000/0001-00',
        'MEDIÇÃO': '1',
        VENCIMENTO: new Date(),
        VALOR: 1500,
        DOCUMENTO: 'NF 000001',
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(dados);
    worksheet['!cols'] = [
      { wch: 42 },
      { wch: 20 },
      { wch: 14 },
      { wch: 16 },
      { wch: 16 },
      { wch: 18 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Faturamento');
    XLSX.writeFile(workbook, 'MODELO_FATURAMENTO_FLOWFINANCE.xlsx');
  },
};
