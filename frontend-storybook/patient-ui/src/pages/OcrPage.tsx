import React, { useEffect } from 'react';
import { OcrUpload } from '../components/ocr/OcrUpload';
import { OcrResultsList } from '../components/ocr/OcrResultsList';
import { useOcr } from '../hooks/useOcr';
import { useWebSocketContext } from '../context/WebSocketContext';

export const OcrPage: React.FC = () => {
  const { handleOcrProgress } = useOcr();
  const { addMessageHandler, removeMessageHandler, isConnected } = useWebSocketContext();

  useEffect(() => {
    if (isConnected) {
      addMessageHandler(handleOcrProgress);
      console.log('OCR progress handler added.');
    }

    return () => {
      try {
        removeMessageHandler(handleOcrProgress);
        console.log('OCR progress handler removed.');
      } catch (e) {
        console.warn("Could not remove message handler during cleanup:", e);
      }
    };
  }, [isConnected, addMessageHandler, removeMessageHandler, handleOcrProgress]);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">OCR Processing</h1>
      
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Upload Document</h2>
        <OcrUpload />
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4">OCR Results</h2>
        <OcrResultsList />
      </div>
    </div>
  );
};

export default OcrPage; 