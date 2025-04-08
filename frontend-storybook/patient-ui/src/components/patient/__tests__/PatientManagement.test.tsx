import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PatientManagement } from '../PatientManagement';
import { Patient } from '../../../types/patient';

const mockPatient: Patient = {
  id: '123', // Added top-level id
  identification: {
    id: '123',
    mrn: 'MRN123',
  },
  demographics: {
    firstName: 'John',
    lastName: 'Doe',
    dateOfBirth: '1990-01-01',
    gender: 'M',
    contactNumber: '555-0000', // Added
    email: 'john.doe.test@example.com', // Added
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
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  createdBy: 'system',
  updatedBy: 'system',
};

describe('PatientManagement', () => {
  const onCreate = jest.fn();
  const onUpdate = jest.fn();
  const onDelete = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state', () => {
    render(
      <PatientManagement
        isLoading={true}
        onCreate={onCreate}
        onUpdate={onUpdate}
        onDelete={onDelete}
      />
    );

    expect(screen.getByText('Loading patient data...')).toBeInTheDocument();
  });

  it('renders create patient button when no patient exists', () => {
    render(<PatientManagement onCreate={onCreate} onUpdate={onUpdate} onDelete={onDelete} />);

    expect(screen.getByRole('button', { name: /create new patient/i })).toBeInTheDocument();
  });

  it('renders patient details when patient exists', () => {
    render(
      <PatientManagement
        patient={mockPatient}
        onCreate={onCreate}
        onUpdate={onUpdate}
        onDelete={onDelete}
      />
    );

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('MRN: MRN123')).toBeInTheDocument();
    expect(screen.getByText(/Blood Type: A \+/)).toBeInTheDocument();
  });

  it('shows create form when create button is clicked', async () => {
    render(<PatientManagement onCreate={onCreate} onUpdate={onUpdate} onDelete={onDelete} />);

    await userEvent.click(screen.getByRole('button', { name: /create new patient/i }));

    expect(screen.getByText('Create New Patient')).toBeInTheDocument();
    expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
  });

  it('shows edit form when edit button is clicked', async () => {
    render(
      <PatientManagement
        patient={mockPatient}
        onCreate={onCreate}
        onUpdate={onUpdate}
        onDelete={onDelete}
      />
    );

    await userEvent.click(screen.getByRole('button', { name: /edit/i }));

    expect(screen.getByText('Edit Patient')).toBeInTheDocument();
    expect(screen.getByLabelText(/first name/i)).toHaveValue('John');
    expect(screen.getByLabelText(/last name/i)).toHaveValue('Doe');
  });

  it('calls onDelete with confirmation when delete button is clicked', async () => {
    window.confirm = jest.fn(() => true);

    render(
      <PatientManagement
        patient={mockPatient}
        onCreate={onCreate}
        onUpdate={onUpdate}
        onDelete={onDelete}
      />
    );

    await userEvent.click(screen.getByRole('button', { name: /delete/i }));

    expect(window.confirm).toHaveBeenCalled();
    expect(onDelete).toHaveBeenCalledWith('123');
  });

  it('does not call onDelete when delete is cancelled', async () => {
    window.confirm = jest.fn(() => false);

    render(
      <PatientManagement
        patient={mockPatient}
        onCreate={onCreate}
        onUpdate={onUpdate}
        onDelete={onDelete}
      />
    );

    await userEvent.click(screen.getByRole('button', { name: /delete/i }));

    expect(window.confirm).toHaveBeenCalled();
    expect(onDelete).not.toHaveBeenCalled();
  });

  it('calls onCreate with form data when create form is submitted', async () => {
    onCreate.mockResolvedValueOnce({
      success: true,
      message: 'Created successfully',
      patient: mockPatient,
    });

    render(<PatientManagement onCreate={onCreate} onUpdate={onUpdate} onDelete={onDelete} />);

    await userEvent.click(screen.getByRole('button', { name: /create new patient/i }));

    await userEvent.type(screen.getByLabelText(/first name/i), 'Jane');
    await userEvent.type(screen.getByLabelText(/last name/i), 'Smith');
    await userEvent.type(screen.getByLabelText(/date of birth/i), '1995-05-15');
    await userEvent.selectOptions(screen.getByLabelText(/gender/i), 'F');
    await userEvent.selectOptions(screen.getByLabelText(/blood type/i), 'O');
    await userEvent.selectOptions(screen.getByLabelText(/rh factor/i), '+');

    await userEvent.click(screen.getByRole('button', { name: /create patient/i }));

    await waitFor(() => {
      expect(onCreate).toHaveBeenCalledWith(
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

  it('calls onUpdate with form data when edit form is submitted', async () => {
    onUpdate.mockResolvedValueOnce({
      success: true,
      message: 'Updated successfully',
      patient: {
        ...mockPatient,
        demographics: {
          ...mockPatient.demographics,
          firstName: 'Jane',
        },
      },
    });

    render(
      <PatientManagement
        patient={mockPatient}
        onCreate={onCreate}
        onUpdate={onUpdate}
        onDelete={onDelete}
      />
    );

    await userEvent.click(screen.getByRole('button', { name: /edit/i }));

    const firstNameInput = screen.getByLabelText(/first name/i);
    await userEvent.clear(firstNameInput);
    await userEvent.type(firstNameInput, 'Jane');

    await userEvent.click(screen.getByRole('button', { name: /update patient/i }));

    await waitFor(() => {
      expect(onUpdate).toHaveBeenCalledWith(
        '123',
        expect.objectContaining({
          demographics: expect.objectContaining({
            firstName: 'Jane',
          }),
        })
      );
    });
  });

  it('handles errors in create/update operations', async () => {
    const error = new Error('Operation failed');
    onCreate.mockRejectedValueOnce(error);

    render(<PatientManagement onCreate={onCreate} onUpdate={onUpdate} onDelete={onDelete} />);

    await userEvent.click(screen.getByRole('button', { name: /create new patient/i }));

    await userEvent.type(screen.getByLabelText(/first name/i), 'Jane');
    await userEvent.type(screen.getByLabelText(/last name/i), 'Smith');
    await userEvent.type(screen.getByLabelText(/date of birth/i), '1995-05-15');
    await userEvent.selectOptions(screen.getByLabelText(/gender/i), 'F');
    await userEvent.selectOptions(screen.getByLabelText(/blood type/i), 'O');
    await userEvent.selectOptions(screen.getByLabelText(/rh factor/i), '+');

    await userEvent.click(screen.getByRole('button', { name: /create patient/i }));

    await waitFor(() => {
      expect(screen.getByText('Operation failed')).toBeInTheDocument();
    });
  });
});
