import { supabase } from '../lib/supabase';

/**
 * Empresas que o usuário autenticado pode acessar na organização ativa.
 * A regra real fica no Supabase (listar_minhas_empresas), evitando confiar
 * apenas no filtro visual do front-end.
 */
export const empresasPermissoesService = {
  async listarIds(organizacaoId: string): Promise<string[]> {
    if (!organizacaoId) return [];

    const { data, error } = await supabase.rpc(
      'listar_minhas_empresas',
      { p_organizacao_id: organizacaoId }
    );

    if (error) {
      throw new Error(
        `Não foi possível carregar as empresas permitidas: ${error.message}`
      );
    }

    return (data || [])
      .filter((item: any) => item?.empresa_id)
      .map((item: any) => String(item.empresa_id));
  },
};
