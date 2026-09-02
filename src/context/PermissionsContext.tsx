import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useFinance } from './FinanceContext';
import { useAuth } from './AuthContext';
import {
  AcaoPermissao,
  ModuloPermissao,
  permissoesPadraoPerfil,
} from '../config/actionPermissions';
import { permissoesService, PermissaoUsuario } from '../services/permissoesService';

interface PermissionsContextType {
  permissoes: PermissaoUsuario[];
  carregandoPermissoes: boolean;
  temPermissao: (modulo: ModuloPermissao, acao: AcaoPermissao) => boolean;
  recarregarPermissoes: () => Promise<void>;
}

const Context = createContext<PermissionsContextType | undefined>(undefined);

export const PermissionsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { organizacaoAtivaId, perfilOrganizacaoAtiva, loadingFinanceiro } = useFinance();
  const [permissoes, setPermissoes] = useState<PermissaoUsuario[]>([]);
  const [carregandoPermissoes, setCarregando] = useState(false);

  const recarregarPermissoes = async () => {
    if (!user || !organizacaoAtivaId) {
      setPermissoes([]);
      return;
    }

    if (perfilOrganizacaoAtiva === 'admin') {
      setPermissoes([]);
      return;
    }

    try {
      setCarregando(true);
      const atuais = await permissoesService.listar(organizacaoAtivaId);
      setPermissoes(atuais);
    } catch (error) {
      console.error('Erro ao carregar permissões:', error);
      // Não libera tudo em caso de falha. A função temPermissao usará
      // somente o padrão do perfil quando não houver permissões gravadas.
      setPermissoes([]);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    void recarregarPermissoes();
  }, [user?.id, organizacaoAtivaId, perfilOrganizacaoAtiva]);

  const permissoesEfetivas = useMemo(() => {
    if (perfilOrganizacaoAtiva === 'admin') return [];

    // Compatibilidade com usuários antigos: enquanto ainda não existem
    // permissões personalizadas, aplica o padrão do perfil.
    if (permissoes.length === 0 && perfilOrganizacaoAtiva) {
      return permissoesPadraoPerfil(perfilOrganizacaoAtiva);
    }

    return permissoes;
  }, [permissoes, perfilOrganizacaoAtiva]);

  const value = useMemo<PermissionsContextType>(
    () => ({
      permissoes: permissoesEfetivas,
      carregandoPermissoes,
      temPermissao: (modulo, acao) => {
        if (perfilOrganizacaoAtiva === 'admin') return true;

        // Evita esconder/redirecionar menus durante o carregamento inicial.
        if (loadingFinanceiro || carregandoPermissoes) return true;

        return permissoesEfetivas.some(
          permissao =>
            permissao.modulo === modulo &&
            permissao.acao === acao &&
            permissao.permitido
        );
      },
      recarregarPermissoes,
    }),
    [
      permissoesEfetivas,
      carregandoPermissoes,
      perfilOrganizacaoAtiva,
      loadingFinanceiro,
    ]
  );

  return <Context.Provider value={value}>{children}</Context.Provider>;
};

export const usePermissions = () => {
  const ctx = useContext(Context);
  if (!ctx) {
    throw new Error('usePermissions deve ser usado dentro de PermissionsProvider');
  }
  return ctx;
};
