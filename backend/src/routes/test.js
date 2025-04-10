import express from 'express';
import { db } from '../database/init.js';
import { log } from '../utils/logging.js';

const router = express.Router();

// Simple test route
router.get('/', async (req, res) => {
  res.json({ message: 'Test route is working' });
});

// Database test route
router.get('/db-test', async (req, res) => {
  try {
    // Check if the database is initialized
    if (!db.instance) {
      return res.status(500).json({
        status: 'error',
        message: 'Database is not initialized'
      });
    }
    
    // Test a simple query to verify connection
    const result = await db.instance.get('SELECT sqlite_version() as version');
    
    return res.json({
      status: 'success',
      message: 'Database connection successful',
      data: {
        sqlite_version: result.version
      }
    });
  } catch (error) {
    log.error('Error testing database connection:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Database connection failed',
      error: error.message
    });
  }
});

export default router; 