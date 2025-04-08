const express = require('express');

const router = express.Router();
const { TransfusionRequirement } = require('../database/models');
const authenticateToken = require('../middleware/auth');
const { validateBloodType } = require('../utils/bloodTypeValidator');

// Create a new transfusion requirement
router.post('/', authenticateToken, async (req, res) => {
    try {
        const {
            patient_id,
            blood_type_required,
            units_required,
            urgency_level,
            required_by_date,
            notes
        } = req.body;

        // Validate required fields
        if (!patient_id || !blood_type_required || !units_required || !urgency_level || !required_by_date) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Validate blood type
        if (!validateBloodType(blood_type_required)) {
            return res.status(400).json({ error: 'Invalid blood type' });
        }

        // Create transfusion requirement
        const transfusion = await TransfusionRequirement.create({
            patient_id,
            blood_type_required,
            units_required,
            urgency_level,
            required_by_date,
            notes,
            created_by: req.user.id,
            updated_by: req.user.id
        });

        res.status(201).json(transfusion);
    } catch (error) {
        console.error('Error creating transfusion requirement:', error);
        res.status(500).json({ error: 'Failed to create transfusion requirement' });
    }
});

// Get transfusion requirements for a specific patient
router.get('/patient/:patientId', authenticateToken, async (req, res) => {
    try {
        const { patientId } = req.params;
        const transfusions = await TransfusionRequirement.findAll({
            where: { patient_id: patientId }
        });
        res.json(transfusions);
    } catch (error) {
        console.error('Error fetching transfusion requirements:', error);
        res.status(500).json({ error: 'Failed to fetch transfusion requirements' });
    }
});

// Get a specific transfusion requirement
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const transfusion = await TransfusionRequirement.findByPk(req.params.id);
        if (!transfusion) {
            return res.status(404).json({ error: 'Transfusion requirement not found' });
        }
        res.json(transfusion);
    } catch (error) {
        console.error('Error fetching transfusion requirement:', error);
        res.status(500).json({ error: 'Failed to fetch transfusion requirement' });
    }
});

// Update a transfusion requirement
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const transfusion = await TransfusionRequirement.findByPk(req.params.id);
        if (!transfusion) {
            return res.status(404).json({ error: 'Transfusion requirement not found' });
        }

        const {
            blood_type_required,
            units_required,
            urgency_level,
            required_by_date,
            status,
            notes
        } = req.body;

        // Validate blood type if provided
        if (blood_type_required && !validateBloodType(blood_type_required)) {
            return res.status(400).json({ error: 'Invalid blood type' });
        }

        // Update transfusion requirement
        await transfusion.update({
            blood_type_required,
            units_required,
            urgency_level,
            required_by_date,
            status,
            notes,
            updated_by: req.user.id
        });

        res.json(transfusion);
    } catch (error) {
        console.error('Error updating transfusion requirement:', error);
        res.status(500).json({ error: 'Failed to update transfusion requirement' });
    }
});

// Delete a transfusion requirement
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const transfusion = await TransfusionRequirement.findByPk(req.params.id);
        if (!transfusion) {
            return res.status(404).json({ error: 'Transfusion requirement not found' });
        }

        // Only allow admins to delete transfusion requirements
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Not authorized to delete transfusion requirements' });
        }

        await transfusion.destroy();
        res.json({ message: 'Transfusion requirement deleted successfully' });
    } catch (error) {
        console.error('Error deleting transfusion requirement:', error);
        res.status(500).json({ error: 'Failed to delete transfusion requirement' });
    }
});

module.exports = router; 