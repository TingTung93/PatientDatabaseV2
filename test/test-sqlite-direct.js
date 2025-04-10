// Test direct SQLite functionality
import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { open } from 'sqlite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testSqliteDirect() {
  try {
    console.log('Testing SQLite directly...');
    
    // Create a test database
    const dbPath = path.join(__dirname, 'test.sqlite');
    console.log(`Creating SQLite database at: ${dbPath}`);
    
    // Open database connection using sqlite wrapper for promises
    const db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });
    
    // Create test table
    console.log('Creating test table...');
    await db.exec(`
      CREATE TABLE IF NOT EXISTS test_table (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Insert test data
    console.log('Inserting test data...');
    const result = await db.run(`
      INSERT INTO test_table (name) VALUES (?)
    `, 'Test Entry');
    
    console.log(`Inserted row with ID: ${result.lastID}`);
    
    // Query the data
    console.log('Querying test data...');
    const row = await db.get('SELECT * FROM test_table WHERE id = ?', result.lastID);
    
    console.log('Query result:', row);
    
    // Close the database
    await db.close();
    
    console.log('Test completed successfully!');
  } catch (error) {
    console.error('Error testing SQLite directly:', error);
  }
}

// Run the test
testSqliteDirect(); 