// ES Modules version of migration runner
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get database paths
const localDbPath = path.join(__dirname, 'database.sqlite');
const appDataPath = path.join(__dirname, '..', 'data');
const productionDbPath = path.join(appDataPath, 'patients.sqlite');

// Create direct connection to the database
async function getDb() {
  // First check if the production path exists
  let dbPath = productionDbPath;
  
  if (fs.existsSync(appDataPath)) {
    console.log(`Data directory exists at: ${appDataPath}`);
    
    if (fs.existsSync(productionDbPath)) {
      console.log(`Using production database at: ${productionDbPath}`);
      dbPath = productionDbPath;
    } else {
      console.log(`Production database not found, using local database at: ${localDbPath}`);
      dbPath = localDbPath;
    }
  } else {
    console.log(`Data directory does not exist, using local database at: ${localDbPath}`);
    dbPath = localDbPath;
  }
  
  console.log(`Opening database at: ${dbPath}`);
  
  // Make sure the directory exists
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    console.log(`Creating directory: ${dbDir}`);
    fs.mkdirSync(dbDir, { recursive: true });
  }
  
  return open({
    filename: dbPath,
    driver: sqlite3.Database
  });
}

async function runMigrations() {
  let db = null;
  
  try {
    console.log('Starting database migrations...');
    
    // Connect to the database directly
    db = await getDb();
    console.log('Database connection established');
    
    // Create migrations table if it doesn't exist
    await db.exec(`
      CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Get the migrations directory
    const migrationsDir = path.join(__dirname, 'src', 'database', 'migrations');
    console.log(`Looking for migrations in: ${migrationsDir}`);
    
    // Get all migration files
    const files = fs.readdirSync(migrationsDir).filter(file => 
      file.endsWith('.js') && !file.startsWith('.')
    ).sort();
    
    console.log(`Found ${files.length} migration files`);
    
    // Get executed migrations
    const executedMigrations = await db.all('SELECT name FROM migrations');
    const executedMigrationNames = executedMigrations.map(m => m.name);
    
    console.log(`Already executed migrations: ${executedMigrationNames.length}`);
    
    // Create a mock sequelize object for migrations
    const mockSequelize = {
      query: async (sql, options) => {
        if (Array.isArray(sql)) {
          console.log('Executing array query:', sql[0]);
          return db.exec(sql[0]);
        } else {
          console.log('Executing query:', sql);
          return db.exec(sql);
        }
      }
    };
    
    // Process each migration
    for (const file of files) {
      const migrationName = file.replace('.js', '');
      
      if (!executedMigrationNames.includes(migrationName)) {
        console.log(`Running migration: ${migrationName}`);
        
        let transactionActive = false;
        
        try {
          // Import the migration
          const migrationModule = await import(path.join(migrationsDir, file));
          const migration = migrationModule.default || migrationModule;
          
          // Start transaction
          await db.exec('BEGIN TRANSACTION');
          transactionActive = true;
          
          // Run migration with the mock sequelize object
          if (typeof migration.up === 'function') {
            await migration.up(mockSequelize, {});
          } else {
            throw new Error(`Migration ${migrationName} does not export an 'up' function`);
          }
          
          // Record migration
          await db.run('INSERT INTO migrations (name) VALUES (?)', migrationName);
          
          // Commit transaction
          await db.exec('COMMIT');
          transactionActive = false;
          
          console.log(`Migration ${migrationName} applied successfully`);
        } catch (error) {
          // Rollback transaction
          console.error(`Error applying migration ${migrationName}:`, error);
          
          // Only try to roll back if a transaction is active
          if (transactionActive) {
            try {
              await db.exec('ROLLBACK');
              console.log('Transaction rolled back successfully');
            } catch (rollbackError) {
              console.error('Error rolling back transaction:', rollbackError);
            }
          }
          
          throw error;
        }
      } else {
        console.log(`Skipping already applied migration: ${migrationName}`);
      }
    }
    
    console.log('All migrations applied successfully!');
  } catch (error) {
    console.error('Migration process failed:', error);
    process.exit(1);
  } finally {
    // Close database connection if it was opened
    if (db) {
      await db.close();
      console.log('Database connection closed');
    }
  }
}

// Run migrations
runMigrations().then(() => {
  console.log('Migration process completed.');
  process.exit(0);
}).catch(err => {
  console.error('Unhandled error in migration process:', err);
  process.exit(1);
}); 