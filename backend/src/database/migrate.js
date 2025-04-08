const fs = require('fs').promises;
const path = require('path');
const { db } = require('./init');

async function runMigrations() {
  try {
    // Create migrations table if it doesn't exist
    db.prepare(`
      CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run();

    // Get list of migration files
    const migrationsDir = path.join(__dirname, 'migrations');
    const files = await fs.readdir(migrationsDir);
    const migrationFiles = files
      .filter(file => file.endsWith('.js'))
      .sort();

    // Get executed migrations
    const executedMigrations = db.prepare('SELECT name FROM migrations').all();

    // Run pending migrations
    for (const file of migrationFiles) {
      const migrationName = path.basename(file, '.js');
      
      if (!executedMigrations.some(m => m.name === migrationName)) {
        console.log(`Running migration: ${migrationName}`);
        
        const migration = require(path.join(migrationsDir, file));
        
        // Start transaction
        db.prepare('BEGIN TRANSACTION').run();
        
        try {
          // Run migration
          await migration.up();
          
          // Record migration
          db.prepare('INSERT INTO migrations (name) VALUES (?)').run(migrationName);
          
          // Commit transaction
          db.prepare('COMMIT').run();
          
          console.log(`Migration completed: ${migrationName}`);
        } catch (error) {
          // Rollback on error
          db.prepare('ROLLBACK').run();
          throw error;
        }
      }
    }

    console.log('All migrations completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

async function rollbackMigration(migrationName) {
  try {
    // Check if migration exists
    const migration = db.prepare('SELECT name FROM migrations WHERE name = ?').get(migrationName);
    if (!migration) {
      console.error(`Migration not found: ${migrationName}`);
      process.exit(1);
    }

    // Get migration file
    const migrationFile = path.join(__dirname, 'migrations', `${migrationName}.js`);
    const migrationModule = require(migrationFile);

    // Start transaction
    db.prepare('BEGIN TRANSACTION').run();

    try {
      // Run rollback
      await migrationModule.down();

      // Remove migration record
      db.prepare('DELETE FROM migrations WHERE name = ?').run(migrationName);

      // Commit transaction
      db.prepare('COMMIT').run();

      console.log(`Rollback completed: ${migrationName}`);
    } catch (error) {
      // Rollback on error
      db.prepare('ROLLBACK').run();
      throw error;
    }
  } catch (error) {
    console.error('Rollback failed:', error);
    process.exit(1);
  }
}

// Handle command line arguments
const command = process.argv[2];
const migrationName = process.argv[3];

if (command === 'rollback' && migrationName) {
  rollbackMigration(migrationName);
} else if (!command || command === 'up') {
  runMigrations();
} else {
  console.error('Invalid command. Use: node migrate.js [up|rollback <migration-name>]');
  process.exit(1);
}