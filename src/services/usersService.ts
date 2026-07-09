import { supabase } from '../lib/supabase';
import { PerfilUsuario } from '../config/permissions';

export interface UsuarioSistema {
  id: string;
  nome: string;
  email: string;
  perfil: PerfilUsuario;
  ativo: boolean;
  empresaId?: string | null;
  ultimoAcesso?: string | null;
  createdAt?: string | null;
}

export const usersService = {
  async listarUsuarios(): Promise<UsuarioSistema[]> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('nome', { ascending: true });

    if (error) throw error;

    return (data || []).map((item: any) => ({
      id: item.id,
      nome: item.nome || 'Sem nome',
      email: item.email || '-',
      perfil: item.perfil || 'compras',
      ativo: item.ativo !== false,
      empresaId: item.empresa_id || null,
      ultimoAcesso: item.ultimo_acesso || null,
      createdAt: item.created_at || null,
    }));
  },

  async atualizarUsuario(
    id: string,
    dados: {
      nome?: string;
      perfil?: PerfilUsuario;
      ativo?: boolean;
      empresaId?: string | null;
    }
  ): Promise<UsuarioSistema> {
    const payload = {
      nome: dados.nome,
      perfil: dados.perfil,
      ativo: dados.ativo,
      empresa_id: dados.empresaId || null,
    };

    const { data, error } = await supabase
  .from('profiles')
  .update(payload)
  .eq('id', id)
  .select()
  .maybeSingle();

    if (error) throw error;

if (!data) {
  throw new Error('Usuário não encontrado para atualização.');
}

    return {
      id: data.id,
      nome: data.nome || 'Sem nome',
      email: data.email || '-',
      perfil: data.perfil || 'compras',
      ativo: data.ativo !== false,
      empresaId: data.empresa_id || null,
      ultimoAcesso: data.ultimo_acesso || null,
      createdAt: data.created_at || null,
    };
  },
};