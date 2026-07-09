import { Empresa, Fornecedor, PlanoFinanceiro, CentroCusto, ProcessoCompra, AlertaSistema } from '../types';

export const INITIAL_EMPRESAS: Empresa[] = [
  {
    id: 'emp-1',
    nome: 'FlowFinance Corporate Ltda',
    cnpj: '12.345.678/0001-90',
    contaBancaria: 'Ag: 1827-2 | CC: 98127-4',
    banco: 'Banco Itaú S.A.',
    saldoInicial: 1500000.00,
    saldoAtual: 1420550.00,
  },
  {
    id: 'emp-2',
    nome: 'Flow Holding de Participações S.A.',
    cnpj: '98.765.432/0001-21',
    contaBancaria: 'Ag: 0101-0 | CC: 44520-1',
    banco: 'Banco BTG Pactual S.A.',
    saldoInicial: 4200000.00,
    saldoAtual: 4185000.00,
  },
  {
    id: 'emp-3',
    nome: 'Flow Logística & Distribuição',
    cnpj: '45.890.123/0001-55',
    contaBancaria: 'Ag: 3340-1 | CC: 12093-9',
    banco: 'Banco Santander Brasil',
    saldoInicial: 850000.00,
    saldoAtual: 832100.00,
  }
];

export const INITIAL_FORNECEDORES: Fornecedor[] = [
  {
    id: 'for-1',
    nome: 'Pirelli Distribuidora de Pneus',
    cnpj: '02.431.192/0001-30',
    email: 'corporativo@pirelli.com.br',
    telefone: '(11) 4004-9821',
    historicoCompras: 245000.00,
    ultimaCompra: '2026-06-12',
    tempoMedioPagamento: 28,
  },
  {
    id: 'for-2',
    nome: 'Dell Computadores do Brasil Ltda',
    cnpj: '72.381.182/0001-99',
    email: 'vendas.corporate@dell.com',
    telefone: '0800-722-3355',
    historicoCompras: 540000.00,
    ultimaCompra: '2026-06-28',
    tempoMedioPagamento: 30,
  },
  {
    id: 'for-3',
    nome: 'Amazon Web Services S.A.',
    cnpj: '15.431.902/0001-12',
    email: 'billing-brazil@amazon.com',
    telefone: '(11) 3003-0912',
    historicoCompras: 182300.00,
    ultimaCompra: '2026-07-01',
    tempoMedioPagamento: 15,
  },
  {
    id: 'for-4',
    nome: 'Office Depot Suprimentos de Escritório',
    cnpj: '08.991.127/0001-44',
    email: 'atendimento@officedepot.com.br',
    telefone: '(11) 2191-2200',
    historicoCompras: 43200.00,
    ultimaCompra: '2026-05-15',
    tempoMedioPagamento: 45,
  },
  {
    id: 'for-5',
    nome: 'Seguradora Porto Seguro S.A.',
    cnpj: '61.190.496/0001-18',
    email: 'sinistros.corp@portoseguro.com.br',
    telefone: '(11) 3337-6782',
    historicoCompras: 95000.00,
    ultimaCompra: '2026-06-01',
    tempoMedioPagamento: 30,
  },
  {
    id: 'for-6',
    nome: 'Agência LeadForce Marketing Digital',
    cnpj: '44.120.912/0001-87',
    email: 'contato@leadforce.com.br',
    telefone: '(11) 98127-1122',
    historicoCompras: 120000.00,
    ultimaCompra: '2026-07-03',
    tempoMedioPagamento: 30,
  }
];

export const INITIAL_PLANOS_FINANCEIROS: PlanoFinanceiro[] = [
  {
    id: 'plan-1',
    nome: 'MANUTENÇÃO',
    tetoAnual: 350000.00,
    tetoMensal: 30000.00,
    utilizado: 18200.00,
    comprometido: 8500.00,
    centrosCustoIds: ['cc-1', 'cc-2', 'cc-3', 'cc-4'],
  },
  {
    id: 'plan-2',
    nome: 'ADMINISTRATIVO',
    tetoAnual: 1200000.00,
    tetoMensal: 100000.00,
    utilizado: 64200.00,
    comprometido: 15400.00,
    centrosCustoIds: ['cc-5', 'cc-6', 'cc-7', 'cc-8'],
  },
  {
    id: 'plan-3',
    nome: 'INFRAESTRUTURA & TI',
    tetoAnual: 800000.00,
    tetoMensal: 70000.00,
    utilizado: 45900.00,
    comprometido: 25000.00,
    centrosCustoIds: ['cc-9', 'cc-10'],
  }
];

export const INITIAL_CENTROS_CUSTOS: CentroCusto[] = [
  // Manutenção (plan-1)
  { id: 'cc-1', nome: 'Pneus', planoFinanceiroId: 'plan-1', tetoMensal: 10000.00, utilizado: 8500.00 },
  { id: 'cc-2', nome: 'Peças de Reposição', planoFinanceiroId: 'plan-1', tetoMensal: 8000.00, utilizado: 4200.00 },
  { id: 'cc-3', nome: 'Oficina Terceirizada', planoFinanceiroId: 'plan-1', tetoMensal: 7000.00, utilizado: 3500.00 },
  { id: 'cc-4', nome: 'Lubrificantes', planoFinanceiroId: 'plan-1', tetoMensal: 5000.00, utilizado: 2000.00 },

  // Administrativo (plan-2)
  { id: 'cc-5', nome: 'Marketing Digital', planoFinanceiroId: 'plan-2', tetoMensal: 30000.00, utilizado: 15000.00 },
  { id: 'cc-6', nome: 'Recursos Humanos', planoFinanceiroId: 'plan-2', tetoMensal: 20000.00, utilizado: 12200.00 },
  { id: 'cc-7', nome: 'Material de Escritório', planoFinanceiroId: 'plan-2', tetoMensal: 10000.00, utilizado: 4500.00 },
  { id: 'cc-8', nome: 'Financeiro e Auditoria', planoFinanceiroId: 'plan-2', tetoMensal: 40000.00, utilizado: 32500.00 },

  // Infraestrutura & TI (plan-3)
  { id: 'cc-9', nome: 'Cloud & Servidores', planoFinanceiroId: 'plan-3', tetoMensal: 45000.00, utilizado: 28900.00 },
  { id: 'cc-10', nome: 'Hardware e Notebooks', planoFinanceiroId: 'plan-3', tetoMensal: 25000.00, utilizado: 17000.00 }
];

export const INITIAL_PROCESSOS: ProcessoCompra[] = [
  {
    id: 'FF-2026-101',
    fornecedorId: 'for-1',
    empresaId: 'emp-1',
    planoFinanceiroId: 'plan-1',
    centroCustoId: 'cc-1',
    descricao: 'Compra de 24 pneus de carga pesada para frota logística regional.',
    valor: 8500.00,
    urgencia: 'alta',
    responsavel: 'Antônio Silva (Logística)',
    dataCriacao: '2026-07-01',
    status: 'solicitacao',
    prazo: '2026-07-10',
    anexoNome: 'solicitacao_compra_pneus.pdf',
    historico: [
      { data: '2026-07-01 09:12', usuario: 'Antônio Silva', deStatus: 'criacao', paraStatus: 'solicitacao', observacao: 'Solicitação inicial aberta conforme necessidade da frota de São Paulo.' }
    ]
  },
  {
    id: 'FF-2026-102',
    fornecedorId: 'for-6',
    empresaId: 'emp-1',
    planoFinanceiroId: 'plan-2',
    centroCustoId: 'cc-5',
    descricao: 'Orçamento de campanha de Ads institucional e geração de Leads corporativos Q3.',
    valor: 15000.00,
    urgencia: 'media',
    responsavel: 'Carolina Menezes (Marketing)',
    dataCriacao: '2026-06-29',
    status: 'cotacao',
    prazo: '2026-07-15',
    anexoNome: 'proposta_campanha_leadforce.pdf',
    historico: [
      { data: '2026-06-29 14:30', usuario: 'Carolina Menezes', deStatus: 'criacao', paraStatus: 'solicitacao' },
      { data: '2026-06-30 11:00', usuario: 'Sérgio Santos (Compras)', deStatus: 'solicitacao', paraStatus: 'cotacao', observacao: 'Cotação enviada para fornecedor parceiro.' }
    ]
  },
  {
    id: 'FF-2026-103',
    fornecedorId: 'for-4',
    empresaId: 'emp-3',
    planoFinanceiroId: 'plan-2',
    centroCustoId: 'cc-7',
    descricao: 'Renovação de insumos de escritório para a sede administrativa de Campinas.',
    valor: 4500.00,
    urgencia: 'baixa',
    responsavel: 'Felipe Matos (Facilities)',
    dataCriacao: '2026-06-28',
    status: 'conferencia',
    prazo: '2026-07-20',
    anexoNome: 'listagem_suprimentos_campinas.xlsx',
    historico: [
      { data: '2026-06-28 08:00', usuario: 'Felipe Matos', deStatus: 'criacao', paraStatus: 'solicitacao' },
      { data: '2026-06-28 16:30', usuario: 'Felipe Matos', deStatus: 'solicitacao', paraStatus: 'cotacao' },
      { data: '2026-06-30 09:15', usuario: 'Sérgio Santos (Compras)', deStatus: 'cotacao', paraStatus: 'conferencia', observacao: 'Documentação validada. Pronto para aprovação.' }
    ]
  },
  {
    id: 'FF-2026-104',
    fornecedorId: 'for-2',
    empresaId: 'emp-1',
    planoFinanceiroId: 'plan-3',
    centroCustoId: 'cc-10',
    descricao: 'Aquisição de 3 Notebooks Dell Latitude 3440 para novos analistas do Financeiro.',
    valor: 17000.00,
    urgencia: 'alta',
    responsavel: 'Marcus Rezende (TI)',
    dataCriacao: '2026-06-25',
    status: 'autorizacao_cp',
    prazo: '2026-07-08',
    anexoNome: 'cotacao_dell_latitude.pdf',
    historico: [
      { data: '2026-06-25 10:00', usuario: 'Marcus Rezende', deStatus: 'criacao', paraStatus: 'solicitacao' },
      { data: '2026-06-26 15:45', usuario: 'Sérgio Santos (Compras)', deStatus: 'solicitacao', paraStatus: 'cotacao' },
      { data: '2026-06-27 11:20', usuario: 'Sérgio Santos (Compras)', deStatus: 'cotacao', paraStatus: 'conferencia' },
      { data: '2026-06-29 09:00', usuario: 'Validação Automatizada', deStatus: 'conferencia', paraStatus: 'autorizacao_cp', observacao: 'Enviado para aprovação do Controle de Pagamentos (CP).' }
    ]
  },
  {
    id: 'FF-2026-105',
    fornecedorId: 'for-3',
    empresaId: 'emp-2',
    planoFinanceiroId: 'plan-3',
    centroCustoId: 'cc-9',
    descricao: 'Pagamento mensal de infraestrutura AWS Cloud Hosting - Produção e Homologação.',
    valor: 28900.00,
    urgencia: 'alta',
    responsavel: 'Clara Nobre (DevOps)',
    dataCriacao: '2026-07-01',
    status: 'autorizacao_diretoria',
    prazo: '2026-07-07',
    anexoNome: 'aws_invoice_july_2026.pdf',
    historico: [
      { data: '2026-07-01 01:00', usuario: 'AWS Billing System', deStatus: 'criacao', paraStatus: 'solicitacao' },
      { data: '2026-07-01 09:00', usuario: 'Clara Nobre', deStatus: 'solicitacao', paraStatus: 'conferencia' },
      { data: '2026-07-01 10:30', usuario: 'Maurício Mendes (CP)', deStatus: 'conferencia', paraStatus: 'autorizacao_cp', observacao: 'Autorizado CP. Valor superior ao teto operacional do departamento.' },
      { data: '2026-07-02 11:15', usuario: 'Maurício Mendes (CP)', deStatus: 'autorizacao_cp', paraStatus: 'autorizacao_diretoria', observacao: 'Encaminhado com urgência para a Diretoria Financeira.' }
    ]
  },
  {
    id: 'FF-2026-106',
    fornecedorId: 'for-5',
    empresaId: 'emp-1',
    planoFinanceiroId: 'plan-2',
    centroCustoId: 'cc-8',
    descricao: 'Seguro empresarial anual predial e de frotas - Sede Central.',
    valor: 32500.00,
    urgencia: 'media',
    responsavel: 'Letícia Malta (Jurídico/Risco)',
    dataCriacao: '2026-06-20',
    status: 'pagamento',
    prazo: '2026-07-06',
    anexoNome: 'apolice_porto_seguro_2026.pdf',
    historico: [
      { data: '2026-06-20 11:00', usuario: 'Letícia Malta', deStatus: 'criacao', paraStatus: 'solicitacao' },
      { data: '2026-06-22 14:00', usuario: 'Sérgio Santos (Compras)', deStatus: 'solicitacao', paraStatus: 'conferencia' },
      { data: '2026-06-24 10:00', usuario: 'Renata Lodi (CP)', deStatus: 'conferencia', paraStatus: 'autorizacao_cp' },
      { data: '2026-06-25 17:00', usuario: 'Roberto Alencar (Diretoria)', deStatus: 'autorizacao_cp', paraStatus: 'autorizacao_diretoria', observacao: 'Aprovado pelo conselho.' },
      { data: '2026-06-26 09:30', usuario: 'Financeiro Flow', deStatus: 'autorizacao_diretoria', paraStatus: 'pagamento', observacao: 'Aguardando programação bancária ou PIX.' }
    ]
  },
  {
    id: 'FF-2026-107',
    fornecedorId: 'for-1',
    empresaId: 'emp-1',
    planoFinanceiroId: 'plan-1',
    centroCustoId: 'cc-2',
    descricao: 'Compra emergencial de amortecedores e pastilhas para caminhão de entrega placa FLW-9238.',
    valor: 4200.00,
    urgencia: 'alta',
    responsavel: 'Antônio Silva (Logística)',
    dataCriacao: '2026-07-02',
    status: 'conciliacao',
    prazo: '2026-07-04',
    anexoNome: 'orcamento_oficina_autopeças.pdf',
    metodoPagamento: 'pix',
    dataPagamento: '2026-07-03',
    comprovanteNome: 'comprovante_pix_4200_pirelli.pdf',
    historico: [
      { data: '2026-07-02 08:30', usuario: 'Antônio Silva', deStatus: 'criacao', paraStatus: 'solicitacao' },
      { data: '2026-07-02 09:45', usuario: 'Renata Lodi (CP)', deStatus: 'solicitacao', paraStatus: 'autorizacao_cp', observacao: 'Autorizado de forma emergencial.' },
      { data: '2026-07-02 10:15', usuario: 'Roberto Alencar (Diretoria)', deStatus: 'autorizacao_cp', paraStatus: 'autorizacao_diretoria', observacao: 'Autorizado em caráter de urgência.' },
      { data: '2026-07-03 14:00', usuario: 'Financeiro Flow', deStatus: 'autorizacao_diretoria', paraStatus: 'pagamento' },
      { data: '2026-07-03 14:15', usuario: 'Financeiro Flow', deStatus: 'pagamento', paraStatus: 'conciliacao', observacao: 'Pago via PIX com sucesso. Aguardando conciliação de extrato.' }
    ]
  }
];

export const INITIAL_ALERTAS: AlertaSistema[] = [
  {
    id: 'alert-1',
    tipo: 'urgente',
    titulo: 'Aprovação Necessária',
    mensagem: 'AWS Cloud Hosting ultrapassou R$ 25.000,00 e requer autorização de Diretoria.',
    data: '2026-07-02 11:15',
    lido: false,
    processoId: 'FF-2026-105'
  },
  {
    id: 'alert-2',
    tipo: 'alerta',
    titulo: 'Vencimento Próximo',
    mensagem: 'Seguro Empresarial anual da Sede vence hoje (R$ 32.500,00).',
    data: '2026-07-06 08:00',
    lido: false,
    processoId: 'FF-2026-106'
  },
  {
    id: 'alert-3',
    tipo: 'sucesso',
    titulo: 'Pagamento Realizado',
    mensagem: 'PIX de R$ 4.200,00 enviado para Pirelli Distribuidora com sucesso.',
    data: '2026-07-03 14:15',
    lido: true,
    processoId: 'FF-2026-107'
  }
];
