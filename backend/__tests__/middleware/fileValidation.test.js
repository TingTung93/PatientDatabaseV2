const FileValidationMiddleware = require('../../src/middleware/fileValidation');
const secureFileHandler = require('../../src/utils/secureFileHandler');
const fs = require('fs').promises;
const path = require('path');
const createError = require('http-errors');

// Mocks
jest.mock('../../src/utils/secureFileHandler', () => ({
  validateFile: jest.fn(),
  moveToQuarantine: jest.fn(),
  sanitizeFilename: jest.fn(filename => `sanitized_${filename}`),
  calculateChecksum: jest.fn().mockResolvedValue('mock-checksum-value'),
  secureDelete: jest.fn().mockResolvedValue(undefined),
  detectFileType: jest.fn()
}));

jest.mock('fs', () => ({
  promises: {
    mkdir: jest.fn().mockResolvedValue(undefined),
    stat: jest.fn().mockResolvedValue({ size: 1024 * 1024 }), // 1MB
    readFile: jest.fn().mockResolvedValue(Buffer.from('mock-buffer')),
    copyFile: jest.fn().mockResolvedValue(undefined),
    unlink: jest.fn().mockResolvedValue(undefined)
  }
}));

jest.mock('../../src/config/upload.config', () => ({
  upload: {
    tempDir: '/tmp/uploads',
    allowedTypes: ['image/jpeg', 'image/png', 'application/pdf'],
    maxFileSize: 10 * 1024 * 1024, // 10MB
    maxFilenameLength: 100,
    contentVerification: {
      enabled: true,
      mimeTypeStrict: true
    }
  },
  antivirus: {
    enabled: true
  }
}));

describe('FileValidationMiddleware', () => {
  let req, res, next;
  
  beforeEach(() => {
    req = {
      file: {
        path: '/tmp/original/test.jpg',
        originalname: 'test.jpg',
        size: 1024 * 1024, // 1MB
        mimetype: 'image/jpeg'
      }
    };
    
    res = {
      on: jest.fn()
    };
    
    next = jest.fn();
    
    jest.clearAllMocks();
  });
  
  describe('validateFileName', () => {
    it('should sanitize filenames', () => {
      secureFileHandler.sanitizeFilename.mockReturnValueOnce('sanitized_test.jpg');
      
      const result = FileValidationMiddleware.validateFileName('test.jpg');
      
      expect(secureFileHandler.sanitizeFilename).toHaveBeenCalledWith('test.jpg');
      expect(result).toBe('sanitized_test.jpg');
    });
    
    it('should reject filenames that are too long', () => {
      const longFilename = 'a'.repeat(200) + '.jpg';
      
      expect(() => {
        FileValidationMiddleware.validateFileName(longFilename);
      }).toThrow('Filename too long');
    });
  });
  
  describe('validateFileSize', () => {
    it('should pass for files within size limit', () => {
      expect(() => {
        FileValidationMiddleware.validateFileSize(req.file);
      }).not.toThrow();
    });
    
    it('should reject files exceeding size limit', () => {
      req.file.size = 20 * 1024 * 1024; // 20MB
      
      expect(() => {
        FileValidationMiddleware.validateFileSize(req.file);
      }).toThrow('File too large');
    });
  });
  
  describe('validateMimeType', () => {
    it('should validate MIME type against file content', async () => {
      secureFileHandler.detectFileType.mockReturnValueOnce('image/jpeg');
      
      await FileValidationMiddleware.validateMimeType(req.file);
      
      expect(fs.readFile).toHaveBeenCalledWith(req.file.path);
      expect(secureFileHandler.detectFileType).toHaveBeenCalled();
    });
    
    it('should reject files with mismatched content type', async () => {
      secureFileHandler.detectFileType.mockReturnValueOnce('image/png'); // Doesn't match image/jpeg
      
      await expect(
        FileValidationMiddleware.validateMimeType(req.file)
      ).rejects.toThrow('File content does not match declared type');
    });
    
    it('should reject undetectable file types', async () => {
      secureFileHandler.detectFileType.mockReturnValueOnce(null); // No detected type
      
      await expect(
        FileValidationMiddleware.validateMimeType(req.file)
      ).rejects.toThrow('File content does not match declared type');
    });
  });
  
  describe('scanForVirus', () => {
    it('should pass when file validation succeeds', async () => {
      secureFileHandler.validateFile.mockResolvedValueOnce({
        valid: true,
        message: 'File validation passed',
        type: 'image/jpeg'
      });
      
      const result = await FileValidationMiddleware.scanForVirus('/path/to/file.jpg');
      
      expect(secureFileHandler.validateFile).toHaveBeenCalledWith('/path/to/file.jpg');
      expect(result).toBe('image/jpeg');
    });
    
    it('should quarantine and reject infected files', async () => {
      secureFileHandler.validateFile.mockResolvedValueOnce({
        valid: false,
        message: 'Security threat detected: Virus found'
      });
      
      await expect(
        FileValidationMiddleware.scanForVirus('/path/to/infected.jpg')
      ).rejects.toThrow('Security threat detected: Virus found');
      
      expect(secureFileHandler.moveToQuarantine).toHaveBeenCalledWith('/path/to/infected.jpg');
    });
  });
  
  describe('validate middleware', () => {
    it('should process and validate files', async () => {
      secureFileHandler.detectFileType.mockReturnValueOnce('image/jpeg');
      secureFileHandler.validateFile.mockResolvedValueOnce({
        valid: true,
        message: 'File validation passed',
        type: 'image/jpeg'
      });
      
      const middleware = FileValidationMiddleware.validate();
      await middleware(req, res, next);
      
      // Should have processed the file correctly
      expect(req.validatedFiles).toBeDefined();
      expect(req.validatedFiles.length).toBe(1);
      expect(req.validatedFiles[0].checksum).toBe('mock-checksum-value');
      expect(next).toHaveBeenCalled();
      expect(next.mock.calls[0].length).toBe(0); // Called without error
    });
    
    it('should reject requests without files', async () => {
      req.file = undefined;
      
      const middleware = FileValidationMiddleware.validate();
      await middleware(req, res, next);
      
      expect(next).toHaveBeenCalled();
      const error = next.mock.calls[0][0];
      expect(error.statusCode).toBe(400);
      expect(error.message).toMatch(/No file uploaded/);
    });
    
    it('should handle multiple files', async () => {
      req.file = undefined;
      req.files = [
        {
          path: '/tmp/original/test1.jpg',
          originalname: 'test1.jpg',
          size: 1024 * 1024,
          mimetype: 'image/jpeg'
        },
        {
          path: '/tmp/original/test2.png',
          originalname: 'test2.png',
          size: 2 * 1024 * 1024,
          mimetype: 'image/png'
        }
      ];
      
      secureFileHandler.detectFileType.mockReturnValue('image/jpeg'); // Mock for both calls
      
      secureFileHandler.validateFile.mockResolvedValueOnce({
        valid: true,
        message: 'File validation passed',
        type: 'image/jpeg'
      });
      
      secureFileHandler.validateFile.mockResolvedValueOnce({
        valid: true,
        message: 'File validation passed',
        type: 'image/png'
      });
      
      const middleware = FileValidationMiddleware.validate();
      await middleware(req, res, next);
      
      expect(req.validatedFiles.length).toBe(2);
      expect(next).toHaveBeenCalled();
      expect(next.mock.calls[0].length).toBe(0);
    });
    
    it('should handle validation failures', async () => {
      secureFileHandler.detectFileType.mockReturnValueOnce('image/jpeg');
      secureFileHandler.validateFile.mockResolvedValueOnce({
        valid: false,
        message: 'Invalid file type'
      });
      
      const middleware = FileValidationMiddleware.validate();
      await middleware(req, res, next);
      
      expect(next).toHaveBeenCalledWith(expect.any(Error));
      expect(fs.unlink).toHaveBeenCalled(); // Should clean up temporary files
    });
  });
  
  describe('cleanup middleware', () => {
    it('should register cleanup handlers on response events', async () => {
      const middleware = FileValidationMiddleware.cleanup();
      await middleware(req, res, next);
      
      // Should register cleanup on response events
      expect(res.on).toHaveBeenCalledTimes(3);
      expect(res.on).toHaveBeenCalledWith('finish', expect.any(Function));
      expect(res.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(res.on).toHaveBeenCalledWith('close', expect.any(Function));
      expect(next).toHaveBeenCalled();
    });
    
    it('should securely delete temporary files', async () => {
      req.tempFilePaths = ['/tmp/temp1.jpg', '/tmp/temp2.jpg'];
      
      const middleware = FileValidationMiddleware.cleanup();
      await middleware(req, res, next);
      
      // Get the cleanup function that was registered
      const cleanupFn = res.on.mock.calls[0][1];
      await cleanupFn();
      
      // Should have tried to securely delete each temporary file
      expect(secureFileHandler.secureDelete).toHaveBeenCalledTimes(2);
      expect(secureFileHandler.secureDelete).toHaveBeenCalledWith('/tmp/temp1.jpg');
      expect(secureFileHandler.secureDelete).toHaveBeenCalledWith('/tmp/temp2.jpg');
    });
  });
}); 