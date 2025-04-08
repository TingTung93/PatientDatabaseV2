import React from 'react';
import { Meta, StoryObj } from '@storybook/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import PatientReportsPage from '../pages/PatientReportsPage';
import { within, waitFor, expect } from '@storybook/test';

const meta: Meta = {
  title: 'Pages/PatientReports',
  parameters: {
    layout: 'fullscreen',
    chromatic: {
      delay: 1000,
      viewports: [320, 768, 1024, 1440],
    },
  },
};

export default meta;

type Story = StoryObj;

// Loading state
export const Loading: Story = {
  render: () => {
    const router = createMemoryRouter(
      [
        {
          path: '/patients/:id/reports',
          element: <PatientReportsPage />,
        },
      ],
      {
        initialEntries: ['/patients/123/reports'],
      }
    );

    return <RouterProvider router={router} />;
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Verify loading state is displayed
    expect(canvas.getByText('Loading reports...')).toBeInTheDocument();
  },
};

// Empty state
export const Empty: Story = {
  render: () => {
    const router = createMemoryRouter(
      [
        {
          path: '/patients/:id/reports',
          element: <PatientReportsPage />,
        },
      ],
      {
        initialEntries: ['/patients/123/reports'],
      }
    );

    return <RouterProvider router={router} />;
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Wait for loading to complete
    await waitFor(
      () => {
        expect(canvas.queryByText('Loading reports...')).not.toBeInTheDocument();
      },
      { timeout: 5000 }
    );

    // Verify empty state message
    expect(canvas.getByText('No reports found')).toBeInTheDocument();

    // Verify upload button is present
    expect(canvas.getByText('Upload Report')).toBeInTheDocument();
  },
};

// With reports
export const WithReports: Story = {
  render: () => {
    const router = createMemoryRouter(
      [
        {
          path: '/patients/:id/reports',
          element: <PatientReportsPage />,
        },
      ],
      {
        initialEntries: ['/patients/123/reports'],
      }
    );

    return <RouterProvider router={router} />;
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Wait for loading to complete
    await waitFor(
      () => {
        expect(canvas.queryByText('Loading reports...')).not.toBeInTheDocument();
      },
      { timeout: 5000 }
    );

    // Verify reports are displayed
    expect(canvas.getByText('Blood Test Report')).toBeInTheDocument();
    expect(canvas.getByText('Chest X-Ray')).toBeInTheDocument();

    // Verify upload button is present
    expect(canvas.getByText('Upload Report')).toBeInTheDocument();
  },
};
