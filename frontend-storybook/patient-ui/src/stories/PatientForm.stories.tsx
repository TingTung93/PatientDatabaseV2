import type { Meta, StoryObj } from '@storybook/react';
import { PatientFormPage } from '../pages/PatientFormPage'; // Corrected path
import { Patient } from '../types/patient'; // Corrected path
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import React from 'react';

const queryClient = new QueryClient();

// Wrapper for context providers
const StoryWrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      {children}
    </BrowserRouter>
  </QueryClientProvider>
);

const meta = {
  title: 'Pages/PatientFormPage',
  component: PatientFormPage,
  decorators: [
    (StoryComponent) => (
      <StoryWrapper>
        <StoryComponent />
      </StoryWrapper>
    ),
  ],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof PatientFormPage>;

export default meta;
type Story = StoryObj<typeof meta>; // Define Story type correctly

export const ExistingPatient: Story = {
  args: {
    patient: {
      id: 'existing-123',
      firstName: 'Existing',
      lastName: 'User',
      identification: { id: 'existing-123', mrn: 'MRN67890' },
      demographics: {
        firstName: 'Existing',
        lastName: 'User',
        dateOfBirth: '1975-11-01',
        gender: 'M',
        contactNumber: '555-4321',
        email: 'existing.user@example.com',
      },
      bloodProfile: {
        abo: 'O', rh: '+', phenotype: {}, antibodies: [],
        requirements: { immediateSpinRequired: false, salineToAHGRequired: false, preWarmRequired: false },
        restrictions: []
      },
      medicalHistory: {
        allergies: [], conditions: [], medications: [], surgeries: [], procedures: []
      },
      comments: [],
      notes: [],
      createdAt: '2023-01-10T10:00:00Z',
      updatedAt: '2024-04-01T15:30:00Z',
      createdBy: 'admin',
      updatedBy: 'editor',
    },
  },
}; 