import axios from 'axios';

const BASE_URL = 'http://localhost:5000/api';

export interface OCRJobStatus {
  jobId: string;
  status: 'processing' | 'completed' | 'failed';
  progress: number;
  results?: {
    extractedText: string;
    confidenceScore: number;
    fields: {
      bloodType?: string;
      patientName?: string;
      [key: string]: string | undefined;
    };
  };
}

export interface OCRProcessResponse {
  jobId: string;
  status: 'processing';
  message: string;
}

class OCRService {
  async processDocument(formData: FormData): Promise<OCRProcessResponse> {
    const response = await axios.post(`${BASE_URL}/ocr/process`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  async getJobStatus(jobId: string): Promise<OCRJobStatus> {
    const response = await axios.get(`${BASE_URL}/ocr/status/${jobId}`);
    return response.data;
  }

  // Helper method to poll job status until completion
  async pollJobStatus(jobId: string, onProgress?: (status: OCRJobStatus) => void): Promise<OCRJobStatus> {
    const poll = async (): Promise<OCRJobStatus> => {
      const status = await this.getJobStatus(jobId);
      
      if (onProgress) {
        onProgress(status);
      }

      if (status.status === 'processing') {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before next poll
        return poll();
      }

      return status;
    };

    return poll();
  }
}

export const ocrService = new OCRService(); 