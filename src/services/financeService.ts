import { supabase } from '../lib/supabase';
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
} from './financeMappers';

const BUCKET_ANEXOS = 'flowfinance-anexos';

const getUserId = async () => {
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    throw new Error('Usuário não autenticado.');
  }

  return data.user.id;
};

const limparNomeArquivo = (nome: string) => {
  return nome
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9.\-_]/g, '_');
};

export const financeService = {
  async uploadAnexoProcesso(file: File) {
    const userId = await getUserId();

    const nomeLimpo = limparNomeArquivo(file.name);
    const nomeArquivo = `${userId}/${Date.now()}_${nomeLimpo}`;

    const { error } = await supabase.storage
      .from(BUCKET_ANEXOS)
      .upload(nomeArquivo, file, {
        cacheControl: '3600',
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
      .from('processo_documentos')
      .insert({
        user_id: userId,
        processo_id: item.processoDbId,
        tipo: item.tipo || 'outro',
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
  }) {
    const upload = await this.uploadAnexoProcesso(params.file);

    return this.criarDocumentoProcesso({
      processoDbId: params.processoDbId,
      tipo: params.tipo || 'outro',
      nome: upload.nome,
      url: upload.url,
      caminho: upload.caminho,
      enviadoPor: params.enviadoPor || null,
    });
  },

  async getDocumentosProcesso(processoDbId: string) {
    const { data, error } = await supabase
      .from('processo_documentos')
      .select('*')
      .eq('processo_id', processoDbId)
      .order('created_at', { ascending: false });

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

  async carregarDados() {
    const [
      empresas,
      fornecedores,
      planosFinanceiros,
      centrosCustos,
      processos,
      alertas,
    ] = await Promise.all([
      this.getEmpresas(),
      this.getFornecedores(),
      this.getPlanosFinanceiros(),
      this.getCentrosCustos(),
      this.getProcessos(),
      this.getAlertas(),
    ]);

    return {
      empresas,
      fornecedores,
      planosFinanceiros,
      centrosCustos,
      processos,
      alertas,
    };
  },

  async getEmpresas() {
    const { data, error } = await supabase
      .from('empresas')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) throw error;
    return (data || []).map(mapEmpresaFromDb);
  },

  async criarEmpresa(item: any) {
    const userId = await getUserId();

    const payload = {
      ...mapEmpresaToDb({
        ...item,
        saldoAtual: item.saldoInicial,
      }),
      user_id: userId,
    };

    const { data, error } = await supabase
      .from('empresas')
      .insert(payload)
      .select()
      .single();

    if (error) throw error;
    return mapEmpresaFromDb(data);
  },

  async editarEmpresa(id: string, item: any) {
    const payload = mapEmpresaToDb({
      ...item,
      saldoAtual: item.saldoInicial,
    });

    const { data, error } = await supabase
      .from('empresas')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return mapEmpresaFromDb(data);
  },

  async excluirEmpresa(id: string) {
    const { error } = await supabase.from('empresas').delete().eq('id', id);
    if (error) throw error;
  },

  async getFornecedores() {
    const { data, error } = await supabase
      .from('fornecedores')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) throw error;
    return (data || []).map(mapFornecedorFromDb);
  },

  async criarFornecedor(item: any) {
    const userId = await getUserId();

    const { data, error } = await supabase
      .from('fornecedores')
      .insert({
        ...mapFornecedorToDb(item),
        user_id: userId,
      })
      .select()
      .single();

    if (error) throw error;
    return mapFornecedorFromDb(data);
  },

  async editarFornecedor(id: string, item: any) {
    const { data, error } = await supabase
      .from('fornecedores')
      .update(mapFornecedorToDb(item))
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return mapFornecedorFromDb(data);
  },

  async excluirFornecedor(id: string) {
    const { error } = await supabase.from('fornecedores').delete().eq('id', id);
    if (error) throw error;
  },

  async getPlanosFinanceiros() {
    const { data, error } = await supabase
      .from('planos_financeiros')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) throw error;
    return (data || []).map(mapPlanoFromDb);
  },

  async criarPlanoFinanceiro(item: any) {
    const userId = await getUserId();

    const { data, error } = await supabase
      .from('planos_financeiros')
      .insert({
        ...mapPlanoToDb(item),
        user_id: userId,
      })
      .select()
      .single();

    if (error) throw error;
    return mapPlanoFromDb(data);
  },

  async editarPlanoFinanceiro(id: string, item: any) {
    const { data, error } = await supabase
      .from('planos_financeiros')
      .update(mapPlanoToDb(item))
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return mapPlanoFromDb(data);
  },

  async excluirPlanoFinanceiro(id: string) {
    const { error } = await supabase
      .from('planos_financeiros')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async getCentrosCustos() {
    const { data, error } = await supabase
      .from('centros_custos')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) throw error;
    return (data || []).map(mapCentroFromDb);
  },

  async criarCentroCusto(item: any) {
    const userId = await getUserId();

    const { data, error } = await supabase
      .from('centros_custos')
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
      .from('centros_custos')
      .update(mapCentroToDb(item))
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return mapCentroFromDb(data);
  },

  async excluirCentroCusto(id: string) {
    const { error } = await supabase
      .from('centros_custos')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async getProcessos() {
    const { data, error } = await supabase
      .from('processos_compra')
      .select(
        `
        *,
        historico_processos (*)
      `
      )
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(mapProcessoFromDb);
  },

  async criarProcesso(item: any) {
    const userId = await getUserId();

    const payload = {
      ...mapProcessoToDb(item),
      user_id: userId,
    };

    const { data, error } = await supabase
      .from('processos_compra')
      .insert(payload)
      .select()
      .single();

    if (error) throw error;

    return mapProcessoFromDb(data);
  },

  async editarProcesso(id: string, item: any) {
    const payload = mapProcessoToDb(item);

    const { data, error } = await supabase
      .from('processos_compra')
      .update(payload)
      .eq('codigo', id)
      .select()
      .single();

    if (error) throw error;
    return mapProcessoFromDb(data);
  },

  async excluirProcesso(id: string) {
    const { error } = await supabase
      .from('processos_compra')
      .delete()
      .eq('codigo', id);

    if (error) throw error;
  },

  async criarHistoricoProcesso(item: any) {
    const userId = await getUserId();

    const processoDbId = item.dbId || item.processoId;

    const { error } = await supabase.from('historico_processos').insert({
      user_id: userId,
      processo_id: processoDbId,
      usuario: item.usuario,
      de_status: item.deStatus,
      para_status: item.paraStatus,
      observacao: item.observacao,
    });

    if (error) throw error;
  },

  async getAlertas() {
    const { data, error } = await supabase
      .from('alertas')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(mapAlertaFromDb);
  },

  async criarAlerta(item: any) {
    const userId = await getUserId();

    const { data, error } = await supabase
      .from('alertas')
      .insert({
        user_id: userId,
        processo_id: item.processoId || null,
        tipo: item.tipo,
        titulo: item.titulo,
        mensagem: item.mensagem,
        lido: item.lido || false,
      })
      .select()
      .single();

    if (error) throw error;
    return mapAlertaFromDb(data);
  },

  async marcarAlertaLido(id: string) {
    const { data, error } = await supabase
      .from('alertas')
      .update({ lido: true })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return mapAlertaFromDb(data);
  },
};