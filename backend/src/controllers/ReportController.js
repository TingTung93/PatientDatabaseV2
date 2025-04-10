/**
 * Report Controller
 * Handles HTTP requests and responses for report operations.
 */
const ReportService = require('../services/ReportService');
const ReportRepository = require('../repositories/ReportRepository');
const { dbInstance } = require('../database/init');
const { ValidationError } = require('../errors/ValidationError');

class ReportController {
  constructor() {
    this.repository = new ReportRepository(dbInstance);
    this.service = new ReportService(this.repository);
  }

  /**
   * Get all reports with optional filtering
   */
  async getAll(req, res, next) {
    try {
      const result = await this.service.search({
        page: req.query.page,
        limit: req.query.limit,
        type: req.query.type,
        patientId: req.query.patientId,
        dateFrom: req.query.dateFrom,
        dateTo: req.query.dateTo
      });
      
      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get a single report by ID
   */
  async getById(req, res, next) {
    try {
      const report = await this.service.getReportWithPatient(req.params.id);
      
      if (!report) {
        return res.status(404).json({ message: 'Report not found' });
      }
      
      // Parse JSON strings to objects
      if (report.metadata) {
        try {
          report.metadata = JSON.parse(report.metadata);
        } catch (e) {
          report.metadata = {};
        }
      }
      
      return res.status(200).json(report);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Upload a new report
   */
  async uploadReport(req, res, next) {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }

      // Format data for service
      const reportData = {
        type: req.body.type,
        fileName: req.file.originalname,
        filePath: req.file.path,
        fileSize: req.file.size,
        fileType: req.file.mimetype,
        patientId: req.body.patientId || null,
        ocrText: null, // OCR processing would happen asynchronously
        metadata: {
          uploadedBy: req.body.uploadedBy || 'system',
          uploadedAt: new Date().toISOString()
        }
      };

      const report = await this.service.create(reportData);
      
      // Create a clean response object
      const response = {
        id: report.id,
        type: report.type,
        fileName: report.file_name,
        fileSize: report.file_size,
        fileType: report.file_type,
        patientId: report.patient_id,
        status: report.status,
        createdAt: report.created_at,
        updatedAt: report.updated_at
      };
      
      return res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update a report
   */
  async updateReport(req, res, next) {
    try {
      // Convert from API format to service format
      const updateData = {
        type: req.body.type,
        patientId: req.body.patientId,
        ocrText: req.body.ocrText,
        status: req.body.status,
        metadata: req.body.metadata
      };

      const updatedReport = await this.service.update(req.params.id, updateData);
      
      if (!updatedReport) {
        return res.status(404).json({ message: 'Report not found' });
      }
      
      // Parse JSON strings to objects for response
      if (updatedReport.metadata) {
        try {
          updatedReport.metadata = JSON.parse(updatedReport.metadata);
        } catch (e) {
          updatedReport.metadata = {};
        }
      }
      
      return res.status(200).json(updatedReport);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update report status
   */
  async updateStatus(req, res, next) {
    try {
      if (!req.body.status) {
        return res.status(400).json({ message: 'Status is required' });
      }

      await this.service.updateStatus(
        req.params.id, 
        req.body.status, 
        req.body.updatedBy || 'system'
      );
      
      const updatedReport = await this.service.getReportWithPatient(req.params.id);
      
      return res.status(200).json(updatedReport);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get report attachments
   */
  async getAttachments(req, res, next) {
    try {
      const attachments = await this.service.getReportAttachments(req.params.id);
      return res.status(200).json(attachments);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Add an attachment to a report
   */
  async addAttachment(req, res, next) {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }

      const attachmentData = {
        fileName: req.file.originalname,
        filePath: req.file.path,
        fileType: req.file.mimetype,
        fileSize: req.file.size
      };

      const attachment = await this.service.addAttachment(req.params.id, attachmentData);
      
      return res.status(201).json(attachment);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete a report attachment
   */
  async deleteAttachment(req, res, next) {
    try {
      await this.service.deleteAttachment(req.params.attachmentId);
      return res.status(200).json({ message: 'Attachment deleted successfully' });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete a report
   */
  async deleteReport(req, res, next) {
    try {
      await this.service.delete(req.params.id);
      return res.status(200).json({ message: 'Report deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ReportController(); 