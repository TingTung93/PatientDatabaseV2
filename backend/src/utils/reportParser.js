import { db } from '../database/init.js';
import logger from './logger.js';

/**
 * Parses a patient record line from the report
 * @param {string} line - A line containing patient information
 * @returns {Object|null} Parsed patient data or null if invalid line
 */
function parsePatientLine(line) {
    logger.debug(`Attempting to parse line: ${line}`);

    // Regular expression to match patient data line
    // Format: LASTNAME, FirstName MiddleName      MRN               DOB HH:MM     ABO/RH       PHENOTYPE    REQUIREMENTS  ANTIBODIES   ANTIGENS
    const patientRegex = /^\s*([A-Za-z,\s.'-]+)\s+(\d+)\s+(\d{2}[A-Z]{3}\d{2})\s+(\d{2}:\d{2})\s+([A-Z][+-]?\s*(?:POS|NEG)?)\s+([A-Z\s<>]+)\s+([A-Z\s<>]+)\s+([A-Z\s<>]+)\s+([A-Z\s<>]+)/;
    
    const notOnFileRegex = /<Not on File>/;
    const match = line.match(patientRegex);

    if (!match || line.match(notOnFileRegex)) {
        logger.debug(`Failed to match line: ${line}`);
        return null;
    }

    logger.debug(`Successfully matched line: ${JSON.stringify(match)}`);

    // Extract data from regex match
    const [, name, mrn, dobStr, timeStr, bloodType, phenotype, transfusionReq, antibodies, antigens] = match;
    logger.debug(`Extracted data: name=${name}, mrn=${mrn}, dobStr=${dobStr}, timeStr=${timeStr}, bloodType=${bloodType}, phenotype=${phenotype}, transfusionReq=${transfusionReq}, antibodies=${antibodies}, antigens=${antigens}`);

    // Parse date of birth
    const [day, month, year] = dobStr.match(/(\d{2})([A-Z]{3})(\d{2})/).slice(1);
    const monthMap = {
        'JAN': 0, 'FEB': 1, 'MAR': 2, 'APR': 3, 'MAY': 4, 'JUN': 5,
        'JUL': 6, 'AUG': 7, 'SEP': 8, 'OCT': 9, 'NOV': 10, 'DEC': 11
    };
    // Parse two-digit year:
    // - For years 00-25: add 2000 (patients born 2000-2025)
    // - For years 26-99: add 1900 (patients born 1926-1999)
    const yearNum = parseInt(year);
    const fullYear = yearNum <= 25 ? 2000 + yearNum : 1900 + yearNum;
    const dob = new Date(fullYear, monthMap[month], parseInt(day));
    
    // Validate the date is reasonable (not in the future and not too far in the past)
    const now = new Date();
    if (dob > now) {
        logger.warn(`Invalid future date of birth detected: ${dob.toISOString()} for input ${dobStr}`);
        return null;
    }
    if (dob.getFullYear() < 1900) {
        logger.warn(`Invalid date of birth before 1900 detected: ${dob.toISOString()} for input ${dobStr}`);
        return null;
    }

    // Clean up the data
    const cleanValue = (value) => value === '<None>' ? null : value.trim();

    // Split name into first and last name
    const nameParts = name.trim().split(',').map(part => part.trim());
    const lastName = nameParts[0];
    const firstName = nameParts[1] || nameParts[0]; // Use first part of name if only one part is present

    // Clean and format blood type to match ENUM values
    const cleanedBloodType = cleanValue(bloodType)?.replace(/\s+/g, '')?.trim() || null;
    const formattedBloodType = cleanedBloodType ? cleanedBloodType.replace('+', ' POS').replace('-', ' NEG') : null;

    // Format antibodies as JSON array
    const formattedAntibodies = cleanValue(antibodies) ? [cleanValue(antibodies)] : [];

    const result = {
        name: `${firstName} ${lastName}`,
        medical_record_number: mrn.trim(),
        dob: dob.toISOString().split('T')[0], // Format as YYYY-MM-DD
        blood_type: formattedBloodType,
        antigen_phenotype: cleanValue(phenotype),
        transfusion_restrictions: cleanValue(transfusionReq),
        antibodies: JSON.stringify(formattedAntibodies),
        medical_history: cleanValue(antigens),
        comments: [] // Add comments field
    };

    logger.debug(`Parsed patient data: ${JSON.stringify(result)}`);
    return result;
}

/**
 * Parses patient comments from the report
 * @param {string[]} lines - Array of lines containing patient comments
 * @returns {string[]} Array of parsed comments
 */
function parseComments(lines) {
    return lines
        .filter(line => line.includes('>>'))
        .map(line => line.replace('>>', '').trim());
}

/**
 * Parses an entire EHR report and extracts patient information
 * @param {string} reportContent - The full content of the EHR report
 * @returns {Array} Array of parsed patient records
 */
function parseReport(reportContent) {
    logger.debug('Starting to parse report');
    logger.debug(`Report content: ${reportContent}`);

    const lines = reportContent.split('\n');
    const patients = [];
    let currentPatient = null;
    let commentLines = [];

    for (const line of lines) {
        // Try to parse as patient line
        const patientData = parsePatientLine(line);
        
        if (patientData) {
            logger.debug(`Found patient data: ${JSON.stringify(patientData)}`);
            // If we have a previous patient, add their comments
            if (currentPatient) {
                currentPatient.comments = JSON.stringify(parseComments(commentLines));
                patients.push(currentPatient);
                commentLines = [];
            }
            
            currentPatient = patientData;
        } else if (currentPatient && line.includes('* * * * * * * * * * * * * * * *')) {
            // Skip the comment header line
            continue;
        } else if (currentPatient) {
            // Collect comment lines
            commentLines.push(line);
        }
    }

    // Add the last patient if exists
    if (currentPatient) {
        currentPatient.comments = JSON.stringify(parseComments(commentLines));
        patients.push(currentPatient);
    }

    logger.debug(`Parsed ${patients.length} patients`);
    return patients;
}

/**
 * Processes a report and saves patient data to the database
 * @param {string} reportContent - The full content of the EHR report
 * @returns {Promise<Array>} Array of created/updated patient records
 */
async function processReport(reportContent) {
    try {
        logger.debug('Starting to process report');
        const parsedPatients = parseReport(reportContent);
        const results = [];
        logger.debug(`Parsed patients: ${JSON.stringify(parsedPatients)}`);

        const stmt = db.prepare(`
            INSERT INTO patients (
                name, medical_record_number, dob, blood_type,
                antigen_phenotype, transfusion_restrictions, antibodies,
                medical_history, comments
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(medical_record_number) DO UPDATE SET
                name = excluded.name,
                dob = excluded.dob,
                blood_type = excluded.blood_type,
                antigen_phenotype = excluded.antigen_phenotype,
                transfusion_restrictions = excluded.transfusion_restrictions,
                antibodies = excluded.antibodies,
                medical_history = excluded.medical_history,
                comments = excluded.comments,
                updated_at = CURRENT_TIMESTAMP
        `);

        for (const patientData of parsedPatients) {
            try {
                logger.debug(`Processing patient with MRN: ${patientData.medical_record_number}`);

                const result = stmt.run(
                    patientData.name,
                    patientData.medical_record_number,
                    patientData.dob,
                    patientData.blood_type,
                    patientData.antigen_phenotype,
                    patientData.transfusion_restrictions,
                    patientData.antibodies,
                    patientData.medical_history,
                    patientData.comments
                );

                const patient = db.prepare('SELECT * FROM patients WHERE id = ?').get(result.lastInsertRowid);
                logger.info(`Processed patient record for MRN: ${patientData.medical_record_number}`);

                results.push(patient);
            } catch (error) {
                logger.error(`Error processing patient: ${error.message}`, {
                    error: error.stack,
                    mrn: patientData.medical_record_number,
                    patientData: patientData
                });
                throw error;
            }
        }

        return results;
    } catch (error) {
        logger.error(`Error processing report: ${error.message}`, { stack: error.stack });
        throw error;
    }
}

export {
    parseReport,
    processReport
};