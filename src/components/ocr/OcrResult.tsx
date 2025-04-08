import React, { useEffect } from 'react';
import { Card, Tag, Tabs, Button, Modal } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { websocketService } from '../services/websocketService';

interface OcrResult {
  file_name: string;
  file_path: string;
  text: string | null;
  confidence: number;
  created_at: string;
  updated_at: string;
  status: 'completed' | 'failed';
  error?: string;
}

interface OcrResultProps {
  result: OcrResult;
  onRetry?: () => void;
}

export const OcrResult: React.FC<OcrResultProps> = ({ result, onRetry }) => {
  const [isPreviewVisible, setIsPreviewVisible] = React.useState(false);

  useEffect(() => {
    websocketService.connect();
    const handleMessage = (message: any) => {
      // Handle WebSocket message
      console.log('Received message:', message);
    };
    websocketService.addMessageHandler(handleMessage);
    return () => {
      websocketService.removeMessageHandler(handleMessage);
      websocketService.disconnect();
    };
  }, []);

  const handleCopyText = async () => {
    if (result.text) {
      try {
        await navigator.clipboard.writeText(result.text);
      } catch (err) {
        console.error('Failed to copy text:', err);
      }
    }
  };

  const showPreview = () => setIsPreviewVisible(true);
  const hidePreview = () => setIsPreviewVisible(false);

  return (
    <Card className="p-4 ">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-start gap-4">
          <div 
            className="w-16 h-16 bg-gray-100 rounded cursor-pointer overflow-hidden"
            onClick={showPreview}
          >
            <img 
              src={result.file_path} 
              alt="OCR Document" 
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold mb-2">
              {result.file_name}
              <Tag color={result.status === 'completed' ? 'green' : 'gray'} className="ml-2">
                {result.status === 'completed' ? 'Processing complete' : 'failed'}
              </Tag>
            </h3>
            <p className="text-sm text-gray-600">
              Created: {result.created_at} • Updated: {result.updated_at}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {result.text && (
            <Button
              type="text"
              size="small"
              className="text-gray-500 hover:text-gray-700"
              onClick={handleCopyText}
              title="Copy text"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-5 w-5"
              >
                <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
              </svg>
            </Button>
          )}
          {result.status === 'failed' && onRetry && (
            <Button
              type="text"
              size="small"
              className="text-gray-500 hover:text-gray-700"
              onClick={onRetry}
              title="Retry"
              aria-label="retry"
            >
              <ReloadOutlined className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>

      {result.status === 'failed' && result.error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded">
          <p className="font-medium">Error</p>
          <p className="text-sm">{result.error}</p>
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-center justify-between mb-4">
          <div className="flex-1">
            <Tabs
              items={[
                {
                  key: 'text',
                  label: 'Extracted Text',
                  children: result.text && (
                    <pre className="whitespace-pre-wrap font-mono text-sm break-words">
                      {result.text}
                    </pre>
                  ),
                },
                {
                  key: 'analysis',
                  label: 'Analysis',
                  disabled: !result.text,
                  children: <div>Analysis content</div>,
                },
                {
                  key: 'structured',
                  label: 'Structured Data',
                  disabled: !result.text,
                  children: <div>Structured data content</div>,
                },
              ]}
            />
          </div>
          {result.confidence > 0 && (
            <Tag color="green">
              Confidence: {result.confidence}%
            </Tag>
          )}
        </div>
      </div>

      <Modal
        title={result.file_name}
        open={isPreviewVisible}
        onCancel={hidePreview}
        onOk={hidePreview}
      >
        <div className="max-h-[80vh] overflow-auto">
          <img
            src={result.file_path}
            alt="OCR Document"
            className="w-full h-auto"
          />
        </div>
      </Modal>
    </Card>
  );
}; 