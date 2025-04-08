import { Patient as ServicePatient } from '../services/patientService';

// Re-export the Patient interface with explicit firstName and lastName properties
export interface Patient extends ServicePatient {
  // Explicitly include firstName and lastName to ensure they're recognized
  firstName: string;
  lastName: string;
}

// Export other related types
export interface PatientIdentification {
  id: string;
  mrn: string;
  fmp?: string;
  ssn?: string;
  externalIds?: Record<string, string>;
}

export interface Demographics {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  contactNumber: string;
  email: string;
}

export interface BloodProfile {
  abo: string;
  rh: string;
  phenotype: {
    rh: Record<string, any>;
    kell: Record<string, any>;
    duffy: Record<string, any>;
    kidd: Record<string, any>;
    mns: Record<string, any>;
  };
  antibodies: string[];
}

export interface MedicalHistory {
  allergies: string[];
  conditions: string[];
  medications: string[];
  surgeries: string[];
  procedures: string[];
}

export interface Comment {
  id: string;
  text: string;
  author: string;
  timestamp: string;
}

export interface Note {
  id: string;
  text: string;
  author: string;
  timestamp: string;
  category: string;
}
