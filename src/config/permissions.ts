export type PerfilUsuario =
  | 'compras'
  | 'contas_pagar'
  | 'diretoria'
  | 'admin';

export const PERMISSIONS: Record<
  PerfilUsuario,
  string[]
> = {
  compras: [
    'dashboard',
    'processos',
    'solicitacao',
    'catalogo-itens',
    'cotacoes',
    'planejamento-compras',
    'fornecedores',
  ],

  contas_pagar: [
    'dashboard',
    'processos',
    'solicitacao',
    'autorizacoes',
    'nova-conta',
    'contas-pagar',
    'catalogo-itens',
    'cotacoes',
    'planejamento-compras',
    'programacao',
    'pagamentos-programados',
    'conciliacao',
    'centro-financeiro',
    'fluxo-caixa',
    'calendario',
    'fornecedores',
    'empresas',
  ],

  diretoria: [
    '*',
  ],

  admin: [
    '*',
  ],
};

export const podeAcessar = (
  perfil:
    | PerfilUsuario
    | string
    | null
    | undefined,
  view: string
): boolean => {
  if (!perfil) {
    return false;
  }

  const permissoes =
    PERMISSIONS[
      perfil as PerfilUsuario
    ];

  if (!permissoes) {
    return false;
  }

  return (
    permissoes.includes('*') ||
    permissoes.includes(view)
  );
};