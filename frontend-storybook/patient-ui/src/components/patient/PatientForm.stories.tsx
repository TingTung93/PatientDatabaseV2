import type { Meta, StoryObj } from '@storybook/react';
import { PatientForm } from './PatientForm';
import { action } from '@storybook/addon-actions';
import { fillPatientForm, expectFormValidation } from '../../test-utils/test-helpers';

const meta: Meta<typeof PatientForm> = {
  title: 'Patient/PatientForm',
  component: PatientForm,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    onSubmit: { action: 'submitted' },
    isSubmitting: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof PatientForm>;

// Empty form for creating a new patient
export const NewPatient: Story = {
  args: {
    onSubmit: async values => {
      action('onSubmit')(values);
      await new Promise(resolve => setTimeout(resolve, 1000));
    },
  },
  play: async ({ canvasElement }) => {
    // Fill out the form with valid data
    await fillPatientForm(canvasElement, {
      firstName: 'Jane',
      lastName: 'Smith',
      dateOfBirth: '1985-06-15',
      gender: 'F',
      bloodType: 'O',
      rhFactor: '+',
    });
  },
};

// Form with existing patient data for editing
export const ExistingPatient: Story = {
  args: {
    patient: {
      // Add missing required fields
      id: 'existing-123',
      identification: { id: 'existing-123', mrn: 'MRN67890' },
      demographics: {
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: '1990-01-01',
        gender: 'M',
        contactNumber: '555-9876',
        email: 'john.doe.existing@example.com',
      },
      bloodProfile: {
        abo: 'A',
        rh: '+',
        phenotype: {
          rh: {},
          kell: {},
          duffy: {},
          kidd: {},
          mns: {},
        },
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
      // Added missing required fields
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'test-user',
      updatedBy: 'test-user',
    },
    onSubmit: async values => {
      action('onSubmit')(values);
      await new Promise(resolve => setTimeout(resolve, 1000));
    },
  },
};

// Form in submitting state
export const Submitting: Story = {
  args: {
    isSubmitting: true,
    onSubmit: async () => {
      await new Promise(resolve => setTimeout(resolve, 2000));
    },
  },
};

// Form with validation errors
export const WithValidationErrors: Story = {
  play: async ({ canvasElement }) => {
    await expectFormValidation(canvasElement);
  },
  args: {
    onSubmit: async values => {
      action('onSubmit')(values);
      await new Promise(resolve => setTimeout(resolve, 1000));
    },
  },
};
