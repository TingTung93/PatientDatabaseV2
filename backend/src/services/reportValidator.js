import logger from '../utils/logger.js';

class ReportValidator {
    static validateHeader(header) {
        const errors = [];

        if (!header.facilityId || !/^\d{4}-[A-Z]{2}$/.test(header.facilityId)) {
            errors.push('Invalid facility ID format');
        }

        if (!header.reportDate || !this.isValidISODate(header.reportDate)) {
            errors.push('Invalid report date format');
        }

        if (!header.facility || !/^\d{4}[A-Z]$/.test(header.facility)) {
            errors.push('Invalid facility code format');
        }

        return errors;
    }

    static validatePatient(patient) {
        const errors = [];

        if (!patient.lastName || patient.lastName === '<Not on File>') {
            errors.push('Missing or invalid last name');
        }

        if (!patient.firstName || patient.firstName === '<Not on File>') {
            errors.push('Missing or invalid first name');
        }

        if (!patient.medicalRecordNumber || !/^\d+$/.test(patient.medicalRecordNumber)) {
            errors.push('Invalid medical record number format');
        }

        if (!patient.dateOfBirth || !this.isValidISODate(patient.dateOfBirth)) {
            errors.push('Invalid date of birth format');
        }

        if (!this.isValidBloodType(patient.bloodType)) {
            errors.push('Invalid blood type');
        }

        if (patient.comments) {
            const commentErrors = this.validateComments(patient.comments);
            errors.push(...commentErrors);
        }

        return errors;
    }

    static validateComments(comments) {
        const errors = [];

        for (const comment of comments) {
            if (!comment.date || !this.isValidISODate(comment.date)) {
                errors.push('Invalid comment date format');
            }

            if (!comment.time || !/^\d{2}:\d{2}:\d{2}$/.test(comment.time)) {
                errors.push('Invalid comment time format');
            }

            if (!comment.userId || !/^[A-Z0-9.]+$/.test(comment.userId)) {
                errors.push('Invalid user ID format');
            }

            if (!comment.comment || comment.comment.trim().length === 0) {
                errors.push('Empty comment text');
            }
        }

        return errors;
    }

    static isValidISODate(dateString) {
        const date = new Date(dateString);
        return date instanceof Date && !isNaN(date);
    }

    static isValidBloodType(bloodType) {
        // Allow both formats: 'B POS' (from parser) and 'B+' (legacy format)
        const validTypes = [
            'A POS', 'A NEG', 'A+', 'A-',
            'B POS', 'B NEG', 'B+', 'B-',
            'O POS', 'O NEG', 'O+', 'O-',
            'AB POS', 'AB NEG', 'AB+', 'AB-',
            '<None>', 'Unknown'
        ];
        return validTypes.includes(bloodType);
    }

    static async validateReport(reportData) {
        const result = {
            isValid: true,
            errors: [],
            warnings: []
        };

        // Add debug information to see what's coming in
        logger.debug(`Validating report data: ${JSON.stringify(reportData)}`);

        // Check if reportData exists
        if (!reportData) {
            result.isValid = false;
            result.errors.push('Missing report data');
            logger.error('Report validation failed: Missing report data');
            return result;
        }

        // Validate metadata
        if (!reportData.metadata) {
            result.isValid = false;
            result.errors.push('Missing report metadata');
            logger.error('Report validation failed: Missing metadata');
            return result;
        }

        // Make these fields optional for now
        const requiredMetadataFields = ['reportType'];
        const optionalMetadataFields = ['facility', 'facilityId', 'reportDate'];
        
        // Check required fields
        for (const field of requiredMetadataFields) {
            if (!reportData.metadata[field]) {
                result.isValid = false;
                result.errors.push(`Missing required metadata field: ${field}`);
                logger.error(`Report validation failed: Missing metadata field ${field}`);
            }
        }
        
        // Warn about optional fields 
        for (const field of optionalMetadataFields) {
            if (!reportData.metadata[field]) {
                result.warnings.push(`Missing optional metadata field: ${field}`);
                logger.warn(`Report validation warning: Missing metadata field ${field}`);
                
                // Set default values for missing fields
                if (field === 'reportType') reportData.metadata.reportType = 'BLOOD_BANK';
                if (field === 'facility') reportData.metadata.facility = 'UNKNOWN';
                if (field === 'facilityId') reportData.metadata.facilityId = 'UNKNOWN';
                if (field === 'reportDate') reportData.metadata.reportDate = new Date().toISOString().split('T')[0];
            }
        }

        // Validate patients array
        if (!Array.isArray(reportData.patients)) {
            result.isValid = false;
            result.errors.push('Missing or invalid patients array');
            logger.error('Report validation failed: Invalid patients array');
            return result;
        }

        if (reportData.patients.length === 0) {
            result.warnings.push('Report contains no patient records');
            logger.warn('Report validation warning: No patient records');
        }

        // Track medical record numbers to check for duplicates
        const mrnSet = new Set();

        // Validate each patient
        for (const patient of reportData.patients) {
            // Check required fields
            const requiredFields = [
                'lastName',
                'firstName',
                'medicalRecordNumber',
                'dateOfBirth'
                // Making bloodType optional since some hospitals might not record it
            ];

            const patientId = patient.medicalRecordNumber || 'unknown';
            logger.debug(`Validating patient: ${patientId}`);

            for (const field of requiredFields) {
                if (!patient[field]) {
                    result.isValid = false;
                    result.errors.push(`Patient ${patientId}: Missing required field: ${field}`);
                    logger.error(`Report validation failed: Patient ${patientId} missing field ${field}`);
                }
            }

            // Validate blood type only if present
            if (patient.bloodType) {
                const validBloodTypes = [
                    'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 
                    'A POS', 'A NEG', 'B POS', 'B NEG', 'AB POS', 'AB NEG', 'O POS', 'O NEG',
                    'Unknown', '<None>'
                ];
                if (!validBloodTypes.includes(patient.bloodType)) {
                    result.warnings.push(`Patient ${patientId}: Unusual blood type: ${patient.bloodType}`);
                    logger.warn(`Report validation warning: Patient ${patientId} has unusual blood type: ${patient.bloodType}`);
                }
            }

            // Check for duplicate medical record numbers
            if (patient.medicalRecordNumber) {
                if (mrnSet.has(patient.medicalRecordNumber)) {
                    result.warnings.push(`Duplicate medical record numbers found: ${patient.medicalRecordNumber}`);
                    logger.warn(`Report validation warning: Duplicate MRN: ${patient.medicalRecordNumber}`);
                } else {
                    mrnSet.add(patient.medicalRecordNumber);
                }
            }

            // Validate arrays
            const arrayFields = ['transfusionRequirements', 'antibodies', 'antigens'];
            for (const field of arrayFields) {
                if (patient[field] && !Array.isArray(patient[field])) {
                    result.isValid = false;
                    result.errors.push(`Patient ${patientId}: Invalid ${field}: must be an array`);
                    logger.error(`Report validation failed: Patient ${patientId} has invalid ${field} type`);
                }
            }
            
            // Make sure arrayFields are defined if they're not already
            for (const field of arrayFields) {
                if (!patient[field]) {
                    patient[field] = [];
                }
            }

            // Validate comments only if present
            if (patient.comments) {
                if (!Array.isArray(patient.comments)) {
                    result.isValid = false;
                    result.errors.push(`Patient ${patientId}: Invalid comments: must be an array`);
                    logger.error(`Report validation failed: Patient ${patientId} has invalid comments type`);
                }
            } else {
                patient.comments = [];  // Initialize if missing
            }

            // Validate dates - allow string dates or Date objects
            if (patient.dateOfBirth) {
                const dob = new Date(patient.dateOfBirth);
                if (isNaN(dob)) {
                    result.isValid = false;
                    result.errors.push(`Patient ${patientId}: Invalid date of birth: ${patient.dateOfBirth}`);
                    logger.error(`Report validation failed: Patient ${patientId} has invalid date of birth`);
                }
            }
        }

        return result;
    }
}

export const validateReport = ReportValidator.validateReport.bind(ReportValidator); 