import type { Meta, StoryObj } from '@storybook/react';
import { PatientManagement } from '../components/patient/PatientManagement';
import { Patient, Demographics, BloodProfile, MedicalHistory, Comment, Note } from '../types/patient';
import React from 'react';

export {};

const meta = {
  title: 'Components/PatientManagement',
  component: PatientManagement,
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof PatientManagement>;

export default meta;
type Story = StoryObj<typeof meta>;

const mockPatient: Patient = {
  id: 'story-123',
  firstName: 'Story',
  lastName: 'Example',
  identification: {
    id: '123',
    mrn: 'MRN11223',
    fmp: '02',
    ssn: '***-**-5678',
  },
  demographics: {
    firstName: 'Story',
    lastName: 'Example',
    dateOfBirth: '1995-02-15',
    gender: 'M',
    contactNumber: '555-1122',
    email: 'story.example@example.com',
  },
  bloodProfile: {
    abo: 'O',
    rh: '+',
    phenotype: { rh: {}, kell: {}, duffy: {}, kidd: {}, mns: {} },
    antibodies: [],
  },
  medicalHistory: {
    allergies: [],
    conditions: [],
    medications: [],
    surgeries: [],
    procedures: [],
  },
  comments: [],
  notes: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  createdBy: 'storybook',
  updatedBy: 'storybook',
};

export const CreateMode: Story = {
  args: {
    onCreate: async (data: Omit<Patient, 'id' | 'identification' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'>) => {
      console.log('Create Patient:', data);
      await new Promise(resolve => setTimeout(resolve, 500));
      const newPatientBase: Omit<
          Patient,
          'id' | 'identification' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'
        > = {
        firstName: data['demographics'].firstName,
        lastName: data['demographics'].lastName,
        demographics: data['demographics'],
        bloodProfile: data['bloodProfile'],
        medicalHistory: data['medicalHistory'],
        comments: data['comments'] || [],
        notes: data['notes'] || [],
        cautionFlags: data['cautionFlags'] || [],
        specialProcedures: data['specialProcedures'] || [],
      };
      const createdPatient: Patient = {
        id: `new-${Date.now()}`,
        identification: { id: `new-${Date.now()}`, mrn: `MRN-${Date.now().toString().slice(-4)}` },
        ...newPatientBase,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'storybook-user',
        updatedBy: 'storybook-user',
      };
      return { success: true, message: 'Patient created', patient: createdPatient };
    },
  },
};

export const EditMode: Story = {
  args: {
    patient: mockPatient,
  }
};

// ... other stories ... 