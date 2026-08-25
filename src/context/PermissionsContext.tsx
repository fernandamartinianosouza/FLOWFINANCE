import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useFinance } from './FinanceContext';
import { useAuth } from './AuthContext';
import { AcaoPermissao, ModuloPermissao } from '../config/actionPermissions';
import { permissoesService, PermissaoUsuario } from '../services/permissoesService';

interface PermissionsContextType {
  permissoes: PermissaoUsuario[];
  carregandoPermissoes: boolean;
  temPermissao: (modulo: ModuloPermissao, acao: AcaoPermissao) => boolean;
  recarregarPermissoes: () => Promise<void>;
}
const Context = createContext<PermissionsContextType | undefined>(undefined);

export const PermissionsProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const { user } = useAuth();
  const { organizacaoAtivaId, perfilOrganizacaoAtiva } = useFinance();
  const [permissoes, setPermissoes] = useState<PermissaoUsuario[]>([]);
  const [carregandoPermissoes, setCarregando] = useState(false);

  const recarregarPermissoes = async () => {
    if (!user || !organizacaoAtivaId) { setPermissoes([]); return; }
    if (perfilOrganizacaoAtiva === 'admin') { setPermissoes([]); return; }
    try {
      setCarregando(true);
      setPermissoes(await permissoesService.listar(organizacaoAtivaId));
    } catch (e) {
      console.error('Erro ao carregar permissões:', e);
      setPermissoes([]);
    } finally { setCarregando(false); }
  };

  useEffect(() => { recarregarPermissoes(); }, [user?.id, organizacaoAtivaId, perfilOrganizacaoAtiva]);

  const value = useMemo<PermissionsContextType>(() => ({
    permissoes,
    carregandoPermissoes,
    temPermissao: (modulo, acao) => {
      if (perfilOrganizacaoAtiva === 'admin') return true;
      return permissoes.some(p => p.modulo === modulo && p.acao === acao && p.permitido);
    },
    recarregarPermissoes,
  }), [permissoes, carregandoPermissoes, perfilOrganizacaoAtiva]);

  return <Context.Provider value={value}>{children}</Context.Provider>;
};

export const usePermissions = () => {
  const ctx = useContext(Context);
  if (!ctx) throw new Error('usePermissions deve ser usado dentro de PermissionsProvider');
  return ctx;
};
