import React from 'react';
import { Select as AntSelect } from 'antd';
import type { SelectProps as AntSelectProps } from 'antd';

export interface SelectProps extends AntSelectProps {
  options?: { label: string; value: string | number }[];
}

export const Select: React.FC<SelectProps> = ({ options = [], ...props }) => {
  return (
    <AntSelect
      style={{ 
        minWidth: '120px',
        ...props.style 
      }}
      options={options}
      {...props}
    />
  );
}; 