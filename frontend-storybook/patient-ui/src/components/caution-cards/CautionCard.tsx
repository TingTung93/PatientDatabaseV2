import React, { useState } from 'react';
import { Card, Button, Tag, Modal, Tooltip } from '../common';
import { CautionCard as ICautionCard } from '../../types/cautionCard';
import { formatDate } from '../../utils/dateUtils';

interface CautionCardProps {
  card: ICautionCard;
  onReview?: (card: ICautionCard) => void;
  onLink?: (card: ICautionCard) => void;
  showActions?: boolean;
  className?: string;
}

export const CautionCard: React.FC<CautionCardProps> = ({
  card,
  onReview,
  onLink,
  showActions = true,
  className = '',
}): JSX.Element => {
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [showOcrText, setShowOcrText] = useState(false);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);

  const {
    blood_type,
    antibodies,
    transfusion_requirements,
    status,
    reviewed_date,
    reviewed_by,
    created_at,
    file_path,
    ocr_text,
  } = card;

  const handleCopy = async (text: string, label: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess(label);
      setTimeout(() => setCopySuccess(null), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  const copyCardInfo = (): void => {
    const info = `
Blood Type: ${blood_type || 'N/A'}
Antibodies: ${antibodies.join(', ') || 'None'}
Transfusion Requirements: ${transfusion_requirements.join(', ') || 'None'}
Status: ${status}
${status === 'reviewed' ? `Reviewed by: ${reviewed_by} on ${formatDate(reviewed_date!)}` : ''}
Created: ${formatDate(created_at)}
    `.trim();
    handleCopy(info, 'Card Info');
  };

  return (
    <Card className={`p-4 ${className}`}>
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-start gap-4">
          {file_path && (
            <div
              className="w-16 h-16 bg-gray-100 rounded cursor-pointer overflow-hidden"
              onClick={() => setShowImagePreview(true)}
            >
              <img src={file_path} alt="Caution Card" className="w-full h-full object-cover" />
            </div>
          )}
          <div>
            <h3 className="text-lg font-semibold mb-2">
              Caution Card {card.id}
              <Tag className="ml-2" color={status === 'reviewed' ? 'green' : 'yellow'}>
                {status}
              </Tag>
            </h3>
            <p className="text-sm text-gray-600">Created: {formatDate(created_at)}</p>
          </div>
        </div>
        {showActions && (
          <div className="flex gap-2">
            <Tooltip content={copySuccess || 'Copy card info'}>
              <Button
                variant="text"
                size="sm"
                onClick={copyCardInfo}
                className="text-gray-500 hover:text-gray-700"
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
            </Tooltip>
            {ocr_text && (
              <Button
                variant="text"
                size="sm"
                onClick={() => setShowOcrText(true)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                  <path
                    fillRule="evenodd"
                    d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z"
                    clipRule="evenodd"
                  />
                </svg>
              </Button>
            )}
            {status !== 'reviewed' && onReview && (
              <Button variant="secondary" size="sm" onClick={() => onReview(card)}>
                Review
              </Button>
            )}
            {!card.patient_id && onLink && (
              <Button variant="primary" size="sm" onClick={() => onLink(card)}>
                Link to Patient
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="space-y-4">
        {blood_type && (
          <div>
            <h4 className="font-medium text-gray-700">Blood Type</h4>
            <p className="text-lg font-semibold text-red-600">{blood_type}</p>
          </div>
        )}

        {antibodies.length > 0 && (
          <div>
            <h4 className="font-medium text-gray-700 mb-2">Antibodies</h4>
            <div className="flex flex-wrap gap-2">
              {antibodies.map((antibody, index) => (
                <Tag
                  key={index}
                  color="red"
                  onClick={() => handleCopy(antibody, antibody)}
                  className="cursor-pointer hover:opacity-80"
                >
                  {antibody}
                </Tag>
              ))}
            </div>
          </div>
        )}

        {transfusion_requirements.length > 0 && (
          <div>
            <h4 className="font-medium text-gray-700 mb-2">Transfusion Requirements</h4>
            <div className="flex flex-wrap gap-2">
              {transfusion_requirements.map((req, index) => (
                <Tag
                  key={index}
                  color="blue"
                  onClick={() => handleCopy(req, req)}
                  className="cursor-pointer hover:opacity-80"
                >
                  {req}
                </Tag>
              ))}
            </div>
          </div>
        )}

        {status === 'reviewed' && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              Reviewed by {reviewed_by} on {formatDate(reviewed_date!)}
            </p>
          </div>
        )}
      </div>

      {/* Image Preview Modal */}
      <Modal
        isOpen={showImagePreview}
        onClose={() => setShowImagePreview(false)}
        title="Caution Card Image"
      >
        <div className="max-h-[80vh] overflow-auto">
          <img src={file_path} alt="Caution Card" className="w-full h-auto" />
        </div>
      </Modal>

      {/* OCR Text Modal */}
      <Modal isOpen={showOcrText} onClose={() => setShowOcrText(false)} title="OCR Text Content">
        <div className="max-h-[80vh] overflow-auto">
          <pre className="whitespace-pre-wrap font-mono text-sm bg-gray-50 p-4 rounded">
            {ocr_text}
          </pre>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleCopy(ocr_text || '', 'OCR Text')}
            className="mt-4"
          >
            Copy OCR Text
          </Button>
        </div>
      </Modal>
    </Card>
  );
};

export default CautionCard;
