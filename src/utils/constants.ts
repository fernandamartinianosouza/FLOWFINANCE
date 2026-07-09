/**
 * Constantes globais da aplicação
 */

export const CORES_PIE = ['#0F172A', '#D4AF37', '#5E7A8C', '#8DA9C4'];

export const STATUS_LABELS: Record<string, string> = {
  solicitacao: 'Solicitação',
  cotacao: 'Cotação',
  conferencia: 'Conferência',
  autorizacao_cp: 'Autorização CP',
  autorizacao_diretoria: 'Diretoria',
  pagamento: 'Contas a Pagar',
  conciliacao: 'Conciliação',
  finalizado: 'Finalizado',
};

export const URGENCIA_LABELS: Record<string, string> = {
  baixa: 'Baixa',
  media: 'Média',
  alta: 'Alta',
};

export const TIPO_ALERTA_CORES: Record<string, { bg: string; text: string; dot: string }> = {
  urgente: { bg: 'bg-red-50', text: 'text-red-600', dot: 'bg-red-500' },
  alerta: { bg: 'bg-amber-50', text: 'text-amber-600', dot: 'bg-amber-400' },
  sucesso: { bg: 'bg-emerald-50', text: 'text-emerald-600', dot: 'bg-emerald-500' },
  info: { bg: 'bg-blue-50', text: 'text-blue-600', dot: 'bg-blue-400' },
};

export const METODOS_PAGAMENTO = [
  { valor: 'pix', label: 'PIX Eletrônico (Instantâneo)' },
  { valor: 'ted', label: 'TED / DOC (Mesmo Dia)' },
  { valor: 'boleto', label: 'Boleto Registrado (Compensação 24h)' },
  { valor: 'dinheiro', label: 'Espécie / Fundo de Caixa' },
  { valor: 'cartao', label: 'Cartão de Crédito Corporativo' },
];

export const DATA_HOJE = '2026-07-06';

export const ETAPAS_PROCESSO = [
  { key: 'solicitacao' as const, label: 'Solicitação' },
  { key: 'cotacao' as const, label: 'Cotação' },
  { key: 'conferencia' as const, label: 'Conferência' },
  { key: 'autorizacao_cp' as const, label: 'Autorização CP' },
  { key: 'autorizacao_diretoria' as const, label: 'Diretoria' },
  { key: 'pagamento' as const, label: 'Contas a Pagar' },
  { key: 'conciliacao' as const, label: 'Conciliação' },
  { key: 'finalizado' as const, label: 'Finalizado' },
];

export const PROXIMO_STATUS_MAP: Record<string, string> = {
  'solicitacao': 'cotacao',
  'cotacao': 'conferencia',
  'conferencia': 'autorizacao_cp',
  'autorizacao_cp': 'autorizacao_diretoria',
  'autorizacao_diretoria': 'pagamento',
  'pagamento': 'conciliacao',
  'conciliacao': 'finalizado',
  'finalizado': 'finalizado'
};
