/**
 * ConnectionManager.js
 * 
 * Manages WebSocket connections, reconnection logic, and client tracking
 * Provides robust error recovery for WebSocket connections
 */

const logger = require('../utils/logger');

class ConnectionManager {
  constructor() {
    this.connections = new Map();
    this.reconnectTimers = new Map();
    this.connectionStatuses = new Map();
    this.maxReconnectAttempts = 10;
    this.baseReconnectDelay = 1000; // 1 second
    this.maxReconnectDelay = 30000; // 30 seconds
  }

  /**
   * Register a new client connection
   * @param {string} clientId - Unique client identifier
   * @param {Object} socket - WebSocket connection object
   * @param {Object} metadata - Additional client metadata
   */
  registerConnection(clientId, socket, metadata = {}) {
    this.connections.set(clientId, {
      socket,
      metadata,
      connectedAt: Date.now(),
      lastActivity: Date.now(),
      reconnectAttempts: 0
    });
    
    this.connectionStatuses.set(clientId, 'connected');
    
    logger.info(`Client connected: ${clientId}`, { 
      clientId, 
      metadata 
    });
    
    return true;
  }

  /**
   * Handle client disconnection
   * @param {string} clientId - Unique client identifier
   * @param {string} reason - Reason for disconnection
   */
  handleDisconnection(clientId, reason = 'unknown') {
    const connection = this.connections.get(clientId);
    
    if (!connection) {
      logger.warn(`Attempted to handle disconnection for unknown client: ${clientId}`);
      return false;
    }
    
    this.connectionStatuses.set(clientId, 'disconnected');
    
    logger.info(`Client disconnected: ${clientId}`, { 
      clientId, 
      reason,
      connectedFor: Date.now() - connection.connectedAt
    });
    
    // Start reconnection process if appropriate
    if (reason !== 'client_terminated' && reason !== 'server_terminated') {
      this.scheduleReconnect(clientId);
    } else {
      // Clean up connection data for intentional disconnections
      this.connections.delete(clientId);
      this.connectionStatuses.delete(clientId);
    }
    
    return true;
  }

  /**
   * Schedule reconnection attempt
   * @private
   * @param {string} clientId - Unique client identifier
   */
  scheduleReconnect(clientId) {
    const connection = this.connections.get(clientId);
    
    if (!connection) {
      return;
    }
    
    // Clear any existing reconnect timer
    if (this.reconnectTimers.has(clientId)) {
      clearTimeout(this.reconnectTimers.get(clientId));
    }
    
    // Check if max reconnect attempts reached
    if (connection.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.warn(`Max reconnect attempts reached for client: ${clientId}`);
      this.connectionStatuses.set(clientId, 'failed');
      return;
    }
    
    // Calculate exponential backoff delay
    const delay = Math.min(
      this.baseReconnectDelay * Math.pow(2, connection.reconnectAttempts),
      this.maxReconnectDelay
    );
    
    // Schedule reconnect attempt
    const timerId = setTimeout(() => {
      this.attemptReconnect(clientId);
    }, delay);
    
    this.reconnectTimers.set(clientId, timerId);
    this.connectionStatuses.set(clientId, 'reconnecting');
    
    connection.reconnectAttempts++;
    
    logger.info(`Scheduled reconnect for client: ${clientId}`, { 
      clientId, 
      attempt: connection.reconnectAttempts, 
      delay 
    });
  }

  /**
   * Attempt to reconnect to a client
   * @private
   * @param {string} clientId - Unique client identifier
   */
  attemptReconnect(clientId) {
    const connection = this.connections.get(clientId);
    
    if (!connection) {
      return;
    }
    
    logger.info(`Attempting to reconnect client: ${clientId}`, { 
      clientId, 
      attempt: connection.reconnectAttempts 
    });
    
    // Emit reconnect event (to be handled by the specific WebSocket implementation)
    this.emitReconnectEvent(clientId, connection);
  }

  /**
   * Emit reconnect event
   * @private
   * @param {string} clientId - Unique client identifier
   * @param {Object} connection - Connection object
   */
  emitReconnectEvent(clientId, connection) {
    // This is a placeholder - actual implementation depends on the WebSocket library used
    // For Socket.IO, this might involve creating a new socket connection
    // For native WebSockets, this might involve creating a new WebSocket instance
    
    // The implementation should call handleReconnectSuccess or handleReconnectFailure
    // based on the result of the reconnection attempt
    
    // For now, we'll simulate a reconnect failure to continue the reconnect cycle
    this.handleReconnectFailure(clientId, new Error('Reconnect not implemented'));
  }

  /**
   * Handle successful reconnection
   * @param {string} clientId - Unique client identifier
   * @param {Object} socket - New WebSocket connection object
   */
  handleReconnectSuccess(clientId, socket) {
    const connection = this.connections.get(clientId);
    
    if (!connection) {
      return;
    }
    
    // Update connection with new socket
    connection.socket = socket;
    connection.lastActivity = Date.now();
    connection.reconnectAttempts = 0;
    
    this.connectionStatuses.set(clientId, 'connected');
    
    // Clear reconnect timer
    if (this.reconnectTimers.has(clientId)) {
      clearTimeout(this.reconnectTimers.get(clientId));
      this.reconnectTimers.delete(clientId);
    }
    
    logger.info(`Client reconnected successfully: ${clientId}`, { clientId });
  }

  /**
   * Handle failed reconnection attempt
   * @param {string} clientId - Unique client identifier
   * @param {Error} error - Error that caused the failure
   */
  handleReconnectFailure(clientId, error) {
    logger.warn(`Reconnect attempt failed for client: ${clientId}`, { 
      clientId, 
      error: error.message 
    });
    
    // Schedule another reconnect attempt
    this.scheduleReconnect(clientId);
  }

  /**
   * Update client activity timestamp
   * @param {string} clientId - Unique client identifier
   */
  updateActivity(clientId) {
    const connection = this.connections.get(clientId);
    
    if (connection) {
      connection.lastActivity = Date.now();
    }
  }

  /**
   * Get connection status for a client
   * @param {string} clientId - Unique client identifier
   * @returns {string|null} Connection status or null if client not found
   */
  getConnectionStatus(clientId) {
    return this.connectionStatuses.get(clientId) || null;
  }

  /**
   * Get all active connections
   * @returns {Array} Array of active connection objects
   */
  getActiveConnections() {
    const active = [];
    
    for (const [clientId, status] of this.connectionStatuses.entries()) {
      if (status === 'connected') {
        const connection = this.connections.get(clientId);
        
        if (connection) {
          active.push({
            clientId,
            metadata: connection.metadata,
            connectedAt: connection.connectedAt,
            lastActivity: connection.lastActivity
          });
        }
      }
    }
    
    return active;
  }

  /**
   * Get connection statistics
   * @returns {Object} Connection statistics
   */
  getStats() {
    const stats = {
      total: this.connections.size,
      connected: 0,
      disconnected: 0,
      reconnecting: 0,
      failed: 0
    };
    
    for (const status of this.connectionStatuses.values()) {
      stats[status]++;
    }
    
    return stats;
  }

  /**
   * Clean up inactive connections
   * @param {number} inactiveThreshold - Threshold in milliseconds for considering a connection inactive
   */
  cleanupInactiveConnections(inactiveThreshold = 3600000) { // Default: 1 hour
    const now = Date.now();
    
    for (const [clientId, connection] of this.connections.entries()) {
      const status = this.connectionStatuses.get(clientId);
      
      // Clean up failed or long-disconnected connections
      if (status === 'failed' || 
          (status === 'disconnected' && now - connection.lastActivity > inactiveThreshold)) {
        
        // Clear any reconnect timer
        if (this.reconnectTimers.has(clientId)) {
          clearTimeout(this.reconnectTimers.get(clientId));
          this.reconnectTimers.delete(clientId);
        }
        
        // Remove connection data
        this.connections.delete(clientId);
        this.connectionStatuses.delete(clientId);
        
        logger.info(`Cleaned up inactive connection: ${clientId}`, { 
          clientId, 
          status, 
          inactiveDuration: now - connection.lastActivity 
        });
      }
    }
  }
}

// Export singleton instance
module.exports = new ConnectionManager();
