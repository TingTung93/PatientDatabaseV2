/**
 * WebSocket Module Index
 * 
 * Exports all WebSocket-related functionality for the application
 */

const { WebSocketServer } = require('./WebSocketServer');
const { EventStore } = require('./EventStore');
const OcrProgressManager = require('./OcrProgressManager');
const handler = require('./handler');

module.exports = {
  WebSocketServer,
  EventStore,
  OcrProgressManager,
  handler
};
