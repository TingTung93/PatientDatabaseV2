/**
 * Format patient data to match frontend expectations
 * @param {Object} patient Raw patient data from database
 * @returns {Object} Formatted patient data
 */
const formatPatientData = (patient) => {
    if (!patient) return null;

    // Format blood type to maintain proper spacing and capitalization
    const formatBloodType = (bloodType) => {
        if (!bloodType || bloodType === 'Unknown') return 'Unknown';
        // If it's already in the correct format (e.g., "A POS"), return as is
        if (bloodType.includes(' ')) return bloodType;
        // If it's in compressed format (e.g., "APOS"), add space and format
        const type = bloodType.charAt(0);
        const rh = bloodType.slice(1);
        return `${type} ${rh}`;
    };

    // Convert database model to plain object if needed
    const data = patient.toJSON ? patient.toJSON() : patient;

    return {
        id: data.id,
        firstName: data.first_name || '',
        lastName: data.last_name || '',
        medicalRecordNumber: data.medical_record_number || '',
        dateOfBirth: data.date_of_birth || '',
        gender: data.gender || 'O',
        contactNumber: data.contact_number || null,
        bloodType: formatBloodType(data.blood_type),
        antigenPhenotype: data.antigen_phenotype || '',
        transfusionRestrictions: data.transfusion_restrictions || '',
        antibodies: Array.isArray(data.antibodies) ? data.antibodies : [],
        medicalHistory: data.medical_history || '',
        allergies: data.allergies || null,
        currentMedications: data.current_medications || null,
        comments: Array.isArray(data.comments) ? data.comments : [],
        createdBy: data.created_by || null,
        updatedBy: data.updated_by || null,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
        deletedAt: data.deleted_at || null
    };
};

/**
 * Format API response with standardized structure
 * @param {string} status Response status ('success' or 'error')
 * @param {Object} data Response data
 * @param {Object} pagination Pagination information
 * @param {string} message Optional message
 * @returns {Object} Formatted response
 */
const formatApiResponse = (status, data = null, pagination = null, message = null) => {
    const response = {
        status,
        data
    };

    if (pagination) {
        response.page = pagination.page;
        response.totalPages = pagination.totalPages;
        response.total = pagination.total;
    }

    if (message) {
        response.message = message;
    }

    return response;
};

module.exports = {
    formatPatientData,
    formatApiResponse
};
