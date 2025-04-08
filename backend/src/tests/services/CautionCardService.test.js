const CautionCardService = require('../../services/CautionCardService');
const { ValidationError } = require('../../errors/ValidationError');

describe('CautionCardService', () => {
  let mockRepository;
  let service;

  beforeEach(() => {
    mockRepository = {
      findById: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      search: jest.fn(),
      getCautionCardWithPatient: jest.fn(),
      updateStatus: jest.fn(),
      markAsReviewed: jest.fn(),
      getOrphanedCards: jest.fn(),
      linkToPatient: jest.fn(),
      searchByText: jest.fn()
    };

    service = new CautionCardService(mockRepository);
  });

  describe('search', () => {
    it('should return paginated search results', async () => {
      const mockCards = [
        { id: 1, file_name: 'card1.pdf' },
        { id: 2, file_name: 'card2.pdf' }
      ];
      const mockTotal = 5;

      mockRepository.search.mockResolvedValue(mockCards);
      mockRepository.count.mockResolvedValue(mockTotal);

      const result = await service.search({ page: 1, limit: 2 });

      expect(result).toEqual({
        data: mockCards,
        pagination: {
          page: 1,
          limit: 2,
          total: mockTotal,
          totalPages: 3
        }
      });
    });
  });

  describe('create', () => {
    it('should create caution card with valid data', async () => {
      const cardData = {
        fileName: 'card.pdf',
        filePath: '/path/card.pdf',
        fileSize: 1000,
        fileType: 'pdf',
        bloodType: 'A+',
        antibodies: ['Anti-D', 'Anti-C'],
        transfusionRequirements: ['Irradiated']
      };

      const mockCreated = { id: 1, ...cardData };
      mockRepository.create.mockResolvedValue(mockCreated);

      const result = await service.create(cardData);

      expect(result).toEqual(mockCreated);
      expect(mockRepository.create).toHaveBeenCalledWith(expect.objectContaining({
        file_name: cardData.fileName,
        file_path: cardData.filePath,
        file_size: cardData.fileSize,
        file_type: cardData.fileType,
        blood_type: cardData.bloodType,
        antibodies: JSON.stringify(cardData.antibodies),
        transfusion_requirements: JSON.stringify(cardData.transfusionRequirements),
        status: 'pending'
      }));
    });

    it('should throw ValidationError when required fields are missing', async () => {
      const cardData = {
        fileName: 'card.pdf'
      };

      await expect(service.create(cardData)).rejects.toThrow(ValidationError);
      expect(mockRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update caution card with valid data', async () => {
      const cardData = {
        bloodType: 'B+',
        antibodies: ['Anti-K'],
        transfusionRequirements: ['Washed']
      };

      const mockUpdated = { id: 1, ...cardData };
      mockRepository.update.mockResolvedValue(mockUpdated);

      const result = await service.update(1, cardData);

      expect(result).toEqual(mockUpdated);
      expect(mockRepository.update).toHaveBeenCalledWith(1, expect.objectContaining({
        blood_type: cardData.bloodType,
        antibodies: JSON.stringify(cardData.antibodies),
        transfusion_requirements: JSON.stringify(cardData.transfusionRequirements)
      }));
    });

    it('should handle partial updates', async () => {
      const cardData = {
        bloodType: 'AB+'
      };

      const mockUpdated = { id: 1, ...cardData };
      mockRepository.update.mockResolvedValue(mockUpdated);

      const result = await service.update(1, cardData);

      expect(result).toEqual(mockUpdated);
      expect(mockRepository.update).toHaveBeenCalledWith(1, expect.objectContaining({
        blood_type: cardData.bloodType
      }));
    });
  });

  describe('getCautionCardWithPatient', () => {
    it('should return caution card with patient details', async () => {
      const mockCard = {
        id: 1,
        file_name: 'card.pdf',
        first_name: 'John',
        last_name: 'Doe',
        date_of_birth: '1990-01-01'
      };

      mockRepository.getCautionCardWithPatient.mockResolvedValue(mockCard);

      const result = await service.getCautionCardWithPatient(1);

      expect(result).toEqual(mockCard);
      expect(mockRepository.getCautionCardWithPatient).toHaveBeenCalledWith(1);
    });
  });

  describe('updateStatus', () => {
    it('should update caution card status with valid status', async () => {
      mockRepository.updateStatus.mockResolvedValue({ changes: 1 });

      await service.updateStatus(1, 'reviewed', 'user123');

      expect(mockRepository.updateStatus).toHaveBeenCalledWith(1, 'reviewed', 'user123');
    });

    it('should throw ValidationError with invalid status', async () => {
      await expect(service.updateStatus(1, 'invalid', 'user123')).rejects.toThrow(ValidationError);
      expect(mockRepository.updateStatus).not.toHaveBeenCalled();
    });
  });

  describe('markAsReviewed', () => {
    it('should mark caution card as reviewed', async () => {
      mockRepository.markAsReviewed.mockResolvedValue({ changes: 1 });

      await service.markAsReviewed(1, 'user123');

      expect(mockRepository.markAsReviewed).toHaveBeenCalledWith(1, 'user123');
    });

    it('should throw ValidationError when reviewer information is missing', async () => {
      await expect(service.markAsReviewed(1, null)).rejects.toThrow(ValidationError);
      expect(mockRepository.markAsReviewed).not.toHaveBeenCalled();
    });
  });

  describe('getOrphanedCards', () => {
    it('should return orphaned caution cards', async () => {
      const mockCards = [
        { id: 1, file_name: 'card1.pdf' },
        { id: 2, file_name: 'card2.pdf' }
      ];

      mockRepository.getOrphanedCards.mockResolvedValue(mockCards);

      const result = await service.getOrphanedCards();

      expect(result).toEqual(mockCards);
      expect(mockRepository.getOrphanedCards).toHaveBeenCalled();
    });
  });

  describe('linkToPatient', () => {
    it('should link caution card to patient', async () => {
      mockRepository.linkToPatient.mockResolvedValue({ changes: 1 });

      await service.linkToPatient(1, 2, 'user123');

      expect(mockRepository.linkToPatient).toHaveBeenCalledWith(1, 2, 'user123');
    });

    it('should throw ValidationError when patient ID is missing', async () => {
      await expect(service.linkToPatient(1, null, 'user123')).rejects.toThrow(ValidationError);
      expect(mockRepository.linkToPatient).not.toHaveBeenCalled();
    });

    it('should throw ValidationError when updatedBy is missing', async () => {
      await expect(service.linkToPatient(1, 2, null)).rejects.toThrow(ValidationError);
      expect(mockRepository.linkToPatient).not.toHaveBeenCalled();
    });
  });

  describe('searchByText', () => {
    it('should search caution cards by text', async () => {
      const mockCards = [
        { id: 1, file_name: 'blood_test.pdf' },
        { id: 2, file_name: 'report.pdf' }
      ];

      mockRepository.searchByText.mockResolvedValue(mockCards);

      const result = await service.searchByText('blood');

      expect(result).toEqual(mockCards);
      expect(mockRepository.searchByText).toHaveBeenCalledWith('blood');
    });

    it('should throw ValidationError when search text is empty', async () => {
      await expect(service.searchByText('')).rejects.toThrow(ValidationError);
      expect(mockRepository.searchByText).not.toHaveBeenCalled();
    });
  });

  describe('processCard', () => {
    it('should process file and create caution card', async () => {
      const fileData = {
        originalname: 'card.pdf',
        path: '/path/card.pdf',
        size: 1000,
        mimetype: 'application/pdf'
      };

      const metadata = {
        uploadedBy: 'user123'
      };

      const mockCreated = { 
        id: 1, 
        file_name: fileData.originalname,
        file_path: fileData.path 
      };
      service.create = jest.fn().mockResolvedValue(mockCreated);

      const result = await service.processCard(fileData, metadata);

      expect(result).toEqual(mockCreated);
      expect(service.create).toHaveBeenCalledWith(expect.objectContaining({
        fileName: fileData.originalname,
        filePath: fileData.path,
        fileSize: fileData.size,
        fileType: fileData.mimetype,
        metadata: expect.objectContaining({
          uploadedBy: 'user123',
          uploadedAt: expect.any(String)
        })
      }));
    });

    it('should throw ValidationError when file data is invalid', async () => {
      const invalidFileData = {
        originalname: 'card.pdf'
      };

      await expect(service.processCard(invalidFileData)).rejects.toThrow(ValidationError);
    });
  });
}); 