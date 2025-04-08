const { upload, antivirus } = require('../config/upload.config');
const createError = require('http-errors');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const crypto = require('crypto');
const secureFileHandler = require('../utils/secureFileHandler');
const logger = require('../utils/logger');

class FileValidationMiddleware {
  static async validateMimeType(file) {
    if (!upload.allowedTypes.includes(file.mimetype)) {
      throw createError(415, `Invalid file type. Allowed types: ${upload.allowedTypes.join(', ')}`);
    }

    if (upload.contentVerification.enabled && upload.contentVerification.mimeTypeStrict) {
      const buffer = await fs.readFile(file.path);
      // Use secureFileHandler's detectFileType instead of file signatures
      const detectedType = secureFileHandler.detectFileType(buffer);
      
      if (!detectedType || detectedType !== file.mimetype) {
        throw createError(415, 'File content does not match declared type');
      }
    }
  }

  static validateFileSize(file) {
    if (file.size > upload.maxFileSize) {
      throw createError(413, `File too large. Maximum size: ${upload.maxFileSize / 1024 / 1024}MB`);
    }
  }

  static validateFileName(filename) {
    if (filename.length > upload.maxFilenameLength) {
      throw createError(400, `Filename too long. Maximum length: ${upload.maxFilenameLength}`);
    }

    // Use secureFileHandler to sanitize filename
    const sanitizedName = secureFileHandler.sanitizeFilename(filename);
    if (sanitizedName !== filename) {
      // Instead of throwing an error, we'll now use the sanitized filename
      return sanitizedName;
    }
    
    return filename;
  }

  static async scanForVirus(filePath) {
    if (!antivirus.enabled) return;

    try {
      // Leverage secureFileHandler's validation
      const validationResult = await secureFileHandler.validateFile(filePath);
      
      if (!validationResult.valid) {
        // If validation failed, move to quarantine
        await secureFileHandler.moveToQuarantine(filePath);
        throw createError(400, validationResult.message);
      }
      
      return validationResult.type; // Return detected mime type
    } catch (err) {
      if (err.statusCode) {
        throw err; // Re-throw HTTP errors
      }
      throw createError(500, `Security validation failed: ${err.message}`);
    }
  }

  static async ensureTempDirectory() {
    try {
      await fs.mkdir(upload.tempDir, { recursive: true, mode: 0o750 });
    } catch (error) {
      throw createError(500, 'Failed to create temp directory');
    }
  }

  static async generateTempFilePath(originalName) {
    const timestamp = Date.now();
    const randomBytes = crypto.randomBytes(16).toString('hex');
    const sanitizedName = secureFileHandler.sanitizeFilename(path.basename(originalName));
    return path.join(upload.tempDir, `${timestamp}-${randomBytes}-${sanitizedName}`);
  }

  static getFileHash(filePath) {
    return secureFileHandler.calculateChecksum(filePath);
  }

  static validate() {
    return async (req, res, next) => {
      try {
        if (!req.file && !req.files) {
          throw createError(400, 'No file uploaded');
        }

        const files = req.files || [req.file];
        req.tempFilePaths = [];
        req.validatedFiles = [];

        await this.ensureTempDirectory();

        for (const file of files) {
          // Sanitize filename
          const sanitizedName = this.validateFileName(file.originalname);
          file.originalname = sanitizedName;
          
          // Validate size
          this.validateFileSize(file);
          
          // Validate MIME type
          await this.validateMimeType(file);
          
          // Move to temporary location
          const tempPath = await this.generateTempFilePath(file.originalname);
          await fs.copyFile(file.path, tempPath);
          
          // Calculate checksum for integrity verification
          const checksum = await this.getFileHash(tempPath);
          
          // Scan for viruses and validate file
          const detectedMimeType = await this.scanForVirus(tempPath);
          
          // Store validated file info
          req.validatedFiles.push({
            originalName: file.originalname,
            tempPath,
            size: file.size,
            mimeType: detectedMimeType || file.mimetype,
            checksum
          });
          
          req.tempFilePaths.push(tempPath);

          // Clean up the original file
          await fs.unlink(file.path);
          
          logger.info('File validated successfully', {
            filename: file.originalname,
            size: file.size,
            mimeType: detectedMimeType || file.mimetype
          });
        }

        next();
      } catch (error) {
        // Clean up any temporary files if validation fails
        if (req.tempFilePaths) {
          await Promise.all(req.tempFilePaths.map(tempPath => 
            fs.unlink(tempPath).catch(() => {})
          ));
        }
        
        logger.error('File validation failed', { 
          error: error.message,
          status: error.statusCode || 500
        });
        
        next(error);
      }
    };
  }

  static cleanup() {
    return async (req, res, next) => {
      const cleanupTemp = async () => {
        if (req.tempFilePaths) {
          for (const tempPath of req.tempFilePaths) {
            try {
              // Use secureDelete for better security
              await secureFileHandler.secureDelete(tempPath);
            } catch (error) {
              logger.warn(`Failed to securely delete temp file: ${tempPath}`, { error: error.message });
            }
          }
        }
      };

      // Cleanup on response finish
      res.on('finish', cleanupTemp);
      
      // Cleanup on error
      res.on('error', cleanupTemp);

      // Ensure cleanup on unhandled errors
      res.on('close', cleanupTemp);

      next();
    };
  }
}

module.exports = FileValidationMiddleware;