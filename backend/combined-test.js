import { initSQLite } from './src/database/init.js';
import { adaptPatientForFrontend } from './src/utils/data-adapters.js';

async function testCombined() {
  let dbInstance = null;
  
  try {
    console.log('Step 1: Starting database initialization...');
    
    // Initialize the SQLite database
    dbInstance = await initSQLite();
    console.log('Step 2: Connected to database');

    // Check if there are patients in the database
    console.log('Step 3: Checking for patients...');
    const countResult = await dbInstance.get('SELECT COUNT(*) as count FROM patients');
    console.log(`Step 4: Found ${countResult.count} patients in the database`);
    
    if (countResult.count === 0) {
      console.log('No patients found in the database. Please run insert-test-data.js first.');
      return;
    }
    
    // Query a patient
    console.log('Step 5: Querying first patient...');
    const patient = await dbInstance.get('SELECT * FROM patients LIMIT 1');
    
    if (!patient) {
      console.log('No patients found in the database. Please add some test data first.');
      return;
    }
    
    console.log('Step 6: Retrieved patient data:');
    console.log(JSON.stringify(patient, null, 2));

    console.log('Step 7: Adapting patient data...');
    const adaptedPatient = adaptPatientForFrontend(patient);
    console.log('Step 8: Adapted patient data:');
    console.log(JSON.stringify(adaptedPatient, null, 2));
    
    // Check for expected structure
    console.log('\nStep 9: Checking adapted structure...');
    
    const requiredNested = ['identification', 'demographics', 'bloodProfile', 'medicalHistory'];
    for (const field of requiredNested) {
      if (!adaptedPatient[field]) {
        console.error(`Missing required field: ${field}`);
      } else {
        console.log(`✓ Found ${field}`);
        // Log the first level of properties
        const properties = Object.keys(adaptedPatient[field]);
        console.log(`  Properties: ${properties.join(', ')}`);
      }
    }
    
    // Check bloodProfile specific fields
    if (adaptedPatient.bloodProfile) {
      console.log(`\nBlood Type: ${adaptedPatient.bloodProfile.abo}${adaptedPatient.bloodProfile.rh}`);
    }
    
    console.log('\nTest completed successfully');
    
  } catch (error) {
    console.error('Error in test:', error.message);
    console.error(error.stack); 
  } 
}

console.log('Starting combined test...');
testCombined(); 