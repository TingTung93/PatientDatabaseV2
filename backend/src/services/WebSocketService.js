const WebSocket = require('ws');
const EventEmitter = require('events');
const { v4: uuidv4 } = require('uuid');

const MessageTypes = {
  STATE_UPDATE: 'STATE_UPDATE',
  STATE_REQUEST: 'STATE_REQUEST',
  MESSAGE_ACK: 'MESSAGE_ACK',
  RECONCILIATION_REQUEST: 'RECONCILIATION_REQUEST',
};

class WebSocketService extends EventEmitter {
  constructor(server) {
    super();
    this.wss = null;
    this.clients = new Map();
    this.messageQueue = []; // Queue for outgoing messages
    this.processedMessages = new Set(); // Track processed message IDs
    this.pendingAcks = new Map(); // Track pending acknowledgments
    this.stateVersion = 0; // Current state version
    this.maxQueueSize = 1000; // Maximum number of queued messages
    this.maxRetries = 5; // Maximum number of message retries
    this.connectionStatus = 'disconnected';
    this.retryInterval = 1000; // Starting retry interval in ms
    this.maxRetryInterval = 30000; // Maximum retry interval (30 seconds)

    if (server) {
      this.initialize(server);
    }
  }

  initialize(server) {
    this.wss = new WebSocket.Server({ server });

    this.wss.on('connection', (ws) => {
      const clientId = uuidv4();
      this.clients.set(clientId, ws);

      ws.on('message', (rawMessage) => {
        try {
          const message = JSON.parse(rawMessage);
          
          // Handle message acknowledgments
          if (message.type === MessageTypes.MESSAGE_ACK) {
            this.handleAcknowledgment(message.id);
            return;
          }

          // Prevent duplicate message processing
          if (this.processedMessages.has(message.id)) {
            return;
          }

          // Process the message based on type
          switch (message.type) {
            case MessageTypes.STATE_UPDATE:
              if (message.version > this.stateVersion) {
                this.stateVersion = message.version;
                this.emit('state', message.data);
              }
              break;

            case MessageTypes.STATE_REQUEST:
              this.emit('stateRequest', message.data);
              break;

            case MessageTypes.RECONCILIATION_REQUEST:
              this.handleReconciliationRequest(message);
              break;

            default:
              this.emit('message', message);
          }

          // Mark message as processed
          this.processedMessages.add(message.id);
          
          // Send acknowledgment
          this.sendAcknowledgment(message.id, ws);

          // Cleanup old processed message IDs (keep last 1000)
          if (this.processedMessages.size > 1000) {
            const iterator = this.processedMessages.values();
            this.processedMessages.delete(iterator.next().value);
          }
        } catch (error) {
          console.error('Error processing message:', error);
        }
      });

      ws.on('close', () => {
        this.clients.delete(clientId);
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.clients.delete(clientId);
      });
    });
  }

  broadcast(type, data) {
    const message = {
      id: uuidv4(),
      type,
      data,
      timestamp: Date.now(),
      version: this.stateVersion
    };

    this.clients.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        this.sendMessage(message, ws);
      }
    });

    return message.id; // Return message ID for tracking
  }

  sendTo(clientId, type, data) {
    const ws = this.clients.get(clientId);
    if (ws && ws.readyState === WebSocket.OPEN) {
      const message = {
        id: uuidv4(),
        type,
        data,
        timestamp: Date.now(),
        version: this.stateVersion
      };
      this.sendMessage(message, ws);
      return message.id;
    }
    return null;
  }

  sendMessage(message, ws) {
    ws.send(JSON.stringify(message));
    this.trackPendingAcknowledgment(message);
  }

  trackPendingAcknowledgment(message) {
    this.pendingAcks.set(message.id, {
      message,
      retries: 0,
      timeout: setTimeout(() => this.handleMessageTimeout(message.id), 5000)
    });
  }

  handleMessageTimeout(messageId) {
    const pending = this.pendingAcks.get(messageId);
    if (pending) {
      if (pending.retries < this.maxRetries) {
        // Retry sending the message
        pending.retries++;
        this.broadcast(pending.message.type, pending.message.data);
      } else {
        // Message failed after max retries
        this.pendingAcks.delete(messageId);
        this.emit('messageError', {
          error: 'Max retries exceeded',
          messageId
        });
      }
    }
  }

  handleAcknowledgment(messageId) {
    const pending = this.pendingAcks.get(messageId);
    if (pending) {
      clearTimeout(pending.timeout);
      this.pendingAcks.delete(messageId);
    }
  }

  sendAcknowledgment(messageId, ws) {
    const ackMessage = {
      id: uuidv4(),
      type: MessageTypes.MESSAGE_ACK,
      data: { messageId },
      timestamp: Date.now(),
      version: this.stateVersion
    };
    ws.send(JSON.stringify(ackMessage));
  }

  handleReconciliationRequest(message) {
    // Emit event for handling state reconciliation
    this.emit('reconciliationRequest', {
      clientVersion: message.data.currentVersion,
      serverVersion: this.stateVersion
    });
  }

  subscribe(event, callback) {
    this.on(event, callback);
  }

  unsubscribe(event, callback) {
    this.off(event, callback);
  }

  getStatus() {
    return {
      connections: this.clients.size,
      queuedMessages: this.messageQueue.length,
      pendingAcks: this.pendingAcks.size,
      stateVersion: this.stateVersion
    };
  }

  disconnect() {
    if (this.wss) {
      this.clients.forEach((ws) => {
        try {
          ws.close();
        } catch (error) {
          console.error('Error closing WebSocket connection:', error);
        }
      });
      this.clients.clear();
      this.wss.close();
      this.wss = null;
    }
    this.messageQueue = [];
    this.processedMessages.clear();
    this.pendingAcks.clear();
  }

  emit(event, data) {
    if (event === 'patient_created' || event === 'patient_updated' || event === 'patient_deleted') {
      this.broadcast(event, data);
    }
    super.emit(event, data);
  }

  connect() {
    this.ws = new WebSocket('ws://localhost:8080');
    
    this.ws.on('open', () => {
      this.connectionStatus = 'connected';
      this.retryInterval = 1000; // Reset retry interval on successful connection
      this.emit('connectionStatus', 'connected');
      
      // Send any queued messages
      if (this.messageQueue.length > 0) {
        while (this.messageQueue.length > 0) {
          const message = this.messageQueue.shift();
          this.sendMessage(message, this.ws);
        }
      }
    });
    
    this.ws.on('message', (data) => {
      try {
        const message = JSON.parse(data);
        this.handleMessage(message);
      } catch (error) {
        console.error('Error processing message:', error);
      }
    });
    
    this.ws.on('close', () => {
      this.connectionStatus = 'disconnected';
      this.emit('connectionStatus', 'disconnected');
      this.scheduleReconnect();
    });
    
    this.ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      this.emit('connectionStatus', 'error');
      this.ws.close();
    });
  }

  handleMessage(message) {
    // Implementation of handleMessage would go here
  }

  scheduleReconnect() {
    setTimeout(() => {
      this.connect();
      this.retryInterval = Math.min(this.retryInterval * 2, this.maxRetryInterval);
    }, this.retryInterval);
  }

  send(type, data) {
    const message = {
      id: uuidv4(),
      type,
      data,
      timestamp: Date.now(),
      version: this.stateVersion
    };
    
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.sendMessage(message, this.ws);
    } else {
      // Queue message for when connection is established
      this.messageQueue.push(message);
    }
    
    return message.id;
  }
}

// Create a singleton instance
let instance = null;

module.exports = {
  WebSocketService,
  getInstance: (server) => {
    if (!instance) {
      instance = new WebSocketService(server);
    }
    return instance;
  },
  disconnect: () => {
    if (instance) {
      instance.disconnect();
    }
  }
};