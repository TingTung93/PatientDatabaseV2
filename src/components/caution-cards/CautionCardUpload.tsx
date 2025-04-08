import React, { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query'; // Correct package name
import { cautionCardService } from '../../services/cautionCardService';
import { ocrService } from '../../services/ocrService';

interface CautionCardUploadProps {
  patientId?: number;
  onUploadComplete?: () => void;
}

export const CautionCardUpload: React.FC<CautionCardUploadProps> = ({ patientId, onUploadComplete }) => {
  const [file, setFile] = useState<File | null>(null);
  const [bloodType, setBloodType] = useState('');
  const [antibodies, setAntibodies] = useState<string[]>([]);
  const [transfusionRequirements, setTransfusionRequirements] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null); // Add state for user-facing error
  const fileInputRef = useRef<HTMLInputElement>(null);

  const queryClient = useQueryClient();

  const uploadMutation = useMutation(
    async (formData: FormData) => {
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

      // Now upload the caution card
      formData.append('bloodType', bloodType);
      if (antibodies.length > 0) {
        formData.append('antibodies', JSON.stringify(antibodies));
      }
      if (transfusionRequirements.length > 0) {
        formData.append('transfusionRequirements', JSON.stringify(transfusionRequirements));
      }
      if (patientId) {
        formData.append('patientId', patientId.toString());
      }

      return cautionCardService.processCautionCard(formData);
    },
    {
      onSuccess: () => {
        setUploadError(null); // Clear error on success
        queryClient.invalidateQueries(['cautionCards']);
        setFile(null);
        setBloodType('');
        setAntibodies([]);
        setTransfusionRequirements([]);
        setIsProcessing(false);
        setOcrProgress(0);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        onUploadComplete?.();
      },
      onError: (error: any) => { // Use 'any' for now, better typing can be added later
        console.error('Upload failed:', error); // Keep detailed logging
        // Set user-friendly error message
        setUploadError('Upload failed. Please check the file or try again later.');
        setIsProcessing(false);
      },
    }
  );

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
    setUploadError(null); // Clear previous errors on new submission
    const formData = new FormData();
    formData.append('file', file);
    uploadMutation.mutate(formData);
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
        {uploadError && <div className="error-message" style={{ color: 'red', marginTop: '10px' }}>{uploadError}</div>} {/* Display error message */}
      </form>
    </div>
  );
}; 