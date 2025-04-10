/**
 * Database helper functions for working with SQLite
 * These functions help transition from better-sqlite3 to sqlite3 with promises
 */
import { db } from '../database/init.js';
import { log } from './logging.js';

/**
 * Execute a query that returns multiple rows
 * @param {string} query - SQL query to execute
 * @param {Array} params - Parameters for the query
 * @returns {Promise<Array>} - Array of results
 */
export async function queryAll(query, params = []) {
  try {
    if (!db.instance) {
      throw new Error('Database instance is not initialized');
    }
    
    return await db.instance.all(query, params);
  } catch (error) {
    log.error(`Error executing queryAll: ${error.message}`, error);
    throw error;
  }
}

/**
 * Execute a query that returns a single row
 * @param {string} query - SQL query to execute
 * @param {Array} params - Parameters for the query
 * @returns {Promise<Object>} - Single result object or null
 */
export async function queryGet(query, params = []) {
  try {
    if (!db.instance) {
      throw new Error('Database instance is not initialized');
    }
    
    return await db.instance.get(query, params);
  } catch (error) {
    log.error(`Error executing queryGet: ${error.message}`, error);
    throw error;
  }
}

/**
 * Execute a query that modifies data (INSERT, UPDATE, DELETE)
 * @param {string} query - SQL query to execute
 * @param {Array} params - Parameters for the query
 * @returns {Promise<Object>} - Result object with lastID and changes properties
 */
export async function queryRun(query, params = []) {
  try {
    if (!db.instance) {
      throw new Error('Database instance is not initialized');
    }
    
    return await db.instance.run(query, params);
  } catch (error) {
    log.error(`Error executing queryRun: ${error.message}`, error);
    throw error;
  }
}

/**
 * Execute a query that creates schema elements (CREATE TABLE, CREATE INDEX)
 * @param {string} query - SQL query to execute
 * @returns {Promise<void>}
 */
export async function queryExec(query) {
  try {
    if (!db.instance) {
      throw new Error('Database instance is not initialized');
    }
    
    return await db.instance.exec(query);
  } catch (error) {
    log.error(`Error executing queryExec: ${error.message}`, error);
    throw error;
  }
}

/**
 * Count records based on a query
 * @param {string} baseQuery - Base SQL query (without SELECT)
 * @param {Array} params - Parameters for the query
 * @returns {Promise<number>} - Count of records
 */
export async function queryCount(baseQuery, params = []) {
  try {
    const countQuery = baseQuery.replace(/^SELECT .* FROM/i, 'SELECT COUNT(*) as count FROM');
    const result = await queryGet(countQuery, params);
    return result ? result.count : 0;
  } catch (error) {
    log.error(`Error executing queryCount: ${error.message}`, error);
    throw error;
  }
}

/**
 * Migrate database records from better-sqlite3 to sqlite3
 * This function is used to fix the upload issues with reports
 */
export async function migrateReportData() {
  try {
    if (!db.instance) {
      throw new Error('Database instance is not initialized');
    }
    
    // First ensure raw_reports table exists
    await queryExec(`
      CREATE TABLE IF NOT EXISTS raw_reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        filename TEXT,
        metadata TEXT,
        patients TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    log.info('Successfully migrated report data structure');
    return true;
  } catch (error) {
    log.error(`Error migrating report data: ${error.message}`, error);
    throw error;
  }
} 