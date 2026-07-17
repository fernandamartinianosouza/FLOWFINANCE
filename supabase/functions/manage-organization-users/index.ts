import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type Perfil =
  | 'admin'
  | 'diretoria'
  | 'compras'
  | 'financeiro'
  | 'contas_pagar'
  | 'consulta';

type Acao =
  | 'listar'
  | 'editar'
  | 'alterar_status'
  | 'remover'
  | 'cancelar_convite';

interface Body {
  acao: Acao;
  organizacaoId: string;
  userId?: string;
  conviteId?: string;
  nome?: string;
  email?: string;
  perfil?: Perfil;
  ativo?: boolean;
}

const json = (
  body: Record<string, unknown>,
  status = 200
) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });

const perfisPermitidos: Perfil[] = [
  'admin',
  'diretoria',
  'compras',
  'financeiro',
  'contas_pagar',
  'consulta',
];

Deno.serve(async req => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders,
    });
  }

  if (req.method !== 'POST') {
    return json(
      { error: 'Método não permitido.' },
      405
    );
  }

  try {
    const supabaseUrl =
      Deno.env.get('SUPABASE_URL');

    const anonKey =
      Deno.env.get('SUPABASE_ANON_KEY');

    const serviceRoleKey =
      Deno.env.get(
        'SUPABASE_SERVICE_ROLE_KEY'
      );

    if (
      !supabaseUrl ||
      !anonKey ||
      !serviceRoleKey
    ) {
      throw new Error(
        'Variáveis do Supabase não configuradas.'
      );
    }

    const authorization =
      req.headers.get('Authorization');

    if (!authorization) {
      return json(
        { error: 'Sessão não informada.' },
        401
      );
    }

    const userClient = createClient(
      supabaseUrl,
      anonKey,
      {
        global: {
          headers: {
            Authorization: authorization,
          },
        },
      }
    );

    const adminClient = createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const {
      data: usuarioSessao,
      error: usuarioErro,
    } = await userClient.auth.getUser();

    if (
      usuarioErro ||
      !usuarioSessao.user
    ) {
      return json(
        { error: 'Sessão inválida.' },
        401
      );
    }

    const body = (await req.json()) as Body;

    if (
      !body.acao ||
      !body.organizacaoId
    ) {
      return json(
        { error: 'Dados incompletos.' },
        400
      );
    }

    const { data: vinculoAdmin, error: adminErro } =
      await adminClient
        .from('usuarios_organizacoes')
        .select('id, perfil, ativo')
        .eq(
          'user_id',
          usuarioSessao.user.id
        )
        .eq(
          'organizacao_id',
          body.organizacaoId
        )
        .eq('ativo', true)
        .maybeSingle();

    if (adminErro) throw adminErro;

    if (
      !vinculoAdmin ||
      vinculoAdmin.perfil !== 'admin'
    ) {
      return json(
        {
          error:
            'Somente administradores podem gerenciar usuários.',
        },
        403
      );
    }

    if (body.acao === 'listar') {
      const { data: vinculos, error: vinculosErro } =
        await adminClient
          .from('usuarios_organizacoes')
          .select(`
            id,
            user_id,
            organizacao_id,
            perfil,
            ativo,
            created_at
          `)
          .eq(
            'organizacao_id',
            body.organizacaoId
          )
          .order('created_at', {
            ascending: true,
          });

      if (vinculosErro) throw vinculosErro;

      const userIds = (vinculos || []).map(
        item => item.user_id
      );

      const { data: profiles, error: profilesErro } =
        userIds.length
          ? await adminClient
              .from('profiles')
              .select('id, nome, perfil')
              .in('id', userIds)
          : { data: [], error: null };

      if (profilesErro) throw profilesErro;

      const authUsers = [];

      for (const userId of userIds) {
        const { data, error } =
          await adminClient.auth.admin
            .getUserById(userId);

        if (error) {
          console.error(
            'Erro ao carregar usuário:',
            userId,
            error.message
          );
          continue;
        }

        if (data.user) {
          authUsers.push(data.user);
        }
      }

      const profileMap = new Map(
        (profiles || []).map(
          profile => [
            profile.id,
            profile,
          ]
        )
      );

      const authMap = new Map(
        authUsers.map(
          usuario => [
            usuario.id,
            usuario,
          ]
        )
      );

      const usuarios = (vinculos || []).map(
        vinculo => {
          const profile =
            profileMap.get(
              vinculo.user_id
            );

          const authUser =
            authMap.get(
              vinculo.user_id
            );

          return {
            id: vinculo.id,
            userId:
              vinculo.user_id,
            organizacaoId:
              vinculo.organizacao_id,
            nome:
              profile?.nome ||
              authUser?.user_metadata
                ?.nome ||
              authUser?.email ||
              'Usuário',
            email:
              authUser?.email || '',
            perfil:
              vinculo.perfil,
            ativo:
              vinculo.ativo,
            createdAt:
              vinculo.created_at,
            ultimoAcesso:
              authUser?.last_sign_in_at ||
              null,
            emailConfirmado:
              Boolean(
                authUser
                  ?.email_confirmed_at
              ),
            isCurrentUser:
              vinculo.user_id ===
              usuarioSessao.user.id,
          };
        }
      );

      const { data: convites, error: convitesErro } =
        await adminClient
          .from('convites_organizacoes')
          .select('*')
          .eq(
            'organizacao_id',
            body.organizacaoId
          )
          .order('created_at', {
            ascending: false,
          });

      if (convitesErro) throw convitesErro;

      return json({
        success: true,
        usuarios,
        convites: convites || [],
      });
    }

    if (!body.userId && body.acao !== 'cancelar_convite') {
      return json(
        { error: 'Usuário não informado.' },
        400
      );
    }

    if (
      body.userId ===
        usuarioSessao.user.id &&
      (
        body.acao === 'remover' ||
        (
          body.acao ===
            'alterar_status' &&
          body.ativo === false
        )
      )
    ) {
      return json(
        {
          error:
            'Você não pode remover ou desativar o próprio acesso.',
        },
        400
      );
    }

    if (
      body.acao === 'editar'
    ) {
      if (
        !body.perfil ||
        !perfisPermitidos.includes(
          body.perfil
        )
      ) {
        return json(
          { error: 'Perfil inválido.' },
          400
        );
      }

      const nome =
        body.nome?.trim();

      const email =
        body.email
          ?.trim()
          .toLowerCase();

      if (!nome || !email) {
        return json(
          {
            error:
              'Nome e e-mail são obrigatórios.',
          },
          400
        );
      }

      const { error: authUpdateErro } =
        await adminClient.auth.admin
          .updateUserById(
            body.userId!,
            {
              email,
              user_metadata: {
                nome,
              },
            }
          );

      if (authUpdateErro) {
        throw authUpdateErro;
      }

      const { error: profileErro } =
        await adminClient
          .from('profiles')
          .upsert({
            id: body.userId,
            nome,
            role: 'user',
            perfil: body.perfil,
          });

      if (profileErro) throw profileErro;

      const { error: vinculoErro } =
        await adminClient
          .from('usuarios_organizacoes')
          .update({
            perfil: body.perfil,
          })
          .eq(
            'user_id',
            body.userId
          )
          .eq(
            'organizacao_id',
            body.organizacaoId
          );

      if (vinculoErro) throw vinculoErro;

      return json({
        success: true,
        message:
          'Usuário atualizado com sucesso.',
      });
    }

    if (
      body.acao ===
      'alterar_status'
    ) {
      if (
        typeof body.ativo !== 'boolean'
      ) {
        return json(
          { error: 'Status inválido.' },
          400
        );
      }

      if (!body.ativo) {
        const { data: alvo } =
          await adminClient
            .from(
              'usuarios_organizacoes'
            )
            .select('perfil')
            .eq(
              'user_id',
              body.userId
            )
            .eq(
              'organizacao_id',
              body.organizacaoId
            )
            .maybeSingle();

        if (alvo?.perfil === 'admin') {
          const { count } =
            await adminClient
              .from(
                'usuarios_organizacoes'
              )
              .select('id', {
                count: 'exact',
                head: true,
              })
              .eq(
                'organizacao_id',
                body.organizacaoId
              )
              .eq('perfil', 'admin')
              .eq('ativo', true);

          if ((count || 0) <= 1) {
            return json(
              {
                error:
                  'A organização precisa manter pelo menos um administrador ativo.',
              },
              400
            );
          }
        }
      }

      const { error } =
        await adminClient
          .from(
            'usuarios_organizacoes'
          )
          .update({
            ativo: body.ativo,
          })
          .eq(
            'user_id',
            body.userId
          )
          .eq(
            'organizacao_id',
            body.organizacaoId
          );

      if (error) throw error;

      return json({
        success: true,
        message: body.ativo
          ? 'Usuário reativado.'
          : 'Usuário desativado.',
      });
    }

    if (body.acao === 'remover') {
      const { data: alvo } =
        await adminClient
          .from(
            'usuarios_organizacoes'
          )
          .select('perfil')
          .eq(
            'user_id',
            body.userId
          )
          .eq(
            'organizacao_id',
            body.organizacaoId
          )
          .maybeSingle();

      if (alvo?.perfil === 'admin') {
        const { count } =
          await adminClient
            .from(
              'usuarios_organizacoes'
            )
            .select('id', {
              count: 'exact',
              head: true,
            })
            .eq(
              'organizacao_id',
              body.organizacaoId
            )
            .eq('perfil', 'admin')
            .eq('ativo', true);

        if ((count || 0) <= 1) {
          return json(
            {
              error:
                'A organização precisa manter pelo menos um administrador.',
            },
            400
          );
        }
      }

      const { error } =
        await adminClient
          .from(
            'usuarios_organizacoes'
          )
          .delete()
          .eq(
            'user_id',
            body.userId
          )
          .eq(
            'organizacao_id',
            body.organizacaoId
          );

      if (error) throw error;

      /*
       * O usuário permanece em auth.users.
       * Isso permite que ele participe de outra organização
       * e evita apagar a conta global indevidamente.
       */
      return json({
        success: true,
        message:
          'Acesso removido da organização.',
      });
    }

    if (
      body.acao ===
      'cancelar_convite'
    ) {
      if (!body.conviteId) {
        return json(
          {
            error:
              'Convite não informado.',
          },
          400
        );
      }

      const { error } =
        await adminClient
          .from(
            'convites_organizacoes'
          )
          .update({
            status: 'cancelado',
          })
          .eq('id', body.conviteId)
          .eq(
            'organizacao_id',
            body.organizacaoId
          );

      if (error) throw error;

      return json({
        success: true,
        message:
          'Convite cancelado.',
      });
    }

    return json(
      { error: 'Ação inválida.' },
      400
    );
  } catch (error) {
    console.error(error);

    return json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Erro ao gerenciar usuário.',
      },
      500
    );
  }
});
