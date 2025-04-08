const { ValidationError } = require('../errors');

/**
 * Middleware that validates request data against a Joi schema
 * @param {Object} schema - Joi schema to validate against
 * @returns {Function} Express middleware function
 */
const validateRequest = (schema) => {
    return async (req, res, next) => {
        try {
            // Validate request body against schema
            const validatedData = await schema.validateAsync(req.body, {
                abortEarly: false,
                stripUnknown: true
            });

            // Attach validated data to request
            req.validatedData = validatedData;
            next();
        } catch (error) {
            // Handle Joi validation errors
            if (error.isJoi) {
                const validationError = new ValidationError(
                    'Validation failed',
                    error.details.map(detail => detail.message)
                );
                next(validationError);
            } else {
                next(error);
            }
        }
    };
};

module.exports = validateRequest;