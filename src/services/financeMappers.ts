import {
  Empresa,
  Fornecedor,
  PlanoFinanceiro,
  CentroCusto,
  ProcessoCompra,
  AlertaSistema,
  HistoricoStatus,
} from '../types';

const numero = (valor: unknown) => {
  const n = Number(valor ?? 0);
  return Number.isFinite(n) ? n : 0;
};

const textoOuNull = (valor: unknown) => {
  const texto = String(valor ?? '').trim();
  return texto ? texto : null;
};

const textoOuVazio = (valor: unknown) =>
  String(valor ?? '').trim();

export const mapEmpresaFromDb = (
  item: any
): Empresa => ({
  id: item.id,
  organizacaoId: item.organizacao_id,
  nome: textoOuVazio(item.nome),
  cnpj: textoOuVazio(item.cnpj),
  banco: textoOuVazio(item.banco),
  contaBancaria: textoOuVazio(
    item.conta_bancaria
  ),
  saldoInicial: numero(item.saldo_inicial),
  saldoAtual: numero(item.saldo_atual),
});

export const mapEmpresaToDb = (
  item: Omit<Empresa, 'id'>
) => ({
  organizacao_id: item.organizacaoId,
  nome: textoOuVazio(item.nome),
  cnpj: textoOuNull(item.cnpj),
  banco: textoOuNull(item.banco),
  conta_bancaria: textoOuNull(
    item.contaBancaria
  ),
  saldo_inicial: numero(item.saldoInicial),
  saldo_atual: numero(item.saldoAtual),
});

export const mapFornecedorFromDb = (
  item: any
): Fornecedor => ({
  id: item.id,
  organizacaoId: item.organizacao_id,
  nome: textoOuVazio(item.nome),
  cnpj: textoOuVazio(item.cnpj),
  email: textoOuVazio(item.email),
  telefone: textoOuVazio(item.telefone),
  historicoCompras: numero(
    item.historico_compras
  ),
  ultimaCompra:
    item.ultima_compra || '-',
  tempoMedioPagamento: numero(
    item.tempo_medio_pagamento ?? 30
  ),
});

export const mapFornecedorToDb = (
  item: Omit<
    Fornecedor,
    | 'id'
    | 'historicoCompras'
    | 'ultimaCompra'
    | 'tempoMedioPagamento'
  >
) => ({
  organizacao_id: item.organizacaoId,
  nome: textoOuVazio(item.nome),
  cnpj: textoOuNull(item.cnpj),
  email: textoOuNull(item.email),
  telefone: textoOuNull(item.telefone),
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
    organizacaoId: item.organizacao_id,
    empresaId: item.empresa_id || undefined,
    nome: textoOuVazio(item.nome),
    descricao:
      item.descricao || undefined,
    tetoMensal,
    tetoAnual,
    orcamentoMensal: tetoMensal,
    orcamentoAnual: tetoAnual,
    utilizado: numero(item.utilizado),
    comprometido: numero(
      item.comprometido
    ),
    centrosCustoIds: Array.isArray(
      item.centros_custo_ids
    )
      ? item.centros_custo_ids
      : undefined,
  };
};

export const mapPlanoToDb = (
  item: Omit<PlanoFinanceiro, 'id'>
) => {
  const tetoAnual = numero(
    item.tetoAnual ??
      item.orcamentoAnual
  );

  const tetoMensal = numero(
    item.tetoMensal ??
      item.orcamentoMensal ??
      tetoAnual / 12
  );

  return {
    organizacao_id: item.organizacaoId,
    empresa_id: item.empresaId || null,
    nome: textoOuVazio(item.nome),
    descricao: textoOuNull(
      item.descricao
    ),
    orcamento_anual: tetoAnual,
    orcamento_mensal: tetoMensal,
    teto_anual: tetoAnual,
    teto_mensal: tetoMensal,
    utilizado: numero(item.utilizado),
    comprometido: numero(
      item.comprometido
    ),
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
    empresaId:
      item.empresa_id || undefined,
    nome: textoOuVazio(item.nome),
    descricao:
      item.descricao || undefined,
    planoFinanceiroId:
      item.plano_financeiro_id,
    tetoMensal,
    orcamentoMensal: tetoMensal,
    utilizado: numero(item.utilizado),
  };
};

export const mapCentroToDb = (
  item: Omit<CentroCusto, 'id'>
) => {
  const tetoMensal = numero(
    item.tetoMensal ??
      item.orcamentoMensal
  );

  return {
    empresa_id: item.empresaId || null,
    nome: textoOuVazio(item.nome),
    descricao: textoOuNull(
      item.descricao
    ),
    plano_financeiro_id:
      item.planoFinanceiroId,
    orcamento_mensal: tetoMensal,
    teto_mensal: tetoMensal,
    utilizado: numero(item.utilizado),
  };
};

export const mapHistoricoFromDb = (
  item: any
): HistoricoStatus => ({
  data: item.data || item.created_at,
  usuario:
    item.usuario || 'Usuário',
  deStatus:
    item.de_status || 'criacao',
  paraStatus: item.para_status,
  observacao:
    item.observacao || undefined,
});

export const mapProcessoFromDb = (
  item: any
): ProcessoCompra => {
  const valor = numero(item.valor);
  const valorPago = numero(
    item.valor_pago
  );

  const saldoPagar =
    item.saldo_pagar == null
      ? Math.max(
          valor - valorPago,
          0
        )
      : numero(item.saldo_pagar);

  return {
    id: item.codigo || item.id,
    dbId: item.id,

    organizacaoId:
      item.organizacao_id,
    empresaId: item.empresa_id,

    tipoPagamento:
      item.tipo_pagamento ||
      'fornecedor',

    fornecedorId:
      item.fornecedor_id || null,

    beneficiarioInterno:
      item.beneficiario_interno ||
      null,

    planoFinanceiroId:
      item.plano_financeiro_id ||
      null,

    centroCustoId:
      item.centro_custo_id || null,

    descricao:
      textoOuVazio(item.descricao),

    valor,

    urgencia:
      item.urgencia || 'media',

    responsavel:
      item.responsavel || '',

    dataCriacao:
      item.data_criacao ||
      item.created_at ||
      '',

    status:
      item.status || 'solicitacao',

    prazo: item.prazo || null,

    anexoNome:
      item.anexo_nome || null,

    anexoUrl:
      item.anexo_url || null,

    comprovanteNome:
      item.comprovante_nome ||
      null,

    comprovanteUrl:
      item.comprovante_url ||
      null,

    metodoPagamento:
      item.metodo_pagamento ||
      null,

    dataPagamento:
      item.data_pagamento || null,

    dataProgramadaPagamento:
      item.data_programada_pagamento ||
      null,

    statusProgramacao:
      item.status_programacao ||
      'nao_programado',

    programadoPor:
      item.programado_por || null,

    dataProgramacao:
      item.data_programacao || null,

    formaPagamento:
      item.forma_pagamento || null,

    pixTipoChave:
      item.pix_tipo_chave || null,

    pixChave:
      item.pix_chave || null,

    pixFavorecido:
      item.pix_favorecido || null,

    pixBanco:
      item.pix_banco || null,

    pixObservacao:
      item.pix_observacao || null,

    valorPago,
    saldoPagar,

    pagamentoParcial:
      item.pagamento_parcial == null
        ? valorPago > 0 &&
          saldoPagar > 0
        : Boolean(
            item.pagamento_parcial
          ),

    historico: Array.isArray(
      item.historico_processos
    )
      ? item.historico_processos.map(
          mapHistoricoFromDb
        )
      : [],

    documentos: Array.isArray(
      item.processo_documentos
    )
      ? item.processo_documentos.map(
          (documento: any) => ({
            id: documento.id,
            processoId:
              documento.processo_id,
            tipo:
              documento.tipo ||
              'documento',
            nome: documento.nome,
            url: documento.url,
            caminho:
              documento.caminho || null,
            enviadoPor:
              documento.enviado_por ||
              null,
            createdAt:
              documento.created_at,
          })
        )
      : [],

    pagamentos: Array.isArray(
      item.pagamentos_processos
    )
      ? item.pagamentos_processos.map(
          (pagamento: any) => ({
            id: pagamento.id,
            processoId:
              pagamento.processo_id,
            userId:
              pagamento.user_id ||
              null,
            valorPago: numero(
              pagamento.valor_pago
            ),
            metodoPagamento:
              pagamento.metodo_pagamento,
            dataPagamento:
              pagamento.data_pagamento,
            comprovante:
              pagamento.comprovante ||
              null,
            observacao:
              pagamento.observacao ||
              null,
            createdAt:
              pagamento.created_at,
          })
        )
      : [],
  };
};

export const mapProcessoToDb = (
  item: Omit<
    ProcessoCompra,
    | 'dbId'
    | 'historico'
    | 'documentos'
    | 'pagamentos'
  >
) => {
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
      ? textoOuNull(
          item.beneficiarioInterno
        )
      : null;

  const pixChave = item.pixChave
    ? String(item.pixChave)
        .trim()
        .toLowerCase()
    : null;

  const valor = numero(item.valor);
  const valorPago = numero(
    item.valorPago
  );

  const saldoPagar = Math.max(
    valor - valorPago,
    0
  );

  return {
    codigo: item.id,

    organizacao_id:
      item.organizacaoId,

    empresa_id: item.empresaId,

    tipo_pagamento:
      tipoPagamento,

    fornecedor_id:
      fornecedorId,

    beneficiario_interno:
      beneficiarioInterno,

    plano_financeiro_id:
      item.planoFinanceiroId ||
      null,

    centro_custo_id:
      item.centroCustoId || null,

    descricao:
      textoOuVazio(item.descricao),

    valor,

    urgencia:
      item.urgencia || 'media',

    responsavel:
      item.responsavel || '',

    data_criacao:
      item.dataCriacao,

    status:
      item.status ||
      'solicitacao',

    prazo: item.prazo || null,

    anexo_nome:
      item.anexoNome || null,

    anexo_url:
      item.anexoUrl || null,

    comprovante_nome:
      item.comprovanteNome ||
      null,

    comprovante_url:
      item.comprovanteUrl ||
      null,

    metodo_pagamento:
      item.metodoPagamento ||
      null,

    data_pagamento:
      item.dataPagamento ||
      null,

    data_programada_pagamento:
      item.dataProgramadaPagamento ||
      null,

    status_programacao:
      item.statusProgramacao ||
      'nao_programado',

    programado_por:
      item.programadoPor || null,

    data_programacao:
      item.dataProgramacao ||
      null,

    forma_pagamento:
      item.formaPagamento || null,

    pix_tipo_chave:
      item.pixTipoChave || null,

    pix_chave: pixChave,

    pix_favorecido:
      textoOuNull(
        item.pixFavorecido
      ),

    pix_banco:
      textoOuNull(item.pixBanco),

    pix_observacao:
      textoOuNull(
        item.pixObservacao
      ),

    valor_pago: valorPago,

    saldo_pagar: saldoPagar,

    pagamento_parcial:
      valorPago > 0 &&
      saldoPagar > 0,
  };
};

export const mapAlertaFromDb = (
  item: any
): AlertaSistema => ({
  id: item.id,
  organizacaoId:
    item.organizacao_id,
  tipo: item.tipo,
  titulo: item.titulo,
  mensagem:
    item.mensagem || '',
  data:
    item.created_at ||
    new Date().toISOString(),
  lido: Boolean(item.lido),
  processoId:
    item.processo_id || undefined,
});

export const mapAlertaToDb = (
  item: Omit<
    AlertaSistema,
    'id' | 'data'
  >,
  userId: string
) => ({
  organizacao_id:
    item.organizacaoId,
  user_id: userId,
  processo_id:
    item.processoId || null,
  tipo: item.tipo,
  titulo:
    textoOuVazio(item.titulo),
  mensagem:
    textoOuNull(item.mensagem),
  lido: Boolean(item.lido),
});