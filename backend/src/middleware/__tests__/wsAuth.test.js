const jwt = require('jsonwebtoken');
const wsAuthMiddleware = require('../wsAuth');
const config = require('../../config/config');

jest.mock('jsonwebtoken');

describe('WebSocket Authentication Middleware', () => {
  let mockSocket;
  let mockNext;

  beforeEach(() => {
    mockSocket = {
      handshake: {
        auth: {}
      }
    };
    mockNext = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should authenticate valid token', () => {
    const mockUser = { userId: 1, role: 'user' };
    mockSocket.handshake.auth.token = 'valid.token';
    jwt.verify.mockImplementation((token, secret, callback) => callback(null, mockUser));

    wsAuthMiddleware(mockSocket, mockNext);

    expect(mockSocket.user).toEqual(mockUser);
    expect(mockNext).toHaveBeenCalledWith();
  });

  it('should reject missing token', () => {
    wsAuthMiddleware(mockSocket, mockNext);

    expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    expect(mockNext.mock.calls[0][0].message).toBe('Authentication required');
  });

  it('should reject expired token', () => {
    mockSocket.handshake.auth.token = 'expired.token';
    jwt.verify.mockImplementation((token, secret, callback) => 
      callback({ name: 'TokenExpiredError' }));

    wsAuthMiddleware(mockSocket, mockNext);

    expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    expect(mockNext.mock.calls[0][0].message).toBe('Token expired');
  });

  it('should reject invalid token', () => {
    mockSocket.handshake.auth.token = 'invalid.token';
    jwt.verify.mockImplementation((token, secret, callback) => 
      callback({ name: 'JsonWebTokenError' }));

    wsAuthMiddleware(mockSocket, mockNext);

    expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    expect(mockNext.mock.calls[0][0].message).toBe('Invalid token');
  });
});