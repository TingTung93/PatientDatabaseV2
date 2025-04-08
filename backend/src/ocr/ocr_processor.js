const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const sharp = require('sharp');

const logger = require('../utils/logger');

class OCRProcessor {
  constructor() {
    this.pythonPath = path.join(__dirname, '../../python/ocr_processor.py');
    // Use the virtual environment's Python executable
    this.pythonExecutable = path.join(__dirname, '../../venv/Scripts/python.exe');
    this.preprocessedDir = path.join(__dirname, '../../uploads/preprocessed');
    this.ensureDirectories();
    logger.info('OCRProcessor initialized', { pythonPath: this.pythonPath, pythonExecutable: this.pythonExecutable });
  }

  async ensureDirectories() {
    await fs.mkdir(this.preprocessedDir, { recursive: true });
  }

  /**
   * Preprocess an image to improve OCR quality
   * @param {string} imagePath - Path to the original image
   * @returns {Promise<string>} Path to the preprocessed image
   */
  async preprocessImage(imagePath) {
    logger.info('Preprocessing image', { imagePath });
    const filename = path.basename(imagePath);
    const preprocessedPath = path.join(this.preprocessedDir, `preprocessed_${filename}`);
    
    try {
      // Basic image preprocessing operations to improve OCR quality
      await sharp(imagePath)
        // Convert to grayscale
        .grayscale()
        // Increase contrast
        .normalize()
        // Apply slight gaussian blur to reduce noise
        .blur(0.5)
        // Threshold to make text more distinct 
        .threshold(128)
        // Resize to reasonable dimensions if needed
        .resize({ 
          width: 2000,
          height: 2000,
          fit: 'inside',
          withoutEnlargement: true 
        })
        // Save as PNG for better quality
        .png({ quality: 100 })
        .toFile(preprocessedPath);
      
      logger.info('Image preprocessing successful', { preprocessedPath });
      return preprocessedPath;
    } catch (error) {
      logger.error('Image preprocessing failed', { error: error.message });
      throw new Error(`Image preprocessing failed: ${error.message}`);
    }
  }

  /**
   * Process an image file with OCR
   * @param {string} imagePath - Path to the image file
   * @param {boolean} preprocess - Whether to preprocess the image first
   * @returns {Promise<string>} Raw OCR text
   */
  async process_image(imagePath, preprocess = true) {
    logger.info('Starting OCR processing', { imagePath, preprocess });
    
    let pathToProcess = imagePath;
    
    if (preprocess) {
      try {
        pathToProcess = await this.preprocessImage(imagePath);
      } catch (error) {
        logger.warn('Image preprocessing failed, using original image', { error: error.message });
        // Continue with original image if preprocessing fails
      }
    }
    
    return new Promise((resolve, reject) => {
      const pythonProcess = spawn(this.pythonExecutable, [
        this.pythonPath,
        '--image', pathToProcess
      ], {
        env: {
          ...process.env,
          PYTHONPATH: path.join(__dirname, '../../python')
        }
      });

      let output = '';
      let error = '';

      pythonProcess.stdout.on('data', (data) => {
        const chunk = data.toString();
        output += chunk;
        logger.debug('Python stdout:', { chunk });
      });

      pythonProcess.stderr.on('data', (data) => {
        const chunk = data.toString();
        error += chunk;
        logger.debug('Python stderr:', { chunk });
      });

      pythonProcess.on('error', (err) => {
        logger.error('Failed to start Python process:', err);
        reject(err);
      });

      pythonProcess.on('close', (code) => {
        logger.info('Python process completed', { code, output, error });
        if (code !== 0) {
          logger.error('OCR processing failed', { error, code });
          reject(new Error(`OCR processing failed with code ${code}: ${error}`));
          return;
        }

        try {
          const result = JSON.parse(output);
          if (result.error) {
            logger.error('OCR processing returned error:', result.error);
            reject(new Error(result.error));
            return;
          }
          logger.info('OCR processing successful', { textLength: result.text?.length });
          resolve(result.text);
        } catch (err) {
          logger.error('Failed to parse OCR output:', err);
          reject(new Error(`Failed to parse OCR output: ${err.message}`));
        }
      });
    });
  }

  /**
   * Extract patient data from OCR text
   * @param {string} text - Raw OCR text
   * @returns {Promise<Object>} Extracted patient data
   */
  async extract_patient_data(text) {
    logger.info('Starting data extraction', { textLength: text?.length });
    return new Promise((resolve, reject) => {
      const pythonProcess = spawn(this.pythonExecutable, [
        this.pythonPath,
        '--text', text,
        '--extract'
      ], {
        env: {
          ...process.env,
          PYTHONPATH: path.join(__dirname, '../../python')
        }
      });

      let output = '';
      let error = '';

      pythonProcess.stdout.on('data', (data) => {
        const chunk = data.toString();
        output += chunk;
        logger.debug('Python stdout:', { chunk });
      });

      pythonProcess.stderr.on('data', (data) => {
        const chunk = data.toString();
        error += chunk;
        logger.debug('Python stderr:', { chunk });
      });

      pythonProcess.on('error', (err) => {
        logger.error('Failed to start Python process:', err);
        reject(err);
      });

      pythonProcess.on('close', (code) => {
        logger.info('Python process completed', { code, output, error });
        if (code !== 0) {
          logger.error('Data extraction failed', { error, code });
          reject(new Error(`Data extraction failed with code ${code}: ${error}`));
          return;
        }

        try {
          const result = JSON.parse(output);
          if (result.error) {
            logger.error('Data extraction returned error:', result.error);
            reject(new Error(result.error));
            return;
          }
          logger.info('Data extraction successful', { fields: Object.keys(result.data) });
          resolve(result.data);
        } catch (err) {
          logger.error('Failed to parse extraction output:', err);
          reject(new Error(`Failed to parse extraction output: ${err.message}`));
        }
      });
    });
  }

  /**
   * Validate extracted patient data
   * @param {Object} data - Extracted patient data
   * @returns {Object} Validation result with errors and corrected data
   */
  validateExtractedData(data) {
    const errors = [];
    const validatedData = { ...data };
    
    // Validate patient name
    if (!data.patientName) {
      errors.push('Patient name is missing');
    } else if (data.patientName.length < 2) {
      errors.push('Patient name is too short');
    }
    
    // Validate date of birth
    if (data.dateOfBirth) {
      const dobRegex = /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/;
      const match = data.dateOfBirth.match(dobRegex);
      
      if (match) {
        // Format consistently as YYYY-MM-DD
        const month = match[1].padStart(2, '0');
        const day = match[2].padStart(2, '0');
        const year = match[3];
        
        validatedData.dateOfBirth = `${year}-${month}-${day}`;
      } else {
        errors.push('Date of birth format is invalid');
      }
    } else {
      errors.push('Date of birth is missing');
    }
    
    // Validate blood type if present
    if (data.bloodType) {
      const validBloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
      const normalizedBloodType = data.bloodType.toUpperCase().replace(/\s/g, '');
      
      if (!validBloodTypes.includes(normalizedBloodType)) {
        errors.push('Blood type is invalid');
      } else {
        validatedData.bloodType = normalizedBloodType;
      }
    }
    
    return {
      valid: errors.length === 0,
      errors,
      data: validatedData
    };
  }
}

module.exports = { OCRProcessor };