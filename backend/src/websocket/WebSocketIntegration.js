/**
 * WebSocketIntegration.js
 * 
 * Integrates the WebSocket system with the OCR service to provide real-time updates
 * Acts as a bridge between the OCR processing pipeline and the WebSocket notification system
 */

const OcrProgressManager = require('./OcrProgressManager');
const ConnectionManager = require('./ConnectionManager');
const ErrorRecoveryService = require('./ErrorRecoveryService');
const eventSystem = require('../events/HybridEventSystem');
const logger = require('../utils/logger');

class WebSocketIntegration {
  constructor() {
    this.initialized = false;
    this.ocrService = null;
  }

  /**
   * Initialize the WebSocket integration
   * @param {Object} ocrService - OCR service instance
   */
  initialize(ocrService) {
    if (this.initialized) {
      logger.warn('WebSocket integration already initialized');
      return;
    }
    
    if (!ocrService) {
      throw new Error('OCR service is required for WebSocket integration');
    }
    
    this.ocrService = ocrService;
    
    // Set up event listeners
    this.setupEventListeners();
    
    // Set up periodic cleanup
    this.setupPeriodicCleanup();
    
    this.initialized = true;
    logger.info('WebSocket integration initialized');
  }

  /**
   * Set up event listeners for OCR processing
   * @private
   */
  setupEventListeners() {
    // Listen for OCR processing start events
    this.ocrService.on('processing_started', (data) => {
      const taskId = OcrProgressManager.initializeTask({
        patientId: data.patientId,
        documentType: data.documentType,
        filename: data.filename
      });
      
      // Store task ID in OCR processing data for future reference
      data.taskId = taskId;
      
      logger.info(`OCR processing started with task ID: ${taskId}`, {
        taskId,
        patientId: data.patientId,
        filename: data.filename
      });
    });
    
    // Listen for OCR progress events
    this.ocrService.on('processing_progress', (data) => {
      if (!data.taskId) {
        logger.warn('Received OCR progress event without task ID');
        return;
      }
      
      OcrProgressManager.updateTaskProgress(data.taskId, {
        progress: data.progress,
        status: 'processing',
        message: data.message || `Processing: ${data.progress}% complete`,
        data: {
          stage: data.stage,
          details: data.details
        }
      });
    });
    
    // Listen for OCR completion events
    this.ocrService.on('processing_completed', (data) => {
      if (!data.taskId) {
        logger.warn('Received OCR completion event without task ID');
        return;
      }
      
      OcrProgressManager.completeTask(data.taskId, data.result);
    });
    
    // Listen for OCR error events
    this.ocrService.on('processing_error', (data) => {
      if (!data.taskId) {
        logger.warn('Received OCR error event without task ID');
        return;
      }
      
      OcrProgressManager.failTask(data.taskId, new Error(data.error || 'Unknown OCR processing error'));
    });
    
    // Listen for WebSocket connection events
    eventSystem.on('client_connected', (data) => {
      ConnectionManager.registerConnection(data.clientId, data.socket, data.metadata);
    });
    
    // Listen for WebSocket disconnection events
    eventSystem.on('client_disconnected', (data) => {
      ConnectionManager.handleDisconnection(data.clientId, data.reason);
    });
    
    // Listen for event delivery failures
    eventSystem.on('event_delivery_failed', (data) => {
      ErrorRecoveryService.handleEventFailure(data.clientId, data.eventId, data.error);
    });
    
    // Listen for event delivery successes
    eventSystem.on('event_delivery_success', (data) => {
      ErrorRecoveryService.handleEventSuccess(data.clientId, data.eventId);
    });
    
    // Listen for state reconciliation requests
    eventSystem.on('reconciliation_request', (data) => {
      const { clientId, stateType, clientVersion } = data;
      
      // Get current server state
      const serverState = this.getServerState(stateType);
      const serverVersion = serverState.version;
      
      // Reconcile state
      const reconciliation = ErrorRecoveryService.reconcileState(
        clientId,
        stateType,
        clientVersion,
        serverState.data,
        serverVersion
      );
      
      // Emit reconciliation response
      eventSystem.emit('reconciliation_response', {
        clientId,
        ...reconciliation
      });
    });
  }

  /**
   * Get current server state for a specific state type
   * @private
   * @param {string} stateType - Type of state to retrieve
   * @returns {Object} Server state with data and version
   */
  getServerState(stateType) {
    // This is a placeholder - actual implementation depends on the state type
    switch (stateType) {
      case 'ocr_tasks':
        return {
          data: OcrProgressManager.getAllActiveTasks(),
          version: Date.now() // Use timestamp as version for simplicity
        };
      
      case 'connections':
        return {
          data: ConnectionManager.getActiveConnections(),
          version: Date.now()
        };
      
      default:
        return {
          data: {},
          version: Date.now()
        };
    }
  }

  /**
   * Set up periodic cleanup tasks
   * @private
   */
  setupPeriodicCleanup() {
    // Clean up inactive connections every hour
    setInterval(() => {
      ConnectionManager.cleanupInactiveConnections();
    }, 3600000); // 1 hour
  }

  /**
   * Get integration status
   * @returns {Object} Integration status
   */
  getStatus() {
    return {
      initialized: this.initialized,
      ocrTasks: OcrProgressManager.getAllActiveTasks().length,
      connections: ConnectionManager.getStats(),
      errorRecovery: ErrorRecoveryService.getStats()
    };
  }

  /**
   * Shutdown the WebSocket integration
   */
  shutdown() {
    if (!this.initialized) {
      return;
    }
    
    // Clean up resources
    
    this.initialized = false;
    logger.info('WebSocket integration shut down');
  }
}

// Export singleton instance
module.exports = new WebSocketIntegration();
