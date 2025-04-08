import React from 'react';
import { Card, Typography, Divider, Tag, Button, Space } from 'antd';
import { CopyOutlined, RedoOutlined } from '@ant-design/icons';
import type { OcrResult } from '../../types/ocr';
import { OcrResult as OcrResultViewer } from './OcrResult';

const { Title, Text, Paragraph } = Typography;

interface OCRResultsProps {
  result: OcrResult;
  onReset: () => void;
}

const OCRResults: React.FC<OCRResultsProps> = ({ result, onReset }) => {
  const handleCopy = (text: string) => {
    navigator.clipboard
      .writeText(text)
      .then(() => console.log('Text copied to clipboard'))
      .catch(err => console.error('Failed to copy text: ', err));
  };

  const renderStructuredData = (data: any) => {
    if (!data) return <Text italic>No structured data extracted.</Text>;
    return Object.entries(data).map(([key, value]) => (
      <div key={key} className="mb-2">
        <Text strong className="capitalize">
          {key.replace(/_/g, ' ')}:{' '}
        </Text>
        {Array.isArray(value) ? (
          <Space wrap size={[0, 8]}>
            {value.map((item, index) => (
              <Tag key={index} color="blue">
                {String(item)}
              </Tag>
            ))}
          </Space>
        ) : (
          <Text>{String(value)}</Text>
        )}
      </div>
    ));
  };

  return (
    <Card
      title="OCR Extraction Results"
      extra={
        <Button icon={<RedoOutlined />} onClick={onReset}>
          Upload New
        </Button>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <Title level={4}>Extracted Text</Title>
          <div className="relative p-4 border rounded bg-gray-50 max-h-96 overflow-y-auto mb-4">
            <Button
              icon={<CopyOutlined />}
              size="small"
              onClick={() => handleCopy(result.text || '')}
              className="absolute top-2 right-2 z-10"
            >
              Copy
            </Button>
            <Paragraph className="whitespace-pre-wrap">
              {result.text || <Text italic>No text extracted.</Text>}
            </Paragraph>
          </div>
        </div>

        <div>
          <Title level={4}>Structured Data</Title>
          <div className="p-4 border rounded bg-gray-50 min-h-96">
            {renderStructuredData(result.metadata?.['structured_data'])}
          </div>
        </div>
      </div>

      <Divider />

      <OcrResultViewer result={result} />
    </Card>
  );
};

export default OCRResults;
