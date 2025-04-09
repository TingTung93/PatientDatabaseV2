import { Server } from 'socket.io';
import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger.js';

// Event types for WebSocket messages
export const MessageTypes = {
  STATE_UPDATE: 'STATE_UPDATE',
  STATE_REQUEST: 'STATE_REQUEST',
  MESSAGE_ACK: 'MESSAGE_ACK',
  RECONCILIATION_REQUEST: 'RECONCILIATION_REQUEST',
};

// Default configuration
const DEFAULT_CONFIG = {
  frontendUrl: 'http://localhost:3000',
  allowedMethods: ['GET', 'POST']
};

class WebSocketService extends EventEmitter {
  constructor() {
    super();
    this.connections = new Map();
    this.server = null;
    this.io = null;
    this.stateVersion = 0;
    this.processedMessages = new Set();
  }

  initialize(server, config = {}) {
    if (this.io) {
      throw new Error('WebSocketService already initialized');
    }

    const finalConfig = {
      ...DEFAULT_CONFIG,
      ...config
    };

    this.server = server;
    this.io = new Server(server, {
      cors: {
        origin: finalConfig.frontendUrl,
        methods: finalConfig.allowedMethods
      }
    });

    this.io.on('connection', (socket) => {
      const clientId = uuidv4();
      this.connections.set(clientId, socket);

      socket.on('disconnect', () => {
        this.connections.delete(clientId);
        this.emit('client_disconnected', { clientId });
        logger.debug(`Client disconnected: ${clientId}`);
      });

      socket.on('event', (message) => {
        try {
          if (this.processedMessages.has(message.id)) {
            return;
          }

          // Validate message type against allowed types
          if (message.type && !Object.values(MessageTypes).includes(message.type)) {
            logger.warn(`Received message with invalid type: ${message.type}`);
          }

          this.processedMessages.add(message.id);
          this.emit('message', { ...message, clientId });

          // Cleanup old processed message IDs
          if (this.processedMessages.size > 1000) {
            const iterator = this.processedMessages.values();
            this.processedMessages.delete(iterator.next().value);
          }
        } catch (error) {
          logger.error('Error processing message:', error);
          socket.emit('error', { error: 'Invalid message format' });
        }
      });

      socket.on('reconciliation_request', (data) => {
        this.emit('reconciliation_request', { ...data, clientId });
      });

      this.emit('client_connected', { clientId, socket });
      logger.debug(`New client connected: ${clientId}`);
    });

    logger.info('WebSocket service initialized');
  }

  broadcast(event, data) {
    if (!this.io) {
      throw new Error('WebSocketService not initialized');
    }

    const message = {
      id: uuidv4(),
      type: event,
      data,
      timestamp: Date.now(),
      version: this.stateVersion
    };

    this.io.emit('event', message);
    logger.debug(`Broadcasting event ${event} to all clients`);
    return message.id;
  }

  sendTo(clientId, event, data) {
    const socket = this.connections.get(clientId);
    if (!socket) {
      logger.warn(`Client ${clientId} not found for targeted message`);
      return null;
    }

    const message = {
      id: uuidv4(),
      type: event,
      data,
      timestamp: Date.now(),
      version: this.stateVersion
    };

    socket.emit('event', message);
    logger.debug(`Sent event ${event} to client ${clientId}`);
    return message.id;
  }

  static getInstance() {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService();
    }
    return WebSocketService.instance;
  }
}

// Create singleton instance
const webSocketService = WebSocketService.getInstance();

// Export the singleton instance as default and named exports
export default webSocketService;
export const getInstance = () => webSocketService;
export { WebSocketService };