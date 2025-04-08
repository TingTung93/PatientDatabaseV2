import React from 'react';
import { Typography, Tag, Space, Divider } from 'antd';
import { Report, ReportStatus, ReportType } from '../../types/report'; // Corrected import path
import { ReportAttachments } from './ReportAttachments';

const { Title, Text, Paragraph } = Typography;

// Use string literals for status comparison
const getStatusColor = (status: ReportStatus): string => {
  switch (status) {
    case 'pending': // Use string literal
      return 'orange';
    case 'processing': // Use string literal
      return 'processing';
    // Assuming 'SUBMITTED' and 'REVIEWED' aren't actual statuses based on type def
    // case 'submitted': return 'processing';
    // case 'reviewed': return 'warning';
    case 'completed': // Use string literal
      return 'green';
    case 'error': // Use string literal
      return 'red';
    // Assuming 'ARCHIVED' isn't an actual status
    // case 'archived': return 'default';
    default:
      return 'default';
  }
};

// Use actual ReportType values and handle potential undefined
const getTypeColor = (type: ReportType | undefined): string => {
  switch (type) {
    case 'pdf':
      return 'red'; // Example color
    case 'docx':
      return 'blue'; // Example color
    case 'txt':
      return 'geekblue'; // Example color
    case 'csv':
      return 'green'; // Example color
    case 'xlsx':
      return 'purple'; // Example color
    default: // Handles undefined or other string values
      return 'default';
  }
};

interface ReportViewProps {
  report: Report;
}

export const ReportView: React.FC<ReportViewProps> = ({ report }) => {
  return (
    <div className="max-w-3xl">
      <Title level={2}>{report.title}</Title>

      <Space className="mb-4">
        {/* Only render tag if report_type is a valid ReportType */}
        {report.report_type &&
          ['pdf', 'docx', 'txt', 'csv', 'xlsx'].includes(report.report_type) && (
            <Tag color={getTypeColor(report.report_type as ReportType)}>{report.report_type}</Tag>
          )}
        <Tag color={getStatusColor(report.status)}>{report.status}</Tag>
      </Space>

      <Paragraph className="whitespace-pre-wrap mb-6">{report.content}</Paragraph>

      {/* Render attachments only if they exist and are not empty */}
      {report.attachments && report.attachments.length > 0 && (
        <>
          <Divider />
          <div className="mb-6">
            <Title level={4}>Attachments</Title>
            <ReportAttachments
              attachments={report.attachments} // Pass directly, already checked
              readOnly
            />
          </div>
        </>
      )}

      <Divider />

      <div className="text-gray-500">
        <Text>Created: {new Date(report.created_at).toLocaleDateString()}</Text>
        {report.updated_at !== report.created_at && (
          <>
            <Text className="mx-2">•</Text>
            <Text>Updated: {new Date(report.updated_at).toLocaleDateString()}</Text>
          </>
        )}
      </div>
    </div>
  );
};
