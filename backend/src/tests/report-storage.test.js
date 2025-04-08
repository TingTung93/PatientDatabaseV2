const { Sequelize, Op } = require('sequelize');
const { Report, PatientRecord, sequelize } = require('../database/models');
const { initializeDatabase, closeDatabase } = require('../../database/db');
const ReportStorageService = require('../services/reportStorageService');
const errors = require('../../errors');

describe('Report Storage Service', () => {
    beforeAll(async () => {
        try {
            // Call initializeDatabase which should set up the sequelize instance
            await initializeDatabase({ sync: true }); 
            // Verify sequelize instance is available after initialization
            if (!sequelize) {
                throw new Error('Sequelize instance not initialized correctly.');
            }
        } catch (error) {
            console.error("Error initializing database for reportStorage tests:", error);
            throw error;
        }
    });

    beforeEach(async () => {
        try {
            // Use the imported sequelize instance's models
            if (!sequelize || !PatientRecord || !Report) {
                 throw new Error('Sequelize or models not available in beforeEach');
            }
            await PatientRecord.destroy({ where: {}, truncate: true, cascade: true });
            await Report.destroy({ where: {}, truncate: true, cascade: true });
        } catch (error) {
            console.error("Error cleaning tables in reportStorage tests:", error);
            throw error;
        }
    });

    afterAll(async () => {
        try {
             // Use the imported closeDatabase function
            await closeDatabase();
        } catch (error) {
            console.error("Error closing database for reportStorage tests:", error);
            throw error;
        }
    });

    it('should successfully store report and patient records', async () => {
        const reportData = {
            metadata: {
                facilityId: '0067-BB',
                facility: '0067A',
                reportDate: new Date(),
                location: 'Main Lab'
            },
            patients: [
                {
                    firstName: 'John',
                    lastName: 'Doe',
                    medicalRecordNumber: '12345',
                    dateOfBirth: new Date('1990-01-01'),
                    bloodType: 'A+',
                    antibodies: ['Anti-D'],
                    transfusionRequirements: 'None'
                }
            ]
        };

        const fileContent = 'Test report content';
        const originalFilename = 'test-report.txt';
        const userId = '123';

        const result = await ReportStorageService.storeReport(reportData, fileContent, originalFilename, userId);

        expect(result).toBeDefined();
        expect(result.reportId).toBeDefined();

        const report = await Report.findByPk(result.reportId);
        expect(report).toBeDefined();
        expect(report.processingStatus).toBe('completed');
        const patients = await PatientRecord.findAll({ where: { reportId: result.reportId } });
        expect(patients).toHaveLength(1);
        expect(patients[0].firstName).toBe('John');
    });

    it('should fail if duplicate medical record numbers are present', async () => {
        const reportData = {
            metadata: {
                facilityId: '0067-BB',
                facility: '0067A',
                reportDate: new Date(),
                location: 'Main Lab'
            },
            patients: [
                {
                    firstName: 'John',
                    lastName: 'Doe',
                    medicalRecordNumber: '12345',
                    dateOfBirth: new Date('1990-01-01'),
                    bloodType: 'A+'
                },
                {
                    firstName: 'Jane',
                    lastName: 'Smith',
                    medicalRecordNumber: '12345',
                    dateOfBirth: new Date('1995-01-01'),
                    bloodType: 'B+'
                }
            ]
        };

        await expect(ReportStorageService.storeReport(
            reportData,
            'Test content',
            'test.txt',
            '123'
        )).rejects.toThrow();
    });

    it('should rollback transaction on error', async () => {
        const reportData = {
            metadata: { facility: 'F001', reportDate: new Date(), reportType: 'TypeA' },
            patients: [
                { lastName: 'Doe', firstName: 'John', medicalRecordNumber: 'MRN001', dateOfBirth: new Date(), bloodType: 'A+', phenotype: 'PhA' },
                // Intentionally cause an error (e.g., invalid data or duplicate MRN if constraint exists)
                { lastName: 'Smith', firstName: 'Jane', medicalRecordNumber: 'MRN001', dateOfBirth: new Date(), bloodType: 'B-', phenotype: 'PhB' }
            ]
        };

        await expect(ReportStorageService.storeReport(reportData)).rejects.toThrow();

        // Verify that no records were created due to rollback
        const reportCount = await Report.count();
        const patientCount = await PatientRecord.count();

        expect(reportCount).toBe(0);
        expect(patientCount).toBe(0);
    });

    it('should retrieve a report by ID with patient records', async () => {
        const createdReport = await ReportStorageService.storeReport(
            {
                metadata: { facilityId: 'F002', facility: 'Fac2', reportDate: new Date() },
                patients: [{ lastName: 'Test', firstName: 'User', medicalRecordNumber: 'MRN999', dateOfBirth: new Date(), bloodType: 'O+' }]
            },
            'Content', 'file.txt', 'tester'
        );

        const result = await ReportStorageService.getReportById(createdReport.reportId);

        expect(result).toBeDefined();
        expect(result.id).toBe(createdReport.reportId);
        expect(result.patientRecords).toHaveLength(1);
        expect(result.patientRecords[0].firstName).toBe('User');
    });

    it('should throw error when retrieving a non-existent report ID', async () => {
        await expect(ReportStorageService.getReportById('non-existent-id')).rejects.toThrow('Report not found');
    });

    it('should search patients by name and medical record number with pagination', async () => {
        const report = await ReportStorageService.storeReport(
            {
                metadata: { facilityId: 'F003', facility: 'Fac3', reportDate: new Date() },
                patients: [
                    { lastName: 'Alpha', firstName: 'One', medicalRecordNumber: 'MRN101', dateOfBirth: new Date(), bloodType: 'A+' },
                    { lastName: 'Bravo', firstName: 'Two', medicalRecordNumber: 'MRN102', dateOfBirth: new Date(), bloodType: 'B-' }
                ]
            },
            'Content 2', 'file2.txt', 'tester2'
        );
        
        const result = await ReportStorageService.searchPatients({ lastName: 'Alpha' }, 1, 10);

        expect(result.patients).toHaveLength(1);
        expect(result.total).toBe(1);
        expect(result.patients[0].lastName).toBe('Alpha');
        
        const resultAll = await ReportStorageService.searchPatients({}, 1, 1);
        expect(resultAll.patients).toHaveLength(1);
        expect(resultAll.total).toBe(2);
        expect(resultAll.totalPages).toBe(2);
    });
}); 