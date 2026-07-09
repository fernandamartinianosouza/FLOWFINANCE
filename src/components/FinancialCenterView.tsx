import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { FinancialPlanCard } from './financial/FinancialPlanCard';
import {
  Plus,
  X,
  CheckCircle,
  Pencil,
  Trash2,
  Wallet,
  Layers,
} from 'lucide-react';

export const FinancialCenterView: React.FC = () => {
  const {
    planosFinanceiros,
    centrosCustos,
    processos,
    cadastrarPlanoFinanceiro,
    editarPlanoFinanceiro,
    excluirPlanoFinanceiro,
    cadastrarCentroCusto,
    editarCentroCusto,
    excluirCentroCusto,
  } = useFinance();

  const [planosExpandidos, setPlanosExpandidos] = useState<Record<string, boolean>>({
    'plan-1': true,
  });

  const [modalPlanoOpen, setModalPlanoOpen] = useState(false);
  const [modalCentroOpen, setModalCentroOpen] = useState(false);

  const [planoEditandoId, setPlanoEditandoId] = useState<string | null>(null);
  const [centroEditandoId, setCentroEditandoId] = useState<string | null>(null);

  const [sucesso, setSucesso] = useState(false);

  const [planoNome, setPlanoNome] = useState('');
  const [planoDescricao, setPlanoDescricao] = useState('');
  const [planoOrcamentoAnual, setPlanoOrcamentoAnual] = useState('');

  const [centroNome, setCentroNome] = useState('');
  const [centroDescricao, setCentroDescricao] = useState('');
  const [centroPlanoId, setCentroPlanoId] = useState('');
  const [centroOrcamentoMensal, setCentroOrcamentoMensal] = useState('');

  const togglePlano = (id: string) => {
    setPlanosExpandidos(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const limparPlano = () => {
    setPlanoEditandoId(null);
    setPlanoNome('');
    setPlanoDescricao('');
    setPlanoOrcamentoAnual('');
  };

  const limparCentro = () => {
    setCentroEditandoId(null);
    setCentroNome('');
    setCentroDescricao('');
    setCentroPlanoId('');
    setCentroOrcamentoMensal('');
  };

  const abrirNovoPlano = () => {
    limparPlano();
    setModalPlanoOpen(true);
  };

  const abrirNovoCentro = () => {
    limparCentro();
    setCentroPlanoId(planosFinanceiros[0]?.id || '');
    setModalCentroOpen(true);
  };

  const abrirEdicaoPlano = (plan: any) => {
    setPlanoEditandoId(plan.id);
    setPlanoNome(plan.nome || '');
    setPlanoDescricao(plan.descricao || '');
    setPlanoOrcamentoAnual(String(plan.orcamentoAnual || plan.limiteAnual || 0));
    setModalPlanoOpen(true);
  };

  const abrirEdicaoCentro = (centro: any) => {
    setCentroEditandoId(centro.id);
    setCentroNome(centro.nome || '');
    setCentroDescricao(centro.descricao || '');
    setCentroPlanoId(centro.planoFinanceiroId || '');
    setCentroOrcamentoMensal(String(centro.orcamentoMensal || centro.limiteMensal || 0));
    setModalCentroOpen(true);
  };

  const fecharPlano = () => {
    limparPlano();
    setModalPlanoOpen(false);
  };

  const fecharCentro = () => {
    limparCentro();
    setModalCentroOpen(false);
  };

  const handleExcluirPlano = (id: string) => {
    if (!window.confirm('Deseja realmente excluir este plano de conta?')) return;
    excluirPlanoFinanceiro(id);
  };

  const handleExcluirCentro = (id: string) => {
    if (!window.confirm('Deseja realmente excluir este centro de custo?')) return;
    excluirCentroCusto(id);
  };

  const handleSalvarPlano = (e: React.FormEvent) => {
    e.preventDefault();

    if (!planoNome || !planoOrcamentoAnual) {
      alert('Preencha o nome e o orçamento anual do plano.');
      return;
    }

    const dadosPlano: any = {
      nome: planoNome,
      descricao: planoDescricao,
      orcamentoAnual: parseFloat(planoOrcamentoAnual),
      limiteAnual: parseFloat(planoOrcamentoAnual),
    };

    if (planoEditandoId) {
      editarPlanoFinanceiro(planoEditandoId, dadosPlano);
    } else {
      cadastrarPlanoFinanceiro(dadosPlano);
    }

    setSucesso(true);

    setTimeout(() => {
      setSucesso(false);
      setModalPlanoOpen(false);
      limparPlano();
    }, 1200);
  };

  const handleSalvarCentro = (e: React.FormEvent) => {
    e.preventDefault();

    if (!centroNome || !centroPlanoId || !centroOrcamentoMensal) {
      alert('Preencha o nome, plano vinculado e orçamento mensal.');
      return;
    }

    const dadosCentro: any = {
      nome: centroNome,
      descricao: centroDescricao,
      planoFinanceiroId: centroPlanoId,
      orcamentoMensal: parseFloat(centroOrcamentoMensal),
      limiteMensal: parseFloat(centroOrcamentoMensal),
    };

    if (centroEditandoId) {
      editarCentroCusto(centroEditandoId, dadosCentro);
    } else {
      cadastrarCentroCusto(dadosCentro);
    }

    setSucesso(true);

    setTimeout(() => {
      setSucesso(false);
      setModalCentroOpen(false);
      limparCentro();
    }, 1200);
  };

  return (
    <div className="space-y-10" id="financial-center-view-container">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-sans tracking-tight text-[#0F172A]">
            Plano de Contas & Orçamentos
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Monitore os tetos de despesas anuais e mensais corporativos com provisionamento em tempo real.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={abrirNovoCentro}
            className="flex items-center gap-2 px-4 py-2.5 rounded-[12px] bg-white border border-slate-100 text-slate-700 hover:bg-slate-50 font-semibold text-xs transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Centro de Custo</span>
          </button>

          <button
            onClick={abrirNovoPlano}
            className="flex items-center gap-2 px-4 py-2.5 rounded-[12px] bg-[#0F172A] text-[#D4AF37] hover:bg-[#1E293B] font-semibold text-xs transition-all shadow-md"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Plano de Conta</span>
          </button>
        </div>
      </div>

      <div className="space-y-6 max-w-[1180px]">
        {planosFinanceiros.map((plan: any) => {
          const ccs = centrosCustos.filter((c: any) => c.planoFinanceiroId === plan.id);
          const isPlanExpanded = !!planosExpandidos[plan.id];

          return (
            <div key={plan.id} className="relative group">
              <div className="absolute top-5 right-5 z-10 flex items-center gap-2">
                <button
                  onClick={() => abrirEdicaoPlano(plan)}
                  className="w-8 h-8 rounded-xl bg-white hover:bg-slate-50 border border-slate-100 shadow-sm flex items-center justify-center transition"
                  title="Editar plano"
                >
                  <Pencil className="w-3.5 h-3.5 text-slate-600" />
                </button>

                <button
                  onClick={() => handleExcluirPlano(plan.id)}
                  className="w-8 h-8 rounded-xl bg-red-50 hover:bg-red-100 border border-red-100 shadow-sm flex items-center justify-center transition"
                  title="Excluir plano"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-500" />
                </button>
              </div>

              <FinancialPlanCard
                plan={plan}
                costCenters={ccs}
                processes={processos}
                isExpanded={isPlanExpanded}
                onToggle={togglePlano}
              />

              {isPlanExpanded && ccs.length > 0 && (
                <div className="mt-3 ml-4 grid grid-cols-1 xl:grid-cols-2 gap-3">
                  {ccs.map((centro: any) => (
                    <div
                      key={centro.id}
                      className="bg-white border border-slate-100 rounded-[16px] p-4 flex items-center justify-between shadow-sm"
                    >
                      <div>
                        <p className="text-xs font-bold text-slate-800">{centro.nome}</p>
                        <p className="text-[10px] text-slate-400 mt-1">
                          {centro.descricao || 'Centro de custo vinculado ao plano financeiro.'}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => abrirEdicaoCentro(centro)}
                          className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-100 flex items-center justify-center transition"
                          title="Editar centro de custo"
                        >
                          <Pencil className="w-3.5 h-3.5 text-slate-600" />
                        </button>

                        <button
                          onClick={() => handleExcluirCentro(centro.id)}
                          className="w-8 h-8 rounded-xl bg-red-50 hover:bg-red-100 border border-red-100 flex items-center justify-center transition"
                          title="Excluir centro de custo"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-500" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {modalPlanoOpen && (
        <>
          <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs z-50" onClick={fecharPlano} />

          <div className="fixed inset-y-0 right-0 max-w-md w-full bg-white shadow-2xl z-50 flex flex-col h-screen border-l border-slate-100 animate-in slide-in-from-right duration-300">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Wallet className="w-4 h-4 text-[#0F172A]" />
                <h2 className="text-sm font-bold text-[#0F172A]">
                  {planoEditandoId ? 'Editar Plano de Conta' : 'Novo Plano de Conta'}
                </h2>
              </div>

              <button onClick={fecharPlano} className="w-8 h-8 rounded-full bg-white border border-slate-100 flex items-center justify-center hover:bg-slate-50 text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            {sucesso ? (
              <div className="flex-1 p-8 flex flex-col items-center justify-center text-center space-y-4">
                <CheckCircle className="w-12 h-12 text-emerald-500" />
                <div>
                  <h3 className="text-sm font-bold text-slate-800">
                    {planoEditandoId ? 'Plano Atualizado!' : 'Plano Criado!'}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">As informações foram salvas com sucesso.</p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSalvarPlano} className="flex-1 p-6 space-y-5 overflow-y-auto">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">
                    Nome do Plano
                  </label>
                  <input
                    type="text"
                    value={planoNome}
                    onChange={e => setPlanoNome(e.target.value)}
                    placeholder="Ex: Despesas Operacionais"
                    className="w-full bg-slate-50 border-0 focus:ring-1 focus:ring-[#0F172A]/25 rounded-[12px] px-3.5 py-2.5 text-xs text-slate-700"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">
                    Descrição
                  </label>
                  <textarea
                    value={planoDescricao}
                    onChange={e => setPlanoDescricao(e.target.value)}
                    placeholder="Descrição opcional do plano"
                    className="w-full bg-slate-50 border-0 focus:ring-1 focus:ring-[#0F172A]/25 rounded-[12px] px-3.5 py-2.5 text-xs text-slate-700 min-h-24"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">
                    Orçamento Anual
                  </label>
                  <input
                    type="number"
                    value={planoOrcamentoAnual}
                    onChange={e => setPlanoOrcamentoAnual(e.target.value)}
                    placeholder="0,00"
                    className="w-full bg-slate-50 border-0 focus:ring-1 focus:ring-[#0F172A]/25 rounded-[12px] px-3.5 py-2.5 text-xs text-slate-800 font-bold font-mono"
                    required
                  />
                </div>

                <button type="submit" className="w-full py-3 bg-[#0F172A] hover:bg-[#1E293B] text-white font-bold text-xs rounded-[12px] transition-all mt-6 shadow-md">
                  {planoEditandoId ? 'Salvar Alterações' : 'Criar Plano de Conta'}
                </button>
              </form>
            )}
          </div>
        </>
      )}

      {modalCentroOpen && (
        <>
          <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs z-50" onClick={fecharCentro} />

          <div className="fixed inset-y-0 right-0 max-w-md w-full bg-white shadow-2xl z-50 flex flex-col h-screen border-l border-slate-100 animate-in slide-in-from-right duration-300">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#0F172A]" />
                <h2 className="text-sm font-bold text-[#0F172A]">
                  {centroEditandoId ? 'Editar Centro de Custo' : 'Novo Centro de Custo'}
                </h2>
              </div>

              <button onClick={fecharCentro} className="w-8 h-8 rounded-full bg-white border border-slate-100 flex items-center justify-center hover:bg-slate-50 text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            {sucesso ? (
              <div className="flex-1 p-8 flex flex-col items-center justify-center text-center space-y-4">
                <CheckCircle className="w-12 h-12 text-emerald-500" />
                <div>
                  <h3 className="text-sm font-bold text-slate-800">
                    {centroEditandoId ? 'Centro Atualizado!' : 'Centro Criado!'}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">As informações foram salvas com sucesso.</p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSalvarCentro} className="flex-1 p-6 space-y-5 overflow-y-auto">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">
                    Plano Vinculado
                  </label>
                  <select
                    value={centroPlanoId}
                    onChange={e => setCentroPlanoId(e.target.value)}
                    className="w-full bg-slate-50 border-0 focus:ring-1 focus:ring-[#0F172A]/25 rounded-[12px] px-3.5 py-2.5 text-xs text-slate-700 font-medium"
                    required
                  >
                    <option value="">Selecione um plano</option>
                    {planosFinanceiros.map((plan: any) => (
                      <option key={plan.id} value={plan.id}>
                        {plan.nome}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">
                    Nome do Centro de Custo
                  </label>
                  <input
                    type="text"
                    value={centroNome}
                    onChange={e => setCentroNome(e.target.value)}
                    placeholder="Ex: Administrativo"
                    className="w-full bg-slate-50 border-0 focus:ring-1 focus:ring-[#0F172A]/25 rounded-[12px] px-3.5 py-2.5 text-xs text-slate-700"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">
                    Descrição
                  </label>
                  <textarea
                    value={centroDescricao}
                    onChange={e => setCentroDescricao(e.target.value)}
                    placeholder="Descrição opcional do centro"
                    className="w-full bg-slate-50 border-0 focus:ring-1 focus:ring-[#0F172A]/25 rounded-[12px] px-3.5 py-2.5 text-xs text-slate-700 min-h-24"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">
                    Orçamento Mensal
                  </label>
                  <input
                    type="number"
                    value={centroOrcamentoMensal}
                    onChange={e => setCentroOrcamentoMensal(e.target.value)}
                    placeholder="0,00"
                    className="w-full bg-slate-50 border-0 focus:ring-1 focus:ring-[#0F172A]/25 rounded-[12px] px-3.5 py-2.5 text-xs text-slate-800 font-bold font-mono"
                    required
                  />
                </div>

                <button type="submit" className="w-full py-3 bg-[#0F172A] hover:bg-[#1E293B] text-white font-bold text-xs rounded-[12px] transition-all mt-6 shadow-md">
                  {centroEditandoId ? 'Salvar Alterações' : 'Criar Centro de Custo'}
                </button>
              </form>
            )}
          </div>
        </>
      )}
    </div>
  );
};