import { io, Socket } from 'socket.io-client';

const BASE_URL = 'http://localhost:5000';

export interface WebSocketEvent<T = any> {
  type: string;
  data: T;
  version: number;
  timestamp: number;
}

export interface ReconciliationResponse {
  events: {
    [type: string]: WebSocketEvent[];
  };
  currentVersion: number;
}

type EventHandler = (data: any, event: WebSocketEvent) => void;

class WebSocketService {
  private socket: Socket | null = null;
  private eventHandlers: Map<string, Set<EventHandler>> = new Map();
  private lastKnownVersion: number = 0;
  private isConnected: boolean = false;
  private reconnectionAttempts: number = 0;
  private maxReconnectionAttempts: number = 5;

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.socket = io(BASE_URL, {
          reconnection: true,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
          reconnectionAttempts: this.maxReconnectionAttempts,
        });

        this.socket.on('connect', () => {
          console.log('Connected to WebSocket server');
          this.isConnected = true;
          this.reconnectionAttempts = 0;
          this.requestReconciliation();
          resolve();
        });

        this.socket.on('disconnect', () => {
          console.log('Disconnected from WebSocket server');
          this.isConnected = false;
        });

        this.socket.on('event', (event: WebSocketEvent) => {
          this.handleEvent(event);
        });

        this.socket.on('reconciliation_response', (response: ReconciliationResponse) => {
          this.handleReconciliation(response);
        });

        this.socket.on('connect_error', (error) => {
          console.error('Connection error:', error);
          this.reconnectionAttempts++;
          if (this.reconnectionAttempts >= this.maxReconnectionAttempts) {
            reject(new Error('Failed to connect to WebSocket server'));
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  subscribe(eventTypes: string[]): void {
    if (!this.socket?.connected) {
      throw new Error('Not connected to WebSocket server');
    }
    this.socket.emit('subscribe', eventTypes);
  }

  unsubscribe(eventTypes: string[]): void {
    if (!this.socket?.connected) {
      throw new Error('Not connected to WebSocket server');
    }
    this.socket.emit('unsubscribe', eventTypes);
  }

  on(eventType: string, handler: EventHandler): void {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, new Set());
    }
    this.eventHandlers.get(eventType)!.add(handler);
  }

  off(eventType: string, handler: EventHandler): void {
    const handlers = this.eventHandlers.get(eventType);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.eventHandlers.delete(eventType);
      }
    }
  }

  private handleEvent(event: WebSocketEvent): void {
    this.lastKnownVersion = event.version;
    
    // Call specific event handlers
    const handlers = this.eventHandlers.get(event.type);
    if (handlers) {
      handlers.forEach(handler => handler(event.data, event));
    }

    // Call wildcard handlers
    const wildcardHandlers = this.eventHandlers.get('*');
    if (wildcardHandlers) {
      wildcardHandlers.forEach(handler => handler(event.data, event));
    }
  }

  private requestReconciliation(): void {
    if (!this.socket?.connected) {
      throw new Error('Not connected to WebSocket server');
    }

    const eventTypes = Array.from(this.eventHandlers.keys()).filter(type => type !== '*');
    this.socket.emit('reconciliation_request', {
      lastVersion: this.lastKnownVersion,
      eventTypes,
    });
  }

  private handleReconciliation(response: ReconciliationResponse): void {
    for (const type in response.events) {
      const events = response.events[type];
      events.forEach(event => {
        this.handleEvent(event);
      });
    }
    this.lastKnownVersion = response.currentVersion;
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }
}

export const websocketService = new WebSocketService(); 