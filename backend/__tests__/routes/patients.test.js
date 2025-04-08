const request = require('supertest');
const xss = require('xss');
const multer = require('multer');
const path = require('path');
const Clamscan = require('clamscan');
const crypto = require('crypto');
const { fileTypeFromBuffer } = require('file-type');

const app = require('../../src/app.js'); // Use the actual app

// --- Mock Dependencies ---
const db = require('../../src/database/models/index.js');
const authenticateToken = require('../../src/middleware/auth'); // Assuming auth is needed
const { asyncHandler } = require('../../src/utils/asyncHandler');
const { formatPatientData, formatApiResponse } = require('../../src/utils/formatters');
const logger = require('../../src/utils/logger');

// Mock file-type module
jest.mock('file-type', () => ({
    fileTypeFromBuffer: jest.fn()
}));

// Mock multer
jest.mock('multer', () => {
    const multerMock = () => ({
        single: () => (req, res, next) => {
            if (req.mockMulterError) {
                next(req.mockMulterError);
                return;
            }
            next();
        }
    });
    multerMock.MulterError = class MulterError extends Error {
        constructor(code) {
            super('Multer error');
            this.code = code;
        }
    };
    return multerMock;
});

// Mock clamscan
jest.mock('clamscan', () => {
    return jest.fn().mockImplementation(() => ({
        init: jest.fn().mockResolvedValue({
            scanFile: jest.fn()
        })
    }));
});

// Mock fs/promises
jest.mock('fs/promises', () => ({
    mkdir: jest.fn().mockResolvedValue(undefined),
    unlink: jest.fn().mockResolvedValue(undefined),
    readFile: jest.fn().mockResolvedValue(Buffer.from('test file content')),
    rename: jest.fn().mockResolvedValue(undefined),
    stat: jest.fn().mockResolvedValue({ isFile: () => true })
}));

// Mock Models
jest.mock('../../src/database/models/index.js', () => ({
  Patient: {
    findAndCountAll: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn(),
    // Mock instance methods if needed via findByPk return value
    // save: jest.fn(), // Instance method
    // destroy: jest.fn(), // Instance method
    findByIdAndDelete: jest.fn(), // If this Mongoose-like method exists? Or maybe destroy?
    deleteAll: jest.fn(), // Custom method? Mock if used.
  },
  Sequelize: { // Mock Op if used by search
      Op: {
          like: Symbol('like'),
          or: Symbol('or'),
          and: Symbol('and'),
      }
  }
}));

// Mock Middleware and Utils
jest.mock('../../src/middleware/auth', () => jest.fn((req, res, next) => {
  // Simulate authentication
  req.user = { id: 'mock-user-id', role: 'user' };
  next();
}));
// Keep formatPatientData mock, remove formatApiResponse mock
jest.mock('../../src/utils/formatters', () => ({
  formatPatientData: jest.fn(patient => ({ ...patient?.dataValues, formatted: true })),
  // Let the actual formatApiResponse run
  formatApiResponse: jest.requireActual('../../src/utils/formatters').formatApiResponse
}));
jest.mock('../../src/utils/asyncHandler', () => ({ // Mock asyncHandler to just run the function
    asyncHandler: fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)
}));
jest.mock('../../src/utils/logger', () => ({ info: jest.fn(), error: jest.fn(), debug: jest.fn() }));
jest.mock('xss', () => jest.fn(input => input)); // Simple pass-through mock for xss

// --- Test Data ---
const mockPatientId = 1;
const mockPatientData = {
    id: mockPatientId,
    first_name: 'John',
    last_name: 'Doe',
    mrn: 'MRN123',
    dob: '1990-01-01',
    gender: 'M',
    contact_number: '1234567890',
    blood_type: 'A POS',
    // Include dataValues structure if mocks return Sequelize instances
    dataValues: { 
        id: mockPatientId,
        first_name: 'John',
        last_name: 'Doe',
        mrn: 'MRN123',
        dob: '1990-01-01',
        gender: 'M',
        contact_number: '1234567890',
        blood_type: 'A POS',
    }
};

describe('Patient Management API', () => {

    beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks();
        db.Patient.findAndCountAll.mockResolvedValue({ count: 1, rows: [mockPatientData] });
        db.Patient.findByPk.mockResolvedValue(mockPatientData);
        db.Patient.create.mockImplementation(async (data) => ({ ...data, id: mockPatientId + 1, dataValues: { ...data, id: mockPatientId + 1 } }));
        db.Patient.findByIdAndDelete.mockResolvedValue(mockPatientData); // Or mock destroy
        db.Patient.deleteAll?.mockResolvedValue(1); // Mock if used
    });

    // --- GET /api/v1/patients ---
    describe('GET /api/v1/patients', () => {
        it('should return list of patients with pagination', async () => {
            const res = await request(app)
                .get('/api/v1/patients?page=1&per_page=10')
                // Auth mock handles auth
                .expect(200);

            expect(db.Patient.findAndCountAll).toHaveBeenCalledWith({ limit: 10, offset: 0 });
            expect(res.body.status).toBe('success');
            expect(res.body.data).toBeInstanceOf(Array);
            // Assuming formatPatientData worked and data exists
            if (res.body.data && res.body.data.length > 0) {
                expect(res.body.data[0]).toHaveProperty('formatted', true); // Check formatter was called
            }
            // Check pagination info (assuming it's returned top-level based on route code)
            expect(res.body.page).toBe(1);
            expect(res.body.totalPages).toBe(1);
            expect(res.body.total).toBe(1);
            expect(res.body.errors).toBeNull(); // Expect no errors on success
        });

         it('should return empty array when no patients', async () => {
            db.Patient.findAndCountAll.mockResolvedValue({ count: 0, rows: [] });
            const res = await request(app)
                .get('/api/v1/patients')
                .expect(200);

            expect(res.body.status).toBe('success');
            expect(res.body.data).toEqual([]);
            expect(res.body.total).toBe(0); // Pagination info still present
            expect(res.body.errors).toBeNull();
        });
    });

    // --- GET /api/v1/patients/search ---
    describe('GET /api/v1/patients/search', () => {
        it('should search patients by name', async () => {
            await request(app)
                .get('/api/v1/patients/search?name=John Doe')
                .expect(200);
            
            // Check that findAndCountAll was called with appropriate where clause
            expect(db.Patient.findAndCountAll).toHaveBeenCalledWith(expect.objectContaining({
                 where: expect.objectContaining({
                     // Sequelize v6+ uses Symbols for operators
                     [db.Sequelize.Op.and]: expect.any(Array) 
                 })
            }));
        });

         it('should search patients by MRN', async () => {
            await request(app)
                .get('/api/v1/patients/search?mrn=MRN123')
                .expect(200);
            
            expect(db.Patient.findAndCountAll).toHaveBeenCalledWith(expect.objectContaining({
                 where: { medicalRecordNumber: 'MRN123' }
            }));
        });
        // Add more search criteria tests if needed
    });

    // --- GET /api/v1/patients/:id ---
    describe('GET /api/v1/patients/:id', () => {
        it('should fetch a single patient', async () => {
            const res = await request(app)
                .get(`/api/v1/patients/${mockPatientId}`)
                .expect(200);

            expect(db.Patient.findByPk).toHaveBeenCalledWith(mockPatientId); // ID is integer now
            expect(res.body.status).toBe('success');
            expect(res.body.data).toBeDefined();
            expect(res.body.data.id).toEqual(mockPatientId);
            expect(res.body.data).toHaveProperty('formatted', true);
            expect(res.body.errors).toBeNull();
        });

        it('should return 404 for non-existent patient', async () => {
            db.Patient.findByPk.mockResolvedValue(null);
            const res = await request(app)
                .get('/api/v1/patients/999999')
                .expect(404);

            // Check structure from formatApiResponse used in the route
            expect(res.body.status).toBe('error');
            expect(res.body.message).toBe('Patient not found');
            expect(res.body.data).toBeNull();
            expect(res.body.errors).toBeNull(); // Or potentially the message string depending on formatApiResponse
        });

         it('should return 400 for invalid ID format', async () => {
            const res = await request(app)
                .get('/api/v1/patients/invalid-id')
                .expect(400);

            // Check structure from formatApiResponse used by validationResult handler
            expect(res.body.status).toBe('error');
            expect(res.body.message).toBe('Validation failed'); // Default message from validateRequest
            expect(res.body.data).toBeNull();
            expect(res.body.errors).toBeInstanceOf(Array);
            expect(res.body.errors[0].msg).toContain('must be a valid integer');
            expect(res.body.errors[0].param).toBe('id'); // Check field name
         });
    });

    // --- POST /api/v1/patients ---
    describe('POST /api/v1/patients', () => {
        const newPatientData = {
            firstName: 'Jane', // Use camelCase matching validation rules
            lastName: 'Smith',
            dob: '1995-05-05',
            gender: 'F', // Use valid ENUM if model enforces it strictly
            medicalRecordNumber: 'MRN456',
            bloodType: 'B POS', // Use valid ENUM
            contactNumber: '0987654321'
        };

        it('should create a new patient', async () => {
            const res = await request(app)
                .post('/api/v1/patients')
                .send(newPatientData)
                .expect(201);

            expect(db.Patient.create).toHaveBeenCalledWith(expect.objectContaining({
                firstName: 'Jane', // Check data passed to create
                lastName: 'Smith'
            }));
            expect(res.body.status).toBe('success');
            expect(res.body.data).toBeDefined();
            expect(res.body.data).toHaveProperty('id');
            expect(res.body.data.firstName).toBe('Jane'); // Check formatted response
            expect(res.body.errors).toBeNull();
        });

        it('should reject invalid patient data based on validation rules', async () => {
            const invalidData = { ...newPatientData, firstName: '' }; // Empty first name
            const res = await request(app)
                .post('/api/v1/patients')
                .send(invalidData)
                .expect(400);

            // Check structure from formatApiResponse used by validationResult handler
            expect(res.body.status).toBe('error');
            expect(res.body.message).toBe('Validation failed');
            expect(res.body.data).toBeNull();
            expect(res.body.errors).toBeInstanceOf(Array);
            expect(res.body.errors[0].msg).toBe('First Name is required'); // Match validation message
            expect(res.body.errors[0].param).toBe('firstName');
            expect(db.Patient.create).not.toHaveBeenCalled();
        });

         it('should reject invalid blood type not caught by validator', async () => {
            // Test the route's internal check
            const invalidData = { ...newPatientData, bloodType: 'INVALID' }; 
            const res = await request(app)
                .post('/api/v1/patients')
                .send(invalidData)
                .expect(400);

            // Check structure from formatApiResponse used in the route's internal check
            expect(res.body.status).toBe('error');
            expect(res.body.data).toBeNull();
            // The route returns the error message directly in the 'errors' field for this specific check
            expect(res.body.errors).toMatch(/Invalid blood type/);
            expect(db.Patient.create).not.toHaveBeenCalled();
        });
    });

    // --- POST /api/v1/patients/:id/caution-cards ---
    describe('POST /api/v1/patients/:id/caution-cards', () => {
        const mockFile = {
            originalname: 'test-file.png',
            mimetype: 'image/png',
            path: '/tmp/test-123',
            size: 1024 * 1024 // 1MB
        };

        beforeEach(() => {
            // Reset file type mock
            fileTypeFromBuffer.mockResolvedValue({ mime: 'image/png', ext: 'png' });
            
            // Reset clamscan mock
            const clamscanInstance = new Clamscan();
            clamscanInstance.init().then(scanner => {
                scanner.scanFile.mockResolvedValue({ isInfected: false, viruses: [] });
            });
        });

        it('should successfully upload and process a valid caution card', async () => {
            const res = await request(app)
                .post(`/api/v1/patients/${mockPatientId}/caution-cards`)
                .attach('cautionCardFile', Buffer.from('test file content'), mockFile.originalname)
                .expect(201);

            expect(res.body.status).toBe('success');
            expect(res.body.message).toBe('Caution card uploaded and processed successfully.');
            expect(res.body.data).toHaveProperty('fileId');
            expect(res.body.data).toHaveProperty('filename', mockFile.originalname);
        });

        it('should reject files that exceed size limit', async () => {
            const largeFile = { ...mockFile, size: 10 * 1024 * 1024 }; // 10MB
            const multerError = new multer.MulterError('LIMIT_FILE_SIZE');
            
            const res = await request(app)
                .post(`/api/v1/patients/${mockPatientId}/caution-cards`)
                .attach('cautionCardFile', Buffer.from('test file content'), largeFile.originalname)
                .expect(400);

            expect(res.body.status).toBe('error');
            expect(res.body.message).toMatch(/File too large/);
        });

        it('should reject files with invalid MIME types', async () => {
            fileTypeFromBuffer.mockResolvedValue({ mime: 'application/pdf', ext: 'pdf' });
            
            const invalidFile = { ...mockFile, mimetype: 'application/pdf' };
            
            const res = await request(app)
                .post(`/api/v1/patients/${mockPatientId}/caution-cards`)
                .attach('cautionCardFile', Buffer.from('test file content'), invalidFile.originalname)
                .expect(400);

            expect(res.body.status).toBe('error');
            expect(res.body.message).toMatch(/Invalid file content type/);
        });

        it('should reject files infected with malware', async () => {
            const clamscanInstance = new Clamscan();
            clamscanInstance.init().then(scanner => {
                scanner.scanFile.mockResolvedValue({
                    isInfected: true,
                    viruses: ['EICAR-TEST-SIGNATURE']
                });
            });

            const res = await request(app)
                .post(`/api/v1/patients/${mockPatientId}/caution-cards`)
                .attach('cautionCardFile', Buffer.from('test file content'), mockFile.originalname)
                .expect(400);

            expect(res.body.status).toBe('error');
            expect(res.body.message).toMatch(/Malware detected/);
        });

        it('should handle missing file in request', async () => {
            const res = await request(app)
                .post(`/api/v1/patients/${mockPatientId}/caution-cards`)
                .expect(400);

            expect(res.body.status).toBe('error');
            expect(res.body.message).toMatch(/No file uploaded/);
        });

        it('should clean up temporary files on error', async () => {
            const fs = require('fs/promises');
            fileTypeFromBuffer.mockRejectedValue(new Error('File type detection failed'));

            await request(app)
                .post(`/api/v1/patients/${mockPatientId}/caution-cards`)
                .attach('cautionCardFile', Buffer.from('test file content'), mockFile.originalname)
                .expect(500);

            expect(fs.unlink).toHaveBeenCalled();
        });
    });

    // --- PUT /api/v1/patients/:id ---
    describe('PUT /api/v1/patients/:id', () => {
        const updateData = { lastName: 'Smithers', bloodType: 'O POS' };

        it('should update patient details', async () => {
            // Mock findById to return an object with a save method
            const mockExistingPatient = {
                ...mockPatientData.dataValues,
                save: jest.fn().mockImplementation(async function() { return this; }) // Mock save on instance
            };
            db.Patient.findById = jest.fn().mockResolvedValue(mockExistingPatient); // Assuming findById is used? Route uses findByPk

            // Re-mock findByPk for this specific test's need if PUT uses it
             db.Patient.findByPk = jest.fn().mockResolvedValue(mockExistingPatient);


            const res = await request(app)
                .put(`/api/v1/patients/${mockPatientId}`)
                .send(updateData)
                .expect(200);

            expect(db.Patient.findById || db.Patient.findByPk).toHaveBeenCalledWith(String(mockPatientId)); // Check find method used
            expect(mockExistingPatient.save).toHaveBeenCalled();
            expect(mockExistingPatient.lastName).toBe(updateData.lastName); // Check if instance was updated before save
            expect(mockExistingPatient.bloodType).toBe(updateData.bloodType);
            expect(res.body.status).toBe('success');
            expect(res.body.data).toBeDefined();
            expect(res.body.data.lastName).toBe(updateData.lastName);
            expect(res.body.errors).toBe('Patient updated successfully'); // Check message from formatApiResponse
        });

        it('should return 404 for non-existent patient', async () => {
            db.Patient.findById = jest.fn().mockResolvedValue(null); // Assuming findById
            db.Patient.findByPk = jest.fn().mockResolvedValue(null); // Mock findByPk too

            const res = await request(app)
                .put('/api/v1/patients/999999')
                .send(updateData)
                .expect(404);

            // Check structure from formatApiResponse used in the route
            expect(res.body.status).toBe('error');
            expect(res.body.data).toBeNull();
            expect(res.body.errors).toBe('Patient not found'); // Route returns message directly in errors
        });

        it('should return 400 for invalid update data', async () => {
             const invalidUpdate = { dob: 'invalid-date' };
             const res = await request(app)
                .put(`/api/v1/patients/${mockPatientId}`)
                .send(invalidUpdate)
                .expect(400);

             // Check structure from formatApiResponse used by validationResult handler
             expect(res.body.status).toBe('error');
             expect(res.body.message).toBe('Validation failed');
             expect(res.body.data).toBeNull();
             expect(res.body.errors).toBeInstanceOf(Array);
             expect(res.body.errors[0].msg).toContain('Date of birth must be a valid date');
             expect(res.body.errors[0].param).toBe('dob');
        });
    });

    // --- DELETE /api/v1/patients/:id ---
    describe('DELETE /api/v1/patients/:id', () => {
        it('should delete a patient', async () => {
            // Mock the delete method used (findByIdAndDelete or destroy?)
             db.Patient.findByIdAndDelete.mockResolvedValue(mockPatientData); // Assume Mongoose-like for now
             // OR if using destroy:
             // const mockPatientInstance = { destroy: jest.fn().mockResolvedValue(1) };
             // db.Patient.findByPk.mockResolvedValue(mockPatientInstance);

            const res = await request(app)
                .delete(`/api/v1/patients/${mockPatientId}`)
                .expect(200);

            expect(db.Patient.findByIdAndDelete).toHaveBeenCalledWith(String(mockPatientId)); // Assuming Mongoose-like method was intended
            // OR expect(db.Patient.destroy).toHaveBeenCalledWith({ where: { id: mockPatientId } }); // If using Sequelize destroy
            expect(res.body.status).toBe('success');
            expect(res.body.data).toBeNull();
            expect(res.body.errors).toBe('Patient deleted successfully'); // Route returns message directly in errors
        });

        it('should return 404 for non-existent patient', async () => {
            db.Patient.findByIdAndDelete.mockResolvedValue(null); // Or findByPk -> null
            const res = await request(app)
                .delete('/api/v1/patients/999999')
                .expect(404);

            // Check structure from formatApiResponse used in the route
            expect(res.body.status).toBe('error');
            expect(res.body.data).toBeNull();
            expect(res.body.errors).toBe('Patient not found or you do not have permission to delete it'); // Match route message
        });

         it('should return 400 for invalid ID format', async () => {
            // Note: Route uses isMongoId, but model uses integer. This test will fail validation.
             const res = await request(app)
                .delete('/api/v1/patients/invalid-id')
                .expect(400);

             // Check structure from formatApiResponse used by validationResult handler
             expect(res.body.status).toBe('error');
             expect(res.body.message).toBe('Validation failed');
             expect(res.body.data).toBeNull();
             expect(res.body.errors).toBeInstanceOf(Array);
             expect(res.body.errors[0].msg).toContain('Patient ID must be a valid integer'); // Match updated validation
             expect(res.body.errors[0].param).toBe('id');
         });
    });
});