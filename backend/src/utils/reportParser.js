import { db } from '../database/init.js';
import { log } from '../utils/logging.js';
import { queryExec, queryRun, queryGet } from './dbHelper.js';

/**
 * Parses a patient record line from the report
 * @param {string} line - A line containing patient information
 * @returns {Object|null} Parsed patient data or null if invalid line
 */
function parsePatientLine(line) {
    log.debug(`Attempting to parse line: ${line}`);

    // Regular expression to match patient data line
    // Format: LASTNAME, FirstName MiddleName      MRN               DOB HH:MM     ABO/RH       PHENOTYPE    REQUIREMENTS  ANTIBODIES   ANTIGENS
    const patientRegex = /^\s*([A-Za-z,\s.'-]+)\s+(\d+)\s+(\d{2}[A-Z]{3}\d{2})\s+(\d{2}:\d{2})\s+([A-Z][+-]?\s*(?:POS|NEG)?)\s+([A-Z\s<>]+)\s+([A-Z\s<>]+)\s+([A-Z\s<>]+)\s+([A-Z\s<>]+)/;
    
    const notOnFileRegex = /<Not on File>/;
    const match = line.match(patientRegex);

    if (!match || line.match(notOnFileRegex)) {
        log.debug(`Failed to match line: ${line}`);
        return null;
    }

    log.debug(`Successfully matched line: ${JSON.stringify(match)}`);

    // Extract data from regex match
    const [, name, mrn, dobStr, timeStr, bloodType, phenotype, transfusionReq, antibodies, antigens] = match;
    log.debug(`Extracted data: name=${name}, mrn=${mrn}, dobStr=${dobStr}, timeStr=${timeStr}, bloodType=${bloodType}, phenotype=${phenotype}, transfusionReq=${transfusionReq}, antibodies=${antibodies}, antigens=${antigens}`);

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
        log.warn(`Invalid future date of birth detected: ${dob.toISOString()} for input ${dobStr}`);
        return null;
    }
    if (dob.getFullYear() < 1900) {
        log.warn(`Invalid date of birth before 1900 detected: ${dob.toISOString()} for input ${dobStr}`);
        return null;
    }

    // Clean up the data
    const cleanValue = (value) => value === '<None>' ? null : value.trim();

    // Split name into first and last name
    const nameParts = name.trim().split(',').map(part => part.trim());
    const lastName = nameParts[0];
    const firstName = nameParts[1] || nameParts[0]; // Use first part of name if only one part is present

    // Keep original blood type format with space (e.g., 'B POS')
    const formattedBloodType = cleanValue(bloodType) || null;

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

    log.debug(`Parsed patient data: ${JSON.stringify(result)}`);
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
 * @returns {Object} Object with metadata and parsed patient records
 */
function parseReport(reportContent) {
    log.debug('Starting to parse report');
    log.debug(`Report content: ${reportContent}`);

    const lines = reportContent.split('\n');
    const patients = [];
    let currentPatient = null;
    let commentLines = [];

    // Extract report metadata from the first few lines
    const metadata = {
        facilityId: '', // Will populate from header line
        facility: '',   // Will populate from header line
        reportDate: new Date().toISOString(), // Default to current date if not found
        reportType: 'BLOOD_BANK', // Default type
        location: 'MAIN' // Default location
    };

    // Try to extract metadata from header lines
    for (let i = 0; i < Math.min(20, lines.length); i++) {
        const line = lines[i].trim();
        
        // Look for facility ID pattern - at start of line like "0067-BB"
        if (/^\s*\d{4}-BB/.test(line)) {
            metadata.facilityId = line.split(/\s+/)[0].trim();
            log.debug(`Found facilityId: ${metadata.facilityId}`);
        }
        
        // Look for facility code pattern - after "Facility:" like "0067A"
        if (/^Facility:\s*\d{4}[A-Z]/.test(line)) {
            metadata.facility = line.split(/:\s*/)[1].trim();
            log.debug(`Found facility: ${metadata.facility}`);
        }
        
        // Look for report date pattern (e.g., "As of Date: 17MAR25")
        if (line.includes('As of Date:')) {
            const dateMatch = line.match(/As of Date:\s+(\d{2})([A-Z]{3})(\d{2})/);
            if (dateMatch) {
                const [_, day, month, year] = dateMatch;
                const monthMap = {
                    'JAN': '01', 'FEB': '02', 'MAR': '03', 'APR': '04', 'MAY': '05', 'JUN': '06',
                    'JUL': '07', 'AUG': '08', 'SEP': '09', 'OCT': '10', 'NOV': '11', 'DEC': '12'
                };
                const yearNum = parseInt(year);
                const fullYear = yearNum <= 25 ? 2000 + yearNum : 1900 + yearNum;
                metadata.reportDate = `${fullYear}-${monthMap[month]}-${day}`;
                log.debug(`Found reportDate: ${metadata.reportDate}`);
            }
        }
    }

    // Log what we found in metadata
    log.debug(`Extracted metadata: ${JSON.stringify(metadata)}`);

    for (const line of lines) {
        // Try to parse as patient line
        const patientData = parsePatientLine(line);
        
        if (patientData) {
            log.debug(`Found patient data: ${JSON.stringify(patientData)}`);
            // If we have a previous patient, add their comments
            if (currentPatient) {
                currentPatient.comments = JSON.stringify(parseComments(commentLines));
                
                // Convert the patient data into the expected format
                const formattedPatient = {
                    firstName: currentPatient.name.split(' ').slice(0, -1).join(' '), // All except last word
                    lastName: currentPatient.name.split(' ').pop(), // Last word in name string
                    medicalRecordNumber: currentPatient.medical_record_number,
                    dateOfBirth: new Date(currentPatient.dob), // Convert to Date object
                    bloodType: currentPatient.blood_type,
                    phenotype: currentPatient.antigen_phenotype || 'Unknown',
                    transfusionRequirements: currentPatient.transfusion_restrictions ? 
                        [currentPatient.transfusion_restrictions] : [],
                    antibodies: JSON.parse(currentPatient.antibodies || '[]'),
                    antigens: [currentPatient.medical_history].filter(Boolean),
                    comments: JSON.parse(currentPatient.comments || '[]')
                };
                
                patients.push(formattedPatient);
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
        
        // Convert the last patient
        const formattedPatient = {
            firstName: currentPatient.name.split(' ').slice(0, -1).join(' '),
            lastName: currentPatient.name.split(' ').pop(),
            medicalRecordNumber: currentPatient.medical_record_number,
            dateOfBirth: new Date(currentPatient.dob),
            bloodType: currentPatient.blood_type,
            phenotype: currentPatient.antigen_phenotype || 'Unknown',
            transfusionRequirements: currentPatient.transfusion_restrictions ? 
                [currentPatient.transfusion_restrictions] : [],
            antibodies: JSON.parse(currentPatient.antibodies || '[]'),
            antigens: [currentPatient.medical_history].filter(Boolean),
            comments: JSON.parse(currentPatient.comments || '[]')
        };
        
        patients.push(formattedPatient);
    }

    log.debug(`Parsed ${patients.length} patients`);
    
    // Return object with both metadata and patients array
    return {
        metadata,
        patients
    };
}

/**
 * Processes a report and saves patient data to the database
 * @param {string} reportContent - The full content of the EHR report
 * @returns {Promise<Array>} Array of created/updated patient records
 */
async function processReport(reportContent) {
    try {
        log.debug('Starting to process report');
        const parsedReport = parseReport(reportContent); // Now returns {metadata, patients}
        const results = [];
        
        // Log parsed data with proper structure
        log.debug(`Parsed report: metadata=${JSON.stringify(parsedReport.metadata)}, patients=${parsedReport.patients.length}`);

        // Check if database is initialized
        if (!db.instance) {
            throw new Error('Database instance is not initialized');
        }

        // First, store report metadata
        const reportId = await storeReportMetadata(parsedReport.metadata);
        log.info(`Stored report metadata with ID: ${reportId}`);

        // Create a prepared statement for patient insertions
        for (const patient of parsedReport.patients) {
            try {
                // Insert the patient
                const result = await queryRun(`
                    INSERT INTO patients (
                        name, medical_record_number, dob, blood_type,
                        antigen_phenotype, transfusion_restrictions, antibodies,
                        medical_history, comments, report_id
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(medical_record_number) DO UPDATE SET
                        name = excluded.name,
                        dob = excluded.dob,
                        blood_type = excluded.blood_type,
                        antigen_phenotype = excluded.antigen_phenotype,
                        transfusion_restrictions = excluded.transfusion_restrictions,
                        antibodies = excluded.antibodies,
                        medical_history = excluded.medical_history,
                        comments = excluded.comments,
                        report_id = excluded.report_id
                `, [
                    patient.name,
                    patient.medical_record_number,
                    patient.dob,
                    patient.blood_type,
                    patient.antigen_phenotype,
                    patient.transfusion_restrictions,
                    patient.antibodies,
                    patient.medical_history,
                    patient.comments,
                    reportId
                ]);

                // Get the patient record
                const patientRecord = await queryGet(
                    'SELECT * FROM patients WHERE id = ?', 
                    [result.lastID]
                );
                
                results.push(patientRecord);
                log.debug(`Processed patient: ${patient.name}`);
            } catch (patientError) {
                log.error(`Error processing patient: ${patientError.message}`);
                // Continue with next patient
            }
        }

        log.info(`Successfully processed ${results.length} patients`);
        return results;
    } catch (error) {
        log.error(`Error processing report: ${error.message}`);
        throw error;
    }
}

/**
 * Stores report metadata in the database
 * @param {Object} metadata - The report metadata
 * @returns {number} The ID of the stored report metadata
 */
async function storeReportMetadata(metadata) {
    try {
        // Check if database is initialized
        if (!db.instance) {
            throw new Error('Database instance is not initialized');
        }
        
        // Ensure the reports_metadata table exists
        await queryExec(`
            CREATE TABLE IF NOT EXISTS reports_metadata (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                facility_id TEXT,
                facility TEXT,
                report_date TEXT,
                report_type TEXT,
                location TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // Insert the metadata
        const result = await queryRun(`
            INSERT INTO reports_metadata (
                facility_id, facility, report_date, report_type, location
            ) VALUES (?, ?, ?, ?, ?)
        `, [
            metadata.facilityId,
            metadata.facility,
            metadata.reportDate,
            metadata.reportType,
            metadata.location
        ]);
        
        return result.lastID;
    } catch (error) {
        log.error(`Error storing report metadata: ${error.message}`);
        throw error;
    }
}

/**
 * Stores a parsed report as JSON and processes patient information
 * @param {Object} parsedReport - The parsed report data with metadata and patients
 * @param {string} originalFilename - The original filename
 * @returns {Promise<Object>} Object with reportId and patientCount
 */
async function storeReportJson(parsedReport, originalFilename) {
    try {
        log.info('Storing report using simplified JSON storage');
        
        // Get database instance from the db object
        if (!db.instance) {
            throw new Error('Database instance is not initialized');
        }
        
        // Ensure the raw_reports table exists
        await queryExec(`
            CREATE TABLE IF NOT EXISTS raw_reports (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                filename TEXT,
                metadata TEXT,
                patients TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // Insert the report using the helper function
        const result = await queryRun(`
            INSERT INTO raw_reports (
                filename, metadata, patients, created_at
            ) VALUES (?, ?, ?, CURRENT_TIMESTAMP)
        `, [
            originalFilename,
            JSON.stringify(parsedReport.metadata),
            JSON.stringify(parsedReport.patients)
        ]);
        
        // Get the last inserted ID
        const reportId = result.lastID;
        
        log.info(`Successfully stored raw report with ID: ${reportId}`);
        
        // Process patient data from the report and save to database
        const processedPatients = await processPatientData(parsedReport.patients, reportId);
        
        log.info(`Processed ${processedPatients.length} patients from report ID: ${reportId}`);
        
        return {
            reportId,
            patientCount: parsedReport.patients.length,
            processedPatients
        };
    } catch (error) {
        log.error(`Error storing report as JSON: ${error.message}`);
        throw error;
    }
}

/**
 * Process patient data and save to the database
 * @param {Array} patients - Array of patient objects
 * @param {number} reportId - ID of the associated report
 * @returns {Promise<Array>} Array of processed patients
 */
async function processPatientData(patients, reportId) {
    const processedPatients = [];
    
    for (const patient of patients) {
        try {
            // Check if patient exists by medical record number
            let existingPatient = null;
            if (patient.medicalRecordNumber) {
                try {
                    // First try medical_record_number
                    existingPatient = await queryGet(
                        'SELECT * FROM patients WHERE medical_record_number = ?', 
                        [patient.medicalRecordNumber]
                    );
                } catch (error) {
                    log.error(`Error querying patient: ${error.message}`);
                }
            }
            
            // Format patient data for database insertion
            const patientData = {
                first_name: patient.firstName || '',
                last_name: patient.lastName || '',
                date_of_birth: patient.dateOfBirth instanceof Date ? 
                    patient.dateOfBirth.toISOString().split('T')[0] : null,
                blood_type: patient.bloodType || null,
                metadata: JSON.stringify({
                    phenotype: patient.phenotype || 'Unknown',
                    transfusionRequirements: patient.transfusionRequirements || [],
                    antibodies: patient.antibodies || [],
                    antigens: patient.antigens || [],
                    comments: patient.comments || []
                })
            };
            
            let patientId;
            
            if (existingPatient) {
                // Update existing patient
                await queryRun(`
                    UPDATE patients SET
                    first_name = COALESCE(?, first_name),
                    last_name = COALESCE(?, last_name),
                    date_of_birth = COALESCE(?, date_of_birth),
                    blood_type = COALESCE(?, blood_type),
                    metadata = ?,
                    updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                `, [
                    patientData.first_name || null,
                    patientData.last_name || null,
                    patientData.date_of_birth || null,
                    patientData.blood_type || null,
                    patientData.metadata,
                    existingPatient.id
                ]);
                
                patientId = existingPatient.id;
                log.info(`Updated existing patient ID: ${patientId}`);
            } else {
                // Insert new patient
                const result = await queryRun(`
                    INSERT INTO patients (
                        first_name, last_name, date_of_birth, blood_type, metadata, 
                        created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                `, [
                    patientData.first_name,
                    patientData.last_name,
                    patientData.date_of_birth,
                    patientData.blood_type,
                    patientData.metadata
                ]);
                
                patientId = result.lastID;
                log.info(`Created new patient with ID: ${patientId}`);
            }
            
            // Link patient to report
            await queryRun(`
                INSERT INTO patient_reports (
                    patient_id, report_id, created_at
                ) VALUES (?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(patient_id, report_id) DO NOTHING
            `, [patientId, reportId]);
            
            // Get the patient record
            const processedPatient = await queryGet('SELECT * FROM patients WHERE id = ?', [patientId]);
            processedPatients.push(processedPatient);
            
        } catch (error) {
            log.error(`Error processing patient: ${error.message}`);
            // Continue with next patient
        }
    }
    
    return processedPatients;
}

export {
    parseReport,
    processReport,
    storeReportJson,
    processPatientData
};