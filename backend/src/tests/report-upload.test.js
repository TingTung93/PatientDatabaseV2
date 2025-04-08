const supertest = require('supertest');
const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const reportParser = require('../../services/reportParser');
const reportValidator = require('../../services/reportValidator');
const uploadRoutes = require('../../routes/uploadRoutes');

// --- Mocks ---
const mockFileProcessingService = {
  processFile: jest.fn(),
  getProcessingStatus: jest.fn()
};

const mockWebSocketService = {
  broadcast: jest.fn()
};
// ------------- 

let app;
let request;
let testReportContent;
const testReportPath = path.join(__dirname, '../uploads/EXAMPLEREPORT.txt');

describe('Report Upload and Processing', () => {
  beforeAll(async () => {
    // Read the test report file content
    try {
      testReportContent = await fs.readFile(testReportPath, 'utf8');
    } catch (err) {
      console.error("Failed to read test report file:", testReportPath, err);
      throw new Error(`Could not read test report file: ${testReportPath}`);
    }

    app = express();
    app.use(express.json());

    // --- Initialize routes with mocked services ---
    const router = uploadRoutes(mockFileProcessingService, mockWebSocketService);
    app.use('/api', router); // Mount router, assuming base path is /api
    // ---------------------------------------------

    request = supertest(app);
  });

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
  });

  describe('Report Parser', () => {
    it('should parse report header correctly', async () => {
      const result = await reportParser.parseReport(testReportContent);
      
      expect(result.metadata).toMatchObject({
        facilityId: '0067-BB',
        facility: '0067A',
        reportType: 'BLOOD_BANK'
      });
      expect(result.metadata.reportDate).toBeInstanceOf(Date);
    });

    it('should parse patient records correctly', async () => {
      const result = await reportParser.parseReport(testReportContent);

      expect(result.patients).toBeInstanceOf(Array);
      expect(result.patients.length).toBeGreaterThan(0);
      
      const firstPatient = result.patients[0];
      expect(firstPatient).toMatchObject({
        lastName: 'Smith',
        firstName: 'John',
        medicalRecordNumber: '12345',
        bloodType: 'A+',
        phenotype: 'Rh+',
        transfusionRequirements: ['Irradiated', 'Leukoreduced'],
        antibodies: ['Anti-K', 'Anti-E'],
        antigens: ['K-', 'E+']
      });
      expect(firstPatient.dateOfBirth).toBeInstanceOf(Date);
    });

    it('should parse patient comments correctly', async () => {
      const result = await reportParser.parseReport(testReportContent);
      
      const patientWithComments = result.patients.find(p => p.comments.length > 0);
      expect(patientWithComments).toBeDefined();
      
      const comment = patientWithComments.comments[0];
      expect(comment).toMatchObject({
        text: 'Patient requires special handling',
        author: 'System'
      });
      expect(comment.date).toBeInstanceOf(Date);
    });
  });

  describe('Report Validator', () => {
    it('should validate correct report data', async () => {
      const parsedReport = await reportParser.parseReport(testReportContent);
      const validation = await reportValidator.validateReport(parsedReport);
      
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect invalid blood types', async () => {
      const parsedReport = await reportParser.parseReport(testReportContent);
      parsedReport.patients[0].bloodType = 'INVALID';
      
      const validation = await reportValidator.validateReport(parsedReport);
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Invalid blood type: INVALID');
    });

    it('should detect duplicate medical record numbers', async () => {
      const parsedReport = await reportParser.parseReport(testReportContent);
      parsedReport.patients.push({ ...parsedReport.patients[0], firstName: "Duplicate" }); 
      
      const validation = await reportValidator.validateReport(parsedReport);
      expect(validation.isValid).toBe(true);
      expect(validation.warnings.length).toBeGreaterThan(0);
      expect(validation.warnings).toContainEqual(expect.stringContaining('Duplicate medical record numbers found: 12345'));
    });
  });

  describe('Upload API', () => {
    it('should accept valid report upload', async () => {
      // Mock successful processing
      const mockResult = { status: 'success', result: { text: 'Processed text' }, encryptedPath: '/path/to/encrypted' };
      mockFileProcessingService.processFile.mockResolvedValue(mockResult);

      const response = await request
          .post('/api/upload') // Updated path
          .attach('file', testReportPath); // Use 'file' as the field name
          
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.processed).toHaveLength(1);
      expect(response.body.processed[0]).toHaveProperty('fileId');
      expect(response.body.processed[0].originalName).toBe('EXAMPLEREPORT.txt');
      expect(mockFileProcessingService.processFile).toHaveBeenCalledTimes(1);
    });

    it('should reject non-text files if validation is set up for it', async () => {
       // Simulate validation middleware throwing an error (if it does for type)
       // Or mock file processing service rejecting based on internal checks
       const mockError = new Error('Invalid file type');
       mockError.status = 415; // Use appropriate status code
       mockFileProcessingService.processFile.mockRejectedValue(mockError);

       // Note: If FileValidationMiddleware handles this, the service mock might not be called.
       // This test assumes the error originates or is handled via the service call.
       const response = await request
           .post('/api/upload')
           .attach('file', Buffer.from('fake pdf content'), 'test.pdf');
           
       // Depending on where validation happens, status might be 415 or 400 or 500 if unhandled
       expect(response.status).toBe(415); // Or 400 based on error source
       expect(response.body.status).toBe('error');
       expect(response.body.message).toMatch(/Invalid file type|Malware detected/); // Adjust based on actual error
    });

    it('should handle missing file', async () => {
      const response = await request.post('/api/upload'); // No file attached
      
      expect(response.status).toBe(400); // Multer/Validation should catch this
      expect(response.body.status).toBe('error');
      expect(response.body.message).toMatch(/No file uploaded/);
    });

    // Add test for processing error
    it('should return error if file processing fails', async () => {
      // Mock processing failure
      const mockError = new Error('OCR engine failed');
      mockFileProcessingService.processFile.mockRejectedValue(mockError);

      const response = await request
        .post('/api/upload')
        .attach('file', testReportPath);

      expect(response.status).toBe(500); // Expecting 500 as wrapped by service/handler
      expect(response.body.status).toBe('error');
      expect(response.body.message).toBe('OCR engine failed');
      expect(mockFileProcessingService.processFile).toHaveBeenCalledTimes(1);
    });
  });
}); 