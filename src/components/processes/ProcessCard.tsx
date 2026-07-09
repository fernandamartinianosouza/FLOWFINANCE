import React from 'react';
import { ProcessoCompra } from '../../types';
import { formatarReal } from '../../utils';
import { useFinance } from '../../context/FinanceContext';
import { Building, User, Briefcase, Clock, ArrowRight } from 'lucide-react';

interface ProcessCardProps {
  process: ProcessoCompra;
  onSelect: (id: string) => void;
}

export const ProcessCard: React.FC<ProcessCardProps> = ({ process, onSelect }) => {
  const { empresas, fornecedores, planosFinanceiros } = useFinance();
  
  const empresa = empresas.find(em => em.id === process.empresaId);
  const fornecedor = fornecedores.find(fo => fo.id === process.fornecedorId);
  const plano = planosFinanceiros.find(pl => pl.id === process.planoFinanceiroId);

  return (
    <div
      onClick={() => onSelect(process.id)}
      className="bg-white p-6 rounded-[18px] border border-slate-100 shadow-sm hover:shadow-md hover:border-slate-200 transition-all cursor-pointer flex flex-col justify-between group h-76 relative"
      id={`process-card-${process.id}`}
    >
      {/* Header card info */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="text-[11px] font-bold font-mono text-[#0F172A] group-hover:underline">
            {process.id}
          </span>
          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide ${
            process.urgencia === 'alta' ? 'bg-red-50 text-red-600' :
            process.urgencia === 'media' ? 'bg-amber-50 text-amber-600' :
            'bg-slate-50 text-slate-500'
          }`}>
            {process.urgencia}
          </span>
        </div>

        <h3 className="text-xs font-bold text-slate-800 line-clamp-2 leading-relaxed mb-4">
          {process.descricao}
        </h3>

        <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 text-[11px] text-slate-500 border-t border-slate-50 pt-3">
          <div className="flex items-center gap-1.5 min-w-0">
            <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate" title={empresa?.nome}>{empresa?.nome.split(' ')[0]}</span>
          </div>
          <div className="flex items-center gap-1.5 min-w-0">
            <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate" title={fornecedor?.nome}>{fornecedor?.nome.split(' ')[0]}</span>
          </div>
          <div className="flex items-center gap-1.5 min-w-0">
            <Briefcase className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate" title={plano?.nome}>{plano?.nome}</span>
          </div>
          <div className="flex items-center gap-1.5 min-w-0">
            <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate text-slate-400 font-mono">{process.prazo}</span>
          </div>
        </div>
      </div>

      {/* Footer card info */}
      <div className="flex items-center justify-between mt-5 pt-3.5 border-t border-slate-50">
        <div className="flex flex-col">
          <span className="text-[9px] text-slate-400 uppercase tracking-wider block">Valor</span>
          <span className="text-sm font-bold text-[#0F172A] font-mono">{formatarReal(process.valor)}</span>
        </div>
        
        <span className="text-[10px] font-bold text-[#0F172A] group-hover:text-[#D4AF37] flex items-center gap-1 transition-all">
          <span>Acessar</span>
          <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
        </span>
      </div>
    </div>
  );
};
