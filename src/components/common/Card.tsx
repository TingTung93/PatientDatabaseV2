import React from 'react';
import { Card as AntCard } from 'antd';
import type { CardProps as AntCardProps } from 'antd';

export interface CardProps extends AntCardProps {
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ children, ...props }) => {
  return (
    <AntCard
      style={{ 
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        ...props.style 
      }}
      {...props}
    >
      {children}
    </AntCard>
  );
}; 