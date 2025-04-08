import React from 'react';
import { List, Empty } from 'antd';
import { Report } from '../../types/report'; // Corrected import path
import { ReportCard } from './ReportCard';

interface ReportListProps {
  reports: Report[];
  loading?: boolean;
  onViewReport: (report: Report) => void;
  onEditReport: (report: Report) => void;
  onDeleteReport: (report: Report) => void;
}

export const ReportList: React.FC<ReportListProps> = ({
  reports,
  loading = false,
  onViewReport,
  onEditReport,
  onDeleteReport,
}) => {
  if (!reports.length && !loading) {
    return <Empty description="No reports found" className="my-8" />;
  }

  return (
    <List
      dataSource={reports}
      loading={loading}
      renderItem={report => (
        <List.Item key={report.id}>
          <ReportCard
            report={report}
            onView={() => onViewReport(report)}
            onEdit={() => onEditReport(report)}
            onDelete={() => onDeleteReport(report)}
          />
        </List.Item>
      )}
      className="w-full"
    />
  );
};
