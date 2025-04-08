import React, { useState, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { cautionCardService } from '../../services/cautionCardService';
import { ocrService } from '../../services/ocrService';

/* global console */

interface CautionCardUploadResult {
  id: number;
  // Add other fields that come back from the API if needed
}

interface CautionCardUploadProps {
  patientId: string;
  onUploadComplete?: () => void;
  onSuccess?: () => void;
  onError?: (message: string) => void;
}

export const CautionCardUpload: React.FC<CautionCardUploadProps> = ({ 
  patientId, 
  onUploadComplete, 
  onSuccess, 
  onError 
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [bloodType, setBloodType] = useState('');
  const [antibodies, setAntibodies] = useState<string[]>([]);
  const [transfusionRequirements, setTransfusionRequirements] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadMutation = useMutation<CautionCardUploadResult, Error, FormData>({
    mutationFn: async (formData: FormData) => {
      // First process with OCR
      const ocrResponse = await ocrService.processDocument(formData);
      
      // Poll for OCR completion
      const ocrResult = await ocrService.pollJobStatus(ocrResponse.jobId, (status) => {
        setOcrProgress(status.progress);
      });

      if (ocrResult.status === 'completed' && ocrResult.results) {
        // Update form with OCR results
        if (ocrResult.results.fields.bloodType) {
          setBloodType(ocrResult.results.fields.bloodType);
        }
      }

      // Create a new FormData instance for the caution card upload
      const uploadFormData = new FormData();
      uploadFormData.append('file', formData.get('file') as File);
      uploadFormData.append('patientId', patientId);
      uploadFormData.append('bloodType', bloodType);
      uploadFormData.append('antibodies', JSON.stringify(antibodies));
      uploadFormData.append('transfusionRequirements', JSON.stringify(transfusionRequirements));

      return await cautionCardService.processCautionCard(uploadFormData);
    },
    onSuccess: (result) => {
      // eslint-disable-next-line no-console
      console.log('Caution Card processed successfully! ID:', result.id);
      onSuccess?.();
      onUploadComplete?.();
      
      // Reset form
      setFile(null);
      setBloodType('');
      setAntibodies([]);
      setTransfusionRequirements([]);
      setOcrProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setIsProcessing(false);
    },
    onError: (error: Error) => {
      const message = error.message || 'An unknown error occurred during upload.';
      setUploadError(message);
      onError?.(message);
      setIsProcessing(false);
    }
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!file) return;

    setIsProcessing(true);
    setUploadError(null);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      await uploadMutation.mutateAsync(formData);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An unknown error occurred during upload.';
      setUploadError(message);
    }
  };

  const handleAntibodyChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setAntibodies(value.split(',').map(item => item.trim()).filter(Boolean));
  };

  const handleRequirementsChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setTransfusionRequirements(value.split(',').map(item => item.trim()).filter(Boolean));
  };

  return (
    <div className="caution-card-upload">
      <h3>Upload Caution Card</h3>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="file">Card Image:</label>
          <input
            ref={fileInputRef}
            type="file"
            id="file"
            accept="image/*"
            onChange={handleFileChange}
            disabled={isProcessing}
          />
        </div>

        <div>
          <label htmlFor="bloodType">Blood Type:</label>
          <input
            type="text"
            id="bloodType"
            value={bloodType}
            onChange={(e) => setBloodType(e.target.value)}
            disabled={isProcessing}
          />
        </div>

        <div>
          <label htmlFor="antibodies">Antibodies (comma-separated):</label>
          <input
            type="text"
            id="antibodies"
            value={antibodies.join(', ')}
            onChange={handleAntibodyChange}
            disabled={isProcessing}
            placeholder="e.g. Anti-K, Anti-D"
          />
        </div>

        <div>
          <label htmlFor="requirements">Transfusion Requirements (comma-separated):</label>
          <input
            type="text"
            id="requirements"
            value={transfusionRequirements.join(', ')}
            onChange={handleRequirementsChange}
            disabled={isProcessing}
            placeholder="e.g. Washed, Irradiated"
          />
        </div>

        {isProcessing && (
          <div className="progress">
            <div>Processing... {ocrProgress}%</div>
            <progress value={ocrProgress} max="100" />
          </div>
        )}

        <button type="submit" disabled={!file || isProcessing}>
          {isProcessing ? 'Processing...' : 'Upload'}
        </button>
        {uploadError && <div className="error-message" style={{ color: 'red', marginTop: '10px' }}>{uploadError}</div>}
      </form>
    </div>
  );
}; 