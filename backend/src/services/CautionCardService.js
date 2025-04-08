/**
 * CautionCard Service
 * This service encapsulates all business logic related to caution card operations.
 */
const { ValidationError } = require('../errors/ValidationError');
const BaseService = require('./BaseService');

class CautionCardService extends BaseService {
  constructor(repository) {
    super(repository);
  }

  async search(filters) {
    const { page = 1, limit = 20, ...searchFilters } = filters;
    const offset = (page - 1) * limit;

    const [cards, total] = await Promise.all([
      this.repository.search({ ...searchFilters, limit, offset }),
      this.repository.count(searchFilters)
    ]);

    return {
      data: cards,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async create(data) {
    // Validate required fields
    const requiredFields = ['fileName', 'filePath', 'fileSize', 'fileType'];
    const missingFields = requiredFields.filter(field => !data[field]);
    
    if (missingFields.length > 0) {
      throw new ValidationError('Missing required fields', {
        fields: missingFields.map(field => `${field} is required`)
      });
    }

    // Format data for database
    const formattedData = {
      file_name: data.fileName,
      file_path: data.filePath,
      file_size: data.fileSize,
      file_type: data.fileType,
      patient_id: data.patientId || null,
      blood_type: data.bloodType || null,
      antibodies: data.antibodies ? JSON.stringify(data.antibodies) : '[]',
      transfusion_requirements: data.transfusionRequirements ? JSON.stringify(data.transfusionRequirements) : '[]',
      ocr_text: data.ocrText || null,
      metadata: data.metadata ? JSON.stringify(data.metadata) : '{}',
      status: data.status || 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    return this.repository.create(formattedData);
  }

  async update(id, data) {
    // Format data for database
    const formattedData = {
      blood_type: data.bloodType,
      antibodies: data.antibodies ? JSON.stringify(data.antibodies) : undefined,
      transfusion_requirements: data.transfusionRequirements ? JSON.stringify(data.transfusionRequirements) : undefined,
      status: data.status,
      patient_id: data.patientId,
      ocr_text: data.ocrText,
      metadata: data.metadata ? JSON.stringify(data.metadata) : undefined,
      updated_at: new Date().toISOString()
    };

    // Remove undefined fields
    Object.keys(formattedData).forEach(key => 
      formattedData[key] === undefined && delete formattedData[key]
    );

    return this.repository.update(id, formattedData);
  }

  async getCautionCardWithPatient(cardId) {
    return this.repository.getCautionCardWithPatient(cardId);
  }

  async updateStatus(cardId, status, updatedBy) {
    // Validate status
    const validStatuses = ['pending', 'reviewed', 'linked', 'deleted'];
    if (!validStatuses.includes(status)) {
      throw new ValidationError('Invalid status', {
        status,
        validStatuses
      });
    }

    return this.repository.updateStatus(cardId, status, updatedBy);
  }

  async markAsReviewed(cardId, reviewedBy) {
    if (!reviewedBy) {
      throw new ValidationError('Reviewer information is required');
    }

    return this.repository.markAsReviewed(cardId, reviewedBy);
  }

  async getOrphanedCards() {
    return this.repository.getOrphanedCards();
  }

  async linkToPatient(cardId, patientId, updatedBy) {
    if (!patientId) {
      throw new ValidationError('Patient ID is required');
    }

    if (!updatedBy) {
      throw new ValidationError('Updated by information is required');
    }

    return this.repository.linkToPatient(cardId, patientId, updatedBy);
  }

  async searchByText(searchText) {
    if (!searchText || searchText.trim() === '') {
      throw new ValidationError('Search text is required');
    }

    return this.repository.searchByText(searchText.trim());
  }

  async processCard(fileData, metadata = {}) {
    // Validate file data
    if (!fileData || !fileData.path || !fileData.originalname || !fileData.size || !fileData.mimetype) {
      throw new ValidationError('Invalid file data');
    }

    // Create caution card
    const cardData = {
      fileName: fileData.originalname,
      filePath: fileData.path,
      fileSize: fileData.size,
      fileType: fileData.mimetype,
      metadata: {
        ...metadata,
        uploadedAt: new Date().toISOString()
      }
    };

    const card = await this.create(cardData);

    // Queue OCR processing (this would typically be handled by a background job)
    // For simplicity, we'll just return the created card
    return card;
  }
}

module.exports = CautionCardService;