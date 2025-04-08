const path = require('path');
const fs = require('fs').promises;
const { createReadStream } = require('fs');

const { v4: uuidv4 } = require('uuid');

const { db } = require('../database/init');
const AppError = require('../errors/AppError');
const { processOcr } = require('../ocr/ocr_processor');
const logger = require('../utils/logger');
const errors = require('../errors');
const BaseService = require('./BaseService');
const ReportRepository = require('../repositories/ReportRepository');
const PatientRepository = require('../repositories/PatientRepository');
const reportParser = require('./reportParser');
const reportValidator = require('./reportValidator');

class ReportService extends BaseService {
  constructor(repository) {
    super(repository);
    this.uploadDir = path.join(process.cwd(), 'uploads', 'reports');
    this.ensureUploadDirectory();
  }

  /**
   * Ensure upload directory exists
   * @private
   */
  async ensureUploadDirectory() {
    try {
      await fs.access(this.uploadDir);
    } catch {
      await fs.mkdir(this.uploadDir, { recursive: true });
    }
  }

  /**
   * Upload and process a report
   * @param {Object} file The uploaded file
   * @param {string} patientId Patient ID (optional)
   * @param {string} reportType Type of report
   * @param {Object} metadata Additional metadata
   * @returns {Promise<Object>} Report object
   */
  async uploadReport(file, patientId, reportType = 'transfusion', metadata = {}) {
    logger.info('Starting uploadReport process');
    logger.info('File metadata:', {
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
    });
    try {
      // Validate patient if ID provided
      if (patientId) {
        const patient = db.prepare('SELECT * FROM patients WHERE id = ?').get(patientId);
        if (!patient) {
          throw new AppError('Patient not found', 404);
        }
      }

      // Generate unique filename
      const fileExt = path.extname(file.originalname);
      const filename = `${uuidv4()}${fileExt}`;
      const filePath = path.join(this.uploadDir, filename);

      // Save file
      await fs.writeFile(filePath, file.buffer);
      logger.info(`File saved to ${filePath}`);

      // Create report record with all required fields
      const reportData = {
        patient_id: patientId || null,
        report_type: reportType,
        filename,
        original_filename: file.originalname,
        mime_type: file.mimetype,
        size: file.size,
        path: filePath,
        status: 'pending',
        metadata: JSON.stringify(metadata || {})
      };

      // Create report record
      const stmt = db.prepare(`
        INSERT INTO reports (
          patient_id, report_type, filename, original_filename,
          mime_type, size, path, status, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const result = stmt.run(
        reportData.patient_id,
        reportData.report_type,
        reportData.filename,
        reportData.original_filename,
        reportData.mime_type,
        reportData.size,
        reportData.path,
        reportData.status,
        reportData.metadata
      );

      const report = db.prepare('SELECT * FROM reports WHERE id = ?').get(result.lastInsertRowid);
      logger.info(`Report record created with ID: ${report.id}`);

      // Start processing in background
      this.processReport(report.id).catch(error => {
        logger.error(`Error processing report ${report.id}:`, error);
        const updateStmt = db.prepare('UPDATE reports SET status = ?, error = ? WHERE id = ?');
        updateStmt.run('failed', error.message, report.id);
      });

      return report;
    } catch (error) {
      logger.error('Error uploading report:', error);
      throw new AppError('Failed to upload report', 500, error);
    }
  }

  /**
   * Process a report with OCR
   * @param {string} reportId Report ID
   * @returns {Promise<Object>} OCR processing results
   */
  async processReport(reportId) {
    logger.info(`Starting processReport for report ID: ${reportId}`);
    try {
      // Get report
      const report = db.prepare('SELECT * FROM reports WHERE id = ?').get(reportId);
      if (!report) {
        logger.error(`Report not found with ID: ${reportId}`);
        throw new AppError('Report not found', 404);
      }

      // Update status to processing
      const updateStmt = db.prepare('UPDATE reports SET status = ? WHERE id = ?');
      updateStmt.run('processing', reportId);

      // Get report content based on file type
      let textContent = '';
      let structuredData = {};
      
      if (report.mime_type === 'text/plain') {
        // For text files, use our JavaScript report parser directly
        try {
          // Read the text file
          textContent = await fs.readFile(report.path, 'utf-8');
          
          // Import the JavaScript parser
          const { parser } = require('../utils/reportParser');
          
          logger.info(`Processing text report ${report.id} with JavaScript parser`);
          
          // Parse the report
          structuredData = await parser.parse(textContent);
          
          // Save each patient to the database
          if (structuredData.patients && Array.isArray(structuredData.patients)) {
            for (const patient of structuredData.patients) {
              await this.saveParsedPatient(patient);
            }
          }
          
          // Update report with parsed data
          const updateOcrStmt = db.prepare(`
            UPDATE reports 
            SET status = ?, ocr_text = ?, structured_data = ?, updated_at = CURRENT_TIMESTAMP 
            WHERE id = ?
          `);
          updateOcrStmt.run(
            'completed',
            textContent,
            JSON.stringify(structuredData),
            report.id
          );
          
          logger.info(`Text report ${report.id} processed successfully`);
        } catch (err) {
          logger.error(`Failed to process text report ${report.id}:`, err);
          const updateStatusStmt = db.prepare('UPDATE reports SET status = ?, error = ? WHERE id = ?');
          updateStatusStmt.run('failed', err.message, report.id);
          logger.error(`Updating report status to failed due to error: ${err.message}`);
          throw err;
        }
      } else {
        // Process with OCR for non-text files
        const ocrResult = await processOcr(report.path);
        textContent = ocrResult.text;
        
        // Update report with OCR results
        const updateOcrStmt = db.prepare(`
          UPDATE reports 
          SET status = ?, ocr_text = ?, structured_data = ?, updated_at = CURRENT_TIMESTAMP 
          WHERE id = ?
        `);
        updateOcrStmt.run(
          'completed',
          textContent,
          JSON.stringify(ocrResult),
          report.id
        );
      }

      return {
        status: 'completed',
        structuredData
      };
    } catch (error) {
      logger.error(`OCR processing error for report ${reportId}:`, error);
      logger.error(`Full error details: ${error.stack}`);
      
      const updateStatusStmt = db.prepare('UPDATE reports SET status = ?, error = ? WHERE id = ?');
      updateStatusStmt.run('failed', error.message, reportId);
      
      throw new AppError('OCR processing failed', 500, error);
    }
  }

  /**
   * Get all reports with pagination
   * @param {Object} options Query options
   * @returns {Promise<Object>} Reports and count
   */
  async getReports(options = {}) {
    const page = options.page || 1;
    const perPage = options.perPage || 20;
    const offset = (page - 1) * perPage;

    const countStmt = db.prepare('SELECT COUNT(*) as count FROM reports');
    const { count } = countStmt.get();

    const stmt = db.prepare('SELECT * FROM reports ORDER BY created_at DESC LIMIT ? OFFSET ?');
    const reports = stmt.all(perPage, offset);

    return {
      reports,
      total: count,
      page,
      totalPages: Math.ceil(count / perPage)
    };
  }

  /**
   * Get a report by ID
   * @param {string} reportId Report ID
   * @returns {Promise<Object>} Report object
   */
  async getReportById(reportId) {
    const report = db.prepare('SELECT * FROM reports WHERE id = ?').get(reportId);
    if (!report) {
      throw new AppError('Report not found', 404);
    }
    return report;
  }

  /**
   * Get a report file stream
   * @param {string} reportId Report ID
   * @returns {Promise<ReadStream>} File stream
   */
  async getReportStream(reportId) {
    const report = await this.getReportById(reportId);
    try {
      await fs.access(report.path);
      return createReadStream(report.path);
    } catch (error) {
      throw new AppError('Report file not found', 404);
    }
  }

  /**
   * Get report processing status
   * @param {string} reportId Report ID
   * @returns {Promise<Object>} Status object
   */
  async getReportStatus(reportId) {
    const report = await this.getReportById(reportId);
    return {
      status: report.status,
      error: report.error || null
    };
  }

  /**
   * Delete a report
   * @param {string} reportId Report ID
   * @returns {Promise<void>}
   */
  async deleteReport(reportId) {
    const report = await this.getReportById(reportId);
    try {
      // Delete file
      await fs.unlink(report.path);
      
      // Delete database record
      const stmt = db.prepare('DELETE FROM reports WHERE id = ?');
      stmt.run(reportId);
    } catch (error) {
      logger.error(`Error deleting report ${reportId}:`, error);
      throw new AppError('Failed to delete report', 500);
    }
  }

  /**
   * Save parsed patient data to database
   * @param {Object} patientData Patient data from report
   * @returns {Promise<Object>} Saved patient record
   */
  async saveParsedPatient(patientData) {
    try {
      const stmt = db.prepare(`
        INSERT INTO patients (
          name, dob, blood_type, antigen_phenotype,
          transfusion_restrictions, antibodies, contact_number
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(name, dob) DO UPDATE SET
          blood_type = excluded.blood_type,
          antigen_phenotype = excluded.antigen_phenotype,
          transfusion_restrictions = excluded.transfusion_restrictions,
          antibodies = excluded.antibodies,
          contact_number = excluded.contact_number,
          updated_at = CURRENT_TIMESTAMP
      `);

      const result = stmt.run(
        `${patientData.firstName} ${patientData.lastName}`,
        patientData.birthDate,
        patientData.bloodType,
        patientData.phenotype || null,
        patientData.transfusionRequirements || null,
        JSON.stringify(patientData.antibodies || []),
        patientData.contactNumber || null
      );

      return db.prepare('SELECT * FROM patients WHERE id = ?').get(result.lastInsertRowid);
    } catch (error) {
      logger.error('Error saving parsed patient:', error);
      throw new AppError('Failed to save patient data', 500);
    }
  }

  async search(query, options = {}) {
    const page = parseInt(options.page, 10) || 1;
    const limit = parseInt(options.limit, 10) || 10;
    const offset = (page - 1) * limit;

    const { rows, count } = await this.repository.search(query, { ...options, limit, offset });
    
    const totalPages = Math.ceil(count / limit);

    return {
      data: rows,
      pagination: {
        page,
        limit,
        total: count,
        totalPages,
      },
    };
  }

  async create(data, createdBy) {
    if (!data || !data.patient_id || !data.report_type || !data.report_date) {
      throw new errors.ValidationError('Missing required fields for report creation.');
    }
    if (!createdBy) {
      throw new errors.ValidationError('Created by information is required');
    }
    const repoData = { ...data, created_by: createdBy }; 
    return this.repository.create(repoData);
  }

  async update(id, data, updatedBy) {
    if (!id) {
      throw new errors.ValidationError('Report ID is required for update.');
    }
    if (!updatedBy) {
      throw new errors.ValidationError('Updated by information is required');
    }

    const repoData = {
      ...(data.report_type && { report_type: data.report_type }),
      ...(data.report_date && { report_date: data.report_date }),
      ...(data.status && { status: data.status }),
      ...(data.facility_id && { facility_id: data.facility_id }),
      ...(data.metadata && { metadata: data.metadata }), 
      updated_by: updatedBy
    };

    if (Object.keys(repoData).length <= 1) {
    }

    const updatedReport = await this.repository.update(id, repoData);
    if (!updatedReport) {
      throw new errors.NotFoundError(`Report with ID ${id} not found.`);
    }
    return updatedReport;
  }

  async getReportWithPatient(id) {
    if (!id) {
      throw new errors.ValidationError('Report ID is required');
    }
    return this.repository.getReportWithPatient(id);
  }

  async addAttachment(reportId, attachmentData, uploadedBy) {
    if (!attachmentData || !attachmentData.path || !attachmentData.filename) {
      throw new errors.ValidationError('Attachment data is missing or invalid.');
    }
    if (!reportId || !uploadedBy) {
      throw new errors.ValidationError('Report ID and uploadedBy information are required');
    }
    const repoAttachmentData = {
      file_path: attachmentData.path,
      file_name: attachmentData.filename,
      file_type: attachmentData.mimetype,
      file_size: attachmentData.size,
      uploaded_by: uploadedBy
    };
    return this.repository.addAttachment(reportId, repoAttachmentData);
  }

  async deleteAttachment(reportId, attachmentId, deletedBy) {
    if (!reportId || !attachmentId) {
      throw new errors.ValidationError('Report ID and Attachment ID are required.');
    }
    if (!deletedBy) {
      throw new errors.ValidationError('Deleted by information is required');
    }
    return this.repository.deleteAttachment(reportId, attachmentId, deletedBy);
  }

  async updateStatus(reportId, status, updatedBy) {
    const validStatuses = ['pending', 'processing', 'completed', 'error'];
    if (!validStatuses.includes(status)) {
      throw new errors.ValidationError(`Invalid status: ${status}. Must be one of ${validStatuses.join(', ')}.`);
    }
    if (!reportId || !updatedBy) {
      throw new errors.ValidationError('Report ID and updatedBy information are required');
    }
    return this.repository.updateStatus(reportId, status, updatedBy);
  }
}

module.exports = ReportService; 