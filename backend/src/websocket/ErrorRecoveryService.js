/**
 * ErrorRecoveryService.js
 * 
 * Provides error recovery mechanisms for WebSocket connections and events
 * Implements retry logic, event buffering, and state reconciliation
 */

const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

class ErrorRecoveryService {
  constructor() {
    this.eventBuffer = new Map();
    this.maxBufferSize = 1000; // Maximum number of events to buffer per client
    this.maxRetries = 5; // Maximum number of retry attempts
    this.retryDelays = [1000, 2000, 4000, 8000, 16000]; // Exponential backoff delays in ms
    this.pendingRetries = new Map();
    this.clientStates = new Map();
  }

  /**
   * Buffer an event for potential retry
   * @param {string} clientId - Target client ID
   * @param {string} eventType - Type of event
   * @param {Object} eventData - Event data payload
   * @returns {string} Event ID for tracking
   */
  bufferEvent(clientId, eventType, eventData) {
    const eventId = uuidv4();
    
    // Initialize buffer for client if it doesn't exist
    if (!this.eventBuffer.has(clientId)) {
      this.eventBuffer.set(clientId, new Map());
    }
    
    const clientBuffer = this.eventBuffer.get(clientId);
    
    // Check if buffer is full
    if (clientBuffer.size >= this.maxBufferSize) {
      // Remove oldest event
      const oldestEventId = Array.from(clientBuffer.keys())[0];
      clientBuffer.delete(oldestEventId);
      
      logger.warn(`Event buffer full for client ${clientId}, removed oldest event`);
    }
    
    // Add event to buffer
    clientBuffer.set(eventId, {
      id: eventId,
      type: eventType,
      data: eventData,
      timestamp: Date.now(),
      retryCount: 0
    });
    
    return eventId;
  }

  /**
   * Handle event delivery failure
   * @param {string} clientId - Target client ID
   * @param {string} eventId - ID of the failed event
   * @param {Error} error - Error that caused the failure
   * @returns {boolean} True if retry scheduled, false otherwise
   */
  handleEventFailure(clientId, eventId, error) {
    // Check if client buffer exists
    if (!this.eventBuffer.has(clientId)) {
      logger.warn(`No event buffer found for client ${clientId}`);
      return false;
    }
    
    const clientBuffer = this.eventBuffer.get(clientId);
    
    // Check if event exists in buffer
    if (!clientBuffer.has(eventId)) {
      logger.warn(`Event ${eventId} not found in buffer for client ${clientId}`);
      return false;
    }
    
    const event = clientBuffer.get(eventId);
    
    // Check if max retries reached
    if (event.retryCount >= this.maxRetries) {
      logger.error(`Max retries reached for event ${eventId} to client ${clientId}`, {
        clientId,
        eventId,
        eventType: event.type,
        error: error.message
      });
      
      // Remove event from buffer
      clientBuffer.delete(eventId);
      
      return false;
    }
    
    // Increment retry count
    event.retryCount++;
    
    // Calculate retry delay
    const retryDelay = this.retryDelays[Math.min(event.retryCount - 1, this.retryDelays.length - 1)];
    
    // Schedule retry
    const retryId = setTimeout(() => {
      this.retryEvent(clientId, eventId);
    }, retryDelay);
    
    // Store retry timer
    this.pendingRetries.set(`${clientId}-${eventId}`, retryId);
    
    logger.info(`Scheduled retry for event ${eventId} to client ${clientId} (attempt ${event.retryCount})`, {
      clientId,
      eventId,
      eventType: event.type,
      retryDelay,
      error: error.message
    });
    
    return true;
  }

  /**
   * Retry sending an event
   * @private
   * @param {string} clientId - Target client ID
   * @param {string} eventId - ID of the event to retry
   */
  retryEvent(clientId, eventId) {
    // Clear pending retry
    this.pendingRetries.delete(`${clientId}-${eventId}`);
    
    // Check if client buffer exists
    if (!this.eventBuffer.has(clientId)) {
      logger.warn(`No event buffer found for client ${clientId}`);
      return;
    }
    
    const clientBuffer = this.eventBuffer.get(clientId);
    
    // Check if event exists in buffer
    if (!clientBuffer.has(eventId)) {
      logger.warn(`Event ${eventId} not found in buffer for client ${clientId}`);
      return;
    }
    
    const event = clientBuffer.get(eventId);
    
    logger.info(`Retrying event ${eventId} to client ${clientId} (attempt ${event.retryCount})`, {
      clientId,
      eventId,
      eventType: event.type
    });
    
    // Emit retry event (to be handled by the specific WebSocket implementation)
    this.emitRetryEvent(clientId, event);
  }

  /**
   * Emit retry event
   * @private
   * @param {string} clientId - Target client ID
   * @param {Object} event - Event object to retry
   */
  emitRetryEvent(clientId, event) {
    // This is a placeholder - actual implementation depends on the WebSocket library used
    // The implementation should call handleEventSuccess or handleEventFailure
    // based on the result of the retry attempt
    
    // For now, we'll log a message
    logger.debug(`Retry event emission not implemented for event ${event.id} to client ${clientId}`);
  }

  /**
   * Handle successful event delivery
   * @param {string} clientId - Target client ID
   * @param {string} eventId - ID of the successful event
   */
  handleEventSuccess(clientId, eventId) {
    // Clear pending retry
    this.pendingRetries.delete(`${clientId}-${eventId}`);
    
    // Check if client buffer exists
    if (!this.eventBuffer.has(clientId)) {
      return;
    }
    
    const clientBuffer = this.eventBuffer.get(clientId);
    
    // Remove event from buffer
    clientBuffer.delete(eventId);
    
    logger.debug(`Event ${eventId} successfully delivered to client ${clientId}`);
  }

  /**
   * Save client state for potential reconciliation
   * @param {string} clientId - Client ID
   * @param {string} stateType - Type of state
   * @param {Object} state - State data
   * @param {number} version - State version
   */
  saveClientState(clientId, stateType, state, version) {
    // Initialize state map for client if it doesn't exist
    if (!this.clientStates.has(clientId)) {
      this.clientStates.set(clientId, new Map());
    }
    
    const clientStateMap = this.clientStates.get(clientId);
    
    // Save state
    clientStateMap.set(stateType, {
      data: state,
      version,
      timestamp: Date.now()
    });
  }

  /**
   * Get client state for reconciliation
   * @param {string} clientId - Client ID
   * @param {string} stateType - Type of state
   * @returns {Object|null} Client state or null if not found
   */
  getClientState(clientId, stateType) {
    // Check if client state map exists
    if (!this.clientStates.has(clientId)) {
      return null;
    }
    
    const clientStateMap = this.clientStates.get(clientId);
    
    // Check if state exists
    if (!clientStateMap.has(stateType)) {
      return null;
    }
    
    return clientStateMap.get(stateType);
  }

  /**
   * Reconcile client state with server state
   * @param {string} clientId - Client ID
   * @param {string} stateType - Type of state
   * @param {number} clientVersion - Client state version
   * @param {Object} serverState - Current server state
   * @param {number} serverVersion - Server state version
   * @returns {Object} Reconciliation result
   */
  reconcileState(clientId, stateType, clientVersion, serverState, serverVersion) {
    logger.info(`Reconciling state for client ${clientId}`, {
      clientId,
      stateType,
      clientVersion,
      serverVersion
    });
    
    // Get buffered events for client
    const missedEvents = this.getBufferedEventsForClient(clientId);
    
    return {
      clientVersion,
      serverVersion,
      stateType,
      needsFullSync: serverVersion - clientVersion > missedEvents.length,
      missedEvents,
      currentState: serverState
    };
  }

  /**
   * Get all buffered events for a client
   * @param {string} clientId - Client ID
   * @returns {Array} Array of buffered events
   */
  getBufferedEventsForClient(clientId) {
    // Check if client buffer exists
    if (!this.eventBuffer.has(clientId)) {
      return [];
    }
    
    const clientBuffer = this.eventBuffer.get(clientId);
    
    // Convert buffer to array and sort by timestamp
    return Array.from(clientBuffer.values())
      .sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Clean up resources for a client
   * @param {string} clientId - Client ID
   */
  cleanupClient(clientId) {
    // Clear pending retries
    for (const [key, retryId] of this.pendingRetries.entries()) {
      if (key.startsWith(`${clientId}-`)) {
        clearTimeout(retryId);
        this.pendingRetries.delete(key);
      }
    }
    
    // Clear event buffer
    this.eventBuffer.delete(clientId);
    
    // Clear client state
    this.clientStates.delete(clientId);
    
    logger.debug(`Cleaned up resources for client ${clientId}`);
  }

  /**
   * Get service statistics
   * @returns {Object} Service statistics
   */
  getStats() {
    const stats = {
      totalBufferedEvents: 0,
      clientCount: this.eventBuffer.size,
      pendingRetries: this.pendingRetries.size,
      clientStates: this.clientStates.size
    };
    
    // Count total buffered events
    for (const clientBuffer of this.eventBuffer.values()) {
      stats.totalBufferedEvents += clientBuffer.size;
    }
    
    return stats;
  }
}

// Export singleton instance
module.exports = new ErrorRecoveryService();
