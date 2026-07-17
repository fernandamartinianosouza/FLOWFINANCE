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
  nome: string;
  email: string;
  perfil: PerfilOrganizacao;
  ativo: boolean;
  createdAt: string;
  ultimoAcesso: string | null;
  emailConfirmado: boolean;
  isCurrentUser: boolean;
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

const invocarGestao = async (
  body: Record<string, unknown>
) => {
  const { data, error } =
    await supabase.functions.invoke(
      'manage-organization-users',
      { body }
    );

  if (error) throw error;

  if (data?.error) {
    throw new Error(data.error);
  }

  return data;
};

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

  async listar(
    organizacaoId: string
  ): Promise<{
    usuarios: UsuarioOrganizacaoAdmin[];
    convites: ConviteOrganizacao[];
  }> {
    const data =
      await invocarGestao({
        acao: 'listar',
        organizacaoId,
      });

    return {
      usuarios:
        data.usuarios || [],
      convites:
        (data.convites || []).map(
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
        ),
    };
  },

  async editarUsuario(params: {
    organizacaoId: string;
    userId: string;
    nome: string;
    email: string;
    perfil: PerfilOrganizacao;
  }) {
    return invocarGestao({
      acao: 'editar',
      ...params,
    });
  },

  async alterarStatus(params: {
    organizacaoId: string;
    userId: string;
    ativo: boolean;
  }) {
    return invocarGestao({
      acao: 'alterar_status',
      ...params,
    });
  },

  async removerUsuario(params: {
    organizacaoId: string;
    userId: string;
  }) {
    return invocarGestao({
      acao: 'remover',
      ...params,
    });
  },

  async cancelarConvite(params: {
    organizacaoId: string;
    conviteId: string;
  }) {
    return invocarGestao({
      acao: 'cancelar_convite',
      ...params,
    });
  },
};
