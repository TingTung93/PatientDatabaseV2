export interface CautionCardUploadProps {
  onUploadSuccess?: () => void;
  onUpload?: (file: File) => Promise<{ success: boolean; message: string; cardId: number; }>;
  acceptedFileTypes?: string[];
  maxFileSize?: number;
  isLoading?: boolean;
} 