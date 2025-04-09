import type { Meta, StoryObj } from '@storybook/react';
import { CautionCard } from '../../components/caution-cards/CautionCard';
import { Patient } from '../../types/patient'; // Corrected path (up two levels)
import { CautionCard as CautionCardType } from '../../types/cautionCard'; // Corrected path (up two levels)

// Add empty export to treat as module
export {};

const basePatient: Patient = {
  id: 'patient-123', // Root ID
  firstName: 'Base', // Add top-level firstName
  lastName: 'Patient', // Add top-level lastName
  identification: {
    id: '1', // This might be a different ID concept, keeping as is
    mrn: 'MRN789',
    fmp: '01',
    ssn: '***-**-1234',
  },
  demographics: {
    firstName: 'Base', // Keep in demographics too
    lastName: 'Patient', // Keep in demographics too
    dateOfBirth: '1980-05-20',
    gender: 'M',
    contactNumber: '555-9876',
    email: 'base.patient@example.com',
  },
  // Add missing required fields
  bloodProfile: { // Add default BloodProfile
    abo: 'O', // Use valid ABO type
    rh: '+', // Use valid RhD type
    phenotype: { rh: {}, kell: {}, duffy: {}, kidd: {}, mns: {} },
    antibodies: [],
  },
  medicalHistory: { // Add default MedicalHistory
    allergies: [],
    conditions: [],
    medications: [],
    surgeries: [],
    procedures: [],
  },
  comments: [], // Add empty comments array
  notes: [], // Add empty notes array
  createdAt: new Date().toISOString(), // Add createdAt
  updatedAt: new Date().toISOString(), // Add updatedAt
  createdBy: 'storybook', // Add createdBy
  updatedBy: 'storybook', // Add updatedBy
  // ... rest of basePatient properties ...
}; 