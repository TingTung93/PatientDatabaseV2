import React, { useState } from 'react';
import { Card, Upload, Space, Alert, Progress, Typography, message } from 'antd'; // Import message
import {
  InboxOutlined,
  FileExcelOutlined,
  FilePdfOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import type { UploadFile } from 'antd/es/upload/interface'; // Removed UploadRequestOption import
import type { RcFile } from 'antd/es/upload';

const { Dragger } = Upload;
const { Text } = Typography;

interface ImportProgress {
  total: number;
  processed: number;
  successful: number;
  failed: number;
}

interface CautionCardImportProps {
  onImport: (file: RcFile) => Promise<void>;
  loading?: boolean;
  progress?: ImportProgress;
  acceptedFormats?: string[];
}

export const CautionCardImport: React.FC<CautionCardImportProps> = ({
  onImport,
  loading = false,
  progress,
  acceptedFormats = ['.csv', '.xlsx', '.pdf'],
}): JSX.Element => {
  const [fileList, setFileList] = useState<UploadFile[]>([]);

  const handleBeforeUpload = (file: RcFile): boolean => {
    const isAcceptedFormat = acceptedFormats.some(format =>
      file.name.toLowerCase().endsWith(format)
    );

    if (!isAcceptedFormat) {
      message.error(`File must be one of: ${acceptedFormats.join(', ')}`); // Use message.error
      return false;
    }

    const isLt10M = file.size / 1024 / 1024 < 10;
    if (!isLt10M) {
      message.error('File must be smaller than 10MB!'); // Use message.error
      return false;
    }

    return true;
  };

  return (
    <Card title="Import Caution Cards">
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <Alert
          message="Import Instructions"
          description={
            <ul>
              <li>Accepted formats: {acceptedFormats.join(', ')}</li>
              <li>Maximum file size: 10MB</li>
              <li>First row should contain column headers</li>
              <li>Required columns: Blood Type, Status</li>
            </ul>
          }
          type="info"
          showIcon
        />

        <Dragger
          name="file"
          multiple={false}
          fileList={fileList}
          beforeUpload={handleBeforeUpload}
          onChange={({ fileList }) => setFileList(fileList)}
          customRequest={async (options: any) => {
            // Use any as temporary workaround for options type
            const { file, onSuccess, onError } = options;
            try {
              // Ensure file is RcFile before passing to onImport
              if (typeof file !== 'string' && file instanceof File) {
                await onImport(file as RcFile);
                onSuccess?.('ok'); // Call onSuccess on successful import
              } else {
                throw new Error('Invalid file type received in customRequest');
              }
            } catch (error) {
              console.error('Import error:', error);
              onError?.(error as Error); // Call onError on failure
            }
          }}
          showUploadList={{
            showPreviewIcon: false,
            showRemoveIcon: !loading,
          }}
        >
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p className="ant-upload-text">Click or drag file to this area to upload</p>
          <p className="ant-upload-hint">
            Support for single file upload. Strict validation for file format and size.
          </p>
        </Dragger>

        {progress && (
          <Card size="small">
            <Space direction="vertical" style={{ width: '100%' }}>
              <div>
                <Text>
                  Processing: {progress.processed} of {progress.total}
                </Text>
                <Progress
                  percent={Math.round((progress.processed / progress.total) * 100)}
                  status="active"
                />
              </div>

              <Space split="|">
                <Text type="success">Successful: {progress.successful}</Text>
                <Text type="danger">Failed: {progress.failed}</Text>
              </Space>
            </Space>
          </Card>
        )}
      </Space>
    </Card>
  );
};
