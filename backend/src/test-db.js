import { db, initSQLite } from './database/init.js';

// Test SQLite connection
async function testConnection() {
  try {
    console.log('Initializing SQLite database...');
    const dbInstance = await initSQLite();
    console.log('Database initialized successfully!');
    
    // Test a simple query
    try {
      console.log('\n1. Testing simple query...');
      const result = await dbInstance.get('SELECT sqlite_version() as version');
      console.log('SQLite version:', result.version);
      
      // Try to fetch a patient
      try {
        console.log('\n2. Attempting to query patients table...');
        const patients = await dbInstance.all('SELECT * FROM patients LIMIT 5');
        console.log('Patients found:', patients.length);
        
        // If no patients, create a test one
        if (patients.length === 0) {
          console.log('\n3. No patients found. Creating a test patient...');
          
          try {
            // Let's add a test patient to test write operations
            const insertResult = await dbInstance.run(
              `INSERT INTO patients (id, first_name, last_name, date_of_birth, gender, created_at, updated_at) 
               VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
              ['test123', 'Test', 'Patient', '2000-01-01', 'Male']
            );
            console.log('Insert result:', insertResult);
            
            // Verify the patient was added
            const newPatient = await dbInstance.get('SELECT * FROM patients WHERE id = ?', ['test123']);
            console.log('New patient created:', newPatient);
          } catch (insertError) {
            console.error('Error inserting test patient:', insertError);
          }
        } else {
          console.log('Existing patients:', patients);
        }
        
        // Test the specific query that was failing
        try {
          console.log('\n4. Testing the specific query pattern that was failing:');
          const query = 'SELECT * FROM patients WHERE 1=1';
          const params = [];
          
          console.log('4.1. Getting count...');
          const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as count');
          console.log('Count query:', countQuery);
          console.log('Count params:', params);
          
          const countResult = await dbInstance.get(countQuery, params);
          console.log('Count result:', countResult);
          
          console.log('\n4.2. Getting patients with pagination...');
          const allQuery = query + ' LIMIT ? OFFSET ?';
          console.log('All query:', allQuery);
          
          const allParams = [...params, 10, 0];
          console.log('All params:', allParams);
          
          const allResult = await dbInstance.all(allQuery, allParams);
          console.log('Query result count:', allResult.length);
          if (allResult.length > 0) {
            console.log('First result:', allResult[0]);
          }
          
          console.log('\nAll tests passed successfully!');
        } catch (routeQueryError) {
          console.error('Error testing route-specific query pattern:', routeQueryError);
          console.error('Error details:', routeQueryError.stack);
        }
      } catch (patientError) {
        console.error('Error with patients table operations:', patientError);
        console.error('Error details:', patientError.stack);
      }
    } catch (queryError) {
      console.error('Error executing query:', queryError);
      console.error('Error details:', queryError.stack);
    }
  } catch (initError) {
    console.error('Error initializing database:', initError);
    console.error('Error details:', initError.stack);
  }
}

console.log('Starting database test...');
testConnection()
  .then(() => console.log('Test completed'))
  .catch(err => {
    console.error('Unexpected error:', err);
    console.error('Error details:', err.stack);
  }); 