const { sequelize, initializeDatabase, closeDatabase } = require('../../database/db');
const { Report, PatientRecord } = require('../../database/models'); // Import models directly
const ReportStorageService = require('../services/reportStorageService');
const errors = require('../../errors');

// Use a test-specific database (e.g., SQLite in-memory)
// This should ideally be configured globally, but we ensure it here for this file
// Make sure your test environment is configured to use SQLite in memory if needed

describe('ReportStorageService', () => {
    // Initialize DB before tests and sync models
    beforeAll(async () => {
        try {
            await initializeDatabase({ sync: true }); // Ensure models are synced
        } catch (error) {
            console.error("Error initializing database for reportStorage tests:", error);
            throw error; // Re-throw to fail the suite if DB init fails
        }
    });

    // Clean up tables before each test
    beforeEach(async () => {
        try {
            await PatientRecord.destroy({ where: {}, truncate: true, cascade: true }); // Use truncate for efficiency
            await Report.destroy({ where: {}, truncate: true, cascade: true });
        } catch (error) {
            console.error("Error cleaning tables in reportStorage tests:", error);
            throw error;
        }
    });

    // Close DB connection after all tests
    afterAll(async () => {
        try {
            await closeDatabase();
        } catch (error) {
            console.error("Error closing database for reportStorage tests:", error);
            throw error;
        }
    });

    describe('storeReport', () => {
        it('should store a report and its patient records successfully', async () => {
            const reportData = { /* ... valid report data ... */
                 metadata: {
                    facility: 'Test Facility',
                    facilityId: 'TF001',
                    reportDate: new Date('2023-10-26'),
                    location: 'Test Location'
                },
                patients: [
                    {
                        lastName: 'Doe',
                        firstName: 'John',
                        medicalRecordNumber: 'MRN001',
                        dateOfBirth: new Date('1980-01-01'),
                        bloodType: 'O+',
                        // ... other required fields
                    },
                     {
                        lastName: 'Smith',
                        firstName: 'Jane',
                        medicalRecordNumber: 'MRN002',
                        dateOfBirth: new Date('1990-05-15'),
                        bloodType: 'A-',
                        // ... other required fields
                    }
                ]
            };
            const fileContent = 'Sample file content';
            const originalFilename = 'test_report.txt';

            const result = await ReportStorageService.storeReport(reportData, fileContent, originalFilename);

            expect(result).toHaveProperty('reportId');
            expect(result).toHaveProperty('patientCount', 2);
            expect(result).toHaveProperty('status', 'success');

            // Verify data in DB
            const report = await Report.findByPk(result.reportId);
            expect(report).not.toBeNull();
            expect(report.facility).toBe('Test Facility');
            const patients = await PatientRecord.findAll({ where: { reportId: result.reportId } });
            expect(patients).toHaveLength(2);
            expect(patients[0].medicalRecordNumber).toBe('MRN001');
        });

        it('should rollback transaction on duplicate MRN within the same report', async () => {
             const reportData = { /* ... report data with duplicate MRN ... */
                metadata: {
                    facility: 'Test Facility Dup',
                    facilityId: 'TF002',
                    reportDate: new Date('2023-10-27'),
                    location: 'Test Location Dup'
                },
                patients: [
                    {
                        lastName: 'Doe',
                        firstName: 'John',
                        medicalRecordNumber: 'MRN003', // Duplicate
                        dateOfBirth: new Date('1980-01-01'),
                        bloodType: 'O+'
                    },
                     {
                        lastName: 'Smith',
                        firstName: 'Jane',
                        medicalRecordNumber: 'MRN003', // Duplicate
                        dateOfBirth: new Date('1990-05-15'),
                        bloodType: 'A-'
                    }
                ]
            };
            const fileContent = 'Duplicate MRN content';
            const originalFilename = 'duplicate_report.txt';

            // Use await expect(...).rejects to test for thrown errors
            await expect(ReportStorageService.storeReport(reportData, fileContent, originalFilename))
                .rejects.toThrow(errors.ValidationError);
             await expect(ReportStorageService.storeReport(reportData, fileContent, originalFilename))
                .rejects.toThrow('Duplicate medical record numbers found: MRN003');

            // Verify no report or patients were created
             const reportCount = await Report.count({ where: { facilityId: 'TF002' } });
             expect(reportCount).toBe(0);
             const patientCount = await PatientRecord.count({ where: { medicalRecordNumber: 'MRN003' } });
             expect(patientCount).toBe(0);
        });

        it('should handle invalid report data (e.g., missing required fields)', async () => {
            const invalidReportData = { /* ... invalid data ... */
                 metadata: {
                    // Missing facilityId
                    facility: 'Invalid Facility',
                    reportDate: new Date('2023-10-28'),
                    location: 'Invalid Location'
                },
                patients: [
                    {
                        lastName: 'Test',
                        // Missing firstName, medicalRecordNumber, etc.
                        bloodType: 'AB+'
                    }
                ]
            };
             const fileContent = 'Invalid content';
             const originalFilename = 'invalid_report.txt';

             // Expect a generic error or a specific one depending on implementation
             // Note: Validation might happen *before* storeReport is called in a real scenario
             // This test checks if storeReport handles it if validation somehow bypassed
            await expect(ReportStorageService.storeReport(invalidReportData, fileContent, originalFilename))
                .rejects.toThrow(); // Adjust if a more specific error is expected
        });

        // Add test for constraint violation if a unique constraint exists on MRN
        // This requires setting up data beforehand
        it('should rollback transaction on database constraint violation (if applicable)', async () => {
            // 1. Create a patient record first
             await ReportStorageService.storeReport({
                metadata: { facilityId: 'PREV01', facility: 'Prev Fac', reportDate: new Date(), location: 'Prev Loc' },
                patients: [{ lastName: 'Unique', firstName: 'Patient', medicalRecordNumber: 'MRN_UNIQUE', dateOfBirth: new Date(), bloodType: 'B+' }]
            }, 'content1', 'prev.txt');

            // 2. Try to store another report with the SAME MRN
             const conflictingReportData = {
                 metadata: { facilityId: 'CONF01', facility: 'Conflict Fac', reportDate: new Date(), location: 'Conflict Loc' },
                 patients: [{ lastName: 'Another', firstName: 'Patient', medicalRecordNumber: 'MRN_UNIQUE', dateOfBirth: new Date(), bloodType: 'O-' }]
             };

             // Check if SequelizeUniqueConstraintError is thrown
            await expect(ReportStorageService.storeReport(conflictingReportData, 'content2', 'conflict.txt'))
                .rejects.toThrow(errors.ValidationError); // We now re-throw as ValidationError

             // Verify the conflicting report was not created
             const conflictReport = await Report.findOne({ where: { facilityId: 'CONF01' } });
             expect(conflictReport).toBeNull();
        });
    });

    describe('getReportById', () => {
        it('should retrieve a stored report by ID', async () => {
             const reportData = { metadata: { facilityId: 'GET01', facility: 'Get Fac', reportDate: new Date(), location: 'Get Loc' }, patients: [{ lastName: 'Get', firstName: 'Me', medicalRecordNumber: 'MRNGET01', dateOfBirth: new Date(), bloodType: 'A+' }] };
             const stored = await ReportStorageService.storeReport(reportData, 'get_content', 'get.txt');

            const retrievedReport = await ReportStorageService.getReportById(stored.reportId);
            expect(retrievedReport).not.toBeNull();
            expect(retrievedReport.id).toBe(stored.reportId);
            expect(retrievedReport.facilityId).toBe('GET01');
            expect(retrievedReport.PatientRecords).toBeDefined(); // Check if association is loaded
            // Add more specific checks if needed
        });

        it('should return null for non-existent report ID', async () => {
            const retrievedReport = await ReportStorageService.getReportById(99999); // Assume 99999 doesn't exist
            expect(retrievedReport).toBeNull();
        });
    });

    describe('getReportsByFacility', () => {
        beforeEach(async () => {
            // Seed data for pagination tests
            await ReportStorageService.storeReport({ metadata: { facilityId: 'FAC01', facility: 'Fac 1', reportDate: new Date(), location: 'Loc 1' }, patients: [{ lastName: 'P1', firstName: 'A', medicalRecordNumber: 'MRN_FAC01_1', dateOfBirth: new Date(), bloodType: 'O+' }] }, 'f1_1', 'f1_1.txt');
            await ReportStorageService.storeReport({ metadata: { facilityId: 'FAC01', facility: 'Fac 1', reportDate: new Date(), location: 'Loc 2' }, patients: [{ lastName: 'P2', firstName: 'B', medicalRecordNumber: 'MRN_FAC01_2', dateOfBirth: new Date(), bloodType: 'A-' }] }, 'f1_2', 'f1_2.txt');
            await ReportStorageService.storeReport({ metadata: { facilityId: 'FAC02', facility: 'Fac 2', reportDate: new Date(), location: 'Loc 3' }, patients: [{ lastName: 'P3', firstName: 'C', medicalRecordNumber: 'MRN_FAC02_1', dateOfBirth: new Date(), bloodType: 'B+' }] }, 'f2_1', 'f2_1.txt');
        });

        it('should retrieve reports for a specific facility with pagination', async () => {
            const page1 = await ReportStorageService.getReportsByFacility('FAC01', { page: 1, limit: 1 });
            expect(page1.reports).toHaveLength(1);
            expect(page1.totalCount).toBe(2);
            expect(page1.totalPages).toBe(2);
            expect(page1.currentPage).toBe(1);

            const page2 = await ReportStorageService.getReportsByFacility('FAC01', { page: 2, limit: 1 });
            expect(page2.reports).toHaveLength(1);
            expect(page2.totalCount).toBe(2);

            const allFac1 = await ReportStorageService.getReportsByFacility('FAC01', {}); // No pagination
            expect(allFac1.reports).toHaveLength(2);
            expect(allFac1.totalCount).toBe(2);
        });
    });

    describe('searchPatients', () => {
         beforeEach(async () => {
            // Seed data for search tests
             await ReportStorageService.storeReport({ metadata: { facilityId: 'SRCH01', facility: 'Search Fac 1', reportDate: new Date(), location: 'Loc S1' }, patients: [{ lastName: 'Searchable', firstName: 'One', medicalRecordNumber: 'MRN_SRCH_1', dateOfBirth: new Date('1995-03-10'), bloodType: 'AB+' }] }, 's1', 's1.txt');
             await ReportStorageService.storeReport({ metadata: { facilityId: 'SRCH02', facility: 'Search Fac 2', reportDate: new Date(), location: 'Loc S2' }, patients: [{ lastName: 'Another', firstName: 'Patient', medicalRecordNumber: 'MRN_SRCH_2', dateOfBirth: new Date('1988-11-20'), bloodType: 'O-' }] }, 's2', 's2.txt');
        });

        it('should search for patients with matching criteria', async () => {
            const results = await ReportStorageService.searchPatients({ lastName: 'Searchable' }, { page: 1, limit: 10 });
            expect(results.patients).toHaveLength(1);
            expect(results.patients[0].firstName).toBe('One');
            expect(results.totalCount).toBe(1);

            const resultsByMrn = await ReportStorageService.searchPatients({ medicalRecordNumber: 'MRN_SRCH_2' }, {});
            expect(resultsByMrn.patients).toHaveLength(1);
            expect(resultsByMrn.patients[0].lastName).toBe('Another');
        });

        it('should return empty results for non-matching criteria', async () => {
            const results = await ReportStorageService.searchPatients({ firstName: 'NonExistent' }, {});
            expect(results.patients).toHaveLength(0);
            expect(results.totalCount).toBe(0);
        });
    });
}); 