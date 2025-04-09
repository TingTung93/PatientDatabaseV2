import type { Meta, StoryObj } from '@storybook/react';
import { PatientSearch } from './PatientSearch';
import { action } from '@storybook/addon-actions';
import { within, userEvent } from '@storybook/testing-library';
import { expect } from '@storybook/jest';

const meta: Meta<typeof PatientSearch> = {
  title: 'Patient/PatientSearch',
  component: PatientSearch,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    onSearch: { action: 'searched' },
    onSelect: { action: 'selected' },
    isLoading: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof PatientSearch>;

import { Patient } from '../../types/patient'; // Import Patient type

const mockPatients: Patient[] = [
  // Add Patient type
  {
    id: '1', // Add top-level id
    firstName: 'John', // Added: Duplicate from demographics [TS2739 fix]
    lastName: 'Doe',   // Added: Duplicate from demographics [TS2739 fix]
    identification: { id: '1', mrn: 'MRN001' },
    demographics: {
      firstName: 'John',
      lastName: 'Doe',
      dateOfBirth: '1990-01-01',
      gender: 'M',
      contactNumber: '555-0011', // Added
      email: 'john.doe.search@example.com', // Added
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
      procedures: [], // Added
    },
    comments: [],
    notes: [],
    // Added missing required fields
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'test-user',
    updatedBy: 'test-user',
  },
  {
    id: '2', // Add top-level id
    firstName: 'Jane', // Added: Duplicate from demographics [TS2739 fix]
    lastName: 'Smith', // Added: Duplicate from demographics [TS2739 fix]
    identification: { id: '2', mrn: 'MRN002' },
    demographics: {
      firstName: 'Jane',
      lastName: 'Smith',
      dateOfBirth: '1985-06-15',
      gender: 'F',
      contactNumber: '555-0022', // Added
      email: 'jane.smith.search@example.com', // Added
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
      procedures: [], // Added
    },
    comments: [],
    notes: [],
    // Added missing required fields
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'test-user',
    updatedBy: 'test-user',
  },
];

// Empty state
export const Default: Story = {
  args: {
    onSearch: async query => {
      action('onSearch')(query);
      return { patients: [], total: 0 };
    },
  },
};

// Loading state
export const Loading: Story = {
  args: {
    isLoading: true,
    onSearch: async () => ({ patients: [], total: 0 }),
  },
};

// With search results
export const WithResults: Story = {
  args: {
    onSearch: async query => {
      action('onSearch')(query);
      return { patients: mockPatients, total: mockPatients.length };
    },
    onSelect: action('onSelect'),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Type in search query
    const searchInput = canvas.getByPlaceholderText(/search by name/i);
    await userEvent.type(searchInput, 'John');

    // Click search button
    const searchButton = canvas.getByRole('button', { name: /search/i });
    await userEvent.click(searchButton);

    // Wait for and verify results
    const patientItems = await canvas.findAllByRole('heading', { level: 3 });
    expect(patientItems).toHaveLength(2);
    expect(patientItems[0]).toHaveTextContent('John Doe');
  },
};

// No results found
export const NoResults: Story = {
  args: {
    onSearch: async query => {
      action('onSearch')(query);
      return { patients: [], total: 0 };
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Type in search query
    const searchInput = canvas.getByPlaceholderText(/search by name/i);
    await userEvent.type(searchInput, 'NonexistentPatient');

    // Click search button
    const searchButton = canvas.getByRole('button', { name: /search/i });
    await userEvent.click(searchButton);

    // Verify no results message
    const noResultsMessage = await canvas.findByText(/no patients found/i);
    expect(noResultsMessage).toBeInTheDocument();
  },
};

// With error handling
export const WithError: Story = {
  args: {
    onSearch: async () => {
      throw new Error('Failed to fetch patients');
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Type in search query
    const searchInput = canvas.getByPlaceholderText(/search by name/i);
    await userEvent.type(searchInput, 'test');

    // Click search button
    const searchButton = canvas.getByRole('button', { name: /search/i });
    await userEvent.click(searchButton);

    // Verify empty results after error
    const noResultsMessage = await canvas.findByText(/no patients found/i);
    expect(noResultsMessage).toBeInTheDocument();
  },
};
