import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import { OCREvent } from './WebSocketServer';

export class EventStore {
  private db: Database | null = null;
  private readonly DB_PATH = process.env.EVENTS_DATABASE || './events.sqlite';
  private readonly MAX_EVENTS = 1000; // Maximum number of events to store

  constructor() {
    this.initializeDatabase();
  }

  private async initializeDatabase(): Promise<void> {
    try {
      this.db = await open({
        filename: this.DB_PATH,
        driver: sqlite3.Database
      });

      await this.db.exec(`
        CREATE TABLE IF NOT EXISTS events (
          id TEXT PRIMARY KEY,
          timestamp INTEGER NOT NULL,
          type TEXT NOT NULL,
          taskId TEXT NOT NULL,
          data TEXT NOT NULL
        )
      `);

      await this.db.exec(`
        CREATE INDEX IF NOT EXISTS idx_events_timestamp 
        ON events(timestamp)
      `);

      await this.db.exec(`
        CREATE INDEX IF NOT EXISTS idx_events_taskId 
        ON events(taskId)
      `);

      console.log('Event store initialized successfully');
    } catch (error) {
      console.error('Failed to initialize event store:', error);
      throw error;
    }
  }

  async storeEvent(event: OCREvent): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      await this.db.run(
        `INSERT INTO events (id, timestamp, type, taskId, data) 
         VALUES (?, ?, ?, ?, ?)`,
        [
          event.id,
          event.timestamp,
          event.type,
          event.taskId,
          JSON.stringify(event.data)
        ]
      );

      // Cleanup old events
      await this.cleanupOldEvents();
    } catch (error) {
      console.error('Failed to store event:', error);
      throw error;
    }
  }

  async getEventsSince(lastEventId: string): Promise<OCREvent[]> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      let query = 'SELECT * FROM events WHERE timestamp > ?';
      let params: any[] = [0];

      if (lastEventId) {
        const lastEvent = await this.db.get(
          'SELECT timestamp FROM events WHERE id = ?',
          [lastEventId]
        );
        if (lastEvent) {
          params = [lastEvent.timestamp];
        }
      }

      const rows = await this.db.all(query, params);
      return rows.map(row => ({
        id: row.id,
        timestamp: row.timestamp,
        type: row.type as OCREvent['type'],
        taskId: row.taskId,
        data: JSON.parse(row.data)
      }));
    } catch (error) {
      console.error('Failed to get events:', error);
      throw error;
    }
  }

  async getEventsByTaskId(taskId: string): Promise<OCREvent[]> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const rows = await this.db.all(
        'SELECT * FROM events WHERE taskId = ? ORDER BY timestamp ASC',
        [taskId]
      );

      return rows.map(row => ({
        id: row.id,
        timestamp: row.timestamp,
        type: row.type as OCREvent['type'],
        taskId: row.taskId,
        data: JSON.parse(row.data)
      }));
    } catch (error) {
      console.error('Failed to get events by taskId:', error);
      throw error;
    }
  }

  private async cleanupOldEvents(): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const count = await this.db.get('SELECT COUNT(*) as count FROM events');
      if (count.count > this.MAX_EVENTS) {
        const deleteCount = count.count - this.MAX_EVENTS;
        await this.db.run(`
          DELETE FROM events 
          WHERE id IN (
            SELECT id FROM events 
            ORDER BY timestamp ASC 
            LIMIT ?
          )`,
          [deleteCount]
        );
      }
    } catch (error) {
      console.error('Failed to cleanup old events:', error);
      // Don't throw error here to prevent blocking event storage
    }
  }

  async close(): Promise<void> {
    if (this.db) {
      await this.db.close();
      this.db = null;
    }
  }
} 