import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Building2,
  CalendarDays,
  CheckCircle2,
  FileText,
  Landmark,
  Loader2,
  Paperclip,
  ReceiptText,
  Save,
  Upload,
  UserRound,
  WalletCards,
  X,
} from 'lucide-react';

import { useFinance } from "../context/FinanceContext";
import { financeService } from "../services/financeService";
import { orcamentoService } from '../services/orcamentoService';
import {
  MetodoPagamento,
  NovaContaInput,
  TipoConta,
  TipoPagamento,
} from './types';

const hojeISO = () => new Date().toISOString().split('T')[0];

const formatarMoedaInput = (valor: string) => {
  const apenasNumeros = valor.replace(/\D/g, '');

  if (!apenasNumeros) {
    return '';
  }

  return (Number(apenasNumeros) / 100).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const moedaParaNumero = (valor: string) => {
  if (!valor.trim()) {
    return 0;
  }

  const normalizado = valor
    .replace(/\./g, '')
    .replace(',', '.')
    .replace(/[^\d.-]/g, '');

  const numero = Number(normalizado);

  return Number.isFinite(numero) ? numero : 0;
};

const normalizarPix = (valor: string) =>
  valor.trim().toLowerCase();

const TIPOS_CONTA: Array<{
  value: TipoConta;
  label: string;
}> = [
  { value: 'boleto', label: 'Boleto' },
  { value: 'pix', label: 'PIX' },
  { value: 'transferencia', label: 'Transferência' },
  { value: 'tributo', label: 'Tributo' },
  { value: 'salario', label: 'Salário' },
  { value: 'aluguel', label: 'Aluguel' },
  { value: 'contrato', label: 'Contrato' },
  { value: 'servico', label: 'Serviço' },
  { value: 'outra', label: 'Outra' },
];

const FORMAS_PAGAMENTO: Array<{
  value: MetodoPagamento;
  label: string;
}> = [
  { value: 'boleto', label: 'Boleto' },
  { value: 'pix', label: 'PIX' },
  { value: 'ted', label: 'TED / Transferência' },
  { value: 'deposito', label: 'Depósito' },
  { value: 'dinheiro', label: 'Dinheiro' },
  { value: 'cartao', label: 'Cartão' },
];

const TIPOS_CHAVE_PIX = [
  { value: 'cpf', label: 'CPF' },
  { value: 'cnpj', label: 'CNPJ' },
  { value: 'email', label: 'E-mail' },
  { value: 'telefone', label: 'Telefone' },
  { value: 'aleatoria', label: 'Chave aleatória' },
];

type ErrosFormulario = Partial<
  Record<
    | 'empresaId'
    | 'fornecedorId'
    | 'beneficiarioInterno'
    | 'descricao'
    | 'valor'
    | 'dataVencimento'
    | 'codigoBarras'
    | 'pixChave',
    string
  >
>;

export const NewAccountView: React.FC = () => {
  const {
    empresas,
    fornecedores,
    planosFinanceiros,
    centrosCustos,
    processos,
    empresaAtivaId,
    organizacaoAtivaId,
    recarregarDados,
    setActiveView,
  } = useFinance() as any;

  const inputArquivoRef = useRef<HTMLInputElement | null>(null);

  const [empresaId, setEmpresaId] = useState(
    empresaAtivaId || empresas[0]?.id || ''
  );
  const [tipoPagamento, setTipoPagamento] =
    useState<TipoPagamento>('fornecedor');
  const [fornecedorId, setFornecedorId] = useState('');
  const [beneficiarioInterno, setBeneficiarioInterno] = useState('');
  const [planoFinanceiroId, setPlanoFinanceiroId] = useState('');
  const [centroCustoId, setCentroCustoId] = useState('');
  const [tipoConta, setTipoConta] = useState<TipoConta>('boleto');
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [dataEmissao, setDataEmissao] = useState(hojeISO());
  const [dataVencimento, setDataVencimento] = useState('');
  const [numeroDocumento, setNumeroDocumento] = useState('');
  const [formaPagamento, setFormaPagamento] =
    useState<MetodoPagamento>('boleto');
  const [codigoBarras, setCodigoBarras] = useState('');
  const [pixTipoChave, setPixTipoChave] = useState('cpf');
  const [pixChave, setPixChave] = useState('');
  const [pixFavorecido, setPixFavorecido] = useState('');
  const [pixBanco, setPixBanco] = useState('');
  const [pixObservacao, setPixObservacao] = useState('');
  const [recorrente, setRecorrente] = useState(false);
  const [arquivo, setArquivo] = useState<File | null>(null);

  const [salvando, setSalvando] = useState(false);
  const [erroGeral, setErroGeral] = useState('');
  const [sucesso, setSucesso] = useState('');
  const [erros, setErros] = useState<ErrosFormulario>({});
  const [orcamentosCompetencia, setOrcamentosCompetencia] = useState<any[]>([]);
  const [carregandoTeto, setCarregandoTeto] = useState(false);
  const [confirmacaoTetoOpen, setConfirmacaoTetoOpen] = useState(false);
  const [justificativaTeto, setJustificativaTeto] = useState('');
  const autorizarExcessoRef = useRef(false);

  const planosDaEmpresa = useMemo(
    () =>
      planosFinanceiros.filter(
        (plano: any) =>
          !plano.empresaId || plano.empresaId === empresaId
      ),
    [planosFinanceiros, empresaId]
  );

  const centrosDoPlano = useMemo(
    () =>
      centrosCustos.filter((centro: any) => {
        if (
          planoFinanceiroId &&
          centro.planoFinanceiroId !== planoFinanceiroId
        ) {
          return false;
        }

        return !centro.empresaId || centro.empresaId === empresaId;
      }),
    [centrosCustos, planoFinanceiroId, empresaId]
  );

  const competenciaSelecionada = useMemo(
    () => String(dataVencimento || '').slice(0, 7),
    [dataVencimento]
  );

  useEffect(() => {
    let ativo = true;

    const carregar = async () => {
      if (
        !organizacaoAtivaId ||
        !empresaId ||
        !competenciaSelecionada
      ) {
        setOrcamentosCompetencia([]);
        return;
      }

      const [anoTexto, mesTexto] = competenciaSelecionada.split('-');
      const ano = Number(anoTexto);
      const mes = Number(mesTexto);

      if (!ano || !mes) return;

      try {
        setCarregandoTeto(true);
        const lista = await orcamentoService.listarPorCompetencia({
          organizacaoId: organizacaoAtivaId,
          empresaId,
          ano,
          mes,
        });
        if (ativo) setOrcamentosCompetencia(lista || []);
      } catch (error) {
        console.error('Erro ao consultar tetos da competência:', error);
        if (ativo) setOrcamentosCompetencia([]);
      } finally {
        if (ativo) setCarregandoTeto(false);
      }
    };

    carregar();
    return () => {
      ativo = false;
    };
  }, [organizacaoAtivaId, empresaId, competenciaSelecionada]);

  const movimentoPorPlano = useMemo(() => {
    const mapa = new Map<string, number>();

    (processos || []).forEach((processo: any) => {
      if (processo?.excluido) return;

      const empresaProcesso = String(
        processo?.empresaId ?? processo?.empresa_id ?? ''
      );
      if (empresaProcesso !== String(empresaId)) return;

      const data =
        processo?.prazo ??
        processo?.vencimento ??
        processo?.dataVencimento ??
        processo?.data_vencimento ??
        processo?.dataProgramadaPagamento ??
        processo?.data_programada_pagamento ??
        processo?.dataPagamento ??
        processo?.data_pagamento ??
        processo?.dataCriacao ??
        processo?.created_at ??
        '';

      if (String(data).slice(0, 7) !== competenciaSelecionada) return;

      const planoId = String(
        processo?.planoFinanceiroId ??
          processo?.planoId ??
          processo?.plano_financeiro_id ??
          ''
      );
      if (!planoId) return;

      const valorProcesso = Math.max(
        Number(
          processo?.valor ??
            processo?.valorTotal ??
            processo?.valor_total ??
            0
        ) || 0,
        0
      );

      mapa.set(planoId, (mapa.get(planoId) || 0) + valorProcesso);
    });

    return mapa;
  }, [processos, empresaId, competenciaSelecionada]);

  const obterTetoPlano = (planoId: string) => {
    const geral = orcamentosCompetencia.find(
      (item: any) =>
        String(item.planoFinanceiroId) === String(planoId) &&
        !item.centroCustoId
    );

    if (geral) return Number(geral.valorOrcado || 0);

    return orcamentosCompetencia
      .filter((item: any) => {
        if (String(item.planoFinanceiroId) !== String(planoId)) return false;
        return Boolean(item.centroCustoId);
      })
      .reduce(
        (total: number, item: any) => total + Number(item.valorOrcado || 0),
        0
      );
  };

  const situacoesPlanos = useMemo(() => {
    const valorConta = moedaParaNumero(valor);

    return planosDaEmpresa
      .map((plano: any) => {
        const id = String(plano.id ?? plano.dbId ?? '');
        const orcado = obterTetoPlano(id);
        const comprometido = movimentoPorPlano.get(id) || 0;
        const disponivel = orcado - comprometido;
        const aposLancamento = disponivel - valorConta;
        const percentualApos =
          orcado > 0 ? ((comprometido + valorConta) / orcado) * 100 : 0;

        return {
          id,
          nome: plano.nome || 'Plano sem nome',
          orcado,
          comprometido,
          disponivel,
          aposLancamento,
          percentualApos,
        };
      })
      .sort((a: any, b: any) => b.disponivel - a.disponivel);
  }, [planosDaEmpresa, orcamentosCompetencia, movimentoPorPlano, valor]);

  const situacaoPlanoSelecionado = useMemo(
    () =>
      situacoesPlanos.find(
        (item: any) => item.id === String(planoFinanceiroId)
      ) || null,
    [situacoesPlanos, planoFinanceiroId]
  );

  const planosAlternativos = useMemo(
    () =>
      situacoesPlanos.filter(
        (item: any) =>
          item.id !== String(planoFinanceiroId) &&
          item.orcado > 0 &&
          item.aposLancamento >= 0
      ),
    [situacoesPlanos, planoFinanceiroId]
  );

  const formatarMoeda = (numero: number) =>
    Number(numero || 0).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });

  const trocarPlanoSugerido = (planoId: string) => {
    setPlanoFinanceiroId(planoId);
    setCentroCustoId('');
    setConfirmacaoTetoOpen(false);
    setJustificativaTeto('');
  };

  const limparFormulario = () => {
    setEmpresaId(empresaAtivaId || empresas[0]?.id || '');
    setTipoPagamento('fornecedor');
    setFornecedorId('');
    setBeneficiarioInterno('');
    setPlanoFinanceiroId('');
    setCentroCustoId('');
    setTipoConta('boleto');
    setDescricao('');
    setValor('');
    setDataEmissao(hojeISO());
    setDataVencimento('');
    setNumeroDocumento('');
    setFormaPagamento('boleto');
    setCodigoBarras('');
    setPixTipoChave('cpf');
    setPixChave('');
    setPixFavorecido('');
    setPixBanco('');
    setPixObservacao('');
    setRecorrente(false);
    setArquivo(null);
    setErros({});
    setErroGeral('');

    if (inputArquivoRef.current) {
      inputArquivoRef.current.value = '';
    }
  };

  const validar = () => {
    const novosErros: ErrosFormulario = {};
    const valorNumerico = moedaParaNumero(valor);

    if (!empresaId) {
      novosErros.empresaId = 'Selecione uma empresa.';
    }

    if (tipoPagamento === 'fornecedor' && !fornecedorId) {
      novosErros.fornecedorId = 'Selecione o fornecedor.';
    }

    if (
      tipoPagamento === 'interno' &&
      !beneficiarioInterno.trim()
    ) {
      novosErros.beneficiarioInterno =
        'Informe o beneficiário interno.';
    }

    if (!descricao.trim()) {
      novosErros.descricao = 'Informe a descrição da conta.';
    }

    if (valorNumerico <= 0) {
      novosErros.valor = 'Informe um valor maior que zero.';
    }

    if (!dataVencimento) {
      novosErros.dataVencimento =
        'Informe a data de vencimento.';
    }

    if (
      formaPagamento === 'boleto' &&
      !codigoBarras.trim()
    ) {
      novosErros.codigoBarras =
        'Informe o código de barras do boleto.';
    }

    if (formaPagamento === 'pix' && !pixChave.trim()) {
      novosErros.pixChave = 'Informe a chave PIX.';
    }

    setErros(novosErros);

    return Object.keys(novosErros).length === 0;
  };

  const handleEmpresaChange = (
    event: React.ChangeEvent<HTMLSelectElement>
  ) => {
    setEmpresaId(event.target.value);
    setPlanoFinanceiroId('');
    setCentroCustoId('');
    setErros((atual) => ({ ...atual, empresaId: undefined }));
  };

  const handlePlanoChange = (
    event: React.ChangeEvent<HTMLSelectElement>
  ) => {
    setPlanoFinanceiroId(event.target.value);
    setCentroCustoId('');
  };

  const handleArquivo = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const selecionado = event.target.files?.[0] || null;

    if (!selecionado) {
      setArquivo(null);
      return;
    }

    const limite = 10 * 1024 * 1024;

    if (selecionado.size > limite) {
      setErroGeral('O anexo deve possuir no máximo 10 MB.');
      event.target.value = '';
      return;
    }

    setErroGeral('');
    setArquivo(selecionado);
  };

  const salvarConta = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    setErroGeral('');
    setSucesso('');

    if (!validar()) {
      setErroGeral(
        'Revise os campos destacados antes de salvar.'
      );
      return;
    }

    if (
      !autorizarExcessoRef.current &&
      situacaoPlanoSelecionado &&
      situacaoPlanoSelecionado.orcado > 0 &&
      situacaoPlanoSelecionado.aposLancamento < 0
    ) {
      setConfirmacaoTetoOpen(true);
      return;
    }

    try {
      setSalvando(true);

      let anexoNome: string | null = null;
      let anexoUrl: string | null = null;

      if (arquivo) {
        const upload = await financeService.uploadAnexoProcesso(
          arquivo,
          organizacaoAtivaId || undefined
        );

        anexoNome = upload.nome;
        anexoUrl = upload.url;
      }

      const dados: NovaContaInput & {
        organizacaoId?: string;
      } = {
        organizacaoId: organizacaoAtivaId || undefined,
        empresaId,
        fornecedorId:
          tipoPagamento === 'fornecedor'
            ? fornecedorId
            : null,
        planoFinanceiroId: planoFinanceiroId || null,
        centroCustoId: centroCustoId || null,
        tipoConta,
        tipoPagamento,
        beneficiarioInterno:
          tipoPagamento === 'interno'
            ? beneficiarioInterno.trim()
            : null,
        descricao: descricao.trim(),
        valor: moedaParaNumero(valor),
        dataEmissao: dataEmissao || null,
        dataVencimento,
        numeroDocumento: numeroDocumento.trim() || null,
        codigoBarras:
          formaPagamento === 'boleto'
            ? codigoBarras.trim()
            : null,
        formaPagamento,
        pixTipoChave:
          formaPagamento === 'pix' ? pixTipoChave : null,
        pixChave:
          formaPagamento === 'pix'
            ? normalizarPix(pixChave)
            : null,
        pixFavorecido:
          formaPagamento === 'pix'
            ? pixFavorecido.trim() || null
            : null,
        pixBanco:
          formaPagamento === 'pix'
            ? pixBanco.trim() || null
            : null,
        pixObservacao:
          formaPagamento === 'pix'
            ? pixObservacao.trim() || null
            : null,
        recorrente,
        anexoNome,
        anexoUrl,
        observacao: autorizarExcessoRef.current
          ? `LANÇAMENTO ACIMA DO TETO. Justificativa: ${justificativaTeto.trim()}`
          : null,
      };

      await financeService.criarNovaConta(dados);
      await recarregarDados?.();

      setSucesso(
        'Conta cadastrada com sucesso e enviada diretamente para Contas a Pagar.'
      );

      limparFormulario();
      autorizarExcessoRef.current = false;
      setJustificativaTeto('');
      setConfirmacaoTetoOpen(false);

      window.setTimeout(() => {
        setActiveView?.('contas-pagar');
      }, 900);
    } catch (error: any) {
      console.error('Erro ao cadastrar conta:', error);
      setErroGeral(
        error?.message ||
          'Não foi possível cadastrar a conta.'
      );
    } finally {
      setSalvando(false);
    }
  };

  const inputClass = (comErro?: string) =>
    [
      'w-full rounded-xl border bg-white px-3.5 py-3 text-sm text-slate-800',
      'outline-none transition focus:ring-4',
      comErro
        ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
        : 'border-slate-200 focus:border-blue-500 focus:ring-blue-100',
    ].join(' ');

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-blue-50 p-3 text-blue-700">
              <ReceiptText size={26} />
            </div>

            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                Nova Conta
              </h1>

              <p className="mt-1 max-w-3xl text-sm text-slate-500">
                Cadastre boletos, PIX, tributos, salários e outras
                obrigações diretamente no Contas a Pagar, sem passar
                pelo fluxo de Compras e Aprovações.
              </p>
            </div>
          </div>

          <div className="inline-flex items-center gap-2 self-start rounded-full bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
            <CheckCircle2 size={15} />
            Entrada direta no financeiro
          </div>
        </div>
      </div>

      {erroGeral && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="mt-0.5 shrink-0" size={19} />
          <span>{erroGeral}</span>
        </div>
      )}

      {sucesso && (
        <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          <CheckCircle2 className="mt-0.5 shrink-0" size={19} />
          <span>{sucesso}</span>
        </div>
      )}

      <form onSubmit={salvarConta} className="space-y-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex items-center gap-2">
            <Building2 size={20} className="text-blue-600" />
            <h2 className="font-semibold text-slate-900">
              Identificação do lançamento
            </h2>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700">
                Empresa *
              </span>

              <select
                value={empresaId}
                onChange={handleEmpresaChange}
                className={inputClass(erros.empresaId)}
              >
                <option value="">Selecione</option>
                {empresas.map((empresa: any) => (
                  <option key={empresa.id} value={empresa.id}>
                    {empresa.nome}
                  </option>
                ))}
              </select>

              {erros.empresaId && (
                <span className="text-xs text-red-600">
                  {erros.empresaId}
                </span>
              )}
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700">
                Tipo de conta *
              </span>

              <select
                value={tipoConta}
                onChange={(event) =>
                  setTipoConta(event.target.value as TipoConta)
                }
                className={inputClass()}
              >
                {TIPOS_CONTA.map((tipo) => (
                  <option key={tipo.value} value={tipo.value}>
                    {tipo.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700">
                Número do documento
              </span>

              <input
                value={numeroDocumento}
                onChange={(event) =>
                  setNumeroDocumento(event.target.value)
                }
                placeholder="NF, boleto, contrato..."
                className={inputClass()}
              />
            </label>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex items-center gap-2">
            <UserRound size={20} className="text-blue-600" />
            <h2 className="font-semibold text-slate-900">
              Favorecido
            </h2>
          </div>

          <div className="mb-5 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => {
                setTipoPagamento('fornecedor');
                setBeneficiarioInterno('');
              }}
              className={[
                'rounded-xl border p-4 text-left transition',
                tipoPagamento === 'fornecedor'
                  ? 'border-blue-500 bg-blue-50 ring-4 ring-blue-100'
                  : 'border-slate-200 bg-white hover:bg-slate-50',
              ].join(' ')}
            >
              <span className="block font-semibold text-slate-900">
                Fornecedor
              </span>
              <span className="mt-1 block text-xs text-slate-500">
                Conta vinculada a um fornecedor cadastrado.
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setTipoPagamento('interno');
                setFornecedorId('');
              }}
              className={[
                'rounded-xl border p-4 text-left transition',
                tipoPagamento === 'interno'
                  ? 'border-blue-500 bg-blue-50 ring-4 ring-blue-100'
                  : 'border-slate-200 bg-white hover:bg-slate-50',
              ].join(' ')}
            >
              <span className="block font-semibold text-slate-900">
                Pagamento interno
              </span>
              <span className="mt-1 block text-xs text-slate-500">
                Salário, reembolso, adiantamento ou outro beneficiário.
              </span>
            </button>
          </div>

          {tipoPagamento === 'fornecedor' ? (
            <label className="block max-w-2xl space-y-2">
              <span className="text-sm font-medium text-slate-700">
                Fornecedor *
              </span>

              <select
                value={fornecedorId}
                onChange={(event) => {
                  setFornecedorId(event.target.value);
                  setErros((atual) => ({
                    ...atual,
                    fornecedorId: undefined,
                  }));
                }}
                className={inputClass(erros.fornecedorId)}
              >
                <option value="">Selecione o fornecedor</option>
                {fornecedores.map((fornecedor: any) => (
                  <option key={fornecedor.id} value={fornecedor.id}>
                    {fornecedor.nome}
                  </option>
                ))}
              </select>

              {erros.fornecedorId && (
                <span className="text-xs text-red-600">
                  {erros.fornecedorId}
                </span>
              )}
            </label>
          ) : (
            <label className="block max-w-2xl space-y-2">
              <span className="text-sm font-medium text-slate-700">
                Beneficiário interno *
              </span>

              <input
                value={beneficiarioInterno}
                onChange={(event) => {
                  setBeneficiarioInterno(event.target.value);
                  setErros((atual) => ({
                    ...atual,
                    beneficiarioInterno: undefined,
                  }));
                }}
                placeholder="Nome da pessoa ou setor"
                className={inputClass(erros.beneficiarioInterno)}
              />

              {erros.beneficiarioInterno && (
                <span className="text-xs text-red-600">
                  {erros.beneficiarioInterno}
                </span>
              )}
            </label>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex items-center gap-2">
            <WalletCards size={20} className="text-blue-600" />
            <h2 className="font-semibold text-slate-900">
              Classificação financeira
            </h2>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700">
                Plano financeiro
              </span>

              <select
                value={planoFinanceiroId}
                onChange={handlePlanoChange}
                className={inputClass()}
              >
                <option value="">Sem plano financeiro</option>
                {planosDaEmpresa.map((plano: any) => (
                  <option key={plano.id} value={plano.id}>
                    {plano.nome}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700">
                Centro de custo
              </span>

              <select
                value={centroCustoId}
                onChange={(event) =>
                  setCentroCustoId(event.target.value)
                }
                disabled={!planoFinanceiroId}
                className={`${inputClass()} disabled:cursor-not-allowed disabled:bg-slate-100`}
              >
                <option value="">
                  {planoFinanceiroId
                    ? 'Sem centro de custo'
                    : 'Selecione primeiro o plano'}
                </option>

                {centrosDoPlano.map((centro: any) => (
                  <option key={centro.id} value={centro.id}>
                    {centro.nome}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {planoFinanceiroId && dataVencimento && moedaParaNumero(valor) > 0 && (
            <div className="mt-5">
              {carregandoTeto ? (
                <div className="flex items-center gap-2 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
                  <Loader2 size={16} className="animate-spin" />
                  Verificando teto do plano...
                </div>
              ) : situacaoPlanoSelecionado?.orcado > 0 ? (
                <div
                  className={`rounded-xl border p-4 ${
                    situacaoPlanoSelecionado.aposLancamento < 0
                      ? 'border-red-200 bg-red-50'
                      : situacaoPlanoSelecionado.percentualApos >= 80
                        ? 'border-amber-200 bg-amber-50'
                        : 'border-emerald-200 bg-emerald-50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <AlertCircle
                      size={20}
                      className={
                        situacaoPlanoSelecionado.aposLancamento < 0
                          ? 'text-red-600'
                          : situacaoPlanoSelecionado.percentualApos >= 80
                            ? 'text-amber-600'
                            : 'text-emerald-600'
                      }
                    />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-slate-900">
                        {situacaoPlanoSelecionado.aposLancamento < 0
                          ? 'Teto será excedido com este lançamento'
                          : situacaoPlanoSelecionado.percentualApos >= 80
                            ? 'Atenção: plano próximo do teto'
                            : 'Plano com teto disponível'}
                      </p>
                      <div className="mt-3 grid gap-2 text-xs text-slate-600 sm:grid-cols-4">
                        <div><span className="block text-slate-400">Teto</span><strong>{formatarMoeda(situacaoPlanoSelecionado.orcado)}</strong></div>
                        <div><span className="block text-slate-400">Comprometido</span><strong>{formatarMoeda(situacaoPlanoSelecionado.comprometido)}</strong></div>
                        <div><span className="block text-slate-400">Disponível agora</span><strong>{formatarMoeda(situacaoPlanoSelecionado.disponivel)}</strong></div>
                        <div><span className="block text-slate-400">Após esta conta</span><strong>{formatarMoeda(situacaoPlanoSelecionado.aposLancamento)}</strong></div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-500">
                  Este plano não possui teto/orçamento mensal configurado para {competenciaSelecionada}.
                </div>
              )}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex items-center gap-2">
            <FileText size={20} className="text-blue-600" />
            <h2 className="font-semibold text-slate-900">
              Dados da conta
            </h2>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            <label className="space-y-2 md:col-span-2 xl:col-span-3">
              <span className="text-sm font-medium text-slate-700">
                Descrição *
              </span>

              <input
                value={descricao}
                onChange={(event) => {
                  setDescricao(event.target.value);
                  setErros((atual) => ({
                    ...atual,
                    descricao: undefined,
                  }));
                }}
                placeholder="Ex.: Internet da filial, aluguel, folha..."
                className={inputClass(erros.descricao)}
              />

              {erros.descricao && (
                <span className="text-xs text-red-600">
                  {erros.descricao}
                </span>
              )}
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700">
                Valor *
              </span>

              <div className="relative">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-slate-500">
                  R$
                </span>

                <input
                  value={valor}
                  onChange={(event) => {
                    setValor(formatarMoedaInput(event.target.value));
                    setErros((atual) => ({
                      ...atual,
                      valor: undefined,
                    }));
                  }}
                  inputMode="numeric"
                  placeholder="0,00"
                  className={`${inputClass(erros.valor)} pl-11`}
                />
              </div>

              {erros.valor && (
                <span className="text-xs text-red-600">
                  {erros.valor}
                </span>
              )}
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700">
                Data de emissão
              </span>

              <input
                type="date"
                value={dataEmissao}
                onChange={(event) =>
                  setDataEmissao(event.target.value)
                }
                className={inputClass()}
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700">
                Data de vencimento *
              </span>

              <input
                type="date"
                value={dataVencimento}
                onChange={(event) => {
                  setDataVencimento(event.target.value);
                  setErros((atual) => ({
                    ...atual,
                    dataVencimento: undefined,
                  }));
                }}
                className={inputClass(erros.dataVencimento)}
              />

              {erros.dataVencimento && (
                <span className="text-xs text-red-600">
                  {erros.dataVencimento}
                </span>
              )}
            </label>

            <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 md:col-span-2">
              <input
                type="checkbox"
                checked={recorrente}
                onChange={(event) => setRecorrente(event.target.checked)}
                className="h-4 w-4 rounded border-slate-300"
              />

              <span>
                <span className="block text-sm font-medium text-slate-800">
                  Conta recorrente
                </span>
                <span className="block text-xs text-slate-500">
                  Identifica despesas que se repetem periodicamente.
                </span>
              </span>
            </label>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex items-center gap-2">
            <Landmark size={20} className="text-blue-600" />
            <h2 className="font-semibold text-slate-900">
              Dados para pagamento
            </h2>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700">
                Forma de pagamento *
              </span>

              <select
                value={formaPagamento}
                onChange={(event) => {
                  const forma = event.target.value as MetodoPagamento;
                  setFormaPagamento(forma);
                  setErros((atual) => ({
                    ...atual,
                    codigoBarras: undefined,
                    pixChave: undefined,
                  }));
                }}
                className={inputClass()}
              >
                {FORMAS_PAGAMENTO.map((forma) => (
                  <option key={forma.value} value={forma.value}>
                    {forma.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {formaPagamento === 'boleto' && (
            <div className="mt-5">
              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700">
                  Código de barras *
                </span>

                <textarea
                  value={codigoBarras}
                  onChange={(event) => {
                    setCodigoBarras(event.target.value);
                    setErros((atual) => ({
                      ...atual,
                      codigoBarras: undefined,
                    }));
                  }}
                  rows={3}
                  placeholder="Cole a linha digitável ou o código de barras"
                  className={inputClass(erros.codigoBarras)}
                />

                {erros.codigoBarras && (
                  <span className="text-xs text-red-600">
                    {erros.codigoBarras}
                  </span>
                )}
              </label>
            </div>
          )}

          {formaPagamento === 'pix' && (
            <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700">
                  Tipo da chave
                </span>

                <select
                  value={pixTipoChave}
                  onChange={(event) =>
                    setPixTipoChave(event.target.value)
                  }
                  className={inputClass()}
                >
                  {TIPOS_CHAVE_PIX.map((tipo) => (
                    <option key={tipo.value} value={tipo.value}>
                      {tipo.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2 md:col-span-1 xl:col-span-3">
                <span className="text-sm font-medium text-slate-700">
                  Chave PIX *
                </span>

                <input
                  value={pixChave}
                  onChange={(event) => {
                    setPixChave(event.target.value.toLowerCase());
                    setErros((atual) => ({
                      ...atual,
                      pixChave: undefined,
                    }));
                  }}
                  autoCapitalize="none"
                  placeholder="Digite a chave PIX"
                  className={inputClass(erros.pixChave)}
                />

                {erros.pixChave && (
                  <span className="text-xs text-red-600">
                    {erros.pixChave}
                  </span>
                )}
              </label>

              <label className="space-y-2 md:col-span-2">
                <span className="text-sm font-medium text-slate-700">
                  Favorecido do PIX
                </span>

                <input
                  value={pixFavorecido}
                  onChange={(event) =>
                    setPixFavorecido(event.target.value)
                  }
                  placeholder="Nome do favorecido"
                  className={inputClass()}
                />
              </label>

              <label className="space-y-2 md:col-span-2">
                <span className="text-sm font-medium text-slate-700">
                  Banco
                </span>

                <input
                  value={pixBanco}
                  onChange={(event) => setPixBanco(event.target.value)}
                  placeholder="Banco do favorecido"
                  className={inputClass()}
                />
              </label>

              <label className="space-y-2 md:col-span-2 xl:col-span-4">
                <span className="text-sm font-medium text-slate-700">
                  Observação do PIX
                </span>

                <textarea
                  value={pixObservacao}
                  onChange={(event) =>
                    setPixObservacao(event.target.value)
                  }
                  rows={3}
                  placeholder="Informações adicionais para o pagamento"
                  className={inputClass()}
                />
              </label>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex items-center gap-2">
            <Paperclip size={20} className="text-blue-600" />
            <h2 className="font-semibold text-slate-900">
              Anexo
            </h2>
          </div>

          <input
            ref={inputArquivoRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.webp"
            onChange={handleArquivo}
            className="hidden"
          />

          {!arquivo ? (
            <button
              type="button"
              onClick={() => inputArquivoRef.current?.click()}
              className="flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-8 text-center transition hover:border-blue-400 hover:bg-blue-50"
            >
              <Upload size={26} className="text-blue-600" />
              <span className="text-sm font-semibold text-slate-800">
                Selecionar boleto, nota ou documento
              </span>
              <span className="text-xs text-slate-500">
                PDF ou imagem, com no máximo 10 MB
              </span>
            </button>
          ) : (
            <div className="flex flex-col gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <div className="rounded-xl bg-white p-2 text-blue-600">
                  <FileText size={21} />
                </div>

                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-800">
                    {arquivo.name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {(arquivo.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setArquivo(null);
                  if (inputArquivoRef.current) {
                    inputArquivoRef.current.value = '';
                  }
                }}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
              >
                <X size={16} />
                Remover
              </button>
            </div>
          )}
        </section>

        <div className="flex flex-col-reverse gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-end">
          <button
            type="button"
            onClick={() => setActiveView?.('contas-pagar')}
            disabled={salvando}
            className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            Cancelar
          </button>

          <button
            type="submit"
            disabled={salvando}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {salvando ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Salvando conta...
              </>
            ) : (
              <>
                <Save size={18} />
                Salvar conta
              </>
            )}
          </button>
        </div>
      </form>
      {confirmacaoTetoOpen && situacaoPlanoSelecionado && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-red-600">Atenção ao orçamento</p>
                <h3 className="mt-1 text-xl font-bold text-slate-900">Teto do plano será excedido</h3>
              </div>
              <button type="button" onClick={() => setConfirmacaoTetoOpen(false)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X size={20} /></button>
            </div>

            <div className="mt-5 grid gap-3 rounded-xl bg-red-50 p-4 text-sm sm:grid-cols-2">
              <div>Disponível atualmente<br/><strong>{formatarMoeda(situacaoPlanoSelecionado.disponivel)}</strong></div>
              <div>Valor da nova conta<br/><strong>{formatarMoeda(moedaParaNumero(valor))}</strong></div>
              <div>Disponível após lançamento<br/><strong className="text-red-700">{formatarMoeda(situacaoPlanoSelecionado.aposLancamento)}</strong></div>
              <div>Excedente<br/><strong className="text-red-700">{formatarMoeda(Math.abs(situacaoPlanoSelecionado.aposLancamento))}</strong></div>
            </div>

            {planosAlternativos.length > 0 && (
              <div className="mt-5">
                <h4 className="text-sm font-semibold text-slate-900">Planos com teto disponível</h4>
                <div className="mt-2 space-y-2">
                  {planosAlternativos.slice(0, 5).map((plano: any) => (
                    <div key={plano.id} className="flex flex-col gap-3 rounded-xl border border-slate-200 p-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{plano.nome}</p>
                        <p className="text-xs text-slate-500">Disponível: {formatarMoeda(plano.disponivel)} • Após a conta: {formatarMoeda(plano.aposLancamento)}</p>
                      </div>
                      <button type="button" onClick={() => trocarPlanoSugerido(plano.id)} className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white">Usar este plano</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-5">
              <label className="text-sm font-medium text-slate-700">Justificativa para exceder o teto *</label>
              <textarea value={justificativaTeto} onChange={(e) => setJustificativaTeto(e.target.value)} rows={3} className="mt-2 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-slate-400" placeholder="Explique por que esta conta precisa ser lançada neste plano..." />
            </div>

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setConfirmacaoTetoOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600">Voltar e trocar plano</button>
              <button
                type="button"
                disabled={!justificativaTeto.trim()}
                onClick={() => {
                  if (!justificativaTeto.trim()) return;
                  autorizarExcessoRef.current = true;
                  setConfirmacaoTetoOpen(false);
                  window.setTimeout(() => {
                    document.querySelector<HTMLFormElement>('form')?.requestSubmit();
                  }, 0);
                }}
                className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                Continuar mesmo assim
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NewAccountView;