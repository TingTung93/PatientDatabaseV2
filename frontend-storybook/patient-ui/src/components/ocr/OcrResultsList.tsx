import React, { useState } from 'react';
import { Input } from 'antd';
import { useOcr } from '../../hooks/useOcr';
import { OcrStatus } from '../../types/ocr';
import { Card } from '../common/Card';
import { Select } from '../common/Select';
import { Pagination } from '../common/Pagination';
import { OcrResult as OcrResultComponent } from './OcrResult';

interface OcrResultsListProps {
  className?: string;
}

const STATUS_OPTIONS = [
  { value: '', label: 'All Status' },
  { value: OcrStatus.Completed, label: 'Completed' },
  { value: OcrStatus.Processing, label: 'Processing' },
  { value: OcrStatus.Failed, label: 'Failed' },
];

export const OcrResultsList: React.FC<OcrResultsListProps> = ({ className = '' }) => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<OcrStatus | ''>('');
  const limit = 10;

  const ocrHook = useOcr();

  const filters: { search: string; status?: OcrStatus } = { search };
  if (status) {
    filters.status = status;
  }
  const { data, isLoading, isError } = ocrHook.useOcrResults(page, limit, filters);

  const { mutate: deleteResult } = ocrHook.useDeleteResult();
  const { mutate: retryProcessing } = ocrHook.useRetryProcessing();

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const handleStatusChange = (value: string) => {
    setStatus(value as OcrStatus | '');
    setPage(1);
  };

  if (isError) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="text-center text-red-600">
          Failed to load OCR results. Please try again later.
        </div>
      </Card>
    );
  }

  return (
    <div className={className}>
      <Card className="p-4 mb-4">
        <div className="flex gap-4">
          <Input
            type="text"
            placeholder="Search by filename..."
            value={search}
            onChange={handleSearch}
            className="flex-1"
          />
          <Select
            value={status}
            onValueChange={handleStatusChange}
            options={STATUS_OPTIONS}
            className="w-48"
          />
        </div>
      </Card>

      <div className="space-y-4">
        {isLoading ? (
          <Card className="p-6">
            <div className="text-center text-gray-600">Loading...</div>
          </Card>
        ) : data?.data.length === 0 ? (
          <Card className="p-6">
            <div className="text-center text-gray-600">No OCR results found.</div>
          </Card>
        ) : (
          data?.data.map(result => (
            <OcrResultComponent
              key={result.id}
              result={result}
              onDelete={() => deleteResult(result.id)}
              onRetry={() => retryProcessing(result.id)}
            />
          ))
        )}
      </div>

      {data && data.total > limit && (
        <div className="mt-4 flex justify-center">
          <Pagination
            currentPage={page}
            totalPages={Math.ceil(data.total / limit)}
            onPageChange={setPage}
          />
        </div>
      )}
    </div>
  );
};

export default OcrResultsList;
