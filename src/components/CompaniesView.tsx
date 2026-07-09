import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { formatarReal } from '../utils';
import {
  Building2,
  Plus,
  X,
  Landmark,
  CheckCircle,
  Pencil,
  Trash2,
} from 'lucide-react';

export const CompaniesView: React.FC = () => {
  const {
    empresas,
    cadastrarEmpresa,
    editarEmpresa,
    excluirEmpresa,
    processos,
  } = useFinance();

  const [modalOpen, setModalOpen] = useState(false);
  const [empresaEditandoId, setEmpresaEditandoId] = useState<string | null>(null);

  const [nome, setNome] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [banco, setBanco] = useState('Banco Itaú S.A.');
  const [contaBancaria, setContaBancaria] = useState('');
  const [saldoInicial, setSaldoInicial] = useState('');
  const [sucesso, setSucesso] = useState(false);

  const limparFormulario = () => {
    setEmpresaEditandoId(null);
    setNome('');
    setCnpj('');
    setBanco('Banco Itaú S.A.');
    setContaBancaria('');
    setSaldoInicial('');
  };

  const abrirCadastro = () => {
    limparFormulario();
    setModalOpen(true);
  };

  const abrirEdicao = (empresa: any) => {
    setEmpresaEditandoId(empresa.id);
    setNome(empresa.nome);
    setCnpj(empresa.cnpj);
    setBanco(empresa.banco);
    setContaBancaria(empresa.contaBancaria);
    setSaldoInicial(String(empresa.saldoInicial));
    setModalOpen(true);
  };

  const fecharModal = () => {
    limparFormulario();
    setModalOpen(false);
  };

  const handleExcluir = (id: string) => {
    if (!window.confirm('Deseja realmente excluir esta empresa?')) return;

    excluirEmpresa(id);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!nome || !cnpj || !contaBancaria || !saldoInicial) {
      alert('Preencha os dados cadastrais da empresa.');
      return;
    }

    const dadosEmpresa = {
      nome,
      cnpj,
      banco,
      contaBancaria,
      saldoInicial: parseFloat(saldoInicial),
    };

    if (empresaEditandoId) {
      editarEmpresa(empresaEditandoId, dadosEmpresa);
    } else {
      cadastrarEmpresa(dadosEmpresa);
    }

    setSucesso(true);

    setTimeout(() => {
      setSucesso(false);
      setModalOpen(false);
      limparFormulario();
    }, 1200);
  };

  return (
    <div className="space-y-10" id="companies-view-container">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-sans tracking-tight text-[#0F172A]">
            Empresas
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Gerencie as empresas ativas da holding, contas correntes e saldos consolidados.
          </p>
        </div>

        <button
          onClick={abrirCadastro}
          className="flex items-center gap-2 px-4 py-2.5 rounded-[12px] bg-[#0F172A] text-[#D4AF37] hover:bg-[#1E293B] font-semibold text-xs transition-all shadow-md self-start sm:self-center"
        >
          <Plus className="w-4 h-4" />
          <span>Cadastrar Nova Empresa</span>
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-6 max-w-[1180px]">
        {empresas.map(emp => {
          const processosEmpresa = processos.filter(p => p.empresaId === emp.id);

          return (
            <div
              key={emp.id}
              className="bg-white p-6 rounded-[18px] border border-slate-100 shadow-sm flex flex-col justify-between min-h-[230px] hover:border-slate-200 transition-all"
            >
              <div>
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-[12px] bg-slate-50 flex items-center justify-center border border-slate-100/50">
                    <Building2 className="w-5 h-5 text-slate-600" />
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => abrirEdicao(emp)}
                      className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-100 flex items-center justify-center transition"
                      title="Editar empresa"
                    >
                      <Pencil className="w-3.5 h-3.5 text-slate-600" />
                    </button>

                    <button
                      onClick={() => handleExcluir(emp.id)}
                      className="w-8 h-8 rounded-xl bg-red-50 hover:bg-red-100 border border-red-100 flex items-center justify-center transition"
                      title="Excluir empresa"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-500" />
                    </button>
                  </div>
                </div>

                <span className="text-[10px] font-mono text-slate-400 tracking-wider font-semibold">
                  {emp.cnpj}
                </span>

                <h3 className="text-xs font-bold text-slate-800 line-clamp-1 mt-2">
                  {emp.nome}
                </h3>

                <div className="mt-4 space-y-1.5 text-xs">
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <Landmark className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-medium truncate">{emp.banco}</span>
                  </div>

                  <div className="flex items-center gap-1.5 text-slate-400 font-mono text-[10px]">
                    <span>{emp.contaBancaria}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-slate-50 pt-4 mt-4">
                <div className="flex flex-col">
                  <span className="text-[9px] text-slate-400 uppercase tracking-wide block">
                    Saldo em Conta
                  </span>
                  <span className="text-xs font-bold text-[#0F172A] font-mono mt-0.5">
                    {formatarReal(emp.saldoAtual)}
                  </span>
                </div>

                <span className="text-[10px] font-semibold text-slate-400">
                  {processosEmpresa.length} processos ativos
                </span>
              </div>
            </div>
          );
        })}
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
                <Building2 className="w-4 h-4 text-[#0F172A]" />
                <h2 className="text-sm font-bold text-[#0F172A]">
                  {empresaEditandoId ? 'Editar Empresa' : 'Cadastrar Subsidiária'}
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
                    {empresaEditandoId ? 'Empresa Atualizada!' : 'Empresa Cadastrada!'}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    {empresaEditandoId
                      ? 'As alterações foram salvas com sucesso.'
                      : 'A subsidiária foi adicionada à holding com sucesso.'}
                  </p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex-1 p-6 space-y-5 overflow-y-auto">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">
                    Razão Social / Nome de Exibição
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Flow Comercio & Importadora Ltda"
                    value={nome}
                    onChange={e => setNome(e.target.value)}
                    className="w-full bg-slate-50 border-0 focus:ring-1 focus:ring-[#0F172A]/25 rounded-[12px] px-3.5 py-2.5 text-xs text-slate-700"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">
                    CNPJ Corporativo
                  </label>
                  <input
                    type="text"
                    placeholder="00.000.000/0001-00"
                    value={cnpj}
                    onChange={e => setCnpj(e.target.value)}
                    className="w-full bg-slate-50 border-0 focus:ring-1 focus:ring-[#0F172A]/25 rounded-[12px] px-3.5 py-2.5 text-xs text-slate-700 font-mono"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">
                    Instituição Bancária
                  </label>
                  <select
                    value={banco}
                    onChange={e => setBanco(e.target.value)}
                    className="w-full bg-slate-50 border-0 focus:ring-1 focus:ring-[#0F172A]/25 rounded-[12px] px-3.5 py-2.5 text-xs text-slate-700 font-medium"
                  >
                    <option value="Banco Itaú S.A.">Banco Itaú S.A.</option>
                    <option value="Banco Bradesco S.A.">Banco Bradesco S.A.</option>
                    <option value="Banco Santander Brasil">Banco Santander S.A.</option>
                    <option value="Banco BTG Pactual S.A.">Banco BTG Pactual S.A.</option>
                    <option value="Banco do Brasil S.A.">Banco do Brasil S.A.</option>
                    <option value="Cora">Cora</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">
                    Agência e Conta Corrente
                  </label>
                  <input
                    type="text"
                    placeholder="Ag: 1234-5 | CC: 98765-4"
                    value={contaBancaria}
                    onChange={e => setContaBancaria(e.target.value)}
                    className="w-full bg-slate-50 border-0 focus:ring-1 focus:ring-[#0F172A]/25 rounded-[12px] px-3.5 py-2.5 text-xs text-slate-700 font-mono"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">
                    Capital de Giro / Saldo Inicial (R$)
                  </label>
                  <input
                    type="number"
                    placeholder="0,00"
                    value={saldoInicial}
                    onChange={e => setSaldoInicial(e.target.value)}
                    className="w-full bg-slate-50 border-0 focus:ring-1 focus:ring-[#0F172A]/25 rounded-[12px] px-3.5 py-2.5 text-xs text-slate-800 font-bold font-mono"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-[#0F172A] hover:bg-[#1E293B] text-white font-bold text-xs rounded-[12px] flex items-center justify-center gap-2 transition-all mt-6 shadow-md"
                >
                  <span>
                    {empresaEditandoId ? 'Salvar Alterações' : 'Salvar Cadastro de Empresa'}
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