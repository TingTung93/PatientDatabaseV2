import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { reportService, type Report } from '../../services/reportService';
import { websocketService } from '../../services/websocketService';
import { ocrService } from '../../services/ocrService';

interface ReportManagementProps {
  patientId: number;
}

export const ReportManagement: React.FC<ReportManagementProps> = ({ patientId }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [reportType, setReportType] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const queryClient = useQueryClient();

  const { data: reports, isLoading, error } = useQuery(
    ['reports', patientId],
    () => reportService.getAllReports({ patientId }),
    {
      keepPreviousData: true,
    }
  );

  const uploadMutation = useMutation(
    async (formData: FormData) => {
      // First process with OCR
      const ocrResponse = await ocrService.processDocument(formData);
      
      // Poll for OCR completion
      const ocrResult = await ocrService.pollJobStatus(ocrResponse.jobId, (status) => {
        setOcrProgress(status.progress);
      });

      // Now upload the report
      formData.append('type', reportType);
      formData.append('patientId', patientId.toString());
      if (ocrResult.status === 'completed' && ocrResult.results) {
        formData.append('ocrText', ocrResult.results.extractedText);
      }

      return reportService.uploadReport(formData);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['reports', patientId]);
        setSelectedFile(null);
        setReportType('');
        setIsProcessing(false);
        setOcrProgress(0);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      },
      onError: (error) => {
        console.error('Upload failed:', error);
        setIsProcessing(false);
      },
    }
  );

  const deleteMutation = useMutation(
    (reportId: number) => reportService.deleteReport(reportId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['reports', patientId]);
      },
    }
  );

  // Subscribe to WebSocket events
  React.useEffect(() => {
    websocketService.subscribe(['report_created', 'report_updated', 'report_deleted']);

    const handleReportUpdate = () => {
      queryClient.invalidateQueries(['reports', patientId]);
    };

    websocketService.on('report_created', handleReportUpdate);
    websocketService.on('report_updated', handleReportUpdate);
    websocketService.on('report_deleted', handleReportUpdate);

    return () => {
      websocketService.unsubscribe(['report_created', 'report_updated', 'report_deleted']);
      websocketService.off('report_created', handleReportUpdate);
      websocketService.off('report_updated', handleReportUpdate);
      websocketService.off('report_deleted', handleReportUpdate);
    };
  }, [queryClient, patientId]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleUpload = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedFile || !reportType) return;

    setIsProcessing(true);
    const formData = new FormData();
    formData.append('file', selectedFile);
    uploadMutation.mutate(formData);
  };

  const handleDelete = (reportId: number) => {
    if (window.confirm('Are you sure you want to delete this report?')) {
      deleteMutation.mutate(reportId);
    }
  };

  if (isLoading) return <div>Loading reports...</div>;
  if (error) return <div>Error loading reports: {(error as Error).message}</div>;

  return (
    <div className="report-management">
      <h2>Patient Reports</h2>

      <form onSubmit={handleUpload} className="upload-form">
        <div>
          <label htmlFor="file">Report File:</label>
          <input
            ref={fileInputRef}
            type="file"
            id="file"
            onChange={handleFileChange}
            disabled={isProcessing}
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.txt,.rtf"
          />
          <small className="file-types-hint">
            Supported formats: PDF, DOC, DOCX, JPG, PNG, TXT, RTF
          </small>
        </div>

        <div>
          <label htmlFor="type">Report Type:</label>
          <select
            id="type"
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            disabled={isProcessing}
            required
          >
            <option value="">Select type...</option>
            <option value="bloodwork">Blood Work</option>
            <option value="imaging">Imaging</option>
            <option value="consultation">Consultation</option>
            <option value="surgery">Surgery</option>
            <option value="other">Other</option>
          </select>
        </div>

        {isProcessing && (
          <div className="progress">
            <div>Processing... {ocrProgress}%</div>
            <progress value={ocrProgress} max="100" />
          </div>
        )}

        <button type="submit" disabled={!selectedFile || !reportType || isProcessing}>
          {isProcessing ? 'Processing...' : 'Upload Report'}
        </button>
      </form>

      <div className="reports-list">
        {reports?.data.map((report: Report) => (
          <div key={report.id} className="report-item">
            <div className="report-info">
              <h3>{report.type}</h3>
              <p>File: {report.file_name}</p>
              <p>Status: {report.status}</p>
              <p>Uploaded: {new Date(report.created_at).toLocaleDateString()}</p>
            </div>
            <div className="report-actions">
              <a
                href={report.file_path}
                target="_blank"
                rel="noopener noreferrer"
                className="view-button"
              >
                View
              </a>
              <button
                onClick={() => handleDelete(report.id)}
                disabled={deleteMutation.isLoading}
                className="delete-button"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
