import { supabase } from '../lib/supabase';

export type PerfilOrganizacao =
  | 'admin'
  | 'diretoria'
  | 'compras'
  | 'financeiro'
  | 'contas_pagar'
  | 'consulta';

export interface UsuarioOrganizacaoAdmin {
  id: string;
  userId: string;
  organizacaoId: string;
  perfil: PerfilOrganizacao;
  ativo: boolean;
  nome: string;
  email: string;
  createdAt?: string | null;
}

export interface ConviteOrganizacao {
  id: string;
  organizacaoId: string;
  email: string;
  nome: string | null;
  perfil: PerfilOrganizacao;
  status:
    | 'pendente'
    | 'aceito'
    | 'expirado'
    | 'cancelado';
  expiresAt: string;
  createdAt: string;
}

export const organizacaoUsuariosService = {
  async convidar(params: {
    organizacaoId: string;
    nome: string;
    email: string;
    perfil: PerfilOrganizacao;
  }) {
    const { data, error } =
      await supabase.functions.invoke(
        'invite-organization-user',
        {
          body: {
            ...params,
            redirectTo:
              `${window.location.origin}/?definir-senha=1`,
          },
        }
      );

    if (error) throw error;

    if (data?.error) {
      throw new Error(data.error);
    }

    return data;
  },

  async listarUsuarios(
    organizacaoId: string
  ): Promise<UsuarioOrganizacaoAdmin[]> {
    const { data, error } =
      await supabase.rpc(
        'listar_usuarios_organizacao_admin',
        {
          p_organizacao_id:
            organizacaoId,
        }
      );

    if (error) throw error;

    return (data || []).map(
      (item: any) => ({
        id: String(item.id),
        userId: String(item.user_id),
        organizacaoId: String(
          item.organizacao_id
        ),
        perfil:
          item.perfil as PerfilOrganizacao,
        ativo: Boolean(item.ativo),
        nome:
          item.nome ||
          item.email ||
          'Usuário',
        email: item.email || '',
        createdAt:
          item.created_at || null,
      })
    );
  },

  async atualizarAcesso(params: {
    vinculoId: string;
    perfil: PerfilOrganizacao;
    ativo: boolean;
  }) {
    const { data, error } =
      await supabase.rpc(
        'atualizar_acesso_usuario_organizacao_admin',
        {
          p_vinculo_id:
            params.vinculoId,
          p_perfil:
            params.perfil,
          p_ativo:
            params.ativo,
        }
      );

    if (error) throw error;

    return data;
  },

  async listarConvites(
    organizacaoId: string
  ): Promise<ConviteOrganizacao[]> {
    const { data, error } =
      await supabase
        .from(
          'convites_organizacoes'
        )
        .select('*')
        .eq(
          'organizacao_id',
          organizacaoId
        )
        .order('created_at', {
          ascending: false,
        });

    if (error) throw error;

    return (data || []).map(
      (item: any) => ({
        id: item.id,
        organizacaoId:
          item.organizacao_id,
        email: item.email,
        nome: item.nome,
        perfil: item.perfil,
        status: item.status,
        expiresAt:
          item.expires_at,
        createdAt:
          item.created_at,
      })
    );
  },

  async cancelarConvite(
    conviteId: string
  ) {
    const { error } = await supabase
      .from('convites_organizacoes')
      .update({
        status: 'cancelado',
      })
      .eq('id', conviteId);

    if (error) throw error;
  },
};
