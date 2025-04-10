import { db, initSQLite } from './database/init.js';

// Test patient routes with new column names
async function testColumnNames() {
  try {
    console.log('Initializing SQLite database...');
    const dbInstance = await initSQLite();
    console.log('Database initialized successfully!');
    
    // Test the query that was failing with 'name' column
    try {
      console.log('\nTesting the patients route query with correct column names:');
      
      // Basic route query
      const query = 'SELECT * FROM patients WHERE 1=1';
      const params = [];
      
      // Try with first_name instead of name for ORDER BY
      console.log('\nTesting ORDER BY with first_name:');
      const sortQuery = query + ' ORDER BY first_name LIMIT ? OFFSET ?';
      console.log('Query:', sortQuery);
      
      const sortParams = [...params, 10, 0];
      console.log('Params:', sortParams);
      
      const sortResult = await dbInstance.all(sortQuery, sortParams);
      console.log('Query successful with', sortResult.length, 'results');
      
      // Test searching with first_name and last_name
      console.log('\nTesting search with first_name and last_name:');
      const searchName = 'Test';
      const searchQuery = 'SELECT * FROM patients WHERE 1=1 AND (first_name LIKE ? OR last_name LIKE ?)';
      const searchParams = [`%${searchName}%`, `%${searchName}%`];
      console.log('Query:', searchQuery);
      console.log('Params:', searchParams);
      
      const searchResult = await dbInstance.all(searchQuery, searchParams);
      console.log('Search query successful with', searchResult.length, 'results');
      
      // Test with blood_type
      console.log('\nTesting filter with blood_type:');
      const bloodTypeQuery = 'SELECT * FROM patients WHERE 1=1 AND blood_type = ?';
      const bloodTypeParams = ['A+'];
      console.log('Query:', bloodTypeQuery);
      console.log('Params:', bloodTypeParams);
      
      const bloodTypeResult = await dbInstance.all(bloodTypeQuery, bloodTypeParams);
      console.log('Blood type query executed successfully with', bloodTypeResult.length, 'results');
      
      console.log('\nAll tests passed successfully!');
    } catch (error) {
      console.error('Error testing column names:', error);
      console.error('Error details:', error.stack);
    }
  } catch (initError) {
    console.error('Error initializing database:', initError);
    console.error('Error details:', initError.stack);
  }
}

console.log('Starting column name test...');
testColumnNames()
  .then(() => console.log('Test completed'))
  .catch(err => {
    console.error('Unexpected error:', err);
    console.error('Error details:', err.stack);
  }); 