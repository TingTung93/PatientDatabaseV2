import { BloodProfile } from './blood';
export type { BloodProfile };

export interface PatientIdentification {
  id: string;
  mrn: string; // Medical Record Number
  ssn?: string; // Social Security Number (optional)
  fmp?: string; // Family Member Prefix (military)
  externalIds?: { [key: string]: string };
}

export interface Demographics {
  firstName: string;
  middleName?: string;
  lastName: string;
  dateOfBirth: string;
  gender: 'M' | 'F' | 'O'; // M = Male, F = Female, O = Other
  race?: string;
  ethnicity?: string;
  contactNumber: string;
  email: string;
}

export interface MedicalHistory {
  allergies: string[];
  conditions: string[];
  medications: string[];
  surgeries: string[];
  familyHistory?: string[];
  procedures: string[];
}

export interface Comment {
  id: string;
  text: string;
  createdAt: string;
  createdBy: string;
  updatedAt?: string;
  updatedBy?: string;
  type: 'CLINICAL' | 'ADMINISTRATIVE' | 'CAUTION' | 'OTHER';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: 'ACTIVE' | 'RESOLVED' | 'ARCHIVED';
}

export interface Note {
  id: string;
  title: string;
  content: string;
  category: 'TRANSFUSION' | 'PROCEDURE' | 'OBSERVATION' | 'OTHER';
  createdAt: string;
  createdBy: string;
  updatedAt?: string;
  updatedBy?: string;
}

export const DEFAULT_COMMENT: Partial<Comment> = {
  type: 'CLINICAL',
  priority: 'MEDIUM',
  status: 'ACTIVE',
};

export const DEFAULT_NOTE: Partial<Note> = {
  category: 'OBSERVATION',
};

export interface Patient {
  id: string;
  identification: PatientIdentification;
  demographics: Demographics;
  bloodProfile: BloodProfile;
  medicalHistory: MedicalHistory;
  comments: Comment[];
  notes: Note[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
  cautionFlags?: string[];
  specialProcedures?: string[];
}

export interface PatientListResponse {
  data: Patient[];
  pagination: {
    total: number;
    page: number;
    pages: number;
  };
}

export interface CreatePatientRequest {
  identification: PatientIdentification;
  demographics: Demographics;
  bloodProfile: BloodProfile;
  medicalHistory: MedicalHistory;
  comments?: Comment[];
  notes?: Note[];
  cautionFlags?: string[];
  specialProcedures?: string[];
}

export interface UpdatePatientRequest {
  identification?: Partial<PatientIdentification>;
  demographics?: Partial<Demographics>;
  bloodProfile?: Partial<BloodProfile>;
  medicalHistory?: Partial<MedicalHistory>;
  comments?: Comment[];
  notes?: Note[];
  cautionFlags?: string[];
  specialProcedures?: string[];
}

export interface PatientSearchParams {
  mrn?: string;
  ssn?: string;
  fmp?: string;
  name?: string;
  dateOfBirth?: string;
  bloodType?: string;
  page?: number;
  limit?: number;
}

export interface AdvancedPatientSearchParams extends PatientSearchParams {
  dateStart?: string;
  dateEnd?: string;
  status?: string;
  condition?: string;
  cautionFlag?: string;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}

export interface BatchOperation {
  operations: Array<
    | {
        operation: 'create';
        patient: CreatePatientRequest;
      }
    | {
        operation: 'update';
        id: string;
        patient: UpdatePatientRequest;
      }
    | {
        operation: 'delete';
        id: string;
      }
  >;
}

export interface BatchOperationResult {
  success: boolean;
  results: Array<
    | {
        operation: 'create';
        success: boolean;
        data: Patient;
      }
    | {
        operation: 'update';
        success: boolean;
        data: Patient;
      }
    | {
        operation: 'delete';
        success: boolean;
        id: string;
      }
  >;
}

// Add BloodType export
export type BloodType = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';
