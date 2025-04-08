import React from 'react';
import { Pagination as MuiPagination } from '@mui/material';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
}) => {
  const handleChange = (_event: React.ChangeEvent<unknown>, value: number) => {
    onPageChange(value);
  };

  return (
    <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center' }}>
      <MuiPagination
        page={currentPage}
        count={totalPages}
        onChange={handleChange}
        color="primary"
        showFirstButton
        showLastButton
      />
    </div>
  );
};
