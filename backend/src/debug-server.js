const app = require('./app.js');
const logger = require('./utils/logger');

// Debug server for testing report uploads
const port = 5001; // Use a different port to avoid conflicts
app.listen(port, () => {
    logger.info(`Debug server running on port ${port}`);
});

// Add test endpoint to check report model
app.get('/debug/report-model', (req, res) => {
    try {
        const db = require('./database/models/index');
        
        // Check if Report model exists
        const modelNames = Object.keys(db);
        const hasReport = modelNames.includes('Report');
        
        const reportModel = db.Report;
        const reportAssociations = reportModel ? Object.keys(reportModel.associations || {}) : [];

        res.json({
            success: true,
            models: modelNames,
            hasReport,
            reportAssociations,
            sequelizeSync: !!db.sequelize
        });
    } catch (error) {
        logger.error('Debug route error:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            stack: error.stack
        });
    }
});

// Add test endpoint for database schema
app.get('/debug/database-schema', async (req, res) => {
    try {
        const db = require('./database/models/index');
        const sequelize = db.sequelize;
        
        // Check what tables are created in the database
        const [results] = await sequelize.query(`
            SELECT 
                name
            FROM 
                sqlite_master 
            WHERE 
                type ='table' AND 
                name NOT LIKE 'sqlite_%';
        `);
        
        // Get schema for reports table if it exists
        let reportsSchema = null;
        if (results.some(r => r.name === 'reports')) {
            const [schemaResults] = await sequelize.query(`PRAGMA table_info(reports);`);
            reportsSchema = schemaResults;
        }
        
        res.json({
            success: true,
            tables: results,
            reportsSchema
        });
    } catch (error) {
        logger.error('Debug database schema error:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            stack: error.stack
        });
    }
});

// Add test endpoint for uploads folder
app.get('/debug/uploads', (req, res) => {
    const fs = require('fs').promises;
    const path = require('path');
    
    async function checkFolders() {
        try {
            const uploadDir = path.join(process.cwd(), 'uploads');
            const reportsDir = path.join(uploadDir, 'reports');
            
            let uploadExists = false;
            let reportsExists = false;
            
            try {
                await fs.access(uploadDir);
                uploadExists = true;
            } catch (e) {
                // Directory doesn't exist
            }
            
            try {
                await fs.access(reportsDir);
                reportsExists = true;
            } catch (e) {
                // Directory doesn't exist
            }
            
            return {
                uploadExists,
                reportsExists,
                cwd: process.cwd(),
                uploadPath: uploadDir,
                reportsPath: reportsDir
            };
        } catch (error) {
            return { error: error.message };
        }
    }
    
    checkFolders().then(result => {
        res.json(result);
    }).catch(err => {
        res.status(500).json({ error: err.message });
    });
});

// Add test endpoint to create a mock report
app.post('/debug/create-report', async (req, res) => {
    try {
        const { v4: uuidv4 } = require('uuid');
        const db = require('./database/models/index');
        const Report = db.Report;
        
        // Create a test report
        const mockReport = await Report.create({
            report_type: 'test',
            filename: `test-${uuidv4()}.txt`,
            original_filename: 'test-report.txt',
            mime_type: 'text/plain',
            size: 100,
            path: '/fake/path/test.txt',
            metadata: JSON.stringify({}),
            status: 'uploaded'
        });
        
        res.json({
            success: true,
            report: mockReport
        });
    } catch (error) {
        logger.error('Debug create report error:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            stack: error.stack
        });
    }
}); 