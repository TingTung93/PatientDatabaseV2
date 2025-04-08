/**
 * PersistenceManager
 * 
 * Manages event persistence based on event importance level.
 * Critical events are stored in the database, while standard and
 * transient events are stored in memory with different retention periods.
 */
const { db } = require('../database/init');
const EventClassifier = require('./EventClassifier');
const logger = require('../utils/logger');

class PersistenceManager {
  constructor() {
    // In-memory storage for events by category
    this.inMemoryEvents = {
      standard: new Map(), // Map of event arrays by type
      transient: new Map() // Map for very short-term storage
    };
    
    // Configure retention periods
    this.retentionPeriods = {
      standard: 30 * 60 * 1000, // 30 minutes
      transient: 5 * 60 * 1000   // 5 minutes
    };
    
    // Start cleanup interval
    this.startCleanupInterval();
  }
  
  /**
   * Persist an event based on its importance
   * @param {Object} event - The event to persist
   * @returns {Promise<boolean>} - Success indicator
   */
  async persistEvent(event) {
    try {
      const importance = EventClassifier.getImportance(event.type);
      
      if (importance === EventClassifier.importanceLevels.CRITICAL) {
        // Store in database
        return await this.storeInDatabase(event);
      } else if (importance === EventClassifier.importanceLevels.STANDARD) {
        // Store in memory with longer retention
        return this.storeInMemory(event, 'standard');
      } else {
        // Store in memory with short retention
        return this.storeInMemory(event, 'transient');
      }
    } catch (error) {
      logger.error('Failed to persist event:', error);
      return false;
    }
  }
  
  /**
   * Store an event in the database
   * @param {Object} event - The event to store
   * @returns {Promise<boolean>} - Success indicator
   */
  async storeInDatabase(event) {
    try {
      // Store event in database with timestamp
      db.prepare(
        'INSERT INTO events (id, type, data, version, created_at) VALUES (?, ?, ?, ?, ?)'
      ).run(
        event.id,
        event.type,
        JSON.stringify(event.data),
        event.version,
        event.timestamp
      );
      
      return true;
    } catch (error) {
      logger.error('Failed to persist event to database:', error);
      return false;
    }
  }
  
  /**
   * Store an event in memory
   * @param {Object} event - The event to store
   * @param {string} category - The storage category ('standard' or 'transient')
   * @returns {boolean} - Success indicator
   */
  storeInMemory(event, category) {
    try {
      if (!this.inMemoryEvents[category].has(event.type)) {
        this.inMemoryEvents[category].set(event.type, []);
      }
      
      const events = this.inMemoryEvents[category].get(event.type);
      events.push(event);
      
      // Cap the size to prevent memory issues
      const maxEvents = category === 'standard' ? 1000 : 100;
      if (events.length > maxEvents) {
        events.shift(); // Remove oldest event
      }
      
      return true;
    } catch (error) {
      logger.error(`Failed to store event in memory (${category}):`, error);
      return false;
    }
  }
  
  /**
   * Get events after a specific version
   * @param {number} clientVersion - The client's current version
   * @param {Array<string>} eventTypes - Optional array of event types to filter by
   * @returns {Promise<Object>} - Events grouped by type
   */
  async getEventsAfterVersion(clientVersion, eventTypes = []) {
    try {
      const results = {};
      
      // Get critical events from database
      const criticalEvents = await this.getCriticalEventsFromDatabase(clientVersion, eventTypes);
      
      // Add standard and transient events from memory
      for (const category of ['standard', 'transient']) {
        for (const [type, events] of this.inMemoryEvents[category].entries()) {
          if (eventTypes.length === 0 || eventTypes.includes(type)) {
            const filteredEvents = events.filter(e => e.version > clientVersion);
            if (filteredEvents.length > 0) {
              results[type] = [...(results[type] || []), ...filteredEvents];
            }
          }
        }
      }
      
      // Merge database and memory results
      for (const type in criticalEvents) {
        results[type] = [...(results[type] || []), ...criticalEvents[type]];
      }
      
      return results;
    } catch (error) {
      logger.error('Error retrieving events:', error);
      return {};
    }
  }
  
  /**
   * Get critical events from the database
   * @param {number} clientVersion - The client's current version
   * @param {Array<string>} eventTypes - Optional array of event types to filter by
   * @returns {Promise<Object>} - Critical events grouped by type
   */
  async getCriticalEventsFromDatabase(clientVersion, eventTypes) {
    const results = {};
    
    try {
      let query = 'SELECT * FROM events WHERE version > ?';
      const params = [clientVersion];
      
      if (eventTypes.length > 0) {
        query += ` AND type IN (${eventTypes.map(() => '?').join(',')})`;
        params.push(...eventTypes);
      }
      
      query += ' ORDER BY version ASC LIMIT 1000';
      
      const events = db.prepare(query).all(params);
      
      // Group by event type
      for (const event of events) {
        if (!results[event.type]) {
          results[event.type] = [];
        }
        
        results[event.type].push({
          id: event.id,
          type: event.type,
          data: JSON.parse(event.data),
          timestamp: event.created_at,
          version: event.version
        });
      }
      
      return results;
    } catch (error) {
      logger.error('Error retrieving critical events:', error);
      return {};
    }
  }
  
  /**
   * Start the cleanup interval for in-memory events
   */
  startCleanupInterval() {
    // Clean up in-memory events periodically
    setInterval(() => {
      try {
        const now = Date.now();
        
        // Clean standard events
        this.cleanupCategory('standard', now - this.retentionPeriods.standard);
        
        // Clean transient events
        this.cleanupCategory('transient', now - this.retentionPeriods.transient);
      } catch (error) {
        logger.error('Error during event cleanup:', error);
      }
    }, 5 * 60 * 1000); // Run cleanup every 5 minutes
  }
  
  /**
   * Clean up events in a specific category
   * @param {string} category - The category to clean ('standard' or 'transient')
   * @param {number} cutoffTime - The cutoff timestamp
   */
  cleanupCategory(category, cutoffTime) {
    for (const [type, events] of this.inMemoryEvents[category].entries()) {
      const filteredEvents = events.filter(e => e.timestamp > cutoffTime);
      
      if (filteredEvents.length === 0) {
        this.inMemoryEvents[category].delete(type);
      } else {
        this.inMemoryEvents[category].set(type, filteredEvents);
      }
    }
  }
}

// Export singleton instance
module.exports = new PersistenceManager(); 