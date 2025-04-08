interface MockWebSocket {
  send: (data: string) => void;
  close: () => void;
}

export const interceptWebSocket = (handler: (socket: MockWebSocket) => void) => {
  // Create a mock WebSocket class
  class MockWebSocket implements WebSocket {
    url: string;
    protocol: string = '';
    extensions: string = '';
    binaryType: BinaryType = 'blob';
    bufferedAmount: number = 0;
    readyState: number = WebSocket.CONNECTING;
    onopen: ((event: Event) => void) | null = null;
    onclose: ((event: CloseEvent) => void) | null = null;
    onerror: ((event: Event) => void) | null = null;
    onmessage: ((event: MessageEvent) => void) | null = null;

    constructor(url: string) {
      this.url = url;
      
      // Simulate connection
      setTimeout(() => {
        this.readyState = WebSocket.OPEN;
        if (this.onopen) {
          this.onopen(new Event('open'));
        }
        
        // Call the handler with mock methods
        handler({
          send: (data: string) => {
            if (this.onmessage) {
              this.onmessage(new MessageEvent('message', { data }));
            }
          },
          close: () => {
            this.readyState = WebSocket.CLOSED;
            if (this.onclose) {
              this.onclose(new CloseEvent('close'));
            }
          }
        });
      }, 100);
    }

    send(data: string | ArrayBufferLike | Blob | ArrayBufferView): void {
      // Implement if needed for specific tests
    }

    close(code?: number, reason?: string): void {
      this.readyState = WebSocket.CLOSED;
      if (this.onclose) {
        this.onclose(new CloseEvent('close', { code, reason }));
      }
    }

    addEventListener<K extends keyof WebSocketEventMap>(
      type: K,
      listener: (event: WebSocketEventMap[K]) => void,
      options?: boolean | AddEventListenerOptions
    ): void {
      switch (type) {
        case 'open':
          this.onopen = listener as (event: Event) => void;
          break;
        case 'close':
          this.onclose = listener as (event: CloseEvent) => void;
          break;
        case 'error':
          this.onerror = listener as (event: Event) => void;
          break;
        case 'message':
          this.onmessage = listener as (event: MessageEvent) => void;
          break;
      }
    }

    removeEventListener<K extends keyof WebSocketEventMap>(
      type: K,
      listener: (event: WebSocketEventMap[K]) => void,
      options?: boolean | EventListenerOptions
    ): void {
      switch (type) {
        case 'open':
          this.onopen = null;
          break;
        case 'close':
          this.onclose = null;
          break;
        case 'error':
          this.onerror = null;
          break;
        case 'message':
          this.onmessage = null;
          break;
      }
    }

    dispatchEvent(event: Event): boolean {
      return true;
    }
  }

  // Override the WebSocket constructor
  cy.window().then((win) => {
    win.WebSocket = MockWebSocket as any;
  });
}; 