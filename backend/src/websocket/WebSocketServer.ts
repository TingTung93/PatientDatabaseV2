import { Server as SocketServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import { EventEmitter } from 'events';
import { EventStore } from './EventStore';

export interface OCREvent {
  id: string;
  timestamp: number;
  type: 'OCR_PROGRESS' | 'OCR_COMPLETED' | 'OCR_ERROR';
  taskId: string;
  data: any;
}

export class WebSocketServer {
  private io: SocketServer;
  private eventEmitter: EventEmitter;
  private eventStore: EventStore;

  constructor(server: HttpServer) {
    this.io = new SocketServer(server, {
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        methods: ['GET', 'POST']
      }
    });

    this.eventEmitter = new EventEmitter();
    this.eventStore = new EventStore();

    this.setupSocketHandlers();
    this.setupEventHandlers();
  }

  private setupSocketHandlers(): void {
    this.io.on('connection', (socket) => {
      console.log('Client connected:', socket.id);

      socket.on('subscribe_ocr', (taskId: string) => {
        socket.join(`ocr_${taskId}`);
      });

      socket.on('unsubscribe_ocr', (taskId: string) => {
        socket.leave(`ocr_${taskId}`);
      });

      socket.on('get_missed_events', async (lastEventId: string) => {
        try {
          const missedEvents = await this.eventStore.getEventsSince(lastEventId);
          socket.emit('missed_events', missedEvents);
        } catch (error) {
          console.error('Error fetching missed events:', error);
          socket.emit('error', {
            message: 'Failed to fetch missed events',
            code: 'FETCH_EVENTS_ERROR'
          });
        }
      });

      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
      });
    });
  }

  private setupEventHandlers(): void {
    // OCR Progress Updates
    this.eventEmitter.on('ocr_progress', async (data: any) => {
      const event: OCREvent = {
        id: this.generateEventId(),
        timestamp: Date.now(),
        type: 'OCR_PROGRESS',
        taskId: data.taskId,
        data
      };

      await this.eventStore.storeEvent(event);
      this.io.to(`ocr_${data.taskId}`).emit('ocr_progress', data);
    });

    // OCR Completion
    this.eventEmitter.on('ocr_completed', async (data: any) => {
      const event: OCREvent = {
        id: this.generateEventId(),
        timestamp: Date.now(),
        type: 'OCR_COMPLETED',
        taskId: data.taskId,
        data
      };

      await this.eventStore.storeEvent(event);
      this.io.to(`ocr_${data.taskId}`).emit('ocr_completed', data);
    });

    // OCR Errors
    this.eventEmitter.on('ocr_error', async (data: any) => {
      const event: OCREvent = {
        id: this.generateEventId(),
        timestamp: Date.now(),
        type: 'OCR_ERROR',
        taskId: data.taskId,
        data
      };

      await this.eventStore.storeEvent(event);
      this.io.to(`ocr_${data.taskId}`).emit('ocr_error', data);
    });
  }

  private generateEventId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Public methods for emitting events
  public emitOCRProgress(taskId: string, data: any): void {
    this.eventEmitter.emit('ocr_progress', { taskId, ...data });
  }

  public emitOCRCompleted(taskId: string, data: any): void {
    this.eventEmitter.emit('ocr_completed', { taskId, ...data });
  }

  public emitOCRError(taskId: string, error: any): void {
    this.eventEmitter.emit('ocr_error', { taskId, ...error });
  }

  // Method to get missed events
  public async getMissedEvents(lastEventId: string): Promise<OCREvent[]> {
    return this.eventStore.getEventsSince(lastEventId);
  }
} 