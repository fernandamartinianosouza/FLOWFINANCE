import React from 'react';

type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  children: React.ReactNode;
};

export const Card: React.FC<CardProps> = ({ children, className = '', ...props }) => {
  return (
    <div className={`ff-card ff-hover-lift ${className}`} {...props}>
      {children}
    </div>
  );
};
