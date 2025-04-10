// Direct schema checker script
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get database paths
const localDbPath = path.join(__dirname, 'database.sqlite');
const appDataPath = path.join(__dirname, '..', 'data');
const productionDbPath = path.join(appDataPath, 'patients.sqlite');

async function checkSchema() {
  try {
    // Check both database locations
    await checkDatabaseSchema(localDbPath, "Local");
    
    if (fs.existsSync(productionDbPath)) {
      console.log("\n=== Checking Production Database ===\n");
      await checkDatabaseSchema(productionDbPath, "Production");
    } else {
      console.log(`\nProduction database does not exist at: ${productionDbPath}`);
    }
    
    console.log('Schema check completed for all databases.');
  } catch (error) {
    console.error('Error checking schema:', error);
    process.exit(1);
  }
}

async function checkDatabaseSchema(dbPath, dbType) {
  try {
    console.log(`Opening ${dbType} database at: ${dbPath}`);
    
    // Open database connection
    const db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });
    
    console.log(`${dbType} database connection established`);
    
    // Check if patients table exists
    const patientsExists = await db.get(
      `SELECT name FROM sqlite_master WHERE type='table' AND name='patients'`
    );
    
    if (patientsExists) {
      console.log(`Patients table exists in ${dbType} database, showing schema:`);
      
      // Get table schema
      const patientColumns = await db.all('PRAGMA table_info(patients)');
      console.log(JSON.stringify(patientColumns, null, 2));
      
      // Show sample data
      const sampleData = await db.all('SELECT * FROM patients LIMIT 1');
      if (sampleData.length > 0) {
        console.log(`Sample patient data from ${dbType} database:`);
        console.log(JSON.stringify(sampleData, null, 2));
      } else {
        console.log(`No patient data found in ${dbType} database`);
      }
    } else {
      console.log(`Patients table does not exist in ${dbType} database`);
    }
    
    // List all tables
    console.log(`All tables in ${dbType} database:`);
    const tables = await db.all(`SELECT name FROM sqlite_master WHERE type='table'`);
    console.log(tables.map(t => t.name));
    
    // Close connection
    await db.close();
    console.log(`${dbType} database connection closed`);
    
  } catch (error) {
    console.error(`Error checking ${dbType} database schema:`, error);
    throw error;
  }
}

// Run the check
checkSchema().then(() => {
  console.log('Schema check completed.');
  process.exit(0);
}).catch(err => {
  console.error('Unhandled error in schema check:', err);
  process.exit(1);
}); 