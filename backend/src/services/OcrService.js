import { spawn } from 'child_process';
import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';
import logger from '../utils/logger.js';
import { OcrError } from '../utils/errors.js';

// Determine the directory name using import.meta.url
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
    this.pythonScript = path.join(__dirname, '../ocr/ocr_server.py');
    this.pythonPath = path.join(__dirname, '../../venv/Scripts/python.exe');
    
    // Lazy-load repositories
    this._patientRepository = null;
    this._ocrResultRepository = null;
  }

  // Lazy-load repositories using dynamic import
  async getPatientRepository() {
    if (!this._patientRepository) {
      const { PatientRepository } = await import('../repositories/PatientRepository.js');
      this._patientRepository = new PatientRepository();
    }
    return this._patientRepository;
  }

  async getOcrResultRepository() {
    if (!this._ocrResultRepository) {
      const { OcrResultRepository } = await import('../repositories/OcrResultRepository.js');
      this._ocrResultRepository = new OcrResultRepository();
    }
    return this._ocrResultRepository;
  }

  async checkPath(filePath, description) {
    try {
      await fsPromises.access(filePath, fs.constants.F_OK);
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
        const scriptPath = path.join(__dirname, '../ocr/ocr_server.py');

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
              reject(new Error('Failed to parse response from OCR process'));
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
                logger.error('Python module not found. Ensure dependencies are installed in venv');
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
      throw new OcrError('OCR service not ready or initialized');
    }

    return new Promise((resolve, reject) => {
      // Set a timeout for the individual request
      const requestTimeout = setTimeout(() => {
        reject(new OcrError('OCR request timed out'));
        // Attempt to remove the request from the queue if it's still there
        const index = this.requestQueue.findIndex(item => item.request === request);
        if (index > -1) {
          this.requestQueue.splice(index, 1);
        }
        // If this was the current request, clear it
        if (this.currentRequest && this.currentRequest.request === request) {
          this.currentRequest = null;
          this.processNextRequest();
        }
      }, OCR_CONFIG.timeouts.processing);

      this.requestQueue.push({
        request,
        resolve: (result) => {
          clearTimeout(requestTimeout);
          resolve(result);
        },
        reject: (error) => {
          clearTimeout(requestTimeout);
          reject(error);
        }
      });

      this.processNextRequest();
    });
  }

  async processImage(imagePath) {
    await this.checkPath(imagePath, 'Image file for processing');
    return this.sendRequest({
      command: 'process_image',
      image_path: imagePath
    });
  }

  async processBatch(imagePaths, batchSize = 4) {
    for (const p of imagePaths) {
      await this.checkPath(p, `Batch image file ${p}`);
    }
    return this.sendRequest({
      command: 'process_batch',
      image_paths: imagePaths,
      batch_size: batchSize
    });
  }

  async extractData(text) {
    return this.sendRequest({
      command: 'extract_data',
      text: text
    });
  }

  async shutdown() {
    return new Promise((resolve) => {
      if (!this.pythonProcess) {
        resolve();
        return;
      }

      this.pythonProcess.on('exit', () => {
        logger.info('OCR service shut down gracefully');
        this.isReady = false;
        this.pythonProcess = null;
        resolve();
      });

      try {
        this.pythonProcess.stdin.write(JSON.stringify({ command: 'shutdown' }) + '\n');
        this.pythonProcess.stdin.end();
      } catch (error) {
        logger.warn('Error sending shutdown command to Python process, killing instead:', error);
        this.pythonProcess.kill();
      }

      // Force kill if it doesn't exit after a timeout
      setTimeout(() => {
        if (this.pythonProcess) {
          logger.warn('Python process did not exit gracefully, forcing kill');
          this.pythonProcess.kill('SIGKILL');
          this.isReady = false; // Ensure state reflects reality
          this.pythonProcess = null; // Clear reference
          resolve(); // Resolve even on force kill
        }
      }, 5000); // 5 second timeout for graceful shutdown
    });
  }

  async process({ path: imagePath }) {
    try {
      logger.info(`Starting OCR process for image: ${imagePath}`);

      // 1. Preprocess the image
      const preprocessedPath = await this.preprocess(imagePath);
      logger.info(`Image preprocessed successfully: ${preprocessedPath}`);

      // 2. Perform OCR
      const ocrResult = await this.performOcr(preprocessedPath);
      logger.info('OCR performed successfully');
      // logger.debug('Raw OCR results:', ocrResult); // Optionally log raw results

      // 3. Postprocess results
      const finalResults = await this.postprocess(ocrResult);
      logger.info('OCR results postprocessed');
      // logger.debug('Final results:', finalResults); // Optionally log final results

      // 4. Clean up temporary preprocessed file
      if (preprocessedPath !== imagePath) { // Only delete if preprocessing created a new file
        await fsPromises.unlink(preprocessedPath);
        logger.info(`Cleaned up temporary file: ${preprocessedPath}`);
      }

      return finalResults;
    } catch (error) {
      this.handleError(error);
      throw error; // Re-throw after logging/handling
    }
  }

  async preprocess(imagePath) {
    const tempDir = path.join(__dirname, '../../temp_ocr');
    await fsPromises.mkdir(tempDir, { recursive: true });
    const outputFilename = `${uuidv4()}_processed.png`;
    const outputPath = path.join(tempDir, outputFilename);

    try {
      const image = sharp(imagePath);
      const metadata = await image.metadata();

      // Ensure DPI is sufficient, otherwise increase density
      const density = (metadata.density && metadata.density >= OCR_CONFIG.preprocessing.defaultDPI)
        ? metadata.density
        : OCR_CONFIG.preprocessing.defaultDPI;

      await image
        .density(density)
        .grayscale() // Convert to grayscale
        .linear(OCR_CONFIG.preprocessing.contrast, -(128 * (OCR_CONFIG.preprocessing.contrast - 1))) // Adjust contrast
        .normalize() // Enhance contrast further
        .sharpen() // Sharpen the image
        .threshold(OCR_CONFIG.preprocessing.binarizationThreshold) // Binarize the image
        .toFile(outputPath);

      logger.info(`Image preprocessed and saved to: ${outputPath}`);
      return outputPath;
    } catch (error) {
      logger.error(`Error during image preprocessing: ${error.message}`);
      throw new OcrError('Failed during image preprocessing', error);
    }
  }

  async performOcr(imagePath) {
    logger.info(`Sending image to Python OCR server: ${imagePath}`);
    try {
      const response = await this.sendRequest({
        command: 'process_image',
        image_path: imagePath
      });

      if (response.status === 'success') {
        logger.info('Successfully received OCR results from Python server');
        return response.data; // Assuming response.data contains the structured OCR results
      } else {
        logger.error('OCR process reported an error:', response.error);
        throw new OcrError(response.error || 'Unknown error during OCR processing');
      }
    } catch (error) {
      logger.error(`Error communicating with Python OCR process: ${error.message}`);
      if (error instanceof OcrError) {
        throw error; // Re-throw OcrError directly
      }
      throw new OcrError('Failed to perform OCR via Python process', error);
    }
  }

  async postprocess(rawResults) {
    // Assuming rawResults is the structured data from Python:
    // { text: "...", extracted_data: { name: "...", dob: "...", phenotypes: [...] } }
    if (!rawResults || typeof rawResults !== 'object') {
      throw new OcrError('Invalid raw OCR results received for postprocessing');
    }

    const cleanedText = this.cleanupText(rawResults.text || '');
    const extractedData = rawResults.extracted_data || {};

    const formattedDob = this.formatDate(extractedData.dob);
    const cleanedPhenotypes = this.cleanupPhenotypes(extractedData.phenotypes);

    const processedResults = {
      rawText: cleanedText,
      extractedData: {
        name: extractedData.name ? String(extractedData.name).trim() : null,
        dob: formattedDob,
        phenotypes: cleanedPhenotypes,
        // Add other fields if extracted by Python
      },
      confidenceScores: rawResults.confidence || {}, // Include confidence if available
      processingMetadata: {
        ocrTimestamp: new Date().toISOString(),
        ocrEngine: rawResults.engine || 'Unknown', // Include engine info if available
      },
      validation: {
        isValid: true,
        warnings: []
      }
    };

    this.validateResults(processedResults);
    processedResults.validation.warnings = this.generateWarnings(processedResults);

    logger.info('OCR results postprocessed successfully');
    return processedResults;
  }

  async validateDependencies() {
    // This could be expanded to check Python version, Tesseract version, etc. via the Python process
    if (!this.isReady) {
      await this.initialize();
    }
    // Example: Send a 'ping' or 'status' command to Python process
    try {
      const response = await this.sendRequest({ command: 'status' });
      if (response.status !== 'ready') {
        throw new OcrError('Dependency check failed: Python process not ready');
      }
      logger.info('OCR service dependencies validated successfully.');
      return true;
    } catch (error) {
      logger.error(`Dependency validation failed: ${error.message}`);
      throw new OcrError('OCR dependency validation failed', error);
    }
  }

  cleanupText(text) {
    if (typeof text !== 'string') return '';
    // Replace multiple whitespace chars with a single space, trim start/end
    return text.replace(/\s+/g, ' ').trim();
  }

  formatDate(dateString) {
    if (!dateString || typeof dateString !== 'string') return null;
    try {
      // Attempt to parse common formats, prioritize YYYY-MM-DD
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        // Try different parsing if initial fails (more robust parsing needed here)
        logger.warn(`Could not parse date string initially: ${dateString}`);
        return null; // Or return original string?
      }
      // Format to ISO 8601 date part (YYYY-MM-DD)
      return date.toISOString().split('T')[0];
    } catch (e) {
      logger.warn(`Error formatting date string "${dateString}": ${e.message}`);
      return null;
    }
  }

  cleanupPhenotypes(phenotypes) {
    if (!Array.isArray(phenotypes)) return [];
    return phenotypes
      .map(p => typeof p === 'string' ? p.trim() : null)
      .filter(p => p && p.length > 0); // Remove nulls and empty strings
  }

  validateResults(results) {
    // Basic validation example
    if (!results.extractedData.name) {
      results.validation.isValid = false;
      results.validation.warnings.push('Patient name could not be extracted.');
    }
    if (!results.extractedData.dob) {
      // DOB might be optional depending on requirements
      // results.validation.isValid = false; // Uncomment if DOB is mandatory
      results.validation.warnings.push('Patient date of birth could not be extracted or formatted.');
    }
    if (!results.extractedData.phenotypes || results.extractedData.phenotypes.length === 0) {
      results.validation.warnings.push('No HPO phenotypes were extracted.');
    }
  }

  generateWarnings(results) {
    const warnings = [...results.validation.warnings]; // Start with validation warnings

    // Add confidence-based warnings (example threshold)
    const lowConfidenceThreshold = 0.7;
    if (results.confidenceScores) {
      for (const [key, value] of Object.entries(results.confidenceScores)) {
        if (typeof value === 'number' && value < lowConfidenceThreshold) {
          warnings.push(`Low confidence score (${value.toFixed(2)}) for field: ${key}`);
        }
      }
    }

    return warnings;
  }

  handleError(error) {
    logger.error(`OCR Service Error: ${error.message}`, { stack: error.stack });
    if (error instanceof OcrError) {
      // Specific handling for OCR errors
      logger.error(`OCR Operation Failed: ${error.cause || 'Unknown cause'}`);
    } else {
      // General error handling
      logger.error('An unexpected error occurred in the OCR service.');
    }
    // Potentially emit an event, update service status, etc.
  }

  // --- Repository Interactions ---
  // Example methods using lazy-loaded repositories

  async getResultsForPatient(patientId) {
    const repo = await this.getOcrResultRepository();
    return repo.findByPatientId(patientId);
  }

  async getResultById(resultId) {
    const repo = await this.getOcrResultRepository();
    return repo.findById(resultId);
  }

  async updateWithCorrections(resultId, corrections) {
    const repo = await this.getOcrResultRepository();
    // Logic to apply corrections and update the record
    // This is just a placeholder
    const existingResult = await repo.findById(resultId);
    if (!existingResult) throw new Error('Result not found');
    // ... apply corrections logic ...
    const updatedData = { ...existingResult.data, ...corrections }; // Simplified
    return repo.update(resultId, { data: updatedData });
  }

  async linkResultToPatient(resultId, patientId) {
    const ocrRepo = await this.getOcrResultRepository();
    const patientRepo = await this.getPatientRepository();
    const patient = await patientRepo.findById(patientId);
    if (!patient) throw new Error('Patient not found');
    return ocrRepo.update(resultId, { patientId: patientId });
  }

}

// Create and export the singleton instance
const ocrServiceInstance = new OCRService();
export default ocrServiceInstance;