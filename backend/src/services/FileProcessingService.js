const sharp = require('sharp');
const crypto = require('crypto');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const { EventEmitter } = require('events');
const { processing, upload } = require('../config/upload.config');
const createError = require('http-errors');
const sanitize = require('sanitize-filename');
const virusScanner = require('../utils/virusScanner');
const secureFileHandler = require('../utils/secureFileHandler');

class FileProcessingService extends EventEmitter {
  constructor(websocketService) {
    super();
    this.websocketService = websocketService;
    this.processingQueue = new Map();
    this.fileHashes = new Map();
    this.encryptionKey = this.getEncryptionKey();
  }

  getEncryptionKey() {
    const key = process.env.FILE_ENCRYPTION_KEY;
    if (!key) {
      throw new Error('FILE_ENCRYPTION_KEY environment variable is required');
    }
    return Buffer.from(key, 'base64');
  }

  async processFile(fileId, inputPath) {
    let quarantinePath = null;
    let tempPaths = [];
    
    try {
      this.processingQueue.set(fileId, { status: 'processing' });
      this.updateProgress(fileId, 'started', 0);

      // Sanitize and validate path
      inputPath = this.sanitizePath(inputPath);
      const originalChecksum = await secureFileHandler.calculateChecksum(inputPath);

      // Move to quarantine
      this.updateProgress(fileId, 'quarantine', 10);
      quarantinePath = await secureFileHandler.moveToQuarantine(inputPath);
      tempPaths.push(quarantinePath);

      // Virus scan
      this.updateProgress(fileId, 'virus-scan', 20);
      const scanResult = await virusScanner.scanFile(quarantinePath);
      if (!scanResult.isClean) {
        throw createError(400, 'Malware detected in file');
      }

      // Verify integrity
      if (!await secureFileHandler.verifyChecksum(quarantinePath, originalChecksum)) {
        throw createError(400, 'File integrity check failed');
      }

      // Check for duplicates
      this.updateProgress(fileId, 'deduplication', 30);
      const { isDuplicate, originalPath } = await this.isDuplicate(quarantinePath);
      if (isDuplicate) {
        this.updateProgress(fileId, 'completed', 100);
        return { status: 'duplicate', originalPath };
      }

      // Optimize image
      this.updateProgress(fileId, 'optimization', 50);
      const optimizedPath = path.join(
        path.dirname(quarantinePath),
        `opt-${crypto.randomBytes(8).toString('hex')}-${path.basename(quarantinePath)}`
      );
      tempPaths.push(optimizedPath);
      
      await this.processWithRetry(
        this.optimizeImage.bind(this),
        [quarantinePath, optimizedPath]
      );

      // Process OCR
      this.updateProgress(fileId, 'ocr', 70);
      const ocrResult = await this.processWithRetry(
        this.performOCR.bind(this),
        [optimizedPath]
      );

      // Encrypt the processed file
      this.updateProgress(fileId, 'encryption', 90);
      const encryptedPath = path.join(
        path.dirname(optimizedPath),
        `enc-${crypto.randomBytes(8).toString('hex')}-${path.basename(optimizedPath)}`
      );
      tempPaths.push(encryptedPath);
      
      await this.encryptFile(optimizedPath, encryptedPath);

      // Clean up intermediate files
      await secureFileHandler.secureDelete(quarantinePath);
      await secureFileHandler.secureDelete(optimizedPath);
      tempPaths = tempPaths.filter(p => p !== quarantinePath && p !== optimizedPath);

      this.updateProgress(fileId, 'completed', 100);
      this.processingQueue.set(fileId, { 
        status: 'completed',
        encryptedPath,
        originalHash: originalChecksum
      });

      return {
        status: 'success',
        result: this.sanitizeOCRResult(ocrResult),
        encryptedPath
      };

    } catch (error) {
      // Clean up all temporary files securely
      await Promise.all(tempPaths.map(tempPath => 
        secureFileHandler.secureDelete(tempPath).catch(() => {})
      ));

      const status = error.status || error.statusCode || 500;
      const message = error.message || 'File processing failed';

      this.processingQueue.set(fileId, { 
        status: 'error',
        error: message
      });
      
      this.emit('error', {
        fileId,
        error: message,
        timestamp: Date.now()
      });

      // Wrap non-HTTP errors before re-throwing
      if (!error.status && !error.statusCode) {
          throw createError(status, message, { originalError: error });
      } else {
          throw error; // Re-throw original HTTP error
      }
    }
  }

  async encryptFile(inputPath, outputPath) {
    const iv = crypto.randomBytes(processing.encryption.ivSize);
    const cipher = crypto.createCipheriv(
      processing.encryption.algorithm,
      this.encryptionKey,
      iv
    );

    const input = fsSync.createReadStream(inputPath);
    const output = fsSync.createWriteStream(outputPath);

    // Write IV at the beginning of the file
    output.write(iv);

    return new Promise((resolve, reject) => {
      input.pipe(cipher).pipe(output)
        .on('finish', () => resolve(outputPath))
        .on('error', reject);
    });
  }

  async decryptFile(inputPath, outputPath) {
    const input = fsSync.createReadStream(inputPath);
    const output = fsSync.createWriteStream(outputPath);

    // Read IV from the beginning of the file
    const ivBuffer = Buffer.alloc(processing.encryption.ivSize);
    await new Promise((resolve, reject) => {
      input.on('readable', () => {
        input.read(processing.encryption.ivSize);
        resolve();
      }).on('error', reject);
    });

    const decipher = crypto.createDecipheriv(
      processing.encryption.algorithm,
      this.encryptionKey,
      ivBuffer
    );

    return new Promise((resolve, reject) => {
      input.pipe(decipher).pipe(output)
        .on('finish', () => resolve(outputPath))
        .on('error', reject);
    });
  }

  // ... [Previous helper methods remain unchanged]
  async calculateFileHash(filePath) {
    return secureFileHandler.calculateChecksum(filePath);
  }

  async isDuplicate(filePath) {
    const hash = await this.calculateFileHash(filePath);
    const existingPath = this.fileHashes.get(hash);
    
    if (existingPath && await fs.access(existingPath).then(() => true).catch(() => false)) {
      return { isDuplicate: true, originalPath: existingPath };
    }
    
    this.fileHashes.set(hash, filePath);
    return { isDuplicate: false };
  }

  sanitizePath(inputPath) {
    const sanitizedName = sanitize(path.basename(inputPath));
    if (sanitizedName !== path.basename(inputPath)) {
      throw createError(400, 'Invalid characters in filename');
    }
    return path.join(path.dirname(inputPath), sanitizedName);
  }

  async optimizeImage(inputPath, outputPath) {
    try {
      const metadata = await sharp(inputPath).metadata();
      
      if (metadata.width > 8000 || metadata.height > 8000) {
        throw createError(400, 'Image dimensions too large');
      }

      await sharp(inputPath)
        .resize(2000, 2000, { 
          fit: 'inside',
          withoutEnlargement: true 
        })
        .jpeg({ 
          quality: 85, 
          progressive: true,
          force: false
        })
        .withMetadata({
          strip: true
        })
        .toFile(outputPath);

      return outputPath;
    } catch (error) {
      throw createError(500, `Image optimization failed: ${error.message}`);
    }
  }

  async processWithRetry(processingFn, args, retryCount = 0) {
    try {
      return await processingFn(...args);
    } catch (error) {
      if (retryCount < processing.maxRetries) {
        await new Promise(resolve => setTimeout(resolve, processing.retryDelay));
        return this.processWithRetry(processingFn, args, retryCount + 1);
      }
      throw error;
    }
  }

  updateProgress(fileId, stage, progress, detail = '') {
    const update = {
      fileId,
      stage,
      progress,
      detail: this.sanitizeProgressDetail(detail),
      timestamp: Date.now()
    };
    
    this.emit('progress', update);
    if (this.websocketService) {
      this.websocketService.broadcastProgress(update);
    }
  }

  sanitizeProgressDetail(detail) {
    return detail.replace(/[^\w\s-]/g, '');
  }

  sanitizeOCRResult(result) {
    if (!result) return null;
    
    const allowedFields = {
      text: (text) => text.replace(/[^\w\s-]/g, ''),
      confidence: (conf) => typeof conf === 'number' ? conf : 0,
      bounds: (bounds) => {
        if (!bounds || typeof bounds !== 'object') return null;
        return {
          x: parseInt(bounds.x) || 0,
          y: parseInt(bounds.y) || 0,
          width: parseInt(bounds.width) || 0,
          height: parseInt(bounds.height) || 0
        };
      }
    };

    const sanitized = {};
    for (const [key, sanitizer] of Object.entries(allowedFields)) {
      if (key in result) {
        sanitized[key] = sanitizer(result[key]);
      }
    }

    return sanitized;
  }

  async performOCR(filePath) {
    // This is a placeholder for OCR implementation
    throw new Error('OCR processing not implemented');
  }

  getProcessingStatus(fileId) {
    return this.processingQueue.get(fileId) || { status: 'not_found' };
  }

  async cleanup() {
    const cleanupPromises = [];

    for (const [fileId, status] of this.processingQueue.entries()) {
      if (status.encryptedPath) {
        cleanupPromises.push(
          secureFileHandler.secureDelete(status.encryptedPath)
            .catch(error => console.error(`Failed to delete ${status.encryptedPath}:`, error))
        );
      }
    }

    await Promise.all(cleanupPromises);
    this.processingQueue.clear();
    this.fileHashes.clear();
  }
}

module.exports = FileProcessingService;