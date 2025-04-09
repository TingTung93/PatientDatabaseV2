/**
 * ClientSessionTracker
 * 
 * Tracks client sessions, their last known state version,
 * and event subscriptions for targeted event distribution.
 */
import logger from '../utils/logger.js';

class ClientSessionTracker {
  constructor() {
    // Map of client sessions by ID
    this.clientSessions = new Map();
    
    // Map of client subscriptions by ID
    this.clientSubscriptions = new Map();
    
    // Start cleanup interval
    this.startCleanupInterval();
  }
  
  /**
   * Register a new client or update existing one
   * @param {string} clientId - The client's socket ID
   * @param {number} initialVersion - Initial state version
   */
  registerClient(clientId, initialVersion = 0) {
    try {
      this.clientSessions.set(clientId, {
        id: clientId,
        lastVersion: initialVersion,
        lastSeen: Date.now(),
        connected: true
      });
      
      // Initialize empty subscription set
      if (!this.clientSubscriptions.has(clientId)) {
        this.clientSubscriptions.set(clientId, new Set());
      }
      
      logger.debug(`Client registered: ${clientId}`);
    } catch (error) {
      logger.error(`Error registering client ${clientId}:`, error);
    }
  }
  
  /**
   * Update a client's last known version
   * @param {string} clientId - The client's socket ID
   * @param {number} version - The latest version seen by client
   */
  updateClientVersion(clientId, version) {
    try {
      const session = this.clientSessions.get(clientId);
      if (session) {
        session.lastVersion = version;
        session.lastSeen = Date.now();
      }
    } catch (error) {
      logger.error(`Error updating client version for ${clientId}:`, error);
    }
  }
  
  /**
   * Mark a client as disconnected
   * @param {string} clientId - The client's socket ID
   */
  markClientDisconnected(clientId) {
    try {
      const session = this.clientSessions.get(clientId);
      if (session) {
        session.connected = false;
        session.disconnectedAt = Date.now();
        logger.debug(`Client marked as disconnected: ${clientId}`);
      }
    } catch (error) {
      logger.error(`Error marking client as disconnected ${clientId}:`, error);
    }
  }
  
  /**
   * Mark a client as reconnected
   * @param {string} clientId - The client's socket ID
   */
  markClientReconnected(clientId) {
    try {
      const session = this.clientSessions.get(clientId);
      if (session) {
        session.connected = true;
        delete session.disconnectedAt;
        session.lastSeen = Date.now();
        logger.debug(`Client reconnected: ${clientId}`);
      } else {
        // New client or expired session
        this.registerClient(clientId);
        logger.debug(`New client connection: ${clientId}`);
      }
    } catch (error) {
      logger.error(`Error marking client as reconnected ${clientId}:`, error);
    }
  }
  
  /**
   * Get a client's last known version
   * @param {string} clientId - The client's socket ID
   * @returns {number} - The client's last known version
   */
  getClientVersion(clientId) {
    const session = this.clientSessions.get(clientId);
    return session ? session.lastVersion : 0;
  }
  
  /**
   * Subscribe a client to an event type
   * @param {string} clientId - The client's socket ID
   * @param {string} eventType - The event type to subscribe to
   */
  subscribeClientToEvent(clientId, eventType) {
    try {
      if (!this.clientSubscriptions.has(clientId)) {
        this.clientSubscriptions.set(clientId, new Set());
      }
      this.clientSubscriptions.get(clientId).add(eventType);
      logger.debug(`Client ${clientId} subscribed to ${eventType}`);
    } catch (error) {
      logger.error(`Error subscribing client ${clientId} to event ${eventType}:`, error);
    }
  }
  
  /**
   * Unsubscribe a client from an event type
   * @param {string} clientId - The client's socket ID
   * @param {string} eventType - The event type to unsubscribe from
   */
  unsubscribeClientFromEvent(clientId, eventType) {
    try {
      if (this.clientSubscriptions.has(clientId)) {
        this.clientSubscriptions.get(clientId).delete(eventType);
        logger.debug(`Client ${clientId} unsubscribed from ${eventType}`);
      }
    } catch (error) {
      logger.error(`Error unsubscribing client ${clientId} from event ${eventType}:`, error);
    }
  }
  
  /**
   * Get all event types a client is subscribed to
   * @param {string} clientId - The client's socket ID
   * @returns {Array<string>} - Array of event types
   */
  getClientSubscriptions(clientId) {
    return Array.from(this.clientSubscriptions.get(clientId) || []);
  }
  
  /**
   * Get all clients subscribed to an event type
   * @param {string} eventType - The event type
   * @returns {Array<string>} - Array of client IDs
   */
  getClientsForEvent(eventType) {
    const clients = [];
    
    try {
      for (const [clientId, subscriptions] of this.clientSubscriptions.entries()) {
        // Only include connected clients
        const session = this.clientSessions.get(clientId);
        if (subscriptions.has(eventType) && session?.connected) {
          clients.push(clientId);
        }
      }
    } catch (error) {
      logger.error(`Error getting clients for event ${eventType}:`, error);
    }
    
    return clients;
  }
  
  /**
   * Start the cleanup interval for expired sessions
   */
  startCleanupInterval() {
    // Clean up expired sessions periodically
    setInterval(() => {
      try {
        this.cleanupSessions();
      } catch (error) {
        logger.error('Error during session cleanup:', error);
      }
    }, 30 * 60 * 1000); // Run cleanup every 30 minutes
  }
  
  /**
   * Clean up expired client sessions
   * @param {number} maxAgeMs - Maximum age in milliseconds (default: 24 hours)
   */
  cleanupSessions(maxAgeMs = 24 * 60 * 60 * 1000) {
    const cutoff = Date.now() - maxAgeMs;
    let cleanedCount = 0;
    
    for (const [clientId, session] of this.clientSessions.entries()) {
      // Clean up disconnected clients that haven't been seen for a while
      if (!session.connected && session.lastSeen < cutoff) {
        this.clientSessions.delete(clientId);
        this.clientSubscriptions.delete(clientId);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      logger.info(`Cleaned up ${cleanedCount} expired client sessions`);
    }
  }
  
  /**
   * Get stats about the current client sessions
   * @returns {Object} - Statistics about clients
   */
  getStats() {
    const connectedCount = Array.from(this.clientSessions.values())
      .filter(session => session.connected).length;
    
    return {
      total: this.clientSessions.size,
      connected: connectedCount,
      disconnected: this.clientSessions.size - connectedCount,
      subscriptions: this.clientSubscriptions.size
    };
  }
}

// Create and export a singleton instance
const clientSessionTracker = new ClientSessionTracker();
export { clientSessionTracker as default }; 