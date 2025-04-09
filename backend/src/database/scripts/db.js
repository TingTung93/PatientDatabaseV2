import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import process from 'node:process'; // Import process
import { Buffer } from 'node:buffer'; // Import Buffer
import winston from 'winston'; // Import Winston

import bcrypt from 'bcrypt';
import sqlite3Import from 'sqlite3';

const sqlite3 = sqlite3Import.verbose();

const __filename = fileURLToPath(import.meta.url); // ES Module equivalent
// const __filename = fileURLToPath(import.meta.url); // Removed duplicate declaration
const __dirname = path.dirname(__filename);

// Setup logger for database operations
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.simple(),
    }),
    // Add file transport if needed
    // new winston.transports.File({ filename: 'logs/database.log' })
  ],
});
class Database {
    constructor() {
        this.db = null;
        this.encryptionKey = null;
        this.initialized = false;
    }

    async initialize(password = 'development') {
        // TODO: Use 'password' parameter if/when database encryption is fully implemented
        if (this.initialized) {
            logger.info('Database already initialized');
            return;
        }

        try {
            // For development, use a simple database path without encryption
            const dbPath = process.env.NODE_ENV === 'production' 
                ? path.join(__dirname, '..', 'database.sqlite')  
                : path.join(__dirname, '..', 'database.sqlite');
                
            logger.info(`Connecting to database at: ${dbPath}`);

            // Initialize SQLite database without encryption for simplicity in development
            return new Promise((resolve, reject) => {
                this.db = new sqlite3.Database(dbPath, async (err) => {
                    if (err) {
                        logger.error('Error connecting to database:', err);
                        reject(err);
                        return;
                    }

                    try {
                        logger.info('Database connection established');
                        
                        // Enable foreign keys
                        await this.run('PRAGMA foreign_keys = ON');
                        logger.info('Foreign keys enabled');

                        // Always ensure schema is applied (uses IF NOT EXISTS)
                        logger.info('Applying database schema...');
                        const schemaPath = path.join(__dirname, 'schema.sql');
                        if (!fs.existsSync(schemaPath)) {
                            throw new Error(`Schema file not found at ${schemaPath}`);
                        }
                        const schema = fs.readFileSync(schemaPath, 'utf8');
                        await this.exec(schema);
                        logger.info('Schema applied successfully');

                        // Create default admin user if no users exist
                        const users = await this.all('SELECT * FROM users');
                        if (!users || users.length === 0) {
                            logger.info('No users found, creating default admin user');
                            const salt = crypto.randomBytes(16).toString('hex');
                            const passwordHash = await bcrypt.hash('admin', 10);
                            await this.run(
                                'INSERT INTO users (username, email, password_hash, salt, role) VALUES (?, ?, ?, ?, ?)',
                                ['admin', 'admin@example.com', passwordHash, salt, 'admin']
                            );
                            logger.info('Default admin user created');
                        } else {
                            logger.info(`Found ${users.length} existing users`);
                        }

                        this.initialized = true;
                        logger.info('Database initialization complete');
                        resolve();
                    } catch (error) {
                        logger.error('Error during database initialization:', error);
                        reject(error);
                    }
                });
            });
        } catch (error) {
            logger.error('Fatal error initializing database:', error);
            throw error;
        }
    }

    encryptKey(key, password) {
        const salt = crypto.randomBytes(16);
        const derivedKey = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
        const cipher = crypto.createCipheriv('aes-256-gcm', derivedKey, salt);
        const encrypted = Buffer.concat([cipher.update(key), cipher.final()]);
        const tag = cipher.getAuthTag();
        return Buffer.concat([salt, tag, encrypted]);
    }

    decryptKey(encryptedData, password) {
        const salt = encryptedData.slice(0, 16);
        const tag = encryptedData.slice(16, 32);
        const encrypted = encryptedData.slice(32);
        const derivedKey = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
        const decipher = crypto.createDecipheriv('aes-256-gcm', derivedKey, salt);
        decipher.setAuthTag(tag);
        return Buffer.concat([decipher.update(encrypted), decipher.final()]);
    }

    encryptData(data) {
        const iv = crypto.randomBytes(12);
        const cipher = crypto.createCipheriv('aes-256-gcm', this.encryptionKey, iv);
        const encrypted = Buffer.concat([cipher.update(JSON.stringify(data)), cipher.final()]);
        const tag = cipher.getAuthTag();
        return Buffer.concat([iv, tag, encrypted]).toString('base64');
    }

    decryptData(encryptedData) {
        const data = Buffer.from(encryptedData, 'base64');
        const iv = data.slice(0, 12);
        const tag = data.slice(12, 28);
        const encrypted = data.slice(28);
        const decipher = crypto.createDecipheriv('aes-256-gcm', this.encryptionKey, iv);
        decipher.setAuthTag(tag);
        const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
        return JSON.parse(decrypted.toString());
    }

    // Database operations with encryption
    async run(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, function(err) {
                if (err) reject(err);
                else resolve(this);
            });
        });
    }

    async get(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.get(sql, params, (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    }

    async all(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    async exec(sql) {
        return new Promise((resolve, reject) => {
            this.db.exec(sql, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    // User authentication methods
    async createUser(username, password, role) {
        const salt = crypto.randomBytes(16).toString('hex');
        const passwordHash = await bcrypt.hash(password, 10);
        return this.run(
            'INSERT INTO users (username, password_hash, salt, role) VALUES (?, ?, ?, ?)',
            [username, passwordHash, salt, role]
        );
    }

    async authenticateUser(username, password) {
        const user = await this.get('SELECT * FROM users WHERE username = ?', [username]);
        if (!user) return null;

        const match = await bcrypt.compare(password, user.password_hash);
        if (!match) return null;

        await this.run(
            'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
            [user.id]
        );

        delete user.password_hash;
        delete user.salt;
        return user;
    }

    // Patient data methods with encryption
    async insertPatient(patientData, userId) {
        // const encryptedData = this.encryptData(patientData); // Encryption logic seems unused/outdated based on schema
        return this.run(
            `INSERT INTO patients (
                patient_id, name, date_of_birth, blood_type,
                antigen_phenotype, transfusion_restrictions, antibodies,
                last_updated_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                patientData.patientId,
                patientData.name,
                patientData.dateOfBirth,
                patientData.bloodType,
                patientData.antigenPhenotype,
                patientData.transfusionRestrictions,
                patientData.antibodies,
                userId
            ]
        );
    }

    async getPatient(patientId) {
        const patient = await this.get('SELECT * FROM patients WHERE patient_id = ?', [patientId]);
        if (!patient) return null;

        // Decrypt sensitive fields
        const sensitiveData = {
            name: patient.name,
            dateOfBirth: patient.date_of_birth,
            antigenPhenotype: patient.antigen_phenotype,
            transfusionRestrictions: patient.transfusion_restrictions,
            antibodies: patient.antibodies
        };

        return {
            ...patient,
            ...this.decryptData(sensitiveData)
        };
    }

    // --- New Methods for Caution Card Workflow ---

    async getPatientInternalId(patientIdentifier) {
        const row = await this.get('SELECT id FROM patients WHERE patient_id = ?', [patientIdentifier]);
        return row ? row.id : null;
    }

    async insertFileAttachment(patientInternalId, reviewQueueId, fileType, fileName, fileHash, fileData, uploadedBy) {
        const sql = `
            INSERT INTO file_attachments (
                patient_id, review_queue_id, file_type, file_name, file_hash, file_data, uploaded_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        const result = await this.run(sql, [
            patientInternalId, reviewQueueId, fileType, fileName, fileHash, fileData, uploadedBy
        ]);
        return result.lastID; // Return the ID of the inserted attachment
    }

    async insertReviewItem(patientInternalId, sourceType, data, submittedBy) {
        const sql = `
            INSERT INTO review_queue (
                patient_id, source_type, status, data, submitted_by
            ) VALUES (?, ?, ?, ?, ?)
        `;
        // Default status to 'pending'
        const result = await this.run(sql, [
            patientInternalId, sourceType, 'pending', JSON.stringify(data), submittedBy
        ]);
        return result.lastID; // Return the ID of the inserted review item
    }

     async linkAttachmentToReview(attachmentId, reviewQueueId) {
        const sql = `UPDATE file_attachments SET review_queue_id = ? WHERE id = ?`;
        return this.run(sql, [reviewQueueId, attachmentId]);
    }

    // --- End New Methods ---


    async close() {
        if (this.db) {
            return new Promise((resolve, reject) => {
                this.db.close((err) => {
                    if (err) reject(err);
                    else {
                        this.initialized = false;
                        resolve();
                    }
                });
            });
        }
    }
}

export default new Database();