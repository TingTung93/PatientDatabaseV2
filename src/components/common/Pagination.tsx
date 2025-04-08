import React from 'react';
import { Pagination as AntPagination } from 'antd';
import type { PaginationProps as AntPaginationProps } from 'antd';

export interface PaginationProps extends AntPaginationProps {
  showSizeChanger?: boolean;
  showQuickJumper?: boolean;
}

export const Pagination: React.FC<PaginationProps> = ({ 
  showSizeChanger = true,
  showQuickJumper = true,
  ...props 
}) => {
  return (
    <AntPagination
      showSizeChanger={showSizeChanger}
      showQuickJumper={showQuickJumper}
      {...props}
    />
  );
}; 