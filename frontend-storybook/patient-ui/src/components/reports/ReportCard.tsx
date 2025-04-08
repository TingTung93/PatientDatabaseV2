import React from 'react';
import { Card, Typography, Button, Space, Tag } from 'antd';
import { EditOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons';
// Update import path to use the standardized types
import { Report, ReportStatus, ReportType } from '../../types/report';

const { Text, Title } = Typography;

// Update status colors based on ReportStatus in report.ts
const getStatusColor = (status?: ReportStatus) => {
  switch (status) {
    case 'pending':
      return 'orange';
    case 'processing':
      return 'blue';
    case 'completed':
      return 'green';
    case 'error':
      return 'red';
    default:
      return 'default';
  }
};

// Update type colors based on ReportType in report.ts (or potential report.report_type string)
const getTypeColor = (type?: string) => {
  // Accept string as report_type is string
  switch (
    type?.toLowerCase() // Use lowercase for case-insensitivity
  ) {
    case 'lab':
      return 'blue';
    case 'imaging':
      return 'purple';
    case 'surgery':
      return 'red';
    case 'consultation':
      return 'cyan';
    case 'general':
      return 'geekblue'; // Example color
    case 'blood':
      return 'volcano'; // Example color for blood test
    // Add more cases as needed based on actual report_type values
    default:
      return 'default';
  }
};

interface ReportCardProps {
  report: Report; // Uses the imported Report type
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export const ReportCard: React.FC<ReportCardProps> = ({ report, onView, onEdit, onDelete }) => {
  // Default title if report.title is missing
  const reportTitle = report.title || report.file_name || 'Untitled Report';
  // Format dates safely
  const createdAt = report.created_at ? new Date(report.created_at).toLocaleDateString() : 'N/A';
  const updatedAt = report.updated_at ? new Date(report.updated_at).toLocaleDateString() : 'N/A';
  const showUpdated = report.updated_at && report.updated_at !== report.created_at;

  return (
    <Card>
      <div className="flex justify-between items-start gap-4">
        {' '}
        {/* Added gap */}
        <div className="flex-grow">
          {' '}
          {/* Allow text content to take space */}
          <Title level={4} className="mb-2">
            {reportTitle}
          </Title>
          <Space wrap className="mb-3">
            {' '}
            {/* Added wrap for tags */}
            {report.report_type && (
              <Tag color={getTypeColor(report.report_type)}>
                {/* Capitalize type for display */}
                {report.report_type.charAt(0).toUpperCase() + report.report_type.slice(1)}
              </Tag>
            )}
            <Tag color={getStatusColor(report.status)}>
              {/* Capitalize status for display */}
              {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
            </Tag>
          </Space>
          {/* Use report.content for the description */}
          {report.content && (
            <Typography.Paragraph
              className="text-gray-600 mb-4"
              ellipsis={{ rows: 2, expandable: false }}
            >
              {report.content}
            </Typography.Paragraph>
          )}
          <Text type="secondary" style={{ fontSize: '0.8em' }}>
            {' '}
            {/* Smaller font for dates */}
            Created: {createdAt}
            {showUpdated && ` • Updated: ${updatedAt}`}
          </Text>
        </div>
        {/* Ensure buttons don't shrink excessively */}
        <Space className="flex-shrink-0">
          <Button
            icon={<EyeOutlined />}
            onClick={onView}
            type="text" // Use text buttons for less emphasis
            size="small"
          />
          <Button
            icon={<EditOutlined />}
            onClick={onEdit}
            type="text"
            size="small"
            // Disable edit based on status
            disabled={report.status === 'completed' || report.status === 'error'}
          />
          <Button icon={<DeleteOutlined />} onClick={onDelete} type="text" danger size="small" />
        </Space>
      </div>
    </Card>
  );
};
