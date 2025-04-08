export const environment = {
  api: {
    baseUrl: process.env['REACT_APP_API_URL'] || 'http://localhost:5000/api/v1',
    websocket: process.env['REACT_APP_WS_URL'] || 'ws://localhost:5000/api/v1',
  },
  security: {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedFileTypes: ['image/jpeg', 'image/png', 'image/tiff', 'application/pdf'],
    csrfHeaderName: 'X-CSRF-Token',
  },
  websocket: {
    reconnectAttempts: 5,
    reconnectDelay: 1000,
    heartbeatInterval: 30000,
    heartbeatTimeout: 35000,
    messageQueueLimit: 100,
  },
  auth: {
    tokenKey: 'auth_token',
  },
  features: {
    enableWebSocket: true,
  },
};

export type Environment = typeof environment;
export default environment;
