import dotenv from 'dotenv';
dotenv.config();

export default {
    server: {
        port: process.env.PORT || 3000,
        cors: {
            allowedOrigins: process.env.CORS_ALLOWED_ORIGINS || '*'
        }
    },
    database: {
        path: process.env.DB_PATH || 'database.sqlite',
        logging: process.env.DB_LOGGING === 'true'
    },
    jwt: {
        secret: process.env.JWT_SECRET || 'your-secret-key',
        expiresIn: process.env.JWT_EXPIRATION || '24h'
    },
    upload: {
        maxFileSize: process.env.MAX_FILE_SIZE || '10mb',
        allowedTypes: ['application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    },
    LOG_LEVEL: process.env.LOG_LEVEL || 'info',
    LOG_TO_FILE: process.env.LOG_TO_FILE === 'true',
    LOG_FILENAME: process.env.LOG_FILENAME || 'logs/app.log'
};
