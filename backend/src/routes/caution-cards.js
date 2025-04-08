const express = require('express');
const router = express.Router();
const { db } = require('../database/init');
const { ValidationError, NotFoundError } = require('../errors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const { validateCautionCard } = require('../middleware/validation');
const { body, param, query, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const validator = require('validator');

// Ensure upload directory exists
const uploadDir = process.env.UPLOAD_DIR || 'uploads/caution-cards';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueId = uuidv4();
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueId}${ext}`);
  }
});

const upload = multer({ storage });

// Get all caution cards
router.get('/', async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;
    
    // Get caution cards with patient information using SQLite
    const cautionCards = db.prepare(`
      SELECT c.*, p.name as patient_name 
      FROM caution_cards c
      LEFT JOIN patients p ON c.patient_id = p.id
      ORDER BY c.created_at DESC
      LIMIT ? OFFSET ?
    `).all(limit, offset);
    
    // Get total count for pagination
    const { count } = db.prepare('SELECT COUNT(*) as count FROM caution_cards').get();
    
    res.status(200).json({
      cautionCards,
      pagination: {
        total: count,
        limit,
        offset
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get orphaned caution cards (must be before /:id route)
router.get('/orphaned', async (req, res, next) => {
  try {
    const orphanedCards = db.prepare(`
      SELECT c.*, p.name as patient_name 
      FROM caution_cards c
      LEFT JOIN patients p ON c.patient_id = p.id
      WHERE c.patient_id IS NULL
      ORDER BY c.created_at DESC
    `).all();
    
    res.status(200).json(orphanedCards);
  } catch (error) {
    next(error);
  }
});

// Validate ID parameter middleware
const validateId = [
  param('id')
    .isInt()
    .withMessage('Caution card ID must be a number')
    .toInt(),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Invalid caution card ID: must be a number');
    }
    next();
  }
];

// Get caution card by ID
router.get('/:id', validateId, async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Get caution card with patient information using SQLite
    const cautionCard = db.prepare(`
      SELECT c.*, p.name as patient_name 
      FROM caution_cards c
      LEFT JOIN patients p ON c.patient_id = p.id
      WHERE c.id = ?
    `).get(id);
    
    // Check if caution card exists
    if (!cautionCard) {
      throw new NotFoundError(`Caution card with ID ${id} not found`);
    }
    
    res.status(200).json(cautionCard);
  } catch (error) {
    next(error);
  }
});

// Create new caution card
router.post('/', upload.single('file'), validateCautionCard, async (req, res, next) => {
  try {
    const { blood_type, patient_id } = req.body;
    const file = req.file;

    if (!file) {
      throw new ValidationError('File is required');
    }

    const now = new Date().toISOString();
    const result = db.prepare(`
      INSERT INTO caution_cards (
        blood_type, patient_id, file_name, image_path, mime_type,
        status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      blood_type,
      patient_id,
      file.originalname,
      file.path,
      file.mimetype,
      'pending',
      now,
      now
    );

    const newCard = db.prepare('SELECT * FROM caution_cards WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(newCard);
  } catch (error) {
    next(error);
  }
});

// Update caution card
router.put('/:id', upload.single('image'), async (req, res) => {
  try {
    const { id } = req.params;
    const { patientId, bloodType } = req.body;

    // Check if caution card exists
    const checkStmt = db.prepare('SELECT * FROM caution_cards WHERE id = ?');
    const existingCard = checkStmt.get(id);

    if (!existingCard) {
      return res.status(404).json({ error: 'Caution card not found' });
    }

    // Build update query
    let query = 'UPDATE caution_cards SET updatedAt = CURRENT_TIMESTAMP';
    const params = [];

    if (patientId !== undefined) {
      query += ', patientId = ?';
      params.push(patientId || null);
    }

    if (bloodType !== undefined) {
      query += ', bloodType = ?';
      params.push(bloodType);
    }

    if (req.file) {
      query += ', imagePath = ?';
      params.push(req.file.path);
    }

    query += ' WHERE id = ?';
    params.push(id);

    // Execute update
    const updateStmt = db.prepare(query);
    const result = updateStmt.run(...params);

    // Fetch updated caution card
    const getStmt = db.prepare('SELECT * FROM caution_cards WHERE id = ?');
    const updatedCard = getStmt.get(id);

    // Import the event emitters
    const { emitCautionCardUpdated, emitCautionCardFinalized } = require('../events');

    // Emit event for real-time updates
    await emitCautionCardUpdated(updatedCard);

    // If card is linked to a patient, emit finalized event
    if (updatedCard.patientId) {
      await emitCautionCardFinalized(id, 'linked', updatedCard.patientId);
    }

    res.json(updatedCard);
  } catch (error) {
    console.error('Error updating caution card:', error);
    res.status(500).json({ error: 'Failed to update caution card' });
  }
});

// Delete caution card
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = db.prepare('DELETE FROM caution_cards WHERE id = ? RETURNING *').run(id);

    if (result.rows.length === 0) {
      throw new NotFoundError(`Caution card with ID ${id} not found`);
    }

    res.json({ message: 'Caution card deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// Get unlinked caution cards
router.get('/status/unlinked', async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;
    
    // Get unlinked caution cards
    const cautionCards = db.prepare(`
      SELECT * FROM caution_cards
      WHERE patientId IS NULL
      ORDER BY createdAt DESC
      LIMIT ? OFFSET ?
    `).all(limit, offset);
    
    // Get total count for pagination
    const { count } = db.prepare('SELECT COUNT(*) as count FROM caution_cards WHERE patientId IS NULL').get();
    
    res.status(200).json({
      cautionCards,
      pagination: {
        total: count,
        limit,
        offset
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get pending caution cards
router.get('/status/pending', async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;
    
    // Get pending caution cards
    const cautionCards = db.prepare(`
      SELECT c.*, p.name as patient_name 
      FROM caution_cards c
      LEFT JOIN patients p ON c.patientId = p.id
      WHERE c.status = 'pending'
      ORDER BY c.createdAt DESC
      LIMIT ? OFFSET ?
    `).all(limit, offset);
    
    // Get total count for pagination
    const { count } = db.prepare('SELECT COUNT(*) as count FROM caution_cards WHERE status = $1').get('pending');
    
    res.status(200).json({
      cautionCards,
      pagination: {
        total: count,
        limit,
        offset
      }
    });
  } catch (error) {
    next(error);
  }
});

// Review a caution card
router.post('/:id/review', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { 
      bloodType, patientId, reviewed_by, reviewed_date = new Date().toISOString()
    } = req.body;
    
    // Validate required fields
    if (!reviewed_by) {
      throw new ValidationError('Reviewer name is required');
    }
    
    // Validate ID
    const cardId = parseInt(id);
    if (isNaN(cardId)) {
      throw new ValidationError('Invalid caution card ID: must be a number');
    }
    
    // Check if caution card exists
    const checkResult = db.prepare('SELECT * FROM caution_cards WHERE id = ?').get(cardId);
    
    if (!checkResult) {
      throw new NotFoundError(`Caution card with ID ${id} not found`);
    }
    
    const existingCard = checkResult;
    
    // Format bloodType and patientId as JSON if they are arrays
    const formattedBloodType = bloodType 
      ? (typeof bloodType === 'string' ? bloodType : JSON.stringify(bloodType)) 
      : existingCard.bloodType;
      
    const formattedPatientId = patientId
      ? (typeof patientId === 'string' ? patientId : JSON.stringify(patientId))
      : existingCard.patientId;
    
    // Update caution card with review details
    const result = db.prepare(`
      UPDATE caution_cards SET
        bloodType = COALESCE($1, bloodType),
        patientId = COALESCE($2, patientId),
        status = 'reviewed',
        reviewed_by = $3,
        reviewed_date = $4,
        updatedAt = CURRENT_TIMESTAMP,
        updated_by = $3
      WHERE id = $5
      RETURNING *
    `).run(
      formattedBloodType,
      formattedPatientId,
      reviewed_by,
      reviewed_date,
      cardId
    );
    
    res.json(result.changes > 0 ? result.lastInsertRowid : result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Process a caution card with OCR
router.post('/process', upload.single('file'), async (req, res, next) => {
  try {
    console.log('Processing caution card upload request');
    
    // Check if file was uploaded
    if (!req.file) {
      console.error('No file received in the request');
      throw new ValidationError('No file uploaded - please ensure a file is attached to the request');
    }

    console.log('File received:', {
      filename: req.file.filename,
      mimetype: req.file.mimetype,
      size: req.file.size
    });

    const imagePath = path.join(req.file.destination, req.file.filename);
    
    // Verify file was actually saved
    if (!fs.existsSync(imagePath)) {
      console.error('File was not saved correctly:', imagePath);
      throw new Error('File upload failed - the file was not saved correctly');
    }

    console.log('File saved successfully at:', imagePath);
    
    const formOcrDir = path.join(__dirname, '../../form_ocr');
    
    // Updated paths for mask and coordinates to match the actual files
    const maskPath = path.join(formOcrDir, 'resources/masks/alignment_mask.png');
    const manualMaskPath = path.join(formOcrDir, 'resources/masks/manualmask.png');
    const coordinatesPath = path.join(formOcrDir, 'resources/coordinates/caution_card_coords.json');
    
    // Determine the correct Python executable path from the venv
    const isWindows = process.platform === 'win32';
    const venvPath = path.join(__dirname, '../../venv'); // Assumes venv is at backend/venv
    const pythonExecutable = path.join(venvPath, isWindows ? 'Scripts/python.exe' : 'bin/python');

    // Verify the executable exists
    if (!fs.existsSync(pythonExecutable)) {
        console.error(`Python executable not found at: ${pythonExecutable}`);
        throw new Error(`Configuration error: Python executable not found in venv at ${pythonExecutable}`);
    }

    // Process the caution card using the Python script from the venv
    const command = `"${pythonExecutable}" "${path.join(formOcrDir, 'process_card.py')}" "${imagePath}" "${maskPath}" "${manualMaskPath}" "${coordinatesPath}"`;
    
    console.log(`Executing OCR command: ${command}`);
    
    const { stdout, stderr } = await execAsync(command);
    
    if (stderr) {
      console.error(`OCR Process stderr: ${stderr}`);
    }
    
    // Parse the OCR results
    const ocrResults = JSON.parse(stdout);
    
    if (ocrResults.status === 'error') {
      throw new Error(`OCR processing error: ${ocrResults.error.message}`);
    }
    
    // Extract data from OCR results
    const patientInfo = ocrResults.data.patient_info || {};
    const phenotypeData = ocrResults.data.phenotype_data || {};
    
    // Prepare data for response
    const result = {
      ocr_results: ocrResults,
      file_info: {
        filename: req.file.filename,
        path: req.file.path,
        size: req.file.size
      }
    };
    
    res.status(200).json(result);
  } catch (error) {
    // Delete the uploaded file if there was an error
    if (req.file) {
      fs.unlink(req.file.path, (unlinkErr) => {
        if (unlinkErr) {
          console.error(`Error deleting file: ${unlinkErr}`);
        }
      });
    }
    next(error);
  }
});

// Save processed OCR data as a caution card
router.post('/save-processed', async (req, res, next) => {
  try {
    const { 
      imagePath, bloodType, patientId, ocr_text
    } = req.body;
    
    if (!imagePath) {
      throw new ValidationError('File path is required');
    }
    
    // Validate file exists
    if (!fs.existsSync(imagePath)) {
      throw new ValidationError('File does not exist');
    }
    
    // If patientId is provided, check if the patient exists
    if (patientId) {
      const patientStmt = db.prepare('SELECT id FROM patients WHERE id = ?');
      
      if (patientStmt.get(patientId) === undefined) {
        throw new ValidationError(`Patient with ID ${patientId} not found`);
      }
    }
    
    // Format bloodType and patientId as JSON if they are arrays
    const formattedBloodType = bloodType 
      ? (typeof bloodType === 'string' ? bloodType : JSON.stringify(bloodType)) 
      : null;
      
    const formattedPatientId = patientId
      ? (typeof patientId === 'string' ? patientId : JSON.stringify(patientId))
      : null;
    
    // Prepare the metadata
    const metadata = JSON.stringify({
      processing_method: 'ocr',
      processed_at: new Date().toISOString()
    });
    
    // Insert new caution card
    const result = db.prepare(`
      INSERT INTO caution_cards (
        bloodType, patientId, file_name, imagePath, mime_type,
        status, ocr_text, metadata, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).run(
      formattedBloodType,
      formattedPatientId,
      path.basename(imagePath),
      imagePath,
      path.extname(path.basename(imagePath)).substring(1),
      'pending',
      ocr_text || null,
      metadata,
      'system'
    );
    
    res.status(201).json(result.lastInsertRowid);
  } catch (error) {
    next(error);
  }
});

module.exports = router; 