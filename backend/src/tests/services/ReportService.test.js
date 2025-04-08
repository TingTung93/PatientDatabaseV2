const ReportService = require('../../services/ReportService');
const BaseRepository = require('../../repositories/BaseRepository');
const errors = require('../../errors');

// Mock the repository
const mockRepository = {
  search: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  count: jest.fn(),
  getReportWithPatient: jest.fn(),
  addAttachment: jest.fn(),
  deleteAttachment: jest.fn(),
  updateStatus: jest.fn()
};

describe('ReportService', () => {
  let service;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ReportService(mockRepository);
  });

  describe('search', () => {
    it('should return paginated search results', async () => {
      const mockReports = [{ id: 1, type: 'blood' }, { id: 2, type: 'urine' }];
      const mockCount = 5;
      mockRepository.search.mockResolvedValue({ rows: mockReports, count: mockCount });

      const result = await service.search({}, { page: 1, limit: 2 });

      expect(result).toEqual({
        data: mockReports,
        pagination: {
          page: 1,
          limit: 2,
          total: mockCount,
          totalPages: 3, // Math.ceil(5 / 2)
        },
      });
      expect(mockRepository.search).toHaveBeenCalledWith({}, { limit: 2, offset: 0, page: 1 });
    });
  });

  describe('create', () => {
    it('should create report with valid data', async () => {
      const reportData = { patient_id: 1, report_type: 'blood', report_date: new Date() };
      const createdBy = 'user123';
      const mockCreated = { id: 1, ...reportData, created_by: createdBy };
      mockRepository.create.mockResolvedValue(mockCreated);

      const result = await service.create(reportData, createdBy);

      expect(result).toEqual(mockCreated);
      expect(mockRepository.create).toHaveBeenCalledWith({ ...reportData, created_by: createdBy });
    });

    it('should throw ValidationError when required fields are missing', async () => {
      const createdBy = 'user123';
      await expect(service.create({}, createdBy)).rejects.toThrow(errors.ValidationError);
      await expect(service.create({ patient_id: 1 }, createdBy)).rejects.toThrow(errors.ValidationError);
    });

    it('should throw ValidationError when createdBy is missing', async () => {
      const reportData = { patient_id: 1, report_type: 'blood', report_date: new Date() };
      await expect(service.create(reportData, null)).rejects.toThrow(errors.ValidationError);
    });
  });

  describe('update', () => {
    it('should update report with valid data', async () => {
      const reportData = { report_type: 'blood', report_date: new Date() };
      const updatedBy = 'user456';
      const mockUpdated = { id: 1, ...reportData, updated_by: updatedBy };
      mockRepository.update.mockResolvedValue(mockUpdated); // Assume repo returns updated record

      const result = await service.update(1, reportData, updatedBy);

      expect(result).toEqual(mockUpdated);
      // Expect snake_case version sent to repository
      expect(mockRepository.update).toHaveBeenCalledWith(1, {
        report_type: reportData.report_type,
        report_date: reportData.report_date,
        updated_by: updatedBy
      });
    });

    it('should throw ValidationError when updatedBy is missing', async () => {
       const reportData = { report_type: 'blood' };
      await expect(service.update(1, reportData, null)).rejects.toThrow(errors.ValidationError);
    });

    it('should throw NotFoundError if report not found', async () => {
      mockRepository.update.mockResolvedValue(null);
      await expect(service.update(999, { report_type: 'test' }, 'user123')).rejects.toThrow(errors.NotFoundError);
    });
  });

  describe('getReportWithPatient', () => {
    it('should return report with patient details', async () => {
      const mockResult = { id: 1, type: 'blood', patient: { id: 1, name: 'John Doe' } };
      mockRepository.getReportWithPatient.mockResolvedValue(mockResult);
      const result = await service.getReportWithPatient(1);
      expect(result).toEqual(mockResult);
      expect(mockRepository.getReportWithPatient).toHaveBeenCalledWith(1);
    });
  });

  describe('attachments', () => {
    const attachmentData = { path: '/uploads/report.txt', filename: 'report.txt', mimetype: 'text/plain', size: 1024 };
    const uploadedBy = 'user123';
    const deletedBy = 'admin456';

    it('should add attachment with valid data', async () => {
      const mockAttachment = { id: 1, report_id: 1, file_name: 'report.txt' };
      mockRepository.addAttachment.mockResolvedValue(mockAttachment);

      const result = await service.addAttachment(1, attachmentData, uploadedBy);

      expect(result).toEqual(mockAttachment);
      // Expect snake_case version sent to repository
      expect(mockRepository.addAttachment).toHaveBeenCalledWith(1, {
        file_path: attachmentData.path,
        file_name: attachmentData.filename,
        file_type: attachmentData.mimetype,
        file_size: attachmentData.size,
        uploaded_by: uploadedBy
      });
    });

    it('should throw ValidationError when attachment data is invalid', async () => {
      await expect(service.addAttachment(1, {}, uploadedBy)).rejects.toThrow(errors.ValidationError);
    });

    it('should throw ValidationError when uploadedBy is missing for add', async () => {
      await expect(service.addAttachment(1, attachmentData, null)).rejects.toThrow(errors.ValidationError);
    });

    it('should delete attachment', async () => {
      mockRepository.deleteAttachment.mockResolvedValue({ success: true });

      const result = await service.deleteAttachment(1, 5, deletedBy);

      expect(result).toEqual({ success: true });
      expect(mockRepository.deleteAttachment).toHaveBeenCalledWith(1, 5, deletedBy);
    });

    it('should throw ValidationError when IDs are missing for delete', async () => {
      await expect(service.deleteAttachment(null, 5, deletedBy)).rejects.toThrow(errors.ValidationError);
      await expect(service.deleteAttachment(1, null, deletedBy)).rejects.toThrow(errors.ValidationError);
    });
    
    it('should throw ValidationError when deletedBy is missing for delete', async () => {
       await expect(service.deleteAttachment(1, 5, null)).rejects.toThrow(errors.ValidationError);
    });
  });

  describe('updateStatus', () => {
    const updatedBy = 'admin789';

    it('should update report status with valid status', async () => {
      mockRepository.updateStatus.mockResolvedValue({ success: true });

      const result = await service.updateStatus(1, 'completed', updatedBy);

      expect(result).toEqual({ success: true });
      expect(mockRepository.updateStatus).toHaveBeenCalledWith(1, 'completed', updatedBy);
    });

    it('should throw ValidationError with invalid status', async () => {
      await expect(service.updateStatus(1, 'invalid', updatedBy)).rejects.toThrow(errors.ValidationError);
    });

    it('should throw ValidationError when updatedBy is missing', async () => {
       await expect(service.updateStatus(1, 'completed', null)).rejects.toThrow(errors.ValidationError);
    });
  });
}); 