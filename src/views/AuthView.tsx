import React, { useState } from 'react';
import {
  Lock,
  Mail,
  User,
  ArrowRight,
  Loader2,
  ShieldCheck,
  Building2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const AuthView: React.FC = () => {
  const { signIn, signUp } = useAuth();

  const [modo, setModo] = useState<'login' | 'cadastro'>('login');
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setErro('');
    setLoading(true);

    try {
      if (modo === 'login') {
        await signIn(email, senha);
      } else {
        if (!nome) {
          setErro('Informe seu nome para criar a conta.');
          return;
        }

        await signUp(nome, email, senha);
      }
    } catch (error: any) {
      setErro(error.message || 'Não foi possível autenticar.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F8FC] flex items-center justify-center p-6">
      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 bg-white rounded-[32px] border border-slate-100 shadow-2xl overflow-hidden">
        <div className="hidden lg:flex flex-col justify-between p-10 bg-[#0F172A] text-white min-h-[680px]">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-white/10 flex items-center justify-center border border-white/10">
                <Building2 className="w-5 h-5 text-[#D4AF37]" />
              </div>

              <div>
                <h1 className="text-lg font-black tracking-tight">
                  FlowFinance
                </h1>
                <p className="text-[11px] text-slate-400">
                  Compras e Contas a Pagar
                </p>
              </div>
            </div>

            <div className="mt-24">
              <p className="text-xs uppercase tracking-[0.3em] text-[#D4AF37] font-bold mb-5">
                SaaS financeiro corporativo
              </p>

              <h2 className="text-4xl font-black tracking-tight leading-tight">
                Controle compras, aprovações e pagamentos em um só lugar.
              </h2>

              <p className="text-sm text-slate-400 mt-5 leading-6 max-w-md">
                Centralize solicitações, fornecedores, plano financeiro,
                centros de custo, conciliação e histórico auditável com uma
                experiência moderna.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
              <ShieldCheck className="w-5 h-5 text-[#D4AF37] mb-4" />
              <p className="text-xs font-bold">Seguro</p>
              <p className="text-[10px] text-slate-400 mt-1">Supabase Auth</p>
            </div>

            <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
              <Lock className="w-5 h-5 text-[#D4AF37] mb-4" />
              <p className="text-xs font-bold">Privado</p>
              <p className="text-[10px] text-slate-400 mt-1">RLS por usuário</p>
            </div>

            <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
              <ArrowRight className="w-5 h-5 text-[#D4AF37] mb-4" />
              <p className="text-xs font-bold">Ágil</p>
              <p className="text-[10px] text-slate-400 mt-1">Fluxo guiado</p>
            </div>
          </div>
        </div>

        <div className="p-8 sm:p-12 flex items-center">
          <div className="w-full max-w-md mx-auto">
            <div className="mb-8">
              <span className="inline-flex px-3 py-1 rounded-full bg-slate-50 border border-slate-100 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                {modo === 'login' ? 'Acesso ao sistema' : 'Criar nova conta'}
              </span>

              <h2 className="text-2xl font-black text-[#0F172A] mt-5 tracking-tight">
                {modo === 'login'
                  ? 'Entre no FlowFinance'
                  : 'Comece no FlowFinance'}
              </h2>

              <p className="text-xs text-slate-400 mt-2">
                {modo === 'login'
                  ? 'Informe suas credenciais para acessar o painel.'
                  : 'Crie seu usuário para iniciar a configuração do ambiente.'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {modo === 'cadastro' && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                    Nome completo
                  </label>

                  <div className="bg-slate-50 rounded-[14px] px-3 flex items-center gap-2 border border-slate-100">
                    <User className="w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={nome}
                      onChange={e => setNome(e.target.value)}
                      placeholder="Seu nome"
                      className="w-full bg-transparent border-0 focus:ring-0 text-sm text-slate-700 placeholder-slate-400 py-3"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                  E-mail
                </label>

                <div className="bg-slate-50 rounded-[14px] px-3 flex items-center gap-2 border border-slate-100">
                  <Mail className="w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="voce@empresa.com"
                    className="w-full bg-transparent border-0 focus:ring-0 text-sm text-slate-700 placeholder-slate-400 py-3"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                  Senha
                </label>

                <div className="bg-slate-50 rounded-[14px] px-3 flex items-center gap-2 border border-slate-100">
                  <Lock className="w-4 h-4 text-slate-400" />
                  <input
                    type="password"
                    value={senha}
                    onChange={e => setSenha(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-transparent border-0 focus:ring-0 text-sm text-slate-700 placeholder-slate-400 py-3"
                    required
                  />
                </div>
              </div>

              {erro && (
                <div className="rounded-[14px] bg-red-50 border border-red-100 px-4 py-3 text-xs text-red-600 font-semibold">
                  {erro}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 rounded-[14px] bg-[#0F172A] hover:bg-[#1E293B] text-white font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    {modo === 'login' ? 'Entrar' : 'Criar conta'}
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <button
                onClick={() => {
                  setErro('');
                  setModo(modo === 'login' ? 'cadastro' : 'login');
                }}
                className="text-xs text-slate-500 hover:text-[#0F172A] transition"
              >
                {modo === 'login'
                  ? 'Ainda não tenho conta. Criar cadastro.'
                  : 'Já tenho conta. Entrar.'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};