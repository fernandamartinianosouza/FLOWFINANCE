import React, { useMemo, useRef, useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { formatarReal } from '../utils';
import {
  Users, Plus, X, Mail, Phone, CheckCircle, Pencil, Trash2, Wallet,
  TrendingUp, AlertTriangle, Upload, Download, FileSpreadsheet,
  Loader2, MapPin, UserRound, KeyRound, Truck, CalendarDays,
} from 'lucide-react';
import {
  baixarModeloFornecedores,
  importarFornecedoresEmLote,
  lerPlanilhaFornecedores,
  type FornecedorImportado,
} from '../services/fornecedorImportService';

const dataParaMs = (data?: string) => {
  if (!data) return 0;
  const ms = new Date(data).getTime();
  return Number.isFinite(ms) ? ms : 0;
};

const diffDias = (inicio?: string, fim?: string) => {
  if (!inicio || !fim) return null;
  const ini = dataParaMs(inicio);
  const end = dataParaMs(fim);
  if (!ini || !end) return null;
  return Math.max(0, Math.round((end - ini) / 86400000));
};

const documentoFormatado = (valor?: string) => {
  const numeros = String(valor || '').replace(/\D/g, '');
  if (numeros.length === 11) {
    return numeros.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }
  if (numeros.length === 14) {
    return numeros.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }
  return valor || '';
};

const initialForm = {
  razaoSocial: '', nomeFantasia: '', cnpj: '', endereco: '', bairro: '', cidade: '',
  telefone: '', email: '', vendedorPadrao: '', chavePix: '', prazo: '', entrega: '', frete: '',
};

type FormFornecedor = typeof initialForm;

export const SuppliersView: React.FC = () => {
  const {
    fornecedores, processos, cadastrarFornecedor, editarFornecedor, excluirFornecedor,
    organizacaoAtivaId, empresaAtivaId, recarregarDados,
  } = useFinance();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [fornecedorEditandoId, setFornecedorEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState<FormFornecedor>(initialForm);
  const [sucesso, setSucesso] = useState(false);
  const [busca, setBusca] = useState('');
  const [arquivoNome, setArquivoNome] = useState('');
  const [preview, setPreview] = useState<FornecedorImportado[]>([]);
  const [lendoArquivo, setLendoArquivo] = useState(false);
  const [importando, setImportando] = useState(false);
  const [resultado, setResultado] = useState<string>('');

  const setCampo = (campo: keyof FormFornecedor, valor: string) =>
    setForm(prev => ({ ...prev, [campo]: valor }));

  const fornecedoresComMetricas = useMemo(() => fornecedores.map(fornecedor => {
    const processosFornecedor = processos.filter(p => p.fornecedorId === fornecedor.id);
    const processosPagos = processosFornecedor.filter(p => ['pagamento', 'conciliacao', 'finalizado'].includes(p.status));
    const processosEmAberto = processosFornecedor.filter(p => !['conciliacao', 'finalizado'].includes(p.status));
    const historicoCompras = processosPagos.reduce((sum, p) => sum + Number(p.valor || 0), 0);
    const valorEmAberto = processosEmAberto.reduce((sum, p) => sum + Number(p.valor || 0), 0);
    const ultima = [...processosFornecedor].sort((a, b) => dataParaMs(b.dataCriacao) - dataParaMs(a.dataCriacao))[0];
    const tempos = processosFornecedor.filter(p => p.dataPagamento)
      .map(p => diffDias(p.dataCriacao, p.dataPagamento)).filter((v): v is number => v !== null);
    const proximo = [...processosEmAberto].filter(p => p.prazo)
      .sort((a, b) => dataParaMs(a.prazo) - dataParaMs(b.prazo))[0];

    return {
      ...fornecedor,
      historicoComprasReal: historicoCompras,
      valorEmAberto,
      ultimaCompraReal: ultima?.dataCriacao || '-',
      tempoMedioPagamentoReal: tempos.length ? Math.round(tempos.reduce((a, b) => a + b, 0) / tempos.length) : 0,
      totalProcessos: processosFornecedor.length,
      ticketMedio: processosPagos.length ? historicoCompras / processosPagos.length : 0,
      maiorCompra: processosFornecedor.reduce((max, p) => Math.max(max, Number(p.valor || 0)), 0),
      proximoVencimento: proximo?.prazo || '-',
    };
  }), [fornecedores, processos]);

  const fornecedoresExibidos = fornecedoresComMetricas.filter((f: any) => {
    const termo = busca.toLowerCase();
    return [f.nome, f.razaoSocial, f.nomeFantasia, f.cnpj, f.email, f.cidade]
      .some(valor => String(valor || '').toLowerCase().includes(termo));
  });

  const totalComprado = fornecedoresComMetricas.reduce((sum, f) => sum + f.historicoComprasReal, 0);
  const totalEmAberto = fornecedoresComMetricas.reduce((sum, f) => sum + f.valorEmAberto, 0);
  const totalAtivos = fornecedoresComMetricas.filter(f => f.totalProcessos > 0).length;
  const totalProcessos = fornecedoresComMetricas.reduce((sum, f) => sum + f.totalProcessos, 0);
  const ticketMedio = totalComprado / Math.max(1, totalProcessos);

  const abrirCadastro = () => {
    setFornecedorEditandoId(null);
    setForm(initialForm);
    setModalOpen(true);
  };

  const abrirEdicao = (f: any) => {
    setFornecedorEditandoId(f.id);
    setForm({
      razaoSocial: f.razaoSocial || f.nome || '', nomeFantasia: f.nomeFantasia || '', cnpj: f.cnpj || '',
      endereco: f.endereco || '', bairro: f.bairro || '', cidade: f.cidade || '', telefone: f.telefone || '',
      email: f.email || '', vendedorPadrao: f.vendedorPadrao || '', chavePix: f.chavePix || '',
      prazo: f.prazo || '', entrega: f.entrega || '', frete: f.frete || '',
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.razaoSocial.trim()) return alert('Informe a Razão Social / Nome Completo.');

    const dados = {
      nome: form.razaoSocial.trim(), razaoSocial: form.razaoSocial.trim(), nomeFantasia: form.nomeFantasia.trim(),
      cnpj: form.cnpj.replace(/\D/g, ''), endereco: form.endereco.trim(), bairro: form.bairro.trim(),
      cidade: form.cidade.trim(), telefone: form.telefone.trim(), email: form.email.trim().toLowerCase(),
      vendedorPadrao: form.vendedorPadrao.trim(), chavePix: form.chavePix.trim(), prazo: form.prazo.trim(),
      entrega: form.entrega.trim(), frete: form.frete.trim(), empresaId: empresaAtivaId || undefined,
    } as any;

    if (fornecedorEditandoId) await editarFornecedor(fornecedorEditandoId, dados);
    else await cadastrarFornecedor(dados);

    setSucesso(true);
    setTimeout(() => { setSucesso(false); setModalOpen(false); setForm(initialForm); }, 900);
  };

  const selecionarArquivo = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const arquivo = event.target.files?.[0];
    if (!arquivo) return;
    setResultado(''); setLendoArquivo(true); setArquivoNome(arquivo.name);
    try {
      const existentes = fornecedores.map((f: any) => f.cnpj || '');
      setPreview(await lerPlanilhaFornecedores(arquivo, existentes));
      setImportModalOpen(true);
    } catch (error: any) {
      alert(error.message || 'Não foi possível ler a planilha.');
    } finally {
      setLendoArquivo(false);
      event.target.value = '';
    }
  };

  const confirmarImportacao = async () => {
    if (!organizacaoAtivaId) return alert('Selecione uma organização antes de importar.');
    setImportando(true); setResultado('');
    try {
      const { importados } = await importarFornecedoresEmLote({
        itens: preview, organizacaoId: organizacaoAtivaId, empresaId: empresaAtivaId || undefined,
      });
      await recarregarDados();
      setResultado(`${importados} fornecedor(es) importado(s) com sucesso.`);
    } catch (error: any) {
      alert(error.message || 'Erro ao importar fornecedores.');
    } finally {
      setImportando(false);
    }
  };

  const validos = preview.filter(i => i.status === 'valido').length;
  const duplicados = preview.filter(i => i.status === 'duplicado').length;
  const erros = preview.filter(i => i.status === 'erro').length;

  return (
    <div className="space-y-8" id="suppliers-view-container">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">Fornecedores Cadastrados</h1>
          <p className="text-xs text-slate-400 mt-1">Cadastre manualmente ou importe fornecedores pelo modelo Excel.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={baixarModeloFornecedores} className="h-10 px-4 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-semibold flex items-center gap-2 hover:bg-slate-50">
            <Download className="w-4 h-4" /> Baixar modelo
          </button>
          <button onClick={() => fileInputRef.current?.click()} disabled={lendoArquivo} className="h-10 px-4 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-semibold flex items-center gap-2 hover:bg-slate-50 disabled:opacity-60">
            {lendoArquivo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} Importar Excel
          </button>
          <button onClick={abrirCadastro} className="h-10 px-4 rounded-xl bg-[#0F172A] text-[#D4AF37] text-xs font-semibold flex items-center gap-2 hover:bg-[#1E293B] shadow-sm">
            <Plus className="w-4 h-4" /> Novo fornecedor
          </button>
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={selecionarArquivo} className="hidden" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 max-w-[1180px]">
        <Card title="Total Comprado" value={formatarReal(totalComprado)} icon={Wallet} />
        <Card title="Em Aberto" value={formatarReal(totalEmAberto)} icon={AlertTriangle} />
        <Card title="Fornecedores Ativos" value={String(totalAtivos)} icon={Users} />
        <Card title="Ticket Médio Geral" value={formatarReal(ticketMedio)} icon={TrendingUp} />
      </div>

      <div className="max-w-lg bg-white border border-slate-100 p-2 rounded-[14px] shadow-sm">
        <input placeholder="Pesquisar por razão social, fantasia, documento, e-mail ou cidade..." value={busca} onChange={e => setBusca(e.target.value)} className="w-full bg-transparent border-0 focus:ring-0 text-xs px-3 py-2" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-6 max-w-[1180px]">
        {fornecedoresExibidos.map((f: any) => (
          <div key={f.id} className="bg-white p-6 rounded-[18px] border border-slate-100 shadow-sm min-h-[320px] flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center"><Users className="w-5 h-5 text-slate-600" /></div>
                <div className="flex gap-2">
                  <IconButton title="Editar" onClick={() => abrirEdicao(f)}><Pencil className="w-3.5 h-3.5" /></IconButton>
                  <IconButton danger title="Excluir" onClick={() => window.confirm('Deseja excluir este fornecedor?') && excluirFornecedor(f.id)}><Trash2 className="w-3.5 h-3.5" /></IconButton>
                </div>
              </div>
              <span className="text-[10px] font-mono text-slate-400">{documentoFormatado(f.cnpj)}</span>
              <h3 className="text-sm font-bold text-slate-800 mt-2 line-clamp-2">{f.nomeFantasia || f.nome}</h3>
              {f.nomeFantasia && <p className="text-[10px] text-slate-400 mt-1 line-clamp-1">{f.razaoSocial || f.nome}</p>}
              <div className="mt-4 space-y-2 text-xs text-slate-500">
                <Info icon={Mail} text={f.email || 'Sem e-mail'} />
                <Info icon={Phone} text={f.telefone || 'Sem telefone'} />
                <Info icon={MapPin} text={[f.cidade, f.bairro].filter(Boolean).join(' • ') || 'Sem endereço'} />
                <Info icon={UserRound} text={f.vendedorPadrao || 'Sem vendedor padrão'} />
              </div>
            </div>
            <div className="border-t border-slate-50 pt-4 mt-4 grid grid-cols-2 gap-3 text-[10px]">
              <Metric label="Histórico Real" value={formatarReal(f.historicoComprasReal)} />
              <Metric label="Em Aberto" value={formatarReal(f.valorEmAberto)} />
              <Metric label="Última Compra" value={f.ultimaCompraReal} />
              <Metric label="Prazo Médio" value={`${f.tempoMedioPagamentoReal} dias`} />
            </div>
          </div>
        ))}
      </div>

      {modalOpen && (
        <Drawer title={fornecedorEditandoId ? 'Editar fornecedor' : 'Novo fornecedor'} onClose={() => setModalOpen(false)}>
          {sucesso ? <Success /> : (
            <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto">
              <Section title="Dados cadastrais">
                <Input label="Razão Social / Nome Completo *" value={form.razaoSocial} onChange={v => setCampo('razaoSocial', v)} required />
                <Input label="Nome Fantasia / Nome Abreviado" value={form.nomeFantasia} onChange={v => setCampo('nomeFantasia', v)} />
                <Input label="CNPJ / CPF" value={form.cnpj} onChange={v => setCampo('cnpj', v)} mono />
              </Section>
              <Section title="Endereço">
                <Input label="Endereço" value={form.endereco} onChange={v => setCampo('endereco', v)} />
                <div className="grid grid-cols-2 gap-3"><Input label="Bairro" value={form.bairro} onChange={v => setCampo('bairro', v)} /><Input label="Cidade" value={form.cidade} onChange={v => setCampo('cidade', v)} /></div>
              </Section>
              <Section title="Contato">
                <Input label="Telefone" value={form.telefone} onChange={v => setCampo('telefone', v)} />
                <Input label="E-mail" type="email" value={form.email} onChange={v => setCampo('email', v)} />
                <Input label="Vendedor padrão para o Cliente" value={form.vendedorPadrao} onChange={v => setCampo('vendedorPadrao', v)} />
              </Section>
              <Section title="Condições comerciais">
                <Input label="Chave PIX" value={form.chavePix} onChange={v => setCampo('chavePix', v)} icon={KeyRound} />
                <div className="grid grid-cols-3 gap-3"><Input label="Prazo" value={form.prazo} onChange={v => setCampo('prazo', v)} /><Input label="Entrega" value={form.entrega} onChange={v => setCampo('entrega', v)} /><Input label="Frete" value={form.frete} onChange={v => setCampo('frete', v)} /></div>
              </Section>
              <button type="submit" className="w-full h-11 bg-[#0F172A] text-white font-bold text-xs rounded-xl hover:bg-[#1E293B]">{fornecedorEditandoId ? 'Salvar alterações' : 'Cadastrar fornecedor'}</button>
            </form>
          )}
        </Drawer>
      )}

      {importModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => !importando && setImportModalOpen(false)} />
          <div className="relative bg-white w-full max-w-5xl max-h-[88vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            <div className="p-5 border-b flex items-center justify-between">
              <div className="flex items-center gap-3"><FileSpreadsheet className="w-5 h-5 text-emerald-600" /><div><h2 className="text-sm font-bold">Importar fornecedores</h2><p className="text-[11px] text-slate-400">{arquivoNome}</p></div></div>
              <button onClick={() => setImportModalOpen(false)} disabled={importando}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div className="grid grid-cols-4 gap-3 p-5 border-b bg-slate-50">
              <MiniCard label="Linhas" value={preview.length} /><MiniCard label="Válidas" value={validos} success /><MiniCard label="Duplicadas" value={duplicados} warning /><MiniCard label="Com erro" value={erros} danger />
            </div>
            <div className="overflow-auto flex-1">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-white border-b"><tr><Th>Linha</Th><Th>Status</Th><Th>Razão social</Th><Th>Documento</Th><Th>Nome fantasia</Th><Th>Mensagem</Th></tr></thead>
                <tbody>{preview.map(item => <tr key={item.linha} className="border-b border-slate-50"><Td>{item.linha}</Td><Td><Status status={item.status} /></Td><Td>{item.razaoSocial || '-'}</Td><Td className="font-mono">{documentoFormatado(item.cnpj) || '-'}</Td><Td>{item.nomeFantasia || '-'}</Td><Td>{item.mensagem || 'Pronto para importar'}</Td></tr>)}</tbody>
              </table>
            </div>
            <div className="p-5 border-t flex items-center justify-between gap-4">
              <p className="text-xs text-emerald-600 font-medium">{resultado}</p>
              <div className="flex gap-2"><button onClick={() => setImportModalOpen(false)} disabled={importando} className="h-10 px-4 rounded-xl border text-xs font-semibold">Fechar</button><button onClick={confirmarImportacao} disabled={!validos || importando || !!resultado} className="h-10 px-4 rounded-xl bg-[#0F172A] text-white text-xs font-semibold flex items-center gap-2 disabled:opacity-50">{importando && <Loader2 className="w-4 h-4 animate-spin" />} Importar {validos} válido(s)</button></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const Card = ({ title, value, icon: Icon }: any) => <div className="bg-white rounded-[18px] border border-slate-100 p-5 shadow-sm"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center"><Icon className="w-5 h-5 text-[#0F172A]" /></div><div><span className="text-[10px] font-bold text-slate-400 uppercase">{title}</span><p className="text-sm font-bold text-[#0F172A] font-mono">{value}</p></div></div></div>;
const Metric = ({ label, value }: any) => <div className="bg-slate-50 rounded-xl p-3"><span className="text-slate-400 block font-medium">{label}</span><span className="font-bold block mt-1 text-[#0F172A]">{value}</span></div>;
const Info = ({ icon: Icon, text }: any) => <div className="flex items-center gap-2"><Icon className="w-3.5 h-3.5 text-slate-400 shrink-0" /><span className="truncate">{text}</span></div>;
const IconButton = ({ children, danger, ...props }: any) => <button {...props} className={`w-8 h-8 rounded-xl border flex items-center justify-center ${danger ? 'bg-red-50 border-red-100 text-red-500' : 'bg-slate-50 border-slate-100 text-slate-600'}`}>{children}</button>;
const Section = ({ title, children }: any) => <section className="space-y-3"><h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{title}</h3>{children}</section>;
const Input = ({ label, value, onChange, type = 'text', required, mono }: any) => <label className="block space-y-1.5"><span className="text-[10px] font-bold text-slate-500 uppercase">{label}</span><input type={type} value={value} required={required} onChange={e => onChange(e.target.value)} className={`w-full bg-slate-50 border border-slate-100 focus:ring-1 focus:ring-[#0F172A]/20 rounded-xl px-3.5 py-2.5 text-xs ${mono ? 'font-mono' : ''}`} /></label>;
const Drawer = ({ title, onClose, children }: any) => <><div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-50" onClick={onClose} /><div className="fixed inset-y-0 right-0 max-w-xl w-full bg-white shadow-2xl z-50 flex flex-col"><div className="p-6 border-b flex items-center justify-between bg-slate-50"><h2 className="text-sm font-bold">{title}</h2><button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button></div>{children}</div></>;
const Success = () => <div className="flex-1 flex flex-col items-center justify-center gap-3"><CheckCircle className="w-12 h-12 text-emerald-500" /><h3 className="text-sm font-bold">Fornecedor salvo com sucesso!</h3></div>;
const MiniCard = ({ label, value, success, warning, danger }: any) => <div className="bg-white border rounded-xl p-3"><span className="text-[10px] text-slate-400 uppercase font-bold">{label}</span><p className={`text-lg font-bold ${success ? 'text-emerald-600' : warning ? 'text-amber-600' : danger ? 'text-red-500' : 'text-slate-800'}`}>{value}</p></div>;
const Status = ({ status }: any) => <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${status === 'valido' ? 'bg-emerald-50 text-emerald-600' : status === 'duplicado' ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-500'}`}>{status === 'valido' ? 'Válido' : status === 'duplicado' ? 'Duplicado' : 'Erro'}</span>;
const Th = ({ children }: any) => <th className="px-4 py-3 text-[10px] uppercase text-slate-400 font-bold">{children}</th>;
const Td = ({ children, className = '' }: any) => <td className={`px-4 py-3 text-slate-600 ${className}`}>{children}</td>;

export default SuppliersView;
