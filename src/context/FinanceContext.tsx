import React, { createContext, useContext, useEffect, useState } from 'react';
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
} from '../types';
import { STATUS_LABELS } from '../utils';
import { financeService } from '../services/financeService';
import { useAuth } from './AuthContext';

interface FinanceContextType {
  empresas: Empresa[];
  fornecedores: Fornecedor[];
  planosFinanceiros: PlanoFinanceiro[];
  centrosCustos: CentroCusto[];
  processos: ProcessoCompra[];
  alertas: AlertaSistema[];
  loadingFinanceiro: boolean;
  erroFinanceiro: string | null;

  empresaAtivaId: string;
  setEmpresaAtivaId: (id: string) => void;

  activeView: string;
  setActiveView: (view: string) => void;

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

  criarSolicitacao: (dados: {
    fornecedorId: string;
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
    comprovante?: string
  ) => Promise<void>;

  conciliarPagamento: (id: string) => Promise<void>;

  cadastrarEmpresa: (empresa: Omit<Empresa, 'id' | 'saldoAtual'>) => Promise<void>;
  editarEmpresa: (id: string, empresa: Omit<Empresa, 'id' | 'saldoAtual'>) => Promise<void>;
  excluirEmpresa: (id: string) => Promise<boolean>;

  cadastrarFornecedor: (
    fornecedor: Omit<Fornecedor, 'id' | 'historicoCompras' | 'tempoMedioPagamento'>
  ) => Promise<void>;

  editarFornecedor: (
    id: string,
    fornecedor: Omit<Fornecedor, 'id' | 'historicoCompras' | 'tempoMedioPagamento'>
  ) => Promise<void>;

  excluirFornecedor: (id: string) => Promise<boolean>;

  cadastrarPlanoFinanceiro: (
    plano: Omit<PlanoFinanceiro, 'id' | 'utilizado' | 'comprometido'>
  ) => Promise<void>;

  editarPlanoFinanceiro: (
    id: string,
    plano: Omit<PlanoFinanceiro, 'id' | 'utilizado' | 'comprometido'>
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

  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [planosFinanceiros, setPlanosFinanceiros] = useState<PlanoFinanceiro[]>([]);
  const [centrosCustos, setCentrosCustos] = useState<CentroCusto[]>([]);
  const [processos, setProcessos] = useState<ProcessoCompra[]>([]);
  const [alertas, setAlertas] = useState<AlertaSistema[]>([]);

  const [empresaAtivaId, setEmpresaAtivaId] = useState<string>('');
  const [activeView, setActiveView] = useState<string>('dashboard');
  const [activeProcessId, setActiveProcessId] = useState<string | null>(null);

  const [loadingFinanceiro, setLoadingFinanceiro] = useState(false);
  const [erroFinanceiro, setErroFinanceiro] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setEmpresas([]);
      setFornecedores([]);
      setPlanosFinanceiros([]);
      setCentrosCustos([]);
      setProcessos([]);
      setAlertas([]);
      setEmpresaAtivaId('');
      setLoadingFinanceiro(false);
      return;
    }

    const carregarDados = async () => {
      try {
        setLoadingFinanceiro(true);
        setErroFinanceiro(null);

        const dados = await financeService.carregarDados();

        setEmpresas(dados.empresas);
        setFornecedores(dados.fornecedores);
        setPlanosFinanceiros(dados.planosFinanceiros);
        setCentrosCustos(dados.centrosCustos);
        setProcessos(dados.processos);
        setAlertas(dados.alertas);

        if (dados.empresas.length > 0) {
          setEmpresaAtivaId(dados.empresas[0].id);
        }
      } catch (error: any) {
        console.error('Erro ao carregar dados financeiros:', error);
        setErroFinanceiro(error.message || 'Erro ao carregar dados financeiros.');
      } finally {
        setLoadingFinanceiro(false);
      }
    };

    carregarDados();
  }, [user]);

  const uploadAnexoProcesso = async (file: File) => {
    return financeService.uploadAnexoProcesso(file);
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
  return financeService.anexarDocumentoProcesso(params);
};

  const criarSolicitacao = async (dados: {
    fornecedorId: string;
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
  }) => {
    try {
      const novoCodigo = `FF-${new Date().getFullYear()}-${String(
        processos.length + 101
      ).padStart(3, '0')}`;

      const agora = new Date().toISOString().replace('T', ' ').substring(0, 16);

      const novoProcesso: ProcessoCompra = {
        id: novoCodigo,
        fornecedorId: dados.fornecedorId,
        empresaId: dados.empresaId,
        planoFinanceiroId: dados.planoFinanceiroId,
        centroCustoId: dados.centroCustoId,
        descricao: dados.descricao,
        valor: Number(dados.valor) || 0,
        urgencia: dados.urgencia,
        responsavel: dados.responsavel,
        dataCriacao: new Date().toISOString().split('T')[0],
        status: 'autorizacao_cp',
        prazo: dados.prazo,

        anexoNome: dados.anexoNome || null,
        anexoUrl: dados.anexoUrl || null,

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
            paraStatus: 'autorizacao_cp',
            observacao:
              'Solicitação encaminhada automaticamente para aprovação do Controle de Pagamentos.',
          },
        ],
      } as any;

      const criado = await financeService.criarProcesso(novoProcesso);

      setProcessos(prev => [criado, ...prev]);

      const novoAlerta = await financeService.criarAlerta({
        tipo: dados.urgencia === 'alta' ? 'urgente' : 'info',
        titulo: 'Nova Solicitação Aguardando Aprovação',
        mensagem: `${novoCodigo} enviado para aprovação no valor de R$ ${dados.valor.toLocaleString(
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
      await financeService.excluirProcesso(id);

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
    comprovante?: string
  ) => {
    try {
      const processoAtual = processos.find(p => p.id === id);
      if (!processoAtual) return;

      const novoHistorico: HistoricoStatus = {
        data: new Date().toISOString().replace('T', ' ').substring(0, 16),
        usuario: usuarioLogado,
        deStatus: processoAtual.status,
        paraStatus: 'conciliacao',
        observacao: `Pagamento registrado via ${metodo.toUpperCase()}. Comprovante anexado.`,
      };

      const atualizado: ProcessoCompra = {
        ...processoAtual,
        status: 'conciliacao',
        metodoPagamento: metodo,
        dataPagamento: new Date().toISOString().split('T')[0],
        comprovanteNome: comprovante || `comprovante_${metodo}_${id.toLowerCase()}.pdf`,
        historico: [...(processoAtual.historico || []), novoHistorico],
      };

      await financeService.editarProcesso(id, atualizado);

      if ((processoAtual as any).dbId) {
        await financeService.criarHistoricoProcesso({
          dbId: (processoAtual as any).dbId,
          usuario: usuarioLogado,
          deStatus: processoAtual.status,
          paraStatus: 'conciliacao',
          observacao: novoHistorico.observacao,
        });
      }

      setProcessos(prev => prev.map(p => (p.id === id ? atualizado : p)));

      const fornecedor = fornecedores.find(f => f.id === processoAtual.fornecedorId);

      if (fornecedor) {
        const atualizadoFornecedor = {
          ...fornecedor,
          historicoCompras:
            Number(fornecedor.historicoCompras || 0) + Number(processoAtual.valor || 0),
          ultimaCompra: new Date().toISOString().split('T')[0],
        };

        setFornecedores(prev =>
          prev.map(f => (f.id === fornecedor.id ? atualizadoFornecedor : f))
        );
      }

      const alerta = await financeService.criarAlerta({
        tipo: 'sucesso',
        titulo: 'Pagamento Efetuado',
        mensagem: `${id} pago via ${metodo.toUpperCase()}. Pronto para Conciliação.`,
        lido: false,
        processoId: (processoAtual as any).dbId || null,
      });

      setAlertas(prev => [alerta, ...prev]);
    } catch (error: any) {
      console.error('Erro ao registrar pagamento:', error);
      alert(error.message || 'Erro ao registrar pagamento.');
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

  const cadastrarEmpresa = async (dados: Omit<Empresa, 'id' | 'saldoAtual'>) => {
    try {
      const nova = await financeService.criarEmpresa(dados);
      setEmpresas(prev => [...prev, nova]);

      if (!empresaAtivaId) {
        setEmpresaAtivaId(nova.id);
      }
    } catch (error: any) {
      console.error('Erro ao cadastrar empresa:', error);
      alert(error.message || 'Erro ao cadastrar empresa.');
    }
  };

  const editarEmpresa = async (id: string, dados: Omit<Empresa, 'id' | 'saldoAtual'>) => {
    try {
      const atualizada = await financeService.editarEmpresa(id, dados);
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
      await financeService.excluirEmpresa(id);

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
    dados: Omit<Fornecedor, 'id' | 'historicoCompras' | 'tempoMedioPagamento'>
  ) => {
    try {
      const novo = await financeService.criarFornecedor(dados);
      setFornecedores(prev => [...prev, novo]);
    } catch (error: any) {
      console.error('Erro ao cadastrar fornecedor:', error);
      alert(error.message || 'Erro ao cadastrar fornecedor.');
    }
  };

  const editarFornecedor = async (
    id: string,
    dados: Omit<Fornecedor, 'id' | 'historicoCompras' | 'tempoMedioPagamento'>
  ) => {
    try {
      const atualizado = await financeService.editarFornecedor(id, dados);
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
      await financeService.excluirFornecedor(id);
      setFornecedores(prev => prev.filter(f => f.id !== id));
      return true;
    } catch (error: any) {
      console.error('Erro ao excluir fornecedor:', error);
      alert(error.message || 'Erro ao excluir fornecedor.');
      return false;
    }
  };

  const cadastrarPlanoFinanceiro = async (
    dados: Omit<PlanoFinanceiro, 'id' | 'utilizado' | 'comprometido'>
  ) => {
    try {
      const novo = await financeService.criarPlanoFinanceiro(dados);
      setPlanosFinanceiros(prev => [...prev, novo]);
    } catch (error: any) {
      console.error('Erro ao cadastrar plano:', error);
      alert(error.message || 'Erro ao cadastrar plano.');
    }
  };

  const editarPlanoFinanceiro = async (
    id: string,
    dados: Omit<PlanoFinanceiro, 'id' | 'utilizado' | 'comprometido'>
  ) => {
    try {
      const atualizado = await financeService.editarPlanoFinanceiro(id, dados);
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
      await financeService.excluirPlanoFinanceiro(id);
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
      const alertaAtualizado = await financeService.marcarAlertaLido(id);
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
          texto: 'Conferência concluída. Encaminhe para aprovação do CP.',
          acaoLabel: 'Solicitar Aprovação CP',
          viewTarget: 'processos',
        };

      case 'autorizacao_cp':
        return {
          texto: 'Aguardando aprovação do Controle de Pagamentos.',
          acaoLabel: 'Aprovar CP',
          viewTarget: 'autorizacoes',
        };

      case 'autorizacao_diretoria':
        return {
          texto: 'Aguardando aprovação da Diretoria Financeira.',
          acaoLabel: 'Aprovar Diretoria',
          viewTarget: 'autorizacoes',
        };

      case 'pagamento':
        return {
          texto: 'Processo autorizado. Registre o pagamento.',
          acaoLabel: 'Registrar Pagamento',
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

        getDocumentosProcesso: (processoDbId: string) => Promise<any[]>;

anexarDocumentoProcesso: (params: {
  processoDbId: string;
  file: File;
  tipo?: string;
  enviadoPor?: string;
}) => Promise<any>;

    }
  };

  return (
    <FinanceContext.Provider
      value={{
        empresas,
        fornecedores,
        planosFinanceiros,
        centrosCustos,
        processos,
        alertas,

        loadingFinanceiro,
        erroFinanceiro,

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