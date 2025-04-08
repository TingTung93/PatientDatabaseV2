const { formatPatientData, formatApiResponse } = require('../formatters');

describe('API Formatters', () => {
  describe('formatPatientData', () => {
    test('formats complete patient data correctly', () => {
      const mockPatient = {
        id: 1,
        first_name: 'John',
        last_name: 'Doe',
        date_of_birth: '1990-01-01',
        gender: 'Male',
        medical_record_number: 'MRN123',
        blood_type: 'A+',
        antigen_phenotype: '',
        transfusion_restrictions: '',
        antibodies: [],
        medical_history: '',
        allergies: null,
        current_medications: null,
        comments: [],
        created_by: null,
        updated_by: null,
        createdAt: undefined,
        updatedAt: undefined,
        deleted_at: null
      };

      const formatted = formatPatientData(mockPatient);
      expect(formatted).toEqual({
        id: 1,
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: '1990-01-01',
        gender: 'Male',
        medicalRecordNumber: 'MRN123',
        bloodType: 'A+',
        antigenPhenotype: '',
        transfusionRestrictions: '',
        antibodies: [],
        medicalHistory: '',
        allergies: null,
        currentMedications: null,
        comments: [],
        createdBy: null,
        updatedBy: null,
        createdAt: undefined,
        updatedAt: undefined,
        deletedAt: null,
        contactNumber: null
      });
    });

    test('handles alternative field names', () => {
      const mockPatient = {
        id: 1,
        first_name: 'John',
        last_name: 'Doe',
        date_of_birth: '1990-01-01',
        gender: 'Male',
        medical_record_number: 'MRN123',
        blood_type: 'A+',
        antigen_phenotype: '',
        transfusion_restrictions: '',
        antibodies: [],
        medical_history: '',
        allergies: null,
        current_medications: null,
        comments: [],
        created_by: null,
        updated_by: null,
        createdAt: undefined,
        updatedAt: undefined,
        deleted_at: null
      };

      const formatted = formatPatientData(mockPatient);
      expect(formatted).toEqual({
        id: 1,
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: '1990-01-01',
        gender: 'Male',
        medicalRecordNumber: 'MRN123',
        bloodType: 'A+',
        antigenPhenotype: '',
        transfusionRestrictions: '',
        antibodies: [],
        medicalHistory: '',
        allergies: null,
        currentMedications: null,
        comments: [],
        createdBy: null,
        updatedBy: null,
        createdAt: undefined,
        updatedAt: undefined,
        deletedAt: null,
        contactNumber: null
      });
    });

    test('provides default values for missing fields', () => {
      const mockPatient = {
        id: 1,
        first_name: 'John',
        last_name: 'Doe'
      };

      const formatted = formatPatientData(mockPatient);
      expect(formatted).toEqual({
        id: 1,
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: '',
        gender: 'O',
        medicalRecordNumber: '',
        bloodType: 'Unknown',
        antigenPhenotype: '',
        transfusionRestrictions: '',
        antibodies: [],
        medicalHistory: '',
        allergies: null,
        currentMedications: null,
        comments: [],
        createdBy: null,
        updatedBy: null,
        createdAt: undefined,
        updatedAt: undefined,
        deletedAt: null,
        contactNumber: null
      });
    });

    test('handles null patient data', () => {
      const mockPatient = {
        id: 1,
        first_name: null,
        last_name: null,
        date_of_birth: null,
        gender: null,
        medical_record_number: null,
        blood_type: null
      };

      const formatted = formatPatientData(mockPatient);
      expect(formatted).toEqual({
        id: 1,
        firstName: '',
        lastName: '',
        dateOfBirth: '',
        gender: 'O',
        medicalRecordNumber: '',
        bloodType: 'Unknown',
        antigenPhenotype: '',
        transfusionRestrictions: '',
        antibodies: [],
        medicalHistory: '',
        allergies: null,
        currentMedications: null,
        comments: [],
        createdBy: null,
        updatedBy: null,
        createdAt: undefined,
        updatedAt: undefined,
        deletedAt: null,
        contactNumber: null
      });
    });
  });

  describe('formatApiResponse', () => {
    test('formats basic success response', () => {
      const response = formatApiResponse('success', { test: 'data' });
      expect(response).toEqual({
        status: 'success',
        data: { test: 'data' }
      });
    });

    test('formats error response with message', () => {
      const response = formatApiResponse('error', null, null, 'Error message');
      expect(response).toEqual({
        status: 'error',
        data: null,
        message: 'Error message'
      });
    });

    test('includes pagination information when provided', () => {
      const pagination = {
        page: 1,
        totalPages: 5,
        total: 100
      };

      const response = formatApiResponse('success', [{ id: 1 }], pagination);
      expect(response).toEqual({
        status: 'success',
        data: [{ id: 1 }],
        page: 1,
        totalPages: 5,
        total: 100
      });
    });

    test('handles empty data with pagination', () => {
      const pagination = {
        page: 1,
        totalPages: 0,
        total: 0
      };

      const response = formatApiResponse('success', [], pagination);
      expect(response).toEqual({
        status: 'success',
        data: [],
        page: 1,
        totalPages: 0,
        total: 0
      });
    });

    test('includes message with paginated response', () => {
      const pagination = {
        page: 1,
        totalPages: 5,
        total: 100
      };

      const response = formatApiResponse('success', [{ id: 1 }], pagination, 'Success message');
      expect(response).toEqual({
        status: 'success',
        data: [{ id: 1 }],
        page: 1,
        totalPages: 5,
        total: 100,
        message: 'Success message'
      });
    });

    test('handles null pagination and message', () => {
      const response = formatApiResponse('success', { test: 'data' }, null, null);
      expect(response).toEqual({
        status: 'success',
        data: { test: 'data' }
      });
    });
  });
});