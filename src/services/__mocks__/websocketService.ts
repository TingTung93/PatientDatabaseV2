export const websocketService = {
  connect: jest.fn(),
  disconnect: jest.fn(),
  addMessageHandler: jest.fn(),
  removeMessageHandler: jest.fn(),
  send: jest.fn(),
}; 