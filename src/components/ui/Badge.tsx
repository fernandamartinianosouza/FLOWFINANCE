import React from 'react';

type BadgeTone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger';

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  tone?: BadgeTone;
  children: React.ReactNode;
};

const tones: Record<BadgeTone, string> = {
  neutral: 'bg-slate-100 text-slate-600',
  primary: 'bg-[#EEF2FF] text-[#3557FF]',
  success: 'bg-emerald-50 text-emerald-700',
  warning: 'bg-amber-50 text-amber-700',
  danger: 'bg-red-50 text-red-700',
};

export const Badge: React.FC<BadgeProps> = ({ tone = 'neutral', className = '', children, ...props }) => (
  <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-black ${tones[tone]} ${className}`} {...props}>
    {children}
  </span>
);
