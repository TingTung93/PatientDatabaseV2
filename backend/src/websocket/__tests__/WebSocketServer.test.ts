import { Server as HttpServer } from 'http';
import { WebSocketServer } from '../WebSocketServer';
import { createTestClient, TestClient } from './testHelpers';
import { unlink } from 'fs/promises';
import { existsSync } from 'fs';

describe('WebSocketServer Integration', () => {
  let httpServer: HttpServer;
  let wsServer: WebSocketServer;
  let testClient: TestClient;
  const TEST_DB = './test-events.sqlite';
  const PORT = 3001;

  beforeAll(async () => {
    process.env.EVENTS_DATABASE = TEST_DB;
    httpServer = new HttpServer();
    wsServer = new WebSocketServer(httpServer);
    httpServer.listen(PORT);
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => {
      httpServer.close(() => {
        resolve();
      });
    });
    if (existsSync(TEST_DB)) {
      await unlink(TEST_DB);
    }
  });

  beforeEach(async () => {
    testClient = createTestClient(PORT);
  });

  afterEach(async () => {
    await testClient.disconnect();
  });

  it('should handle OCR progress events correctly', async () => {
    const taskId = 'test-task-1';
    const progressData = {
      taskId,
      progress: 50,
      pageNumber: 1,
      totalPages: 2,
      status: 'processing'
    };

    await testClient.connect();
    testClient.subscribeToOCR(taskId);

    // Setup event listener before emitting
    const eventPromise = testClient.waitForEvent('ocr_progress');
    wsServer.emitOCRProgress(taskId, progressData);

    const receivedData = await eventPromise;
    expect(receivedData).toEqual(progressData);
  });

  it('should handle missed events synchronization', async () => {
    const taskId = 'test-task-2';
    const events = [
      {
        taskId,
        progress: 25,
        status: 'processing',
        pageNumber: 1,
        totalPages: 2
      },
      {
        taskId,
        progress: 50,
        status: 'processing',
        pageNumber: 1,
        totalPages: 2
      }
    ];

    // Emit events before client connects
    for (const event of events) {
      wsServer.emitOCRProgress(taskId, event);
    }

    // Wait for events to be stored
    await new Promise(resolve => setTimeout(resolve, 100));

    await testClient.connect();
    testClient.subscribeToOCR(taskId);
    
    const missedEvents = await testClient.waitForEvent('missed_events');
    expect(missedEvents.length).toBeGreaterThanOrEqual(events.length);
    missedEvents.forEach(event => {
      expect(event.taskId).toBe(taskId);
    });
  });

  it('should handle OCR completion events', async () => {
    const taskId = 'test-task-3';
    const completionData = {
      taskId,
      result: {
        text: 'Sample OCR text',
        confidence: 0.95
      }
    };

    await testClient.connect();
    testClient.subscribeToOCR(taskId);

    const eventPromise = testClient.waitForEvent('ocr_completed');
    wsServer.emitOCRCompleted(taskId, completionData);

    const receivedData = await eventPromise;
    expect(receivedData).toEqual(completionData);
  });

  it('should handle OCR error events', async () => {
    const taskId = 'test-task-4';
    const errorData = {
      taskId,
      message: 'Failed to process image',
      code: 'PROCESSING_ERROR',
      recoverable: false
    };

    await testClient.connect();
    testClient.subscribeToOCR(taskId);

    const eventPromise = testClient.waitForEvent('ocr_error');
    wsServer.emitOCRError(taskId, errorData);

    const receivedData = await eventPromise;
    expect(receivedData).toEqual(errorData);
  });

  it('should handle client disconnection gracefully', async () => {
    const taskId = 'test-task-5';

    await testClient.connect();
    testClient.subscribeToOCR(taskId);
    
    // Verify subscription worked
    const eventPromise = testClient.waitForEvent('ocr_progress');
    wsServer.emitOCRProgress(taskId, {
      taskId,
      progress: 0,
      status: 'started'
    });

    await eventPromise;
    await testClient.disconnect();

    // Give server time to process disconnection
    await new Promise(resolve => setTimeout(resolve, 100));
    expect(httpServer.listening).toBe(true);
  });

  it('should handle unsubscribe from OCR events', async () => {
    const taskId = 'test-task-6';
    
    await testClient.connect();
    testClient.subscribeToOCR(taskId);
    
    // Verify subscription works
    const firstEventPromise = testClient.waitForEvent('ocr_progress');
    wsServer.emitOCRProgress(taskId, {
      taskId,
      progress: 25,
      status: 'processing'
    });
    await firstEventPromise;

    // Unsubscribe and verify no more events received
    testClient.unsubscribeFromOCR(taskId);
    
    // Try to receive event after unsubscribe
    const secondEventPromise = testClient.waitForEvent('ocr_progress');
    wsServer.emitOCRProgress(taskId, {
      taskId,
      progress: 50,
      status: 'processing'
    });

    try {
      await secondEventPromise;
      fail('Should not receive event after unsubscribe');
    } catch (error) {
      expect(error.message).toContain('Timeout waiting for event');
    }
  });
}); 