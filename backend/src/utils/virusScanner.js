const NodeClam = require('clamscan');
const { antivirus } = require('../config/upload.config');
const createError = require('http-errors');
const logger = require('../utils/logger');

class VirusScanner {
  constructor() {
    this.config = antivirus.clamav;
    this.clamAV = null;
    this.initPromise = null;
  }

  async initialize() {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = new Promise(async (resolve, reject) => {
      try {
        // Initialize ClamAV scanner with fallback options
        this.clamAV = await new NodeClam({
          clamscan: {
            path: process.env.CLAMDSCAN_PATH || null,
            active: false // Don't use clamscan binary by default
          },
          clamdscan: {
            path: process.env.CLAMDSCAN_PATH || null,
            active: false // Don't use clamdscan binary by default
          },
          preference: 'clamdscan',
          socket: {
            host: this.config.host,
            port: this.config.port,
            timeout: this.config.timeout,
            active: true // Use socket connection by default
          }
        }).init();
        
        logger.info('ClamAV scanner initialized successfully');
        resolve(true);
      } catch (error) {
        logger.warn(`ClamAV initialization failed: ${error.message}. Continuing in fallback mode.`);
        // Don't reject, just resolve with false to indicate initialization failed
        // but we can continue in fallback mode
        resolve(false);
      }
    });

    return this.initPromise;
  }

  async scanFile(filePath) {
    if (!antivirus.enabled) {
      return { isClean: true, message: 'Virus scanning disabled' };
    }

    try {
      // Try to initialize ClamAV
      const initialized = await this.initialize();
      
      // If initialization failed and fallback mode is 'reject', reject the file
      if (!initialized && antivirus.fallbackMode === 'reject') {
        throw createError(500, 'Virus scanning unavailable and fallback mode is set to reject');
      }
      
      // If initialization failed and fallback mode is 'accept', accept the file
      if (!initialized && antivirus.fallbackMode === 'accept') {
        logger.warn(`Accepting file ${filePath} without virus scanning due to fallback mode`);
        return { isClean: true, message: 'File accepted without scanning (fallback mode)' };
      }

      // Scan the file
      const { isInfected, viruses } = await this.clamAV.scanFile(filePath);
      
      if (isInfected) {
        logger.warn(`Malware detected in file ${filePath}: ${viruses.join(', ')}`);
        return { isClean: false, message: `Malware detected: ${viruses.join(', ')}` };
      }
      
      return { isClean: true, message: 'File is clean' };
    } catch (error) {
      // If virus scanning fails and fallback mode is 'accept', accept the file
      if (antivirus.fallbackMode === 'accept') {
        logger.warn(`Accepting file ${filePath} without virus scanning due to error: ${error.message}`);
        return { isClean: true, message: 'File accepted without scanning (error fallback)' };
      }
      
      // Otherwise, reject with error
      throw createError(500, `Virus scanning error: ${error.message}`);
    }
  }
}

module.exports = new VirusScanner();
