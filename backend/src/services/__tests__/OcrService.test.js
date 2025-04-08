const path = require('path');
const fs = require('fs').promises;
const { spawn } = require('child_process');
const OcrService = require('../OcrService');
const { OcrError } = require('../../utils/errors');

// Mock dependencies
jest.mock('child_process');
jest.mock('fs', () => ({
  promises: {
    access: jest.fn(),
    unlink: jest.fn()
  }
}));
jest.mock('sharp', () => {
  return jest.fn(() => ({
    resize: jest.fn().mockReturnThis(),
    normalize: jest.fn().mockReturnThis(),
    modulate: jest.fn().mockReturnThis(),
    sharpen: jest.fn().mockReturnThis(),
    threshold: jest.fn().mockReturnThis(),
    toFile: jest.fn().mockResolvedValue(true)
  }));
});
jest.mock('../../repositories/OcrResultRepository');
jest.mock('../../repositories/PatientRepository');
jest.mock('../../utils/logger');

describe('OcrService', () => {
  let ocrService;
  const mockImagePath = '/path/to/image.jpg';
  const mockPreprocessedPath = '/path/to/preprocessed_image.jpg';

  beforeEach(() => {
    jest.clearAllMocks();
    ocrService = new OcrService();
    
    // Mock filesystem access checks
    fs.access.mockResolvedValue(undefined);
  });

  describe('process', () => {
    it('should successfully process an image through all steps', async () => {
      const mockRawResults = {
        patient_info: {
          name: 'John Doe',
          dob: '1990-01-01',
          mrn: '12345'
        },
        phenotype_data: ['A+', 'B-'],
        debug_info: {
          confidence_scores: { overall: 0.9 },
          processing_time: 5000
        }
      };

      // Mock the child process
      const mockSpawn = {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn(),
        kill: jest.fn()
      };
      spawn.mockReturnValue(mockSpawn);

      // Simulate successful process completion
      process.nextTick(() => {
        const stdoutHandler = mockSpawn.stdout.on.mock.calls[0][1];
        stdoutHandler(JSON.stringify({ status: 'success', data: mockRawResults }));
        const closeHandler = mockSpawn.on.mock.calls.find(call => call[0] === 'close')[1];
        closeHandler(0);
      });

      const result = await ocrService.process({ path: mockImagePath });

      expect(result).toBeDefined();
      expect(result.extractedData).toHaveProperty('name', 'John Doe');
      expect(result.extractedData).toHaveProperty('dateOfBirth', '1990-01-01');
      expect(result.metadata).toBeDefined();
      expect(result.metadata.originalImage).toBe(mockImagePath);
    });

    it('should handle preprocessing errors', async () => {
      const mockError = new Error('Preprocessing failed');
      require('sharp').mockImplementation(() => {
        throw mockError;
      });

      await expect(ocrService.process({ path: mockImagePath }))
        .rejects
        .toThrow('Image preprocessing failed');
    });

    it('should handle OCR processing timeout', async () => {
      const mockSpawn = {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn(),
        kill: jest.fn()
      };
      spawn.mockReturnValue(mockSpawn);

      // Don't call any handlers to simulate timeout
      const processPromise = ocrService.process({ path: mockImagePath });

      await expect(processPromise).rejects.toThrow('OCR processing timeout');
    });
  });

  describe('preprocess', () => {
    it('should preprocess image with correct parameters', async () => {
      await ocrService.preprocess(mockImagePath);

      const sharp = require('sharp');
      expect(sharp).toHaveBeenCalledWith(mockImagePath);
      expect(sharp().resize).toHaveBeenCalledWith({
        width: 2000,
        height: 2000,
        fit: 'inside'
      });
      expect(sharp().threshold).toHaveBeenCalled();
    });
  });

  describe('postprocess', () => {
    it('should structure raw results correctly', async () => {
      const mockRawResults = {
        patient_info: {
          name: '  John   Doe  ',
          dob: '1990-01-01',
          mrn: '  12345  '
        },
        phenotype_data: ['  A+  ', '  B-  '],
        debug_info: {
          confidence_scores: { overall: 0.9 },
          processing_time: 5000
        }
      };

      const result = await ocrService.postprocess(mockRawResults);

      expect(result.extractedData).toEqual({
        name: 'John Doe',
        dateOfBirth: '1990-01-01',
        medicalRecordNumber: '12345',
        phenotypes: ['A+', 'B-']
      });
      expect(result.validationStatus.isValid).toBe(true);
    });

    it('should identify missing required fields', async () => {
      const mockRawResults = {
        patient_info: {
          name: 'John Doe',
          // Missing DOB and MRN
        },
        phenotype_data: [],
        debug_info: {
          confidence_scores: { overall: 0.9 },
          processing_time: 5000
        }
      };

      const result = await ocrService.postprocess(mockRawResults);

      expect(result.validationStatus.isValid).toBe(false);
      expect(result.validationStatus.missingFields).toContain('dob');
      expect(result.validationStatus.missingFields).toContain('mrn');
    });
  });

  describe('updateWithCorrections', () => {
    it('should update OCR result with corrections', async () => {
      const mockResultId = '123';
      const mockCorrections = {
        name: 'Jane Doe',
        dateOfBirth: '1991-01-01'
      };
      const mockOriginalResult = {
        extractedData: {
          name: 'John Doe',
          dateOfBirth: '1990-01-01',
          medicalRecordNumber: '12345'
        },
        metadata: {
          originalImage: 'path/to/image.jpg'
        }
      };

      ocrService.ocrResultRepository.findById.mockResolvedValue(mockOriginalResult);
      ocrService.ocrResultRepository.update.mockResolvedValue({
        ...mockOriginalResult,
        extractedData: {
          ...mockOriginalResult.extractedData,
          ...mockCorrections
        }
      });

      const result = await ocrService.updateWithCorrections(mockResultId, mockCorrections);

      expect(result.extractedData.name).toBe('Jane Doe');
      expect(result.extractedData.dateOfBirth).toBe('1991-01-01');
      expect(result.metadata.corrected).toBe(true);
      expect(result.metadata.correctionTimestamp).toBeDefined();
    });

    it('should throw error when result not found', async () => {
      ocrService.ocrResultRepository.findById.mockResolvedValue(null);

      await expect(ocrService.updateWithCorrections('123', {}))
        .rejects
        .toThrow('OCR result not found');
    });
  });
});