const { Sequelize } = require('sequelize');
const sqlite3 = require('sqlite3');

class TestDatabase {
    constructor() {
        this.sequelize = null;
        this.db = null;
        this.initialized = false;
    }

    async initialize() {
        if (this.initialized) return;

        // Create in-memory SQLite database
        this.sequelize = new Sequelize('sqlite::memory:', {
            logging: false
        });

        // Create sqlite3 connection for raw queries
        this.db = new sqlite3.Database(':memory:', (err) => {
            if (err) throw err;
        });

        // Initialize basic schema
        await this.createTables();
        this.initialized = true;
    }

    async createTables() {
        const createTables = `
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                salt TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'user',
                reset_token TEXT,
                reset_token_expiry INTEGER,
                failed_login_attempts INTEGER DEFAULT 0,
                last_login DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS patients (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                medical_record_number TEXT UNIQUE NOT NULL,
                blood_type TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS reports (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                patient_id INTEGER,
                report_type TEXT NOT NULL,
                filename TEXT NOT NULL,
                original_filename TEXT NOT NULL,
                mime_type TEXT NOT NULL,
                size INTEGER NOT NULL,
                path TEXT NOT NULL,
                metadata TEXT,
                status TEXT NOT NULL DEFAULT 'uploaded',
                ocr_data TEXT,
                error TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (patient_id) REFERENCES patients (id)
            );
        `;

        return new Promise((resolve, reject) => {
            this.db.exec(createTables, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    async clearTables() {
        const tables = ['users', 'patients', 'reports'];
        for (const table of tables) {
            await new Promise((resolve, reject) => {
                this.db.run(`DELETE FROM ${table}`, (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
        }
    }

    async close() {
        if (this.sequelize) {
            await this.sequelize.close();
        }
        if (this.db) {
            await new Promise((resolve, reject) => {
                this.db.close((err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
        }
        this.initialized = false;
    }

    // Expose database connections
    getSequelize() {
        return this.sequelize;
    }

    getSqlite() {
        return this.db;
    }

    // Transaction support
    async beginTransaction() {
        return new Promise((resolve, reject) => {
            this.db.run('BEGIN TRANSACTION', (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    async rollback() {
        return new Promise((resolve, reject) => {
            this.db.run('ROLLBACK', (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }
}

// Export singleton instance
module.exports = new TestDatabase();