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

    if (error) {
      throw error;
    }

    if (data?.error) {
      throw new Error(data.error);
    }

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
