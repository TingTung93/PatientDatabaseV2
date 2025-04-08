import environment from '../config/environment';

type MessageHandler = (event: MessageEvent) => void;
type StatusHandler = (status: boolean) => void;

interface QueuedMessage {
  data: any;
  timestamp: number;
  retries: number;
}

class WebSocketService {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts: number;
  private reconnectDelay: number;
  private messageHandlers: Set<MessageHandler> = new Set();
  private statusHandlers: Set<StatusHandler> = new Set();
  private pingInterval: NodeJS.Timeout | null = null;
  private heartbeatTimeout: NodeJS.Timeout | null = null;
  private messageQueue: QueuedMessage[] = [];
  private lastHeartbeat: number = Date.now();

  constructor(url: string = environment.api.websocket) {
    this.url = url;
    this.maxReconnectAttempts = environment.websocket.reconnectAttempts;
    this.reconnectDelay = environment.websocket.reconnectDelay;
  }

  connect() {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        console.log('WebSocket connected to:', this.url);
        this.reconnectAttempts = 0;
        this.setupHeartbeat();
        this.notifyStatusHandlers(true);
        this.processMessageQueue();
      };

      this.ws.onclose = event => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        this.cleanup();
        this.notifyStatusHandlers(false);
        this.attemptReconnect();
      };

      this.ws.onerror = error => {
        console.error('WebSocket error:', error);
        // Don't attempt to reconnect on certain error types
        if (error instanceof ErrorEvent && error.error instanceof TypeError) {
          console.warn('Network error - will retry connection');
        }
      };

      this.ws.onmessage = event => {
        // Update last heartbeat time for any message received
        this.lastHeartbeat = Date.now();

        try {
          const data = JSON.parse(event.data);

          // Handle heartbeat response
          if (data.type === 'pong') {
            return;
          }

          this.messageHandlers.forEach(handler => {
            try {
              handler(event);
            } catch (error) {
              console.error('Error in message handler:', error);
            }
          });
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      this.notifyStatusHandlers(false);
      this.attemptReconnect();
    }
  }

  private setupHeartbeat() {
    // Clear any existing intervals
    this.cleanup();

    // Send heartbeat
    this.pingInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, environment.websocket.heartbeatInterval);

    // Check for heartbeat timeout
    this.heartbeatTimeout = setInterval(() => {
      const timeSinceLastHeartbeat = Date.now() - this.lastHeartbeat;
      if (timeSinceLastHeartbeat > environment.websocket.heartbeatTimeout) {
        console.warn('Heartbeat timeout - reconnecting...');
        this.reconnect();
      }
    }, environment.websocket.heartbeatInterval);
  }

  private cleanup() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    if (this.heartbeatTimeout) {
      clearInterval(this.heartbeatTimeout);
      this.heartbeatTimeout = null;
    }
  }

  private reconnect() {
    if (this.ws) {
      this.ws.close();
    }
    this.connect();
  }

  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.warn('Max reconnection attempts reached');
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    console.log(`Attempting to reconnect in ${delay}ms...`);

    setTimeout(() => {
      this.reconnectAttempts++;
      this.connect();
    }, delay);
  }

  private notifyStatusHandlers(status: boolean) {
    this.statusHandlers.forEach(handler => {
      try {
        handler(status);
      } catch (error) {
        console.error('Error in status handler:', error);
      }
    });
  }

  private processMessageQueue() {
    while (this.messageQueue.length > 0 && this.ws?.readyState === WebSocket.OPEN) {
      const message = this.messageQueue.shift();
      if (message) {
        try {
          this.ws.send(JSON.stringify(message.data));
        } catch (error) {
          console.error('Error sending queued message:', error);
          // If message is not too old and hasn't been retried too many times, requeue it
          if (
            Date.now() - message.timestamp < 300000 && // 5 minutes
            message.retries < 3
          ) {
            this.messageQueue.unshift({
              ...message,
              retries: message.retries + 1,
            });
          }
        }
      }
    }
  }

  addMessageHandler(handler: MessageHandler) {
    this.messageHandlers.add(handler);
  }

  removeMessageHandler(handler: MessageHandler) {
    this.messageHandlers.delete(handler);
  }

  addStatusHandler(handler: StatusHandler) {
    this.statusHandlers.add(handler);
  }

  removeStatusHandler(handler: StatusHandler) {
    this.statusHandlers.delete(handler);
  }

  disconnect() {
    if (this.ws) {
      this.cleanup();
      this.ws.close();
      this.ws = null;
    }
  }

  send(data: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(data));
      } catch (error) {
        console.error('Error sending message:', error);
        this.queueMessage(data);
      }
    } else {
      this.queueMessage(data);
    }
  }

  private queueMessage(data: any) {
    // Remove oldest messages if queue is too long
    if (this.messageQueue.length >= environment.websocket.messageQueueLimit) {
      this.messageQueue.shift();
    }

    this.messageQueue.push({
      data,
      timestamp: Date.now(),
      retries: 0,
    });
  }
}

// Create singleton instance
export const websocketService = new WebSocketService();

export default websocketService;
