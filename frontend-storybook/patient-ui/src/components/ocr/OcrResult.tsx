import React, { useState, useEffect } from 'react';
import { Card, Button, Tag, Modal, Progress, Tabs } from 'antd';
import { OcrResult as IOcrResult, OcrStatus } from '../../types/ocr'; // Import IOcrResult
import { formatDate } from '../../utils/dateUtils';
import { useTextAnalysis } from '../../hooks/useTextAnalysis';
import { LoadingSpinner } from '../common/LoadingSpinner';

export interface OcrResultProps {
  result: IOcrResult; // Use imported type
  onRetry?: () => void;
  onDelete?: () => void;
  className?: string;
}

export const OcrResult: React.FC<OcrResultProps> = ({
  result,
  onRetry,
  onDelete,
  className = '',
}) => {
  const [showPreview, setShowPreview] = useState(false);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'text' | 'analysis' | 'structured'>('text');
  const [analysisActivated, setAnalysisActivated] = useState(false);
  const [structuredActivated, setStructuredActivated] = useState(false);

  const {
    file_name,
    file_path,
    status,
    text,
    confidence,
    error,
    created_at,
    updated_at,
    progress,
  } = result;

  useEffect(() => {
    if (activeTab === 'analysis' && !analysisActivated) {
      setAnalysisActivated(true);
    }
    if (activeTab === 'structured' && !structuredActivated) {
      setStructuredActivated(true);
    }
  }, [activeTab, analysisActivated, structuredActivated]);

  // Initialize hooks unconditionally
  const { useAnalysis, useStructuredData, useSuggestions } = useTextAnalysis({
    text: text || '', // Pass empty string if text is null
    analysisEnabled: analysisActivated,
    structuredEnabled: structuredActivated,
    suggestionsEnabled: analysisActivated || structuredActivated,
  });

  // Call sub-hooks unconditionally
  const { data: analysisData, isLoading: analysisLoading, error: analysisError } = useAnalysis();

  const {
    data: structuredData,
    isLoading: structuredLoading,
    error: structuredError,
  } = useStructuredData();

  const { data: suggestions, error: suggestionsError } = useSuggestions();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text || '');
      setCopySuccess('Text copied!');
      setTimeout(() => setCopySuccess(null), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
      setCopySuccess('Failed to copy');
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case OcrStatus.Completed:
        return 'green';
      case OcrStatus.Processing:
        return 'yellow';
      case OcrStatus.Failed:
        return 'red';
      default:
        return 'gray';
    }
  };

  const getStatusMessage = () => {
    switch (status) {
      case OcrStatus.Completed:
        return 'Processing complete';
      case OcrStatus.Processing:
        return progress ? `Processing: ${progress}%` : 'Processing...';
      case OcrStatus.Failed:
        return 'Processing failed';
      case OcrStatus.Pending:
        return 'Waiting to process';
      default:
        return status;
    }
  };

  const renderStructuredData = () => {
    if (structuredLoading) {
      return (
        <div className="flex justify-center p-4">
          <LoadingSpinner message="Loading structured data..." />
        </div>
      );
    }
    if (structuredError) {
      return (
        <div className="p-3 bg-red-50 text-red-700 rounded">
          <p className="font-medium">Error loading structured data</p>
          <p className="text-sm">{structuredError.message}</p>
        </div>
      );
    }
    if (!structuredData || Object.keys(structuredData).length === 0) {
      return <p className="text-sm text-gray-500 text-center p-4">No structured data extracted.</p>;
    }

    return (
      <div className="space-y-4">
        {structuredData.patientInfo && (
          <div>
            <h5 className="font-medium mb-2">Patient Information</h5>
            <div className="bg-gray-50 p-3 rounded">
              {structuredData.patientInfo.name && (
                <p>
                  <span className="font-medium">Name:</span> {structuredData.patientInfo.name}
                </p>
              )}
              {structuredData.patientInfo.dob && (
                <p>
                  <span className="font-medium">DOB:</span> {structuredData.patientInfo.dob}
                </p>
              )}
              {structuredData.patientInfo.mrn && (
                <p>
                  <span className="font-medium">MRN:</span> {structuredData.patientInfo.mrn}
                </p>
              )}
            </div>
          </div>
        )}

        {structuredData.labResults && structuredData.labResults.length > 0 && (
          <div>
            <h5 className="font-medium mb-2">Lab Results</h5>
            <div className="bg-gray-50 p-3 rounded space-y-2">
              {structuredData.labResults.map((result, index) => (
                <div key={index} className="border-b last:border-b-0 pb-2">
                  <p className="font-medium">{result.testName}</p>
                  <p>
                    {result.value} {result.unit}
                  </p>
                  {result.referenceRange && (
                    <p className="text-sm text-gray-600">Reference: {result.referenceRange}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {structuredData.medications && structuredData.medications.length > 0 && (
          <div>
            <h5 className="font-medium mb-2">Medications</h5>
            <div className="bg-gray-50 p-3 rounded space-y-2">
              {structuredData.medications.map((med, index) => (
                <div key={index} className="border-b last:border-b-0 pb-2">
                  <p className="font-medium">{med.name}</p>
                  <p>{med.dosage}</p>
                  {med.frequency && <p className="text-sm text-gray-600">{med.frequency}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {structuredData.diagnoses && structuredData.diagnoses.length > 0 && (
          <div>
            <h5 className="font-medium mb-2">Diagnoses</h5>
            <div className="bg-gray-50 p-3 rounded">
              <ul className="list-disc list-inside">
                {structuredData.diagnoses.map((diagnosis, index) => (
                  <li key={index}>{diagnosis}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderAnalysis = () => {
    if (analysisLoading) {
      return (
        <div className="flex justify-center p-4">
          <LoadingSpinner message="Analyzing text..." />
        </div>
      );
    }
    if (analysisError) {
      return (
        <div className="p-3 bg-red-50 text-red-700 rounded">
          <p className="font-medium">Error loading analysis</p>
          <p className="text-sm">{analysisError.message}</p>
        </div>
      );
    }
    if (!analysisData || analysisData.entities?.length === 0) {
      return <p className="text-sm text-gray-500 text-center p-4">No analysis data available.</p>;
    }

    return (
      <div className="space-y-4">
        {analysisData.entities.length > 0 && (
          <div>
            <h5 className="font-medium mb-2">Entities</h5>
            <div className="flex flex-wrap gap-2">
              {analysisData.entities.map((entity, index) => (
                <Tag key={index} color={entity.confidence > 0.8 ? 'green' : 'yellow'}>
                  {entity.text} ({entity.type})
                </Tag>
              ))}
            </div>
          </div>
        )}

        {analysisData.keyPhrases.length > 0 && (
          <div>
            <h5 className="font-medium mb-2">Key Phrases</h5>
            <div className="flex flex-wrap gap-2">
              {analysisData.keyPhrases.map((phrase, index) => (
                <Tag key={index} color="blue">
                  {phrase}
                </Tag>
              ))}
            </div>
          </div>
        )}

        {analysisData.sentiment && (
          <div>
            <h5 className="font-medium mb-2">Sentiment</h5>
            <Tag
              color={
                analysisData.sentiment.label === 'positive'
                  ? 'green'
                  : analysisData.sentiment.label === 'negative'
                    ? 'red'
                    : 'gray'
              }
            >
              {analysisData.sentiment.label} ({Math.round(analysisData.sentiment.score * 100)}%)
            </Tag>
          </div>
        )}

        {suggestions && suggestions.length > 0 && !suggestionsError && (
          <div>
            <h5 className="font-medium mb-2">Suggestions</h5>
            <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
              {suggestions.map((suggestion, index) => (
                <li key={index}>{suggestion}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'text':
        return (
          <pre className="whitespace-pre-wrap font-mono text-sm break-words">
            {text || 'No text extracted.'}
          </pre>
        );
      case 'analysis':
        return renderAnalysis();
      case 'structured':
        return renderStructuredData();
      default:
        return null;
    }
  };

  return (
    <Card className={`p-4 ${className}`}>
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-start gap-4">
          {file_path && (
            <div
              className="w-16 h-16 bg-gray-100 rounded cursor-pointer overflow-hidden"
              onClick={() => setShowPreview(true)}
            >
              <img src={file_path} alt="OCR Document" className="w-full h-full object-cover" />
            </div>
          )}
          <div className="flex-1">
            <h3 className="text-lg font-semibold mb-2">
              {file_name}
              <Tag className="ml-2" color={getStatusColor()}>
                {getStatusMessage()}
              </Tag>
            </h3>
            <p className="text-sm text-gray-600">
              Created: {formatDate(created_at)}
              {updated_at && ` • Updated: ${formatDate(updated_at)}`}
            </p>
            {status === OcrStatus.Processing && progress !== undefined && (
              <div className="mt-2">
                <Progress percent={progress} strokeColor="blue" size="small" className="w-48" />
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {text && (
            <Button
              type="text"
              size="small"
              onClick={handleCopy}
              className="text-gray-500 hover:text-gray-700"
              title={copySuccess || 'Copy text'}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
              </svg>
            </Button>
          )}
          {status === OcrStatus.Failed && onRetry && (
            <Button
              type="default"
              size="small"
              onClick={onRetry}
              className="text-red-500 hover:text-red-700"
            >
              Retry
            </Button>
          )}
          {onDelete && (
            <Button danger type="default" size="small" onClick={onDelete}>
              Delete
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded">
          <p className="font-medium">Error</p>
          <p className="text-sm">{error}</p>
        </div>
      )}

      {text && (
        <div className="space-y-2">
          <div className="flex items-center justify-between mb-4">
            <div className="flex-1">
              <Tabs
                activeKey={activeTab}
                onChange={key => setActiveTab(key as 'text' | 'analysis' | 'structured')}
                items={[
                  { key: 'text', label: 'Extracted Text', children: renderTabContent() },
                  {
                    key: 'analysis',
                    label: 'Analysis',
                    children: renderTabContent(),
                    disabled: !text || !!analysisError,
                  },
                  {
                    key: 'structured',
                    label: 'Structured Data',
                    children: renderTabContent(),
                    disabled: !text || !!structuredError,
                  },
                ]}
              />
            </div>
            {activeTab === 'text' && confidence && (
              <Tag color={confidence > 0.8 ? 'green' : confidence > 0.6 ? 'yellow' : 'red'}>
                Confidence: {Math.round(confidence * 100)}%
              </Tag>
            )}
          </div>

          <div className="bg-gray-50 p-4 rounded max-h-96 overflow-auto">{renderTabContent()}</div>
        </div>
      )}

      {/* Image Preview Modal */}
      <Modal open={showPreview} onClose={() => setShowPreview(false)} title={file_name}>
        <div className="max-h-[80vh] overflow-auto">
          <img src={file_path} alt="OCR Document" className="w-full h-auto" />
        </div>
      </Modal>
    </Card>
  );
};

export default OcrResult;
