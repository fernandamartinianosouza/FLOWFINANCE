import React from 'react';
import { StatusProcesso } from '../../types';
import { formatarReal, ETAPAS_PROCESSO } from '../../utils';

interface ProcessPipelineRailProps {
  metricasEtapas: Record<StatusProcesso, { qtd: number; valor: number }>;
  etapaAtiva: StatusProcesso;
  onEtapaChange: (etapa: StatusProcesso) => void;
}

export const ProcessPipelineRail: React.FC<ProcessPipelineRailProps> = ({
  metricasEtapas,
  etapaAtiva,
  onEtapaChange
}) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4" id="pipeline-status-rail">
      {ETAPAS_PROCESSO.map((et) => {
        const isActive = etapaAtiva === et.key;
        const { qtd, valor } = metricasEtapas[et.key];
        return (
          <button
            key={et.key}
            onClick={() => onEtapaChange(et.key)}
            className={`p-4 rounded-[18px] border text-left transition-all duration-200 hover:shadow-sm hover:-translate-y-0.5 ${
              isActive 
                ? 'bg-[#0F172A] border-[#0F172A] text-white shadow-md' 
                : 'bg-white border-slate-100 text-slate-600'
            }`}
            id={`pipeline-tab-${et.key}`}
          >
            <span className={`text-[10px] font-bold block uppercase tracking-wider ${isActive ? 'text-[#D4AF37]' : 'text-slate-400'}`}>
              {et.label}
            </span>
            <span className="text-lg font-extrabold block mt-2 font-mono leading-none">
              {qtd}
            </span>
            <span className={`text-[9px] block mt-1 font-mono truncate ${isActive ? 'text-slate-300' : 'text-slate-500'}`}>
              {formatarReal(valor)}
            </span>
          </button>
        );
      })}
    </div>
  );
};
