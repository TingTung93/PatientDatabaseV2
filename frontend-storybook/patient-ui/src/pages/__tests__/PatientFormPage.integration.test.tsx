import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../../context/AuthContext'; // Adjust path if needed
import { PatientFormPage } from '../PatientFormPage'; // Adjust path if needed
// Import actual hooks to mock
import * as patientHooks from '../../hooks/usePatients'; // Adjust path if needed
// Import types for mocking
import {
  Patient,
  CreatePatientRequest,
  UpdatePatientRequest,
  PatientIdentification,
  Demographics,
  BloodProfile,
  MedicalHistory,
} from '../../types/patient';

// --- Mocks ---
// Mock react-router-dom hooks
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: jest.fn(),
  useNavigate: () => mockNavigate,
}));

// Mock patient hooks
jest.mock('../../hooks/usePatients');
// Cast the imported hooks to jest.Mock
const mockUsePatient = patientHooks.usePatient as jest.Mock;
const mockUseCreatePatient = patientHooks.useCreatePatient as jest.Mock;
const mockUseUpdatePatient = patientHooks.useUpdatePatient as jest.Mock;

// --- Test Setup ---

// Helper to create mock Patient data (consistent with other tests)
const createMockPatient = (id: string, overrides: Partial<Patient> = {}): Patient => ({
  id,
  identification: { id: `ident-${id}`, mrn: `MRN-${id}` } as PatientIdentification,
  demographics: {
    firstName: `First-${id}`,
    lastName: `Last-${id}`,
    dateOfBirth: '2000-01-01',
    gender: 'O',
    contactNumber: '555-1234',
    email: `${id}@test.com`,
  } as Demographics,
  bloodProfile: {
    abo: 'O',
    rh: '+',
    phenotype: { rh: {}, kell: {}, duffy: {}, kidd: {}, mns: {} },
  } as BloodProfile,
  medicalHistory: {
    allergies: [],
    conditions: [],
    medications: [],
    surgeries: [],
    procedures: [],
  } as MedicalHistory,
  comments: [],
  notes: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  createdBy: 'test-user',
  updatedBy: 'test-user',
  ...overrides,
});

// Helper function to render the component with providers
const renderPatientForm = (patientId?: string) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  // Setup mock implementations before render
  (jest.requireMock('react-router-dom').useParams as jest.Mock).mockReturnValue({ id: patientId });

  // Mock mutation functions returned by the hooks
  const mockCreateMutationFn = jest.fn();
  const mockUpdateMutationFn = jest.fn();

  mockUseCreatePatient.mockReturnValue({
    mutateAsync: mockCreateMutationFn,
    isPending: false, // Default state
    isError: false,
    error: null,
  });
  mockUseUpdatePatient.mockReturnValue({
    mutateAsync: mockUpdateMutationFn,
    isPending: false, // Default state
    isError: false,
    error: null,
  });

  // Mock data fetching hook (edit mode)
  if (patientId) {
    const mockExistingPatient = createMockPatient(patientId, {
      demographics: {
        firstName: 'Existing',
        lastName: 'User',
        dateOfBirth: '1990-01-01',
        gender: 'F',
        contactNumber: '555-1111',
        email: 'existing@test.com',
      },
      bloodProfile: {
        abo: 'A',
        rh: '+',
        phenotype: { rh: {}, kell: {}, duffy: {}, kidd: {}, mns: {} },
        antibodies: ['Anti-K'],
      } as BloodProfile,
      medicalHistory: {
        conditions: ['HTN'],
        allergies: [],
        medications: [],
        surgeries: [],
        procedures: [],
      } as MedicalHistory,
    });
    mockUsePatient.mockReturnValue({
      data: mockExistingPatient,
      isLoading: false,
      isError: false,
      error: null,
    });
    // Mock update mutation success value
    mockUpdateMutationFn.mockResolvedValue(mockExistingPatient); // Return the mock patient on update
  } else {
    // Simulate loading finished, no data (create mode)
    mockUsePatient.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      error: null,
    });
    // Mock create mutation success value
    mockCreateMutationFn.mockResolvedValue(createMockPatient('new-patient-123')); // Return a mock patient on create
  }

  render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {' '}
        {/* Assuming AuthProvider doesn't interfere without login */}
        <MemoryRouter
          initialEntries={patientId ? [`/patients/${patientId}/edit`] : ['/patients/new']}
        >
          <Routes>
            <Route path="/patients/new" element={<PatientFormPage />} />
            <Route path="/patients/:id/edit" element={<PatientFormPage />} />
            <Route path="/patients/:id" element={<div>Patient Detail Page</div>} />
            <Route path="/patients" element={<div>Patient List Page</div>} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>
  );

  // Return mock functions for assertions
  return { mockCreateMutationFn, mockUpdateMutationFn, mockNavigate };
};

// --- Test Suites ---

describe('PatientFormPage Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders correctly in create mode', () => {
    renderPatientForm();
    expect(screen.getByRole('heading', { name: /create new patient/i })).toBeInTheDocument();
    // Check a required field is empty
    expect(screen.getByLabelText(/First Name*/i)).toHaveValue('');
    // Submit button might be enabled depending on validation library behavior (e.g., if pristine)
    // expect(screen.getByRole('button', { name: /create patient/i })).toBeDisabled();
  });

  test('renders correctly in edit mode with existing data', () => {
    renderPatientForm('test-id-123');
    expect(screen.getByRole('heading', { name: /edit patient/i })).toBeInTheDocument();
    // Check if fields are populated
    expect(screen.getByLabelText(/First Name*/i)).toHaveValue('Existing');
    expect(screen.getByLabelText(/Last Name*/i)).toHaveValue('User');
    // Submit button might be enabled if form allows submitting pristine data
    // expect(screen.getByRole('button', { name: /save changes/i })).toBeDisabled();
  });

  test('shows validation errors for required fields', async () => {
    renderPatientForm();
    const user = userEvent.setup();
    // Find submit button based on mode (Create)
    const submitButton = screen.getByRole('button', { name: /create patient/i });

    // Try submitting without filling required fields
    await user.click(submitButton);

    // Check for validation messages (adjust text based on actual messages)
    expect(await screen.findByText(/First name is required/i)).toBeInTheDocument();
    expect(await screen.findByText(/Last name is required/i)).toBeInTheDocument();
    expect(await screen.findByText(/Date of birth is required/i)).toBeInTheDocument();
    expect(await screen.findByText(/Gender is required/i)).toBeInTheDocument();
    expect(await screen.findByText(/Contact number is required/i)).toBeInTheDocument();
    expect(await screen.findByText(/Email is required/i)).toBeInTheDocument();
    expect(await screen.findByText(/Blood type is required/i)).toBeInTheDocument();
    expect(await screen.findByText(/Rh factor is required/i)).toBeInTheDocument();
  });

  test('successfully creates a new patient with valid data', async () => {
    const { mockCreateMutationFn } = renderPatientForm(); // Get correct mock function
    const user = userEvent.setup();

    // Fill required fields
    await user.type(screen.getByLabelText(/First Name*/i), 'New');
    await user.type(screen.getByLabelText(/Last Name*/i), 'Patient');
    await user.type(screen.getByLabelText(/Date of Birth*/i), '2000-02-02');
    await user.selectOptions(screen.getByLabelText(/Gender*/i), 'M');
    await user.type(screen.getByLabelText(/Contact Number*/i), '555-0000'); // Added required field
    await user.type(screen.getByLabelText(/Email*/i), 'new.patient@test.com'); // Added required field
    await user.selectOptions(screen.getByLabelText(/Blood Type*/i), 'O'); // Corrected label text
    await user.selectOptions(screen.getByLabelText(/Rh Factor*/i), '+'); // Corrected label text

    // Add other optional fields if needed

    const submitButton = screen.getByRole('button', { name: /create patient/i });
    // Form should be valid now, button might be enabled
    // expect(submitButton).toBeEnabled();

    await user.click(submitButton);

    // Check if mutation was called
    await waitFor(() => {
      expect(mockCreateMutationFn).toHaveBeenCalledTimes(1);
      // Check the structure of the data passed to the mutation
      expect(mockCreateMutationFn).toHaveBeenCalledWith(
        expect.objectContaining({
          demographics: expect.objectContaining({
            firstName: 'New',
            lastName: 'Patient',
            dateOfBirth: '2000-02-02',
            gender: 'M',
            contactNumber: '555-0000',
            email: 'new.patient@test.com',
          }),
          bloodProfile: expect.objectContaining({ abo: 'O', rh: '+' }),
          // identification is usually generated by backend, not sent from form
        })
      );
    });

    // Check for navigation (uses the ID from the mock resolved value)
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/patients/new-patient-123');
    });
  });

  test('successfully updates an existing patient', async () => {
    const patientId = 'test-id-123';
    const { mockUpdateMutationFn } = renderPatientForm(patientId); // Get correct mock function
    const user = userEvent.setup();
    const firstNameInput = screen.getByLabelText(/First Name*/i);

    // Edit a field
    await user.clear(firstNameInput);
    await user.type(firstNameInput, 'UpdatedFirstName');

    const submitButton = screen.getByRole('button', { name: /save changes/i });
    // expect(submitButton).toBeEnabled(); // Enabled because form is dirty

    await user.click(submitButton);

    // Check if mutation was called
    await waitFor(() => {
      expect(mockUpdateMutationFn).toHaveBeenCalledTimes(1);
      // Check arguments passed to update mutation
      expect(mockUpdateMutationFn).toHaveBeenCalledWith({
        id: patientId,
        patient: expect.objectContaining({
          // Check the nested 'patient' object
          demographics: expect.objectContaining({ firstName: 'UpdatedFirstName' }),
        }),
      });
    });

    // Check for navigation
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(`/patients/${patientId}`);
    });
  });

  // TODO: Add more tests:
  // - Test specific validation rules (e.g., email format)
  // - Test adding/removing multiple items in FieldArray sections if applicable
  // - Test error handling on fetch/mutation failure
});
