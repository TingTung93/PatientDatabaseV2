import express from 'express';
import database from '../database/db.js'; // Import the instance directly, add .js extension
// Removed import for non-existent errors module
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url'; // Needed for __dirname replacement
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url); // ES Module equivalent for __filename
const __dirname = path.dirname(__filename); // ES Module equivalent for __dirname

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/reports');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueId = uuidv4();
    const ext = path.extname(file.originalname);
    cb(null, `report-${uniqueId}${ext}`);
  }
});

const upload = multer({ storage });

// Get all reports with pagination
router.get('/', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    // Get reports with patient information
    const reports = await database.all(`
      SELECT r.*, p.name as patient_name
      FROM reports r
      LEFT JOIN patients p ON r.patient_id = p.id
      ORDER BY r.created_at DESC
      LIMIT ? OFFSET ?
    `, [limit, offset]); // Use await and pass params as array

    // Get total count for pagination
    const { count } = await database.get('SELECT COUNT(*) as count FROM reports'); // Use await

    const totalPages = Math.ceil(count / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    res.status(200).json({
      status: 'success',
      data: reports,
      pagination: {
        page,
        limit,
        total: count,
        totalPages,
        hasNextPage,
        hasPrevPage
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get report by ID
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const report = await database.get(`
      SELECT r.*, p.name as patient_name
      FROM reports r
      LEFT JOIN patients p ON r.patient_id = p.id
      WHERE r.id = ?
    `, [id]); // Use await and pass params as array

    if (!report) {
      throw new Error(`Report with ID ${id} not found`); // Replaced NotFoundError with standard Error
    }

    res.status(200).json({
      status: 'success',
      data: report
    });
  } catch (error) {
    next(error);
  }
});

// Create new report
router.post('/', upload.single('file'), async (req, res, next) => {
  try {
    const { patient_id, type } = req.body;
    const file = req.file;

    if (!file) {
      throw new Error('File is required'); // Replaced ValidationError with standard Error
    }

    const now = new Date().toISOString();
    const result = await database.run(`
      INSERT INTO reports (
        patient_id, type, file_name, file_path, file_type,
        status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      patient_id,
      type,
      file.originalname,
      file.path,
      file.mimetype,
      'pending',
      now,
      now
    ]); // Use await and pass params as array

    const newReport = await database.get('SELECT * FROM reports WHERE id = ?', [result.lastID]); // Use await, pass params as array, use lastID
    
    res.status(201).json({
      status: 'success',
      data: newReport
    });
  } catch (error) {
    next(error);
  }
});

// Update report status
router.patch('/:id/status', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['pending', 'processing', 'completed', 'failed'].includes(status)) {
      throw new Error('Invalid status value'); // Replaced ValidationError with standard Error
    }

    // Note: sqlite3 driver's .get doesn't support RETURNING directly like this.
    // We need to run UPDATE then SELECT.
    await database.run(`
      UPDATE reports
      SET status = ?, updated_at = ?
      WHERE id = ?
    `, [status, new Date().toISOString(), id]); // Use await and pass params as array

    const updatedReport = await database.get('SELECT * FROM reports WHERE id = ?', [id]); // Fetch updated row

    if (!updatedReport) { // Check the fetched report
      throw new Error(`Report with ID ${id} not found`); // Replaced NotFoundError with standard Error
    }

    res.status(200).json({
      status: 'success',
      data: updatedReport // Return the fetched report
    });
  } catch (error) {
    next(error);
  }
});

// Delete report
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const report = await database.get('SELECT * FROM reports WHERE id = ?', [id]); // Use await and pass params as array
    if (!report) {
      throw new Error(`Report with ID ${id} not found`); // Replaced NotFoundError with standard Error
    }

    // Delete file if exists
    if (report.file_path && fs.existsSync(report.file_path)) {
      fs.unlinkSync(report.file_path);
    }

    await database.run('DELETE FROM reports WHERE id = ?', [id]); // Use await and pass params as array

    res.status(200).json({
      status: 'success',
      message: 'Report deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

export default router; // Use ES Module export