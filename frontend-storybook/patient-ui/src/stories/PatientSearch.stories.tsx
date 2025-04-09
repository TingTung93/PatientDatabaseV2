import type { Meta, StoryObj } from '@storybook/react';
import { PatientSearch } from '../components/patient/PatientSearch';
import { Patient, PatientSearchParams } from '../types/patient';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Add an empty export to make it a module
export {};

const mockPatients: Patient[] = [
  {
    id: '1',
    firstName: 'John',
    lastName: 'Doe',
    identification: { id: '1', mrn: 'MRN001' },
    demographics: {
      firstName: 'John',
      lastName: 'Doe',
      dateOfBirth: '1990-01-01',
      gender: 'M',
      contactNumber: '555-0011',
      email: 'john.doe.search@example.com',
    },
    bloodProfile: {
      abo: 'A',
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
    createdBy: 'test-user',
    updatedBy: 'test-user',
  },
  {
    id: '2',
    firstName: 'Jane',
    lastName: 'Smith',
    identification: { id: '2', mrn: 'MRN002' },
    demographics: {
      firstName: 'Jane',
      lastName: 'Smith',
      dateOfBirth: '1985-06-15',
      gender: 'F',
      contactNumber: '555-0022',
      email: 'jane.smith.search@example.com',
    },
    bloodProfile: {
      abo: 'O',
      rh: '-',
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
    createdBy: 'test-user',
    updatedBy: 'test-user',
  },
]; 