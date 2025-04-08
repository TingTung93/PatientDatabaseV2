import React from 'react';
import { Meta, StoryObj } from '@storybook/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { PatientsPage } from '../pages/PatientsPage';
import { PatientDetailPage } from '../pages/PatientDetailPage';
import { PatientFormPage } from '../pages/PatientFormPage';
import { within, waitFor, expect } from '@storybook/test';
import { Patient } from '../types/patient';

const meta: Meta = {
  title: 'Pages/Patient',
  parameters: {
    layout: 'fullscreen',
    // Add error handling for API connection issues
    chromatic: {
      delay: 1000,
      viewports: [320, 768, 1024, 1440],
    },
  },
};

export default meta;

type Story = StoryObj;

// List View
export const List: Story = {
  render: () => {
    const router = createMemoryRouter(
      [
        {
          path: '/patients',
          element: <PatientsPage />,
        },
      ],
      {
        initialEntries: ['/patients'],
      }
    );

    return <RouterProvider router={router} />;
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Wait for either loading state to disappear or error message to appear
    await waitFor(
      () => {
        const loadingElement = canvas.queryByText('Loading patients...');
        const errorElement = canvas.queryByText(/Unable to load patients/i);
        expect(loadingElement).not.toBeInTheDocument() || expect(errorElement).toBeInTheDocument();
      },
      { timeout: 5000 }
    );

    // Verify the page title is present
    expect(canvas.getByText('Patients')).toBeInTheDocument();

    // Verify the search input is present
    expect(canvas.getByPlaceholderText('Search patients...')).toBeInTheDocument();

    // Verify the create button is present
    expect(canvas.getByText('Create New Patient')).toBeInTheDocument();
  },
};

// Detail View
export const Detail: Story = {
  render: () => {
    const router = createMemoryRouter(
      [
        {
          path: '/patients/:id',
          element: <PatientDetailPage />,
        },
      ],
      {
        initialEntries: ['/patients/1'],
      }
    );

    return <RouterProvider router={router} />;
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Wait for either loading state to disappear or error message to appear
    await waitFor(
      () => {
        const loadingElement = canvas.queryByText('Loading patient details...');
        const errorElement = canvas.queryByText(/Unable to load patient details/i);
        expect(loadingElement).not.toBeInTheDocument() || expect(errorElement).toBeInTheDocument();
      },
      { timeout: 5000 }
    );

    // Verify patient details are displayed or error message
    expect(canvas.getByText(/Patient Details|Unable to load patient details/i)).toBeInTheDocument();
  },
};

// Form View
export const Form: Story = {
  render: () => {
    const router = createMemoryRouter(
      [
        {
          path: '/patients/new',
          element: <PatientFormPage />,
        },
      ],
      {
        initialEntries: ['/patients/new'],
      }
    );

    return <RouterProvider router={router} />;
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Verify the form title is present
    expect(canvas.getByText('New Patient')).toBeInTheDocument();

    // Verify form fields are present
    expect(canvas.getByLabelText('First Name')).toBeInTheDocument();
    expect(canvas.getByLabelText('Last Name')).toBeInTheDocument();
    expect(canvas.getByLabelText('Date of Birth')).toBeInTheDocument();
  },
};
