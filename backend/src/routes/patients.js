const express = require('express');
const router = express.Router();
const { body, param, query, validationResult } = require('express-validator');
const { db } = require('../database/init');
const { ValidationError, NotFoundError } = require('../errors');
const { emitPatientCreated, emitPatientUpdated, emitPatientDeleted, emitPatientsUpdated } = require('../events');

// Middleware to validate request
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// Get all patients with basic filtering
router.get('/', [
  query('name').optional().isString(),
  query('species').optional().isString(),
  query('bloodType').optional().isString(),
  query('breed').optional().isString(),
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  validate
], async (req, res) => {
  try {
    const { name, species, bloodType, breed } = req.query;
    const page = req.query.page || 1;
    const limit = req.query.limit || 10;
    const offset = (page - 1) * limit;

    // Build query
    let query = 'SELECT * FROM patients WHERE 1=1';
    const params = [];

    if (name) {
      query += ' AND name LIKE ?';
      params.push(`%${name}%`);
    }

    if (species) {
      query += ' AND species = ?';
      params.push(species);
    }

    if (bloodType) {
      query += ' AND bloodType = ?';
      params.push(bloodType);
    }

    if (breed) {
      query += ' AND breed = ?';
      params.push(breed);
    }

    // Get total count for pagination
    const countStmt = db.prepare(query.replace('SELECT *', 'SELECT COUNT(*) as count'));
    const { count } = countStmt.get(...params);

    // Add pagination
    query += ' ORDER BY name LIMIT ? OFFSET ?';
    params.push(limit, offset);

    // Execute query
    const stmt = db.prepare(query);
    const patients = stmt.all(...params);

    res.json({
      data: patients,
      pagination: {
        total: count,
        page,
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching patients:', error);
    res.status(500).json({ error: 'Failed to fetch patients' });
  }
});

// Advanced query endpoint with complex filtering, sorting, and pagination
router.get('/advanced-search', [
  query('name').optional().isString(),
  query('mrn').optional().isString(),
  query('bloodType').optional().isString(),
  query('dateStart').optional().isString(),
  query('dateEnd').optional().isString(),
  query('status').optional().isString(),
  query('species').optional().isString(),
  query('breed').optional().isString(),
  query('sortBy').optional().isString(),
  query('sortDir').optional().isIn(['asc', 'desc']),
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  validate
], async (req, res) => {
  try {
    const { 
      name, mrn, bloodType, dateStart, dateEnd, status, 
      species, breed, sortBy, sortDir 
    } = req.query;
    
    const page = req.query.page || 1;
    const limit = req.query.limit || 10;
    const offset = (page - 1) * limit;
    
    // Build query
    let query = 'SELECT * FROM patients WHERE 1=1';
    const params = [];
    
    // Add filters
    if (name) {
      query += ' AND name LIKE ?';
      params.push(`%${name}%`);
    }
    
    if (mrn) {
      query += ' AND mrn = ?';
      params.push(mrn);
    }
    
    if (bloodType) {
      query += ' AND bloodType = ?';
      params.push(bloodType);
    }
    
    if (dateStart) {
      query += ' AND createdAt >= ?';
      params.push(dateStart);
    }
    
    if (dateEnd) {
      query += ' AND createdAt <= ?';
      params.push(dateEnd);
    }
    
    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }
    
    if (species) {
      query += ' AND species = ?';
      params.push(species);
    }
    
    if (breed) {
      query += ' AND breed = ?';
      params.push(breed);
    }
    
    // Get total count for pagination
    const countStmt = db.prepare(query.replace('SELECT *', 'SELECT COUNT(*) as count'));
    const { count } = countStmt.get(...params);
    
    // Add sorting
    if (sortBy) {
      const direction = sortDir === 'desc' ? 'DESC' : 'ASC';
      // Sanitize the column name to prevent SQL injection
      const allowedSortColumns = ['name', 'mrn', 'bloodType', 'species', 'breed', 'createdAt', 'updatedAt'];
      if (allowedSortColumns.includes(sortBy)) {
        query += ` ORDER BY ${sortBy} ${direction}`;
      } else {
        query += ' ORDER BY name ASC';
      }
    } else {
      query += ' ORDER BY name ASC';
    }
    
    // Add pagination
    query += ' LIMIT ? OFFSET ?';
    params.push(limit, offset);
    
    // Execute query
    const stmt = db.prepare(query);
    const patients = stmt.all(...params);
    
    res.json({
      data: patients,
      pagination: {
        total: count,
        page,
        pages: Math.ceil(count / limit),
        limit
      }
    });
  } catch (error) {
    console.error('Error in advanced patient search:', error);
    res.status(500).json({ error: 'Failed to search patients' });
  }
});

// Get patient by ID
router.get('/:id', [
  param('id').isInt().toInt(),
  validate
], async (req, res) => {
  try {
    const { id } = req.params;

    const stmt = db.prepare('SELECT * FROM patients WHERE id = ?');
    const patient = stmt.get(id);

    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    res.json(patient);
  } catch (error) {
    console.error('Error fetching patient by ID:', error);
    res.status(500).json({ error: 'Failed to fetch patient' });
  }
});

// Create a new patient
router.post('/', [
  body('name').notEmpty().isString(),
  body('species').notEmpty().isString(),
  body('breed').optional().isString(),
  body('bloodType').optional().isString(),
  body('mrn').optional().isString(),
  validate
], async (req, res) => {
  try {
    const { name, species, breed, bloodType, mrn } = req.body;

    const stmt = db.prepare(`
      INSERT INTO patients (name, species, breed, bloodType, mrn, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `);

    const result = stmt.run(name, species, breed || null, bloodType || null, mrn || null);

    // Fetch the created patient
    const getStmt = db.prepare('SELECT * FROM patients WHERE id = ?');
    const newPatient = getStmt.get(result.lastInsertRowid);

    // Emit event for real-time updates
    await emitPatientCreated(newPatient);
    await emitPatientsUpdated();
    
    res.status(201).json(newPatient);
  } catch (error) {
    console.error('Error creating patient:', error);
    res.status(500).json({ error: 'Failed to create patient' });
  }
});

// Update a patient
router.put('/:id', [
  param('id').isInt().toInt(),
  body('name').optional().isString(),
  body('species').optional().isString(),
  body('breed').optional().isString(),
  body('bloodType').optional().isString(),
  body('mrn').optional().isString(),
  validate
], async (req, res) => {
  try {
    const { id } = req.params;
    const { name, species, breed, bloodType, mrn } = req.body;

    // Check if patient exists
    const checkStmt = db.prepare('SELECT * FROM patients WHERE id = ?');
    const existingPatient = checkStmt.get(id);

    if (!existingPatient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    // Build update query
    let query = 'UPDATE patients SET updatedAt = datetime(\'now\')';
    const params = [];

    if (name !== undefined) {
      query += ', name = ?';
      params.push(name);
    }

    if (species !== undefined) {
      query += ', species = ?';
      params.push(species);
    }

    if (breed !== undefined) {
      query += ', breed = ?';
      params.push(breed);
    }

    if (bloodType !== undefined) {
      query += ', bloodType = ?';
      params.push(bloodType);
    }

    if (mrn !== undefined) {
      query += ', mrn = ?';
      params.push(mrn);
    }

    query += ' WHERE id = ?';
    params.push(id);

    // Execute update
    const updateStmt = db.prepare(query);
    updateStmt.run(...params);

    // Fetch updated patient
    const getStmt = db.prepare('SELECT * FROM patients WHERE id = ?');
    const updatedPatient = getStmt.get(id);
    
    // Emit event for real-time updates
    await emitPatientUpdated(updatedPatient);
    await emitPatientsUpdated();

    res.json(updatedPatient);
  } catch (error) {
    console.error('Error updating patient:', error);
    res.status(500).json({ error: 'Failed to update patient' });
  }
});

// Delete a patient
router.delete('/:id', [
  param('id').isInt().toInt(),
  validate
], async (req, res) => {
  try {
    const { id } = req.params;

    // Check if patient exists
    const checkStmt = db.prepare('SELECT * FROM patients WHERE id = ?');
    const existingPatient = checkStmt.get(id);

    if (!existingPatient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    // Delete patient
    const deleteStmt = db.prepare('DELETE FROM patients WHERE id = ?');
    deleteStmt.run(id);
    
    // Emit event for real-time updates
    await emitPatientDeleted(id);
    await emitPatientsUpdated();

    res.json({ message: 'Patient deleted successfully' });
  } catch (error) {
    console.error('Error deleting patient:', error);
    res.status(500).json({ error: 'Failed to delete patient' });
  }
});

// Batch operation endpoint for multiple patients
router.post('/batch', [
  body('operations').isArray(),
  body('operations.*.operation').isIn(['create', 'update', 'delete']),
  body('operations.*.patient').optional(),
  body('operations.*.id').optional().isInt(),
  validate
], async (req, res) => {
  const { operations } = req.body;
  
  try {
    // Start transaction
    db.prepare('BEGIN TRANSACTION').run();
    
    const results = [];
    let hasChanges = false;
    
    for (const op of operations) {
      try {
        switch (op.operation) {
          case 'create': {
            const { name, species, breed, bloodType, mrn } = op.patient;
            
            if (!name || !species) {
              results.push({ 
                operation: op.operation, 
                success: false, 
                error: 'Missing required fields' 
              });
              continue;
            }
            
            const stmt = db.prepare(`
              INSERT INTO patients (name, species, breed, bloodType, mrn, createdAt, updatedAt)
              VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
            `);
            
            const result = stmt.run(
              name, 
              species, 
              breed || null, 
              bloodType || null, 
              mrn || null
            );
            
            // Fetch created patient
            const getStmt = db.prepare('SELECT * FROM patients WHERE id = ?');
            const newPatient = getStmt.get(result.lastInsertRowid);
            
            results.push({ 
              operation: op.operation, 
              success: true, 
              data: newPatient 
            });
            
            hasChanges = true;
            break;
          }
          
          case 'update': {
            const { id } = op;
            const updateData = op.patient;
            
            if (!id) {
              results.push({ 
                operation: op.operation, 
                success: false, 
                error: 'Missing ID for update operation' 
              });
              continue;
            }
            
            // Check if patient exists
            const checkStmt = db.prepare('SELECT * FROM patients WHERE id = ?');
            const existingPatient = checkStmt.get(id);
            
            if (!existingPatient) {
              results.push({ 
                operation: op.operation, 
                success: false, 
                error: 'Patient not found', 
                id 
              });
              continue;
            }
            
            // Build update query
            let query = 'UPDATE patients SET updatedAt = datetime(\'now\')';
            const params = [];
            
            for (const [key, value] of Object.entries(updateData)) {
              if (['name', 'species', 'breed', 'bloodType', 'mrn'].includes(key)) {
                query += `, ${key} = ?`;
                params.push(value);
              }
            }
            
            query += ' WHERE id = ?';
            params.push(id);
            
            // Execute update
            const updateStmt = db.prepare(query);
            updateStmt.run(...params);
            
            // Fetch updated patient
            const getStmt = db.prepare('SELECT * FROM patients WHERE id = ?');
            const updatedPatient = getStmt.get(id);
            
            results.push({ 
              operation: op.operation, 
              success: true, 
              data: updatedPatient 
            });
            
            hasChanges = true;
            break;
          }
          
          case 'delete': {
            const { id } = op;
            
            if (!id) {
              results.push({ 
                operation: op.operation, 
                success: false, 
                error: 'Missing ID for delete operation' 
              });
              continue;
            }
            
            // Check if patient exists
            const checkStmt = db.prepare('SELECT * FROM patients WHERE id = ?');
            const existingPatient = checkStmt.get(id);
            
            if (!existingPatient) {
              results.push({ 
                operation: op.operation, 
                success: false, 
                error: 'Patient not found', 
                id 
              });
              continue;
            }
            
            // Delete patient
            const deleteStmt = db.prepare('DELETE FROM patients WHERE id = ?');
            deleteStmt.run(id);
            
            results.push({ 
              operation: op.operation, 
              success: true, 
              id 
            });
            
            hasChanges = true;
            break;
          }
        }
      } catch (opError) {
        results.push({ 
          operation: op.operation, 
          success: false, 
          error: opError.message 
        });
      }
    }
    
    // Commit transaction
    db.prepare('COMMIT').run();
    
    // Emit event if any changes were made
    if (hasChanges) {
      await emitPatientsUpdated();
    }
    
    res.json({
      success: true,
      results
    });
  } catch (error) {
    // Rollback transaction on error
    db.prepare('ROLLBACK').run();
    
    console.error('Error in batch operation:', error);
    res.status(500).json({ error: 'Failed to process batch operation' });
  }
});

module.exports = router;