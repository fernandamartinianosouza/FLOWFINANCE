import React from 'react';

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'soft' | 'ghost';
};

export const Button: React.FC<ButtonProps> = ({ variant = 'soft', className = '', children, ...props }) => {
  const variantClass = variant === 'primary' ? 'ff-button-primary' : variant === 'soft' ? 'ff-button-soft' : 'hover:bg-white/70 rounded-2xl';
  return (
    <button className={`${variantClass} px-4 py-2.5 text-xs font-bold transition-all ${className}`} {...props}>
      {children}
    </button>
  );
};
