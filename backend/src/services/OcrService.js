const { spawn } = require('child_process');
const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const sharp = require('sharp');
const logger = require('../utils/logger');
const { OcrError } = require('../utils/errors');

// Configuration constants
const OCR_CONFIG = {
  preprocessing: {
    defaultDPI: 300,
    binarizationThreshold: 128,
    denoise: true,
    contrast: 1.2
  },
  timeouts: {
    initialization: 60000, // 60 seconds
    processing: 30000 // 30 seconds
  }
};

class OCRService {
  constructor() {
    this.pythonProcess = null;
    this.isReady = false;
    this.requestQueue = [];
    this.currentRequest = null;
    this.pythonScript = path.join(__dirname, '../../python/ocr_server.py');
    this.pythonPath = path.join(__dirname, '../../venv/Scripts/python.exe');
    
    // Don't initialize repositories in constructor
    this._patientRepository = null;
    this._ocrResultRepository = null;
  }

  // Lazy-load repositories
  get patientRepository() {
    if (!this._patientRepository) {
      const PatientRepository = require('../repositories/PatientRepository');
      this._patientRepository = new PatientRepository();
    }
    return this._patientRepository;
  }

  get ocrResultRepository() {
    if (!this._ocrResultRepository) {
      const OcrResultRepository = require('../repositories/OcrResultRepository');
      this._ocrResultRepository = new OcrResultRepository();
    }
    return this._ocrResultRepository;
  }

  async checkPath(filePath, description) {
    try {
      await fs.promises.access(filePath, fs.constants.F_OK);
      logger.debug(`Found ${description} at: ${filePath}`);
      return true;
    } catch (error) {
      throw new Error(`${description} not found at: ${filePath}`);
    }
  }

  async initialize() {
    if (this.pythonProcess) {
      logger.info('OCR service already initialized');
      return;
    }

    return new Promise(async (resolve, reject) => {
      try {
        // Determine paths
        const isWindows = process.platform === 'win32';
        const venvPath = path.join(__dirname, '../../venv');
        const pythonPath = path.join(venvPath, isWindows ? 'Scripts/python.exe' : 'bin/python');
        const scriptPath = path.join(__dirname, '../../python/ocr_server.py');

        logger.info('Starting OCR service with paths:', {
          venvPath,
          pythonPath,
          scriptPath
        });

        // Verify paths exist
        await this.checkPath(venvPath, 'Virtual environment');
        await this.checkPath(pythonPath, 'Python executable');
        await this.checkPath(scriptPath, 'OCR server script');

        // Set up environment variables for the Python process
        const env = {
          ...process.env,
          VIRTUAL_ENV: venvPath,
          PATH: `${path.dirname(pythonPath)}${path.delimiter}${process.env.PATH}`,
          PYTHONPATH: path.join(__dirname, '../..')
        };

        // Remove PYTHONHOME if it exists as it can interfere with venv
        delete env.PYTHONHOME;

        // Log Python environment details
        logger.info('Python environment:', {
          VIRTUAL_ENV: env.VIRTUAL_ENV,
          PYTHONPATH: env.PYTHONPATH,
          PATH: env.PATH
        });

        // Spawn the Python process
        this.pythonProcess = spawn(pythonPath, [scriptPath], {
          env,
          stdio: ['pipe', 'pipe', 'pipe'],
          windowsHide: true
        });

        let initializationTimeout = setTimeout(() => {
          const error = new Error('OCR service initialization timed out');
          logger.error(error);
          this.pythonProcess.kill();
          reject(error);
        }, OCR_CONFIG.timeouts.initialization);

        // Handle process events
        this.pythonProcess.on('error', (err) => {
          clearTimeout(initializationTimeout);
          logger.error('Failed to start Python process:', err);
          reject(err);
        });

        this.pythonProcess.on('exit', (code, signal) => {
          const message = `Python process exited with code ${code} and signal ${signal}`;
          logger.info(message);
          this.isReady = false;
          this.pythonProcess = null;
          
          // If we have a current request, reject it
          if (this.currentRequest) {
            this.currentRequest.reject(new Error('OCR service terminated unexpectedly'));
            this.currentRequest = null;
          }

          // If we haven't resolved yet, this is an initialization failure
          if (!this.isReady) {
            reject(new Error(message));
          }
        });

        // Handle stdout
        let buffer = '';
        this.pythonProcess.stdout.on('data', (data) => {
          buffer += data.toString();
          
          // Process complete lines
          const lines = buffer.split('\n');
          buffer = lines.pop(); // Keep the last incomplete line
          
          for (const line of lines) {
            try {
              const response = JSON.parse(line);
              logger.debug('Received response from Python process:', response);
              
              if (response.status === 'ready') {
                clearTimeout(initializationTimeout);
                this.isReady = true;
                resolve();
              } else if (response.status === 'error') {
                logger.error('Python process error:', response.error);
                reject(new Error(response.error));
              } else if (this.currentRequest) {
                this.currentRequest.resolve(response);
                this.currentRequest = null;
                this.processNextRequest();
              }
            } catch (err) {
              logger.error('Error parsing Python response:', err);
              logger.error('Problematic line:', line);
            }
          }
        });

        // Handle stderr
        let stderrBuffer = '';
        this.pythonProcess.stderr.on('data', (data) => {
          stderrBuffer += data.toString();
          
          // Only log non-empty lines
          const lines = stderrBuffer.split('\n');
          stderrBuffer = lines.pop(); // Keep the last incomplete line
          
          for (const line of lines) {
            if (line.trim()) {
              logger.error('Python stderr:', line);
              
              // Check for specific error patterns
              if (line.includes('ModuleNotFoundError')) {
                logger.error('Python module not found. Please ensure all dependencies are installed in the virtual environment');
              } else if (line.includes('not running in a virtual environment')) {
                logger.error('Python process not running in virtual environment');
              }
            }
          }
        });

      } catch (err) {
        logger.error('Error initializing OCR service:', err);
        reject(err);
      }
    });
  }

  async processNextRequest() {
    if (this.currentRequest || this.requestQueue.length === 0) {
      return;
    }

    this.currentRequest = this.requestQueue.shift();
    this.pythonProcess.stdin.write(
      JSON.stringify(this.currentRequest.request) + '\n'
    );
  }

  async sendRequest(request) {
    if (!this.isReady) {
      throw new OcrError('OCR service not initialized');
    }

    return new Promise((resolve, reject) => {
      this.requestQueue.push({
        request,
        resolve,
        reject
      });

      this.processNextRequest();
    });
  }

  async processImage(imagePath) {
    return this.sendRequest({
      command: 'process_image',
      image_path: imagePath
    });
  }

  async processBatch(imagePaths, batchSize = 4) {
    return this.sendRequest({
      command: 'process_batch',
      image_paths: imagePaths,
      batch_size: batchSize
    });
  }

  async extractData(text) {
    return this.sendRequest({
      command: 'extract_data',
      text
    });
  }

  async shutdown() {
    if (this.pythonProcess) {
      this.pythonProcess.kill();
      this.pythonProcess = null;
      this.isReady = false;
    }
  }

  /**
   * Main process method that orchestrates the OCR workflow
   * @param {Object} options - Processing options
   * @param {string} options.path - Path to the image file
   * @returns {Promise<Object>} Processed OCR results
   */
  async process({ path: imagePath }) {
    try {
      const startTime = Date.now();
      
      // Step 1: Preprocess the image
      const preprocessedImagePath = await this.preprocess(imagePath);
      
      // Step 2: Perform OCR
      const rawResults = await this.performOcr(preprocessedImagePath);
      
      // Step 3: Postprocess results
      const processedResults = await this.postprocess(rawResults);
      
      // Add processing metadata
      processedResults.metadata = {
        processingTime: Date.now() - startTime,
        originalImage: imagePath,
        timestamp: new Date().toISOString()
      };

      return processedResults;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Preprocess the image for better OCR results
   * @private
   * @param {string} imagePath - Path to the original image
   * @returns {Promise<string>} Path to the preprocessed image
   */
  async preprocess(imagePath) {
    try {
      const outputPath = path.join(path.dirname(imagePath), `preprocessed_${path.basename(imagePath)}`);
      
      await sharp(imagePath)
        .resize({ width: 2000, height: 2000, fit: 'inside' })
        .normalize()
        .modulate({ brightness: 1.1, contrast: OCR_CONFIG.preprocessing.contrast })
        .sharpen()
        .threshold(OCR_CONFIG.preprocessing.binarizationThreshold)
        .toFile(outputPath);

      logger.info(`Image preprocessed: ${outputPath}`);
      return outputPath;
    } catch (error) {
      throw new OcrError('Image preprocessing failed', error);
    }
  }

  /**
   * Perform OCR on the preprocessed image
   * @private
   * @param {string} imagePath - Path to the preprocessed image
   * @returns {Promise<Object>} Raw OCR results
   */
  async performOcr(imagePath) {
    await this.validateDependencies();
    
    const maskPath = path.join(__dirname, '../../form_ocr/resources/masks/alignment_mask.png');
    const manualMaskPath = path.join(__dirname, '../../form_ocr/resources/masks/manualmask.png');
    const coordinatesPath = path.join(__dirname, '../../form_ocr/resources/coordinates/caution_card_coords.json');

    return new Promise((resolve, reject) => {
      const pythonProcess = spawn(this.pythonPath, [
        this.pythonScript,
        imagePath,
        maskPath,
        manualMaskPath,
        coordinatesPath
      ], { stdio: ['pipe', 'pipe', 'pipe'] });

      let outputData = '';
      let errorData = '';

      pythonProcess.stdout.on('data', (data) => {
        outputData += data.toString();
        logger.debug(`Python output: ${data.toString()}`);
      });

      pythonProcess.stderr.on('data', (data) => {
        errorData += data.toString();
        logger.error(`Python error: ${data.toString()}`);
      });

      const timeout = setTimeout(() => {
        pythonProcess.kill();
        reject(new OcrError('OCR processing timeout'));
      }, OCR_CONFIG.timeouts.processing);

      pythonProcess.on('close', (code) => {
        clearTimeout(timeout);
        
        if (code !== 0) {
          reject(new OcrError(`OCR processing failed with code ${code}: ${errorData}`));
          return;
        }

        try {
          const result = JSON.parse(outputData);
          if (result.status === 'error') {
            reject(new OcrError(result.error.message));
            return;
          }
          resolve(result.data);
        } catch (error) {
          reject(new OcrError('Failed to parse OCR results', error));
        }
      });
    });
  }

  /**
   * Postprocess and structure the OCR results
   * @private
   * @param {Object} rawResults - Raw OCR results
   * @returns {Promise<Object>} Processed and structured results
   */
  async postprocess(rawResults) {
    try {
      const structuredResults = {
        extractedData: {
          name: this.cleanupText(rawResults.patient_info.name),
          dateOfBirth: this.formatDate(rawResults.patient_info.dob),
          medicalRecordNumber: this.cleanupText(rawResults.patient_info.mrn),
          phenotypes: this.cleanupPhenotypes(rawResults.phenotype_data)
        },
        confidence: rawResults.debug_info.confidence_scores,
        processingTime: rawResults.debug_info.processing_time,
        validationStatus: this.validateResults(rawResults)
      };

      return structuredResults;
    } catch (error) {
      throw new OcrError('Results postprocessing failed', error);
    }
  }

  /**
   * Validate all required dependencies exist
   * @private
   */
  async validateDependencies() {
    const requiredPaths = [
      { path: this.pythonScript, name: 'Python script' },
      { path: this.pythonPath, name: 'Python executable' },
      { path: path.join(__dirname, '../../form_ocr/resources/masks/alignment_mask.png'), name: 'Alignment mask' },
      { path: path.join(__dirname, '../../form_ocr/resources/masks/manualmask.png'), name: 'Manual mask' },
      { path: path.join(__dirname, '../../form_ocr/resources/coordinates/caution_card_coords.json'), name: 'Coordinates file' }
    ];

    for (const { path: filePath, name } of requiredPaths) {
      try {
        await fsPromises.access(filePath);
      } catch (error) {
        throw new OcrError(`${name} not found at: ${filePath}`);
      }
    }
  }

  /**
   * Clean up extracted text
   * @private
   */
  cleanupText(text) {
    return text?.trim().replace(/\s+/g, ' ') || '';
  }

  /**
   * Format date string to ISO format
   * @private
   */
  formatDate(dateString) {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toISOString().split('T')[0];
    } catch (error) {
      logger.warn(`Invalid date format: ${dateString}`);
      return dateString;
    }
  }

  /**
   * Clean up phenotype data
   * @private
   */
  cleanupPhenotypes(phenotypes) {
    if (!Array.isArray(phenotypes)) return [];
    return phenotypes.map(p => this.cleanupText(p)).filter(Boolean);
  }

  /**
   * Validate OCR results
   * @private
   */
  validateResults(results) {
    const required = ['name', 'dob', 'mrn'];
    const missing = required.filter(field => !results.patient_info[field]);
    
    return {
      isValid: missing.length === 0,
      missingFields: missing,
      warnings: this.generateWarnings(results)
    };
  }

  /**
   * Generate warnings for potentially problematic results
   * @private
   */
  generateWarnings(results) {
    const warnings = [];
    
    if (results.debug_info.confidence_scores.overall < 0.8) {
      warnings.push('Low overall confidence score');
    }
    
    if (results.debug_info.processing_time > 10000) {
      warnings.push('Long processing time');
    }

    return warnings;
  }

  /**
   * Handle and transform errors
   * @private
   */
  handleError(error) {
    if (error instanceof OcrError) {
      return error;
    }

    if (error.code === 'ENOENT') {
      return new OcrError('Resource not found', error);
    }

    return new OcrError('OCR processing failed', error);
  }

  // Repository methods
  async getResultsForPatient(patientId) {
    return this.ocrResultRepository.findByPatientId(patientId);
  }

  async getResultById(resultId) {
    return this.ocrResultRepository.findById(resultId);
  }

  async updateWithCorrections(resultId, corrections) {
    const result = await this.ocrResultRepository.findById(resultId);
    
    if (!result) {
      throw new OcrError('OCR result not found');
    }
    
    const updatedData = {
      extractedData: {
        ...result.extractedData,
        ...corrections
      },
      metadata: {
        ...result.metadata,
        corrected: true,
        correctionTimestamp: new Date().toISOString()
      }
    };
    
    return this.ocrResultRepository.update(resultId, updatedData);
  }
}

// Create and export a singleton instance
const ocrService = new OCRService();
module.exports = ocrService;