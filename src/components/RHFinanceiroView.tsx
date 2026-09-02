import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Search,
  Trash2,
  Upload,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { usePermissions } from '../context/PermissionsContext';
import {
  calcularDataPagamento,
  RHLancamento,
  RHPreview,
  RHTipo,
  rhFinanceiroService,
} from '../services/rhFinanceiroService';

const tipos: { id: RHTipo; label: string }[] = [
  { id: 'salario', label: 'Salários' },
  { id: 'adiantamento', label: 'Adiantamentos' },
  { id: 'passagem', label: 'Passagens' },
  { id: 'vale_alimentacao', label: 'Vale alimentação' },
  { id: 'rescisao', label: 'Rescisões' },
];

const formatarReal = (valor: number) =>
  valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const formatarData = (iso: string) =>
  iso
    ? new Date(`${iso.slice(0, 10)}T12:00:00`).toLocaleDateString('pt-BR')
    : '—';

const competenciaAtual = () => new Date().toISOString().slice(0, 7);

export const RHFinanceiroView: React.FC = () => {
  const { organizacaoAtivaId, empresaAtivaId, empresas } = useFinance() as any;
  const { temPermissao } = usePermissions();
  const empresa = empresas.find((item: any) => item.id === empresaAtivaId);
  const inputRef = useRef<HTMLInputElement>(null);

  const [competencia, setCompetencia] = useState(competenciaAtual());
  const [tipo, setTipo] = useState<RHTipo>('salario');
  const [dataRescisao, setDataRescisao] = useState('');
  const [lancamentos, setLancamentos] = useState<RHLancamento[]>([]);
  const [preview, setPreview] = useState<RHPreview[]>([]);
  const [arquivoNome, setArquivoNome] = useState('');
  const [modalImportacao, setModalImportacao] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [importando, setImportando] = useState(false);
  const [busca, setBusca] = useState('');
  const [status, setStatus] = useState('todos');

  const carregar = async () => {
    if (!organizacaoAtivaId || !empresaAtivaId) return;
    setCarregando(true);
    try {
      setLancamentos(
        await rhFinanceiroService.listar(
          organizacaoAtivaId,
          empresaAtivaId,
          competencia
        )
      );
    } catch (error: any) {
      alert(error?.message || 'Erro ao carregar os lançamentos do RH.');
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    void carregar();
  }, [organizacaoAtivaId, empresaAtivaId, competencia]);

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return lancamentos.filter(item => {
      const bateTipo = item.tipo === tipo;
      const bateStatus = status === 'todos' || item.status === status;
      const bateBusca =
        !termo ||
        item.colaborador.toLowerCase().includes(termo) ||
        item.cpf.includes(termo) ||
        item.pix.toLowerCase().includes(termo);
      return bateTipo && bateStatus && bateBusca;
    });
  }, [lancamentos, tipo, status, busca]);

  const totais = useMemo(() => {
    const porTipo = (alvo: RHTipo) =>
      lancamentos
        .filter(item => item.tipo === alvo && item.status !== 'cancelado')
        .reduce((soma, item) => soma + item.valor, 0);

    return {
      salario: porTipo('salario'),
      adiantamento: porTipo('adiantamento'),
      passagem: porTipo('passagem'),
      alimentacao: porTipo('vale_alimentacao'),
      rescisao: porTipo('rescisao'),
    };
  }, [lancamentos]);

  const totalPeriodo = Object.values(totais).reduce((soma, valor) => soma + valor, 0);

  const selecionarArquivo = async (arquivo?: File) => {
    if (!arquivo) return;
    if (!temPermissao('rh', 'importar')) {
      alert('Você não tem permissão para importar lançamentos do RH.');
      return;
    }
    try {
      setArquivoNome(arquivo.name);
      const linhas = await rhFinanceiroService.lerExcel(
        arquivo,
        tipo,
        competencia,
        dataRescisao
      );
      setPreview(linhas);
      setModalImportacao(true);
    } catch (error: any) {
      alert(error?.message || 'Não foi possível ler o arquivo.');
    } finally {
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const confirmarImportacao = async () => {
    if (!temPermissao('rh', 'importar')) {
      alert('Você não tem permissão para importar lançamentos do RH.');
      return;
    }
    if (!organizacaoAtivaId || !empresaAtivaId) return;
    const validas = preview.filter(item => item.status === 'valido');
    if (!validas.length) return;

    setImportando(true);
    try {
      await rhFinanceiroService.importar({
        organizacaoId: organizacaoAtivaId,
        empresaId: empresaAtivaId,
        tipo,
        competencia,
        arquivoNome,
        linhas: preview,
      });
      setModalImportacao(false);
      setPreview([]);
      setArquivoNome('');
      await carregar();
    } catch (error: any) {
      alert(error?.message || 'Erro ao importar lançamentos.');
    } finally {
      setImportando(false);
    }
  };

  const atualizarStatus = async (
    item: RHLancamento,
    novoStatus: 'pendente' | 'programado' | 'pago' | 'cancelado'
  ) => {
    if (!temPermissao('rh', 'editar')) {
      alert('Você não tem permissão para editar lançamentos do RH.');
      return;
    }
    try {
      await rhFinanceiroService.atualizarStatus(
        item.id,
        organizacaoAtivaId,
        novoStatus
      );
      await carregar();
    } catch (error: any) {
      alert(error?.message || 'Erro ao atualizar o status.');
    }
  };

  const excluir = async (item: RHLancamento) => {
    if (!temPermissao('rh', 'excluir')) {
      alert('Você não tem permissão para excluir lançamentos do RH.');
      return;
    }
    if (!window.confirm(`Excluir o lançamento de ${item.colaborador}?`)) return;
    try {
      await rhFinanceiroService.excluir(item.id, organizacaoAtivaId);
      await carregar();
    } catch (error: any) {
      alert(error?.message || 'Erro ao excluir o lançamento.');
    }
  };

  const validos = preview.filter(item => item.status === 'valido').length;
  const atencao = preview.length - validos;
  const dataPrevista = calcularDataPagamento(tipo, `${competencia}-01`, dataRescisao);

  if (!empresa) {
    return (
      <div className="rounded-[18px] border border-slate-100 bg-white p-8 text-center">
        <p className="font-bold text-slate-700">Selecione uma empresa.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={event => selecionarArquivo(event.target.files?.[0])}
      />

      <header className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">
            RH Financeiro
          </h1>
          <p className="mt-1 text-xs text-slate-400">
            Folha, benefícios, rescisões e programação mensal de pagamentos.
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-2">
          <div>
            <label className="mb-1 block text-[9px] font-bold uppercase text-slate-400">
              Competência
            </label>
            <input
              type="month"
              value={competencia}
              onChange={event => setCompetencia(event.target.value)}
              className="h-10 rounded-[12px] border border-slate-200 bg-white px-3 text-xs"
            />
          </div>

          {tipo === 'rescisao' && (
            <div>
              <label className="mb-1 block text-[9px] font-bold uppercase text-slate-400">
                Data da rescisão
              </label>
              <input
                type="date"
                value={dataRescisao}
                onChange={event => setDataRescisao(event.target.value)}
                className="h-10 rounded-[12px] border border-slate-200 bg-white px-3 text-xs"
              />
            </div>
          )}

          <a
            href="/modelos/modelo_importacao_rh.xlsx"
            download
            className="flex h-10 items-center gap-2 rounded-[12px] border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Download className="h-4 w-4" />
            Baixar modelo
          </a>

          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex h-10 items-center gap-2 rounded-[12px] bg-slate-950 px-4 text-xs font-bold text-white hover:bg-slate-800"
          >
            <Upload className="h-4 w-4" />
            Importar Excel
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-6">
        {[
          ['Salários', totais.salario],
          ['Adiantamentos', totais.adiantamento],
          ['Passagens', totais.passagem],
          ['Alimentação', totais.alimentacao],
          ['Rescisões', totais.rescisao],
          ['Total do período', totalPeriodo],
        ].map(([label, valor], index) => (
          <div
            key={String(label)}
            className={`rounded-[18px] border p-4 shadow-sm ${
              index === 5
                ? 'border-slate-900 bg-slate-950 text-white'
                : 'border-slate-100 bg-white text-slate-800'
            }`}
          >
            <p className={`text-[10px] font-bold uppercase ${index === 5 ? 'text-white/50' : 'text-slate-400'}`}>
              {String(label)}
            </p>
            <p className="mt-2 text-lg font-black">{formatarReal(Number(valor))}</p>
          </div>
        ))}
      </div>

      <section className="overflow-hidden rounded-[18px] border border-slate-100 bg-white shadow-sm">
        <div className="flex gap-2 overflow-x-auto border-b border-slate-100 p-3">
          {tipos.map(item => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTipo(item.id)}
              className={`whitespace-nowrap rounded-[11px] px-4 py-2 text-xs font-bold ${
                tipo === item.id
                  ? 'bg-slate-950 text-white'
                  : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-3 border-b border-slate-100 bg-slate-50/60 p-4 md:grid-cols-[1fr_200px_auto]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={busca}
              onChange={event => setBusca(event.target.value)}
              placeholder="Buscar colaborador, CPF ou PIX..."
              className="h-10 w-full rounded-[12px] border border-slate-200 bg-white pl-9 pr-3 text-xs"
            />
          </div>

          <select
            value={status}
            onChange={event => setStatus(event.target.value)}
            className="h-10 rounded-[12px] border border-slate-200 bg-white px-3 text-xs"
          >
            <option value="todos">Todos os status</option>
            <option value="pendente">Pendente</option>
            <option value="programado">Programado</option>
            <option value="pago">Pago</option>
            <option value="cancelado">Cancelado</option>
          </select>

          <div className="flex items-center rounded-[12px] border border-slate-200 bg-white px-3 text-[10px] font-bold text-slate-500">
            <CalendarDays className="mr-2 h-4 w-4" />
            Pagamento previsto: {formatarData(dataPrevista)}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px]">
            <thead className="border-b border-slate-200 bg-[#F8FAFC]">
              <tr className="text-left text-[9px] uppercase tracking-wide text-slate-500">
                <th className="px-5 py-3.5">Colaborador</th>
                <th className="px-4 py-3.5">CPF</th>
                <th className="px-4 py-3.5">PIX</th>
                <th className="px-4 py-3.5">Período</th>
                <th className="px-4 py-3.5">Pagamento</th>
                <th className="px-4 py-3.5 text-right">Valor</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {carregando ? (
                <tr><td colSpan={8} className="p-12 text-center text-xs text-slate-400">Carregando...</td></tr>
              ) : filtrados.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-14 text-center">
                    <Users className="mx-auto h-8 w-8 text-slate-300" />
                    <p className="mt-3 text-sm font-bold text-slate-700">Nenhum lançamento encontrado</p>
                    <p className="mt-1 text-[11px] text-slate-400">Importe a planilha da competência selecionada.</p>
                  </td>
                </tr>
              ) : (
                filtrados.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="px-5 py-4 text-xs font-bold text-slate-800">{item.colaborador}</td>
                    <td className="px-4 py-4 font-mono text-[11px] text-slate-500">{item.cpf}</td>
                    <td className="max-w-[220px] truncate px-4 py-4 text-[11px] text-slate-500" title={item.pix}>{item.pix}</td>
                    <td className="px-4 py-4 text-xs text-slate-500">{item.competencia.slice(0, 7).split('-').reverse().join('/')}</td>
                    <td className="px-4 py-4 text-xs text-slate-600">{formatarData(item.dataPagamento)}</td>
                    <td className="px-4 py-4 text-right font-mono text-xs font-bold text-slate-900">{formatarReal(item.valor)}</td>
                    <td className="px-4 py-4">
                      <select
                        value={item.status}
                        onChange={event => atualizarStatus(item, event.target.value as any)}
                        className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-[10px] font-bold"
                      >
                        <option value="pendente">Pendente</option>
                        <option value="programado">Programado</option>
                        <option value="pago">Pago</option>
                        <option value="cancelado">Cancelado</option>
                      </select>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => excluir(item)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-[11px] border border-red-100 bg-red-50 text-red-500 hover:bg-red-100"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {modalImportacao && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="max-h-[92vh] w-full max-w-6xl overflow-hidden rounded-[22px] bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 p-5">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Prévia da importação</h2>
                <p className="mt-1 text-xs text-slate-400">{arquivoNome}</p>
              </div>
              <button onClick={() => setModalImportacao(false)} className="rounded-xl p-2 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3 border-b border-slate-100 bg-slate-50 p-4">
              <div className="rounded-xl bg-white p-3"><p className="text-[10px] text-slate-400">Total</p><p className="text-xl font-black">{preview.length}</p></div>
              <div className="rounded-xl bg-emerald-50 p-3"><p className="text-[10px] text-emerald-600">Válidos</p><p className="text-xl font-black text-emerald-700">{validos}</p></div>
              <div className="rounded-xl bg-amber-50 p-3"><p className="text-[10px] text-amber-600">Atenção</p><p className="text-xl font-black text-amber-700">{atencao}</p></div>
            </div>

            <div className="max-h-[55vh] overflow-auto">
              <table className="w-full min-w-[950px]">
                <thead className="sticky top-0 bg-slate-50 text-left text-[9px] uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Linha</th>
                    <th className="px-4 py-3">Colaborador</th>
                    <th className="px-4 py-3">CPF</th>
                    <th className="px-4 py-3">PIX</th>
                    <th className="px-4 py-3">Período</th>
                    <th className="px-4 py-3">Pagamento</th>
                    <th className="px-4 py-3 text-right">Valor</th>
                    <th className="px-4 py-3">Validação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {preview.map(item => (
                    <tr key={item.linha}>
                      <td className="px-4 py-3 text-xs">{item.linha}</td>
                      <td className="px-4 py-3 text-xs font-bold">{item.colaborador || '—'}</td>
                      <td className="px-4 py-3 font-mono text-[11px]">{item.cpf || '—'}</td>
                      <td className="max-w-[180px] truncate px-4 py-3 text-[11px]">{item.pix || '—'}</td>
                      <td className="px-4 py-3 text-xs">{item.periodo?.slice(0, 7) || '—'}</td>
                      <td className="px-4 py-3 text-xs">{formatarData(item.dataPagamento)}</td>
                      <td className="px-4 py-3 text-right text-xs font-bold">{formatarReal(item.valor || 0)}</td>
                      <td className="px-4 py-3">
                        {item.status === 'valido' ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700">
                            <CheckCircle2 className="h-3 w-3" /> Válido
                          </span>
                        ) : (
                          <span title={item.mensagem} className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-700">
                            <AlertTriangle className="h-3 w-3" /> {item.mensagem}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-100 p-4">
              <button onClick={() => setModalImportacao(false)} className="h-10 rounded-xl border border-slate-200 px-4 text-xs font-bold text-slate-600">
                Cancelar
              </button>
              <button
                onClick={confirmarImportacao}
                disabled={importando || validos === 0}
                className="h-10 rounded-xl bg-slate-950 px-5 text-xs font-bold text-white disabled:opacity-40"
              >
                {importando ? 'Importando...' : `Importar ${validos} registros válidos`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RHFinanceiroView;
