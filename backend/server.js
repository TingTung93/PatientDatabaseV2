import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import process from 'node:process'; // Import the process object

import express from 'express';
import winston from 'winston';
import cors from 'cors';
import helmet from 'helmet'; // Import helmet
import rateLimit from 'express-rate-limit'; // Import express-rate-limit
import database from './database/db.js';
import ocrRoutes from './routes/ocr.js';
import reportsRoutes from './routes/reports.js';
import patientRoutes from './routes/patients.js'; // Added import for patient routes
const __filename = fileURLToPath(import.meta.url); // ES Module equivalent for __filename
const __dirname = path.dirname(__filename); // ES Module equivalent for __dirname

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

// Configure winston logger for server
const logger = winston.createLogger({
  level: 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    new winston.transports.File({ 
      filename: path.join(logsDir, 'frontend-server.log')
    })
  ]
});

const app = express();

// CORS configuration
const corsOptions = {
  origin: process.env.FRONTEND_URL || ['http://localhost:5173', 'http://localhost:3000'],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};

// Enable CORS
app.use(cors(corsOptions));

// Apply security headers with Helmet
app.use(helmet());

// Apply rate limiting
const limiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
	standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
	legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: 'Too many requests from this IP, please try again after 15 minutes', // Custom message
});
app.use(limiter);


// Parse JSON and urlencoded bodies
app.use(express.json({ limit: '10mb' })); // Increase JSON payload limit if needed, e.g., for base64 uploads (adjust as necessary)
app.use(express.urlencoded({ extended: true, limit: '10mb' })); // Increase URL-encoded payload limit

// Debug middleware to log all requests
app.use((req, res, next) => {
  logger.debug(`${req.method} ${req.url}`);
  next();
});

// Routes and middleware are mounted inside startServer()

const port = process.env.PORT || 5000;

// --- Async Startup Function ---
async function startServer() {
  try {
    // Initialize database BEFORE mounting routes
    logger.info('Initializing database...');
    await database.initialize(process.env.DB_PASSWORD); // Use env var for password if needed
    logger.info('Database initialized successfully.');

    // Mount routes (now that DB is ready)
    logger.info('Mounting OCR routes at /api/v1/caution-cards');
    app.use('/api/v1/caution-cards', ocrRoutes);

    logger.info('Mounting Reports routes at /api/v1/reports');
    app.use('/api/v1/reports', reportsRoutes);

    logger.info('Mounting Patient routes at /api/v1/patients'); // Added patient route mounting
    app.use('/api/v1/patients', patientRoutes); // Added patient route mounting

    // Serve static files from the frontend build directory (Corrected path)
    app.use(express.static(path.join(__dirname, '../frontend-storybook/patient-ui/build')));

    // Health check endpoint
    app.get('/health', (req, res) => {
      res.status(200).json({ status: 'healthy' });
    });

    // Error handling middleware
    app.use((err, req, res) => { // Removed unused 'next' parameter
      logger.error('Error:', err);
      res.status(err.statusCode || 500).json({ // Use status code from error if available
        error: err.name || 'Error',
        message: err.message
      });
    });

    // Serve index.html for all other routes (SPA support) - MUST be last route handler
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, '../frontend-storybook/patient-ui/build', 'index.html'));
    });

    // Start server
    app.listen(port, () => {
      logger.info(`Server is running on port ${port}`);
      logger.info(`Logs are being written to: ${path.join(logsDir, 'frontend.log')}`); // Check if this log file name is correct
      logger.info(`Server logs are being written to: ${path.join(logsDir, 'frontend-server.log')}`);
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1); // Exit if server fails to start
  }
}

// --- Global Error Handlers ---
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  // Consider shutting down gracefully here in production
  // process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
   // Consider shutting down gracefully here in production
  // process.exit(1);
});

// --- Start the Server ---
startServer();