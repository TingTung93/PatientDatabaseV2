import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import process from 'process';
import logger from './utils/logger.js';

// ESM equivalent for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Load correct .env file based on NODE_ENV ---
const nodeEnv = process.env.NODE_ENV || 'development';
const envPath = path.resolve(__dirname, `../config/env/.env.${nodeEnv}`);
const defaultEnvPath = path.resolve(__dirname, '../config/env/.env');

if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
  logger.info(`Loaded environment variables from: ${envPath}`);
} else if (fs.existsSync(defaultEnvPath)) {
  dotenv.config({ path: defaultEnvPath });
  logger.info(`Loaded environment variables from: ${defaultEnvPath}`);
} else {
  logger.warn(`No .env file found at ${envPath} or ${defaultEnvPath}. Using default/system environment variables.`);
  // dotenv.config(); // Load default .env if needed, or rely on system vars
}
// ------------------------------------------------

// Now import other modules that might depend on environment variables
import express from 'express';
import cors from 'cors';
import http from 'http';
import { Server } from 'socket.io';
import { db, initializeDatabase as initializePgPool, pool } from './database/init.js';
import { initializeSequelize, getSequelize, Sequelize } from './database/db.js';
import { initializeModels } from './database/models/index.js';
import eventSystem from './events/HybridEventSystem.js';
import ocrService from './services/ocrService.js';
import { getInstance as getWebSocketService } from './services/WebSocketService.js';

// Import Routers
import patientsRouter from './routes/patients.js';
import cautionCardsRouter from './routes/caution-cards.js';
import reportsRouter from './routes/reports.js';
import testRouter from './routes/test.js';

// Create Express app
const app = express();

// Define allowed origins
const allowedOrigins = [
    process.env.FRONTEND_URL || 'http://localhost:5173',
    'http://localhost:3000'
];

// Middleware setup
app.use(cors({
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) === -1) {
            const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
            return callback(new Error(msg), false);
        }
        return callback(null, true);
    },
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Create upload directories if they don't exist
const uploadDirs = [
    path.join(__dirname, '../uploads'),
    path.join(__dirname, '../uploads/caution-cards'),
    path.join(__dirname, '../uploads/reports')
];

uploadDirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// API v1 routes
const apiV1Router = express.Router();
app.use('/api/v1', apiV1Router);

apiV1Router.use('/patients', patientsRouter);
apiV1Router.use('/caution-cards', cautionCardsRouter);
apiV1Router.use('/reports', reportsRouter);
apiV1Router.use('/test', testRouter);

// Serve static files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use(express.static(path.join(__dirname, '../public')));

// Root route
app.get('/', (req, res) => {
    res.json({
        message: 'Patient Information System API',
        version: '1.0.0'
    });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        message: 'Service is running',
        database: db.sequelize ? 'connected' : 'disconnected',
        ocr: ocrService.isReady ? 'ready' : 'not ready',
        websocket: eventSystem.isInitialized ? 'connected' : 'disconnected'
    });
});

// Error handling middleware
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => { // Express requires 4th param for error handlers
    logger.error('Unhandled error:', err);
    res.status(err.statusCode || 500).json({
        status: 'error',
        message: err.message || 'Internal server error'
    });
});

async function startServer() {
    try {
        // Step 1a: Initialize Sequelize (reads loaded env vars)
        logger.info('Initializing Sequelize...');
        const sequelize = initializeSequelize(); // Call the initialization function
        if (!sequelize) {
            throw new Error('Sequelize initialization failed. Check logs and .env configuration.');
        }

        // Step 1b: Initialize Sequelize Models (after sequelize instance exists)
        logger.info('Initializing Sequelize models...');
        initializeModels(sequelize); // Pass the instance to the models
        logger.info('Sequelize models initialized successfully');
        
        // Step 1c: Sync Sequelize models (after they are initialized)
        try {
            await sequelize.sync({ alter: true });
            logger.info('Database models synced successfully');
        } catch (syncError) {
            logger.error('Error syncing database models:', syncError);
            throw syncError;
        }

        // Step 1d: Initialize pg Pool & SQLite (reads loaded env vars)
        logger.info('Initializing PG Pool and SQLite...');
        await initializePgPool(); // Renamed to avoid conflict
        logger.info('PG Pool and SQLite initialized successfully');

        // Step 2: Create HTTP server
        const server = http.createServer(app);
        
        // Step 3: Initialize WebSocket service
        getWebSocketService(server);
        logger.info('WebSocket service initialized');

        // Step 4: Initialize event system
        await eventSystem.initialize(new Server(server, {
            cors: {
                origin: allowedOrigins,
                methods: ['GET', 'POST'],
                credentials: true
            }
        }));
        logger.info('Event system initialized');

        // Step 5: Initialize OCR service
        logger.info('Initializing OCR service...');
        await ocrService.initialize();
        logger.info('OCR service initialized successfully');

        // Step 6: Start the server
        const port = process.env.PORT || 5000;
        server.listen(port, () => {
            logger.info(`Server running on port ${port}`);
            logger.info('All services initialized successfully');
        });

        // Handle graceful shutdown
        const shutdown = async () => {
            logger.info('Starting graceful shutdown...');
            
            // Shutdown services in reverse order
            await ocrService.shutdown();
            logger.info('OCR service shut down');
            
            // Correctly close the WebSocket server (part of eventSystem)
            if (eventSystem.io) {
                eventSystem.io.close((err) => {
                    if (err) {
                        logger.error('Error closing WebSocket server:', err);
                    } else {
                        logger.info('WebSocket server closed');
                    }
                });
            }
            // There is no explicit eventSystem.shutdown() method
            logger.info('Event system shutdown initiated (via WebSocket close)');
            
            server.close(() => {
                logger.info('HTTP server closed');
                process.exit(0);
            });
        };

        process.on('SIGTERM', shutdown);
        process.on('SIGINT', shutdown);

    } catch (error) {
        logger.error('Failed to start server:', error);
        process.exit(1);
    }
}

// Start the server
startServer();

// Export the app and potentially the initialized sequelize instance if needed elsewhere immediately
export { app, getSequelize }; // Export getSequelize instead of the instance directly