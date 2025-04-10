import { initSQLite } from './src/database/init.js';
import { v4 as uuidv4 } from 'uuid';

async function insertTestData() {
  try {
    // Initialize the SQLite database
    const db = await initSQLite();
    console.log('Connected to database');

    // Check if there are already patients in the database
    const existingPatients = await db.get('SELECT COUNT(*) as count FROM patients');
    if (existingPatients.count > 0) {
      console.log(`Database already has ${existingPatients.count} patients. Skipping test data insertion.`);
      return;
    }

    // Insert a test patient
    const patientId = uuidv4();
    await db.run(`
      INSERT INTO patients (
        id, first_name, last_name, date_of_birth, gender, 
        contact_number, email, address, emergency_contact, 
        blood_type, allergies, medical_conditions, medications, notes
      ) VALUES (
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?
      )
    `, [
      patientId,
      'John',
      'Doe',
      '1985-05-15',
      'M',
      '555-123-4567',
      'john.doe@example.com',
      '123 Main Street, Anytown, USA',
      'Jane Doe: 555-987-6543',
      'A+',
      JSON.stringify(['Penicillin', 'Peanuts']),
      JSON.stringify(['Hypertension', 'Asthma']),
      JSON.stringify(['Lisinopril', 'Albuterol']),
      JSON.stringify([{
        id: uuidv4(),
        title: 'Initial consultation',
        content: 'Patient reported mild symptoms of asthma and high blood pressure.',
        category: 'OBSERVATION',
        createdAt: new Date().toISOString(),
        createdBy: 'system'
      }])
    ]);

    // Insert a test report for the patient
    const reportId = uuidv4();
    await db.run(`
      INSERT INTO reports (
        id, patient_id, title, content
      ) VALUES (?, ?, ?, ?)
    `, [
      reportId,
      patientId,
      'Annual Check-up',
      'Patient is in good health overall. Blood pressure is well-controlled with current medication.'
    ]);

    // Insert a caution card
    const cautionId = uuidv4();
    await db.run(`
      INSERT INTO caution_cards (
        id, patient_id, title, description, severity
      ) VALUES (?, ?, ?, ?, ?)
    `, [
      cautionId,
      patientId,
      'Severe Penicillin Allergy',
      'Patient has a history of anaphylactic reaction to penicillin.',
      'HIGH'
    ]);

    console.log('Test data inserted successfully');
    console.log(`Added patient with ID: ${patientId}`);
    console.log(`Added report with ID: ${reportId}`);
    console.log(`Added caution card with ID: ${cautionId}`);

  } catch (error) {
    console.error('Error inserting test data:', error);
  }
}

insertTestData(); 