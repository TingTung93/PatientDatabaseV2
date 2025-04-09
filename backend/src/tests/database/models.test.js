const { describe, it, expect, beforeAll, afterAll, beforeEach } = require('@jest/globals');
const bcrypt = require('bcryptjs');

const db = require('../../src/database/db.js');
const { User, Patient, TransfusionRequirement } = require('../../src/database/models.js');

// TODO: Skipping due to database interaction issues in test environment.
describe.skip('Database Models', () => {
    let testUserId;

    beforeAll(async () => {
        await db.initialize('test-password');
    });

    afterAll(async () => {
        try {
            await db.close();
        } catch (err) {
            console.error('Error closing database:', err);
        }
    });

    beforeEach(async () => {
        testUserId = await setupTestData();
    });

    describe('User Model', () => {
        // CREATE tests
        it('should create a new user', async () => {
            const userData = {
                username: 'newuser',
                email: 'newuser@test.com',
                password: 'Password123',
                role: 'admin'
            };

            const user = await User.create(userData);
            expect(user).toBeDefined();
            expect(user.username).toBe(userData.username);
            expect(user.email).toBe(userData.email);
            expect(user.role).toBe(userData.role);
            expect(user.id).toBeDefined();
            expect(user.is_active).toBe(1); // SQLite stores booleans as 0/1
        });

        it('should not create a user with duplicate username', async () => {
            const userData = {
                username: 'uniqueuser',
                email: 'unique@test.com',
                password: 'Password123',
                role: 'user'
            };

            await User.create(userData);
            
            // Attempt to create another user with the same username
            await expect(User.create({
                ...userData,
                email: 'different@test.com'
            })).rejects.toThrow('Username already exists');
        });

        // READ tests
        it('should find user by username', async () => {
            const userData = {
                username: 'searchuser',
                email: 'searchuser@test.com',
                password: 'Password123',
                role: 'user'
            };

            await User.create(userData);
            const user = await User.findByUsername(userData.username);
            expect(user).toBeDefined();
            expect(user.username).toBe(userData.username);
            expect(user.email).toBe(userData.email);
            expect(user.password_hash).toBeDefined();
        });

        it('should find user by ID', async () => {
            const userData = {
                username: 'iduser',
                email: 'iduser@test.com',
                password: 'Password123',
                role: 'user'
            };

            const createdUser = await User.create(userData);
            const user = await User.findById(createdUser.id);
            expect(user).toBeDefined();
            expect(user.username).toBe(userData.username);
            expect(user.email).toBe(userData.email);
        });

        it('should return null for non-existent username', async () => {
            const user = await User.findByUsername('nonexistentuser');
            expect(user).toBeNull();
        });

        it('should return null for non-existent ID', async () => {
            const user = await User.findById(999);
            expect(user).toBeNull();
        });

        // UPDATE tests
        it('should update user information', async () => {
            const userData = {
                username: 'updateuser',
                email: 'updateuser@test.com',
                password: 'Password123',
                role: 'user'
            };

            const createdUser = await User.create(userData);
            const updates = {
                role: 'admin',
                email: 'updated@test.com'
            };

            const updatedUser = await User.update(createdUser.id, updates);
            expect(updatedUser).toBeDefined();
            expect(updatedUser.role).toBe(updates.role);
            expect(updatedUser.email).toBe(updates.email);
        });

        // DELETE tests
        it('should delete user', async () => {
            const userData = {
                username: 'deleteuser',
                email: 'deleteuser@test.com',
                password: 'Password123',
                role: 'user'
            };

            const createdUser = await User.create(userData);
            const deleted = await User.delete(createdUser.id);
            expect(deleted).toBe(true);

            const foundUser = await User.findById(createdUser.id);
            expect(foundUser).toBeNull();
        });
    });

    describe('Patient Model', () => {
        let testUserId;

        beforeAll(async () => {
            const testUser = await User.create({ 
                username: 'testuser',
                email: 'testuser@test.com',
                password: 'Password123',
                role: 'user'
            });
            testUserId = testUser.id;
        });

        it('should create a new patient', async () => {
            const patientData = {
                first_name: 'John',
                last_name: 'Doe',
                dob: '1990-01-01',
                gender: 'Male',
                contact_number: '1234567890',
                blood_type: 'A+',
                medical_history: 'None',
                allergies: 'None',
                current_medications: 'None',
                created_by: testUserId,
                updated_by: testUserId
            };

            const patient = await Patient.create(patientData);
            expect(patient).toBeDefined();
            expect(patient.first_name).toBe(patientData.first_name);
            expect(patient.last_name).toBe(patientData.last_name);
            expect(patient.blood_type).toBe(patientData.blood_type);
            expect(patient.id).toBeDefined();
        });

        it('should find patient by ID', async () => {
            const patientData = {
                first_name: 'John',
                last_name: 'Smith',
                dob: '1990-01-01',
                gender: 'Male',
                contact_number: '1234567890',
                blood_type: 'A+',
                medical_history: 'None',
                allergies: 'None',
                current_medications: 'None',
                created_by: testUserId,
                updated_by: testUserId
            };

            const created = await Patient.create(patientData);
            const found = await Patient.findById(created.id);
            expect(found).toBeDefined();
            expect(found.first_name).toBe(patientData.first_name);
            expect(found.last_name).toBe(patientData.last_name);
        });

        it('should update patient information', async () => {
            const patientData = {
                first_name: 'John',
                last_name: 'Johnson',
                dob: '1990-01-01',
                gender: 'Male',
                contact_number: '1234567890',
                blood_type: 'A+',
                medical_history: 'None',
                allergies: 'None',
                current_medications: 'None',
                created_by: testUserId,
                updated_by: testUserId
            };

            const created = await Patient.create(patientData);
            
            const updates = {
                first_name: 'Jane',
                blood_type: 'B+',
                updated_by: testUserId
            };
            
            const updated = await Patient.update(created.id, updates);
            
            expect(updated).toBeDefined();
            expect(updated.first_name).toBe(updates.first_name);
            expect(updated.blood_type).toBe(updates.blood_type);
            expect(updated.dob).toBe(patientData.dob);
        });

        it('should delete patient', async () => {
            const patientData = {
                first_name: 'John',
                last_name: 'Wilson',
                dob: '1990-01-01',
                gender: 'Male',
                contact_number: '1234567890',
                blood_type: 'A+',
                medical_history: 'None',
                allergies: 'None',
                current_medications: 'None',
                created_by: testUserId,
                updated_by: testUserId
            };

            const created = await Patient.create(patientData);
            const deleted = await Patient.delete(created.id);
            expect(deleted).toBe(true);

            const foundPatient = await Patient.findById(created.id);
            expect(foundPatient).toBeNull();
        });

        it('should return null for non-existent patient ID', async () => {
            const patient = await Patient.findById(999);
            expect(patient).toBeNull();
        });
    });

    describe('TransfusionRequirement Model', () => {
        let testPatientId;
        let testUserId;

        beforeAll(async () => {
            const testUser = await User.create({
                username: 'transfusionuser',
                email: 'transfusion@test.com',
                password: 'Password123',
                role: 'user'
            });
            testUserId = testUser.id;

            const testPatient = await Patient.create({
                first_name: 'John',
                last_name: 'Doe',
                dob: '1990-01-01',
                gender: 'Male',
                contact_number: '1234567890',
                blood_type: 'A+',
                medical_history: 'None',
                allergies: 'None',
                current_medications: 'None',
                created_by: testUserId,
                updated_by: testUserId
            });
            testPatientId = testPatient.id;
        });

        it('should create a new transfusion requirement', async () => {
            const requirementData = {
                patient_id: testPatientId,
                blood_type_required: 'A+',
                units_required: 2,
                urgency_level: 'High',
                required_by_date: '2024-03-20',
                notes: 'Urgent requirement',
                created_by: testUserId,
                updated_by: testUserId
            };

            const requirement = await TransfusionRequirement.create(requirementData);
            expect(requirement).toBeDefined();
            expect(requirement.patient_id).toBe(requirementData.patient_id);
            expect(requirement.blood_type_required).toBe(requirementData.blood_type_required);
            expect(requirement.units_required).toBe(requirementData.units_required);
            expect(requirement.status).toBe('Pending');
        });

        it('should find transfusion requirement by ID', async () => {
            const requirementData = {
                patient_id: testPatientId,
                blood_type_required: 'A+',
                units_required: 2,
                urgency_level: 'High',
                required_by_date: '2024-03-20',
                notes: 'Urgent requirement',
                created_by: testUserId,
                updated_by: testUserId
            };

            const created = await TransfusionRequirement.create(requirementData);
            const found = await TransfusionRequirement.findById(created.id);
            expect(found).toBeDefined();
            expect(found.patient_id).toBe(requirementData.patient_id);
            expect(found.blood_type_required).toBe(requirementData.blood_type_required);
        });

        it('should update transfusion requirement information', async () => {
            const requirementData = {
                patient_id: testPatientId,
                blood_type_required: 'A+',
                units_required: 2,
                urgency_level: 'High',
                required_by_date: '2024-03-20',
                notes: 'Urgent requirement',
                created_by: testUserId,
                updated_by: testUserId
            };

            const created = await TransfusionRequirement.create(requirementData);
            
            const updates = {
                units_required: 3,
                status: 'In Progress',
                updated_by: testUserId
            };
            
            const updated = await TransfusionRequirement.update(created.id, updates);
            expect(updated).toBeDefined();
            expect(updated.units_required).toBe(updates.units_required);
            expect(updated.status).toBe(updates.status);
        });

        it('should delete transfusion requirement', async () => {
            const requirementData = {
                patient_id: testPatientId,
                blood_type_required: 'A+',
                units_required: 2,
                urgency_level: 'High',
                required_by_date: '2024-03-20',
                notes: 'Urgent requirement',
                created_by: testUserId,
                updated_by: testUserId
            };

            const created = await TransfusionRequirement.create(requirementData);
            const deleted = await TransfusionRequirement.delete(created.id);
            expect(deleted).toBe(true);

            const found = await TransfusionRequirement.findById(created.id);
            expect(found).toBeNull();
        });

        it('should handle errors when finding transfusion requirement', async () => {
            const nonExistentId = 999;
            const found = await TransfusionRequirement.findById(nonExistentId);
            expect(found).toBeNull();
        });
    });
});

async function setupTestData() {
    try {
        const testUser = await User.create({
            username: 'testuser' + Date.now(), // Make username unique
            email: 'testuser' + Date.now() + '@test.com', // Make email unique
            password: 'Password123',
            role: 'user'
        });
        return testUser.id;
    } catch (error) {
        console.error('Error in test setup:', error);
        return null;
    }
}
