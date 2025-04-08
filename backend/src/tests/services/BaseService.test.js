const BaseService = require('../../services/BaseService');
const { NotFoundError } = require('../../errors/AppError');

describe('BaseService', () => {
  let mockRepository;
  let service;

  beforeEach(() => {
    mockRepository = {
      findById: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn()
    };

    class TestService extends BaseService {
      constructor(repository) {
        super(repository);
      }
    }

    service = new TestService(mockRepository);
  });

  describe('findById', () => {
    it('should return item when found', async () => {
      const mockItem = { id: 1, name: 'Test' };
      mockRepository.findById.mockResolvedValue(mockItem);

      const result = await service.findById(1);

      expect(result).toEqual(mockItem);
      expect(mockRepository.findById).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundError when item not found', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(service.findById(1)).rejects.toThrow(NotFoundError);
    });
  });

  describe('findAll', () => {
    it('should return all items', async () => {
      const mockItems = [{ id: 1 }, { id: 2 }];
      mockRepository.findAll.mockResolvedValue(mockItems);

      const result = await service.findAll();

      expect(result).toEqual(mockItems);
      expect(mockRepository.findAll).toHaveBeenCalledWith({});
    });

    it('should pass filters to repository', async () => {
      const filters = { name: 'Test' };
      await service.findAll(filters);

      expect(mockRepository.findAll).toHaveBeenCalledWith(filters);
    });
  });

  describe('create', () => {
    it('should create item', async () => {
      const mockData = { name: 'Test' };
      const mockCreated = { id: 1, ...mockData };
      mockRepository.create.mockResolvedValue(mockCreated);

      const result = await service.create(mockData);

      expect(result).toEqual(mockCreated);
      expect(mockRepository.create).toHaveBeenCalledWith(mockData);
    });
  });

  describe('update', () => {
    it('should update item when found', async () => {
      const mockData = { name: 'Updated' };
      const mockUpdated = { id: 1, ...mockData };
      mockRepository.findById.mockResolvedValue({ id: 1 });
      mockRepository.update.mockResolvedValue(mockUpdated);

      const result = await service.update(1, mockData);

      expect(result).toEqual(mockUpdated);
      expect(mockRepository.update).toHaveBeenCalledWith(1, mockData);
    });

    it('should throw NotFoundError when item not found', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(service.update(1, { name: 'Test' })).rejects.toThrow(NotFoundError);
    });
  });

  describe('delete', () => {
    it('should delete item when found', async () => {
      mockRepository.findById.mockResolvedValue({ id: 1 });
      mockRepository.delete.mockResolvedValue({ changes: 1 });

      await service.delete(1);

      expect(mockRepository.delete).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundError when item not found', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(service.delete(1)).rejects.toThrow(NotFoundError);
    });
  });

  describe('count', () => {
    it('should return count of items', async () => {
      mockRepository.count.mockResolvedValue(5);

      const result = await service.count();

      expect(result).toBe(5);
      expect(mockRepository.count).toHaveBeenCalledWith({});
    });

    it('should pass filters to repository', async () => {
      const filters = { name: 'Test' };
      await service.count(filters);

      expect(mockRepository.count).toHaveBeenCalledWith(filters);
    });
  });
}); 