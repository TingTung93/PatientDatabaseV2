import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

interface UseUrlPaginationResult {
  currentPage: number;
  itemsPerPage: number;
  setPage: (page: number) => void;
  setItemsPerPage: (limit: number) => void;
}

export const useUrlPagination = (
  defaultPage = 1,
  defaultItemsPerPage = 15
): UseUrlPaginationResult => {
  const [searchParams, setSearchParams] = useSearchParams();

  const currentPage = Number(searchParams.get('page')) || defaultPage;
  const itemsPerPage = Number(searchParams.get('limit')) || defaultItemsPerPage;

  const setPage = useCallback((page: number) => {
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      newParams.set('page', page.toString());
      return newParams;
    }, { replace: true }); // Use replace to avoid cluttering browser history
  }, [setSearchParams]);

  const setItemsPerPage = useCallback((limit: number) => {
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      newParams.set('limit', limit.toString());
      newParams.set('page', '1'); // Reset to first page when changing items per page
      return newParams;
    }, { replace: true });
  }, [setSearchParams]);

  return {
    currentPage,
    itemsPerPage,
    setPage,
    setItemsPerPage
  };
}; 