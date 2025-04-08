const express = require('express')

const router = express.Router()
const patientRoutes = require('./patient')
const transfusionRoutes = require('./transfusion')
const trainingRoutes = require('./training')

// Health check endpoint
router.get('/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date() })
})

// API routes
const reportRoutes = require('./reports');

router.use('/patients', patientRoutes)
router.use('/transfusions', transfusionRoutes)
router.use('/reports', reportRoutes)
router.use('/training', trainingRoutes)

// 404 handler
router.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found' })
})

// Error handler
router.use((err, req, res, next) => {
    console.error(err.stack)
    res.status(500).json({ error: 'Internal server error' })
})

module.exports = router