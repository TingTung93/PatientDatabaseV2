const WebSocket = require('ws');
const WebSocketServiceModule = require('../WebSocketService');

// Extract the WebSocketService class and the exported methods
const { WebSocketService, disconnect, getInstance } = WebSocketServiceModule;

// Mock WebSocket
jest.mock('ws');

describe('WebSocketService', () => {
  let mockWs;
  let wsInstance;
  
  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Reset WebSocketService state
    disconnect();
    
    // Create a new instance for each test
    wsInstance = getInstance();
    wsInstance.messageQueue = [];
    wsInstance.processedMessages = new Set();
    wsInstance.pendingAcks = new Map();
    wsInstance.stateVersion = 0;
    
    // Setup WebSocket mock
    mockWs = {
      on: jest.fn(),
      send: jest.fn(),
      close: jest.fn(),
      ping: jest.fn(),
      readyState: WebSocket.OPEN
    };
    
    WebSocket.mockImplementation(() => mockWs);
  });

  describe('Connection Management', () => {
    test('should establish connection and setup event listeners', () => {
      wsInstance.connect();
      
      expect(WebSocket).toHaveBeenCalledWith('ws://localhost:8080');
      expect(mockWs.on).toHaveBeenCalledWith('open', expect.any(Function));
      expect(mockWs.on).toHaveBeenCalledWith('message', expect.any(Function));
      expect(mockWs.on).toHaveBeenCalledWith('close', expect.any(Function));
      expect(mockWs.on).toHaveBeenCalledWith('error', expect.any(Function));
    });

    test('should handle connection open event correctly', () => {
      const statusListener = jest.fn();
      wsInstance.on('connectionStatus', statusListener);
      
      wsInstance.connect();
      const openHandler = mockWs.on.mock.calls.find(call => call[0] === 'open')[1];
      openHandler();
      
      expect(statusListener).toHaveBeenCalledWith('connected');
      expect(wsInstance.connectionStatus).toBe('connected');
      expect(wsInstance.retryInterval).toBe(1000);
    });

    test('should handle connection close event correctly', () => {
      const statusListener = jest.fn();
      wsInstance.on('connectionStatus', statusListener);
      
      wsInstance.connect();
      const closeHandler = mockWs.on.mock.calls.find(call => call[0] === 'close')[1];
      closeHandler();
      
      expect(statusListener).toHaveBeenCalledWith('disconnected');
      expect(wsInstance.connectionStatus).toBe('disconnected');
    });
  });

  describe('Message Handling', () => {
    test('should send messages with proper format', () => {
      wsInstance.connect();
      const messageId = wsInstance.send('TEST_TYPE', { foo: 'bar' });
      
      expect(mockWs.send).toHaveBeenCalledWith(expect.any(String));
      const sentMessage = JSON.parse(mockWs.send.mock.calls[0][0]);
      
      expect(sentMessage).toEqual({
        id: messageId,
        type: 'TEST_TYPE',
        data: { foo: 'bar' },
        timestamp: expect.any(Number),
        version: 0
      });
    });

    test('should queue messages when disconnected', () => {
      mockWs.readyState = WebSocket.CLOSED;
      wsInstance.connect();
      
      wsInstance.send('TEST_TYPE', { foo: 'bar' });
      expect(wsInstance.messageQueue.length).toBe(1);
      expect(mockWs.send).not.toHaveBeenCalled();
    });

    test('should handle message acknowledgments', () => {
      wsInstance.connect();
      const messageId = wsInstance.send('TEST_TYPE', { foo: 'bar' });
      
      const messageHandler = mockWs.on.mock.calls.find(call => call[0] === 'message')[1];
      messageHandler(JSON.stringify({
        type: 'MESSAGE_ACK',
        id: messageId
      }));
      
      expect(wsInstance.pendingAcks.has(messageId)).toBeFalsy();
    });
  });

  describe('State Management', () => {
    test('should handle state updates with version control', () => {
      const stateListener = jest.fn();
      wsInstance.on('state', stateListener);
      wsInstance.connect();
      
      const messageHandler = mockWs.on.mock.calls.find(call => call[0] === 'message')[1];
      messageHandler(JSON.stringify({
        id: 'test-id',
        type: 'STATE_UPDATE',
        version: 1,
        data: { foo: 'bar' }
      }));
      
      expect(stateListener).toHaveBeenCalledWith({ foo: 'bar' });
      expect(wsInstance.stateVersion).toBe(1);
    });

    test('should ignore outdated state updates', () => {
      const stateListener = jest.fn();
      wsInstance.on('state', stateListener);
      wsInstance.stateVersion = 2;
      wsInstance.connect();
      
      const messageHandler = mockWs.on.mock.calls.find(call => call[0] === 'message')[1];
      messageHandler(JSON.stringify({
        id: 'test-id',
        type: 'STATE_UPDATE',
        version: 1,
        data: { foo: 'bar' }
      }));
      
      expect(stateListener).not.toHaveBeenCalled();
      expect(wsInstance.stateVersion).toBe(2);
    });
  });

  describe('Error Handling', () => {
    test('should handle WebSocket errors', () => {
      const statusListener = jest.fn();
      wsInstance.on('connectionStatus', statusListener);
      wsInstance.connect();
      
      const errorHandler = mockWs.on.mock.calls.find(call => call[0] === 'error')[1];
      errorHandler(new Error('Test error'));
      
      expect(statusListener).toHaveBeenCalledWith('error');
      expect(mockWs.close).toHaveBeenCalled();
    });

    test('should handle message parsing errors', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      wsInstance.connect();
      
      const messageHandler = mockWs.on.mock.calls.find(call => call[0] === 'message')[1];
      messageHandler('invalid-json');
      
      expect(consoleSpy).toHaveBeenCalledWith('Error processing message:', expect.any(Error));
      consoleSpy.mockRestore();
    });
  });

  describe('Reconnection Logic', () => {
    test('should attempt reconnection with exponential backoff', () => {
      jest.useFakeTimers();
      wsInstance.connect();
      
      const closeHandler = mockWs.on.mock.calls.find(call => call[0] === 'close')[1];
      closeHandler();
      
      jest.advanceTimersByTime(1000);
      expect(WebSocket).toHaveBeenCalledTimes(2);
      
      closeHandler();
      jest.advanceTimersByTime(2000);
      expect(WebSocket).toHaveBeenCalledTimes(3);
      
      jest.useRealTimers();
    });
  });
});