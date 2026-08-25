import { supabase } from '../lib/supabase';
import { AcaoPermissao, ModuloPermissao } from '../config/actionPermissions';

export interface PermissaoUsuario {
  modulo: ModuloPermissao;
  acao: AcaoPermissao;
  permitido: boolean;
}

export const permissoesService = {
  async listar(organizacaoId: string, userId?: string): Promise<PermissaoUsuario[]> {
    const { data, error } = await supabase.rpc('listar_permissoes_usuario', {
      p_organizacao_id: organizacaoId,
      ...(userId ? { p_user_id: userId } : {}),
    });
    if (error) throw error;
    return (data || []).map((p: any) => ({ modulo: p.modulo, acao: p.acao, permitido: p.permitido !== false }));
  },

  async salvar(organizacaoId: string, userId: string, permissoes: PermissaoUsuario[]) {
    const { error } = await supabase.rpc('definir_permissoes_usuario', {
      p_organizacao_id: organizacaoId,
      p_user_id: userId,
      p_permissoes: permissoes,
    });
    if (error) throw error;
  },
};
