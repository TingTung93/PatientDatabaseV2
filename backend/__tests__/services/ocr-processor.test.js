const fs = require('fs');
const path = require('path');
const { OCRProcessor } = require('../../src/ocr/ocr_processor');
const sharp = require('sharp');

// Mock the external dependencies
jest.mock('child_process', () => ({
  spawn: jest.fn(() => ({
    stdout: {
      on: jest.fn((event, callback) => {
        if (event === 'data') {
          callback(Buffer.from(JSON.stringify({ 
            text: 'Sample OCR Text',
            data: {
              patientName: 'John Doe',
              dateOfBirth: '01/15/1980',
              bloodType: 'A+'
            }
          })));
        }
      })
    },
    stderr: { on: jest.fn() },
    on: jest.fn((event, callback) => {
      if (event === 'close') {
        callback(0); // exit code 0 = success
      }
    })
  }))
}));

jest.mock('sharp', () => {
  const mockSharp = {
    grayscale: jest.fn().mockReturnThis(),
    normalize: jest.fn().mockReturnThis(),
    blur: jest.fn().mockReturnThis(),
    threshold: jest.fn().mockReturnThis(),
    resize: jest.fn().mockReturnThis(),
    png: jest.fn().mockReturnThis(),
    toFile: jest.fn().mockResolvedValue(true)
  };
  return jest.fn(() => mockSharp);
});

jest.mock('fs', () => ({
  promises: {
    mkdir: jest.fn().mockResolvedValue(undefined),
    stat: jest.fn().mockResolvedValue({ size: 1024 })
  }
}));

describe('OCRProcessor', () => {
  let ocrProcessor;
  const testImagePath = 'test_data/sample_image.png';
  
  beforeEach(() => {
    ocrProcessor = new OCRProcessor();
    jest.clearAllMocks();
  });
  
  describe('preprocessImage', () => {
    it('should apply image preprocessing steps', async () => {
      await ocrProcessor.preprocessImage(testImagePath);
      
      // Check that sharp was initialized with the image path
      expect(sharp).toHaveBeenCalledWith(testImagePath);
      
      // Verify all preprocessing steps were called
      const mockSharpInstance = sharp.mock.results[0].value;
      expect(mockSharpInstance.grayscale).toHaveBeenCalled();
      expect(mockSharpInstance.normalize).toHaveBeenCalled();
      expect(mockSharpInstance.blur).toHaveBeenCalledWith(0.5);
      expect(mockSharpInstance.threshold).toHaveBeenCalledWith(128);
      expect(mockSharpInstance.resize).toHaveBeenCalledWith(expect.objectContaining({
        width: 2000,
        height: 2000,
        fit: 'inside',
        withoutEnlargement: true
      }));
      expect(mockSharpInstance.png).toHaveBeenCalledWith({ quality: 100 });
      expect(mockSharpInstance.toFile).toHaveBeenCalled();
    });
    
    it('should handle preprocessing errors', async () => {
      const error = new Error('Preprocessing failed');
      sharp().toFile.mockRejectedValueOnce(error);
      
      await expect(ocrProcessor.preprocessImage(testImagePath))
        .rejects.toThrow('Image preprocessing failed: Preprocessing failed');
    });
  });
  
  describe('process_image', () => {
    it('should preprocess image before OCR when preprocess=true', async () => {
      const result = await ocrProcessor.process_image(testImagePath, true);
      
      expect(sharp).toHaveBeenCalled();
      expect(result).toBe('Sample OCR Text');
    });
    
    it('should skip preprocessing when preprocess=false', async () => {
      await ocrProcessor.process_image(testImagePath, false);
      
      expect(sharp).not.toHaveBeenCalled();
    });
  });
  
  describe('validateExtractedData', () => {
    it('should validate and correct patient data', () => {
      const data = {
        patientName: 'John Doe',
        dateOfBirth: '01/15/1980',
        bloodType: 'a+'
      };
      
      const result = ocrProcessor.validateExtractedData(data);
      
      expect(result.valid).toBe(true);
      expect(result.data.bloodType).toBe('A+'); // Should normalize blood type
    });
    
    it('should detect invalid data', () => {
      const data = {
        patientName: 'J', // Too short
        dateOfBirth: 'invalid-date',
        bloodType: 'Z+' // Invalid blood type
      };
      
      const result = ocrProcessor.validateExtractedData(data);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(3);
      expect(result.errors).toContain('Patient name is too short');
      expect(result.errors).toContain('Date of birth format is invalid');
      expect(result.errors).toContain('Blood type is invalid');
    });
    
    it('should detect missing required fields', () => {
      const data = {
        bloodType: 'A+'
        // Missing patient name and date of birth
      };
      
      const result = ocrProcessor.validateExtractedData(data);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Patient name is missing');
      expect(result.errors).toContain('Date of birth is missing');
    });
    
    it('should reformat valid date of birth', () => {
      const data = {
        patientName: 'John Doe',
        dateOfBirth: '1/5/1980', // MM/DD/YYYY format
        bloodType: 'O-'
      };
      
      const result = ocrProcessor.validateExtractedData(data);
      
      expect(result.valid).toBe(true);
      expect(result.data.dateOfBirth).toBe('1980-01-05'); // Should be YYYY-MM-DD
    });
  });
}); 