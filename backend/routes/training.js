const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

// Submit a correction for training data
router.post('/caution-cards/:id/corrections', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { field_name, original_ocr_text, corrected_text, confidence_score } = req.body;
        const user_id = req.user.id;

        // Validate input
        if (!field_name || !original_ocr_text || !corrected_text) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Insert training data
        const result = await db.run(
            `INSERT INTO training_data 
            (caution_card_id, field_name, original_ocr_text, corrected_text, confidence_score, user_id)
            VALUES (?, ?, ?, ?, ?, ?)`,
            [id, field_name, original_ocr_text, corrected_text, confidence_score, user_id]
        );

        // Update error patterns
        if (original_ocr_text !== corrected_text) {
            await db.run(
                `INSERT INTO error_patterns (pattern_type, original_text, corrected_text)
                VALUES (?, ?, ?)
                ON CONFLICT (pattern_type, original_text) 
                DO UPDATE SET frequency = frequency + 1, updated_at = CURRENT_TIMESTAMP`,
                [field_name, original_ocr_text, corrected_text]
            );
        }

        res.status(201).json({ 
            message: 'Correction submitted successfully',
            id: result.lastID 
        });
    } catch (error) {
        console.error('Error submitting correction:', error);
        res.status(500).json({ error: 'Failed to submit correction' });
    }
});

// Get training data with optional filters
router.get('/training-data', authenticateToken, async (req, res) => {
    try {
        const { field_name, start_date, end_date, limit = 100, offset = 0 } = req.query;
        
        let query = `
            SELECT td.*, cc.image_path, u.username as corrected_by
            FROM training_data td
            JOIN caution_cards cc ON td.caution_card_id = cc.id
            LEFT JOIN users u ON td.user_id = u.id
            WHERE 1=1
        `;
        const params = [];

        if (field_name) {
            query += ' AND td.field_name = ?';
            params.push(field_name);
        }
        if (start_date) {
            query += ' AND td.created_at >= ?';
            params.push(start_date);
        }
        if (end_date) {
            query += ' AND td.created_at <= ?';
            params.push(end_date);
        }

        query += ' ORDER BY td.created_at DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);

        const trainingData = await db.all(query, params);
        res.json(trainingData);
    } catch (error) {
        console.error('Error retrieving training data:', error);
        res.status(500).json({ error: 'Failed to retrieve training data' });
    }
});

// Export training data
router.get('/training-data/export', authenticateToken, async (req, res) => {
    try {
        const { format = 'json' } = req.query;
        
        const trainingData = await db.all(`
            SELECT td.*, cc.image_path, u.username as corrected_by
            FROM training_data td
            JOIN caution_cards cc ON td.caution_card_id = cc.id
            LEFT JOIN users u ON td.user_id = u.id
            ORDER BY td.created_at DESC
        `);

        if (format === 'csv') {
            // Convert to CSV format
            const csv = convertToCSV(trainingData);
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename=training-data.csv');
            return res.send(csv);
        }

        res.json(trainingData);
    } catch (error) {
        console.error('Error exporting training data:', error);
        res.status(500).json({ error: 'Failed to export training data' });
    }
});

// Get training analytics
router.get('/training-data/analytics', authenticateToken, async (req, res) => {
    try {
        const analytics = await db.all(`
            SELECT 
                field_name,
                COUNT(*) as total_corrections,
                AVG(CASE WHEN original_ocr_text != corrected_text THEN 1 ELSE 0 END) as error_rate,
                AVG(confidence_score) as avg_confidence
            FROM training_data
            GROUP BY field_name
        `);

        const errorPatterns = await db.all(`
            SELECT 
                pattern_type,
                original_text,
                corrected_text,
                frequency
            FROM error_patterns
            ORDER BY frequency DESC
            LIMIT 10
        `);

        res.json({
            field_analytics: analytics,
            common_errors: errorPatterns
        });
    } catch (error) {
        console.error('Error retrieving training analytics:', error);
        res.status(500).json({ error: 'Failed to retrieve training analytics' });
    }
});

// Get training mode status
router.get('/training-mode', authenticateToken, async (req, res) => {
    try {
        const { user_id } = req.user;
        
        const settings = await db.get(
            'SELECT is_training_mode FROM training_mode_settings WHERE user_id = ?',
            [user_id]
        );

        res.json({ is_training_mode: settings?.is_training_mode || false });
    } catch (error) {
        console.error('Error retrieving training mode:', error);
        res.status(500).json({ error: 'Failed to retrieve training mode' });
    }
});

// Toggle training mode
router.post('/training-mode/toggle', authenticateToken, async (req, res) => {
    try {
        const { user_id } = req.user;
        const { is_training_mode } = req.body;

        await db.run(
            `INSERT INTO training_mode_settings (user_id, is_training_mode)
            VALUES (?, ?)
            ON CONFLICT (user_id) 
            DO UPDATE SET is_training_mode = ?, last_updated = CURRENT_TIMESTAMP`,
            [user_id, is_training_mode, is_training_mode]
        );

        res.json({ is_training_mode });
    } catch (error) {
        console.error('Error toggling training mode:', error);
        res.status(500).json({ error: 'Failed to toggle training mode' });
    }
});

// Helper function to convert data to CSV
function convertToCSV(data) {
    if (!data.length) return '';
    
    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(',')];
    
    for (const row of data) {
        const values = headers.map(header => {
            const value = row[header];
            return `"${value === null ? '' : String(value).replace(/"/g, '""')}"`;
        });
        csvRows.push(values.join(','));
    }
    
    return csvRows.join('\n');
}

module.exports = router; 