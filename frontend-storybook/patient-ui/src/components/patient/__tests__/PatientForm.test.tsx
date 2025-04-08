import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PatientForm } from '../PatientForm'; // Assuming named export
import { Patient } from '../../../types/patient';

// Provide a more complete mock Patient object
const mockPatient: Patient = {
  id: 'mock-123', // Added
  identification: { id: 'mock-123', mrn: 'MRN12345' }, // Added
  demographics: {
    firstName: 'John',
    lastName: 'Doe',
    dateOfBirth: '1990-01-01',
    gender: 'M',
    contactNumber: '555-1234', // Added
    email: 'john.doe@example.com', // Added
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
    procedures: [], // Added
  },
  comments: [],
  notes: [],
  // Added missing required fields
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  createdBy: 'test-user',
  updatedBy: 'test-user',
};

describe('PatientForm', () => {
  const onSubmit = jest.fn();

  beforeEach(() => {
    onSubmit.mockClear();
  });

  it('renders empty form when no patient provided', () => {
    render(<PatientForm onSubmit={onSubmit} />);

    expect(screen.getByLabelText(/first name/i)).toHaveValue('');
    expect(screen.getByLabelText(/last name/i)).toHaveValue('');
    expect(screen.getByLabelText(/date of birth/i)).toHaveValue('');
    expect(screen.getByLabelText(/gender/i)).toHaveValue('');
    expect(screen.getByLabelText(/blood type/i)).toHaveValue('');
    expect(screen.getByLabelText(/rh factor/i)).toHaveValue('');
  });

  it('renders form with patient data when provided', () => {
    render(<PatientForm patient={mockPatient} onSubmit={onSubmit} />);

    expect(screen.getByLabelText(/first name/i)).toHaveValue('John');
    expect(screen.getByLabelText(/last name/i)).toHaveValue('Doe');
    expect(screen.getByLabelText(/date of birth/i)).toHaveValue('1990-01-01');
    expect(screen.getByLabelText(/gender/i)).toHaveValue('M');
    expect(screen.getByLabelText(/blood type/i)).toHaveValue('A');
    expect(screen.getByLabelText(/rh factor/i)).toHaveValue('+');
  });

  it('shows validation errors when submitting empty form', async () => {
    render(<PatientForm onSubmit={onSubmit} />);

    fireEvent.click(screen.getByRole('button', { name: /create patient/i }));

    await waitFor(() => {
      expect(screen.getByText(/first name is required/i)).toBeInTheDocument();
      expect(screen.getByText(/last name is required/i)).toBeInTheDocument();
      expect(screen.getByText(/date of birth is required/i)).toBeInTheDocument();
      expect(screen.getByText(/gender is required/i)).toBeInTheDocument();
      expect(screen.getByText(/blood type is required/i)).toBeInTheDocument();
      expect(screen.getByText(/rh factor is required/i)).toBeInTheDocument();
    });

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('calls onSubmit with form data when valid', async () => {
    render(<PatientForm onSubmit={onSubmit} />);

    await userEvent.type(screen.getByLabelText(/first name/i), 'Jane');
    await userEvent.type(screen.getByLabelText(/last name/i), 'Smith');
    await userEvent.type(screen.getByLabelText(/date of birth/i), '1995-05-15');
    await userEvent.selectOptions(screen.getByLabelText(/gender/i), 'F');
    await userEvent.selectOptions(screen.getByLabelText(/blood type/i), 'O');
    await userEvent.selectOptions(screen.getByLabelText(/rh factor/i), '+');

    fireEvent.click(screen.getByRole('button', { name: /create patient/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          demographics: {
            firstName: 'Jane',
            lastName: 'Smith',
            dateOfBirth: '1995-05-15',
            gender: 'F',
          },
          bloodProfile: expect.objectContaining({
            abo: 'O',
            rh: '+',
          }),
        })
      );
    });
  });

  it('handles submission errors', async () => {
    const error = new Error('Submission failed');
    const onSubmitError = jest.fn().mockRejectedValue(error);

    render(<PatientForm onSubmit={onSubmitError} />);

    await userEvent.type(screen.getByLabelText(/first name/i), 'Jane');
    await userEvent.type(screen.getByLabelText(/last name/i), 'Smith');
    await userEvent.type(screen.getByLabelText(/date of birth/i), '1995-05-15');
    await userEvent.selectOptions(screen.getByLabelText(/gender/i), 'F');
    await userEvent.selectOptions(screen.getByLabelText(/blood type/i), 'O');
    await userEvent.selectOptions(screen.getByLabelText(/rh factor/i), '+');

    fireEvent.click(screen.getByRole('button', { name: /create patient/i }));

    await waitFor(() => {
      expect(screen.getByText('Submission failed')).toBeInTheDocument();
    });
  });

  it('disables form submission while submitting', async () => {
    const onSubmitSlow = jest
      .fn()
      .mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

    render(<PatientForm onSubmit={onSubmitSlow} />);

    await userEvent.type(screen.getByLabelText(/first name/i), 'Jane');
    await userEvent.type(screen.getByLabelText(/last name/i), 'Smith');
    await userEvent.type(screen.getByLabelText(/date of birth/i), '1995-05-15');
    await userEvent.selectOptions(screen.getByLabelText(/gender/i), 'F');
    await userEvent.selectOptions(screen.getByLabelText(/blood type/i), 'O');
    await userEvent.selectOptions(screen.getByLabelText(/rh factor/i), '+');

    const submitButton = screen.getByRole('button', { name: /create patient/i });
    fireEvent.click(submitButton);

    expect(submitButton).toBeDisabled();
    expect(submitButton).toHaveTextContent('Saving...');

    await waitFor(() => {
      expect(submitButton).not.toBeDisabled();
      expect(submitButton).toHaveTextContent('Create Patient');
    });
  });
});
