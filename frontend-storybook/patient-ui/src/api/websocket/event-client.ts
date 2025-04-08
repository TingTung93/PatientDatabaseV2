import { io, Socket } from 'socket.io-client';
import { EventHandler, GenericEventHandler, WebSocketEvent } from './event-types';

// Define the type for reconciliation response payload
type ReconciliationResponsePayload = {
  events: Record<string, WebSocketEvent[]>;
  currentVersion: number;
};

interface EventClientOptions {
  url: string;
  reconnectAttempts?: number;
  reconnectDelay?: number;
}

export class EventClient {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<GenericEventHandler>> = new Map();
  private wildcardListeners: Set<GenericEventHandler> = new Set();
  private lastKnownVersion: number = 0;
  private subscribedEvents: Set<string> = new Set();
  private options: EventClientOptions;
  private isConnected: boolean = false;

  constructor(options: EventClientOptions) {
    this.options = {
      reconnectAttempts: 5,
      reconnectDelay: 1000,
      ...options,
    };
  }

  /**
   * Connect to the WebSocket server
   */
  public connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket = io(this.options.url, {
        reconnection: true,
        // Provide default values if options are undefined
        reconnectionAttempts: this.options.reconnectAttempts ?? 5,
        reconnectionDelay: this.options.reconnectDelay ?? 1000,
      });

      this.socket.on('connect', () => {
        console.log('Connected to WebSocket server');
        this.isConnected = true;

        // Re-subscribe to events on reconnection
        if (this.subscribedEvents.size > 0) {
          this.subscribe([...this.subscribedEvents]);
        }

        // Request reconciliation on reconnection
        this.requestReconciliation();

        resolve();
      });

      this.socket.on('connect_error', (error: Error) => {
        console.error('Connection failed:', error);
        reject(error);
      });

      this.socket.on('disconnect', () => {
        console.log('Disconnected from WebSocket server');
        this.isConnected = false;
      });

      this.socket.on('event', (event: WebSocketEvent) => {
        this.handleEvent(event);
      });

      this.socket.on('reconciliation_response', (response: ReconciliationResponsePayload) => {
        this.handleReconciliation(response);
      });
    });
  }

  /**
   * Disconnect from the WebSocket server
   */
  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  /**
   * Subscribe to event types
   */
  public subscribe(eventTypes: string[]): void {
    if (!this.socket || !this.isConnected) {
      console.warn('Cannot subscribe to events: not connected');
      return;
    }

    eventTypes.forEach(type => this.subscribedEvents.add(type));
    this.socket.emit('subscribe', eventTypes);
  }

  /**
   * Unsubscribe from event types
   */
  public unsubscribe(eventTypes: string[]): void {
    if (!this.socket || !this.isConnected) {
      console.warn('Cannot unsubscribe from events: not connected');
      return;
    }

    eventTypes.forEach(type => this.subscribedEvents.delete(type));
    this.socket.emit('unsubscribe', eventTypes);
  }

  /**
   * Register an event handler for a specific event type or wildcard handler
   */
  public on<T extends WebSocketEvent>(
    type: T['type'] | '*',
    handler: T['type'] extends '*' ? GenericEventHandler : EventHandler<T>
  ): void {
    if (type === '*') {
      this.wildcardListeners.add(handler as GenericEventHandler);
      return;
    }

    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(handler as GenericEventHandler);
  }

  /**
   * Remove an event handler
   */
  public off<T extends WebSocketEvent>(
    type: T['type'] | '*',
    handler: T['type'] extends '*' ? GenericEventHandler : EventHandler<T>
  ): void {
    if (type === '*') {
      this.wildcardListeners.delete(handler as GenericEventHandler);
      return;
    }

    if (this.listeners.has(type)) {
      this.listeners.get(type)!.delete(handler as GenericEventHandler);
    }
  }

  /**
   * Request reconciliation to get missed events
   */
  public requestReconciliation(): void {
    if (!this.socket || !this.isConnected) {
      console.warn('Cannot request reconciliation: not connected');
      return;
    }

    this.socket.emit('reconciliation_request', {
      lastVersion: this.lastKnownVersion,
      eventTypes: [...this.subscribedEvents],
    });
  }

  /**
   * Handle an incoming event
   */
  private handleEvent(event: WebSocketEvent): void {
    // Update the last known version
    if (event.version > this.lastKnownVersion) {
      this.lastKnownVersion = event.version;
    }

    // Call specific event handlers
    if (this.listeners.has(event.type)) {
      this.listeners.get(event.type)!.forEach(handler => {
        handler(event.data, event);
      });
    }

    // Call wildcard handlers
    this.wildcardListeners.forEach(handler => {
      handler(event.data, event);
    });
  }

  /**
   * Handle reconciliation response
   */
  private handleReconciliation(response: {
    events: Record<string, WebSocketEvent[]>;
    currentVersion: number;
  }): void {
    console.log(`Received missed events: ${Object.values(response.events).flat().length}`);

    // Process missed events by type
    for (const type in response.events) {
      const events = response.events[type];
      // Check if events array exists for this type
      if (events) {
        events.forEach(event => {
          this.handleEvent(event);
        });
      }
    }

    // Update version
    this.lastKnownVersion = response.currentVersion;
  }

  /**
   * Check if the client is connected
   */
  public isSocketConnected(): boolean {
    return this.isConnected;
  }
}

export default EventClient;
