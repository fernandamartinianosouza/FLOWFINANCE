import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  Empresa,
  Fornecedor,
  PlanoFinanceiro,
  CentroCusto,
  ProcessoCompra,
  AlertaSistema,
  StatusProcesso,
  Urgencia,
  HistoricoStatus,
  Organizacao,
  UsuarioOrganizacao,
} from '../types';
import { STATUS_LABELS } from '../utils';
import { financeService } from '../services/financeService';
import { useAuth } from './AuthContext';

export type ActiveView =
  | 'dashboard'
  | 'processos'
  | 'solicitacao'
  | 'catalogo-itens'
  | 'cotacoes'
  | 'autorizacoes'
  | 'nova-conta'
  | 'contas-pagar'
  | 'programacao'
  | 'pagamentos-programados'
  | 'conciliacao'
  | 'centro-financeiro'
  | 'calendario'
  | 'fluxo-caixa'
  | 'empresas'
  | 'fornecedores'
  | 'usuarios'
  | (string & Record<never, never>);

interface FinanceContextType {
  organizacoesUsuario: UsuarioOrganizacao[];
  organizacoes: Organizacao[];
  organizacaoAtivaId: string;
  setOrganizacaoAtivaId: (id: string) => void;
  perfilOrganizacaoAtiva: UsuarioOrganizacao['perfil'] | null;

  empresas: Empresa[];
  fornecedores: Fornecedor[];
  planosFinanceiros: PlanoFinanceiro[];
  centrosCustos: CentroCusto[];
  processos: ProcessoCompra[];
  alertas: AlertaSistema[];
  loadingFinanceiro: boolean;
  erroFinanceiro: string | null;
  recarregarDados: () => Promise<void>;

  empresaAtivaId: string;
  setEmpresaAtivaId: (id: string) => void;

  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;

  activeProcessId: string | null;
  setActiveProcessId: (id: string | null) => void;

  programarPagamento: (
  id: string,
  dataProgramada: string,
  usuario: string
) => Promise<void>;

  uploadAnexoProcesso: (file: File) => Promise<{
    nome: string;
    caminho: string;
    url: string;
  }>;

  getDocumentosProcesso: (processoDbId: string) => Promise<any[]>;

  anexarDocumentoProcesso: (params: {
    processoDbId: string;
    file: File;
    tipo?: string;
    enviadoPor?: string;
  }) => Promise<any>;

  criarSolicitacao: (dados: {
    tipoPagamento: 'fornecedor' | 'interno';
    fornecedorId: string | null;
    beneficiarioInterno?: string | null;
    empresaId: string;
    planoFinanceiroId: string;
    centroCustoId: string;
    descricao: string;
    valor: number;
    urgencia: Urgencia;
    responsavel: string;
    prazo: string;
    anexoNome?: string | null;
    anexoUrl?: string | null;
    formaPagamento?: string;
    pixTipoChave?: string | null;
    pixChave?: string | null;
    pixFavorecido?: string | null;
    pixBanco?: string | null;
    pixObservacao?: string | null;
  }) => Promise<void>;

  editarProcesso: (id: string, dados: Partial<ProcessoCompra>) => Promise<void>;
  excluirProcesso: (id: string) => Promise<boolean>;

  avancarProcesso: (
    id: string,
    novoStatus: StatusProcesso,
    usuario: string,
    observacao?: string
  ) => Promise<void>;

  reprovarProcesso: (id: string, usuario: string, observacao: string) => Promise<void>;
  solicitarAjustes: (id: string, usuario: string, observacao: string) => Promise<void>;

  registrarPagamento: (
    id: string,
    metodo: 'pix' | 'ted' | 'boleto' | 'dinheiro' | 'cartao',
    valorPagamento: number,
    comprovante?: string,
    observacao?: string
  ) => Promise<void>;

  conciliarPagamento: (id: string) => Promise<void>;

  cadastrarEmpresa: (empresa: Omit<Empresa, 'id' | 'saldoAtual' | 'organizacaoId'>) => Promise<void>;
  editarEmpresa: (id: string, empresa: Omit<Empresa, 'id' | 'saldoAtual' | 'organizacaoId'>) => Promise<void>;
  excluirEmpresa: (id: string) => Promise<boolean>;

  cadastrarFornecedor: (
    fornecedor: Omit<Fornecedor, 'id' | 'historicoCompras' | 'ultimaCompra' | 'tempoMedioPagamento' | 'organizacaoId'>
  ) => Promise<void>;

  editarFornecedor: (
    id: string,
    fornecedor: Omit<Fornecedor, 'id' | 'historicoCompras' | 'ultimaCompra' | 'tempoMedioPagamento' | 'organizacaoId'>
  ) => Promise<void>;

  excluirFornecedor: (id: string) => Promise<boolean>;

  cadastrarPlanoFinanceiro: (
    plano: Omit<PlanoFinanceiro, 'id' | 'utilizado' | 'comprometido' | 'organizacaoId'>
  ) => Promise<void>;

  editarPlanoFinanceiro: (
    id: string,
    plano: Omit<PlanoFinanceiro, 'id' | 'utilizado' | 'comprometido' | 'organizacaoId'>
  ) => Promise<void>;

  excluirPlanoFinanceiro: (id: string) => Promise<boolean>;

  cadastrarCentroCusto: (centro: Omit<CentroCusto, 'id' | 'utilizado'>) => Promise<void>;

  editarCentroCusto: (
    id: string,
    centro: Omit<CentroCusto, 'id' | 'utilizado'>
  ) => Promise<void>;

  excluirCentroCusto: (id: string) => Promise<boolean>;

  marcarAlertaLido: (id: string) => Promise<void>;

  obterSugeridoProximoPasso: (processo: ProcessoCompra) => {
    texto: string;
    acaoLabel: string;
    viewTarget: string;
  };
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export const useFinance = () => {
  const context = useContext(FinanceContext);

  if (!context) {
    throw new Error('useFinance deve ser usado dentro de um FinanceProvider');
  }

  return context;
};

export const FinanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const usuarioLogado =
  user?.user_metadata?.nome ||
  user?.user_metadata?.name ||
  user?.email ||
  'Usuário logado';

  const [organizacoesUsuario, setOrganizacoesUsuario] =
    useState<UsuarioOrganizacao[]>([]);
  const [organizacaoAtivaIdState, setOrganizacaoAtivaIdState] =
    useState<string>('');

  const organizacoes = organizacoesUsuario
    .map(vinculo => vinculo.organizacao)
    .filter((organizacao): organizacao is Organizacao => Boolean(organizacao));

  const perfilOrganizacaoAtiva =
    organizacoesUsuario.find(
      vinculo => vinculo.organizacaoId === organizacaoAtivaIdState
    )?.perfil || null;

  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [planosFinanceiros, setPlanosFinanceiros] = useState<PlanoFinanceiro[]>([]);
  const [centrosCustos, setCentrosCustos] = useState<CentroCusto[]>([]);
  const [processos, setProcessos] = useState<ProcessoCompra[]>([]);
  const [alertas, setAlertas] = useState<AlertaSistema[]>([]);

  const [empresaAtivaId, setEmpresaAtivaId] = useState<string>('');

  const setOrganizacaoAtivaId = useCallback((id: string) => {
    setOrganizacaoAtivaIdState(id);

    if (id) {
      localStorage.setItem('flowfinance_organizacao_ativa_id', id);
    } else {
      localStorage.removeItem('flowfinance_organizacao_ativa_id');
    }

    setEmpresaAtivaId('');
  }, []);
  const [activeView, setActiveView] = useState<ActiveView>('dashboard');
  const [activeProcessId, setActiveProcessId] = useState<string | null>(null);

  const [loadingFinanceiro, setLoadingFinanceiro] = useState(false);
  const [erroFinanceiro, setErroFinanceiro] = useState<string | null>(null);

  const recarregarDados = useCallback(async () => {
    if (!user || !organizacaoAtivaIdState) {
      return;
    }

    try {
      setLoadingFinanceiro(true);
      setErroFinanceiro(null);

      const dados = await financeService.carregarDados(
        organizacaoAtivaIdState
      );

      setEmpresas(dados.empresas);
      setFornecedores(dados.fornecedores);
      setPlanosFinanceiros(dados.planosFinanceiros);
      setCentrosCustos(dados.centrosCustos);
      setProcessos(dados.processos);
      setAlertas(dados.alertas);

      setEmpresaAtivaId(atual => {
        const empresaAtualAindaExiste = dados.empresas.some(
          empresa => empresa.id === atual
        );

        if (empresaAtualAindaExiste) {
          return atual;
        }

        return dados.empresas[0]?.id || '';
      });
    } catch (error: any) {
      console.error(
        'Erro ao recarregar dados financeiros:',
        error
      );

      setErroFinanceiro(
        error?.message ||
          'Erro ao recarregar dados financeiros.'
      );
    } finally {
      setLoadingFinanceiro(false);
    }
  }, [user, organizacaoAtivaIdState]);

  useEffect(() => {
    let cancelado = false;

    const inicializarOrganizacoes = async () => {
      if (!user) {
        setOrganizacoesUsuario([]);
        setOrganizacaoAtivaIdState('');
        setEmpresas([]);
        setFornecedores([]);
        setPlanosFinanceiros([]);
        setCentrosCustos([]);
        setProcessos([]);
        setAlertas([]);
        setEmpresaAtivaId('');
        setLoadingFinanceiro(false);
        setErroFinanceiro(null);
        return;
      }

      try {
        setLoadingFinanceiro(true);
        setErroFinanceiro(null);

        const vinculos =
          await financeService.getOrganizacoesUsuario();

        if (cancelado) return;

        setOrganizacoesUsuario(vinculos);

        const salva = localStorage.getItem(
          'flowfinance_organizacao_ativa_id'
        );

        const organizacaoValida = vinculos.some(
          vinculo => vinculo.organizacaoId === salva
        );

        const proximaOrganizacaoId = organizacaoValida
          ? salva || ''
          : vinculos[0]?.organizacaoId || '';

        setOrganizacaoAtivaIdState(proximaOrganizacaoId);

        if (proximaOrganizacaoId) {
          localStorage.setItem(
            'flowfinance_organizacao_ativa_id',
            proximaOrganizacaoId
          );
        }

        if (!proximaOrganizacaoId) {
          setErroFinanceiro(
            'Seu usuário não possui uma organização ativa vinculada.'
          );
        }
      } catch (error: any) {
        if (cancelado) return;

        console.error(
          'Erro ao carregar organizações do usuário:',
          error
        );

        setErroFinanceiro(
          error?.message ||
            'Erro ao carregar organizações do usuário.'
        );
      } finally {
        if (!cancelado) {
          setLoadingFinanceiro(false);
        }
      }
    };

    inicializarOrganizacoes();

    return () => {
      cancelado = true;
    };
  }, [user]);

  useEffect(() => {
    if (!user || !organizacaoAtivaIdState) {
      return;
    }

    recarregarDados();
  }, [user, organizacaoAtivaIdState, recarregarDados]);

  useEffect(() => {
    if (!user) {
      return;
    }

    const atualizarAoVoltar = () => {
      if (
        document.visibilityState === 'visible'
      ) {
        recarregarDados();
      }
    };

    const atualizarAoFocar = () => {
      recarregarDados();
    };

    document.addEventListener(
      'visibilitychange',
      atualizarAoVoltar
    );

    window.addEventListener(
      'focus',
      atualizarAoFocar
    );

    const intervalo = window.setInterval(
      () => {
        if (
          document.visibilityState === 'visible'
        ) {
          recarregarDados();
        }
      },
      30000
    );

    return () => {
      document.removeEventListener(
        'visibilitychange',
        atualizarAoVoltar
      );

      window.removeEventListener(
        'focus',
        atualizarAoFocar
      );

      window.clearInterval(intervalo);
    };
  }, [user, recarregarDados]);

  const uploadAnexoProcesso = async (file: File) => {
    return financeService.uploadAnexoProcesso(file, organizacaoAtivaIdState);
  };

  const getDocumentosProcesso = async (processoDbId: string) => {
  return financeService.getDocumentosProcesso(processoDbId);
};

const anexarDocumentoProcesso = async (params: {
  processoDbId: string;
  file: File;
  tipo?: string;
  enviadoPor?: string;
}) => {
  return financeService.anexarDocumentoProcesso({
    ...params,
    organizacaoId: organizacaoAtivaIdState,
  });
};

  const criarSolicitacao = async (dados: {
    tipoPagamento: 'fornecedor' | 'interno';
    fornecedorId: string | null;
    beneficiarioInterno?: string | null;
    empresaId: string;
    planoFinanceiroId: string;
    centroCustoId: string;
    descricao: string;
    valor: number;
    urgencia: Urgencia;
    responsavel: string;
    prazo: string;
    anexoNome?: string | null;
    anexoUrl?: string | null;
    formaPagamento?: string;
    pixTipoChave?: string | null;
    pixChave?: string | null;
    pixFavorecido?: string | null;
    pixBanco?: string | null;
    pixObservacao?: string | null;
  }) => {
    try {
      if (!organizacaoAtivaIdState) {
        throw new Error('Nenhuma organização ativa selecionada.');
      }

      const novoCodigo = `FF-${new Date().getFullYear()}-${String(
        processos.length + 101
      ).padStart(3, '0')}`;

      const agora = new Date().toISOString().replace('T', ' ').substring(0, 16);

      const novoProcesso: ProcessoCompra = {
        id: novoCodigo,
        organizacaoId: organizacaoAtivaIdState,
        tipoPagamento: dados.tipoPagamento,
        fornecedorId:
          dados.tipoPagamento === 'fornecedor'
            ? dados.fornecedorId
            : null,
        beneficiarioInterno:
          dados.tipoPagamento === 'interno'
            ? dados.beneficiarioInterno || null
            : null,
        empresaId: dados.empresaId,
        planoFinanceiroId: dados.planoFinanceiroId,
        centroCustoId: dados.centroCustoId,
        descricao: dados.descricao,
        valor: Number(dados.valor) || 0,
        urgencia: dados.urgencia,
        responsavel: dados.responsavel,
        dataCriacao: new Date().toISOString().split('T')[0],
        status: 'autorizacao_diretoria',
        prazo: dados.prazo,

        anexoNome: dados.anexoNome || null,
        anexoUrl: dados.anexoUrl || null,

        formaPagamento: dados.formaPagamento || 'pix',
        pixTipoChave: dados.pixTipoChave || null,
        pixChave: dados.pixChave
          ? dados.pixChave.trim().toLowerCase()
          : null,
        pixFavorecido: dados.pixFavorecido || null,
        pixBanco: dados.pixBanco || null,
        pixObservacao: dados.pixObservacao || null,

        historico: [
          {
            data: agora,
            usuario: usuarioLogado,
            deStatus: 'criacao',
            paraStatus: 'solicitacao',
            observacao: 'Solicitação criada no portal FLOWFINANCE.',
          },
          {
            data: agora,
            usuario: usuarioLogado,
            deStatus: 'solicitacao',
            paraStatus: 'autorizacao_diretoria',
            observacao:
              'Solicitação encaminhada pelo setor de Compras para aprovação da Diretoria.',
          },
        ],
      } as any;

      const criado = await financeService.criarProcesso(novoProcesso);

      setProcessos(prev => [criado, ...prev]);

      const novoAlerta = await financeService.criarAlerta({
        organizacaoId: organizacaoAtivaIdState,
        tipo: dados.urgencia === 'alta' ? 'urgente' : 'info',
        titulo: 'Nova Solicitação para Aprovação da Diretoria',
        mensagem: `${novoCodigo} (${
          dados.tipoPagamento === 'interno'
            ? dados.beneficiarioInterno || 'Pagamento interno'
            : 'Fornecedor'
        }) enviado para aprovação da Diretoria no valor de R$ ${dados.valor.toLocaleString(
          'pt-BR',
          { minimumFractionDigits: 2 }
        )}`,
        lido: false,
        processoId: (criado as any).dbId || null,
      });

      setAlertas(prev => [novoAlerta, ...prev]);

      setActiveProcessId(criado.id);
      setActiveView('autorizacoes');
    } catch (error: any) {
      console.error('Erro ao criar solicitação:', error);
      alert(error.message || 'Erro ao criar solicitação.');
    }
  };

  const editarProcesso = async (id: string, dados: Partial<ProcessoCompra>) => {
    try {
      const atual = processos.find(p => p.id === id);
      if (!atual) return;

      const atualizado = {
        ...atual,
        ...dados,
        organizacaoId: organizacaoAtivaIdState,
      };

      const salvo = await financeService.editarProcesso(id, atualizado);

      setProcessos(prev =>
        prev.map(processo => (processo.id === id ? { ...processo, ...salvo } : processo))
      );
    } catch (error: any) {
      console.error('Erro ao editar processo:', error);
      alert(error.message || 'Erro ao editar processo.');
    }
  };

  const excluirProcesso = async (id: string) => {
    try {
      await financeService.excluirProcesso(id, organizacaoAtivaIdState);

      setProcessos(prev => prev.filter(processo => processo.id !== id));
      setAlertas(prev => prev.filter(alerta => alerta.processoId !== id));

      if (activeProcessId === id) {
        setActiveProcessId(null);
      }

      return true;
    } catch (error: any) {
      console.error('Erro ao excluir processo:', error);
      alert(error.message || 'Erro ao excluir processo.');
      return false;
    }
  };

  const obterLabelStatus = (st: StatusProcesso): string => STATUS_LABELS[st];

  const avancarProcesso = async (
    id: string,
    novoStatus: StatusProcesso,
    usuario: string,
    observacao?: string
  ) => {
    try {
      const processoAtual = processos.find(p => p.id === id);
      if (!processoAtual) return;

      const novoHistorico: HistoricoStatus = {
        data: new Date().toISOString().replace('T', ' ').substring(0, 16),
        usuario: usuarioLogado,
        deStatus: processoAtual.status,
        paraStatus: novoStatus,
        observacao: observacao || `Avançado para a etapa de ${obterLabelStatus(novoStatus)}.`,
      };

      const atualizado: ProcessoCompra = {
        ...processoAtual,
        status: novoStatus,
        historico: [...(processoAtual.historico || []), novoHistorico],
      };

      await financeService.editarProcesso(id, atualizado);

      if ((processoAtual as any).dbId) {
        await financeService.criarHistoricoProcesso({
          dbId: (processoAtual as any).dbId,
          usuario: usuarioLogado,
          deStatus: processoAtual.status,
          paraStatus: novoStatus,
          observacao: novoHistorico.observacao,
        });
      }

      setProcessos(prev => prev.map(p => (p.id === id ? atualizado : p)));

      let alertaTipo: 'sucesso' | 'urgente' | 'info' | 'alerta' = 'info';
      let titulo = '';
      let mensagem = '';

      if (novoStatus === 'autorizacao_diretoria') {
        alertaTipo = 'urgente';
        titulo = 'Aprovação da Diretoria';
        mensagem = `O processo ${id} está aguardando assinatura da diretoria.`;
      }

      if (novoStatus === 'pagamento') {
        alertaTipo = 'alerta';
        titulo = 'Conta Pronta para Pagamento';
        mensagem = `${id} foi totalmente aprovado e está na fila do Contas a Pagar.`;
      }

      if (novoStatus === 'finalizado') {
        alertaTipo = 'sucesso';
        titulo = 'Processo Finalizado';
        mensagem = `O processo ${id} foi conciliado e finalizado com sucesso.`;
      }

      if (titulo) {
        const alerta = await financeService.criarAlerta({
          organizacaoId: organizacaoAtivaIdState,
          tipo: alertaTipo,
          titulo,
          mensagem,
          lido: false,
          processoId: (processoAtual as any).dbId || null,
        });

        setAlertas(prev => [alerta, ...prev]);
      }
    } catch (error: any) {
      console.error('Erro ao avançar processo:', error);
      alert(error.message || 'Erro ao avançar processo.');
    }
  };

  const reprovarProcesso = async (id: string, usuario: string, observacao: string) => {
    await avancarProcesso(id, 'solicitacao', usuario, `REPROVADO/DEVOLVIDO: ${observacao}`);
  };

  const solicitarAjustes = async (id: string, usuario: string, observacao: string) => {
    await reprovarProcesso(id, usuario, `Ajuste solicitado: ${observacao}`);
  };

  const programarPagamento = async (
  id: string,
  dataProgramada: string,
  usuario: string
) => {
  try {
    const processoAtual = processos.find(p => p.id === id);
    if (!processoAtual) return;

    const novoHistorico: HistoricoStatus = {
      data: new Date().toISOString().replace('T', ' ').substring(0, 16),
      usuario: usuarioLogado,
      deStatus: processoAtual.status,
      paraStatus: processoAtual.status,
      observacao: `Pagamento programado para ${dataProgramada}.`,
    };

    const atualizado: ProcessoCompra = {
      ...processoAtual,
      dataProgramadaPagamento: dataProgramada,
      statusProgramacao: 'programado',
      programadoPor: usuario,
      dataProgramacao: new Date().toISOString(),
      historico: [...(processoAtual.historico || []), novoHistorico],
    };

    await financeService.editarProcesso(id, atualizado);

    if ((processoAtual as any).dbId) {
      await financeService.criarHistoricoProcesso({
        dbId: (processoAtual as any).dbId,
        usuario: usuarioLogado,
        deStatus: processoAtual.status,
        paraStatus: processoAtual.status,
        observacao: novoHistorico.observacao,
      });
    }

    setProcessos(prev => prev.map(p => (p.id === id ? atualizado : p)));
  } catch (error: any) {
    console.error('Erro ao programar pagamento:', error);
    alert(error.message || 'Erro ao programar pagamento.');
  }
};

  const registrarPagamento = async (
    id: string,
    metodo: 'pix' | 'ted' | 'boleto' | 'dinheiro' | 'cartao',
    valorPagamento: number,
    comprovante?: string,
    observacao?: string
  ) => {
    try {
      const processoAtual = processos.find(
        processo => processo.id === id
      );

      if (!processoAtual) {
        throw new Error('Processo não encontrado.');
      }

      const valorTotal = Number(
        processoAtual.valor || 0
      );

      const valorJaPago = Number(
        (processoAtual as any).valorPago || 0
      );

      const saldoAtual = Math.max(
        valorTotal - valorJaPago,
        0
      );

      const valorDestePagamento = Number(
        valorPagamento
      );

      if (
        !Number.isFinite(valorDestePagamento) ||
        valorDestePagamento <= 0
      ) {
        throw new Error(
          'Informe um valor de pagamento válido.'
        );
      }

      if (saldoAtual <= 0) {
        throw new Error(
          'Esta conta já está totalmente quitada.'
        );
      }

      if (
        valorDestePagamento >
        saldoAtual + 0.001
      ) {
        throw new Error(
          `O valor informado é maior que o saldo restante de ${saldoAtual.toLocaleString(
            'pt-BR',
            {
              style: 'currency',
              currency: 'BRL',
            }
          )}.`
        );
      }

      const novoValorPago =
        valorJaPago + valorDestePagamento;

      const novoSaldo = Math.max(
        valorTotal - novoValorPago,
        0
      );

      const quitado = novoSaldo <= 0.001;
      const dataHoje = new Date()
        .toISOString()
        .split('T')[0];

      const textoValor =
        valorDestePagamento.toLocaleString(
          'pt-BR',
          {
            style: 'currency',
            currency: 'BRL',
          }
        );

      const textoSaldo =
        novoSaldo.toLocaleString('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        });

      const novoHistorico: HistoricoStatus = {
        data: new Date()
          .toISOString()
          .replace('T', ' ')
          .substring(0, 16),
        usuario: usuarioLogado,
        deStatus: processoAtual.status,
        paraStatus: quitado
          ? 'conciliacao'
          : 'pagamento',
        observacao: quitado
          ? `Pagamento final de ${textoValor} registrado via ${metodo.toUpperCase()}. Conta quitada e enviada para conciliação.${
              observacao
                ? ` Observação: ${observacao}`
                : ''
            }`
          : `Pagamento parcial de ${textoValor} registrado via ${metodo.toUpperCase()}. Saldo restante: ${textoSaldo}.${
              observacao
                ? ` Observação: ${observacao}`
                : ''
            }`,
      };

      const atualizado: ProcessoCompra = {
        ...processoAtual,
        status: quitado
          ? 'conciliacao'
          : 'pagamento',
        metodoPagamento: metodo,
        valorPago: novoValorPago,
        saldoPagar: novoSaldo,
        pagamentoParcial:
          novoValorPago > 0 && !quitado,
        dataPagamento: quitado
          ? dataHoje
          : processoAtual.dataPagamento,
        comprovanteNome:
          comprovante ||
          processoAtual.comprovanteNome ||
          null,
        historico: [
          ...(processoAtual.historico || []),
          novoHistorico,
        ],
      } as any;

      const salvo =
        await financeService.editarProcesso(
          id,
          atualizado
        );

      const processoDbId =
        (processoAtual as any).dbId ||
        (salvo as any).dbId;

      if (processoDbId) {
        await financeService.criarPagamentoProcesso({
          processoId: processoDbId,
          valorPago: valorDestePagamento,
          metodoPagamento: metodo,
          dataPagamento: dataHoje,
          comprovante: comprovante || null,
          observacao: observacao || null,
        });

        await financeService.criarHistoricoProcesso({
          dbId: processoDbId,
          usuario: usuarioLogado,
          deStatus: processoAtual.status,
          paraStatus: quitado
            ? 'conciliacao'
            : 'pagamento',
          observacao:
            novoHistorico.observacao,
        });
      }

      setProcessos(prev =>
        prev.map(processo =>
          processo.id === id
            ? {
                ...processo,
                ...atualizado,
                ...salvo,
              }
            : processo
        )
      );

      if (quitado) {
        const fornecedor = fornecedores.find(
          fornecedorItem =>
            fornecedorItem.id ===
            processoAtual.fornecedorId
        );

        if (fornecedor) {
          const atualizadoFornecedor = {
            ...fornecedor,
            historicoCompras:
              Number(
                fornecedor.historicoCompras || 0
              ) + valorTotal,
            ultimaCompra: dataHoje,
          };

          setFornecedores(prev =>
            prev.map(item =>
              item.id === fornecedor.id
                ? atualizadoFornecedor
                : item
            )
          );
        }
      }

      const alerta =
        await financeService.criarAlerta({
          organizacaoId: organizacaoAtivaIdState,
          tipo: quitado
            ? 'sucesso'
            : 'info',
          titulo: quitado
            ? 'Conta Quitada'
            : 'Pagamento Parcial Registrado',
          mensagem: quitado
            ? `${id} foi totalmente pago e enviado para conciliação.`
            : `${id} recebeu pagamento parcial de ${textoValor}. Saldo restante: ${textoSaldo}.`,
          lido: false,
          processoId: processoDbId || null,
        });

      setAlertas(prev => [
        alerta,
        ...prev,
      ]);
    } catch (error: any) {
      console.error(
        'Erro ao registrar pagamento:',
        error
      );

      alert(
        error?.message ||
          'Erro ao registrar pagamento.'
      );

      throw error;
    }
  };

  const conciliarPagamento = async (id: string) => {
    await avancarProcesso(
      id,
      'finalizado',
      'Conciliador de Extrato Bancário',
      'Extrato financeiro conciliado eletronicamente com sucesso.'
    );
  };

  const cadastrarEmpresa = async (dados: Omit<Empresa, 'id' | 'saldoAtual' | 'organizacaoId'>) => {
    try {
      const nova = await financeService.criarEmpresa({ ...dados, organizacaoId: organizacaoAtivaIdState });
      setEmpresas(prev => [...prev, nova]);

      if (!empresaAtivaId) {
        setEmpresaAtivaId(nova.id);
      }
    } catch (error: any) {
      console.error('Erro ao cadastrar empresa:', error);
      alert(error.message || 'Erro ao cadastrar empresa.');
    }
  };

  const editarEmpresa = async (id: string, dados: Omit<Empresa, 'id' | 'saldoAtual' | 'organizacaoId'>) => {
    try {
      const atualizada = await financeService.editarEmpresa(id, { ...dados, organizacaoId: organizacaoAtivaIdState });
      setEmpresas(prev => prev.map(emp => (emp.id === id ? atualizada : emp)));
    } catch (error: any) {
      console.error('Erro ao editar empresa:', error);
      alert(error.message || 'Erro ao editar empresa.');
    }
  };

  const excluirEmpresa = async (id: string) => {
    if (processos.some(p => p.empresaId === id)) {
      alert('Não é possível excluir esta empresa porque ela possui processos vinculados.');
      return false;
    }

    try {
      await financeService.excluirEmpresa(id, organizacaoAtivaIdState);

      const novasEmpresas = empresas.filter(emp => emp.id !== id);
      setEmpresas(novasEmpresas);

      if (empresaAtivaId === id) {
        setEmpresaAtivaId(novasEmpresas[0]?.id || '');
      }

      return true;
    } catch (error: any) {
      console.error('Erro ao excluir empresa:', error);
      alert(error.message || 'Erro ao excluir empresa.');
      return false;
    }
  };

  const cadastrarFornecedor = async (
    dados: Omit<Fornecedor, 'id' | 'historicoCompras' | 'ultimaCompra' | 'tempoMedioPagamento' | 'organizacaoId'>
  ) => {
    try {
      const novo = await financeService.criarFornecedor({ ...dados, organizacaoId: organizacaoAtivaIdState });
      setFornecedores(prev => [...prev, novo]);
    } catch (error: any) {
      console.error('Erro ao cadastrar fornecedor:', error);
      alert(error.message || 'Erro ao cadastrar fornecedor.');
    }
  };

  const editarFornecedor = async (
    id: string,
    dados: Omit<Fornecedor, 'id' | 'historicoCompras' | 'ultimaCompra' | 'tempoMedioPagamento' | 'organizacaoId'>
  ) => {
    try {
      const atualizado = await financeService.editarFornecedor(id, { ...dados, organizacaoId: organizacaoAtivaIdState });
      setFornecedores(prev => prev.map(f => (f.id === id ? atualizado : f)));
    } catch (error: any) {
      console.error('Erro ao editar fornecedor:', error);
      alert(error.message || 'Erro ao editar fornecedor.');
    }
  };

  const excluirFornecedor = async (id: string) => {
    if (processos.some(p => p.fornecedorId === id)) {
      alert('Não é possível excluir este fornecedor porque ele possui processos vinculados.');
      return false;
    }

    try {
      await financeService.excluirFornecedor(id, organizacaoAtivaIdState);
      setFornecedores(prev => prev.filter(f => f.id !== id));
      return true;
    } catch (error: any) {
      console.error('Erro ao excluir fornecedor:', error);
      alert(error.message || 'Erro ao excluir fornecedor.');
      return false;
    }
  };

  const cadastrarPlanoFinanceiro = async (
    dados: Omit<PlanoFinanceiro, 'id' | 'utilizado' | 'comprometido' | 'organizacaoId'>
  ) => {
    try {
      const novo = await financeService.criarPlanoFinanceiro({ ...dados, organizacaoId: organizacaoAtivaIdState });
      setPlanosFinanceiros(prev => [...prev, novo]);
    } catch (error: any) {
      console.error('Erro ao cadastrar plano:', error);
      alert(error.message || 'Erro ao cadastrar plano.');
    }
  };

  const editarPlanoFinanceiro = async (
    id: string,
    dados: Omit<PlanoFinanceiro, 'id' | 'utilizado' | 'comprometido' | 'organizacaoId'>
  ) => {
    try {
      const atualizado = await financeService.editarPlanoFinanceiro(id, { ...dados, organizacaoId: organizacaoAtivaIdState });
      setPlanosFinanceiros(prev => prev.map(p => (p.id === id ? atualizado : p)));
    } catch (error: any) {
      console.error('Erro ao editar plano:', error);
      alert(error.message || 'Erro ao editar plano.');
    }
  };

  const excluirPlanoFinanceiro = async (id: string) => {
    if (processos.some(p => p.planoFinanceiroId === id)) {
      alert('Não é possível excluir este plano porque ele possui processos vinculados.');
      return false;
    }

    if (centrosCustos.some(c => c.planoFinanceiroId === id)) {
      alert('Não é possível excluir este plano porque ele possui centros de custo vinculados.');
      return false;
    }

    try {
      await financeService.excluirPlanoFinanceiro(id, organizacaoAtivaIdState);
      setPlanosFinanceiros(prev => prev.filter(p => p.id !== id));
      return true;
    } catch (error: any) {
      console.error('Erro ao excluir plano:', error);
      alert(error.message || 'Erro ao excluir plano.');
      return false;
    }
  };

  const cadastrarCentroCusto = async (dados: Omit<CentroCusto, 'id' | 'utilizado'>) => {
    try {
      const novo = await financeService.criarCentroCusto(dados);
      setCentrosCustos(prev => [...prev, novo]);
    } catch (error: any) {
      console.error('Erro ao cadastrar centro de custo:', error);
      alert(error.message || 'Erro ao cadastrar centro de custo.');
    }
  };

  const editarCentroCusto = async (
    id: string,
    dados: Omit<CentroCusto, 'id' | 'utilizado'>
  ) => {
    try {
      const atualizado = await financeService.editarCentroCusto(id, dados);
      setCentrosCustos(prev => prev.map(c => (c.id === id ? atualizado : c)));
    } catch (error: any) {
      console.error('Erro ao editar centro de custo:', error);
      alert(error.message || 'Erro ao editar centro de custo.');
    }
  };

  const excluirCentroCusto = async (id: string) => {
    if (processos.some(p => p.centroCustoId === id)) {
      alert('Não é possível excluir este centro de custo porque ele possui processos vinculados.');
      return false;
    }

    try {
      await financeService.excluirCentroCusto(id);
      setCentrosCustos(prev => prev.filter(c => c.id !== id));
      return true;
    } catch (error: any) {
      console.error('Erro ao excluir centro de custo:', error);
      alert(error.message || 'Erro ao excluir centro de custo.');
      return false;
    }
  };

  const marcarAlertaLido = async (id: string) => {
    try {
      const alertaAtualizado = await financeService.marcarAlertaLido(id, organizacaoAtivaIdState);
      setAlertas(prev => prev.map(a => (a.id === id ? alertaAtualizado : a)));
    } catch {
      setAlertas(prev => prev.map(a => (a.id === id ? { ...a, lido: true } : a)));
    }
  };

  const obterSugeridoProximoPasso = (processo: ProcessoCompra) => {
    switch (processo.status) {
      case 'solicitacao':
        return {
          texto: 'A solicitação foi aberta. Agora envie para cotação de preços.',
          acaoLabel: 'Enviar para Cotação',
          viewTarget: 'processos',
        };

      case 'cotacao':
        return {
          texto: 'Cotações coletadas. Avance para conferência de compras.',
          acaoLabel: 'Enviar para Conferência',
          viewTarget: 'processos',
        };

      case 'conferencia':
        return {
          texto:
            'Conferência concluída. Encaminhe para aprovação da Diretoria.',
          acaoLabel: 'Enviar para Diretoria',
          viewTarget: 'autorizacoes',
        };

      case 'autorizacao_diretoria':
        return {
          texto:
            'A solicitação de Compras está aguardando aprovação da Diretoria.',
          acaoLabel: 'Aprovar Diretoria',
          viewTarget: 'autorizacoes',
        };

      case 'autorizacao_contas' as StatusProcesso:
        return {
          texto:
            'A solicitação foi aprovada pela Diretoria e aguarda conferência do Contas a Pagar.',
          acaoLabel: 'Aprovar Contas',
          viewTarget: 'autorizacoes',
        };

      case 'pagamento':
        return {
          texto:
            'Conta aprovada pelo Contas a Pagar e liberada para programação e pagamento.',
          acaoLabel: 'Abrir Contas a Pagar',
          viewTarget: 'contas-pagar',
        };

      case 'conciliacao':
        return {
          texto: 'Pagamento efetuado. Realize a conciliação.',
          acaoLabel: 'Conciliar Lançamento',
          viewTarget: 'conciliacao',
        };

      case 'finalizado':
        return {
          texto: 'Processo concluído e arquivado.',
          acaoLabel: 'Ver Arquivo',
          viewTarget: 'processos',
        };

      default:
        return {
          texto: 'Processo em andamento.',
          acaoLabel: 'Ver Processo',
          viewTarget: 'processos',
        };

    }
  };

  return (
    <FinanceContext.Provider
      value={{
        organizacoesUsuario,
        organizacoes,
        organizacaoAtivaId: organizacaoAtivaIdState,
        setOrganizacaoAtivaId,
        perfilOrganizacaoAtiva,

        empresas,
        fornecedores,
        planosFinanceiros,
        centrosCustos,
        processos,
        alertas,

        loadingFinanceiro,
        erroFinanceiro,
        recarregarDados,

        empresaAtivaId,
        setEmpresaAtivaId,

        activeView,
        setActiveView,

        activeProcessId,
        setActiveProcessId,

        programarPagamento,

        uploadAnexoProcesso,
        getDocumentosProcesso,
        anexarDocumentoProcesso,

        criarSolicitacao,
        editarProcesso,
        excluirProcesso,

        avancarProcesso,
        reprovarProcesso,
        solicitarAjustes,
        registrarPagamento,
        conciliarPagamento,

        cadastrarEmpresa,
        editarEmpresa,
        excluirEmpresa,

        cadastrarFornecedor,
        editarFornecedor,
        excluirFornecedor,

        cadastrarPlanoFinanceiro,
        editarPlanoFinanceiro,
        excluirPlanoFinanceiro,

        cadastrarCentroCusto,
        editarCentroCusto,
        excluirCentroCusto,

        marcarAlertaLido,
        obterSugeridoProximoPasso,
      }}
    >
      {children}
    </FinanceContext.Provider>
  );
};