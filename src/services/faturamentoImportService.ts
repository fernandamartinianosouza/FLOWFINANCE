import * as XLSX from 'xlsx';
import { supabase } from '../lib/supabase';

const BUCKET_ANEXOS_RECEBER = 'flowfinance-anexos';

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

export type ContaReceberDocumento = {
  id: string;
  contaReceberId: string;
  organizacaoId: string;
  empresaId: string;
  nome: string;
  caminho: string;
  url: string;
  tipo: string | null;
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

const mapDocumentoContaReceber = (
  row: any
): ContaReceberDocumento => ({
  id: row.id,
  contaReceberId: row.conta_receber_id,
  organizacaoId: row.organizacao_id,
  empresaId: row.empresa_id,
  nome: row.nome,
  caminho: row.caminho,
  url: row.url ?? '',
  tipo: row.tipo ?? null,
  createdAt: row.created_at,
});

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

  async listar(
    organizacaoId: string,
    empresaId: string
  ): Promise<ContaReceber[]> {
    const todas: any[] = [];
    const tamanhoPagina = 1000;
    let inicio = 0;

    while (true) {
      const fim = inicio + tamanhoPagina - 1;

      const { data, error } = await supabase
        .from('contas_receber')
        .select('*')
        .eq('organizacao_id', organizacaoId)
        .eq('empresa_id', empresaId)
        .neq('status', 'cancelado')
        .order('data_vencimento', {
          ascending: true,
          nullsFirst: false,
        })
        .order('id', {
          ascending: true,
        })
        .range(inicio, fim);

      if (error) {
        throw error;
      }

      const pagina = data ?? [];

      todas.push(...pagina);

      if (pagina.length < tamanhoPagina) {
        break;
      }

      inicio += tamanhoPagina;
    }

    return todas.map(mapConta);
  },

  async importar(
    linhas: LinhaFaturamentoPreview[],
    organizacaoId: string,
    empresaId: string,
    nomeArquivo: string
  ): Promise<{ importados: number; loteId: string }> {
    // Importa TODAS as linhas exibidas no preview.
    // Status de atenção, erro e duplicado são apenas avisos e não bloqueiam a importação.
    const linhasParaImportar = linhas;
    if (!linhasParaImportar.length) throw new Error('Não existem linhas para importar.');

    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!authData.user) throw new Error('Usuário não autenticado.');

    const total = linhasParaImportar.reduce((sum, l) => sum + Number(l.valorOriginal || 0), 0);

    const { data: lote, error: loteError } = await supabase
      .from('importacoes_faturamento')
      .insert({
        organizacao_id: organizacaoId,
        empresa_id: empresaId,
        user_id: authData.user.id,
        nome_arquivo: nomeArquivo,
        quantidade_registros: linhasParaImportar.length,
        valor_total: total,
        status: 'concluida',
      })
      .select('id')
      .single();

    if (loteError) throw loteError;

    const payload = linhasParaImportar.map(l => ({
      organizacao_id: organizacaoId,
      empresa_id: empresaId,
      user_id: authData.user!.id,
      cliente_nome: l.clienteNome?.trim() || `NÃO INFORMADO - LINHA ${l.linha}`,
      cliente_documento: l.clienteDocumento || null,
      medicao: l.medicao || null,
      numero_documento: l.numeroDocumento?.trim() || `SEM DOCUMENTO - LINHA ${l.linha}`,
      data_vencimento: l.dataVencimento || null,
      valor_original: Number(l.valorOriginal || 0),
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

  async editar(
    conta: ContaReceber,
    dados: {
      clienteNome: string;
      clienteDocumento?: string;
      medicao?: string;
      numeroDocumento: string;
      dataVencimento: string;
      valorOriginal: number;
      observacao?: string;
    }
  ): Promise<ContaReceber> {
    const valorOriginal = Number(dados.valorOriginal);

    if (!dados.clienteNome.trim()) {
      throw new Error('Informe o cliente.');
    }

    if (!dados.numeroDocumento.trim()) {
      throw new Error('Informe o documento.');
    }

    if (!dados.dataVencimento) {
      throw new Error('Informe o vencimento.');
    }

    if (!Number.isFinite(valorOriginal) || valorOriginal <= 0) {
      throw new Error('Informe um valor válido.');
    }

    if (valorOriginal + 0.001 < Number(conta.valorRecebido || 0)) {
      throw new Error(
        'O valor original não pode ser menor que o valor já recebido.'
      );
    }

    const { data, error } = await supabase
      .from('contas_receber')
      .update({
        cliente_nome: dados.clienteNome.trim(),
        cliente_documento:
          dados.clienteDocumento?.trim() || null,
        medicao: dados.medicao?.trim() || null,
        numero_documento:
          dados.numeroDocumento.trim().toUpperCase(),
        data_vencimento: dados.dataVencimento,
        valor_original: valorOriginal,
        observacao:
          dados.observacao?.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', conta.id)
      .eq('organizacao_id', conta.organizacaoId)
      .select('*')
      .single();

    if (error) throw error;

    return mapConta(data);
  },

  async listarDocumentosConta(
    conta: ContaReceber
  ): Promise<ContaReceberDocumento[]> {
    const { data, error } = await supabase
      .from('contas_receber_documentos')
      .select('*')
      .eq('conta_receber_id', conta.id)
      .eq('organizacao_id', conta.organizacaoId)
      .order('created_at', {
        ascending: false,
      });

    if (error) throw error;

    return (data ?? []).map(
      mapDocumentoContaReceber
    );
  },

  async anexarDocumentoConta(
    conta: ContaReceber,
    file: File
  ): Promise<ContaReceberDocumento> {
    if (!file) {
      throw new Error('Selecione um arquivo.');
    }

    const limiteBytes = 15 * 1024 * 1024;

    if (file.size > limiteBytes) {
      throw new Error(
        'O arquivo ultrapassa o limite de 15 MB.'
      );
    }

    const { data: authData, error: authError } =
      await supabase.auth.getUser();

    if (authError) throw authError;

    if (!authData.user) {
      throw new Error('Usuário não autenticado.');
    }

    const nomeSeguro = file.name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9._-]/g, '_');

    const caminho =
      `contas-receber/${conta.organizacaoId}/` +
      `${conta.empresaId}/${conta.id}/` +
      `${Date.now()}_${nomeSeguro}`;

    const { error: uploadError } =
      await supabase.storage
        .from(BUCKET_ANEXOS_RECEBER)
        .upload(caminho, file, {
          cacheControl: '3600',
          upsert: false,
          contentType:
            file.type ||
            'application/octet-stream',
        });

    if (uploadError) {
      throw uploadError;
    }

    const { data: publicData } =
      supabase.storage
        .from(BUCKET_ANEXOS_RECEBER)
        .getPublicUrl(caminho);

    const { data, error } = await supabase
      .from('contas_receber_documentos')
      .insert({
        conta_receber_id: conta.id,
        organizacao_id: conta.organizacaoId,
        empresa_id: conta.empresaId,
        user_id: authData.user.id,
        nome: file.name,
        caminho,
        url: publicData.publicUrl,
        tipo: file.type || null,
      })
      .select('*')
      .single();

    if (error) {
      await supabase.storage
        .from(BUCKET_ANEXOS_RECEBER)
        .remove([caminho]);

      throw error;
    }

    return mapDocumentoContaReceber(data);
  },

  async excluirDocumentoConta(
    documento: ContaReceberDocumento
  ): Promise<void> {
    const confirmouCaminho =
      String(documento.caminho || '').trim();

    if (confirmouCaminho) {
      const { error: storageError } =
        await supabase.storage
          .from(BUCKET_ANEXOS_RECEBER)
          .remove([confirmouCaminho]);

      if (storageError) {
        throw storageError;
      }
    }

    const { error } = await supabase
      .from('contas_receber_documentos')
      .delete()
      .eq('id', documento.id)
      .eq(
        'organizacao_id',
        documento.organizacaoId
      );

    if (error) throw error;
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

  async registrarRecebimentosEmMassa(
    contas: ContaReceber[],
    dataRecebimento: string,
    formaRecebimento = 'transferencia'
  ): Promise<number> {
    const elegiveis = contas.filter(conta => Number(conta.saldo || 0) > 0);
    if (!elegiveis.length) return 0;

    const resultados = await Promise.all(
      elegiveis.map(conta =>
        this.registrarRecebimento(
          conta,
          Number(conta.saldo || 0),
          dataRecebimento,
          formaRecebimento
        )
      )
    );

    return resultados.length;
  },

  async excluirEmMassa(contas: ContaReceber[]): Promise<number> {
    if (!contas.length) return 0;

    const idsPorOrganizacao = new Map<string, string[]>();
    contas.forEach(conta => {
      const ids = idsPorOrganizacao.get(conta.organizacaoId) || [];
      ids.push(conta.id);
      idsPorOrganizacao.set(conta.organizacaoId, ids);
    });

    let excluidas = 0;
    for (const [organizacaoId, ids] of idsPorOrganizacao.entries()) {
      const { error } = await supabase
        .from('contas_receber')
        .delete()
        .eq('organizacao_id', organizacaoId)
        .in('id', ids);

      if (error) throw error;
      excluidas += ids.length;
    }

    return excluidas;
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