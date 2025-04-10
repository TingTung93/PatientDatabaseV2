// CommonJS version of migration runner
const fs = require('fs');
const path = require('path');
const sqlite = require('sqlite');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

async function getDbConnection() {
  return open({
    filename: path.join(__dirname, 'database.sqlite'),
    driver: sqlite3.Database
  });
}

async function runMigrations() {
  try {
    console.log('Starting database migrations (CommonJS version)...');
    
    // Open database connection
    const db = await getDbConnection();
    
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
    
    // Create a mock Sequelize object for compatibility
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
        
        try {
          // Import the migration
          const migrationPath = path.join(migrationsDir, file);
          const migration = require(migrationPath);
          
          // Start transaction
          await db.exec('BEGIN TRANSACTION');
          
          // Run migration
          await migration.up(mockSequelize, {});
          
          // Record migration
          await db.run('INSERT INTO migrations (name) VALUES (?)', migrationName);
          
          // Commit transaction
          await db.exec('COMMIT');
          
          console.log(`Migration ${migrationName} applied successfully`);
        } catch (error) {
          // Rollback transaction
          await db.exec('ROLLBACK');
          console.error(`Error applying migration ${migrationName}:`, error);
          throw error;
        }
      } else {
        console.log(`Skipping already applied migration: ${migrationName}`);
      }
    }
    
    console.log('All migrations applied successfully!');
    await db.close();
  } catch (error) {
    console.error('Migration process failed:', error);
    process.exit(1);
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