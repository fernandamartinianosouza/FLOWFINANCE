export type Urgencia =
  | 'baixa'
  | 'media'
  | 'alta';

export type StatusProcesso =
  | 'solicitacao'
  | 'cotacao'
  | 'conferencia'
  | 'autorizacao_diretoria'
  | 'autorizacao_contas'
  | 'pagamento'
  | 'conciliacao'
  | 'finalizado';

export type OrigemProcesso =
  | 'solicitacao_compra'
  | 'conta_pagar';

export type TipoConta =
  | 'boleto'
  | 'pix'
  | 'transferencia'
  | 'tributo'
  | 'salario'
  | 'aluguel'
  | 'contrato'
  | 'servico'
  | 'outra';

export type MetodoPagamento =
  | 'pix'
  | 'ted'
  | 'boleto'
  | 'deposito'
  | 'dinheiro'
  | 'cartao';

export type StatusProgramacaoPagamento =
  | 'nao_programado'
  | 'programado'
  | 'pago';

export type TipoPagamento =
  | 'fornecedor'
  | 'interno';

export type PerfilOrganizacao =
  | 'super_admin'
  | 'admin'
  | 'diretoria'
  | 'compras'
  | 'contas_pagar'
  | 'visualizador';

export interface Organizacao {
  id: string;
  nome: string;
  slug: string;
  documento?: string | null;
  plano: string;
  ativo: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface UsuarioOrganizacao {
  id: string;
  userId: string;
  organizacaoId: string;
  perfil: PerfilOrganizacao;
  ativo: boolean;
  createdAt?: string;
  organizacao?: Organizacao;
}

export interface Empresa {
  id: string;
  organizacaoId: string;
  nome: string;
  cnpj: string;
  contaBancaria: string;
  banco: string;
  saldoInicial: number;
  saldoAtual: number;
}

export interface Fornecedor {
  id: string;
  organizacaoId: string;
  nome: string;
  cnpj: string;
  email: string;
  telefone: string;
  historicoCompras: number;
  ultimaCompra: string;
  tempoMedioPagamento: number;
}

export interface CentroCusto {
  id: string;
  nome: string;
  descricao?: string;
  empresaId?: string;
  planoFinanceiroId: string;
  tetoMensal: number;
  orcamentoMensal?: number;
  utilizado: number;
}

export interface PlanoFinanceiro {
  id: string;
  organizacaoId: string;
  empresaId?: string;
  nome: string;
  descricao?: string;
  tetoAnual: number;
  tetoMensal: number;
  orcamentoAnual?: number;
  orcamentoMensal?: number;
  utilizado: number;
  comprometido: number;
  centrosCustoIds?: string[];
}

export interface OrcamentoMensal {
  id: string;
  organizacaoId: string;
  empresaId: string;
  planoFinanceiroId?: string | null;
  centroCustoId?: string | null;
  competencia: string;
  valorOrcado: number;
  utilizado?: number;
  comprometido?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface DespesaDetalhe {
  id: string;
  processoId?: string;
  planoFinanceiroId: string;
  centroCustoId: string;
  descricao: string;
  valor: number;
  data: string;
}

export interface HistoricoStatus {
  data: string;
  usuario: string;
  deStatus: StatusProcesso | 'criacao';
  paraStatus: StatusProcesso;
  observacao?: string;
}

export interface ProcessoDocumento {
  id: string;
  processoId: string;
  tipo: string;
  nome: string;
  url: string;
  caminho?: string | null;
  enviadoPor?: string | null;
  createdAt?: string;
}

export interface PagamentoProcesso {
  id: string;
  processoId: string;
  userId?: string | null;
  valorPago: number;
  metodoPagamento: MetodoPagamento | string;
  dataPagamento: string;
  comprovante?: string | null;
  observacao?: string | null;
  createdAt?: string;
}

export interface ProcessoCompra {
  id: string;
  dbId?: string;

  organizacaoId: string;
  empresaId: string;

  fornecedorId?: string | null;
  planoFinanceiroId?: string | null;
  centroCustoId?: string | null;

  origem: OrigemProcesso;

  tipoConta?: TipoConta | string | null;
  dataEmissao?: string | null;
  dataVencimento?: string | null;
  numeroDocumento?: string | null;
  codigoBarras?: string | null;
  recorrente?: boolean;

  descricao: string;
  valor: number;
  urgencia: Urgencia;
  responsavel: string;
  dataCriacao: string;
  status: StatusProcesso;
  prazo?: string | null;

  tipoPagamento?: TipoPagamento;
  beneficiarioInterno?: string | null;

  formaPagamento?: MetodoPagamento | string | null;

  pixTipoChave?: string | null;
  pixChave?: string | null;
  pixFavorecido?: string | null;
  pixBanco?: string | null;
  pixObservacao?: string | null;

  anexoNome?: string | null;
  anexoUrl?: string | null;

  dataProgramadaPagamento?: string | null;
  statusProgramacao?: StatusProgramacaoPagamento;
  programadoPor?: string | null;
  dataProgramacao?: string | null;

  metodoPagamento?: MetodoPagamento | string | null;
  dataPagamento?: string | null;

  comprovanteNome?: string | null;
  comprovanteUrl?: string | null;

  valorPago?: number;
  saldoPagar?: number;
  pagamentoParcial?: boolean;

  historico?: HistoricoStatus[];
  documentos?: ProcessoDocumento[];
  pagamentos?: PagamentoProcesso[];
}

export interface NovaContaInput {
  empresaId: string;

  fornecedorId?: string | null;
  planoFinanceiroId?: string | null;
  centroCustoId?: string | null;

  tipoConta: TipoConta | string;
  tipoPagamento: TipoPagamento;

  beneficiarioInterno?: string | null;

  descricao: string;
  valor: number;

  dataEmissao?: string | null;
  dataVencimento: string;

  numeroDocumento?: string | null;
  codigoBarras?: string | null;

  formaPagamento?: MetodoPagamento | string | null;

  pixTipoChave?: string | null;
  pixChave?: string | null;
  pixFavorecido?: string | null;
  pixBanco?: string | null;
  pixObservacao?: string | null;

  recorrente?: boolean;

  anexoNome?: string | null;
  anexoUrl?: string | null;

  observacao?: string | null;
}

export interface AlertaSistema {
  id: string;
  organizacaoId: string;
  tipo:
    | 'urgente'
    | 'alerta'
    | 'sucesso'
    | 'info';
  titulo: string;
  mensagem: string;
  data: string;
  lido: boolean;
  processoId?: string;
}
export interface SegmentoItem {
  id: string;
  organizacaoId: string;

  nome: string;
  descricao?: string | null;
  ativo: boolean;

  createdAt?: string;
  updatedAt?: string;
}

export interface ItemCatalogo {
  id: string;
  organizacaoId: string;
  segmentoId: string;

  nome: string;
  descricao?: string | null;
  unidadeMedida: string;
  codigoInterno?: string | null;
  marcaReferencia?: string | null;
  especificacao?: string | null;

  ativo: boolean;

  segmento?: SegmentoItem;
  fornecedores?: ItemFornecedor[];

  createdAt?: string;
  updatedAt?: string;
}

export interface ItemFornecedor {
  id: string;
  organizacaoId: string;
  itemId: string;
  fornecedorId: string;

  codigoFornecedor?: string | null;
  marcaFornecida?: string | null;
  ultimoPreco?: number | null;
  prazoEntregaDias?: number | null;
  quantidadeMinima?: number | null;
  observacoes?: string | null;

  fornecedorPreferencial: boolean;
  ativo: boolean;

  fornecedor?: Fornecedor;

  createdAt?: string;
  updatedAt?: string;
}

export interface NovoSegmentoItemInput {
  nome: string;
  descricao?: string | null;
  ativo?: boolean;
}

export interface AtualizarSegmentoItemInput {
  nome?: string;
  descricao?: string | null;
  ativo?: boolean;
}

export interface NovoItemCatalogoInput {
  segmentoId: string;

  nome: string;
  descricao?: string | null;
  unidadeMedida: string;
  codigoInterno?: string | null;
  marcaReferencia?: string | null;
  especificacao?: string | null;

  ativo?: boolean;
}

export interface AtualizarItemCatalogoInput {
  segmentoId?: string;

  nome?: string;
  descricao?: string | null;
  unidadeMedida?: string;
  codigoInterno?: string | null;
  marcaReferencia?: string | null;
  especificacao?: string | null;

  ativo?: boolean;
}

export interface VincularFornecedorItemInput {
  itemId: string;
  fornecedorId: string;

  codigoFornecedor?: string | null;
  marcaFornecida?: string | null;
  ultimoPreco?: number | null;
  prazoEntregaDias?: number | null;
  quantidadeMinima?: number | null;
  observacoes?: string | null;

  fornecedorPreferencial?: boolean;
  ativo?: boolean;
}

export interface AtualizarFornecedorItemInput {
  codigoFornecedor?: string | null;
  marcaFornecida?: string | null;
  ultimoPreco?: number | null;
  prazoEntregaDias?: number | null;
  quantidadeMinima?: number | null;
  observacoes?: string | null;

  fornecedorPreferencial?: boolean;
  ativo?: boolean;
}
