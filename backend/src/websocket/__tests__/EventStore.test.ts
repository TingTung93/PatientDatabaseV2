import { EventStore } from '../EventStore';
import { OCREvent } from '../WebSocketServer';
import { unlink } from 'fs/promises';
import { existsSync } from 'fs';

describe('EventStore', () => {
  let eventStore: EventStore;
  const TEST_DB = './test-events.sqlite';

  beforeEach(async () => {
    process.env.EVENTS_DATABASE = TEST_DB;
    eventStore = new EventStore();
  });

  afterEach(async () => {
    await eventStore.close();
    if (existsSync(TEST_DB)) {
      await unlink(TEST_DB);
    }
  });

  const createTestEvent = (id: string, taskId: string): OCREvent => ({
    id,
    timestamp: Date.now(),
    type: 'ocr_progress',
    taskId,
    data: { progress: 50 }
  });

  describe('storeEvent', () => {
    it('should store an event successfully', async () => {
      const event = createTestEvent('test1', 'task1');
      await eventStore.storeEvent(event);
      
      const events = await eventStore.getEventsByTaskId('task1');
      expect(events).toHaveLength(1);
      expect(events[0].id).toBe('test1');
    });

    it('should handle storing multiple events', async () => {
      const events = [
        createTestEvent('test1', 'task1'),
        createTestEvent('test2', 'task1'),
        createTestEvent('test3', 'task2')
      ];

      for (const event of events) {
        await eventStore.storeEvent(event);
      }

      const task1Events = await eventStore.getEventsByTaskId('task1');
      expect(task1Events).toHaveLength(2);

      const task2Events = await eventStore.getEventsByTaskId('task2');
      expect(task2Events).toHaveLength(1);
    });
  });

  describe('getEventsSince', () => {
    it('should retrieve events after a given event', async () => {
      const events = [
        createTestEvent('test1', 'task1'),
        createTestEvent('test2', 'task1'),
        createTestEvent('test3', 'task1')
      ];

      for (const event of events) {
        await eventStore.storeEvent(event);
      }

      const newEvents = await eventStore.getEventsSince('test1');
      expect(newEvents).toHaveLength(2);
      expect(newEvents[0].id).toBe('test2');
      expect(newEvents[1].id).toBe('test3');
    });

    it('should return all events when no lastEventId is provided', async () => {
      const events = [
        createTestEvent('test1', 'task1'),
        createTestEvent('test2', 'task1')
      ];

      for (const event of events) {
        await eventStore.storeEvent(event);
      }

      const allEvents = await eventStore.getEventsSince('');
      expect(allEvents).toHaveLength(2);
    });
  });

  describe('cleanup', () => {
    it('should cleanup old events when exceeding MAX_EVENTS', async () => {
      // Create events up to MAX_EVENTS + 1
      const events = Array.from({ length: 1001 }, (_, i) => 
        createTestEvent(`test${i}`, `task${Math.floor(i/100)}`)
      );

      for (const event of events) {
        await eventStore.storeEvent(event);
      }

      // Wait for cleanup to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      const allEvents = await eventStore.getEventsSince('');
      expect(allEvents.length).toBeLessThanOrEqual(1000);
    });
  });
}); 