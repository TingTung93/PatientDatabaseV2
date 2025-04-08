const { createValidationMiddleware, createFileValidationMiddleware } = require('../../middleware/validation');
const BaseValidator = require('../../utils/validation/BaseValidator');
const errors = require('../../errors');
const PatientValidator = require('../../utils/validation/PatientValidator');

// Mock BaseValidator and PatientValidator
jest.mock('../../utils/validation/BaseValidator');
jest.mock('../../utils/validation/PatientValidator', () => {
    return jest.fn().mockImplementation(() => {
        return {
            // Return the value directly, not a promise unless the middleware awaits it
            validate: jest.fn().mockReturnValue({ /* valid mock data */ }), 
            validateUpdate: jest.fn().mockReturnValue({ /* valid mock data */ }),
            validateFileMetadata: jest.fn().mockReturnValue({ /* valid mock file metadata */ })
        };
    });
});

beforeEach(() => {
    BaseValidator.mockClear();
    PatientValidator.mockClear();
    // Clear mocks on the instance if methods were called
    const patientValidatorInstance = PatientValidator.mock.instances[0];
    if (patientValidatorInstance) {
        patientValidatorInstance.validate.mockClear();
        patientValidatorInstance.validateUpdate.mockClear();
        patientValidatorInstance.validateFileMetadata.mockClear();
    }
});

describe('Validation Middleware', () => {
    let mockReq, mockRes, nextFunction;

    beforeEach(() => {
        mockReq = { body: {}, params: {}, query: {}, file: null, validatedData: null };
        mockRes = { status: jest.fn().mockReturnThis(), json: jest.fn() };
        nextFunction = jest.fn();
    });

    describe('createValidationMiddleware', () => {
        it('should pass validation for valid data', () => {
            const validator = new PatientValidator();
            const mockValidatedData = { firstName: 'John', lastName: 'Doe' }; // Example return value
            validator.validate.mockReturnValue(mockValidatedData);

            const middleware = createValidationMiddleware(validator);
            mockReq.body = { firstName: 'John', lastName: 'Doe' }; // Example input
            middleware(mockReq, mockRes, nextFunction);

            expect(validator.validate).toHaveBeenCalledWith(mockReq.body);
            expect(nextFunction).toHaveBeenCalledWith(); // Ensure next called with no error
            expect(mockReq.validatedData).toEqual(mockValidatedData); 
        });

        it('should call next with ValidationError for invalid data', () => {
            const validator = new PatientValidator();
            const validationError = new errors.ValidationError('Invalid data', { field: 'error' });
            validator.validate.mockImplementation(() => { throw validationError; });

            const middleware = createValidationMiddleware(validator);
            mockReq.body = { /* invalid data */ };
            middleware(mockReq, mockRes, nextFunction);

            expect(validator.validate).toHaveBeenCalledWith(mockReq.body);
            // Check error properties instead of instanceof
            expect(nextFunction).toHaveBeenCalledWith(expect.objectContaining({ 
                name: 'ValidationError', 
                statusCode: 400 
            })); 
        });

        it('should handle validateUpdate method', () => {
            const validator = new PatientValidator();
            const mockValidatedUpdateData = { firstName: 'John Updated' };
            validator.validateUpdate.mockReturnValue(mockValidatedUpdateData);

            const middleware = createValidationMiddleware(validator, 'validateUpdate');
            mockReq.body = { firstName: 'John Updated' };
            middleware(mockReq, mockRes, nextFunction);

            expect(validator.validateUpdate).toHaveBeenCalledWith(mockReq.body);
            expect(nextFunction).toHaveBeenCalledWith(); // No error
            expect(mockReq.validatedData).toEqual(mockValidatedUpdateData);
        });
    });

    describe('createFileValidationMiddleware', () => {
        it('should pass validation for valid file', () => {
            const validator = new PatientValidator(); // Use the mocked validator
            validator.validateFileMetadata.mockReturnValue({ filename: 'valid.txt' });

            const middleware = createFileValidationMiddleware(validator);
            mockReq.file = { originalname: 'valid.txt', mimetype: 'text/plain', size: 100 };
            middleware(mockReq, mockRes, nextFunction);

            expect(validator.validateFileMetadata).toHaveBeenCalledWith(mockReq.file);
            expect(nextFunction).toHaveBeenCalledWith(); // No error
        });

        it('should call next with ValidationError for missing file', () => {
            const validator = new PatientValidator();
            const middleware = createFileValidationMiddleware(validator);

            middleware(mockReq, mockRes, nextFunction); // No file attached

            // Check error properties
            expect(nextFunction).toHaveBeenCalledWith(expect.objectContaining({ 
                name: 'ValidationError', 
                statusCode: 400,
                errors: { file: 'File is required' } 
            })); 
        });

        it('should call next with ValidationError for invalid file', () => {
            const validator = new PatientValidator();
            const validationError = new errors.ValidationError('Invalid file type', { file: 'Must be TXT' });
            validator.validateFileMetadata.mockImplementation(() => { throw validationError; });

            const middleware = createFileValidationMiddleware(validator);
            mockReq.file = { originalname: 'invalid.pdf', mimetype: 'application/pdf', size: 500 };
            middleware(mockReq, mockRes, nextFunction);

            expect(validator.validateFileMetadata).toHaveBeenCalledWith(mockReq.file);
            // Check error properties
            expect(nextFunction).toHaveBeenCalledWith(expect.objectContaining({ 
                name: 'ValidationError', 
                statusCode: 400,
                message: 'Invalid file type'
            })); 
        });
    });
}); 