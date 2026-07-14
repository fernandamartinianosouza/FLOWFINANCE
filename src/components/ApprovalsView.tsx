import React, { useEffect, useMemo, useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { ProcessoCompra, StatusProcesso } from '../types';
import { formatarReal } from '../utils';
import {
  Crown,
  WalletCards,
  FileText,
  Check,
  AlertTriangle,
} from 'lucide-react';

type EtapaAprovacao =
  | 'autorizacao_diretoria'
  | 'autorizacao_contas';

export const ApprovalsView: React.FC = () => {
  const {
    processos,
    empresas,
    fornecedores,
    planosFinanceiros,
    centrosCustos,
    avancarProcesso,
    reprovarProcesso,
    solicitarAjustes,
  } = useFinance();

  const aprovacoesPendentes = useMemo(
    () =>
      processos.filter(processo =>
        [
          'autorizacao_diretoria',
          'autorizacao_contas',
        ].includes(String(processo.status))
      ),
    [processos]
  );

  const [selectedId, setSelectedId] = useState<
    string | null
  >(
    aprovacoesPendentes.length > 0
      ? aprovacoesPendentes[0].id
      : null
  );

  const [comentarioAcao, setComentarioAcao] =
    useState('');
  const [processando, setProcessando] = useState(false);

  useEffect(() => {
    if (aprovacoesPendentes.length === 0) {
      setSelectedId(null);
      return;
    }

    const selecionadoAindaExiste =
      selectedId &&
      aprovacoesPendentes.some(
        processo => processo.id === selectedId
      );

    if (!selecionadoAindaExiste) {
      setSelectedId(aprovacoesPendentes[0].id);
    }
  }, [aprovacoesPendentes, selectedId]);

  const processo =
    aprovacoesPendentes.find(
      item => item.id === selectedId
    ) || null;

  const etapa = String(
    processo?.status || ''
  ) as EtapaAprovacao;

  const isDiretoria =
    etapa === 'autorizacao_diretoria';

  const obterFavorecido = (
    item: ProcessoCompra
  ) => {
    if (
      (item as any).tipoPagamento === 'interno'
    ) {
      return (
        (item as any).beneficiarioInterno ||
        'Pagamento interno'
      );
    }

    return (
      fornecedores.find(
        fornecedor =>
          fornecedor.id === item.fornecedorId
      )?.nome || 'Fornecedor não encontrado'
    );
  };

  const aprovar = async (
    item: ProcessoCompra
  ) => {
    if (processando) return;

    try {
      setProcessando(true);

      if (
        String(item.status) ===
        'autorizacao_diretoria'
      ) {
        await avancarProcesso(
          item.id,
          'autorizacao_contas' as StatusProcesso,
          'Diretoria',
          comentarioAcao.trim() ||
            'Aprovado pela Diretoria e encaminhado para conferência do Contas a Pagar.'
        );
      } else {
        await avancarProcesso(
          item.id,
          'pagamento' as StatusProcesso,
          'Contas a Pagar',
          comentarioAcao.trim() ||
            'Conta conferida e aprovada pelo Contas a Pagar. Liberada para programação e pagamento.'
        );
      }

      setComentarioAcao('');
    } finally {
      setProcessando(false);
    }
  };

  const reprovar = async (
    item: ProcessoCompra
  ) => {
    if (processando) return;

    try {
      setProcessando(true);

      await reprovarProcesso(
        item.id,
        isDiretoria
          ? 'Diretoria'
          : 'Contas a Pagar',
        comentarioAcao.trim() ||
          'Solicitação reprovada. Revisar dados, valores e justificativas.'
      );

      setComentarioAcao('');
    } finally {
      setProcessando(false);
    }
  };

  const pedirAjustes = async (
    item: ProcessoCompra
  ) => {
    if (processando) return;

    try {
      setProcessando(true);

      await solicitarAjustes(
        item.id,
        isDiretoria
          ? 'Diretoria'
          : 'Contas a Pagar',
        comentarioAcao.trim() ||
          'Foram solicitados ajustes antes de uma nova análise.'
      );

      setComentarioAcao('');
    } finally {
      setProcessando(false);
    }
  };

  return (
    <div
      className="space-y-5 lg:space-y-8"
      id="approvals-view-container"
    >
      <div>
        <h1 className="text-xl font-bold tracking-tight text-[#0F172A] sm:text-2xl">
          Central de Autorizações
        </h1>

        <p className="mt-1 text-xs text-slate-400">
          Diretoria e Contas a Pagar realizam todas as
          aprovações nesta página.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-2">
        <ResumoEtapa
          titulo="Aguardando Diretoria"
          quantidade={
            aprovacoesPendentes.filter(
              item =>
                String(item.status) ===
                'autorizacao_diretoria'
            ).length
          }
          icon={Crown}
          classe="bg-purple-50 text-purple-700"
        />

        <ResumoEtapa
          titulo="Aguardando Contas a Pagar"
          quantidade={
            aprovacoesPendentes.filter(
              item =>
                String(item.status) ===
                'autorizacao_contas'
            ).length
          }
          icon={WalletCards}
          classe="bg-blue-50 text-blue-700"
        />
      </div>

      {aprovacoesPendentes.length === 0 ? (
        <div className="rounded-[18px] border border-slate-100 bg-white p-8 text-center shadow-sm sm:p-16">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <Check className="h-5 w-5" />
          </div>

          <h3 className="text-sm font-bold text-[#0F172A]">
            Nenhuma autorização pendente
          </h3>

          <p className="mx-auto mt-1 max-w-sm text-xs text-slate-400">
            Todas as solicitações foram analisadas.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <div className="space-y-3 pr-0 lg:col-span-5 lg:max-h-[680px] lg:overflow-y-auto lg:pr-1">
            {aprovacoesPendentes.map(item => {
              const selecionado =
                item.id === selectedId;

              const empresa = empresas.find(
                registro =>
                  registro.id === item.empresaId
              );

              const statusDiretoria =
                String(item.status) ===
                'autorizacao_diretoria';

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() =>
                    setSelectedId(item.id)
                  }
                  className={`w-full rounded-[18px] border p-4 text-left transition-all ${
                    selecionado
                      ? 'border-[#0F172A] bg-[#0F172A] text-white shadow-md'
                      : 'border-slate-100 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="font-mono text-[10px] font-bold">
                      {item.id}
                    </span>

                    <span
                      className={`rounded-full px-2 py-1 text-[9px] font-bold uppercase ${
                        statusDiretoria
                          ? selecionado
                            ? 'bg-purple-200 text-purple-900'
                            : 'bg-purple-100 text-purple-700'
                          : selecionado
                            ? 'bg-blue-200 text-blue-900'
                            : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {statusDiretoria
                        ? 'Diretoria'
                        : 'Contas a Pagar'}
                    </span>
                  </div>

                  <h4
                    className={`truncate text-xs font-bold ${
                      selecionado
                        ? 'text-white'
                        : 'text-slate-800'
                    }`}
                  >
                    {item.descricao}
                  </h4>

                  <p
                    className={`mt-1 truncate text-[10px] ${
                      selecionado
                        ? 'text-slate-300'
                        : 'text-slate-400'
                    }`}
                  >
                    {obterFavorecido(item)} •{' '}
                    {empresa?.nome || '-'}
                  </p>

                  <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3">
                    <span className="font-mono text-[10px]">
                      Prazo: {item.prazo || '-'}
                    </span>

                    <span className="font-mono text-xs font-bold">
                      {formatarReal(item.valor)}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="lg:col-span-7">
            {processo && (
              <div className="space-y-5 rounded-[18px] border border-slate-100 bg-white p-4 shadow-sm sm:p-6 lg:p-8">
                <div
                  className={`flex items-center gap-4 rounded-[14px] border p-5 ${
                    isDiretoria
                      ? 'border-purple-100 bg-purple-50 text-purple-900'
                      : 'border-blue-100 bg-blue-50 text-blue-900'
                  }`}
                >
                  {isDiretoria ? (
                    <Crown className="h-8 w-8 shrink-0 text-purple-600" />
                  ) : (
                    <WalletCards className="h-8 w-8 shrink-0 text-blue-600" />
                  )}

                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wide">
                      {isDiretoria
                        ? 'Aguardando aprovação da Diretoria'
                        : 'Aguardando aprovação do Contas a Pagar'}
                    </h3>

                    <p className="mt-1 text-[11px] text-slate-500">
                      {isDiretoria
                        ? 'Após a aprovação, a solicitação seguirá para conferência do Contas a Pagar.'
                        : 'Após a aprovação, a conta será liberada para programação e pagamento.'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 text-xs md:grid-cols-2">
                  <Info
                    label="Empresa"
                    value={
                      empresas.find(
                        item =>
                          item.id === processo.empresaId
                      )?.nome || '-'
                    }
                  />

                  <Info
                    label={
                      (processo as any)
                        .tipoPagamento === 'interno'
                        ? 'Beneficiário interno'
                        : 'Fornecedor'
                    }
                    value={obterFavorecido(processo)}
                  />

                  <Info
                    label="Plano de conta"
                    value={
                      planosFinanceiros.find(
                        item =>
                          item.id ===
                          processo.planoFinanceiroId
                      )?.nome || '-'
                    }
                  />

                  <Info
                    label="Centro de custo"
                    value={
                      centrosCustos.find(
                        item =>
                          item.id ===
                          processo.centroCustoId
                      )?.nome || '-'
                    }
                  />

                  <Info
                    label="Urgência"
                    value={processo.urgencia || '-'}
                  />

                  <Info
                    label="Valor"
                    value={formatarReal(
                      processo.valor
                    )}
                    destaque
                  />

                  <Info
                    label="Prazo"
                    value={processo.prazo || '-'}
                  />

                  <Info
                    label="Responsável"
                    value={
                      processo.responsavel || '-'
                    }
                  />
                </div>

                <div className="rounded-[14px] border border-slate-100 bg-slate-50 p-4">
                  <p className="text-[10px] font-bold uppercase text-slate-400">
                    Finalidade
                  </p>

                  <p className="mt-2 text-xs leading-relaxed text-slate-700">
                    {processo.descricao}
                  </p>
                </div>

                {(processo as any).pixChave && (
                  <div className="rounded-[14px] border border-emerald-100 bg-emerald-50 p-4">
                    <p className="text-[10px] font-bold uppercase text-emerald-600">
                      Dados PIX
                    </p>

                    <p className="mt-2 break-all font-mono text-xs font-semibold text-slate-700">
                      {(processo as any).pixChave}
                    </p>

                    {(processo as any).pixFavorecido && (
                      <p className="mt-1 text-[10px] text-slate-500">
                        Favorecido:{' '}
                        {
                          (processo as any)
                            .pixFavorecido
                        }
                      </p>
                    )}
                  </div>
                )}

                {processo.anexoNome && (
                  <div className="flex items-center justify-between rounded-[14px] border border-slate-100 bg-slate-50 p-4">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-slate-400" />

                      <span className="text-xs font-semibold text-slate-700">
                        {processo.anexoNome}
                      </span>
                    </div>

                    {processo.anexoUrl && (
                      <a
                        href={processo.anexoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] font-bold text-[#0F172A]"
                      >
                        Abrir
                      </a>
                    )}
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold uppercase text-slate-400">
                    Comentário da decisão
                  </label>

                  <textarea
                    rows={3}
                    value={comentarioAcao}
                    onChange={event =>
                      setComentarioAcao(
                        event.target.value
                      )
                    }
                    placeholder="Registre observações, condições ou justificativas..."
                    className="w-full rounded-[12px] border-0 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-700 focus:ring-1 focus:ring-[#0F172A]/25"
                  />
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <button
                    type="button"
                    onClick={() =>
                      reprovar(processo)
                    }
                    disabled={processando}
                    className="rounded-[12px] border border-red-200 bg-red-50 py-3 text-xs font-bold text-red-600 hover:bg-red-100 disabled:opacity-50"
                  >
                    Reprovar
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      pedirAjustes(processo)
                    }
                    disabled={processando}
                    className="rounded-[12px] border border-slate-200 bg-slate-50 py-3 text-xs font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-50"
                  >
                    Solicitar ajustes
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      aprovar(processo)
                    }
                    disabled={processando}
                    className="flex items-center justify-center gap-2 rounded-[12px] bg-[#0F172A] py-3 text-xs font-bold text-white shadow-md hover:bg-[#1E293B] disabled:opacity-50"
                  >
                    {processando
                      ? 'Processando...'
                      : isDiretoria
                        ? 'Aprovar Diretoria'
                        : 'Aprovar para Pagamento'}
                  </button>
                </div>

                {!isDiretoria && (
                  <div className="flex items-start gap-2 rounded-[12px] border border-amber-100 bg-amber-50 p-3">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />

                    <p className="text-[10px] text-amber-700">
                      Ao aprovar, a conta será exibida na
                      página Contas a Pagar para
                      programação e pagamento.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const ResumoEtapa = ({
  titulo,
  quantidade,
  icon: Icon,
  classe,
}: any) => (
  <div className="rounded-[18px] border border-slate-100 bg-white p-5 shadow-sm">
    <div
      className={`flex h-10 w-10 items-center justify-center rounded-xl ${classe}`}
    >
      <Icon className="h-5 w-5" />
    </div>

    <p className="mt-4 text-[10px] font-bold uppercase text-slate-400">
      {titulo}
    </p>

    <p className="mt-1 font-mono text-xl font-bold text-[#0F172A]">
      {quantidade}
    </p>
  </div>
);

const Info = ({
  label,
  value,
  destaque,
}: {
  label: string;
  value: string;
  destaque?: boolean;
}) => (
  <div>
    <span className="block text-slate-400">
      {label}:
    </span>

    <span
      className={`font-semibold ${
        destaque
          ? 'font-mono text-sm text-[#0F172A]'
          : 'text-slate-800'
      }`}
    >
      {value}
    </span>
  </div>
);

export default ApprovalsView;
