import { initSQLite } from './src/database/init.js';

// Set up unhandled rejection handler
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

async function testDatabase() {
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
    
    console.log('Step 6: Raw patient data:');
    console.log(JSON.stringify(patient, null, 2));
    
    console.log('Test completed successfully');
    
  } catch (error) {
    console.error('Error in test:', error.message);
    console.error(error.stack); 
    process.exit(1);
  } 
}

console.log('Starting database test...');
testDatabase(); 