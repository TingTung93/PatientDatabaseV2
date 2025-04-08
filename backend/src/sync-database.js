const db = require('./database/models/index');
const logger = require('./utils/logger');

async function syncDatabase() {
  try {
    logger.info('Starting database sync...');
    
    // Check database connection
    await db.sequelize.authenticate();
    logger.info('Database connection successful');
    
    // First sync critical models
    logger.info('Syncing Patient model...');
    await db.Patient.sync({ alter: true });
    logger.info('Patient model synced');
    
    logger.info('Syncing User model...');
    await db.User.sync({ alter: true });
    logger.info('User model synced');
    
    logger.info('Syncing Document model...');
    await db.Document.sync({ alter: true });
    logger.info('Document model synced');
    
    logger.info('Syncing Report model...');
    await db.Report.sync({ alter: true });
    logger.info('Report model synced');
    
    logger.info('All models synced successfully');
    
    // Test creating a report
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
    
  } catch (error) {
    logger.error('Database sync failed:', error);
  } finally {
    // Close the database connection
    await db.sequelize.close();
    process.exit(0);
  }
}

// Run the sync
syncDatabase(); 