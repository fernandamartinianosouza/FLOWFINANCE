import React, { useMemo, useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { formatarReal } from '../utils';
import {
  Users,
  Plus,
  X,
  Mail,
  Phone,
  CheckCircle,
  Pencil,
  Trash2,
  Wallet,
  Clock,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react';

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

  return Math.max(0, Math.round((end - ini) / (1000 * 60 * 60 * 24)));
};

export const SuppliersView: React.FC = () => {
  const {
    fornecedores,
    processos,
    cadastrarFornecedor,
    editarFornecedor,
    excluirFornecedor,
  } = useFinance();

  const [modalOpen, setModalOpen] = useState(false);
  const [fornecedorEditandoId, setFornecedorEditandoId] = useState<string | null>(null);

  const [nome, setNome] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [sucesso, setSucesso] = useState(false);
  const [busca, setBusca] = useState('');

  const fornecedoresComMetricas = useMemo(() => {
    return fornecedores.map(fornecedor => {
      const processosFornecedor = processos.filter(
        p => p.fornecedorId === fornecedor.id
      );

      const processosPagos = processosFornecedor.filter(
        p => ['pagamento', 'conciliacao', 'finalizado'].includes(p.status)
      );

      const processosEmAberto = processosFornecedor.filter(
        p => !['conciliacao', 'finalizado'].includes(p.status)
      );

      const historicoCompras = processosPagos.reduce(
        (sum, p) => sum + Number(p.valor || 0),
        0
      );

      const valorEmAberto = processosEmAberto.reduce(
        (sum, p) => sum + Number(p.valor || 0),
        0
      );

      const ultimaCompraProcesso = [...processosFornecedor].sort(
        (a, b) => dataParaMs(b.dataCriacao) - dataParaMs(a.dataCriacao)
      )[0];

      const ultimaCompra = ultimaCompraProcesso?.dataCriacao || '-';

      const processosComPagamento = processosFornecedor.filter(
        p => p.dataPagamento
      );

      const tempos = processosComPagamento
        .map(p => diffDias(p.dataCriacao, p.dataPagamento))
        .filter((v): v is number => v !== null);

      const tempoMedioPagamento =
        tempos.length > 0
          ? Math.round(tempos.reduce((sum, dias) => sum + dias, 0) / tempos.length)
          : 0;

      const ticketMedio =
        processosPagos.length > 0 ? historicoCompras / processosPagos.length : 0;

      const maiorCompra = processosFornecedor.reduce(
        (max, p) => Math.max(max, Number(p.valor || 0)),
        0
      );

      const proximoVencimentoProcesso = [...processosEmAberto]
        .filter(p => p.prazo)
        .sort((a, b) => dataParaMs(a.prazo) - dataParaMs(b.prazo))[0];

      return {
        ...fornecedor,
        historicoComprasReal: historicoCompras,
        valorEmAberto,
        ultimaCompraReal: ultimaCompra,
        tempoMedioPagamentoReal: tempoMedioPagamento,
        totalProcessos: processosFornecedor.length,
        processosEmAberto: processosEmAberto.length,
        ticketMedio,
        maiorCompra,
        proximoVencimento: proximoVencimentoProcesso?.prazo || '-',
      };
    });
  }, [fornecedores, processos]);

  const fornecedoresExibidos = fornecedoresComMetricas.filter(
    f =>
      f.nome.toLowerCase().includes(busca.toLowerCase()) ||
      f.cnpj.includes(busca)
  );

  const totalComprado = fornecedoresComMetricas.reduce(
    (sum, f) => sum + f.historicoComprasReal,
    0
  );

  const totalEmAberto = fornecedoresComMetricas.reduce(
    (sum, f) => sum + f.valorEmAberto,
    0
  );

  const totalFornecedoresAtivos = fornecedoresComMetricas.filter(
    f => f.totalProcessos > 0
  ).length;

  const ticketMedioGeral =
    fornecedoresComMetricas.length > 0
      ? totalComprado /
        Math.max(
          1,
          fornecedoresComMetricas.reduce((sum, f) => sum + f.totalProcessos, 0)
        )
      : 0;

  const limparFormulario = () => {
    setFornecedorEditandoId(null);
    setNome('');
    setCnpj('');
    setEmail('');
    setTelefone('');
  };

  const abrirCadastro = () => {
    limparFormulario();
    setModalOpen(true);
  };

  const abrirEdicao = (fornecedor: any) => {
    setFornecedorEditandoId(fornecedor.id);
    setNome(fornecedor.nome);
    setCnpj(fornecedor.cnpj);
    setEmail(fornecedor.email);
    setTelefone(fornecedor.telefone || '');
    setModalOpen(true);
  };

  const fecharModal = () => {
    limparFormulario();
    setModalOpen(false);
  };

  const handleExcluir = (id: string) => {
    if (!window.confirm('Deseja realmente excluir este fornecedor?')) return;
    excluirFornecedor(id);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!nome || !cnpj || !email) {
      alert('Preencha os dados cadastrais obrigatórios do credor.');
      return;
    }

    const dadosFornecedor = {
      nome,
      cnpj,
      email,
      telefone,
    };

    if (fornecedorEditandoId) {
      editarFornecedor(fornecedorEditandoId, dadosFornecedor);
    } else {
      cadastrarFornecedor(dadosFornecedor);
    }

    setSucesso(true);

    setTimeout(() => {
      setSucesso(false);
      setModalOpen(false);
      limparFormulario();
    }, 1200);
  };

  return (
    <div className="space-y-10" id="suppliers-view-container">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-sans tracking-tight text-[#0F172A]">
            Fornecedores Cadastrados
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Indicadores calculados automaticamente com base nos processos reais do sistema.
          </p>
        </div>

        <button
          onClick={abrirCadastro}
          className="flex items-center gap-2 px-4 py-2.5 rounded-[12px] bg-[#0F172A] text-[#D4AF37] hover:bg-[#1E293B] font-semibold text-xs transition-all shadow-md self-start sm:self-center"
        >
          <Plus className="w-4 h-4" />
          <span>Cadastrar Novo Fornecedor</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-5 max-w-[1180px]">
        <Card title="Total Comprado" value={formatarReal(totalComprado)} icon={Wallet} />
        <Card title="Em Aberto" value={formatarReal(totalEmAberto)} icon={AlertTriangle} />
        <Card title="Fornecedores Ativos" value={String(totalFornecedoresAtivos)} icon={Users} />
        <Card title="Ticket Médio Geral" value={formatarReal(ticketMedioGeral)} icon={TrendingUp} />
      </div>

      <div className="max-w-md bg-white border border-slate-100 p-2 rounded-[14px] shadow-xs">
        <input
          type="text"
          placeholder="Pesquisar fornecedor por nome ou CNPJ..."
          value={busca}
          onChange={e => setBusca(e.target.value)}
          className="w-full bg-transparent border-0 focus:ring-0 text-xs text-slate-600 placeholder-slate-400 px-3 py-1.5"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-6 max-w-[1180px]">
        {fornecedoresExibidos.map(f => (
          <div
            key={f.id}
            className="bg-white p-6 rounded-[18px] border border-slate-100 shadow-sm flex flex-col justify-between min-h-[300px] hover:border-slate-200 transition-all"
          >
            <div>
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-[12px] bg-slate-50 flex items-center justify-center border border-slate-100">
                  <Users className="w-5 h-5 text-slate-600" />
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => abrirEdicao(f)}
                    className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-100 flex items-center justify-center transition"
                    title="Editar fornecedor"
                  >
                    <Pencil className="w-3.5 h-3.5 text-slate-600" />
                  </button>

                  <button
                    onClick={() => handleExcluir(f.id)}
                    className="w-8 h-8 rounded-xl bg-red-50 hover:bg-red-100 border border-red-100 flex items-center justify-center transition"
                    title="Excluir fornecedor"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-500" />
                  </button>
                </div>
              </div>

              <span className="text-[10px] font-mono text-slate-400 tracking-wider font-semibold">
                {f.cnpj}
              </span>

              <h3 className="text-xs font-bold text-slate-800 line-clamp-1 mt-2">
                {f.nome}
              </h3>

              <div className="mt-4 space-y-2 text-xs">
                <div className="flex items-center gap-2 text-slate-500">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span className="truncate">{f.email}</span>
                </div>

                <div className="flex items-center gap-2 text-slate-500">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>{f.telefone || 'Sem telefone registrado'}</span>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-50 pt-4 mt-4 grid grid-cols-2 gap-3 text-[10px]">
              <Metric label="Histórico Real" value={formatarReal(f.historicoComprasReal)} />
              <Metric label="Em Aberto" value={formatarReal(f.valorEmAberto)} />
              <Metric label="Última Compra" value={f.ultimaCompraReal} />
              <Metric label="Próx. Vencimento" value={f.proximoVencimento} />
              <Metric label="Prazo Médio" value={`${f.tempoMedioPagamentoReal} dias`} amber />
              <Metric label="Ticket Médio" value={formatarReal(f.ticketMedio)} />
              <Metric label="Qtd. Processos" value={`${f.totalProcessos}`} />
              <Metric label="Maior Compra" value={formatarReal(f.maiorCompra)} />
            </div>
          </div>
        ))}
      </div>

      {modalOpen && (
        <>
          <div
            className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs z-50"
            onClick={fecharModal}
          />

          <div className="fixed inset-y-0 right-0 max-w-md w-full bg-white shadow-2xl z-50 flex flex-col justify-between h-screen border-l border-slate-100 transform transition-all animate-in slide-in-from-right duration-300">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#0F172A]" />
                <h2 className="text-sm font-bold text-[#0F172A]">
                  {fornecedorEditandoId ? 'Editar Fornecedor' : 'Cadastrar Credor'}
                </h2>
              </div>

              <button
                onClick={fecharModal}
                className="w-8 h-8 rounded-full bg-white border border-slate-100 flex items-center justify-center hover:bg-slate-50 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {sucesso ? (
              <div className="flex-1 p-8 flex flex-col items-center justify-center text-center space-y-4">
                <CheckCircle className="w-12 h-12 text-emerald-500" />
                <div>
                  <h3 className="text-sm font-bold text-slate-800">
                    {fornecedorEditandoId
                      ? 'Fornecedor Atualizado!'
                      : 'Fornecedor Credenciado!'}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Cadastro salvo com sucesso.
                  </p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex-1 p-6 space-y-5 overflow-y-auto">
                <Input label="Razão Social / Nome Fantasia" value={nome} setValue={setNome} required />
                <Input label="CNPJ / CPF do Credor" value={cnpj} setValue={setCnpj} required mono />
                <Input label="E-mail Comercial" value={email} setValue={setEmail} type="email" required />
                <Input label="Telefone de Contato" value={telefone} setValue={setTelefone} />

                <button
                  type="submit"
                  className="w-full py-3 bg-[#0F172A] hover:bg-[#1E293B] text-white font-bold text-xs rounded-[12px] flex items-center justify-center gap-2 transition-all mt-6 shadow-md"
                >
                  <span>
                    {fornecedorEditandoId
                      ? 'Salvar Alterações'
                      : 'Onboardar Novo Fornecedor'}
                  </span>
                </button>
              </form>
            )}
          </div>
        </>
      )}
    </div>
  );
};

const Card = ({ title, value, icon: Icon }: any) => (
  <div className="bg-white rounded-[18px] border border-slate-100 p-5 shadow-sm">
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
        <Icon className="w-5 h-5 text-[#0F172A]" />
      </div>
      <div>
        <span className="text-[10px] font-bold text-slate-400 uppercase">
          {title}
        </span>
        <p className="text-sm font-bold text-[#0F172A] font-mono">
          {value}
        </p>
      </div>
    </div>
  </div>
);

const Metric = ({ label, value, amber }: any) => (
  <div className="bg-slate-50 rounded-[12px] p-3">
    <span className="text-slate-400 block font-medium">{label}</span>
    <span
      className={`font-bold block mt-1 ${
        amber ? 'text-amber-600' : 'text-[#0F172A]'
      }`}
    >
      {value}
    </span>
  </div>
);

const Input = ({
  label,
  value,
  setValue,
  type = 'text',
  required = false,
  mono = false,
}: any) => (
  <div className="space-y-1.5">
    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">
      {label}
    </label>
    <input
      type={type}
      value={value}
      onChange={e => setValue(e.target.value)}
      className={`w-full bg-slate-50 border-0 focus:ring-1 focus:ring-[#0F172A]/25 rounded-[12px] px-3.5 py-2.5 text-xs text-slate-700 ${
        mono ? 'font-mono' : ''
      }`}
      required={required}
    />
  </div>
);

export default SuppliersView;