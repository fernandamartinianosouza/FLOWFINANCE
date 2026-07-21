import { supabase } from "../lib/supabase";
import {
  AtualizarItemCatalogoInput,
  AtualizarSegmentoItemInput,
  ItemCatalogo,
  NovaContaInput,
  NovoItemCatalogoInput,
  NovoSegmentoItemInput,
  ProcessoCompra,
  SegmentoItem,
} from "../types";
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

const obterProcessoDbId = async (processoIdOuCodigo: string) => {
  const { data, error } = await supabase
    .from("processos_compra")
    .select("id")
    .or(`id.eq.${processoIdOuCodigo},codigo.eq.${processoIdOuCodigo}`)
    .limit(1)
    .maybeSingle();

  if (error) throw error;

  if (!data?.id) {
    throw new Error("Processo não encontrado.");
  }

  return data.id;
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

  async getSegmentosItens(
    organizacaoId?: string,
  ): Promise<SegmentoItem[]> {
    const orgId = await resolverOrganizacaoId(organizacaoId);

    const { data, error } = await supabase
      .from("segmentos_itens")
      .select("*")
      .eq("organizacao_id", orgId)
      .order("nome", {
        ascending: true,
      });

    if (error) throw error;

    return (data || []).map((item: any) => ({
      id: item.id,
      organizacaoId: item.organizacao_id,
      nome: item.nome,
      descricao: item.descricao,
      ativo: item.ativo,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    }));
  },

  async criarSegmentoItem(
    item: NovoSegmentoItemInput,
    organizacaoId?: string,
  ): Promise<SegmentoItem> {
    const orgId = await resolverOrganizacaoId(organizacaoId);
    const nome = item.nome?.trim();

    if (!nome) {
      throw new Error("Informe o nome do segmento.");
    }

    const { data, error } = await supabase
      .from("segmentos_itens")
      .insert({
        organizacao_id: orgId,
        nome,
        descricao: item.descricao?.trim() || null,
        ativo: item.ativo ?? true,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        throw new Error("Já existe um segmento com esse nome.");
      }

      throw error;
    }

    return {
      id: data.id,
      organizacaoId: data.organizacao_id,
      nome: data.nome,
      descricao: data.descricao,
      ativo: data.ativo,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  },

  async editarSegmentoItem(
    id: string,
    item: AtualizarSegmentoItemInput,
    organizacaoId?: string,
  ): Promise<SegmentoItem> {
    const orgId = await resolverOrganizacaoId(organizacaoId);

    const payload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (item.nome !== undefined) {
      const nome = item.nome.trim();

      if (!nome) {
        throw new Error("Informe o nome do segmento.");
      }

      payload.nome = nome;
    }

    if (item.descricao !== undefined) {
      payload.descricao = item.descricao?.trim() || null;
    }

    if (item.ativo !== undefined) {
      payload.ativo = item.ativo;
    }

    const { data, error } = await supabase
      .from("segmentos_itens")
      .update(payload)
      .eq("id", id)
      .eq("organizacao_id", orgId)
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        throw new Error("Já existe um segmento com esse nome.");
      }

      throw error;
    }

    return {
      id: data.id,
      organizacaoId: data.organizacao_id,
      nome: data.nome,
      descricao: data.descricao,
      ativo: data.ativo,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  },

  async excluirSegmentoItem(
    id: string,
    organizacaoId?: string,
  ): Promise<void> {
    const orgId = await resolverOrganizacaoId(organizacaoId);

    const { count, error: itensError } = await supabase
      .from("itens_catalogo")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("segmento_id", id)
      .eq("organizacao_id", orgId);

    if (itensError) throw itensError;

    if ((count || 0) > 0) {
      throw new Error(
        "Este segmento possui itens cadastrados e não pode ser excluído.",
      );
    }

    const { error } = await supabase
      .from("segmentos_itens")
      .delete()
      .eq("id", id)
      .eq("organizacao_id", orgId);

    if (error) throw error;
  },

  async getItensCatalogo(
    organizacaoId?: string,
  ): Promise<ItemCatalogo[]> {
    const orgId = await resolverOrganizacaoId(organizacaoId);

    const { data, error } = await supabase
      .from("itens_catalogo")
      .select(
        `
          *,
          segmentos_itens (
            id,
            organizacao_id,
            nome,
            descricao,
            ativo,
            created_at,
            updated_at
          )
        `,
      )
      .eq("organizacao_id", orgId)
      .order("nome", {
        ascending: true,
      });

    if (error) throw error;

    return (data || []).map((item: any) => ({
      id: item.id,
      organizacaoId: item.organizacao_id,
      segmentoId: item.segmento_id,
      nome: item.nome,
      descricao: item.descricao,
      unidadeMedida: item.unidade_medida,
      codigoInterno: item.codigo_interno,
      marcaReferencia: item.marca_referencia,
      especificacao: item.especificacao,
      ativo: item.ativo,
      segmento: item.segmentos_itens
        ? {
            id: item.segmentos_itens.id,
            organizacaoId: item.segmentos_itens.organizacao_id,
            nome: item.segmentos_itens.nome,
            descricao: item.segmentos_itens.descricao,
            ativo: item.segmentos_itens.ativo,
            createdAt: item.segmentos_itens.created_at,
            updatedAt: item.segmentos_itens.updated_at,
          }
        : undefined,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    }));
  },

  async criarItemCatalogo(
    item: NovoItemCatalogoInput,
    organizacaoId?: string,
  ): Promise<ItemCatalogo> {
    const orgId = await resolverOrganizacaoId(organizacaoId);

    const nome = item.nome?.trim();
    const unidadeMedida = item.unidadeMedida?.trim().toUpperCase();

    if (!item.segmentoId) {
      throw new Error("Selecione o segmento do item.");
    }

    if (!nome) {
      throw new Error("Informe o nome do item.");
    }

    if (!unidadeMedida) {
      throw new Error("Informe a unidade de medida.");
    }

    const { data, error } = await supabase
      .from("itens_catalogo")
      .insert({
        organizacao_id: orgId,
        segmento_id: item.segmentoId,
        nome,
        descricao: item.descricao?.trim() || null,
        unidade_medida: unidadeMedida,
        codigo_interno: item.codigoInterno?.trim() || null,
        marca_referencia: item.marcaReferencia?.trim() || null,
        especificacao: item.especificacao?.trim() || null,
        ativo: item.ativo ?? true,
      })
      .select(
        `
          *,
          segmentos_itens (
            id,
            organizacao_id,
            nome,
            descricao,
            ativo,
            created_at,
            updated_at
          )
        `,
      )
      .single();

    if (error) {
      if (error.code === "23505") {
        throw new Error(
          "Já existe um item com esse nome no segmento selecionado.",
        );
      }

      throw error;
    }

    return {
      id: data.id,
      organizacaoId: data.organizacao_id,
      segmentoId: data.segmento_id,
      nome: data.nome,
      descricao: data.descricao,
      unidadeMedida: data.unidade_medida,
      codigoInterno: data.codigo_interno,
      marcaReferencia: data.marca_referencia,
      especificacao: data.especificacao,
      ativo: data.ativo,
      segmento: data.segmentos_itens
        ? {
            id: data.segmentos_itens.id,
            organizacaoId: data.segmentos_itens.organizacao_id,
            nome: data.segmentos_itens.nome,
            descricao: data.segmentos_itens.descricao,
            ativo: data.segmentos_itens.ativo,
            createdAt: data.segmentos_itens.created_at,
            updatedAt: data.segmentos_itens.updated_at,
          }
        : undefined,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  },

  async editarItemCatalogo(
    id: string,
    item: AtualizarItemCatalogoInput,
    organizacaoId?: string,
  ): Promise<ItemCatalogo> {
    const orgId = await resolverOrganizacaoId(organizacaoId);

    const payload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (item.segmentoId !== undefined) {
      if (!item.segmentoId) {
        throw new Error("Selecione o segmento do item.");
      }

      payload.segmento_id = item.segmentoId;
    }

    if (item.nome !== undefined) {
      const nome = item.nome.trim();

      if (!nome) {
        throw new Error("Informe o nome do item.");
      }

      payload.nome = nome;
    }

    if (item.descricao !== undefined) {
      payload.descricao = item.descricao?.trim() || null;
    }

    if (item.unidadeMedida !== undefined) {
      const unidadeMedida = item.unidadeMedida.trim().toUpperCase();

      if (!unidadeMedida) {
        throw new Error("Informe a unidade de medida.");
      }

      payload.unidade_medida = unidadeMedida;
    }

    if (item.codigoInterno !== undefined) {
      payload.codigo_interno = item.codigoInterno?.trim() || null;
    }

    if (item.marcaReferencia !== undefined) {
      payload.marca_referencia = item.marcaReferencia?.trim() || null;
    }

    if (item.especificacao !== undefined) {
      payload.especificacao = item.especificacao?.trim() || null;
    }

    if (item.ativo !== undefined) {
      payload.ativo = item.ativo;
    }

    const { data, error } = await supabase
      .from("itens_catalogo")
      .update(payload)
      .eq("id", id)
      .eq("organizacao_id", orgId)
      .select(
        `
          *,
          segmentos_itens (
            id,
            organizacao_id,
            nome,
            descricao,
            ativo,
            created_at,
            updated_at
          )
        `,
      )
      .single();

    if (error) {
      if (error.code === "23505") {
        throw new Error(
          "Já existe um item com esse nome no segmento selecionado.",
        );
      }

      throw error;
    }

    return {
      id: data.id,
      organizacaoId: data.organizacao_id,
      segmentoId: data.segmento_id,
      nome: data.nome,
      descricao: data.descricao,
      unidadeMedida: data.unidade_medida,
      codigoInterno: data.codigo_interno,
      marcaReferencia: data.marca_referencia,
      especificacao: data.especificacao,
      ativo: data.ativo,
      segmento: data.segmentos_itens
        ? {
            id: data.segmentos_itens.id,
            organizacaoId: data.segmentos_itens.organizacao_id,
            nome: data.segmentos_itens.nome,
            descricao: data.segmentos_itens.descricao,
            ativo: data.segmentos_itens.ativo,
            createdAt: data.segmentos_itens.created_at,
            updatedAt: data.segmentos_itens.updated_at,
          }
        : undefined,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  },

  async excluirItemCatalogo(
    id: string,
    organizacaoId?: string,
  ): Promise<void> {
    const orgId = await resolverOrganizacaoId(organizacaoId);

    const { count, error: fornecedoresError } = await supabase
      .from("itens_fornecedores")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("item_id", id)
      .eq("organizacao_id", orgId);

    if (fornecedoresError) throw fornecedoresError;

    if ((count || 0) > 0) {
      throw new Error(
        "Este item possui fornecedores vinculados e não pode ser excluído.",
      );
    }

    const { error } = await supabase
      .from("itens_catalogo")
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
      .order("created_at", {
        ascending: false,
      });

    if (error) throw error;

    return (data || []).map(mapProcessoFromDb);
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
        observacao:
          "Conta cadastrada diretamente pelo setor de Contas a Pagar.",
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

  async excluirProcesso(id: string, organizacaoId?: string) {
    const orgId = await resolverOrganizacaoId(organizacaoId);

    const { error } = await supabase
      .from("processos_compra")
      .delete()
      .eq("codigo", id)
      .eq("organizacao_id", orgId);

    if (error) throw error;
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
      });

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
    const userId = await getUserId();

    const processoDbId = await obterProcessoDbId(params.processoId);

    const { data, error } = await supabase
      .from("pagamentos_processos")
      .insert({
        user_id: userId,
        processo_id: processoDbId,
        valor_pago: Number(params.valorPago),
        metodo_pagamento: params.metodoPagamento,
        data_pagamento:
          params.dataPagamento || new Date().toISOString().split("T")[0],
        comprovante: params.comprovante || null,
        observacao: params.observacao || null,
      })
      .select()
      .single();

    if (error) throw error;

    return data;
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

  async excluirPagamentoProcesso(pagamentoId: string) {
    const { error } = await supabase
      .from("pagamentos_processos")
      .delete()
      .eq("id", pagamentoId);

    if (error) throw error;
  },
};