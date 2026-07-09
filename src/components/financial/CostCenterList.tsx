import React, { useState } from 'react';
import { CentroCusto, ProcessoCompra } from '../../types';
import { formatarReal } from '../../utils';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { ExpenseItem } from './ExpenseItem';

interface CostCenterListProps {
  costCenters?: CentroCusto[];
  processes?: ProcessoCompra[];
}

const numeroSeguro = (valor: any): number => {
  const numero = Number(valor ?? 0);
  return Number.isFinite(numero) ? numero : 0;
};

export const CostCenterList: React.FC<CostCenterListProps> = ({
  costCenters = [],
  processes = []
}) => {
  const [expandedCostCenters, setExpandedCostCenters] = useState<Record<string, boolean>>({});

  const toggleCostCenter = (id: string) => {
    setExpandedCostCenters(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="lg:col-span-7 space-y-3.5">
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">
        Centros de Custos ({costCenters.length})
      </span>

      <div className="space-y-3">
        {costCenters.map((cc) => {
          const ccId = cc?.id ?? '';
          const tetoMensal = numeroSeguro(cc?.tetoMensal);
          const utilizado = numeroSeguro(cc?.utilizado);

          const isCcExpanded = !!expandedCostCenters[ccId];
          const despesasCC = processes.filter(p => p?.centroCustoId === ccId);
          const ccPercent = tetoMensal > 0 ? (utilizado / tetoMensal) * 100 : 0;

          return (
            <div
              key={ccId}
              className="bg-white rounded-[14px] border border-slate-100 shadow-xs overflow-hidden"
            >
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  toggleCostCenter(ccId);
                }}
                className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50/50 transition-all select-none"
              >
                <div className="space-y-1">
                  <span className="text-xs font-bold text-slate-800">
                    {cc?.nome ?? 'Centro de custo sem nome'}
                  </span>

                  <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
                    <span>Teto: {formatarReal(tetoMensal)}</span>
                    <span>•</span>
                    <span>Consumido: {formatarReal(utilizado)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-md bg-slate-50 border border-slate-100 text-slate-700">
                    {ccPercent.toFixed(0)}% Utilizado
                  </span>

                  <div className="text-slate-400">
                    {isCcExpanded ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </div>
                </div>
              </div>

              {isCcExpanded && (
                <div className="bg-slate-50/50 border-t border-slate-50 p-4 space-y-2.5">
                  <span className="text-[9px] font-bold text-slate-400 uppercase block tracking-wide">
                    Faturas e Demandas Vinculadas
                  </span>

                  {despesasCC.length === 0 ? (
                    <span className="text-[11px] text-slate-400 italic block">
                      Nenhum lançamento vinculado ou pago para este Centro de Custo no período.
                    </span>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {despesasCC.map((proc) => (
                        <ExpenseItem key={proc.id} process={proc} />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};