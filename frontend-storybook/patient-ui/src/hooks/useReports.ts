import {
  useQuery,
  useMutation,
  useQueryClient,
  UseQueryResult,
  UseMutationResult,
} from '@tanstack/react-query';
// Removed patientService import as it's not used here
import { reportService } from '../services/reportService'; // Corrected path
// Removed uploadService import
import { Report } from '../types/report'; // Assuming Report type exists
import { PaginatedResponse } from '../types/common'; // Assuming PaginatedResponse exists

// --- Define types consistent with reportService.ts ---
// Ideally, these would be shared in ../types/
interface GetAllReportsParams {
  page?: number;
  limit?: number;
  type?: string;
  patientId?: number | string;
  dateFrom?: string;
  dateTo?: string;
}
interface Attachment {
  id: number | string;
  file_name: string;
  file_path: string;
  file_size: number;
  file_type: string;
}
interface UpdateReportStatusRequest {
  status: string;
  updatedBy: string;
}
interface UploadReportParams {
  file: File;
  type: string;
  patientId?: string | number;
}
interface CreateResponse {
  id: number | string;
  message?: string;
}
interface DeleteResponse {
  message: string;
}
// --- End Defined Types ---

const STALE_TIME = 5 * 60 * 1000; // 5 minutes

// Centralized query keys
const reportKeys = {
  all: ['reports'] as const,
  lists: () => [...reportKeys.all, 'list'] as const,
  list: (params: GetAllReportsParams | object) => [...reportKeys.lists(), params] as const,
  details: () => [...reportKeys.all, 'detail'] as const,
  detail: (id: string | number) => [...reportKeys.details(), String(id)] as const,
  attachments: (reportId: string | number) =>
    [...reportKeys.detail(String(reportId)), 'attachments'] as const,
  // Adjusted patient list key to use the main list key with patientId filter
  patientList: (patientId: string | number, params: GetAllReportsParams | object) =>
    reportKeys.list({ ...params, patientId: String(patientId) }),
};

// Hook for fetching all reports (paginated, filtered)
export const useReports = (
  params: GetAllReportsParams = {}
): UseQueryResult<PaginatedResponse<Report>, Error> => {
  return useQuery<PaginatedResponse<Report>, Error>({
    queryKey: reportKeys.list(params),
    queryFn: () => reportService.getAllReports(params), // Use getAllReports
    placeholderData: previousData => previousData,
    staleTime: STALE_TIME,
  });
};

// Hook for fetching reports for a specific patient
export const usePatientReports = (
  patientId: string | number,
  page = 1,
  limit = 10
): UseQueryResult<PaginatedResponse<Report>, Error> => {
  const params: GetAllReportsParams = { patientId: String(patientId), page, limit };
  return useQuery<PaginatedResponse<Report>, Error>({
    // Use the consistent list key structure with patientId
    queryKey: reportKeys.list(params),
    // Use getAllReports with patientId filter
    queryFn: () => reportService.getAllReports(params),
    enabled: !!patientId,
    placeholderData: previousData => previousData,
    staleTime: STALE_TIME,
  });
};

// Hook for fetching a single report
export const useReport = (
  reportId: string | number,
  enabled: boolean = true
): UseQueryResult<Report, Error> => {
  const stringId = String(reportId);
  return useQuery<Report, Error>({
    queryKey: reportKeys.detail(stringId),
    queryFn: () => reportService.getReportById(stringId), // Use getReportById
    enabled: enabled && !!reportId,
    staleTime: STALE_TIME,
  });
};

// Hook for deleting a report
export const useDeleteReport = (): UseMutationResult<
  DeleteResponse, // Updated response type
  Error,
  string | number // Variable is reportId
> => {
  const queryClient = useQueryClient();
  return useMutation<DeleteResponse, Error, string | number>({
    mutationFn: (reportId: string | number) => reportService.deleteReport(String(reportId)), // Use deleteReport
    onSuccess: (_, reportId) => {
      const stringId = String(reportId);
      // Invalidate all list queries as we don't know which lists it was in
      queryClient.invalidateQueries({ queryKey: reportKeys.lists() });
      // Remove specific report detail query
      queryClient.removeQueries({ queryKey: reportKeys.detail(stringId) });
      // Remove attachment queries for this report
      queryClient.removeQueries({ queryKey: reportKeys.attachments(stringId) });
    },
  });
};

// Hook for uploading a report
export const useUploadReport = (): UseMutationResult<
  CreateResponse, // Updated response type
  Error,
  UploadReportParams // Updated params type
> => {
  const queryClient = useQueryClient();
  return useMutation<CreateResponse, Error, UploadReportParams>({
    mutationFn: (params: UploadReportParams) =>
      reportService.uploadReport(params.file, params.type, params.patientId), // Use reportService.uploadReport
    onSuccess: (_, variables) => {
      // Invalidate all lists as a new report was added
      queryClient.invalidateQueries({ queryKey: reportKeys.lists() });
      // If linked to a patient, invalidate that patient's list specifically (optional optimization)
      // if (variables.patientId) {
      //   queryClient.invalidateQueries({ queryKey: reportKeys.patientList(variables.patientId, {}) });
      // }
    },
  });
};

// Hook to update a report's status
export const useUpdateReportStatus = (): UseMutationResult<
  Report, // Return type is the updated Report
  Error,
  { id: string | number; statusData: UpdateReportStatusRequest }
> => {
  const queryClient = useQueryClient();
  return useMutation<Report, Error, { id: string | number; statusData: UpdateReportStatusRequest }>(
    {
      mutationFn: ({ id, statusData }) => reportService.updateReportStatus(String(id), statusData), // Use updateReportStatus
      onSuccess: (updatedReport, variables) => {
        const stringId = String(variables.id);
        // Update the specific report cache
        queryClient.setQueryData(reportKeys.detail(stringId), updatedReport);
        // Invalidate lists as status might affect filtering
        queryClient.invalidateQueries({ queryKey: reportKeys.lists() });
      },
    }
  );
};

// Hook to fetch report attachments
export const useReportAttachments = (
  reportId: string | number | null | undefined
): UseQueryResult<Attachment[], Error> => {
  const stringId = reportId ? String(reportId) : '';
  return useQuery<Attachment[], Error>({
    queryKey: reportKeys.attachments(stringId), // Use centralized key
    queryFn: () => reportService.getReportAttachments(stringId), // Use getReportAttachments
    enabled: !!reportId,
    staleTime: STALE_TIME,
  });
};

// Hook to add a report attachment
export const useAddReportAttachment = (): UseMutationResult<
  CreateResponse, // Updated response type
  Error,
  { id: string | number; file: File }
> => {
  const queryClient = useQueryClient();
  return useMutation<CreateResponse, Error, { id: string | number; file: File }>({
    mutationFn: ({ id, file }) => reportService.addReportAttachment(String(id), file), // Use addReportAttachment
    onSuccess: (_, variables) => {
      // Invalidate the attachments query for this report
      queryClient.invalidateQueries({ queryKey: reportKeys.attachments(String(variables.id)) });
    },
  });
};

// Hook to delete a report attachment
export const useDeleteReportAttachment = (): UseMutationResult<
  DeleteResponse, // Updated response type
  Error,
  { reportId: string | number; attachmentId: string | number }
> => {
  const queryClient = useQueryClient();
  return useMutation<
    DeleteResponse,
    Error,
    { reportId: string | number; attachmentId: string | number }
  >({
    mutationFn: ({ attachmentId }) => reportService.deleteReportAttachment(String(attachmentId)), // Use deleteReportAttachment
    onSuccess: (_, variables) => {
      // Invalidate the attachments query for the parent report
      queryClient.invalidateQueries({
        queryKey: reportKeys.attachments(String(variables.reportId)),
      });
    },
  });
};
