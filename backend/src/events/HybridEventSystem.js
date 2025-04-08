/**
 * HybridEventSystem
 * 
 * Core event system that implements the hybrid persistence approach
 * for real-time updates with reliable delivery.
 */
const { v4: uuidv4 } = require('uuid');
const EventClassifier = require('./EventClassifier');
const PersistenceManager = require('./PersistenceManager');
const ClientSessionTracker = require('./ClientSessionTracker');
const logger = require('../utils/logger');

class HybridEventSystem {
  constructor() {
    this.currentVersion = 0;
    this.eventHandlers = new Map();
    this.io = null;
    this.isInitialized = false;
  }
  
  /**
   * Initialize the event system with Socket.IO
   * @param {Object} io - Socket.IO server instance
   */
  initialize(io) {
    if (this.isInitialized) {
      logger.warn('HybridEventSystem already initialized');
      return;
    }
    
    if (!io) {
      logger.error('Cannot initialize HybridEventSystem: Socket.IO instance is required');
      return;
    }
    
    this.io = io;
    this.setupSocketEvents();
    this.isInitialized = true;
    logger.info('HybridEventSystem initialized');
  }
  
  /**
   * Set up Socket.IO event handlers
   */
  setupSocketEvents() {
    this.io.on('connection', (socket) => {
      const clientId = socket.id;
      logger.debug(`WebSocket connection established: ${clientId}`);
      
      // Register client
      ClientSessionTracker.registerClient(clientId);
      
      // Initial event subscription (to global events by default)
      ClientSessionTracker.subscribeClientToEvent(clientId, 'system_alert');
      ClientSessionTracker.subscribeClientToEvent(clientId, 'system_error');
      
      // Handle client subscriptions
      socket.on('subscribe', (eventTypes) => {
        if (Array.isArray(eventTypes)) {
          eventTypes.forEach(type => {
            ClientSessionTracker.subscribeClientToEvent(clientId, type);
          });
          
          socket.emit('subscription_confirmed', { 
            eventTypes, 
            currentVersion: this.currentVersion 
          });
        }
      });
      
      // Handle client unsubscriptions
      socket.on('unsubscribe', (eventTypes) => {
        if (Array.isArray(eventTypes)) {
          eventTypes.forEach(type => {
            ClientSessionTracker.unsubscribeClientFromEvent(clientId, type);
          });
          
          socket.emit('unsubscription_confirmed', { eventTypes });
        }
      });
      
      // Handle client reconciliation requests
      socket.on('reconciliation_request', async (data) => {
        try {
          const { lastVersion, eventTypes } = data;
          ClientSessionTracker.updateClientVersion(clientId, lastVersion);
          
          // Get missed events
          const events = await PersistenceManager.getEventsAfterVersion(
            lastVersion,
            eventTypes || ClientSessionTracker.getClientSubscriptions(clientId)
          );
          
          // Send reconciliation response
          socket.emit('reconciliation_response', {
            events,
            currentVersion: this.currentVersion
          });
          
          logger.debug(`Reconciliation completed for client ${clientId} (${lastVersion} → ${this.currentVersion})`);
        } catch (error) {
          logger.error('Reconciliation error:', error);
          socket.emit('error', { message: 'Reconciliation failed' });
        }
      });
      
      // Handle client disconnect
      socket.on('disconnect', () => {
        ClientSessionTracker.markClientDisconnected(clientId);
        logger.debug(`WebSocket connection closed: ${clientId}`);
      });
    });
  }
  
  /**
   * Emit an event to all subscribed clients
   * @param {string} eventType - The type of event
   * @param {Object} data - The event payload
   * @returns {Promise<Object|null>} - The emitted event or null on failure
   */
  async emit(eventType, data) {
    try {
      if (!this.isInitialized) {
        logger.error(`Cannot emit event ${eventType}: HybridEventSystem not initialized`);
        return null;
      }
      
      // Generate event object
      const event = {
        id: uuidv4(),
        type: eventType,
        data,
        timestamp: Date.now(),
        version: ++this.currentVersion
      };
      
      // Persist based on importance
      await PersistenceManager.persistEvent(event);
      
      // Broadcast to subscribed clients
      this.broadcastEvent(event);
      
      // Execute any registered handlers
      this.executeHandlers(event);
      
      logger.debug(`Event emitted: ${eventType} (v${event.version})`);
      return event;
    } catch (error) {
      logger.error(`Failed to emit event ${eventType}:`, error);
      return null;
    }
  }
  
  /**
   * Broadcast an event to subscribed clients
   * @param {Object} event - The event to broadcast
   */
  broadcastEvent(event) {
    if (!this.io) {
      logger.error('Cannot broadcast event: Socket.IO not initialized');
      return;
    }
    
    try {
      // Get clients subscribed to this event type
      const clientIds = ClientSessionTracker.getClientsForEvent(event.type);
      
      if (clientIds.length === 0) {
        logger.debug(`No clients subscribed to event: ${event.type}`);
        return;
      }
      
      // Broadcast to all subscribed clients
      for (const clientId of clientIds) {
        const socket = this.io.sockets.sockets.get(clientId);
        if (socket) {
          socket.emit('event', event);
          
          // Update client's last known version
          ClientSessionTracker.updateClientVersion(clientId, event.version);
        }
      }
      
      logger.debug(`Event ${event.type} broadcasted to ${clientIds.length} clients`);
    } catch (error) {
      logger.error(`Error broadcasting event ${event.type}:`, error);
    }
  }
  
  /**
   * Register an event handler
   * @param {string} eventType - The type of event to handle
   * @param {Function} handler - The handler function
   */
  on(eventType, handler) {
    if (typeof handler !== 'function') {
      logger.error('Event handler must be a function');
      return;
    }
    
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, []);
    }
    
    this.eventHandlers.get(eventType).push(handler);
    logger.debug(`Event handler registered for: ${eventType}`);
  }
  
  /**
   * Remove an event handler
   * @param {string} eventType - The type of event
   * @param {Function} handler - The handler function to remove
   */
  off(eventType, handler) {
    if (!this.eventHandlers.has(eventType)) {
      return;
    }
    
    const handlers = this.eventHandlers.get(eventType);
    const index = handlers.indexOf(handler);
    if (index !== -1) {
      handlers.splice(index, 1);
      logger.debug(`Event handler removed for: ${eventType}`);
    }
  }
  
  /**
   * Execute registered handlers for an event
   * @param {Object} event - The event object
   */
  executeHandlers(event) {
    const handlers = this.eventHandlers.get(event.type) || [];
    
    for (const handler of handlers) {
      try {
        handler(event.data, event);
      } catch (error) {
        logger.error(`Error in event handler for ${event.type}:`, error);
      }
    }
  }
  
  /**
   * Get system status information
   * @returns {Object} - System status
   */
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      currentVersion: this.currentVersion,
      registeredEventTypes: Array.from(this.eventHandlers.keys()),
      clientStats: ClientSessionTracker.getStats()
    };
  }
}

// Export singleton instance
module.exports = new HybridEventSystem(); 