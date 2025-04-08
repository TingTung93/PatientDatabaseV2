import type { Meta, StoryObj } from '@storybook/react';
import { PatientManagement } from './PatientManagement';
import { action } from '@storybook/addon-actions';
import { within, userEvent } from '@storybook/testing-library';
import { expect } from '@storybook/jest';
import { Patient, BloodProfile, MedicalHistory, Demographics } from '../../types/patient'; // Import necessary types from patient
import { BloodPhenotype } from '../../types/blood'; // Import BloodPhenotype from blood.ts

const meta: Meta<typeof PatientManagement> = {
  title: 'Patient/PatientManagement',
  component: PatientManagement,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    onCreate: { action: 'created' },
    onUpdate: { action: 'updated' },
    onDelete: { action: 'deleted' },
  },
};

export default meta;
type Story = StoryObj<typeof PatientManagement>;

// Default empty phenotype structure based on src/types/blood.ts
const defaultPhenotype: BloodPhenotype = {
  rh: {}, // Empty objects are valid per src/types/blood.ts
  kell: {},
  duffy: {},
  kidd: {},
  mns: {},
  other: {},
};

// Mock patient data
const mockPatient: Patient = {
  id: 'story-123',
  identification: {
    id: '123', // This seems like a separate identifier within identification
    mrn: 'MRN123',
    fmp: '456',
    ssn: '123-45-6789',
  },
  demographics: {
    firstName: 'John',
    lastName: 'Doe',
    dateOfBirth: '1990-01-01',
    gender: 'M',
    contactNumber: '555-1111',
    email: 'john.doe.story@example.com',
  },
  bloodProfile: {
    abo: 'A',
    rh: '+',
    phenotype: defaultPhenotype, // Use default empty phenotype
    antibodies: ['anti-K', 'anti-E'],
    restrictions: [],
    requirements: {
      immediateSpinRequired: false,
      salineToAHGRequired: false,
      preWarmRequired: false,
    },
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
  cautionFlags: [],
  specialProcedures: [],
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  createdBy: 'Dr. Smith',
  updatedBy: 'Dr. Smith',
};

// Loading state
export const Loading: Story = {
  args: {
    isLoading: true,
  },
};

// Empty state with create option
export const EmptyWithCreate: Story = {
  args: {
    onCreate: async patientData => {
      action('onCreate')(patientData);
      await new Promise(resolve => setTimeout(resolve, 500));
      // Construct the new patient object carefully to avoid duplicate ID issues
      const newPatientBase: Omit<
        Patient,
        'id' | 'identification' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'
      > = {
        demographics: patientData.demographics,
        bloodProfile: patientData.bloodProfile || mockPatient.bloodProfile, // Use provided or default
        medicalHistory: patientData.medicalHistory || mockPatient.medicalHistory,
        comments: patientData.comments || [],
        notes: patientData.notes || [],
        cautionFlags: patientData.cautionFlags || [],
        specialProcedures: patientData.specialProcedures || [],
      };
      return {
        success: true,
        message: 'Patient created successfully',
        patient: {
          ...newPatientBase, // Spread the core data first
          id: `new-${Date.now()}`, // Assign the new ID
          identification: {
            // Provide mock identification
            id: `ident-${Date.now()}`,
            mrn: `MRN-${Date.now().toString().slice(-6)}`,
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: 'StorybookUser',
          updatedBy: 'StorybookUser',
        },
      };
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const createButton = canvas.getByText(/create new patient/i);
    await userEvent.click(createButton);
    const form = await canvas.findByRole('form');
    expect(form).toBeInTheDocument();
  },
};

// Viewing existing patient
export const ViewingPatient: Story = {
  args: {
    patient: mockPatient,
    onUpdate: async (patientId: string, patientData) => {
      action('onUpdate')(patientId, patientData);
      await new Promise(resolve => setTimeout(resolve, 500));
      return {
        success: true,
        message: 'Patient updated successfully',
        patient: {
          ...mockPatient, // Start with original mock
          ...patientData, // Apply updates
          id: patientId, // Ensure ID matches
          updatedAt: new Date().toISOString(),
          updatedBy: 'StorybookUser',
        },
      };
    },
    onDelete: async (patientId: string) => {
      action('onDelete')(patientId);
      await new Promise(resolve => setTimeout(resolve, 500));
      return {
        success: true,
        message: 'Patient deleted successfully',
      };
    },
  },
};

// Editing patient
export const EditingPatient: Story = {
  args: {
    patient: mockPatient,
    onUpdate: async (patientId: string, patientData) => {
      action('onUpdate')(patientId, patientData);
      await new Promise(resolve => setTimeout(resolve, 500));
      return {
        success: true,
        message: 'Patient updated successfully',
        patient: {
          ...mockPatient,
          ...patientData,
          id: patientId,
          updatedAt: new Date().toISOString(),
          updatedBy: 'StorybookUser',
        },
      };
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const editButton = canvas.getByText(/edit/i);
    await userEvent.click(editButton);
    const firstNameInput = await canvas.findByLabelText(/first name/i);
    expect(firstNameInput).toHaveValue('John');
  },
};

// Deleting patient
export const DeletingPatient: Story = {
  args: {
    patient: mockPatient,
    onDelete: async (patientId: string) => {
      action('onDelete')(patientId);
      await new Promise(resolve => setTimeout(resolve, 1000));
      return {
        success: true,
        message: 'Patient deleted successfully',
      };
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const originalConfirm = window.confirm;
    window.confirm = () => true;
    const deleteButton = canvas.getByText(/delete/i);
    await userEvent.click(deleteButton);
    window.confirm = originalConfirm;
  },
};

// With complex patient data
export const ComplexPatient: Story = {
  args: {
    patient: {
      ...mockPatient,
      bloodProfile: {
        ...mockPatient.bloodProfile,
        antibodies: ['anti-K', 'anti-E', 'anti-Fya', 'anti-Jka'],
        phenotype: {
          // Use correct object structure for phenotype
          rh: { D: true, C: false, E: true, c: true, e: false },
          kell: { K: false, k: true },
          duffy: { Fya: false, Fyb: true },
          kidd: { Jka: false, Jkb: true },
          mns: { M: true, N: false, S: true, s: false },
          other: { P1: true },
        },
      },
      medicalHistory: {
        ...mockPatient.medicalHistory,
        allergies: ['Penicillin', 'Sulfa'],
        conditions: ['Hypertension', 'Diabetes'],
        medications: ['Metformin', 'Lisinopril'],
        surgeries: ['Appendectomy'],
      },
      cautionFlags: ['High-risk patient', 'Requires special blood products'],
      specialProcedures: ['Irradiated Blood Required'],
    },
    onUpdate: async (patientId: string, patientData) => {
      action('onUpdate')(patientId, patientData);
      return {
        success: true,
        message: 'Updated',
        patient: { ...mockPatient, ...patientData, id: patientId },
      };
    },
    onDelete: async (patientId: string) => {
      action('onDelete')(patientId);
      return { success: true, message: 'Deleted' };
    },
  },
};
