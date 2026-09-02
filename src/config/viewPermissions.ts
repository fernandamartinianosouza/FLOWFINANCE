import { AcaoPermissao, ModuloPermissao } from './actionPermissions';

export interface PermissaoView {
  modulo: ModuloPermissao;
  acao: AcaoPermissao;
}

const MAPA_VIEWS: Record<string, PermissaoView> = {
  dashboard: { modulo: 'dashboard', acao: 'visualizar' },

  processos: { modulo: 'contas_pagar', acao: 'visualizar' },
  solicitacao: { modulo: 'compras', acao: 'criar' },
  'catalogo-itens': { modulo: 'compras', acao: 'visualizar' },
  cotacoes: { modulo: 'compras', acao: 'visualizar' },
  'planejamento-compras': { modulo: 'compras', acao: 'visualizar' },
  autorizacoes: { modulo: 'autorizacoes', acao: 'visualizar' },

  'nova-conta': { modulo: 'contas_pagar', acao: 'criar' },
  'contas-pagar': { modulo: 'contas_pagar', acao: 'visualizar' },
  programacao: { modulo: 'contas_pagar', acao: 'visualizar' },
  'pagamentos-programados': { modulo: 'contas_pagar', acao: 'visualizar' },
  conciliacao: { modulo: 'conciliacao', acao: 'visualizar' },
  'centro-financeiro': { modulo: 'plano_financeiro', acao: 'visualizar' },
  calendario: { modulo: 'contas_pagar', acao: 'visualizar' },
  'fluxo-caixa': { modulo: 'contas_receber', acao: 'visualizar' },

  empresas: { modulo: 'empresas', acao: 'visualizar' },
  fornecedores: { modulo: 'fornecedores', acao: 'visualizar' },
  'rh-financeiro': { modulo: 'rh', acao: 'visualizar' },
  usuarios: { modulo: 'usuarios', acao: 'visualizar' },
};

export const obterPermissaoView = (view: string): PermissaoView =>
  MAPA_VIEWS[view] || { modulo: 'dashboard', acao: 'visualizar' };
