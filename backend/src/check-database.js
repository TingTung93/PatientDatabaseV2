const db = require('./database/models/index');
const logger = require('./utils/logger');

async function checkDatabaseTables() {
  try {
    logger.info('Starting database check...');
    
    // Check database connection
    await db.sequelize.authenticate();
    logger.info('Database connection successful');
    
    // List all models
    const models = Object.keys(db);
    logger.info('Available models:', models.filter(key => typeof db[key] === 'function' || key.match(/^[A-Z]/)));
    
    // Check if Report model exists
    const hasReport = !!db.Report;
    logger.info('Report model exists:', hasReport);
    
    if (hasReport) {
      logger.info('Report model definition:', JSON.stringify(db.Report.getAttributes(), null, 2));
      logger.info('Report model table name:', db.Report.tableName);
      logger.info('Report model associations:', Object.keys(db.Report.associations || {}));
    }
    
    // Check tables in database
    const [tables] = await db.sequelize.query(`
      SELECT 
        name
      FROM 
        sqlite_master 
      WHERE 
        type ='table' AND 
        name NOT LIKE 'sqlite_%';
    `);
    
    logger.info('Database tables:', tables.map(t => t.name));
    
    // Check reports table schema if it exists
    if (tables.some(t => t.name === 'reports')) {
      const [schema] = await db.sequelize.query(`PRAGMA table_info(reports);`);
      logger.info('Reports table schema:', schema.map(col => `${col.name} (${col.type})`));
    } else {
      logger.warn('Reports table does not exist in the database');
    }
    
    // Test creating a report
    if (hasReport) {
      try {
        const { v4: uuidv4 } = require('uuid');
        const report = await db.Report.create({
          report_type: 'test',
          filename: `test-${uuidv4()}.txt`,
          original_filename: 'test-report.txt',
          mime_type: 'text/plain',
          size: 100,
          path: `/fake/path/test-${uuidv4()}.txt`,
          metadata: JSON.stringify({}),
          status: 'uploaded'
        });
        
        logger.info('Successfully created test report:', report.id);
      } catch (error) {
        logger.error('Failed to create test report:', error);
      }
    }
    
  } catch (error) {
    logger.error('Database check failed:', error);
  } finally {
    // Close the database connection
    await db.sequelize.close();
    process.exit(0);
  }
}

// Run the check
checkDatabaseTables(); 