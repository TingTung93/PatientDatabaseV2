import type { Meta, StoryObj } from '@storybook/react';
import { CautionCard } from './CautionCard';
import { Patient } from '../../types/patient'; // Import Patient type

const meta: Meta<typeof CautionCard> = {
  title: 'Patient/CautionCard',
  component: CautionCard,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof CautionCard>;

// Mock metadata required by Patient type
const mockMetadata = {
  createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(), // 7 days ago
  updatedAt: new Date().toISOString(),
  createdBy: 'System',
  updatedBy: 'Dr. Smith', // Keep existing updatedBy
};

// Base patient data with all phenotype markers
const basePatient: Patient = {
  id: 'patient-123', // Root ID
  identification: {
    id: '1', // This might be a different ID concept, keeping as is
    mrn: 'MRN001',
    fmp: '123456',
    ssn: '123-45-6789',
  },
  demographics: {
    firstName: 'John',
    lastName: 'Doe',
    dateOfBirth: '1990-01-01',
    gender: 'M',
    contactNumber: '555-1234', // Added missing required field
    email: 'john.doe@example.com', // Added missing required field
  },
  bloodProfile: {
    abo: 'A',
    rh: '+',
    phenotype: {
      rh: {
        D: true,
        C: true,
        E: false,
        c: true,
        e: true,
      },
      kell: {
        K: false,
        k: true,
      },
      duffy: {
        Fya: true,
        Fyb: false,
      },
      kidd: {
        Jka: true,
        Jkb: true,
      },
      mns: {
        M: true,
        N: false,
        S: true,
        s: true,
      },
      other: {
        P1: true,
        Lea: false,
      },
    },
    antibodies: ['anti-K', 'anti-E'],
    restrictions: ['Kell negative units only', 'E antigen negative units only'],
    requirements: {
      immediateSpinRequired: true,
      salineToAHGRequired: true,
      preWarmRequired: false,
    },
  },
  medicalHistory: {
    allergies: [],
    conditions: [],
    medications: [],
    surgeries: [],
    procedures: [], // Added missing required field
  },
  cautionFlags: ['History of multiple antibodies', 'Delayed serologic transfusion reaction'],
  comments: [],
  notes: [],
  ...mockMetadata, // Add required metadata
};

// Standard caution card with all information
export const Standard: Story = {
  args: {
    patient: basePatient,
  },
};

// Minimal information
export const Minimal: Story = {
  args: {
    patient: {
      ...basePatient,
      bloodProfile: {
        ...basePatient.bloodProfile,
        phenotype: {
          rh: {},
          kell: {},
          duffy: {},
          kidd: {},
          mns: {},
          other: {}, // Ensure 'other' exists even if empty
        },
        antibodies: [],
        restrictions: [],
        requirements: {
          immediateSpinRequired: false,
          salineToAHGRequired: false,
          preWarmRequired: false,
        },
      },
      cautionFlags: [],
      ...mockMetadata, // Ensure metadata is present
    },
  },
};

// With multiple caution flags
export const WithMultipleCautions: Story = {
  args: {
    patient: {
      ...basePatient,
      cautionFlags: [
        'History of multiple antibodies',
        'Delayed serologic transfusion reaction',
        'History of acute hemolytic transfusion reaction',
        'Requires pre-warmed blood products',
        'Special antigen matching required',
      ],
      ...mockMetadata, // Ensure metadata is present
    },
  },
};

// With complex phenotype
export const ComplexPhenotype: Story = {
  args: {
    patient: {
      ...basePatient,
      bloodProfile: {
        ...basePatient.bloodProfile,
        phenotype: {
          ...basePatient.bloodProfile.phenotype,
          other: {
            P1: true,
            Lea: true,
            Leb: false,
            Lua: false,
            Lub: true,
            Xga: true,
          },
        },
      },
      ...mockMetadata, // Ensure metadata is present
    },
  },
};

// With all crossmatch requirements
export const AllCrossmatchRequirements: Story = {
  args: {
    patient: {
      ...basePatient,
      bloodProfile: {
        ...basePatient.bloodProfile,
        requirements: {
          immediateSpinRequired: true,
          salineToAHGRequired: true,
          preWarmRequired: true,
        },
      },
      ...mockMetadata, // Ensure metadata is present
    },
  },
};

// With custom styling
export const CustomStyling: Story = {
  args: {
    patient: {
      ...basePatient, // Start with base
      ...mockMetadata, // Ensure metadata is present
    },
    className: 'max-w-3xl shadow-lg rounded-lg',
  },
};
