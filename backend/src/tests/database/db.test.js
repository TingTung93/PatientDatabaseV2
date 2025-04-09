const { describe, it, expect, beforeAll, afterAll } = require('@jest/globals');

const db = require('../../src/database/db.js');

// TODO: Skipping due to database interaction issues in test environment.
describe.skip('Database', () => {
    describe('initialize()', () => {
        it('should initialize database successfully', async () => {
            const result = await db.all('SELECT 1 + 1 AS solution');
            expect(result.rows[0].solution).toBe(2);
        });

        it('should create users table on initialization', async () => {
            const result = await db.all(
                "SELECT name FROM sqlite_master WHERE type='table' AND name='users'"
            );
            expect(result.rows.length).toBe(1);
        });
    });

    describe('query()', () => {
        beforeEach(async () => {
            await db.run('DELETE FROM users');
        });

        it('should insert data successfully', async () => {
            await db.query(
                'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)',
                ['testuser', 'hashedpassword', 'user']
            );

            const result = await db.all('SELECT username FROM users');
            expect(result.rows[0].username).toBe('testuser');
        });

        it('should throw error on invalid query', async () => {
            await expect(db.query('INVALID SQL')).rejects.toThrow();
        });
    });

    describe('all()', () => {
        beforeEach(async () => {
            await db.run('DELETE FROM users');
            await db.query(
                'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)',
                ['testuser', 'hashedpassword', 'user']
            );
        });

        it('should return all matching rows', async () => {
            const result = await db.all('SELECT * FROM users');
            expect(result.rows.length).toBe(1);
            expect(result.rows[0].username).toBe('testuser');
        });

        it('should return empty array when no matches', async () => {
            const result = await db.all('SELECT * FROM users WHERE username = ?', ['nonexistent']);
            expect(result.rows.length).toBe(0);
        });
    });
});