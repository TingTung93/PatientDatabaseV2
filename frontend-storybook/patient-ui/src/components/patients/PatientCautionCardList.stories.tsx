import React from 'react';
import { Meta, StoryObj } from '@storybook/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { PatientCautionCardList } from './PatientCautionCardList';
import { within, waitFor, expect } from '@storybook/test';

const meta: Meta = {
  title: 'Components/Patient/PatientCautionCardList',
  parameters: {
    layout: 'padded',
  },
};

export default meta;

type Story = StoryObj;

// Mock data
const mockCautionCards = [
  {
    id: '1',
    patient_id: '123',
    blood_type: 'A+',
    antibodies: ['Anti-K', 'Anti-D'],
    transfusion_requirements: ['Washed', 'Irradiated'],
    status: 'reviewed',
    reviewed_date: '2023-06-01T12:00:00Z',
    reviewed_by: 'Dr. Smith',
    created_at: '2023-05-15T10:30:00Z',
    updated_at: '2023-06-01T12:00:00Z',
  },
  {
    id: '2',
    patient_id: '123',
    blood_type: 'A+',
    antibodies: ['Anti-E'],
    transfusion_requirements: ['CMV Negative'],
    status: 'pending',
    created_at: '2023-05-20T14:45:00Z',
    updated_at: '2023-05-20T14:45:00Z',
  },
];

// Loading state
export const Loading: Story = {
  render: () => {
    const router = createMemoryRouter(
      [
        {
          path: '/',
          element: <PatientCautionCardList patientId="123" />,
        },
      ],
      {
        initialEntries: ['/'],
      }
    );

    return <RouterProvider router={router} />;
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Verify loading state is displayed
    expect(canvas.getByText('Loading caution cards...')).toBeInTheDocument();
  },
};

// Empty state
export const Empty: Story = {
  render: () => {
    const router = createMemoryRouter(
      [
        {
          path: '/',
          element: <PatientCautionCardList patientId="123" />,
        },
      ],
      {
        initialEntries: ['/'],
      }
    );

    return <RouterProvider router={router} />;
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Wait for loading to complete
    await waitFor(
      () => {
        expect(canvas.queryByText('Loading caution cards...')).not.toBeInTheDocument();
      },
      { timeout: 5000 }
    );

    // Verify empty state message
    expect(canvas.getByText('No caution cards found')).toBeInTheDocument();

    // Verify add button is present
    expect(canvas.getByText('Add Caution Card')).toBeInTheDocument();
  },
};

// With caution cards
export const WithCautionCards: Story = {
  render: () => {
    const router = createMemoryRouter(
      [
        {
          path: '/',
          element: <PatientCautionCardList patientId="123" />,
        },
      ],
      {
        initialEntries: ['/'],
      }
    );

    return <RouterProvider router={router} />;
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Wait for loading to complete
    await waitFor(
      () => {
        expect(canvas.queryByText('Loading caution cards...')).not.toBeInTheDocument();
      },
      { timeout: 5000 }
    );

    // Verify caution cards are displayed
    expect(canvas.getByText('Reviewed')).toBeInTheDocument();
    expect(canvas.getByText('Pending')).toBeInTheDocument();

    // Verify add button is present
    expect(canvas.getByText('Add Caution Card')).toBeInTheDocument();
  },
};
