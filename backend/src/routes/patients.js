import express from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { db } from '../database/init.js'; // Assume this uses ES modules now
import { ValidationError, NotFoundError } from '../utils/errors.js';
import { emitPatientCreated, emitPatientUpdated, emitPatientDeleted, emitPatientsUpdated } from '../events/index.js'; // Assume this uses ES modules

const router = express.Router();

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

// Update an existing patient
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
    const updates = req.body;

    // Check if patient exists
    const checkStmt = db.prepare('SELECT * FROM patients WHERE id = ?');
    const patient = checkStmt.get(id);

    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    // Build update query dynamically
    const fields = [];
    const params = [];
    for (const [key, value] of Object.entries(updates)) {
      // Only allow updating specific fields
      if (['name', 'species', 'breed', 'bloodType', 'mrn'].includes(key)) {
        fields.push(`${key} = ?`);
        params.push(value);
      }
    }

    if (fields.length === 0) {
      return res.status(400).json({ error: 'No valid fields provided for update' });
    }

    // Add updatedAt field
    fields.push('updatedAt = datetime(\'now\')');
    params.push(id); // Add ID for WHERE clause

    const stmt = db.prepare(`UPDATE patients SET ${fields.join(', ')} WHERE id = ?`);
    stmt.run(...params);

    // Fetch updated patient
    const getStmt = db.prepare('SELECT * FROM patients WHERE id = ?');
    const updatedPatient = getStmt.get(id);

    // Emit event
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
    const checkStmt = db.prepare('SELECT id FROM patients WHERE id = ?');
    const patient = checkStmt.get(id);

    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const stmt = db.prepare('DELETE FROM patients WHERE id = ?');
    const result = stmt.run(id);

    if (result.changes > 0) {
      // Emit event
      await emitPatientDeleted(id);
      await emitPatientsUpdated();
      res.status(204).send(); // No Content
    } else {
      // Should not happen if check passed, but for safety
      res.status(404).json({ error: 'Patient not found' });
    }
  } catch (error) {
    console.error('Error deleting patient:', error);
    res.status(500).json({ error: 'Failed to delete patient' });
  }
});

// Get HPO suggestions based on search term
router.get('/hpo-suggestions', [
  query('term').notEmpty().isString().isLength({ min: 3 })
], async (req, res) => {
  try {
    const { term } = req.query;
    const stmt = db.prepare(`
      SELECT id, name, definition FROM hpo_terms
      WHERE name LIKE ? OR synonyms LIKE ?
      LIMIT 10
    `);
    const suggestions = stmt.all(`%${term}%`, `%${term}%`);
    res.json(suggestions);
  } catch (error) {
    console.error('Error fetching HPO suggestions:', error);
    res.status(500).json({ error: 'Failed to fetch HPO suggestions' });
  }
});

// Get patient by MRN
router.get('/mrn/:mrn', [
  param('mrn').notEmpty().isString(),
  validate
], async (req, res) => {
  try {
    const { mrn } = req.params;
    const stmt = db.prepare('SELECT * FROM patients WHERE mrn = ?');
    const patient = stmt.get(mrn);
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found with the given MRN' });
    }
    res.json(patient);
  } catch (error) {
    console.error('Error fetching patient by MRN:', error);
    res.status(500).json({ error: 'Failed to fetch patient by MRN' });
  }
});

// Add a phenotype to a patient
router.post('/:patientId/phenotypes', [
  param('patientId').isInt().toInt(),
  body('hpoId').notEmpty().isString(),
  validate
], async (req, res) => {
  try {
    const { patientId } = req.params;
    const { hpoId } = req.body;

    // Check if patient exists
    const patientStmt = db.prepare('SELECT id FROM patients WHERE id = ?');
    if (!patientStmt.get(patientId)) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    // Check if HPO term exists
    const hpoStmt = db.prepare('SELECT id FROM hpo_terms WHERE id = ?');
    if (!hpoStmt.get(hpoId)) {
      return res.status(404).json({ error: 'HPO term not found' });
    }

    // Check for existing association
    const checkStmt = db.prepare('SELECT * FROM patient_phenotypes WHERE patient_id = ? AND hpo_id = ?');
    if (checkStmt.get(patientId, hpoId)) {
      return res.status(409).json({ error: 'Phenotype already associated with this patient' });
    }

    // Add association
    const insertStmt = db.prepare('INSERT INTO patient_phenotypes (patient_id, hpo_id) VALUES (?, ?)');
    insertStmt.run(patientId, hpoId);

    // Fetch updated patient data (or just the phenotypes)
    const phenotypesStmt = db.prepare(`
      SELECT ht.id, ht.name FROM hpo_terms ht
      JOIN patient_phenotypes pp ON ht.id = pp.hpo_id
      WHERE pp.patient_id = ?
    `);
    const phenotypes = phenotypesStmt.all(patientId);
    
    // Optionally emit an update event
    await emitPatientsUpdated(); // Could refine to update just this patient

    res.status(201).json(phenotypes);

  } catch (error) {
    console.error('Error adding phenotype to patient:', error);
    res.status(500).json({ error: 'Failed to add phenotype' });
  }
});

// Remove a phenotype from a patient
router.delete('/:patientId/phenotypes/:hpoId', [
  param('patientId').isInt().toInt(),
  param('hpoId').notEmpty().isString(),
  validate
], async (req, res) => {
  try {
    const { patientId, hpoId } = req.params;

    const stmt = db.prepare('DELETE FROM patient_phenotypes WHERE patient_id = ? AND hpo_id = ?');
    const result = stmt.run(patientId, hpoId);

    if (result.changes > 0) {
      // Optionally emit an update event
      await emitPatientsUpdated(); // Could refine to update just this patient
      res.status(204).send();
    } else {
      res.status(404).json({ error: 'Phenotype association not found' });
    }
  } catch (error) {
    console.error('Error removing phenotype from patient:', error);
    res.status(500).json({ error: 'Failed to remove phenotype' });
  }
});

// Get phenotypes for a specific patient
router.get('/:patientId/phenotypes', [
  param('patientId').isInt().toInt(),
  validate
], async (req, res) => {
  try {
    const { patientId } = req.params;
    
    // Check if patient exists
    const patientStmt = db.prepare('SELECT id FROM patients WHERE id = ?');
    if (!patientStmt.get(patientId)) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const stmt = db.prepare(`
      SELECT ht.id, ht.name, ht.definition FROM hpo_terms ht
      JOIN patient_phenotypes pp ON ht.id = pp.hpo_id
      WHERE pp.patient_id = ?
    `);
    const phenotypes = stmt.all(patientId);
    res.json(phenotypes);
  } catch (error) {
    console.error('Error fetching phenotypes for patient:', error);
    res.status(500).json({ error: 'Failed to fetch phenotypes' });
  }
});

export default router;