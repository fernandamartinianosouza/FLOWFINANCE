import React from 'react';
import { ProcessoCompra } from '../../types';
import { formatarReal } from '../../utils';
import { useFinance } from '../../context/FinanceContext';

interface ExpenseItemProps {
  process: ProcessoCompra;
}

export const ExpenseItem: React.FC<ExpenseItemProps> = ({ process }) => {
  const { fornecedores } = useFinance();
  const supplier = fornecedores.find(f => f.id === process.fornecedorId);

  return (
    <div className="py-2.5 flex items-center justify-between text-xs gap-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-bold text-[#0F172A] font-mono">{process.id}</span>
          <span className="font-semibold text-slate-700 truncate">{supplier?.nome}</span>
        </div>
        <p className="text-[10px] text-slate-400 truncate mt-0.5">{process.descricao}</p>
      </div>
      <div className="text-right shrink-0">
        <span className="font-bold text-slate-800 font-mono block">{formatarReal(process.valor)}</span>
        <span className="text-[9px] text-slate-400 font-mono block">{process.dataCriacao}</span>
      </div>
    </div>
  );
};
