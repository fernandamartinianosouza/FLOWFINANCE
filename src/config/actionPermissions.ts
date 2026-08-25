export type AcaoPermissao =
  | 'visualizar' | 'criar' | 'editar' | 'excluir'
  | 'pagar' | 'receber' | 'aprovar' | 'conciliar'
  | 'importar' | 'exportar' | 'anexar' | 'excluir_anexo' | 'estornar';

export type ModuloPermissao =
  | 'dashboard' | 'compras' | 'autorizacoes' | 'contas_pagar'
  | 'contas_receber' | 'conciliacao' | 'plano_financeiro'
  | 'fornecedores' | 'empresas' | 'rh' | 'usuarios';

export interface DefinicaoModuloPermissao {
  id: ModuloPermissao;
  label: string;
  acoes: AcaoPermissao[];
}

export const MODULOS_PERMISSOES: DefinicaoModuloPermissao[] = [
  { id: 'dashboard', label: 'Dashboard', acoes: ['visualizar', 'exportar'] },
  { id: 'compras', label: 'Compras e solicitações', acoes: ['visualizar', 'criar', 'editar', 'excluir', 'importar', 'exportar', 'anexar', 'excluir_anexo'] },
  { id: 'autorizacoes', label: 'Autorizações', acoes: ['visualizar', 'aprovar'] },
  { id: 'contas_pagar', label: 'Contas a Pagar', acoes: ['visualizar', 'criar', 'editar', 'excluir', 'pagar', 'estornar', 'importar', 'exportar', 'anexar', 'excluir_anexo'] },
  { id: 'contas_receber', label: 'Contas a Receber', acoes: ['visualizar', 'criar', 'editar', 'excluir', 'receber', 'estornar', 'importar', 'exportar', 'anexar', 'excluir_anexo'] },
  { id: 'conciliacao', label: 'Conciliação', acoes: ['visualizar', 'conciliar', 'exportar'] },
  { id: 'plano_financeiro', label: 'Plano Financeiro', acoes: ['visualizar', 'criar', 'editar', 'excluir', 'importar', 'exportar'] },
  { id: 'fornecedores', label: 'Fornecedores', acoes: ['visualizar', 'criar', 'editar', 'excluir', 'importar', 'exportar'] },
  { id: 'empresas', label: 'Empresas', acoes: ['visualizar', 'criar', 'editar', 'excluir'] },
  { id: 'rh', label: 'RH Financeiro', acoes: ['visualizar', 'criar', 'editar', 'excluir', 'exportar'] },
  { id: 'usuarios', label: 'Usuários e permissões', acoes: ['visualizar', 'criar', 'editar', 'excluir'] },
];

export const ACAO_LABELS: Record<AcaoPermissao, string> = {
  visualizar: 'Visualizar', criar: 'Criar', editar: 'Editar', excluir: 'Excluir',
  pagar: 'Pagar', receber: 'Receber', aprovar: 'Aprovar', conciliar: 'Conciliar',
  importar: 'Importar', exportar: 'Exportar', anexar: 'Anexar',
  excluir_anexo: 'Excluir anexo', estornar: 'Estornar',
};

export const permissoesPadraoPerfil = (perfil: string) => {
  const todas = MODULOS_PERMISSOES.flatMap(m => m.acoes.map(acao => ({ modulo: m.id, acao, permitido: true })));
  if (perfil === 'admin' || perfil === 'diretoria') return todas;
  if (perfil === 'consulta') return MODULOS_PERMISSOES.map(m => ({ modulo: m.id, acao: 'visualizar' as AcaoPermissao, permitido: true }));
  const modulos = perfil === 'compras'
    ? ['dashboard', 'compras', 'fornecedores']
    : ['dashboard', 'contas_pagar', 'contas_receber', 'conciliacao', 'plano_financeiro', 'fornecedores'];
  return todas.filter(p => modulos.includes(p.modulo));
};
