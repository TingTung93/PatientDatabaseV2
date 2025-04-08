/**
 * Migration: Create events table for real-time event system
 */
async function up() {
  const db = require('../init').db;
  
  // Create events table
  db.prepare(`
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      data TEXT NOT NULL,
      version INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    )
  `).run();

  // Create indexes for efficient querying
  db.prepare('CREATE INDEX IF NOT EXISTS idx_events_version ON events (version)').run();
  db.prepare('CREATE INDEX IF NOT EXISTS idx_events_type ON events (type)').run();
  db.prepare('CREATE INDEX IF NOT EXISTS idx_events_created_at ON events (created_at)').run();
}

/**
 * Rollback migration
 */
async function down() {
  const db = require('../init').db;
  
  // Drop indexes
  db.prepare('DROP INDEX IF EXISTS idx_events_version').run();
  db.prepare('DROP INDEX IF EXISTS idx_events_type').run();
  db.prepare('DROP INDEX IF EXISTS idx_events_created_at').run();
  
  // Drop table
  db.prepare('DROP TABLE IF EXISTS events').run();
}

module.exports = { up, down }; 