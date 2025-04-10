/**
 * Adapts database patient records to the format expected by the frontend
 * Converts snake_case database fields to camelCase for frontend
 * @param {Object} patient - Patient record from database
 * @returns {Object} Patient record adapted for frontend
 */
export function adaptPatientForFrontend(patient) {
  if (!patient) return null;
  
  // Safe JSON parse helper function
  const safeJsonParse = (str, defaultValue = []) => {
    if (!str) return defaultValue;
    try {
      return JSON.parse(str);
    } catch (e) {
      console.warn(`Failed to parse JSON: ${e.message}. Using default value instead.`);
      return defaultValue;
    }
  };
  
  return {
    id: patient.id,
    // These are kept for backward compatibility but should be accessed through nested objects
    firstName: patient.first_name,
    lastName: patient.last_name,
    medicalRecordNumber: patient.mrn,
    dateOfBirth: patient.date_of_birth,
    // Structured data for the frontend
    identification: {
      id: patient.id,
      mrn: patient.mrn || '',
      ssn: patient.ssn || '',
      externalIds: safeJsonParse(patient.external_ids, {})
    },
    demographics: {
      firstName: patient.first_name || '',
      lastName: patient.last_name || '',
      middleName: patient.middle_name || '',
      dateOfBirth: patient.date_of_birth || '',
      gender: patient.gender === 'Male' ? 'M' : (patient.gender === 'Female' ? 'F' : 'O'), // Convert to expected format
      race: patient.race || '',
      ethnicity: patient.ethnicity || '',
      contactNumber: patient.contact_number || '',
      email: patient.email || ''
    },
    bloodProfile: {
      abo: (patient.blood_type && patient.blood_type.charAt(0) === 'A' && patient.blood_type.charAt(1) === 'B') 
        ? 'AB' 
        : (patient.blood_type && patient.blood_type.charAt(0)) || 'O',
      rh: (patient.blood_type && patient.blood_type.includes('-')) ? '-' : '+',
      phenotype: {
        rh: {},
        kell: {},
        duffy: {},
        kidd: {},
        mns: {},
        other: {}
      },
      antibodies: safeJsonParse(patient.antibodies),
      restrictions: safeJsonParse(patient.restrictions)
    },
    medicalHistory: {
      allergies: safeJsonParse(patient.allergies),
      conditions: safeJsonParse(patient.medical_conditions),
      medications: safeJsonParse(patient.medications),
      surgeries: safeJsonParse(patient.surgeries, []),
      procedures: safeJsonParse(patient.procedures, [])
    },
    comments: safeJsonParse(patient.comments),
    notes: safeJsonParse(patient.notes),
    createdAt: patient.created_at || new Date().toISOString(),
    updatedAt: patient.updated_at || new Date().toISOString(),
    createdBy: patient.created_by || 'system',
    updatedBy: patient.updated_by || 'system',
    cautionFlags: safeJsonParse(patient.caution_flags),
    specialProcedures: safeJsonParse(patient.special_procedures)
  };
}

/**
 * Adapts multiple patient records for frontend
 * @param {Array} patients - Array of patient records from database
 * @returns {Array} Array of patient records adapted for frontend
 */
export function adaptPatientsForFrontend(patients) {
  if (!patients) return [];
  
  return patients.map(patient => adaptPatientForFrontend(patient));
}

/**
 * Adapts a caution card record for frontend
 * @param {Object} card - Caution card record from database
 * @returns {Object} Caution card record adapted for frontend
 */
export function adaptCautionCardForFrontend(card) {
  if (!card) return null;
  
  return {
    id: card.id,
    patientId: card.patient_id,
    bloodType: card.blood_type,
    fileName: card.file_name,
    imagePath: card.image_path,
    mimeType: card.mime_type,
    status: card.status,
    reviewedBy: card.reviewed_by,
    reviewedDate: card.reviewed_date,
    ocrText: card.ocr_text,
    metadata: card.metadata,
    createdAt: card.created_at,
    updatedAt: card.updated_at,
    // Frontend expects this property
    patientName: card.patient_name || `${card.first_name || ''} ${card.last_name || ''}`.trim()
  };
}

/**
 * Adapts multiple caution card records for frontend
 * @param {Array} cards - Array of caution card records from database
 * @returns {Array} Array of caution card records adapted for frontend
 */
export function adaptCautionCardsForFrontend(cards) {
  if (!cards) return [];
  
  return cards.map(card => adaptCautionCardForFrontend(card));
} 