import { io, Socket } from 'socket.io-client';

export interface TestClient {
  socket: Socket;
  events: Record<string, any[]>;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  subscribeToOCR: (taskId: string) => void;
  unsubscribeFromOCR: (taskId: string) => void;
  waitForEvent: (eventName: string, timeout?: number) => Promise<any>;
  clearEvents: () => void;
}

export const createTestClient = (port: number): TestClient => {
  const socket = io(`http://localhost:${port}`, {
    transports: ['websocket'],
    autoConnect: false
  });

  const events: Record<string, any[]> = {};

  const connect = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      socket.connect();
      socket.once('connect', resolve);
      socket.once('connect_error', reject);
    });
  };

  const disconnect = (): Promise<void> => {
    return new Promise((resolve) => {
      if (socket.connected) {
        socket.once('disconnect', resolve);
        socket.disconnect();
      } else {
        resolve();
      }
    });
  };

  const subscribeToOCR = (taskId: string): void => {
    socket.emit('subscribe_ocr', taskId);
  };

  const unsubscribeFromOCR = (taskId: string): void => {
    socket.emit('unsubscribe_ocr', taskId);
  };

  const waitForEvent = (eventName: string, timeout = 1000): Promise<any> => {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Timeout waiting for event: ${eventName}`));
      }, timeout);

      socket.once(eventName, (data: any) => {
        clearTimeout(timer);
        if (!events[eventName]) {
          events[eventName] = [];
        }
        events[eventName].push(data);
        resolve(data);
      });
    });
  };

  const clearEvents = (): void => {
    Object.keys(events).forEach(key => {
      events[key] = [];
    });
  };

  // Setup event recording
  ['ocr_progress', 'ocr_completed', 'ocr_error', 'missed_events'].forEach(eventName => {
    socket.on(eventName, (data) => {
      if (!events[eventName]) {
        events[eventName] = [];
      }
      events[eventName].push(data);
    });
  });

  return {
    socket,
    events,
    connect,
    disconnect,
    subscribeToOCR,
    unsubscribeFromOCR,
    waitForEvent,
    clearEvents
  };
}; 