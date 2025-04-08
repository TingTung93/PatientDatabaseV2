const logger = require('../utils/logger');

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
        const validTypes = [
            'A POS', 'A NEG',
            'B POS', 'B NEG',
            'O POS', 'O NEG',
            'AB POS', 'AB NEG',
            '<None>'
        ];
        return validTypes.includes(bloodType);
    }

    static async validateReport(reportData) {
        const result = {
            isValid: true,
            errors: [],
            warnings: []
        };

        // Validate metadata
        if (!reportData.metadata) {
            result.isValid = false;
            result.errors.push('Missing report metadata');
            return result;
        }

        const requiredMetadataFields = ['facility', 'facilityId', 'reportDate', 'reportType'];
        for (const field of requiredMetadataFields) {
            if (!reportData.metadata[field]) {
                result.isValid = false;
                result.errors.push(`Missing required metadata field: ${field}`);
            }
        }

        // Validate patients
        if (!Array.isArray(reportData.patients)) {
            result.isValid = false;
            result.errors.push('Missing or invalid patients array');
            return result;
        }

        if (reportData.patients.length === 0) {
            result.warnings.push('Report contains no patient records');
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
                'dateOfBirth',
                'bloodType'
            ];

            for (const field of requiredFields) {
                if (!patient[field]) {
                    result.isValid = false;
                    result.errors.push(`Missing required patient field: ${field}`);
                }
            }

            // Validate blood type
            const validBloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
            if (patient.bloodType && !validBloodTypes.includes(patient.bloodType)) {
                result.isValid = false;
                result.errors.push(`Invalid blood type: ${patient.bloodType}`);
            }

            // Check for duplicate medical record numbers
            if (patient.medicalRecordNumber) {
                if (mrnSet.has(patient.medicalRecordNumber)) {
                    result.warnings.push(`Duplicate medical record numbers found: ${patient.medicalRecordNumber}`);
                } else {
                    mrnSet.add(patient.medicalRecordNumber);
                }
            }

            // Validate arrays
            const arrayFields = ['transfusionRequirements', 'antibodies', 'antigens', 'comments'];
            for (const field of arrayFields) {
                if (patient[field] && !Array.isArray(patient[field])) {
                    result.isValid = false;
                    result.errors.push(`Invalid ${field}: must be an array`);
                }
            }

            // Validate dates
            if (patient.dateOfBirth && !(patient.dateOfBirth instanceof Date)) {
                result.isValid = false;
                result.errors.push('Invalid date of birth format');
            }
        }

        return result;
    }
}

module.exports = {
    validateReport: ReportValidator.validateReport.bind(ReportValidator)
}; 