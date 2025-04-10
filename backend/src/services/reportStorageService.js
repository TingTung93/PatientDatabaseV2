import crypto from 'crypto';
import { Report, Patient } from '../database/models.js';
import { getSequelize } from '../database/db.js';
import logger from '../utils/logger.js';
import { ValidationError } from '../errors/index.js';
import { Op } from 'sequelize';

class ReportStorageService {
    static calculateChecksum(content) {
        return crypto
            .createHash('sha256')
            .update(content)
            .digest('hex');
    }

    static async getAllReports(page = 1, limit = 10) {
        try {
            const sequelize = getSequelize();
            const offset = (page - 1) * limit;

            const reports = await Report.findAndCountAll({
                include: [{
                    model: Patient,
                    as: 'patient'
                }],
                limit,
                offset,
                order: [['created_at', 'DESC']]
            });

            return {
                items: reports.rows,
                total: reports.count
            };
        } catch (error) {
            logger.error('Error retrieving all reports:', error);
            throw error;
        }
    }

    static async storeReport(reportData, fileContent, originalFilename, userId = null) {
        const sequelize = getSequelize();
        const transaction = await sequelize.transaction();

        try {
            // Check for duplicate MRNs within the input data *before* creating records
            const mrnSet = new Set();
            const duplicates = [];
            for (const patient of reportData.patients) {
                if (mrnSet.has(patient.medicalRecordNumber)) {
                    duplicates.push(patient.medicalRecordNumber);
                }
                mrnSet.add(patient.medicalRecordNumber);
            }

            // If duplicates found, throw an error to trigger rollback
            if (duplicates.length > 0) {
                throw new ValidationError(`Duplicate medical record numbers found: ${duplicates.join(', ')}`);
            }

            // Format the date properly if it's not already a Date object
            let reportDate = reportData.metadata.reportDate;
            if (typeof reportDate === 'string') {
                reportDate = new Date(reportDate);
            }

            // Create report record with the correct field mappings
            const report = await Report.create({
                patient_id: null, // Will be updated later with first patient
                report_type: reportData.metadata.reportType || 'BLOOD_BANK',
                report_date: reportDate,
                status: 'pending',
                metadata: JSON.stringify({
                    facilityId: reportData.metadata.facilityId,
                    facility: reportData.metadata.facility,
                    location: reportData.metadata.location,
                    originalFilename,
                    fileChecksum: this.calculateChecksum(fileContent)
                })
            }, { transaction });

            // Store patient records using correct field mappings from DB model
            const patientRecords = await Promise.all(
                reportData.patients.map(async (patient, index) => {
                    // Format patient DOB properly
                    let dateOfBirth = patient.dateOfBirth;
                    if (typeof dateOfBirth === 'string') {
                        dateOfBirth = new Date(dateOfBirth);
                    }

                    // Create the patient record with appropriate field mappings
                    return Patient.create({
                        first_name: patient.firstName,
                        last_name: patient.lastName,
                        date_of_birth: dateOfBirth,
                        medical_record_number: patient.medicalRecordNumber,
                        gender: 'Unknown', // Not in parse results, but needed
                        metadata: JSON.stringify({
                            bloodType: patient.bloodType || 'Unknown',
                            phenotype: patient.phenotype || 'Unknown',
                            transfusionRequirements: patient.transfusionRequirements || [],
                            antibodies: patient.antibodies || [],
                            antigens: patient.antigens || [],
                            comments: patient.comments || []
                        })
                    }, { transaction });
                })
            );

            // Set the first patient as the primary patient for the report if available
            if (patientRecords.length > 0) {
                await report.update({
                    patient_id: patientRecords[0].id,
                    status: 'completed'
                }, { transaction });
            }

            await transaction.commit();

            logger.info(`Successfully stored report ${report.id} with ${patientRecords.length} patient records`);

            return {
                reportId: report.id,
                patientCount: patientRecords.length,
                status: 'success'
            };

        } catch (error) {
            await transaction.rollback();
            logger.error('Error storing report:', error);

            // Re-throw specific errors or a generic one
            if (error instanceof ValidationError) {
                throw error;
            }
            // Check for Sequelize constraint errors specifically if needed
            if (error.name === 'SequelizeUniqueConstraintError') {
                throw new ValidationError('Database constraint violation', error.errors?.map(e => e.message));
            }
            throw new Error('Failed to store report data');
        }
    }

    static async getReportById(reportId) {
        try {
            const report = await Report.findByPk(reportId, {
                include: [{
                    model: Patient,
                    as: 'patient'
                }]
            });

            if (!report) {
                throw new Error('Report not found');
            }

            return report;
        } catch (error) {
            logger.error('Error retrieving report:', error);
            throw error;
        }
    }

    static async getReportsByFacility(facilityId, page = 1, limit = 10) {
        try {
            const sequelize = getSequelize();
            const offset = (page - 1) * limit;

            // Since facility is now in metadata, we need to use a more complex query
            const reports = await Report.findAndCountAll({
                where: {
                    metadata: {
                        [Op.like]: `%"facilityId":"${facilityId}"%`
                    }
                },
                include: [{
                    model: Patient,
                    as: 'patient'
                }],
                limit,
                offset,
                order: [['report_date', 'DESC']]
            });

            return {
                reports: reports.rows,
                total: reports.count,
                page,
                totalPages: Math.ceil(reports.count / limit)
            };
        } catch (error) {
            logger.error('Error retrieving reports by facility:', error);
            throw error;
        }
    }

    static async searchPatients(searchParams, page = 1, limit = 10) {
        try {
            const sequelize = getSequelize();
            const offset = (page - 1) * limit;
            const where = {};

            if (searchParams.lastName) {
                where.lastName = { [Op.like]: `%${searchParams.lastName}%` };
            }
            if (searchParams.firstName) {
                where.firstName = { [Op.like]: `%${searchParams.firstName}%` };
            }
            if (searchParams.medicalRecordNumber) {
                where.medicalRecordNumber = searchParams.medicalRecordNumber;
            }
            if (searchParams.bloodType) {
                where.metadata = { [Op.like]: `%"bloodType":"${searchParams.bloodType}"%` };
            }

            const patients = await Patient.findAndCountAll({
                where,
                include: [{
                    model: Report,
                    as: 'report'
                }],
                limit,
                offset,
                order: [['created_at', 'DESC']]
            });

            return {
                patients: patients.rows,
                total: patients.count,
                page,
                totalPages: Math.ceil(patients.count / limit)
            };
        } catch (error) {
            logger.error('Error searching patients:', error);
            throw error;
        }
    }
}

export default ReportStorageService; 