import React from 'react';
import { Upload, Button, List } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import type { UploadFile } from 'antd/es/upload/interface';

interface ReportAttachmentsProps {
  attachments: UploadFile[];
  onUpload?: (file: File) => void;
  onRemove?: (file: UploadFile) => void;
}

export const ReportAttachments: React.FC<ReportAttachmentsProps> = ({
  attachments,
  onUpload,
  onRemove,
}) => {
  return (
    <div>
      <Upload
        fileList={attachments}
        onRemove={onRemove}
        beforeUpload={(file) => {
          onUpload?.(file);
          return false;
        }}
      >
        <Button icon={<UploadOutlined />}>Upload Attachment</Button>
      </Upload>
      <List
        itemLayout="horizontal"
        dataSource={attachments}
        renderItem={(file) => (
          <List.Item>
            <List.Item.Meta
              title={file.name}
              description={`Size: ${(file.size || 0) / 1024} KB`}
            />
          </List.Item>
        )}
      />
    </div>
  );
}; 