const { validatePatient, validatePatientUpdate, validateReport, validateReportUpdate, validateReportFile } = require('../validation');
const { ValidationError } = require('../../errors/ValidationError');

describe('Validation Middleware', () => {
  let mockReq;
  let mockRes;
  let nextFunction;

  beforeEach(() => {
    mockReq = {
      body: {},
      file: null
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    nextFunction = jest.fn();
  });

  describe('Patient Validation', () => {
    test('should pass valid patient data', () => {
      mockReq.body = {
        name: 'John Doe',
        dob: '1990-01-01',
        blood_type: 'A POS'
      };

      validatePatient(mockReq, mockRes, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    test('should reject invalid patient data', () => {
      mockReq.body = {
        name: '',
        dob: 'invalid-date',
        blood_type: 'INVALID'
      };

      validatePatient(mockReq, mockRes, nextFunction);

      expect(nextFunction).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'error',
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          errors: expect.any(Array)
        })
      );
    });

    test('should pass valid patient update data', () => {
      mockReq.body = {
        name: 'John Doe',
        blood_type: 'A POS'
      };

      validatePatientUpdate(mockReq, mockRes, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    test('should reject invalid patient update data', () => {
      mockReq.body = {
        name: '',
        blood_type: 'INVALID'
      };

      validatePatientUpdate(mockReq, mockRes, nextFunction);

      expect(nextFunction).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'error',
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          errors: expect.any(Array)
        })
      );
    });
  });

  describe('Report Validation', () => {
    test('should pass valid report data', () => {
      mockReq.body = {
        patient_id: 1,
        report_type: 'Blood Test',
        file_path: '/uploads/reports/blood_test.pdf',
        file_name: 'blood_test.pdf',
        file_size: 1024 * 1024,
        mime_type: 'application/pdf'
      };

      validateReport(mockReq, mockRes, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    test('should reject invalid report data', () => {
      mockReq.body = {
        patient_id: 0,
        report_type: '',
        file_path: undefined,
        file_name: null,
        file_size: 11 * 1024 * 1024,
        mime_type: 'invalid/type'
      };

      validateReport(mockReq, mockRes, nextFunction);

      expect(nextFunction).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'error',
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          errors: expect.any(Array)
        })
      );
    });

    test('should pass valid report update data', () => {
      mockReq.body = {
        report_type: 'Updated Report',
        file_size: 2048
      };

      validateReportUpdate(mockReq, mockRes, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    test('should reject invalid report update data', () => {
      mockReq.body = {
        report_type: 'a'.repeat(51),
        file_size: 11 * 1024 * 1024,
        mime_type: 'invalid/type'
      };

      validateReportUpdate(mockReq, mockRes, nextFunction);

      expect(nextFunction).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'error',
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          errors: expect.any(Array)
        })
      );
    });
  });

  describe('File Validation', () => {
    test('should pass valid file metadata', () => {
      mockReq.file = {
        originalname: 'test.pdf',
        size: 1024 * 1024,
        mimetype: 'application/pdf'
      };

      validateReportFile(mockReq, mockRes, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    test('should reject invalid file metadata', () => {
      mockReq.file = {
        originalname: 'test.pdf',
        size: 11 * 1024 * 1024,
        mimetype: 'invalid/type'
      };

      validateReportFile(mockReq, mockRes, nextFunction);

      expect(nextFunction).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'error',
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          errors: expect.any(Array)
        })
      );
    });

    test('should handle missing file', () => {
      validateReportFile(mockReq, mockRes, nextFunction);

      expect(nextFunction).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'error',
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          errors: expect.any(Array)
        })
      );
    });
  });

  describe('Error Handling', () => {
    test('should pass non-validation errors to next middleware', () => {
      const error = new Error('Test error');
      mockReq.body = null; // This will cause a TypeError

      validatePatient(mockReq, mockRes, nextFunction);

      expect(nextFunction).toHaveBeenCalledWith(error);
      expect(mockRes.status).not.toHaveBeenCalled();
    });
  });
}); 