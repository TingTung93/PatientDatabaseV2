import express from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { db } from '../database/init.js'; // Assume this uses ES modules now
import { ValidationError, NotFoundError } from '../utils/errors.js';
import { emitPatientCreated, emitPatientUpdated, emitPatientDeleted, emitPatientsUpdated } from '../events/index.js'; // Assume this uses ES modules
import { adaptPatientForFrontend, adaptPatientsForFrontend } from '../utils/data-adapters.js';

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
      query += ' AND (first_name LIKE ? OR last_name LIKE ?)';
      params.push(`%${name}%`);
      params.push(`%${name}%`);
    }

    if (species) {
      query += ' AND species = ?';
      params.push(species);
    }

    if (bloodType) {
      query += ' AND blood_type = ?';
      params.push(bloodType);
    }

    if (breed) {
      query += ' AND breed = ?';
      params.push(breed);
    }

    // Get total count for pagination
    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as count');
    const countResult = await db.instance.get(countQuery, params);
    const count = countResult.count;

    // Add pagination
    query += ' ORDER BY first_name LIMIT ? OFFSET ?';
    params.push(limit, offset);

    // Execute query
    const patients = await db.instance.all(query, params);

    // Adapt data for frontend
    const adaptedPatients = adaptPatientsForFrontend(patients);

    res.json({
      data: adaptedPatients,
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
      query += ' AND (first_name LIKE ? OR last_name LIKE ?)';
      params.push(`%${name}%`);
      params.push(`%${name}%`);
    }
    
    if (mrn) {
      query += ' AND mrn = ?';
      params.push(mrn);
    }
    
    if (bloodType) {
      query += ' AND blood_type = ?';
      params.push(bloodType);
    }
    
    if (dateStart) {
      query += ' AND created_at >= ?';
      params.push(dateStart);
    }
    
    if (dateEnd) {
      query += ' AND created_at <= ?';
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
    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as count');
    const countResult = await db.instance.get(countQuery, params);
    const count = countResult.count;
    
    // Add sorting
    if (sortBy) {
      const direction = sortDir === 'desc' ? 'DESC' : 'ASC';
      // Sanitize the column name to prevent SQL injection
      const columnMap = {
        'name': 'first_name',
        'bloodType': 'blood_type',
        'createdAt': 'created_at',
        'updatedAt': 'updated_at'
      };
      
      const allowedSortColumns = ['name', 'mrn', 'bloodType', 'species', 'breed', 'createdAt', 'updatedAt'];
      if (allowedSortColumns.includes(sortBy)) {
        // Map the frontend column name to the actual database column name
        const dbColumnName = columnMap[sortBy] || sortBy;
        query += ` ORDER BY ${dbColumnName} ${direction}`;
      } else {
        query += ' ORDER BY first_name ASC';
      }
    } else {
      query += ' ORDER BY first_name ASC';
    }
    
    // Add pagination
    query += ' LIMIT ? OFFSET ?';
    params.push(limit, offset);
    
    // Execute query
    const patients = await db.instance.all(query, params);
    
    // Adapt data for frontend
    const adaptedPatients = adaptPatientsForFrontend(patients);
    
    res.json({
      data: adaptedPatients,
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
  param('id').notEmpty().withMessage('Patient ID is required'),
  validate
], async (req, res) => {
  try {
    const { id } = req.params;

    // Try to find patient by ID first (numeric ID)
    let patient = null;
    
    if (/^\d+$/.test(id)) {
      // If ID is numeric, search by numeric ID
      patient = await db.instance.get('SELECT * FROM patients WHERE id = ?', [id]);
    }
    
    // If not found, try to find by medical_record_number
    if (!patient) {
      patient = await db.instance.get('SELECT * FROM patients WHERE medical_record_number = ?', [id]);
    }
    
    // If still not found and the column 'mrn' exists, try that too (for backward compatibility)
    if (!patient) {
      // Check if mrn column exists in the patients table
      const tableInfo = await db.instance.all('PRAGMA table_info(patients)');
      const hasMrn = tableInfo.some(column => column.name === 'mrn');
      
      if (hasMrn) {
        patient = await db.instance.get('SELECT * FROM patients WHERE mrn = ?', [id]);
      }
    }

    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    // Adapt data for frontend
    const adaptedPatient = adaptPatientForFrontend(patient);

    res.json(adaptedPatient);
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
    
    // Split name into first_name and last_name (assuming format is "First Last")
    let firstName = name;
    let lastName = '';
    
    if (name.includes(' ')) {
      const nameParts = name.split(' ');
      firstName = nameParts[0];
      lastName = nameParts.slice(1).join(' ');
    }

    const query = `
      INSERT INTO patients (first_name, last_name, species, breed, blood_type, mrn, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `;
    const params = [firstName, lastName, species, breed || null, bloodType || null, mrn || null];

    const result = await db.instance.run(query, params);
    
    // Fetch the created patient
    const newPatient = await db.instance.get('SELECT * FROM patients WHERE id = ?', [result.lastID]);

    // Adapt data for frontend
    const adaptedPatient = adaptPatientForFrontend(newPatient);

    // Emit event for real-time updates
    await emitPatientCreated(adaptedPatient);
    await emitPatientsUpdated();
    
    res.status(201).json(adaptedPatient);
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
    const { name, species, breed, bloodType, mrn } = req.body;

    // Check if patient exists
    const patient = await db.instance.get('SELECT * FROM patients WHERE id = ?', [id]);
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    // Build update query
    const fields = [];
    const params = [];

    if (name !== undefined) {
      if (name.includes(' ')) {
        const nameParts = name.split(' ');
        fields.push('first_name = ?');
        params.push(nameParts[0]);
        fields.push('last_name = ?');
        params.push(nameParts.slice(1).join(' '));
      } else {
        fields.push('first_name = ?');
        params.push(name);
        fields.push('last_name = ?');
        params.push('');
      }
    }

    if (species !== undefined) {
      fields.push('species = ?');
      params.push(species);
    }

    if (breed !== undefined) {
      fields.push('breed = ?');
      params.push(breed);
    }

    if (bloodType !== undefined) {
      fields.push('blood_type = ?');
      params.push(bloodType);
    }

    if (mrn !== undefined) {
      fields.push('mrn = ?');
      params.push(mrn);
    }

    // Always update updatedAt
    fields.push("updated_at = datetime('now')");

    // If nothing to update, return original
    if (fields.length === 1) { // only updatedAt
      const adaptedPatient = adaptPatientForFrontend(patient);
      res.json(adaptedPatient);
      return;
    }

    params.push(id); // Add ID for WHERE clause

    const query = `UPDATE patients SET ${fields.join(', ')} WHERE id = ?`;
    await db.instance.run(query, params);

    // Fetch updated patient
    const updatedPatient = await db.instance.get('SELECT * FROM patients WHERE id = ?', [id]);

    // Adapt data for frontend
    const adaptedPatient = adaptPatientForFrontend(updatedPatient);

    // Emit event for real-time updates
    await emitPatientUpdated(adaptedPatient);
    await emitPatientsUpdated();

    res.json(adaptedPatient);
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
    const patient = await db.instance.get('SELECT id FROM patients WHERE id = ?', [id]);
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    // Delete patient
    await db.instance.run('DELETE FROM patients WHERE id = ?', [id]);

    // Emit event for real-time updates
    await emitPatientDeleted(id);
    await emitPatientsUpdated();

    res.json({ message: 'Patient deleted successfully' });
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
    const query = `
      SELECT id, name, definition FROM hpo_terms
      WHERE name LIKE ? OR synonyms LIKE ?
      LIMIT 10
    `;
    const params = [`%${term}%`, `%${term}%`];
    const suggestions = await db.instance.all(query, params);
    res.json(suggestions);
  } catch (error) {
    console.error('Error fetching HPO suggestions:', error);
    res.status(500).json({ error: 'Failed to fetch HPO suggestions' });
  }
});

// Get patient by MRN
router.get('/mrn/:mrn', [
  param('mrn').isString().notEmpty(),
  validate
], async (req, res) => {
  try {
    const { mrn } = req.params;
    const patient = await db.instance.get('SELECT * FROM patients WHERE mrn = ?', [mrn]);
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    res.json(patient);
  } catch (error) {
    console.error('Error fetching patient by MRN:', error);
    res.status(500).json({ error: 'Failed to fetch patient' });
  }
});

// Search HPO Terms
router.get('/hpo/search', [
  query('term').isString().notEmpty(),
  validate
], async (req, res) => {
  try {
    const { term } = req.query;
    const query = `
      SELECT id, name, definition FROM hpo_terms
      WHERE name LIKE ? OR synonyms LIKE ?
      LIMIT 20
    `;
    const params = [`%${term}%`, `%${term}%`];
    
    const terms = await db.instance.all(query, params);
    res.json(terms);
  } catch (error) {
    console.error('Error searching HPO terms:', error);
    res.status(500).json({ error: 'Failed to search HPO terms' });
  }
});

// Add a phenotype (HPO term) to a patient
router.post('/:patientId/phenotypes/:hpoId', [
  param('patientId').isInt().toInt(),
  param('hpoId').isString().notEmpty(),
  validate
], async (req, res) => {
  try {
    const { patientId, hpoId } = req.params;

    // Check if patient exists
    const patientExists = await db.instance.get('SELECT id FROM patients WHERE id = ?', [patientId]);
    if (!patientExists) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    // Check if HPO term exists
    const hpoExists = await db.instance.get('SELECT id FROM hpo_terms WHERE id = ?', [hpoId]);
    if (!hpoExists) {
      return res.status(404).json({ error: 'HPO term not found' });
    }

    // Check for existing association
    const existingAssociation = await db.instance.get('SELECT * FROM patient_phenotypes WHERE patient_id = ? AND hpo_id = ?', [patientId, hpoId]);
    if (existingAssociation) {
      return res.status(409).json({ error: 'Phenotype already associated with this patient' });
    }

    // Add association
    await db.instance.run('INSERT INTO patient_phenotypes (patient_id, hpo_id) VALUES (?, ?)', [patientId, hpoId]);

    // Fetch updated patient data (or just the phenotypes)
    const query = `
      SELECT ht.id, ht.name FROM hpo_terms ht
      JOIN patient_phenotypes pp ON ht.id = pp.hpo_id
      WHERE pp.patient_id = ?
    `;
    const phenotypes = await db.instance.all(query, [patientId]);

    res.status(201).json({ patientId, phenotypes });
  } catch (error) {
    console.error('Error adding phenotype to patient:', error);
    res.status(500).json({ error: 'Failed to add phenotype' });
  }
});

// Remove a phenotype (HPO term) from a patient
router.delete('/:patientId/phenotypes/:hpoId', [
  param('patientId').isInt().toInt(),
  param('hpoId').isString().notEmpty(),
  validate
], async (req, res) => {
  try {
    const { patientId, hpoId } = req.params;

    await db.instance.run('DELETE FROM patient_phenotypes WHERE patient_id = ? AND hpo_id = ?', [patientId, hpoId]);

    res.json({ message: 'Phenotype removed successfully' });
  } catch (error) {
    console.error('Error removing phenotype from patient:', error);
    res.status(500).json({ error: 'Failed to remove phenotype' });
  }
});

// Get all phenotypes for a patient
router.get('/:patientId/phenotypes', [
  param('patientId').isInt().toInt(),
  validate
], async (req, res) => {
  try {
    const { patientId } = req.params;
    
    // Check if patient exists
    const patientExists = await db.instance.get('SELECT id FROM patients WHERE id = ?', [patientId]);
    if (!patientExists) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const query = `
      SELECT ht.id, ht.name, ht.definition FROM hpo_terms ht
      JOIN patient_phenotypes pp ON ht.id = pp.hpo_id
      WHERE pp.patient_id = ?
    `;
    const phenotypes = await db.instance.all(query, [patientId]);
    
    res.json(phenotypes);
  } catch (error) {
    console.error('Error fetching patient phenotypes:', error);
    res.status(500).json({ error: 'Failed to fetch phenotypes' });
  }
});

export default router;