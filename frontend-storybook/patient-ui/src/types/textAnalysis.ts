// Basic types for text analysis results

export interface AnalysisResult {
  summary: string;
  keywords: string[];
  // Add fields based on OcrResult.tsx usage
  entities: { text: string; type: string; confidence: number }[];
  keyPhrases: string[];
  sentiment: { label: string; score: number };
  // Add other potential fields like sentiment, entities, etc. as needed
}

export interface StructuredData {
  // Define fields based on expected structured output
  // Example:
  patientName?: string;
  diagnosis?: string;
  medications?: { name: string; dosage: string; frequency?: string }[];
  // Add fields based on OcrResult.tsx usage
  patientInfo?: { name?: string; dob?: string; mrn?: string };
  labResults?: { testName: string; value: string; unit: string; referenceRange?: string }[];
  diagnoses?: string[];
  // ... other extracted fields
} 