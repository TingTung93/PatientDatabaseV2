import crypto from 'crypto';
import { Report, Patient } from '../database/models.js';
import { getSequelize } from '../database/db.js';
import logger from '../utils/logger.js';
import { ValidationError } from '../errors/index.js';

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
                    as: 'patientRecords'
                }],
                limit,
                offset,
                order: [['createdAt', 'DESC']]
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

            // Create report record
            const report = await Report.create({
                facilityId: reportData.metadata.facilityId,
                facility: reportData.metadata.facility,
                reportDate: reportData.metadata.reportDate,
                location: reportData.metadata.location,
                uploadedBy: userId,
                originalFilename,
                fileChecksum: this.calculateChecksum(fileContent),
                processingStatus: 'processing'
            }, { transaction });

            // Store patient records
            const patientRecords = await Promise.all(
                reportData.patients.map(async (patient) => {
                    return Patient.create({
                        reportId: report.id,
                        lastName: patient.lastName,
                        firstName: patient.firstName,
                        medicalRecordNumber: patient.medicalRecordNumber,
                        dateOfBirth: patient.dateOfBirth,
                        bloodType: patient.bloodType,
                        phenotype: patient.phenotype,
                        transfusionRequirements: patient.transfusionRequirements,
                        antibodies: patient.antibodies,
                        antigens: patient.antigens,
                        comments: patient.comments,
                        processingStatus: 'processed'
                    }, { transaction });
                })
            );

            // Update report status
            await report.update({
                processingStatus: 'completed'
            }, { transaction });

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
                    as: 'patientRecords'
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

            const reports = await Report.findAndCountAll({
                where: { facilityId },
                include: [{
                    model: Patient,
                    as: 'patientRecords'
                }],
                limit,
                offset,
                order: [['reportDate', 'DESC']]
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
                where.bloodType = searchParams.bloodType;
            }

            const patients = await Patient.findAndCountAll({
                where,
                include: [{
                    model: Report,
                    as: 'report'
                }],
                limit,
                offset,
                order: [['createdAt', 'DESC']]
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