import { Meta, StoryObj } from '@storybook/react';
import { PatientCard } from '../components/patient/PatientCard';
import { Patient, Demographics, MedicalHistory } from '../types/patient';
import {
  BloodProfile,
  RhPhenotype,
  KellPhenotype,
  DuffyPhenotype,
  KiddPhenotype,
  MNSPhenotype,
} from '../types/blood';

// Helper to create a valid Patient object
const createMockPatient = (overrides: Partial<Patient> = {}): Patient => {
  const baseDemographics: Demographics = {
    firstName: 'John',
    lastName: 'Doe',
    dateOfBirth: '1990-01-01',
    gender: 'M',
    contactNumber: '555-0123',
    email: 'john.doe@example.com'
  };

  const baseBloodProfile: BloodProfile = {
    abo: 'A',
    rh: '+',
    phenotype: {
      rh: {},
      kell: {},
      duffy: {},
      kidd: {},
      mns: {}
    },
    antibodies: []
  };

  const baseMedicalHistory: MedicalHistory = {
    allergies: [],
    conditions: [],
    medications: [],
    surgeries: [],
    procedures: []
  };

  return {
    id: '1',
    firstName: overrides.demographics?.firstName || baseDemographics.firstName,
    lastName: overrides.demographics?.lastName || baseDemographics.lastName,
    identification: {
      id: '1',
      mrn: 'MRN123',
      externalIds: { ssn: '123-45-6789' },
    },
    demographics: { ...baseDemographics, ...overrides.demographics },
    bloodProfile: { ...baseBloodProfile, ...overrides.bloodProfile },
    medicalHistory: { ...baseMedicalHistory, ...overrides.medicalHistory },
    comments: [],
    notes: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'system',
    updatedBy: 'system',
    ...overrides,
  };
};

const mockPatient = createMockPatient();

const meta: Meta<typeof PatientCard> = {
  title: 'Patient/PatientCard',
  component: PatientCard,
  parameters: {
    layout: 'padded',
  },
};

export default meta;
type Story = StoryObj<typeof PatientCard>;

export const Default: Story = {
  args: {
    patient: mockPatient,
  },
};

export const WithEdit: Story = {
  args: {
    patient: mockPatient,
    onEdit: (id: string) => console.log('Edit patient:', id),
  },
};

export const WithDelete: Story = {
  args: {
    patient: mockPatient,
    onDelete: (id: string) => console.log('Delete patient:', id),
  },
};

export const WithAllActions: Story = {
  args: {
    patient: mockPatient,
    onEdit: (id: string) => console.log('Edit patient:', id),
    onDelete: (id: string) => console.log('Delete patient:', id),
  },
};
