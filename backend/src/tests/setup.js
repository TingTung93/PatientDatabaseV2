const { sequelize, initializeTestDatabase, closeDatabase } = require('../database/db');
const testConfig = require('../config/test.config');
const app = require('../app');
// const { clearDatabaseTables } = require('./testUtils'); // REMOVE THIS - File doesn't exist

// Set test environment variables
process.env.NODE_ENV = 'test';
Object.assign(process.env, testConfig.env);

// Set higher timeout for potentially long-running tests
jest.setTimeout(30000);

// Global setup executed once before all test suites
module.exports = async () => {
    console.log('\n------ Global Test Setup ------');
    try {
        // Initialize the database connection (using test config)
        await initializeTestDatabase();
        console.log('Test database connection initialized.');

        // Sync database schema (drop and recreate tables)
        console.log('Syncing test database schema...');
        await sequelize.sync({ force: true });
        console.log('Test database schema synced.');

    } catch (error) {
        console.error('Global setup failed:', error);
        process.exit(1); // Exit if setup fails
    }
    console.log('------ Global Test Setup Complete ------\n');
};

// Global teardown executed once after all test suites
// Separate file usually configured in jest.config.js globalTeardown
// For simplicity here, assuming a single setup file handles both if needed
// or configure globalTeardown separately.

// Example of what might be in a global teardown:
/*
module.exports = async () => {
    console.log('\n------ Global Test Teardown ------');
    try {
        await closeDatabase();
        console.log('Test database connection closed.');
    } catch (error) {
        console.error('Global teardown failed:', error);
    }
    console.log('------ Global Test Teardown Complete ------\n');
};
*/

// --- Potentially move clearDatabaseTables to a testUtils.js file ---
/*
async function clearDatabaseTables() {
    const models = sequelize.models;
    const queryInterface = sequelize.getQueryInterface();

    console.log('Clearing test database tables...');
    try {
        // Disable foreign key checks (example for SQLite/Postgres)
        if (sequelize.options.dialect === 'sqlite') {
            await sequelize.query('PRAGMA foreign_keys = OFF;');
        } else if (sequelize.options.dialect === 'postgres') {
            await sequelize.query('SET CONSTRAINTS ALL DEFERRED;');
        }

        // Truncate all tables
        for (const modelName of Object.keys(models)) {
            console.log(`Truncating ${modelName}...`);
            await models[modelName].destroy({ where: {}, truncate: true, cascade: true });
        }

        // Re-enable foreign key checks
        if (sequelize.options.dialect === 'sqlite') {
            await sequelize.query('PRAGMA foreign_keys = ON;');
        } else if (sequelize.options.dialect === 'postgres') {
             // Postgres re-enables automatically at end of transaction usually
        }

        console.log('Test database tables cleared');
    } catch (error) {
        console.error('Error clearing test database tables:', error);
        // Don't re-throw here, allow tests to potentially handle/report
    }
}
*/

// Clean up after all tests
afterAll(async () => {
  try {
    // Stop the application (cleans up intervals)
    if (app && typeof app.stop === 'function') {
      await app.stop();
    }

    // Close database connection after all tests
    await sequelize.close();
    console.log('Test database connection closed');
  } catch (error) {
    console.error('Error during test cleanup:', error);
  }
});

// Clear all tables before each test
beforeEach(async () => {
  try {
    // Use TRUNCATE with CASCADE to handle foreign key constraints
    await sequelize.query(`
      DO $$ 
      DECLARE 
        r RECORD;
      BEGIN
        FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
          EXECUTE 'TRUNCATE TABLE ' || quote_ident(r.tablename) || ' CASCADE';
        END LOOP;
      END $$;
    `);
    console.log('Test database tables cleared');
  } catch (error) {
    console.error('Error clearing test database tables:', error);
  }
}); 