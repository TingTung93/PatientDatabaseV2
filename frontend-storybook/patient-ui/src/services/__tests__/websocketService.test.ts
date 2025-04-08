import { websocketService as serviceInstance } from '../websocketService'; // Import the singleton instance
import environment from '../../config/environment'; // Import environment config

// --- Mock WebSocket --- 
// Store the original WebSocket
const OriginalWebSocket = global.WebSocket;

// Define a mock WebSocket class
let mockWebSocketInstance: MockWebSocket | null = null;

class MockWebSocket {
    static instances: MockWebSocket[] = [];
    url: string;
    readyState: number = WebSocket.CONNECTING; // Initial state
    static CONNECTING = 0;
    static OPEN = 1;
    static CLOSING = 2;
    static CLOSED = 3;

    onopen: (() => void) | null = null;
    onclose: (() => void) | null = null;
    onerror: ((event: any) => void) | null = null;
    onmessage: ((event: MessageEvent) => void) | null = null;
    send = jest.fn();
    close = jest.fn(() => {
        this.readyState = MockWebSocket.CLOSED;
        // Need to manually trigger onclose when close() is called by the service
        if (this.onclose) {
            // Use queueMicrotask or setTimeout to mimic async nature if needed
             queueMicrotask(() => this.onclose!());
        }
    });

    constructor(url: string) {
        this.url = url;
        MockWebSocket.instances.push(this);
        mockWebSocketInstance = this; // Track the latest instance
        console.log(`MockWebSocket created for URL: ${url}`);
    }

    // --- Methods to simulate server actions ---
    // Call this from tests to simulate connection opening
    static simulateOpen() {
        if (mockWebSocketInstance && mockWebSocketInstance.readyState === MockWebSocket.CONNECTING) {
            mockWebSocketInstance.readyState = MockWebSocket.OPEN;
            if (mockWebSocketInstance.onopen) {
                // Use queueMicrotask or setTimeout to mimic async nature if needed
                 queueMicrotask(() => mockWebSocketInstance!.onopen!());
            }
        } else {
            console.warn('SimulateOpen called but WebSocket not in CONNECTING state or no instance.');
        }
    }

    // Call this from tests to simulate receiving a message
    static simulateMessage(data: any) {
        if (mockWebSocketInstance && mockWebSocketInstance.readyState === MockWebSocket.OPEN) {
            const event = new MessageEvent('message', { data: JSON.stringify(data) });
            if (mockWebSocketInstance.onmessage) {
                 queueMicrotask(() => mockWebSocketInstance!.onmessage!(event));
            }
        } else {
             console.warn('SimulateMessage called but WebSocket not OPEN or no instance.');
        }
    }

     // Call this from tests to simulate server closing the connection or an error
    static simulateClose(wasClean = true, code = 1000, reason = '') {
        if (mockWebSocketInstance) {
            mockWebSocketInstance.readyState = MockWebSocket.CLOSED;
             if (mockWebSocketInstance.onclose) {
                // const event = new CloseEvent('close', { wasClean, code, reason });
                 queueMicrotask(() => mockWebSocketInstance!.onclose!()); // Pass event if needed by handler
             }
        } else {
            console.warn('SimulateClose called but no instance.');
        }
    }
    
     // Call this from tests to simulate an error
    static simulateError(errorDetails = 'Simulated error') {
        if (mockWebSocketInstance) {
             if (mockWebSocketInstance.onerror) {
                const event = new Event('error'); // Basic error event
                 queueMicrotask(() => mockWebSocketInstance!.onerror!(event));
             }
             // Typically, an error might also trigger a close
             // MockWebSocket.simulateClose(false, 1006, errorDetails); 
        } else {
             console.warn('SimulateError called but no instance.');
        }
    }
}

// --- Tests --- 
describe('WebSocketService', () => {
    // Use fake timers for intervals (heartbeat, reconnect delay)
    jest.useFakeTimers();

    beforeAll(() => {
        // Assign the mock WebSocket class globally before tests run
        global.WebSocket = MockWebSocket as any;
    });

    afterAll(() => {
        // Restore the original WebSocket class after tests
        global.WebSocket = OriginalWebSocket;
        jest.useRealTimers(); // Restore real timers
    });

    beforeEach(() => {
        // Reset state before each test
        MockWebSocket.instances = [];
        mockWebSocketInstance = null;
        // Ensure service is disconnected initially if it persists state (it shouldn't for these tests)
        serviceInstance.disconnect(); 
        jest.clearAllMocks();
        jest.clearAllTimers();
    });

    it('should create a WebSocket instance on connect', () => {
        serviceInstance.connect();
        expect(MockWebSocket.instances.length).toBe(1);
        expect(mockWebSocketInstance?.url).toBe(environment.api.websocket);
    });

    it('should notify status handlers on open and close', () => {
        const mockStatusHandler = jest.fn();
        serviceInstance.addStatusHandler(mockStatusHandler);
        serviceInstance.connect();

        // Simulate connection opening
        MockWebSocket.simulateOpen();
        expect(mockStatusHandler).toHaveBeenCalledWith(true);
        
        // Simulate connection closing (e.g., server disconnect)
        MockWebSocket.simulateClose();
        expect(mockStatusHandler).toHaveBeenCalledWith(false);
        expect(mockStatusHandler).toHaveBeenCalledTimes(2);
    });

    it('should notify message handlers on message', () => {
        const mockMessageHandler = jest.fn();
        serviceInstance.addMessageHandler(mockMessageHandler);
        serviceInstance.connect();
        MockWebSocket.simulateOpen(); // Connect first

        const messageData = { type: 'test', payload: 'hello' };
        MockWebSocket.simulateMessage(messageData);

        expect(mockMessageHandler).toHaveBeenCalledTimes(1);
        expect(mockMessageHandler).toHaveBeenCalledWith(expect.objectContaining({
             data: JSON.stringify(messageData) 
        }));
    });

    it('should send message immediately if connected', () => {
        serviceInstance.connect();
        MockWebSocket.simulateOpen();
        
        const message = { type: 'greeting', content: 'Hi' };
        serviceInstance.send(message);
        
        expect(mockWebSocketInstance?.send).toHaveBeenCalledTimes(1);
        expect(mockWebSocketInstance?.send).toHaveBeenCalledWith(JSON.stringify(message));
    });

    it('should queue message if not connected and send on connect', () => {
        const message = { type: 'important', data: 'later' };
        serviceInstance.send(message); // Send while disconnected

        expect(mockWebSocketInstance).toBeNull(); // Not connected yet
        
        serviceInstance.connect();
        expect(mockWebSocketInstance?.send).not.toHaveBeenCalled(); // Not sent yet

        MockWebSocket.simulateOpen(); // Now connect
        
        expect(mockWebSocketInstance?.send).toHaveBeenCalledTimes(1); // Sent from queue
        expect(mockWebSocketInstance?.send).toHaveBeenCalledWith(JSON.stringify(message));
    });

    it('should attempt reconnection on close', () => {
        serviceInstance.connect();
        MockWebSocket.simulateOpen();
        expect(MockWebSocket.instances.length).toBe(1);

        MockWebSocket.simulateClose(); // Simulate server closing connection

        // Advance timer for the first reconnect delay
        jest.advanceTimersByTime(environment.websocket.reconnectDelay);
        
        // Should have attempted to connect again
        expect(MockWebSocket.instances.length).toBe(2);
        expect(mockWebSocketInstance).not.toBeNull();
        expect(mockWebSocketInstance?.readyState).toBe(MockWebSocket.CONNECTING);
    });

    it('should stop reconnecting after max attempts', () => {
         serviceInstance.connect();
         MockWebSocket.simulateOpen();
         expect(MockWebSocket.instances.length).toBe(1);
 
         for (let i = 0; i < environment.websocket.reconnectAttempts; i++) {
             MockWebSocket.simulateClose();
             const delay = environment.websocket.reconnectDelay * Math.pow(2, i);
             jest.advanceTimersByTime(delay + 1); // Advance past the delay
             expect(MockWebSocket.instances.length).toBe(i + 2); // Check new instance created
             // Simulate immediate close again for next attempt
             if(i < environment.websocket.reconnectAttempts - 1) {
                  // Optional: simulate open/close cycle if needed
             } else {
                 // On last attempt, simulate close one more time
                  MockWebSocket.simulateClose();
             }
         }
 
         // Try advancing time again - should not create more instances
         jest.advanceTimersByTime(environment.websocket.reconnectDelay * Math.pow(2, environment.websocket.reconnectAttempts));
         expect(MockWebSocket.instances.length).toBe(environment.websocket.reconnectAttempts + 1);
     });

    it('should send pings at intervals and reconnect on heartbeat timeout', () => {
        serviceInstance.connect();
        MockWebSocket.simulateOpen();
        expect(mockWebSocketInstance?.send).not.toHaveBeenCalledWith(JSON.stringify({ type: 'ping' }));

        // Advance time to first heartbeat interval
        jest.advanceTimersByTime(environment.websocket.heartbeatInterval);
        expect(mockWebSocketInstance?.send).toHaveBeenCalledWith(JSON.stringify({ type: 'ping' }));
        expect(mockWebSocketInstance?.send).toHaveBeenCalledTimes(1);
        
        // Simulate receiving a pong (or any message) to reset timer
        MockWebSocket.simulateMessage({ type: 'pong' });

        // Advance time just before next timeout would occur
        jest.advanceTimersByTime(environment.websocket.heartbeatTimeout - 10); 
        expect(MockWebSocket.instances.length).toBe(1); // Should not have reconnected

        // Advance time past the timeout threshold
        jest.advanceTimersByTime(20); 
        // Should have closed and started reconnecting (creating a new instance)
        expect(MockWebSocket.instances.length).toBe(2);
    });
    
    // TODO: Add tests for queue limits, error handling in handlers, etc.
}); 