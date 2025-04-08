const express = require('express');

const router = express.Router();
const { Patient, TransfusionRequirement } = require('../src/database/models');
const asyncHandler = require('../src/utils/asyncHandler');
const { isBloodTypeCompatible } = require('../src/utils/bloodTypeValidator');

// Create new transfusion requirement
router.post('/', asyncHandler(async (req, res) => {
    try {
        // Validate required fields
        const requiredFields = ['patientId', 'bloodTypeRequired', 'unitsRequired', 'urgencyLevel', 'requiredByDate'];
        const missingFields = requiredFields.filter(field => !req.body[field]);

        if (missingFields.length > 0) {
            return res.status(400).json({
                status: 'error',
                message: `Missing required fields: ${missingFields.join(', ')}`
            });
        }

        // Get patient's blood type to validate compatibility
        const patient = await Patient.findById(req.body.patientId);

        if (!patient) {
            return res.status(404).json({
                status: 'error',
                message: 'Patient not found'
            });
        }

        // Validate blood type compatibility
        if (!isBloodTypeCompatible(patient.bloodType, req.body.bloodTypeRequired)) {
            return res.status(400).json({
                status: 'error',
                message: `Incompatible blood type: ${req.body.bloodTypeRequired} is not compatible with patient blood type ${patient.bloodType}`
            });
        }

        const transfusionData = {
            patientId: req.body.patientId,
            bloodTypeRequired: req.body.bloodTypeRequired,
            unitsRequired: req.body.unitsRequired,
            urgencyLevel: req.body.urgencyLevel,
            requiredByDate: req.body.requiredByDate,
            status: req.body.status,
            notes: req.body.notes
        };

        // Use Mongoose to create a new transfusion requirement
        const transfusion = new TransfusionRequirement(transfusionData);
        await transfusion.save();

        res.status(201).json({
            status: 'success',
            data: transfusion
        });
    } catch (error) {
        console.error('Error creating transfusion requirement:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to create transfusion requirement',
            error: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
}));

// Get all transfusion requirements for a patient
router.get('/patient/:patientId', asyncHandler(async (req, res) => {
    try {
        const patientId = req.params.patientId;

        // Use Mongoose to get all transfusion requirements for a patient
        const transfusions = await TransfusionRequirement.find({ patientId: patientId });

        res.json({
            status: 'success',
            data: transfusions
        });
    } catch (error) {
        console.error('Error getting transfusion requirements:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch transfusion requirements',
            error: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
}));

// Get single transfusion requirement
router.get('/:id', asyncHandler(async (req, res) => {
    try {
        const transfusionId = req.params.id;

        // Use Mongoose to get a single transfusion requirement
        const transfusion = await TransfusionRequirement.findById(transfusionId).populate('patientId', 'firstName lastName');

        if (!transfusion) {
            return res.status(404).json({
                status: 'error',
                message: 'Transfusion requirement not found'
            });
        }

        res.json({
            status: 'success',
            data: transfusion
        });
    } catch (error) {
        console.error('Error getting transfusion requirement:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch transfusion requirement',
            error: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
}));

// Update transfusion requirement
router.put('/:id', asyncHandler(async (req, res) => {
    try {
        const transfusionId = req.params.id;

        const transfusionData = {
            patientId: req.body.patientId,
            bloodTypeRequired: req.body.bloodTypeRequired,
            unitsRequired: req.body.unitsRequired,
            urgencyLevel: req.body.urgencyLevel,
            requiredByDate: req.body.requiredByDate,
            status: req.body.status,
            notes: req.body.notes
        };

        // Use Mongoose to update a transfusion requirement
        const transfusion = await TransfusionRequirement.findByIdAndUpdate(transfusionId, transfusionData, { new: true });

        if (!transfusion) {
            return res.status(404).json({
                status: 'error',
                message: 'Transfusion requirement not found'
            });
        }

        res.json({
            status: 'success',
            data: transfusion
        });
    } catch (error) {
        console.error('Error updating transfusion requirement:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to update transfusion requirement',
            error: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
}));

// Delete transfusion requirement
router.delete('/:id', asyncHandler(async (req, res) => {
    try {
        const transfusionId = req.params.id;

        // Use Mongoose to "soft delete" a transfusion requirement
        const transfusion = await TransfusionRequirement.findByIdAndUpdate(transfusionId, { deletedAt: new Date() }, { new: true });

        if (!transfusion) {
            return res.status(404).json({
                status: 'error',
                message: 'Transfusion requirement not found'
            });
        }

        res.status(204).end();
    } catch (error) {
        console.error('Error deleting transfusion requirement:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to delete transfusion requirement',
            error: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
}));

module.exports = router;