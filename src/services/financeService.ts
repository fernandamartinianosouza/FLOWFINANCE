import { supabase } from "../lib/supabase";
import { NovaContaInput, ProcessoCompra } from "../types";
import {
  mapEmpresaFromDb,
  mapEmpresaToDb,
  mapFornecedorFromDb,
  mapFornecedorToDb,
  mapPlanoFromDb,
  mapPlanoToDb,
  mapCentroFromDb,
  mapCentroToDb,
  mapProcessoFromDb,
  mapProcessoToDb,
  mapAlertaFromDb,
  mapAlertaToDb,
} from "./financeMappers";

const BUCKET_ANEXOS = "flowfinance-anexos";

const getUser = async () => {
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    throw new Error("Usuário não autenticado.");
  }

  return data.user;
};

const getUserId = async () => (await getUser()).id;

const resolverOrganizacaoId = async (organizacaoId?: string | null) => {
  if (organizacaoId) {
    return organizacaoId;
  }

  const userId = await getUserId();

  const { data, error } = await supabase
    .from("usuarios_organizacoes")
    .select("organizacao_id")
    .eq("user_id", userId)
    .eq("ativo", true)
    .limit(1)
    .maybeSingle();

  if (error) throw error;

  if (!data?.organizacao_id) {
    throw new Error("O usuário não está vinculado a uma organização ativa.");
  }

  return data.organizacao_id;
};

const limparNomeArquivo = (nome: string) => {
  return nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9.\-_]/g, "_");
};

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const obterProcessoDbId = async (processoIdOuCodigo: string) => {
  const identificador = String(processoIdOuCodigo || "").trim();

  if (!identificador) {
    throw new Error("Identificador do processo não informado.");
  }

  let query = supabase
    .from("processos_compra")
    .select("id")
    .limit(1);

  query = UUID_REGEX.test(identificador)
    ? query.eq("id", identificador)
    : query.eq("codigo", identificador);

  const { data, error } = await query.maybeSingle();

  if (error) throw error;

  if (!data?.id) {
    throw new Error(
      `Processo não encontrado para o identificador ${identificador}.`
    );
  }

  return String(data.id);
};

export const financeService = {
  async getOrganizacoesUsuario() {
    const userId = await getUserId();

    const { data, error } = await supabase
      .from("usuarios_organizacoes")
      .select(
        `
        id,
        user_id,
        organizacao_id,
        perfil,
        ativo,
        created_at,
        organizacoes (
          id,
          nome,
          slug,
          documento,
          plano,
          ativo,
          created_at,
          updated_at
        )
      `,
      )
      .eq("user_id", userId)
      .eq("ativo", true)
      .order("created_at", {
        ascending: true,
      });

    if (error) throw error;

    return (data || []).map((item: any) => ({
      id: item.id,
      userId: item.user_id,
      organizacaoId: item.organizacao_id,
      perfil: item.perfil,
      ativo: item.ativo,
      createdAt: item.created_at,
      organizacao: item.organizacoes
        ? {
            id: item.organizacoes.id,
            nome: item.organizacoes.nome,
            slug: item.organizacoes.slug,
            documento: item.organizacoes.documento,
            plano: item.organizacoes.plano,
            ativo: item.organizacoes.ativo,
            createdAt: item.organizacoes.created_at,
            updatedAt: item.organizacoes.updated_at,
          }
        : undefined,
    }));
  },

  async uploadAnexoProcesso(file: File, organizacaoId?: string) {
    const userId = await getUserId();
    const orgId = await resolverOrganizacaoId(organizacaoId);

    const nomeLimpo = limparNomeArquivo(file.name);

    const nomeArquivo = `${orgId}/${userId}/` + `${Date.now()}_${nomeLimpo}`;

    const { error } = await supabase.storage
      .from(BUCKET_ANEXOS)
      .upload(nomeArquivo, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) throw error;

    const { data } = supabase.storage
      .from(BUCKET_ANEXOS)
      .getPublicUrl(nomeArquivo);

    return {
      nome: file.name,
      caminho: nomeArquivo,
      url: data.publicUrl,
    };
  },

  async criarDocumentoProcesso(item: {
    processoDbId: string;
    tipo: string;
    nome: string;
    url: string;
    caminho?: string | null;
    enviadoPor?: string | null;
  }) {
    const userId = await getUserId();

    const { data, error } = await supabase
      .from("processo_documentos")
      .insert({
        user_id: userId,
        processo_id: item.processoDbId,
        tipo: item.tipo || "outro",
        nome: item.nome,
        url: item.url,
        caminho: item.caminho || null,
        enviado_por: item.enviadoPor || null,
      })
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      processoId: data.processo_id,
      tipo: data.tipo,
      nome: data.nome,
      url: data.url,
      caminho: data.caminho,
      enviadoPor: data.enviado_por,
      createdAt: data.created_at,
    };
  },

  async anexarDocumentoProcesso(params: {
    processoDbId: string;
    file: File;
    tipo?: string;
    enviadoPor?: string;
    organizacaoId?: string;
  }) {
    const upload = await this.uploadAnexoProcesso(
      params.file,
      params.organizacaoId,
    );

    return this.criarDocumentoProcesso({
      processoDbId: params.processoDbId,
      tipo: params.tipo || "outro",
      nome: upload.nome,
      url: upload.url,
      caminho: upload.caminho,
      enviadoPor: params.enviadoPor || null,
    });
  },

  async getDocumentosProcesso(processoDbId: string) {
    const { data, error } = await supabase
      .from("processo_documentos")
      .select("*")
      .eq("processo_id", processoDbId)
      .order("created_at", {
        ascending: false,
      });

    if (error) throw error;

    return (data || []).map((item: any) => ({
      id: item.id,
      processoId: item.processo_id,
      tipo: item.tipo,
      nome: item.nome,
      url: item.url,
      caminho: item.caminho,
      enviadoPor: item.enviado_por,
      createdAt: item.created_at,
    }));
  },

  async excluirDocumentoProcesso(documentoId: string) {
    const id = String(documentoId || "").trim();

    if (!id) {
      throw new Error("Documento não informado.");
    }

    const { data: documento, error: buscaError } = await supabase
      .from("processo_documentos")
      .select("id, processo_id, nome, caminho, url")
      .eq("id", id)
      .maybeSingle();

    if (buscaError) {
      console.error("Erro ao localizar documento:", buscaError);

      throw new Error(
        buscaError.message ||
          "Não foi possível localizar o documento.",
      );
    }

    if (!documento) {
      throw new Error("Documento não encontrado.");
    }

    /*
     * Primeiro remove o arquivo físico do Storage.
     */
    if (documento.caminho) {
      const { error: storageError } = await supabase.storage
        .from(BUCKET_ANEXOS)
        .remove([String(documento.caminho)]);

      if (storageError) {
        console.error(
          "Erro ao excluir arquivo do Storage:",
          storageError,
        );

        throw new Error(
          storageError.message ||
            "Não foi possível excluir o arquivo do armazenamento.",
        );
      }
    }

    /*
     * Depois remove o registro do banco.
     */
    const { error: deleteError } = await supabase
      .from("processo_documentos")
      .delete()
      .eq("id", id);

    if (deleteError) {
      console.error(
        "Erro ao excluir registro do documento:",
        deleteError,
      );

      throw new Error(
        deleteError.message ||
          "Não foi possível excluir o registro do documento.",
      );
    }

    return {
      id: documento.id,
      processoId: documento.processo_id,
      nome: documento.nome,
      caminho: documento.caminho,
    };
  },

  async carregarDados(organizacaoId?: string) {
    const orgId = await resolverOrganizacaoId(organizacaoId);

    const [
      empresas,
      fornecedores,
      planosFinanceiros,
      centrosCustos,
      processos,
      alertas,
    ] = await Promise.all([
      this.getEmpresas(orgId),
      this.getFornecedores(orgId),
      this.getPlanosFinanceiros(orgId),
      this.getCentrosCustos(orgId),
      this.getProcessos(orgId),
      this.getAlertas(orgId),
    ]);

    return {
      organizacaoId: orgId,
      empresas,
      fornecedores,
      planosFinanceiros,
      centrosCustos,
      processos,
      alertas,
    };
  },

  async getEmpresas(organizacaoId?: string) {
    const orgId = await resolverOrganizacaoId(organizacaoId);

    const { data, error } = await supabase
      .from("empresas")
      .select("*")
      .eq("organizacao_id", orgId)
      .order("created_at", {
        ascending: true,
      });

    if (error) throw error;

    return (data || []).map(mapEmpresaFromDb);
  },

  async criarEmpresa(item: any) {
    const userId = await getUserId();
    const organizacaoId = await resolverOrganizacaoId(item.organizacaoId);

    const payload = {
      ...mapEmpresaToDb({
        ...item,
        organizacaoId,
        saldoAtual: item.saldoAtual ?? item.saldoInicial,
      }),
      user_id: userId,
    };

    const { data, error } = await supabase
      .from("empresas")
      .insert(payload)
      .select()
      .single();

    if (error) throw error;

    return mapEmpresaFromDb(data);
  },

  async editarEmpresa(id: string, item: any) {
    const organizacaoId = await resolverOrganizacaoId(item.organizacaoId);

    const payload = mapEmpresaToDb({
      ...item,
      organizacaoId,
      saldoAtual: item.saldoAtual ?? item.saldoInicial,
    });

    const { data, error } = await supabase
      .from("empresas")
      .update(payload)
      .eq("id", id)
      .eq("organizacao_id", organizacaoId)
      .select()
      .single();

    if (error) throw error;

    return mapEmpresaFromDb(data);
  },

  async excluirEmpresa(id: string, organizacaoId?: string) {
    const orgId = await resolverOrganizacaoId(organizacaoId);

    const { error } = await supabase
      .from("empresas")
      .delete()
      .eq("id", id)
      .eq("organizacao_id", orgId);

    if (error) throw error;
  },

  async getFornecedores(organizacaoId?: string) {
    const orgId = await resolverOrganizacaoId(organizacaoId);

    const { data, error } = await supabase
      .from("fornecedores")
      .select("*")
      .eq("organizacao_id", orgId)
      .order("created_at", {
        ascending: true,
      });

    if (error) throw error;

    return (data || []).map(mapFornecedorFromDb);
  },

  async criarFornecedor(item: any) {
    const userId = await getUserId();
    const organizacaoId = await resolverOrganizacaoId(item.organizacaoId);

    const { data, error } = await supabase
      .from("fornecedores")
      .insert({
        ...mapFornecedorToDb({
          ...item,
          organizacaoId,
        }),
        user_id: userId,
      })
      .select()
      .single();

    if (error) throw error;

    return mapFornecedorFromDb(data);
  },

  async editarFornecedor(id: string, item: any) {
    const organizacaoId = await resolverOrganizacaoId(item.organizacaoId);

    const { data, error } = await supabase
      .from("fornecedores")
      .update(
        mapFornecedorToDb({
          ...item,
          organizacaoId,
        }),
      )
      .eq("id", id)
      .eq("organizacao_id", organizacaoId)
      .select()
      .single();

    if (error) throw error;

    return mapFornecedorFromDb(data);
  },

  async excluirFornecedor(id: string, organizacaoId?: string) {
    const orgId = await resolverOrganizacaoId(organizacaoId);

    const { error } = await supabase
      .from("fornecedores")
      .delete()
      .eq("id", id)
      .eq("organizacao_id", orgId);

    if (error) throw error;
  },

  async getPlanosFinanceiros(organizacaoId?: string) {
    const orgId = await resolverOrganizacaoId(organizacaoId);

    const { data, error } = await supabase
      .from("planos_financeiros")
      .select("*")
      .eq("organizacao_id", orgId)
      .order("created_at", {
        ascending: true,
      });

    if (error) throw error;

    return (data || []).map(mapPlanoFromDb);
  },

  async criarPlanoFinanceiro(item: any) {
    const userId = await getUserId();
    const organizacaoId = await resolverOrganizacaoId(item.organizacaoId);

    const { data, error } = await supabase
      .from("planos_financeiros")
      .insert({
        ...mapPlanoToDb({
          ...item,
          organizacaoId,
        }),
        user_id: userId,
      })
      .select()
      .single();

    if (error) throw error;

    return mapPlanoFromDb(data);
  },

  async editarPlanoFinanceiro(id: string, item: any) {
    const organizacaoId = await resolverOrganizacaoId(item.organizacaoId);

    const { data, error } = await supabase
      .from("planos_financeiros")
      .update(
        mapPlanoToDb({
          ...item,
          organizacaoId,
        }),
      )
      .eq("id", id)
      .eq("organizacao_id", organizacaoId)
      .select()
      .single();

    if (error) throw error;

    return mapPlanoFromDb(data);
  },

  async excluirPlanoFinanceiro(id: string, organizacaoId?: string) {
    const orgId = await resolverOrganizacaoId(organizacaoId);

    const { error } = await supabase
      .from("planos_financeiros")
      .delete()
      .eq("id", id)
      .eq("organizacao_id", orgId);

    if (error) throw error;
  },

  async getCentrosCustos(organizacaoId?: string) {
    const orgId = await resolverOrganizacaoId(organizacaoId);

    const { data, error } = await supabase
      .from("centros_custos")
      .select(
        `
          *,
          planos_financeiros!inner (
            organizacao_id
          )
        `,
      )
      .eq("planos_financeiros.organizacao_id", orgId)
      .order("created_at", {
        ascending: true,
      });

    if (error) throw error;

    return (data || []).map(mapCentroFromDb);
  },

  async criarCentroCusto(item: any) {
    const userId = await getUserId();

    const { data, error } = await supabase
      .from("centros_custos")
      .insert({
        ...mapCentroToDb(item),
        user_id: userId,
      })
      .select()
      .single();

    if (error) throw error;

    return mapCentroFromDb(data);
  },

  async editarCentroCusto(id: string, item: any) {
    const { data, error } = await supabase
      .from("centros_custos")
      .update(mapCentroToDb(item))
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return mapCentroFromDb(data);
  },

  async excluirCentroCusto(id: string) {
    const { error } = await supabase
      .from("centros_custos")
      .delete()
      .eq("id", id);

    if (error) throw error;
  },

  async getProcessos(organizacaoId?: string) {
    const orgId = await resolverOrganizacaoId(organizacaoId);

    /*
     * Otimização de carregamento:
     * - até 1000 processos: apenas uma consulta, como antes;
     * - acima de 1000: o primeiro lote é carregado imediatamente e os
     *   demais lotes são buscados em paralelo, em vez de um por vez.
     *
     * Não há corte de dados: todos os processos continuam sendo carregados.
     */
    const TAMANHO_LOTE = 1000;
    const CONCORRENCIA = 4;

    const buscarLote = async (inicio: number, fim: number) => {
      const { data, error } = await supabase
        .from("processos_compra")
        .select(
          `
            *,
            historico_processos (*),
            processo_documentos (*),
            pagamentos_processos (*)
          `,
        )
        .eq("organizacao_id", orgId)
        .or("excluido.is.null,excluido.eq.false")
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .range(inicio, fim);

      if (error) {
        console.error(
          `Erro ao carregar processos do intervalo ${inicio}-${fim}:`,
          error,
        );
        throw error;
      }

      return data || [];
    };

    const primeiroLote = await buscarLote(0, TAMANHO_LOTE - 1);

    if (primeiroLote.length < TAMANHO_LOTE) {
      return primeiroLote.map(mapProcessoFromDb);
    }

    const { count, error: countError } = await supabase
      .from("processos_compra")
      .select("id", { count: "exact", head: true })
      .eq("organizacao_id", orgId)
      .or("excluido.is.null,excluido.eq.false");

    if (countError) {
      // Fallback seguro: mantém a paginação sequencial se a contagem falhar.
      const todos = [...primeiroLote];
      let inicio = TAMANHO_LOTE;

      while (true) {
        const lote = await buscarLote(
          inicio,
          inicio + TAMANHO_LOTE - 1,
        );

        todos.push(...lote);

        if (lote.length < TAMANHO_LOTE) break;
        inicio += TAMANHO_LOTE;
      }

      return todos.map(mapProcessoFromDb);
    }

    const total = Number(count || primeiroLote.length);
    const intervalos: Array<[number, number]> = [];

    for (let inicio = TAMANHO_LOTE; inicio < total; inicio += TAMANHO_LOTE) {
      intervalos.push([
        inicio,
        Math.min(inicio + TAMANHO_LOTE - 1, total - 1),
      ]);
    }

    const demaisLotes: any[][] = [];

    for (let i = 0; i < intervalos.length; i += CONCORRENCIA) {
      const grupo = intervalos.slice(i, i + CONCORRENCIA);
      const resultados = await Promise.all(
        grupo.map(([inicio, fim]) => buscarLote(inicio, fim)),
      );
      demaisLotes.push(...resultados);
    }

    return [
      ...primeiroLote,
      ...demaisLotes.flat(),
    ].map(mapProcessoFromDb);
  },

  async criarProcesso(item: any) {
    const userId = await getUserId();
    const organizacaoId = await resolverOrganizacaoId(item.organizacaoId);

    const payload = {
      ...mapProcessoToDb({
        ...item,
        organizacaoId,
      }),
      user_id: userId,
    };

    const { data, error } = await supabase
      .from("processos_compra")
      .insert(payload)
      .select(
        `
          *,
          historico_processos (*),
          processo_documentos (*),
          pagamentos_processos (*)
        `,
      )
      .single();

    if (error) throw error;

    return mapProcessoFromDb(data);
  },

  async criarNovaConta(
    item: NovaContaInput & {
      organizacaoId?: string;
    },
  ): Promise<ProcessoCompra> {
    const usuario = await getUser();
    const organizacaoId = await resolverOrganizacaoId(item.organizacaoId);

    const agora = new Date().toISOString();
    const dataAtual = agora.split("T")[0];

    const codigo = `CP-${Date.now()}-${Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0")}`;

    const valor = Number(item.valor);

    if (!item.empresaId) {
      throw new Error("Selecione uma empresa.");
    }

    if (!item.descricao?.trim()) {
      throw new Error("Informe a descrição da conta.");
    }

    if (!Number.isFinite(valor) || valor <= 0) {
      throw new Error("Informe um valor válido.");
    }

    if (!item.dataVencimento) {
      throw new Error("Informe a data de vencimento.");
    }

    if (item.tipoPagamento === "fornecedor" && !item.fornecedorId) {
      throw new Error("Selecione o fornecedor.");
    }

    if (item.tipoPagamento === "interno" && !item.beneficiarioInterno?.trim()) {
      throw new Error("Informe o beneficiário interno.");
    }

    if (item.formaPagamento === "pix" && !item.pixChave?.trim()) {
      throw new Error("Informe a chave PIX.");
    }

    const responsavel =
      usuario.user_metadata?.nome ||
      usuario.user_metadata?.name ||
      usuario.email ||
      "Contas a pagar";

    const novaConta: ProcessoCompra = {
      id: codigo,
      organizacaoId,
      empresaId: item.empresaId,

      origem: "conta_pagar",
      tipoConta: item.tipoConta || "outra",
      dataEmissao: item.dataEmissao || dataAtual,
      dataVencimento: item.dataVencimento,
      numeroDocumento: item.numeroDocumento?.trim() || null,
      codigoBarras: item.codigoBarras?.trim() || null,
      recorrente: Boolean(item.recorrente),

      tipoPagamento: item.tipoPagamento,
      fornecedorId:
        item.tipoPagamento === "fornecedor" ? item.fornecedorId || null : null,
      beneficiarioInterno:
        item.tipoPagamento === "interno"
          ? item.beneficiarioInterno?.trim() || null
          : null,

      planoFinanceiroId: item.planoFinanceiroId || null,
      centroCustoId: item.centroCustoId || null,

      descricao: item.descricao.trim(),
      valor,
      urgencia: "media",
      responsavel,
      dataCriacao: agora,
      status: "pagamento",
      prazo: item.dataVencimento,

      formaPagamento: item.formaPagamento || null,
      metodoPagamento: null,

      pixTipoChave: item.pixTipoChave || null,
      pixChave: item.pixChave ? item.pixChave.trim().toLowerCase() : null,
      pixFavorecido: item.pixFavorecido?.trim() || null,
      pixBanco: item.pixBanco?.trim() || null,
      pixObservacao:
        item.pixObservacao?.trim() || item.observacao?.trim() || null,

      anexoNome: item.anexoNome || null,
      anexoUrl: item.anexoUrl || null,

      dataProgramadaPagamento: null,
      statusProgramacao: "nao_programado",
      programadoPor: null,
      dataProgramacao: null,
      dataPagamento: null,

      comprovanteNome: null,
      comprovanteUrl: null,

      valorPago: 0,
      saldoPagar: valor,
      pagamentoParcial: false,

      historico: [],
      documentos: [],
      pagamentos: [],
    };

    const payload = {
      ...mapProcessoToDb(novaConta),
      user_id: usuario.id,
    };

    const { data, error } = await supabase
      .from("processos_compra")
      .insert(payload)
      .select(
        `
          *,
          historico_processos (*),
          processo_documentos (*),
          pagamentos_processos (*)
        `,
      )
      .single();

    if (error) {
      console.error("Erro ao cadastrar nova conta:", error);

      throw new Error(error.message || "Não foi possível cadastrar a conta.");
    }

    const contaCriada = mapProcessoFromDb(data);

    const { error: historicoError } = await supabase
      .from("historico_processos")
      .insert({
        user_id: usuario.id,
        processo_id: data.id,
        usuario: responsavel,
        de_status: "criacao",
        para_status: "pagamento",
        observacao: item.observacao?.trim()
          ? `Conta cadastrada diretamente pelo setor de Contas a Pagar. ${item.observacao.trim()}`
          : "Conta cadastrada diretamente pelo setor de Contas a Pagar.",
      });

    if (historicoError) {
      console.error(
        "A conta foi criada, mas ocorreu um erro ao registrar o histórico:",
        historicoError,
      );
    }

    return contaCriada;
  },

  async editarProcesso(id: string, item: any) {
    const organizacaoId = await resolverOrganizacaoId(item.organizacaoId);

    const payload = mapProcessoToDb({
      ...item,
      organizacaoId,
    });

    const { data, error } = await supabase
      .from("processos_compra")
      .update(payload)
      .eq("codigo", id)
      .eq("organizacao_id", organizacaoId)
      .select(
        `
          *,
          historico_processos (*),
          processo_documentos (*),
          pagamentos_processos (*)
        `,
      )
      .single();

    if (error) throw error;

    return mapProcessoFromDb(data);
  },

  async excluirProcesso(id: string, organizacaoId?: string, motivo = 'Exclusão solicitada pelo usuário') {
    const orgId = await resolverOrganizacaoId(organizacaoId);
    const { data: auth } = await supabase.auth.getUser();
    const usuario = auth.user;
    const usuarioNome = usuario?.user_metadata?.nome || usuario?.email || 'Usuário não identificado';

    const { data: atual, error: buscaError } = await supabase
      .from("processos_compra")
      .select("id,codigo,status")
      .eq("codigo", id)
      .eq("organizacao_id", orgId)
      .single();
    if (buscaError) throw buscaError;

    const agora = new Date().toISOString();
    const { error } = await supabase
      .from("processos_compra")
      .update({
        excluido: true, excluido_em: agora, excluido_por: usuario?.id || null,
        excluido_por_nome: usuarioNome, motivo_exclusao: motivo,
        status_antes_exclusao: atual.status, updated_at: agora,
      })
      .eq("id", atual.id)
      .eq("organizacao_id", orgId);
    if (error) throw error;

    await supabase.from("historico_processos").insert({
      user_id: usuario?.id || null, processo_id: atual.id, usuario: usuarioNome,
      de_status: atual.status, para_status: atual.status,
      observacao: `Conta movida para Excluídos. Motivo: ${motivo}`,
    });
  },

  async listarProcessosExcluidos(organizacaoId?: string, empresaId?: string) {
    const orgId = await resolverOrganizacaoId(organizacaoId);
    let query = supabase.from("processos_compra").select(`*, historico_processos (*), processo_documentos (*), pagamentos_processos (*)`)
      .eq("organizacao_id", orgId).eq("excluido", true).order("excluido_em", { ascending: false });
    if (empresaId) query = query.eq("empresa_id", empresaId);
    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(mapProcessoFromDb);
  },

  async restaurarProcesso(id: string, organizacaoId?: string) {
    const orgId = await resolverOrganizacaoId(organizacaoId);
    const { data: auth } = await supabase.auth.getUser();
    const nome = auth.user?.user_metadata?.nome || auth.user?.email || 'Usuário não identificado';
    const { data: atual, error: buscaError } = await supabase.from("processos_compra").select("id,status,status_antes_exclusao").eq("codigo", id).eq("organizacao_id", orgId).single();
    if (buscaError) throw buscaError;
    const { error } = await supabase.from("processos_compra").update({ excluido:false, excluido_em:null, excluido_por:null, excluido_por_nome:null, motivo_exclusao:null, status_antes_exclusao:null, updated_at:new Date().toISOString() }).eq("id", atual.id);
    if (error) throw error;
    await supabase.from("historico_processos").insert({ user_id:auth.user?.id||null, processo_id:atual.id, usuario:nome, de_status:atual.status, para_status:atual.status, observacao:'Conta restaurada da área de Excluídos.' });
  },

  async criarHistoricoProcesso(item: any) {
    const userId = await getUserId();

    const processoDbId =
      item.dbId || (await obterProcessoDbId(item.processoId));

    const { error } = await supabase.from("historico_processos").insert({
      user_id: userId,
      processo_id: processoDbId,
      usuario: item.usuario,
      de_status: item.deStatus,
      para_status: item.paraStatus,
      observacao: item.observacao,
    });

    if (error) throw error;
  },

  async getAlertas(organizacaoId?: string) {
    const orgId = await resolverOrganizacaoId(organizacaoId);

    const { data, error } = await supabase
      .from("alertas")
      .select("*")
      .eq("organizacao_id", orgId)
      .order("created_at", {
        ascending: false,
      })
      .limit(100);

    if (error) throw error;

    return (data || []).map(mapAlertaFromDb);
  },

  async criarAlerta(item: any) {
    const userId = await getUserId();
    const organizacaoId = await resolverOrganizacaoId(item.organizacaoId);

    let processoDbId = item.processoDbId || null;

    if (!processoDbId && item.processoId) {
      processoDbId = await obterProcessoDbId(item.processoId);
    }

    const { data, error } = await supabase
      .from("alertas")
      .insert(
        mapAlertaToDb(
          {
            ...item,
            organizacaoId,
            processoId: processoDbId || undefined,
          },
          userId,
        ),
      )
      .select()
      .single();

    if (error) throw error;

    return mapAlertaFromDb(data);
  },

  async marcarAlertaLido(id: string, organizacaoId?: string) {
    const orgId = await resolverOrganizacaoId(organizacaoId);

    const { data, error } = await supabase
      .from("alertas")
      .update({ lido: true })
      .eq("id", id)
      .eq("organizacao_id", orgId)
      .select()
      .single();

    if (error) throw error;

    return mapAlertaFromDb(data);
  },

  async criarPagamentoProcesso(params: {
    processoId: string;
    valorPago: number;
    metodoPagamento: string;
    dataPagamento?: string;
    comprovante?: string | null;
    observacao?: string | null;
  }) {
    const processoDbId = await obterProcessoDbId(params.processoId);

    const { data, error } = await supabase.rpc(
      "registrar_pagamento_processo",
      {
        p_processo_id: processoDbId,
        p_valor_pago: Number(params.valorPago),
        p_metodo_pagamento: params.metodoPagamento,
        p_data_pagamento:
          params.dataPagamento || new Date().toISOString().split("T")[0],
        p_comprovante: params.comprovante || null,
        p_observacao: params.observacao || null,
      },
    );

    if (error) {
      throw new Error(
        error.message || "Não foi possível registrar o pagamento.",
      );
    }

    // Funções que retornam tipo composto normalmente entregam um objeto,
    // mas mantemos compatibilidade com respostas em array.
    const pagamento = Array.isArray(data) ? data[0] : data;

    if (!pagamento) {
      throw new Error(
        "O pagamento foi processado, mas o registro criado não foi retornado.",
      );
    }

    return pagamento;
  },

  async getPagamentosProcesso(processoId: string) {
    const processoDbId = await obterProcessoDbId(processoId);

    const { data, error } = await supabase
      .from("pagamentos_processos")
      .select("*")
      .eq("processo_id", processoDbId)
      .order("data_pagamento", { ascending: false })
      .order("created_at", {
        ascending: false,
      });

    if (error) throw error;

    return data || [];
  },

  async estornarPagamentoProcesso(params: {
    pagamentoId: string;
    motivo: string;
  }) {
    const motivo = params.motivo.trim();

    if (!motivo) {
      throw new Error("Informe o motivo do estorno.");
    }

    const { data, error } = await supabase.rpc(
      "estornar_pagamento_processo",
      {
        p_pagamento_id: params.pagamentoId,
        p_motivo: motivo,
      }
    );

    if (error) {
      throw new Error(
        error.message || "Não foi possível desfazer o pagamento."
      );
    }

    return data;
  },

  async excluirPagamentoProcesso(_pagamentoId: string) {
    throw new Error(
      "Pagamentos financeiros não podem ser excluídos. Use o estorno."
    );
  },
};