export type Urgencia = 'baixa' | 'media' | 'alta';

export type StatusProcesso =
  | 'solicitacao'
  | 'cotacao'
  | 'conferencia'
  | 'autorizacao_diretoria'
  | 'autorizacao_contas'
  | 'pagamento'
  | 'conciliacao'
  | 'finalizado';

export type MetodoPagamento = 'pix' | 'ted' | 'boleto' | 'dinheiro' | 'cartao';

export type StatusProgramacaoPagamento =
  | 'nao_programado'
  | 'programado'
  | 'pago';

export interface Empresa {
  id: string;
  nome: string;
  cnpj: string;
  contaBancaria: string;
  banco: string;
  saldoInicial: number;
  saldoAtual: number;
}

export interface Fornecedor {
  id: string;
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

export interface ProcessoCompra {
  tipoPagamento?: 'fornecedor' | 'interno';
fornecedorId?: string | null;
beneficiarioInterno?: string | null;

formaPagamento?: string | null;
pixTipoChave?: string | null;
pixChave?: string | null;
pixFavorecido?: string | null;
pixBanco?: string | null;
pixObservacao?: string | null;

dataProgramadaPagamento?: string | null;
statusProgramacao?: string;
programadoPor?: string | null;
dataProgramacao?: string | null;

metodoPagamento?: string | null;
dataPagamento?: string | null;
comprovanteNome?: string | null;
comprovanteUrl?: string | null;

}

export interface AlertaSistema {
  id: string;
  tipo: 'urgente' | 'alerta' | 'sucesso' | 'info';
  titulo: string;
  mensagem: string;
  data: string;
  lido: boolean;
  processoId?: string;
}