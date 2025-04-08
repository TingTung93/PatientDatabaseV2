/**
 * EventClient
 * 
 * WebSocket client for handling real-time events from the Patient Information System.
 * Uses Socket.IO for communication and includes:
 * - Connection management
 * - Event subscription
 * - Client-side event handling
 * - Reconciliation for missed events
 */
class EventClient {
  /**
   * Create a new EventClient
   * @param {Object} options - Client configuration options
   */
  constructor(options = {}) {
    // Configuration
    this.url = options.url || 'http://localhost:5000';
    this.reconnectAttempts = options.reconnectAttempts || 5;
    this.reconnectDelay = options.reconnectDelay || 2000;
    this.subscriptions = new Set();
    
    // State
    this.socket = null;
    this.connected = false;
    this.reconnecting = false;
    this.reconnectCount = 0;
    this.lastVersion = 0;
    this.eventHandlers = new Map();
    
    // Bind methods to maintain context
    this.handleEvent = this.handleEvent.bind(this);
    this.handleError = this.handleError.bind(this);
    this.handleDisconnect = this.handleDisconnect.bind(this);
  }
  
  /**
   * Connect to the WebSocket server
   * @returns {Promise<void>} - Resolves when connected
   */
  connect() {
    return new Promise((resolve, reject) => {
      try {
        // Create Socket.IO instance
        this.socket = io(this.url, {
          reconnection: false, // We handle reconnection manually
          timeout: 10000      // 10 second timeout
        });
        
        // Connection successful
        this.socket.on('connect', () => {
          console.log('WebSocket connected');
          this.connected = true;
          this.reconnectCount = 0;
          resolve();
        });
        
        // Handle events from server
        this.socket.on('event', this.handleEvent);
        
        // Handle reconciliation response
        this.socket.on('reconciliation_response', (response) => {
          console.log(`Received ${response.events.length} events during reconciliation`);
          
          // Process missed events in order
          response.events.forEach(event => {
            this.handleEvent(event);
          });
          
          // Update version
          this.lastVersion = response.currentVersion;
        });
        
        // Handle subscription confirmation
        this.socket.on('subscription_confirmed', (data) => {
          console.log('Subscriptions confirmed:', data.eventTypes);
          this.lastVersion = data.currentVersion;
        });
        
        // Error handling
        this.socket.on('error', this.handleError);
        this.socket.on('connect_error', (error) => {
          console.error('Connection error:', error);
          reject(error);
        });
        
        // Disconnection handling
        this.socket.on('disconnect', this.handleDisconnect);
      } catch (error) {
        console.error('Failed to initialize Socket.IO client:', error);
        reject(error);
      }
    });
  }
  
  /**
   * Disconnect from the WebSocket server
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
    }
  }
  
  /**
   * Subscribe to event types
   * @param {string|string[]} eventTypes - Event type(s) to subscribe to
   */
  subscribe(eventTypes) {
    if (!this.connected || !this.socket) {
      console.warn('Cannot subscribe: Not connected');
      return;
    }
    
    const types = Array.isArray(eventTypes) ? eventTypes : [eventTypes];
    
    // Add to local subscriptions
    types.forEach(type => this.subscriptions.add(type));
    
    // Send subscription request
    this.socket.emit('subscribe', Array.from(this.subscriptions));
  }
  
  /**
   * Unsubscribe from event types
   * @param {string|string[]} eventTypes - Event type(s) to unsubscribe from
   */
  unsubscribe(eventTypes) {
    if (!this.connected || !this.socket) {
      console.warn('Cannot unsubscribe: Not connected');
      return;
    }
    
    const types = Array.isArray(eventTypes) ? eventTypes : [eventTypes];
    
    // Remove from local subscriptions
    types.forEach(type => this.subscriptions.delete(type));
    
    // Send unsubscription request
    this.socket.emit('unsubscribe', types);
  }
  
  /**
   * Request reconciliation of missed events
   */
  requestReconciliation() {
    if (!this.connected || !this.socket) {
      console.warn('Cannot request reconciliation: Not connected');
      return;
    }
    
    this.socket.emit('reconciliation_request', {
      lastVersion: this.lastVersion,
      eventTypes: Array.from(this.subscriptions)
    });
  }
  
  /**
   * Register an event handler
   * @param {string} eventType - Event type to handle ('*' for all events)
   * @param {Function} handler - Handler function(data, event)
   */
  on(eventType, handler) {
    if (typeof handler !== 'function') {
      console.error('Event handler must be a function');
      return;
    }
    
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, []);
    }
    
    this.eventHandlers.get(eventType).push(handler);
  }
  
  /**
   * Remove an event handler
   * @param {string} eventType - Event type
   * @param {Function} handler - Handler to remove
   */
  off(eventType, handler) {
    if (!this.eventHandlers.has(eventType)) {
      return;
    }
    
    const handlers = this.eventHandlers.get(eventType);
    const index = handlers.indexOf(handler);
    
    if (index !== -1) {
      handlers.splice(index, 1);
    }
  }
  
  /**
   * Handle incoming event
   * @param {Object} event - Event object
   */
  handleEvent(event) {
    // Update latest version
    if (event.version > this.lastVersion) {
      this.lastVersion = event.version;
    }
    
    // Call type-specific handlers
    if (this.eventHandlers.has(event.type)) {
      this.eventHandlers.get(event.type).forEach(handler => {
        try {
          handler(event.data, event);
        } catch (error) {
          console.error(`Error in event handler for ${event.type}:`, error);
        }
      });
    }
    
    // Call wildcard handlers
    if (this.eventHandlers.has('*')) {
      this.eventHandlers.get('*').forEach(handler => {
        try {
          handler(event.data, event);
        } catch (error) {
          console.error('Error in wildcard event handler:', error);
        }
      });
    }
  }
  
  /**
   * Handle WebSocket error
   * @param {Object} error - Error object
   */
  handleError(error) {
    console.error('WebSocket error:', error);
  }
  
  /**
   * Handle disconnection
   * @param {string} reason - Disconnect reason
   */
  handleDisconnect(reason) {
    console.log('WebSocket disconnected:', reason);
    this.connected = false;
    
    // Attempt reconnection if not intentional
    if (reason !== 'io client disconnect') {
      this.attemptReconnect();
    }
  }
  
  /**
   * Attempt to reconnect to the server
   */
  attemptReconnect() {
    if (this.reconnecting || this.reconnectCount >= this.reconnectAttempts) {
      return;
    }
    
    this.reconnecting = true;
    this.reconnectCount++;
    
    console.log(`Attempting to reconnect (${this.reconnectCount}/${this.reconnectAttempts})...`);
    
    setTimeout(() => {
      this.connect()
        .then(() => {
          console.log('Reconnected successfully');
          this.reconnecting = false;
          
          // Resubscribe to previous subscriptions
          if (this.subscriptions.size > 0) {
            this.subscribe(Array.from(this.subscriptions));
          }
          
          // Request reconciliation for missed events
          this.requestReconciliation();
        })
        .catch(error => {
          console.error('Reconnection failed:', error);
          this.reconnecting = false;
          
          // Try again if attempts remain
          if (this.reconnectCount < this.reconnectAttempts) {
            this.attemptReconnect();
          }
        });
    }, this.reconnectDelay);
  }
  
  /**
   * Get client status information
   * @returns {Object} - Client status
   */
  getStatus() {
    return {
      connected: this.connected,
      url: this.url,
      reconnectCount: this.reconnectCount,
      lastVersion: this.lastVersion,
      subscriptions: Array.from(this.subscriptions)
    };
  }
}

// Sample usage:
/*
const client = new EventClient();

client.connect().then(() => {
  console.log('Connected to WebSocket server');
  
  // Subscribe to patient events
  client.subscribe([
    'patient_created',
    'patient_updated',
    'patient_deleted',
    'patients_updated'
  ]);
  
  // Register event handlers
  client.on('patient_created', (data) => {
    console.log('New patient created:', data);
    updatePatientList();
  });
  
  client.on('patient_updated', (data) => {
    console.log('Patient updated:', data);
    updatePatientDetails(data.id);
  });
  
  client.on('patient_deleted', (data) => {
    console.log('Patient deleted:', data.id);
    removePatientFromList(data.id);
  });
  
  // Wildcard handler for all events
  client.on('*', (data, event) => {
    console.log(`Event received: ${event.type} (v${event.version})`);
    updateEventLog(event);
  });
});
*/ 