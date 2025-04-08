import React from 'react';
import { Card, Typography, Button } from 'antd';
import { WarningOutlined } from '@ant-design/icons';

const { Text } = Typography;

export interface OcrErrorProps {
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export const OcrError: React.FC<OcrErrorProps> = ({
  message = 'An error occurred during OCR processing.',
  onRetry,
  className = '',
}) => {
  return (
    <Card className={`text-center p-6 ${className}`}>
      <div className="flex flex-col items-center gap-4">
        <WarningOutlined className="text-4xl text-red-500" />
        <Text type="danger">{message}</Text>
        {onRetry && (
          <Button type="primary" onClick={onRetry}>
            Retry Processing
          </Button>
        )}
      </div>
    </Card>
  );
}; 