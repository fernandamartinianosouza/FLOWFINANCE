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

interface InviteBody {
  organizacaoId: string;
  nome: string;
  email: string;
  perfil: Perfil;
  redirectTo?: string;
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

const localizarUsuarioPorEmail = async (
  adminClient: ReturnType<typeof createClient>,
  email: string
) => {
  const alvo = email.trim().toLowerCase();

  for (let page = 1; page <= 20; page += 1) {
    const { data, error } =
      await adminClient.auth.admin.listUsers({
        page,
        perPage: 100,
      });

    if (error) throw error;

    const encontrado = data.users.find(
      usuario =>
        usuario.email?.toLowerCase() === alvo
    );

    if (encontrado) return encontrado;

    if (data.users.length < 100) break;
  }

  return null;
};

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
      data: userData,
      error: userError,
    } = await userClient.auth.getUser();

    if (
      userError ||
      !userData.user
    ) {
      return json(
        { error: 'Sessão inválida.' },
        401
      );
    }

    const body =
      (await req.json()) as InviteBody;

    const organizacaoId =
      body.organizacaoId?.trim();

    const nome = body.nome?.trim();

    const email =
      body.email?.trim().toLowerCase();

    const perfil = body.perfil;

    const perfisPermitidos: Perfil[] = [
      'admin',
      'diretoria',
      'compras',
      'financeiro',
      'contas_pagar',
      'consulta',
    ];

    if (
      !organizacaoId ||
      !nome ||
      !email ||
      !perfisPermitidos.includes(perfil)
    ) {
      return json(
        { error: 'Dados do convite inválidos.' },
        400
      );
    }

    const { data: vinculoAdmin, error: vinculoError } =
      await adminClient
        .from('usuarios_organizacoes')
        .select('id, perfil, ativo')
        .eq(
          'user_id',
          userData.user.id
        )
        .eq(
          'organizacao_id',
          organizacaoId
        )
        .eq('ativo', true)
        .maybeSingle();

    if (vinculoError) throw vinculoError;

    if (
      !vinculoAdmin ||
      vinculoAdmin.perfil !== 'admin'
    ) {
      return json(
        {
          error:
            'Somente administradores podem convidar usuários.',
        },
        403
      );
    }

    const expiresAt = new Date(
      Date.now() +
        7 * 24 * 60 * 60 * 1000
    ).toISOString();

    const { error: conviteError } =
      await adminClient
        .from('convites_organizacoes')
        .upsert(
          {
            organizacao_id:
              organizacaoId,
            email,
            nome,
            perfil,
            status: 'pendente',
            convidado_por:
              userData.user.id,
            expires_at: expiresAt,
            aceito_em: null,
            user_id: null,
          },
          {
            onConflict:
              'organizacao_id,email',
          }
        );

    if (conviteError) {
      throw conviteError;
    }

    const usuarioExistente =
      await localizarUsuarioPorEmail(
        adminClient,
        email
      );

    if (usuarioExistente) {
      const { error: associarError } =
        await adminClient
          .from(
            'usuarios_organizacoes'
          )
          .upsert(
            {
              user_id:
                usuarioExistente.id,
              organizacao_id:
                organizacaoId,
              perfil,
              ativo: true,
            },
            {
              onConflict:
                'user_id,organizacao_id',
            }
          );

      if (associarError) {
        throw associarError;
      }

      await adminClient
        .from('convites_organizacoes')
        .update({
          status: 'aceito',
          user_id:
            usuarioExistente.id,
          aceito_em:
            new Date().toISOString(),
        })
        .eq(
          'organizacao_id',
          organizacaoId
        )
        .eq('email', email);

      return json({
        success: true,
        vinculado: true,
        message:
          'Usuário existente vinculado à organização.',
      });
    }

    const redirectTo =
      body.redirectTo ||
      `${req.headers.get('origin') || ''}/`;

    const {
      data: inviteData,
      error: inviteError,
    } =
      await adminClient.auth.admin
        .inviteUserByEmail(email, {
          redirectTo,
          data: {
            nome,
            flowfinance_invite: true,
            organizacao_id:
              organizacaoId,
            perfil,
          },
        });

    if (inviteError) {
      throw inviteError;
    }

    return json({
      success: true,
      vinculado: false,
      userId:
        inviteData.user?.id || null,
      message:
        'Convite enviado por e-mail.',
    });
  } catch (error) {
    console.error(error);

    return json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Erro ao enviar convite.',
      },
      500
    );
  }
});
