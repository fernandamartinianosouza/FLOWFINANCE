import * as XLSX from 'xlsx';
import { supabase } from '../lib/supabase';

export type FornecedorImportado = {
  linha: number;
  razaoSocial: string;
  cnpj: string;
  nomeFantasia: string;
  endereco: string;
  bairro: string;
  cidade: string;
  telefone: string;
  email: string;
  vendedorPadrao: string;
  chavePix: string;
  prazo: string;
  entrega: string;
  frete: string;
  status: 'valido' | 'duplicado' | 'erro';
  mensagem?: string;
};

const CABECALHOS = {
  razaoSocial: 'Razão Social / Nome Completo *',
  cnpj: 'CNPJ/CPF',
  nomeFantasia: 'Nome Fantasia / Nome Abreviado',
  endereco: 'Endereço',
  bairro: 'Bairro',
  cidade: 'Cidade',
  telefone: 'Telefone',
  email: 'Email',
  vendedorPadrao: 'Vendedor padrão para o Cliente',
  chavePix: 'Chave PIX',
  prazo: 'Prazo',
  entrega: 'entrega',
  frete: 'frete',
} as const;

const texto = (valor: unknown) => String(valor ?? '').trim();
const normalizarDocumento = (valor: unknown) => texto(valor).replace(/\D/g, '');
const normalizarEmail = (valor: unknown) => texto(valor).toLowerCase();

const emailValido = (email: string) =>
  !email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export async function lerPlanilhaFornecedores(
  arquivo: File,
  documentosExistentes: string[] = [],
): Promise<FornecedorImportado[]> {
  const buffer = await arquivo.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const primeiraAba = workbook.SheetNames[0];

  if (!primeiraAba) {
    throw new Error('A planilha não possui nenhuma aba.');
  }

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
    workbook.Sheets[primeiraAba],
    { defval: '', raw: false },
  );

  const existentes = new Set(documentosExistentes.map(normalizarDocumento).filter(Boolean));
  const encontradosNoArquivo = new Set<string>();

  return rows
    .map((row, index): FornecedorImportado => {
      const razaoSocial = texto(row[CABECALHOS.razaoSocial]);
      const cnpj = normalizarDocumento(row[CABECALHOS.cnpj]);
      const email = normalizarEmail(row[CABECALHOS.email]);

      const item: FornecedorImportado = {
        linha: index + 2,
        razaoSocial,
        cnpj,
        nomeFantasia: texto(row[CABECALHOS.nomeFantasia]),
        endereco: texto(row[CABECALHOS.endereco]),
        bairro: texto(row[CABECALHOS.bairro]),
        cidade: texto(row[CABECALHOS.cidade]),
        telefone: texto(row[CABECALHOS.telefone]),
        email,
        vendedorPadrao: texto(row[CABECALHOS.vendedorPadrao]),
        chavePix: texto(row[CABECALHOS.chavePix]),
        prazo: texto(row[CABECALHOS.prazo]),
        entrega: texto(row[CABECALHOS.entrega]),
        frete: texto(row[CABECALHOS.frete]),
        status: 'valido',
      };

      const linhaVazia = Object.values(item)
        .filter((_, keyIndex) => keyIndex > 0 && keyIndex < 14)
        .every(valor => !texto(valor));

      if (linhaVazia) {
        return { ...item, status: 'erro', mensagem: 'Linha vazia.' };
      }

      if (!razaoSocial) {
        return {
          ...item,
          status: 'erro',
          mensagem: 'Razão Social / Nome Completo é obrigatório.',
        };
      }

      if (cnpj && ![11, 14].includes(cnpj.length)) {
        return {
          ...item,
          status: 'erro',
          mensagem: 'CNPJ/CPF deve conter 11 ou 14 dígitos.',
        };
      }

      if (!emailValido(email)) {
        return { ...item, status: 'erro', mensagem: 'E-mail inválido.' };
      }

      if (cnpj && (existentes.has(cnpj) || encontradosNoArquivo.has(cnpj))) {
        return {
          ...item,
          status: 'duplicado',
          mensagem: 'Documento já cadastrado ou repetido na planilha.',
        };
      }

      if (cnpj) encontradosNoArquivo.add(cnpj);
      return item;
    })
    .filter(item => item.mensagem !== 'Linha vazia.');
}

export async function importarFornecedoresEmLote(params: {
  itens: FornecedorImportado[];
  organizacaoId: string;
  empresaId?: string;
}) {
  const { itens, organizacaoId, empresaId } = params;
  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (authError) throw authError;
  if (!authData.user) throw new Error('Usuário não autenticado.');
  if (!organizacaoId) throw new Error('Nenhuma organização ativa foi encontrada.');

  const validos = itens.filter(item => item.status === 'valido');

  if (!validos.length) {
    return { importados: 0 };
  }

  const registros = validos.map(item => ({
    organizacao_id: organizacaoId,
    empresa_id: empresaId || null,
    user_id: authData.user!.id,
    nome: item.razaoSocial,
    razao_social: item.razaoSocial,
    cnpj: item.cnpj || null,
    nome_fantasia: item.nomeFantasia || null,
    endereco: item.endereco || null,
    bairro: item.bairro || null,
    cidade: item.cidade || null,
    telefone: item.telefone || null,
    email: item.email || null,
    vendedor_padrao: item.vendedorPadrao || null,
    chave_pix: item.chavePix || null,
    prazo: item.prazo || null,
    entrega: item.entrega || null,
    frete: item.frete || null,
  }));

  const { error } = await supabase.from('fornecedores').insert(registros);
  if (error) throw error;

  return { importados: registros.length };
}

export function baixarModeloFornecedores() {
  const worksheet = XLSX.utils.aoa_to_sheet([Object.values(CABECALHOS)]);
  worksheet['!cols'] = [
    { wch: 42 }, { wch: 20 }, { wch: 32 }, { wch: 35 }, { wch: 22 },
    { wch: 24 }, { wch: 18 }, { wch: 32 }, { wch: 30 }, { wch: 28 },
    { wch: 16 }, { wch: 18 }, { wch: 18 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Fornecedores');
  XLSX.writeFile(workbook, 'MODELO_IMPORTACAO_FORNECEDORES.xlsx');
}
