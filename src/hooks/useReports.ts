import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reportService } from '../services/reportService';
import type { Report, ReportType } from '../types/report';

export interface UseReportsOptions {
  patientId?: number;
  type?: ReportType;
  page?: number;
  pageSize?: number;
}

export const useReports = (options: UseReportsOptions = {}) => {
  const queryClient = useQueryClient();
  const queryKey = ['reports', options];

  const { data, isLoading, error } = useQuery({
    queryKey,
    queryFn: () => reportService.getReports(options),
  });

  const createMutation = useMutation({
    mutationFn: (newReport: Partial<Report>) => reportService.createReport(newReport),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (updatedReport: Partial<Report>) => reportService.updateReport(updatedReport),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (reportId: number) => reportService.deleteReport(reportId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });

  return {
    reports: data?.reports || [],
    total: data?.total || 0,
    isLoading,
    error,
    createReport: createMutation.mutate,
    updateReport: updateMutation.mutate,
    deleteReport: deleteMutation.mutate,
  };
}; 