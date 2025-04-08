const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const crypto = require('crypto');
const { upload } = require('../config/upload.config');
const createError = require('http-errors');
const virusScanner = require('./virusScanner');
// Import fileType correctly - it's an ESM module so we need to use dynamic import
// We'll add a function to detect file type

class SecureFileHandler {
  constructor() {
    this.quarantineDir = path.join(upload.tempDir, 'quarantine');
    this.ensureDirectories();
    this.allowedMimeTypes = [
      'image/jpeg', 'image/png', 'image/tiff', 
      'application/pdf', 'image/bmp', 'image/gif'
    ];
    this.maxFileSizeMB = 20; // 20MB max file size
  }

  async ensureDirectories() {
    await fs.mkdir(this.quarantineDir, { recursive: true });
  }

  async moveToQuarantine(filePath) {
    const fileName = path.basename(filePath);
    const quarantinePath = path.join(this.quarantineDir, 
      `${Date.now()}-${crypto.randomBytes(8).toString('hex')}-${fileName}`);
    
    await fs.copyFile(filePath, quarantinePath);
    await fs.unlink(filePath);
    
    return quarantinePath;
  }

  async calculateChecksum(filePath) {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const stream = fsSync.createReadStream(filePath);
      
      stream.on('data', data => hash.update(data));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', reject);
    });
  }

  async verifyChecksum(filePath, expectedChecksum) {
    const actualChecksum = await this.calculateChecksum(filePath);
    return actualChecksum === expectedChecksum;
  }

  async secureDelete(filePath) {
    try {
      // Overwrite file with random data before deletion
      const fileSize = (await fs.stat(filePath)).size;
      const fd = await fs.open(filePath, 'w');
      
      try {
        const randomData = crypto.randomBytes(64 * 1024); // 64KB chunks
        let bytesWritten = 0;
        
        while (bytesWritten < fileSize) {
          const writeSize = Math.min(randomData.length, fileSize - bytesWritten);
          await fd.write(randomData, 0, writeSize, bytesWritten);
          bytesWritten += writeSize;
        }
      } finally {
        await fd.close();
      }
      
      // Delete the overwritten file
      await fs.unlink(filePath);
    } catch (error) {
      throw createError(500, `Secure deletion failed: ${error.message}`);
    }
  }

  async cleanQuarantine(maxAge = 24 * 60 * 60 * 1000) { // 24 hours
    const files = await fs.readdir(this.quarantineDir);
    const now = Date.now();
    
    for (const file of files) {
      const filePath = path.join(this.quarantineDir, file);
      const stats = await fs.stat(filePath);
      
      if (now - stats.mtimeMs > maxAge) {
        await this.secureDelete(filePath);
      }
    }
  }

  /**
   * Detects file type based on file signature
   * @param {Buffer} buffer - File buffer
   * @returns {string|null} - MIME type or null if not detected
   */
  detectFileType(buffer) {
    // Common file signatures (magic numbers)
    const signatures = {
      'ffd8ff': 'image/jpeg',
      '89504e47': 'image/png',
      '47494638': 'image/gif',
      '25504446': 'application/pdf',
      '4d4d002a': 'image/tiff', // Big-endian TIFF
      '49492a00': 'image/tiff', // Little-endian TIFF
      '424d': 'image/bmp'
    };
    
    // Get first 4 bytes as hex
    const hex = buffer.slice(0, 4).toString('hex').toLowerCase();
    
    // Check against signatures
    for (const [signature, mimeType] of Object.entries(signatures)) {
      if (hex.startsWith(signature)) {
        return mimeType;
      }
    }
    
    return null;
  }

  /**
   * Validates if a file is safe to process
   * @param {string} filePath - Path to the file
   * @returns {Promise<Object>} Validation result with status and message
   */
  async validateFile(filePath) {
    try {
      // Check file size
      const stats = await fs.stat(filePath);
      const fileSizeMB = stats.size / (1024 * 1024);
      
      if (fileSizeMB > this.maxFileSizeMB) {
        return {
          valid: false,
          message: `File exceeds maximum size of ${this.maxFileSizeMB}MB`
        };
      }

      // Check file type
      const buffer = await fs.readFile(filePath, { length: 4100 }); // First 4100 bytes for file type detection
      const mimeType = this.detectFileType(buffer);
      
      if (!mimeType || !this.allowedMimeTypes.includes(mimeType)) {
        return {
          valid: false,
          message: `Invalid file type. Allowed types: ${this.allowedMimeTypes.join(', ')}`
        };
      }

      // Scan for viruses
      const scanResult = await virusScanner.scanFile(filePath);
      if (!scanResult.safe) {
        await this.moveToQuarantine(filePath);
        return {
          valid: false,
          message: `Security threat detected: ${scanResult.message}`
        };
      }

      return {
        valid: true,
        message: 'File validation passed',
        type: mimeType
      };
    } catch (error) {
      throw createError(500, `File validation failed: ${error.message}`);
    }
  }

  /**
   * Sanitizes a filename to prevent path traversal and XSS
   * @param {string} filename - Original filename
   * @returns {string} Sanitized filename
   */
  sanitizeFilename(filename) {
    // Remove path traversal characters and limit to alphanumeric, dash, underscore, and period
    let sanitized = filename.replace(/[^a-zA-Z0-9.-_]/g, '_');
    
    // Ensure no double extensions that could bypass filters
    sanitized = sanitized.replace(/\.{2,}/g, '.');
    
    // Add timestamp for uniqueness
    const timestamp = Date.now();
    const ext = path.extname(sanitized);
    const base = path.basename(sanitized, ext);
    
    return `${base}_${timestamp}${ext}`;
  }
}

module.exports = new SecureFileHandler();