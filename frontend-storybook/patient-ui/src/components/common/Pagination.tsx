import React, { memo } from 'react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export const Pagination = memo(
  function Pagination({
    currentPage,
    totalPages,
    onPageChange,
  }: PaginationProps): JSX.Element | null {
    if (totalPages <= 1) return null;

    const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1);

    return (
      <nav className="mt-4 flex justify-center" aria-label="Pagination">
        <ul className="inline-flex items-center -space-x-px">
          <li>
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="py-2 px-3 ml-0 leading-tight text-gray-500 bg-white rounded-l-lg border border-gray-300 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50 disabled:hover:bg-white disabled:hover:text-gray-500"
              aria-label="Previous page"
            >
              Previous
            </button>
          </li>
          {pageNumbers.map(number => (
            <li key={number}>
              <button
                onClick={() => onPageChange(number)}
                className={`py-2 px-3 leading-tight border border-gray-300 ${
                  currentPage === number
                    ? 'text-blue-600 bg-blue-50 border-blue-300 hover:bg-blue-100 hover:text-blue-700'
                    : 'text-gray-500 bg-white hover:bg-gray-100 hover:text-gray-700'
                }`}
                aria-current={currentPage === number ? 'page' : undefined}
                aria-label={`Page ${number}`}
              >
                {number}
              </button>
            </li>
          ))}
          <li>
            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="py-2 px-3 leading-tight text-gray-500 bg-white rounded-r-lg border border-gray-300 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50 disabled:hover:bg-white disabled:hover:text-gray-500"
              aria-label="Next page"
            >
              Next
            </button>
          </li>
        </ul>
      </nav>
    );
  },
  (prevProps, nextProps) => {
    // Only re-render if these props change
    return (
      prevProps.currentPage === nextProps.currentPage &&
      prevProps.totalPages === nextProps.totalPages
    );
  }
);

export default Pagination;
