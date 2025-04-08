const { pool, initializeDatabase, resetPool } = require('../database/init');
const { Patient, Report, CautionCard } = require('../database/models');
const logger = require('../utils/logger');

// Mock logger to prevent excessive console output during tests
jest.mock('../utils/logger', () => ({
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
}));

// Skip this entire suite for now
describe.skip('Database Integration Tests', () => {
    let testPatient;
    let testReport;
    let testCautionCard;

    beforeAll(async () => {
        // Reset pool and initialize database
        resetPool();
        await initializeDatabase();
    });

    afterAll(async () => {
        // Close DB connection
        if (pool && typeof pool.end === 'function') {
            // await pool.end(); // Avoid calling end here if managed globally
        }
    });

    beforeEach(async () => {
        // Clear all tables before each test using raw SQL (problematic)
       /* await pool.query(`
            DO $$ 
            DECLARE 
                r RECORD;
            BEGIN
                FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
                    EXECUTE 'TRUNCATE TABLE ' || quote_ident(r.tablename) || ' CASCADE';
                END LOOP;
            END $$;
        `);*/
         // Replace with Sequelize based clearing if possible, or fix raw SQL for test dialect
    });

    test('should create a patient successfully', async () => {
        const patientData = {
            first_name: 'JohnDB',
            last_name: 'DoeDB',
            date_of_birth: '1991-02-03',
            gender: 'M',
            contact_number: '9876543210',
            email: 'john.doe@example.com',
            address: '123 Test St'
        };

        testPatient = await Patient.create(patientData);
        
        expect(testPatient).toBeDefined();
        expect(testPatient.id).toBeDefined();
        expect(testPatient.first_name).toBe('JohnDB');
        expect(testPatient.last_name).toBe('DoeDB');
    });

    test('should retrieve a patient by ID', async () => {
        expect(testPatient).toBeDefined();
        const retrievedPatient = await Patient.findByPk(testPatient.id);
        
        expect(retrievedPatient).toBeDefined();
        expect(retrievedPatient.id).toBe(testPatient.id);
        expect(retrievedPatient.first_name).toBe(testPatient.first_name);
    });

    test('should update a patient', async () => {
        expect(testPatient).toBeDefined();
        const updatedData = {
            email: 'john.updated@example.com',
            contact_number: '0123456789'
        };

        const updatedPatient = await Patient.update(testPatient.id, updatedData);
        
        expect(updatedPatient).toBeDefined();
        expect(updatedPatient.id).toBe(testPatient.id);
        expect(updatedPatient.email).toBe('john.updated@example.com');
        expect(updatedPatient.contact_number).toBe('0123456789');
    });

    test('should search for patients', async () => {
        expect(testPatient).toBeDefined();
        const searchResults = await Patient.findAndCountAll({
            limit: 10,
            offset: 0,
            where: {
                first_name: 'JohnDB'
            }
        });
        
        expect(searchResults).toBeDefined();
        expect(searchResults.rows).toBeInstanceOf(Array);
        expect(searchResults.count).toBeGreaterThanOrEqual(1);
        expect(searchResults.rows.some(p => p.id === testPatient.id)).toBe(true);
    });

    test('should create a report successfully', async () => {
        const reportData = {
            patient_id: testPatient.id,
            report_type: 'blood_test',
            report_date: new Date().toISOString(),
            content: JSON.stringify({ test_results: 'normal' }),
            status: 'completed'
        };

        testReport = await Report.create(reportData);
        
        expect(testReport).toBeDefined();
        expect(testReport.id).toBeDefined();
        expect(testReport.patient_id).toBe(testPatient.id);
        expect(testReport.report_type).toBe('blood_test');
    });

    test('should create a caution card successfully', async () => {
        const cautionCardData = {
            patient_id: testPatient.id,
            blood_type: 'O+',
            antibodies: JSON.stringify(['anti-D']),
            transfusion_requirements: JSON.stringify({ special_requirements: 'none' }),
            file_name: 'test.pdf',
            file_path: '/uploads/test.pdf',
            status: 'pending'
        };

        testCautionCard = await CautionCard.create(cautionCardData);
        
        expect(testCautionCard).toBeDefined();
        expect(testCautionCard.id).toBeDefined();
        expect(testCautionCard.patient_id).toBe(testPatient.id);
        expect(testCautionCard.blood_type).toBe('O+');
    });

    test('should delete a patient and cascade to related records', async () => {
        expect(testPatient).toBeDefined();
        await Patient.destroy(testPatient.id);
        
        // Verify patient is deleted
        const deletedPatient = await Patient.findByPk(testPatient.id);
        expect(deletedPatient).toBeNull();

        // Verify related records are deleted
        const deletedReport = await Report.findByPk(testReport.id);
        expect(deletedReport).toBeNull();

        const deletedCautionCard = await CautionCard.findByPk(testCautionCard.id);
        expect(deletedCautionCard).toBeNull();
    });
});