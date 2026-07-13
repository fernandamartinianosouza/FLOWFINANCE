import {
  Empresa,
  Fornecedor,
  PlanoFinanceiro,
  CentroCusto,
  ProcessoCompra,
  AlertaSistema,
  HistoricoStatus,
} from '../types';

const numero = (valor: any) => {
  const n = Number(valor ?? 0);
  return Number.isFinite(n) ? n : 0;
};

const textoOuNull = (valor: any) => {
  const texto = String(valor ?? '').trim();
  return texto ? texto : null;
};

export const mapEmpresaFromDb = (item: any): Empresa => ({
  id: item.id,
  nome: item.nome,
  cnpj: item.cnpj,
  banco: item.banco,
  contaBancaria: item.conta_bancaria,
  saldoInicial: numero(item.saldo_inicial),
  saldoAtual: numero(item.saldo_atual),
});

export const mapEmpresaToDb = (
  item: Omit<Empresa, 'id'>
) => ({
  nome: item.nome,
  cnpj: item.cnpj,
  banco: item.banco,
  conta_bancaria: item.contaBancaria,
  saldo_inicial: numero(item.saldoInicial),
  saldo_atual: numero(item.saldoAtual),
});

export const mapFornecedorFromDb = (
  item: any
): Fornecedor => ({
  id: item.id,
  nome: item.nome,
  cnpj: item.cnpj,
  email: item.email,
  telefone: item.telefone,
  historicoCompras: numero(item.historico_compras),
  ultimaCompra: item.ultima_compra || '-',
  tempoMedioPagamento: numero(
    item.tempo_medio_pagamento || 30
  ),
});

export const mapFornecedorToDb = (
  item: Omit<
    Fornecedor,
    'id' | 'historicoCompras' | 'tempoMedioPagamento'
  >
) => ({
  nome: item.nome,
  cnpj: item.cnpj,
  email: item.email,
  telefone: item.telefone,
});

export const mapPlanoFromDb = (
  item: any
): PlanoFinanceiro => {
  const tetoAnual = numero(
    item.teto_anual ??
      item.orcamento_anual ??
      item.limite_anual ??
      item.tetoAnual ??
      item.orcamentoAnual ??
      item.limiteAnual
  );

  const tetoMensal = numero(
    item.teto_mensal ??
      item.orcamento_mensal ??
      item.limite_mensal ??
      item.tetoMensal ??
      item.orcamentoMensal ??
      item.limiteMensal ??
      tetoAnual / 12
  );

  return {
    id: item.id,
    empresaId: item.empresa_id,
    nome: item.nome,
    descricao: item.descricao,

    tetoMensal,
    tetoAnual,

    orcamentoMensal: tetoMensal,
    orcamentoAnual: tetoAnual,

    utilizado: numero(item.utilizado),
    comprometido: numero(item.comprometido),
  } as any;
};

export const mapPlanoToDb = (item: any) => {
  const tetoAnual = numero(
    item.tetoAnual ??
      item.orcamentoAnual ??
      item.limiteAnual
  );

  const tetoMensal = numero(
    item.tetoMensal ??
      item.orcamentoMensal ??
      item.limiteMensal ??
      tetoAnual / 12
  );

  return {
    empresa_id: item.empresaId,
    nome: item.nome,
    descricao: item.descricao,
    orcamento_anual: tetoAnual,
    orcamento_mensal: tetoMensal,
    teto_anual: tetoAnual,
    teto_mensal: tetoMensal,
    utilizado: numero(item.utilizado),
    comprometido: numero(item.comprometido),
  };
};

export const mapCentroFromDb = (
  item: any
): CentroCusto => {
  const tetoMensal = numero(
    item.teto_mensal ??
      item.orcamento_mensal ??
      item.limite_mensal ??
      item.tetoMensal ??
      item.orcamentoMensal ??
      item.limiteMensal
  );

  return {
    id: item.id,
    empresaId: item.empresa_id,
    nome: item.nome,
    descricao: item.descricao,
    planoFinanceiroId: item.plano_financeiro_id,

    tetoMensal,
    orcamentoMensal: tetoMensal,

    utilizado: numero(item.utilizado),
  } as any;
};

export const mapCentroToDb = (item: any) => {
  const tetoMensal = numero(
    item.tetoMensal ??
      item.orcamentoMensal ??
      item.limiteMensal
  );

  return {
    empresa_id: item.empresaId,
    nome: item.nome,
    descricao: item.descricao,
    plano_financeiro_id: item.planoFinanceiroId,
    orcamento_mensal: tetoMensal,
    teto_mensal: tetoMensal,
    utilizado: numero(item.utilizado),
  };
};

export const mapHistoricoFromDb = (
  item: any
): HistoricoStatus => ({
  data: item.data,
  usuario: item.usuario,
  deStatus: item.de_status,
  paraStatus: item.para_status,
  observacao: item.observacao,
});

export const mapProcessoFromDb = (
  item: any
): ProcessoCompra =>
  ({
    id: item.codigo || item.id,
    dbId: item.id,

    tipoPagamento:
      item.tipo_pagamento || 'fornecedor',

    fornecedorId: item.fornecedor_id || null,
    beneficiarioInterno:
      item.beneficiario_interno || null,

    empresaId: item.empresa_id,
    planoFinanceiroId: item.plano_financeiro_id,
    centroCustoId: item.centro_custo_id,

    descricao: item.descricao,
    valor: numero(item.valor),
    urgencia: item.urgencia,
    responsavel: item.responsavel,
    dataCriacao: item.data_criacao,
    status: item.status,
    prazo: item.prazo,

    anexoNome: item.anexo_nome,
    anexoUrl: item.anexo_url,

    comprovanteNome: item.comprovante_nome,
    comprovanteUrl: item.comprovante_url,

    metodoPagamento: item.metodo_pagamento,
    dataPagamento: item.data_pagamento,

    dataProgramadaPagamento:
      item.data_programada_pagamento,
    statusProgramacao:
      item.status_programacao || 'nao_programado',
    programadoPor: item.programado_por,
    dataProgramacao: item.data_programacao,

    formaPagamento: item.forma_pagamento || null,
    pixTipoChave: item.pix_tipo_chave || null,
    pixChave: item.pix_chave || null,
    pixFavorecido: item.pix_favorecido || null,
    pixBanco: item.pix_banco || null,
    pixObservacao: item.pix_observacao || null,

    valorPago: numero(item.valor_pago),
    saldoPagar:
      item.saldo_pagar == null
        ? Math.max(
            numero(item.valor) -
              numero(item.valor_pago),
            0
          )
        : numero(item.saldo_pagar),
    pagamentoParcial:
      Boolean(item.pagamento_parcial),

    historico: Array.isArray(
      item.historico_processos
    )
      ? item.historico_processos.map(
          mapHistoricoFromDb
        )
      : [],
  }) as any;

export const mapProcessoToDb = (item: any) => {
  const tipoPagamento =
    item.tipoPagamento === 'interno'
      ? 'interno'
      : 'fornecedor';

  const fornecedorId =
    tipoPagamento === 'interno'
      ? null
      : item.fornecedorId || null;

  const beneficiarioInterno =
    tipoPagamento === 'interno'
      ? textoOuNull(item.beneficiarioInterno)
      : null;

  const pixChave = item.pixChave
    ? String(item.pixChave).trim().toLowerCase()
    : null;

  return {
    codigo: item.id,

    tipo_pagamento: tipoPagamento,
    fornecedor_id: fornecedorId,
    beneficiario_interno: beneficiarioInterno,

    empresa_id: item.empresaId,
    plano_financeiro_id: item.planoFinanceiroId,
    centro_custo_id: item.centroCustoId,

    descricao: item.descricao,
    valor: numero(item.valor),
    urgencia: item.urgencia,
    responsavel: item.responsavel,
    data_criacao: item.dataCriacao,
    status: item.status,
    prazo: item.prazo,

    anexo_nome: item.anexoNome || null,
    anexo_url: item.anexoUrl || null,

    comprovante_nome:
      item.comprovanteNome || null,
    comprovante_url:
      item.comprovanteUrl || null,

    metodo_pagamento:
      item.metodoPagamento || null,
    data_pagamento: item.dataPagamento || null,

    data_programada_pagamento:
      item.dataProgramadaPagamento || null,
    status_programacao:
      item.statusProgramacao || 'nao_programado',
    programado_por: item.programadoPor || null,
    data_programacao: item.dataProgramacao || null,

    forma_pagamento:
      item.formaPagamento || null,
    pix_tipo_chave:
      item.pixTipoChave || null,
    pix_chave: pixChave,
    pix_favorecido:
      textoOuNull(item.pixFavorecido),
    pix_banco: textoOuNull(item.pixBanco),
    pix_observacao:
      textoOuNull(item.pixObservacao),

    valor_pago: numero(item.valorPago),
    saldo_pagar: Math.max(
      numero(item.valor) -
        numero(item.valorPago),
      0
    ),
    pagamento_parcial:
      numero(item.valorPago) > 0 &&
      numero(item.valorPago) <
        numero(item.valor),
  };
};

export const mapAlertaFromDb = (
  item: any
): AlertaSistema => ({
  id: item.id,
  tipo: item.tipo,
  titulo: item.titulo,
  mensagem: item.mensagem,
  data: item.created_at,
  lido: item.lido,
  processoId: item.processo_id,
});