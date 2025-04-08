import React, { useState } from 'react';
import {
  Box,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  SelectChangeEvent,
} from '@mui/material';
import { Report } from '../../api/reports';

type ReportStatus = Report['status'];
type StatusFilter = ReportStatus | '';

export interface ReportFilters {
  status: ReportStatus | undefined;
  startDate: string | undefined;
  endDate: string | undefined;
  searchTerm: string | undefined;
}

interface ReportFilterControlsProps {
  onFilterChange: (filters: ReportFilters) => void;
}

const emptyFilters: ReportFilters = {
  status: undefined,
  startDate: undefined,
  endDate: undefined,
  searchTerm: undefined,
};

export const ReportFilterControls: React.FC<ReportFilterControlsProps> = ({ onFilterChange }) => {
  const [filters, setFilters] = useState<ReportFilters>(emptyFilters);

  const handleTextChange =
    (field: keyof ReportFilters) => (event: React.ChangeEvent<HTMLInputElement>) => {
      const newFilters: ReportFilters = {
        ...filters,
        [field]: event.target.value || undefined,
      };
      setFilters(newFilters);
      onFilterChange(newFilters);
    };

  const handleStatusChange = (event: SelectChangeEvent<StatusFilter>) => {
    const value = event.target.value;
    const newFilters: ReportFilters = {
      ...filters,
      status: value === '' ? undefined : (value as ReportStatus),
    };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleReset = () => {
    setFilters(emptyFilters);
    onFilterChange(emptyFilters);
  };

  const currentStatus: StatusFilter = filters.status || '';

  return (
    <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', flexWrap: 'wrap', mb: 2 }}>
      <TextField
        label="Search"
        size="small"
        value={filters.searchTerm || ''}
        onChange={handleTextChange('searchTerm')}
        sx={{ minWidth: 200 }}
      />

      <FormControl size="small" sx={{ minWidth: 120 }}>
        <InputLabel>Status</InputLabel>
        <Select<StatusFilter> value={currentStatus} label="Status" onChange={handleStatusChange}>
          <MenuItem value="">All</MenuItem>
          <MenuItem value="pending">Pending</MenuItem>
          <MenuItem value="processing">Processing</MenuItem>
          <MenuItem value="completed">Completed</MenuItem>
          <MenuItem value="error">Error</MenuItem>
        </Select>
      </FormControl>

      <TextField
        label="Start Date"
        type="date"
        size="small"
        value={filters.startDate || ''}
        onChange={handleTextChange('startDate')}
        InputLabelProps={{ shrink: true }}
      />

      <TextField
        label="End Date"
        type="date"
        size="small"
        value={filters.endDate || ''}
        onChange={handleTextChange('endDate')}
        InputLabelProps={{ shrink: true }}
      />

      <Button variant="outlined" onClick={handleReset} size="medium" sx={{ mt: 0.5 }}>
        Reset Filters
      </Button>
    </Box>
  );
};
