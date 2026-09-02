import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpFromLine,
  Boxes,
  ClipboardPlus,
  History,
  MapPin,
  PackagePlus,
  Plus,
  Save,
  Search,
  ShoppingCart,
  X,
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../context/PermissionsContext';
import { ItemCatalogoCotacao, quotationService } from '../services/quotationService';
import {
  EstoqueItem,
  MovimentacaoEstoque,
  SolicitacaoEstoque,
  UrgenciaEstoque,
  estoqueService,
} from '../services/estoqueService';

const numero = (valor: unknown) => {
  const n = Number(valor ?? 0);
  return Number.isFinite(n) ? n : 0;
};

const normalizar = (valor: unknown) =>
  String(valor ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const formatarQtd = (valor: number) =>
  new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 3 }).format(valor);

interface ItemSolicitacaoRascunho {
  idLocal: string;
  estoqueItemId: string;
  quantidade: string;
  observacao: string;
}

const novoItemSolicitacao = (estoqueItemId = ''): ItemSolicitacaoRascunho => ({
  idLocal: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
  estoqueItemId,
  quantidade: '1',
  observacao: '',
});

const Modal: React.FC<{
  titulo: string;
  onClose: () => void;
  children: React.ReactNode;
}> = ({ titulo, onClose, children }) => (
  <div className="fixed inset-0 z-[80] bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4">
    <div className="w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-[20px] bg-white shadow-2xl">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-6 py-4">
        <h2 className="text-base font-bold text-slate-900">{titulo}</h2>
        <button type="button" onClick={onClose} className="h-9 w-9 rounded-xl bg-slate-100 flex items-center justify-center">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="p-6">{children}</div>
    </div>
  </div>
);

const Input: React.FC<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
}> = ({ label, value, onChange, type = 'text', placeholder }) => (
  <label className="block space-y-2">
    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">{label}</span>
    <input
      type={type}
      value={value}
      onChange={event => onChange(event.target.value)}
      placeholder={placeholder}
      className="w-full rounded-[12px] border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400"
    />
  </label>
);

export const StockView: React.FC = () => {
  const { organizacaoAtivaId, empresaAtivaId, empresas } = useFinance();
  const { nomeUsuario } = useAuth();
  const { temPermissao } = usePermissions();

  const [itens, setItens] = useState<EstoqueItem[]>([]);
  const [catalogo, setCatalogo] = useState<ItemCatalogoCotacao[]>([]);
  const [movimentacoes, setMovimentacoes] = useState<MovimentacaoEstoque[]>([]);
  const [solicitacoes, setSolicitacoes] = useState<SolicitacaoEstoque[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState('');
  const [aba, setAba] = useState<'estoque' | 'movimentacoes' | 'solicitacoes'>('estoque');

  const [modalCadastro, setModalCadastro] = useState(false);
  const [catalogoId, setCatalogoId] = useState('');
  const [quantidadeInicial, setQuantidadeInicial] = useState('0');
  const [estoqueMinimo, setEstoqueMinimo] = useState('0');
  const [localizacao, setLocalizacao] = useState('');

  const [modalMov, setModalMov] = useState(false);
  const [itemMov, setItemMov] = useState<EstoqueItem | null>(null);
  const [tipoMov, setTipoMov] = useState<'entrada' | 'saida'>('entrada');
  const [quantidadeMov, setQuantidadeMov] = useState('1');
  const [motivoMov, setMotivoMov] = useState('');
  const [documentoMov, setDocumentoMov] = useState('');

  const [modalSolicitacao, setModalSolicitacao] = useState(false);
  const [tituloSolicitacao, setTituloSolicitacao] = useState('');
  const [justificativa, setJustificativa] = useState('');
  const [urgencia, setUrgencia] = useState<UrgenciaEstoque>('media');
  const [itensSolicitacao, setItensSolicitacao] = useState<ItemSolicitacaoRascunho[]>([
    novoItemSolicitacao(),
  ]);
  const [salvando, setSalvando] = useState(false);

  const empresa = empresas.find(item => item.id === empresaAtivaId);

  const carregar = async () => {
    if (!organizacaoAtivaId || !empresaAtivaId) {
      setItens([]);
      setCatalogo([]);
      setMovimentacoes([]);
      setSolicitacoes([]);
      return;
    }

    try {
      setCarregando(true);
      const [listaItens, listaCatalogo, listaMov, listaSolicitacoes] = await Promise.all([
        estoqueService.listarItens(organizacaoAtivaId, empresaAtivaId),
        quotationService.listarItensCatalogo(organizacaoAtivaId, empresaAtivaId),
        estoqueService.listarMovimentacoes(organizacaoAtivaId, empresaAtivaId, 100),
        estoqueService.listarSolicitacoes(organizacaoAtivaId, empresaAtivaId),
      ]);
      setItens(listaItens);
      setCatalogo(listaCatalogo);
      setMovimentacoes(listaMov);
      setSolicitacoes(listaSolicitacoes);
    } catch (error: any) {
      console.error(error);
      alert(error.message || 'Não foi possível carregar o estoque.');
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    void carregar();
  }, [organizacaoAtivaId, empresaAtivaId]);

  const itensFiltrados = useMemo(() => {
    const termo = normalizar(busca);
    if (!termo) return itens;
    return itens.filter(item =>
      [item.nome, item.codigo, item.descricao, item.localizacao]
        .some(valor => normalizar(valor).includes(termo))
    );
  }, [itens, busca]);

  const baixoEstoque = itens.filter(item => item.quantidade <= item.estoqueMinimo).length;
  const zerados = itens.filter(item => item.quantidade <= 0).length;
  const pendentes = solicitacoes.filter(item => item.status === 'pendente').length;

  const abrirCadastro = () => {
    if (!temPermissao('estoque', 'criar')) {
      alert('Você não tem permissão para cadastrar itens no estoque.');
      return;
    }
    setCatalogoId('');
    setQuantidadeInicial('0');
    setEstoqueMinimo('0');
    setLocalizacao('');
    setModalCadastro(true);
  };

  const cadastrarItem = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!catalogoId) return alert('Selecione um item do catálogo.');
    try {
      setSalvando(true);
      await estoqueService.adicionarItem({
        organizacaoId: organizacaoAtivaId,
        empresaId: empresaAtivaId,
        itemCatalogoId: catalogoId,
        quantidadeInicial: numero(quantidadeInicial),
        estoqueMinimo: numero(estoqueMinimo),
        localizacao,
        responsavel: nomeUsuario || undefined,
      });
      setModalCadastro(false);
      await carregar();
    } catch (error: any) {
      alert(error.message || 'Não foi possível cadastrar o item.');
    } finally {
      setSalvando(false);
    }
  };

  const abrirMovimentacao = (item: EstoqueItem, tipo: 'entrada' | 'saida') => {
    const acao = tipo === 'entrada' ? 'criar' : 'editar';
    if (!temPermissao('estoque', acao)) {
      alert('Você não tem permissão para movimentar o estoque.');
      return;
    }
    setItemMov(item);
    setTipoMov(tipo);
    setQuantidadeMov('1');
    setMotivoMov('');
    setDocumentoMov('');
    setModalMov(true);
  };

  const registrarMovimentacao = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!itemMov || numero(quantidadeMov) <= 0) return;
    if (tipoMov === 'saida' && numero(quantidadeMov) > itemMov.quantidade) {
      return alert(`Saldo insuficiente. Disponível: ${formatarQtd(itemMov.quantidade)} ${itemMov.unidade}.`);
    }
    try {
      setSalvando(true);
      await estoqueService.registrarMovimentacao({
        estoqueItemId: itemMov.id,
        tipo: tipoMov,
        quantidade: numero(quantidadeMov),
        motivo: motivoMov,
        documento: documentoMov,
        responsavel: nomeUsuario || undefined,
      });
      setModalMov(false);
      await carregar();
    } catch (error: any) {
      alert(error.message || 'Não foi possível registrar a movimentação.');
    } finally {
      setSalvando(false);
    }
  };

  const abrirSolicitacao = (item?: EstoqueItem) => {
    if (!temPermissao('estoque', 'criar')) {
      alert('Você não tem permissão para solicitar peças.');
      return;
    }
    setTituloSolicitacao(`Reposição de estoque - ${new Date().toLocaleDateString('pt-BR')}`);
    setJustificativa('');
    setUrgencia('media');
    setItensSolicitacao([novoItemSolicitacao(item?.id || '')]);
    setModalSolicitacao(true);
  };

  const salvarSolicitacao = async (event: React.FormEvent) => {
    event.preventDefault();
    const itensValidos = itensSolicitacao
      .map(rascunho => {
        const item = itens.find(registro => registro.id === rascunho.estoqueItemId);
        return item
          ? {
              itemCatalogoId: item.itemCatalogoId,
              descricao: item.nome,
              quantidade: numero(rascunho.quantidade),
              unidade: item.unidade,
              saldoNoMomento: item.quantidade,
              observacao: rascunho.observacao,
            }
          : null;
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item && item.quantidade > 0));

    if (!itensValidos.length) return alert('Adicione ao menos um item com quantidade válida.');

    try {
      setSalvando(true);
      await estoqueService.criarSolicitacao({
        organizacaoId: organizacaoAtivaId,
        empresaId: empresaAtivaId,
        titulo: tituloSolicitacao,
        justificativa,
        urgencia,
        solicitadoPor: nomeUsuario || undefined,
        itens: itensValidos,
      });
      setModalSolicitacao(false);
      setAba('solicitacoes');
      await carregar();
    } catch (error: any) {
      alert(error.message || 'Não foi possível criar a solicitação.');
    } finally {
      setSalvando(false);
    }
  };

  const nomeItemMovimentacao = (mov: MovimentacaoEstoque) =>
    itens.find(item => item.id === mov.estoqueItemId)?.nome || 'Item do estoque';

  return (
    <div className="space-y-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Estoque / Almoxarifado</h1>
          <p className="mt-1 text-xs text-slate-400">
            Controle entradas, saídas, saldo mínimo e solicitações de peças para Compras{empresa?.nome ? ` • ${empresa.nome}` : ''}.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => abrirSolicitacao()} className="rounded-[12px] border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold flex items-center gap-2">
            <ClipboardPlus className="h-4 w-4" /> Solicitar peças
          </button>
          <button type="button" onClick={abrirCadastro} className="rounded-[12px] bg-slate-900 px-4 py-2.5 text-xs font-bold text-white flex items-center gap-2">
            <PackagePlus className="h-4 w-4" /> Adicionar ao estoque
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ['Itens controlados', itens.length, Boxes],
          ['Estoque baixo', baixoEstoque, AlertTriangle],
          ['Sem saldo', zerados, ShoppingCart],
          ['Solicitações pendentes', pendentes, ClipboardPlus],
        ].map(([label, value, Icon]: any) => (
          <div key={label} className="rounded-[16px] border border-slate-100 bg-white p-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</span>
              <Icon className="h-4 w-4 text-slate-400" />
            </div>
            <div className="mt-3 text-2xl font-bold text-slate-900">{value}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 border-b border-slate-100">
        {[
          ['estoque', 'Estoque atual'],
          ['movimentacoes', 'Movimentações'],
          ['solicitacoes', 'Solicitações'],
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setAba(id as any)}
            className={`px-4 py-3 text-xs font-bold border-b-2 ${aba === id ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-400'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {aba === 'estoque' && (
        <>
          <div className="max-w-md rounded-[14px] border border-slate-100 bg-white px-4 py-2.5 flex items-center gap-2">
            <Search className="h-4 w-4 text-slate-400" />
            <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Pesquisar item, código ou localização..." className="w-full border-0 bg-transparent text-xs outline-none" />
          </div>

          {carregando ? (
            <div className="rounded-[16px] border border-slate-100 bg-white p-8 text-center text-sm text-slate-400">Carregando estoque...</div>
          ) : itensFiltrados.length === 0 ? (
            <div className="rounded-[16px] border border-dashed border-slate-200 bg-white p-10 text-center text-sm text-slate-400">Nenhum item cadastrado no estoque.</div>
          ) : (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              {itensFiltrados.map(item => {
                const baixo = item.quantidade <= item.estoqueMinimo;
                return (
                  <div key={item.id} className="rounded-[18px] border border-slate-100 bg-white p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-bold text-slate-900">{item.nome}</h3>
                          {baixo && <span className="rounded-full bg-amber-50 px-2 py-1 text-[9px] font-bold text-amber-700">ESTOQUE BAIXO</span>}
                        </div>
                        <p className="mt-1 text-[10px] text-slate-400">{item.codigo ? `Código ${item.codigo} • ` : ''}{item.unidade}</p>
                      </div>
                      <div className="text-right">
                        <div className={`text-2xl font-bold ${baixo ? 'text-amber-600' : 'text-slate-900'}`}>{formatarQtd(item.quantidade)}</div>
                        <div className="text-[9px] font-semibold text-slate-400">SALDO ATUAL</div>
                      </div>
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-3 rounded-[14px] bg-slate-50 p-3">
                      <div>
                        <div className="text-[9px] font-bold text-slate-400 uppercase">Estoque mínimo</div>
                        <div className="mt-1 text-xs font-bold text-slate-700">{formatarQtd(item.estoqueMinimo)} {item.unidade}</div>
                      </div>
                      <div>
                        <div className="text-[9px] font-bold text-slate-400 uppercase">Localização</div>
                        <div className="mt-1 text-xs font-bold text-slate-700 flex items-center gap-1"><MapPin className="h-3 w-3" /> {item.localizacao || 'Não informada'}</div>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-2">
                      <button type="button" onClick={() => abrirMovimentacao(item, 'entrada')} className="rounded-[11px] bg-emerald-50 px-3 py-2.5 text-[10px] font-bold text-emerald-700 flex items-center justify-center gap-1.5"><ArrowDownToLine className="h-3.5 w-3.5" /> Entrada</button>
                      <button type="button" onClick={() => abrirMovimentacao(item, 'saida')} className="rounded-[11px] bg-rose-50 px-3 py-2.5 text-[10px] font-bold text-rose-700 flex items-center justify-center gap-1.5"><ArrowUpFromLine className="h-3.5 w-3.5" /> Saída</button>
                      <button type="button" onClick={() => abrirSolicitacao(item)} className="rounded-[11px] bg-slate-900 px-3 py-2.5 text-[10px] font-bold text-white flex items-center justify-center gap-1.5"><ClipboardPlus className="h-3.5 w-3.5" /> Solicitar</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {aba === 'movimentacoes' && (
        <div className="overflow-hidden rounded-[18px] border border-slate-100 bg-white">
          <div className="border-b border-slate-100 px-5 py-4 flex items-center gap-2"><History className="h-4 w-4" /><h3 className="text-sm font-bold">Histórico de movimentações</h3></div>
          <div className="divide-y divide-slate-100">
            {movimentacoes.length === 0 ? <div className="p-8 text-center text-sm text-slate-400">Nenhuma movimentação registrada.</div> : movimentacoes.map(mov => (
              <div key={mov.id} className="grid grid-cols-1 gap-2 px-5 py-4 sm:grid-cols-[1.6fr_.7fr_.7fr_1fr] sm:items-center">
                <div><div className="text-xs font-bold text-slate-800">{nomeItemMovimentacao(mov)}</div><div className="mt-1 text-[10px] text-slate-400">{mov.motivo || 'Sem observação'}{mov.documento ? ` • Doc. ${mov.documento}` : ''}</div></div>
                <div><span className={`rounded-full px-2 py-1 text-[9px] font-bold ${mov.tipo === 'entrada' ? 'bg-emerald-50 text-emerald-700' : mov.tipo === 'saida' ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-slate-600'}`}>{mov.tipo.toUpperCase()}</span></div>
                <div className="text-xs font-bold">{formatarQtd(mov.quantidade)}</div>
                <div className="text-[10px] text-slate-400">{new Date(mov.createdAt).toLocaleString('pt-BR')}<br />{mov.responsavel || ''}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {aba === 'solicitacoes' && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {solicitacoes.length === 0 ? <div className="xl:col-span-2 rounded-[16px] border border-dashed border-slate-200 bg-white p-10 text-center text-sm text-slate-400">Nenhuma solicitação do estoque.</div> : solicitacoes.map(solicitacao => (
            <div key={solicitacao.id} className="rounded-[18px] border border-slate-100 bg-white p-5">
              <div className="flex items-start justify-between gap-3">
                <div><h3 className="text-sm font-bold text-slate-900">{solicitacao.titulo}</h3><p className="mt-1 text-[10px] text-slate-400">{new Date(solicitacao.createdAt).toLocaleString('pt-BR')} • {solicitacao.solicitadoPor || 'Almoxarifado'}</p></div>
                <span className={`rounded-full px-2 py-1 text-[9px] font-bold ${solicitacao.status === 'pendente' ? 'bg-amber-50 text-amber-700' : solicitacao.status === 'em_cotacao' ? 'bg-blue-50 text-blue-700' : solicitacao.status === 'atendida' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{solicitacao.status.replace('_', ' ').toUpperCase()}</span>
              </div>
              <div className="mt-4 space-y-2">{solicitacao.itens.map(item => <div key={item.id} className="rounded-[12px] bg-slate-50 p-3 flex justify-between gap-3"><div><div className="text-xs font-bold">{item.descricao}</div><div className="text-[10px] text-slate-400">Saldo ao solicitar: {formatarQtd(item.saldoNoMomento)} {item.unidade}</div></div><div className="text-xs font-bold">Solicitado: {formatarQtd(item.quantidade)} {item.unidade}</div></div>)}</div>
              {solicitacao.justificativa && <p className="mt-4 text-xs text-slate-500">{solicitacao.justificativa}</p>}
              {solicitacao.status === 'pendente' && temPermissao('estoque', 'excluir') && <button type="button" onClick={async () => { if (!confirm('Cancelar esta solicitação?')) return; await estoqueService.cancelarSolicitacao(solicitacao.id); await carregar(); }} className="mt-4 text-[10px] font-bold text-rose-600">Cancelar solicitação</button>}
            </div>
          ))}
        </div>
      )}

      {modalCadastro && (
        <Modal titulo="Adicionar item ao estoque" onClose={() => setModalCadastro(false)}>
          <form onSubmit={cadastrarItem} className="space-y-4">
            <label className="block space-y-2"><span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Item do catálogo</span><select value={catalogoId} onChange={e => setCatalogoId(e.target.value)} className="w-full rounded-[12px] border border-slate-200 px-3 py-2.5 text-sm"><option value="">Selecione...</option>{catalogo.filter(item => !itens.some(estoque => estoque.itemCatalogoId === item.id)).map(item => <option key={item.id} value={item.id}>{item.codigo ? `${item.codigo} — ` : ''}{item.nome}</option>)}</select></label>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><Input label="Quantidade inicial" type="number" value={quantidadeInicial} onChange={setQuantidadeInicial} /><Input label="Estoque mínimo" type="number" value={estoqueMinimo} onChange={setEstoqueMinimo} /></div>
            <Input label="Localização" value={localizacao} onChange={setLocalizacao} placeholder="Ex.: Prateleira A3" />
            <button disabled={salvando} className="w-full rounded-[12px] bg-slate-900 py-3 text-xs font-bold text-white flex items-center justify-center gap-2"><Save className="h-4 w-4" />{salvando ? 'Salvando...' : 'Adicionar ao estoque'}</button>
          </form>
        </Modal>
      )}

      {modalMov && itemMov && (
        <Modal titulo={`${tipoMov === 'entrada' ? 'Entrada' : 'Saída'} • ${itemMov.nome}`} onClose={() => setModalMov(false)}>
          <form onSubmit={registrarMovimentacao} className="space-y-4">
            <div className="rounded-[14px] bg-slate-50 p-4"><div className="text-[10px] font-bold uppercase text-slate-400">Saldo atual</div><div className="mt-1 text-xl font-bold">{formatarQtd(itemMov.quantidade)} {itemMov.unidade}</div></div>
            <Input label="Quantidade" type="number" value={quantidadeMov} onChange={setQuantidadeMov} />
            <Input label="Motivo / destino" value={motivoMov} onChange={setMotivoMov} placeholder={tipoMov === 'saida' ? 'Ex.: OS 123 / Veículo ABC-1D23' : 'Ex.: NF 456 / Compra mensal'} />
            <Input label="Documento / referência" value={documentoMov} onChange={setDocumentoMov} placeholder="NF, OS, requisição..." />
            <button disabled={salvando} className={`w-full rounded-[12px] py-3 text-xs font-bold text-white ${tipoMov === 'entrada' ? 'bg-emerald-600' : 'bg-rose-600'}`}>{salvando ? 'Salvando...' : `Confirmar ${tipoMov}`}</button>
          </form>
        </Modal>
      )}

      {modalSolicitacao && (
        <Modal titulo="Solicitar peças para Compras" onClose={() => setModalSolicitacao(false)}>
          <form onSubmit={salvarSolicitacao} className="space-y-5">
            <Input label="Título" value={tituloSolicitacao} onChange={setTituloSolicitacao} />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="block space-y-2"><span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Urgência</span><select value={urgencia} onChange={e => setUrgencia(e.target.value as UrgenciaEstoque)} className="w-full rounded-[12px] border border-slate-200 px-3 py-2.5 text-sm"><option value="baixa">Baixa</option><option value="media">Média</option><option value="alta">Alta</option></select></label>
              <div className="rounded-[12px] bg-blue-50 p-3 text-[10px] leading-5 text-blue-700">Após enviar, esta solicitação aparecerá na página <strong>Cotações</strong> para o setor de Compras transformar em cotação.</div>
            </div>
            <label className="block space-y-2"><span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Justificativa</span><textarea value={justificativa} onChange={e => setJustificativa(e.target.value)} rows={3} className="w-full rounded-[12px] border border-slate-200 px-3 py-2.5 text-sm" placeholder="Motivo da compra / aplicação das peças..." /></label>

            <div className="space-y-3">
              {itensSolicitacao.map((rascunho, index) => {
                const itemSelecionado = itens.find(item => item.id === rascunho.estoqueItemId);
                return <div key={rascunho.idLocal} className="rounded-[14px] border border-slate-100 p-4 space-y-3"><div className="flex items-center justify-between"><span className="text-xs font-bold">Item {index + 1}</span>{itensSolicitacao.length > 1 && <button type="button" onClick={() => setItensSolicitacao(atual => atual.filter(item => item.idLocal !== rascunho.idLocal))}><X className="h-4 w-4 text-rose-500" /></button>}</div><select value={rascunho.estoqueItemId} onChange={e => setItensSolicitacao(atual => atual.map(item => item.idLocal === rascunho.idLocal ? { ...item, estoqueItemId: e.target.value } : item))} className="w-full rounded-[12px] border border-slate-200 px-3 py-2.5 text-sm"><option value="">Selecione o item...</option>{itens.map(item => <option key={item.id} value={item.id}>{item.nome} • saldo {formatarQtd(item.quantidade)} {item.unidade}</option>)}</select><div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><Input label="Quantidade solicitada" type="number" value={rascunho.quantidade} onChange={value => setItensSolicitacao(atual => atual.map(item => item.idLocal === rascunho.idLocal ? { ...item, quantidade: value } : item))} /><Input label="Observação" value={rascunho.observacao} onChange={value => setItensSolicitacao(atual => atual.map(item => item.idLocal === rascunho.idLocal ? { ...item, observacao: value } : item))} placeholder="Marca, aplicação, especificação..." /></div>{itemSelecionado && itemSelecionado.quantidade <= itemSelecionado.estoqueMinimo && <div className="text-[10px] font-bold text-amber-700">Saldo atual abaixo do mínimo: {formatarQtd(itemSelecionado.quantidade)} / mínimo {formatarQtd(itemSelecionado.estoqueMinimo)}</div>}</div>;
              })}
            </div>
            <button type="button" onClick={() => setItensSolicitacao(atual => [...atual, novoItemSolicitacao()])} className="w-full rounded-[12px] border border-dashed border-slate-300 py-2.5 text-xs font-bold text-slate-500 flex items-center justify-center gap-2"><Plus className="h-4 w-4" />Adicionar outro item</button>
            <button disabled={salvando} className="w-full rounded-[12px] bg-slate-900 py-3 text-xs font-bold text-white flex items-center justify-center gap-2"><ClipboardPlus className="h-4 w-4" />{salvando ? 'Enviando...' : 'Enviar para Compras'}</button>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default StockView;
