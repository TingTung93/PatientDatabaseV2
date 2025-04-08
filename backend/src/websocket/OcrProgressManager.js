/**
 * OcrProgressManager.js
 * 
 * Manages real-time progress updates for OCR processing tasks
 * Integrates with WebSocketServer to provide progress updates to clients
 */

const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');
const eventSystem = require('../events/HybridEventSystem');

class OcrProgressManager {
  constructor() {
    this.activeTasks = new Map();
    this.taskTimeouts = new Map();
    this.reconnectionAttempts = new Map();
    this.maxReconnectionAttempts = 5;
    this.reconnectionDelay = 1000; // Initial delay in ms
    this.maxReconnectionDelay = 30000; // Maximum delay in ms
    this.taskTimeout = 300000; // 5 minutes
  }

  /**
   * Initialize a new OCR processing task
   * @param {Object} options - Task options
   * @param {string} options.patientId - Optional patient ID
   * @param {string} options.documentType - Type of document being processed
   * @param {string} options.filename - Name of the file being processed
   * @returns {string} Task ID for tracking progress
   */
  initializeTask({ patientId, documentType, filename }) {
    const taskId = uuidv4();
    
    const task = {
      id: taskId,
      patientId,
      documentType,
      filename,
      status: 'initialized',
      progress: 0,
      startTime: Date.now(),
      steps: [],
      errors: [],
      result: null
    };
    
    this.activeTasks.set(taskId, task);
    
    // Set task timeout
    const timeoutId = setTimeout(() => {
      this.handleTaskTimeout(taskId);
    }, this.taskTimeout);
    
    this.taskTimeouts.set(taskId, timeoutId);
    
    // Emit initialization event
    this.emitTaskUpdate(taskId, {
      status: 'initialized',
      message: 'OCR processing task initialized',
      progress: 0
    });
    
    logger.info(`OCR task initialized: ${taskId}`, { 
      taskId, 
      patientId, 
      documentType, 
      filename 
    });
    
    return taskId;
  }

  /**
   * Update the progress of an OCR processing task
   * @param {string} taskId - ID of the task to update
   * @param {Object} update - Progress update information
   * @param {number} update.progress - Progress percentage (0-100)
   * @param {string} update.status - Current status
   * @param {string} update.message - Status message
   * @param {Object} update.data - Additional data
   */
  updateTaskProgress(taskId, update) {
    const task = this.activeTasks.get(taskId);
    
    if (!task) {
      logger.warn(`Attempted to update non-existent OCR task: ${taskId}`);
      return false;
    }
    
    // Update task information
    task.status = update.status || task.status;
    task.progress = update.progress !== undefined ? update.progress : task.progress;
    
    // Add step if message provided
    if (update.message) {
      task.steps.push({
        timestamp: Date.now(),
        message: update.message,
        progress: task.progress
      });
    }
    
    // Add any additional data
    if (update.data) {
      task.data = { ...task.data, ...update.data };
    }
    
    // Reset timeout if task is still active
    if (task.status !== 'completed' && task.status !== 'failed') {
      this.resetTaskTimeout(taskId);
    }
    
    // Emit progress update event
    this.emitTaskUpdate(taskId, {
      status: task.status,
      message: update.message,
      progress: task.progress,
      data: update.data
    });
    
    logger.debug(`OCR task progress updated: ${taskId}`, { 
      taskId, 
      status: task.status, 
      progress: task.progress 
    });
    
    return true;
  }

  /**
   * Complete an OCR processing task
   * @param {string} taskId - ID of the task to complete
   * @param {Object} result - OCR processing result
   */
  completeTask(taskId, result) {
    const task = this.activeTasks.get(taskId);
    
    if (!task) {
      logger.warn(`Attempted to complete non-existent OCR task: ${taskId}`);
      return false;
    }
    
    // Update task information
    task.status = 'completed';
    task.progress = 100;
    task.completionTime = Date.now();
    task.processingTime = task.completionTime - task.startTime;
    task.result = result;
    
    // Add completion step
    task.steps.push({
      timestamp: Date.now(),
      message: 'OCR processing completed successfully',
      progress: 100
    });
    
    // Clear timeout
    this.clearTaskTimeout(taskId);
    
    // Emit completion event
    this.emitTaskUpdate(taskId, {
      status: 'completed',
      message: 'OCR processing completed successfully',
      progress: 100,
      result,
      processingTime: task.processingTime
    });
    
    logger.info(`OCR task completed: ${taskId}`, { 
      taskId, 
      processingTime: task.processingTime 
    });
    
    // Keep completed task in memory for a while before cleanup
    setTimeout(() => {
      this.cleanupTask(taskId);
    }, 3600000); // 1 hour
    
    return true;
  }

  /**
   * Handle OCR processing task failure
   * @param {string} taskId - ID of the failed task
   * @param {Error} error - Error that caused the failure
   */
  failTask(taskId, error) {
    const task = this.activeTasks.get(taskId);
    
    if (!task) {
      logger.warn(`Attempted to fail non-existent OCR task: ${taskId}`);
      return false;
    }
    
    // Update task information
    task.status = 'failed';
    task.completionTime = Date.now();
    task.processingTime = task.completionTime - task.startTime;
    task.errors.push({
      timestamp: Date.now(),
      message: error.message,
      stack: error.stack
    });
    
    // Add failure step
    task.steps.push({
      timestamp: Date.now(),
      message: `OCR processing failed: ${error.message}`,
      progress: task.progress
    });
    
    // Clear timeout
    this.clearTaskTimeout(taskId);
    
    // Emit failure event
    this.emitTaskUpdate(taskId, {
      status: 'failed',
      message: `OCR processing failed: ${error.message}`,
      progress: task.progress,
      error: {
        message: error.message,
        code: error.code || 'UNKNOWN_ERROR'
      }
    });
    
    logger.error(`OCR task failed: ${taskId}`, { 
      taskId, 
      error: error.message, 
      stack: error.stack 
    });
    
    // Keep failed task in memory for a while before cleanup
    setTimeout(() => {
      this.cleanupTask(taskId);
    }, 3600000); // 1 hour
    
    return true;
  }

  /**
   * Get the current status of an OCR processing task
   * @param {string} taskId - ID of the task
   * @returns {Object|null} Task status or null if not found
   */
  getTaskStatus(taskId) {
    const task = this.activeTasks.get(taskId);
    
    if (!task) {
      return null;
    }
    
    return {
      id: task.id,
      patientId: task.patientId,
      documentType: task.documentType,
      filename: task.filename,
      status: task.status,
      progress: task.progress,
      startTime: task.startTime,
      completionTime: task.completionTime,
      processingTime: task.completionTime ? task.completionTime - task.startTime : null,
      steps: task.steps,
      errors: task.errors.map(e => ({ timestamp: e.timestamp, message: e.message }))
    };
  }

  /**
   * Get all active OCR processing tasks
   * @returns {Array} Array of active tasks
   */
  getAllActiveTasks() {
    const tasks = [];
    
    for (const [taskId, task] of this.activeTasks.entries()) {
      if (task.status !== 'completed' && task.status !== 'failed') {
        tasks.push(this.getTaskStatus(taskId));
      }
    }
    
    return tasks;
  }

  /**
   * Reset the timeout for a task
   * @private
   * @param {string} taskId - ID of the task
   */
  resetTaskTimeout(taskId) {
    // Clear existing timeout
    this.clearTaskTimeout(taskId);
    
    // Set new timeout
    const timeoutId = setTimeout(() => {
      this.handleTaskTimeout(taskId);
    }, this.taskTimeout);
    
    this.taskTimeouts.set(taskId, timeoutId);
  }

  /**
   * Clear the timeout for a task
   * @private
   * @param {string} taskId - ID of the task
   */
  clearTaskTimeout(taskId) {
    const timeoutId = this.taskTimeouts.get(taskId);
    
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.taskTimeouts.delete(taskId);
    }
  }

  /**
   * Handle task timeout
   * @private
   * @param {string} taskId - ID of the task
   */
  handleTaskTimeout(taskId) {
    const task = this.activeTasks.get(taskId);
    
    if (!task) {
      return;
    }
    
    logger.warn(`OCR task timed out: ${taskId}`);
    
    this.failTask(taskId, new Error('OCR processing timed out'));
  }

  /**
   * Clean up a completed or failed task
   * @private
   * @param {string} taskId - ID of the task to clean up
   */
  cleanupTask(taskId) {
    this.clearTaskTimeout(taskId);
    this.activeTasks.delete(taskId);
    
    logger.debug(`OCR task cleaned up: ${taskId}`);
  }

  /**
   * Emit task update event through WebSocket
   * @private
   * @param {string} taskId - ID of the task
   * @param {Object} update - Update information
   */
  emitTaskUpdate(taskId, update) {
    try {
      // Emit event through the event system
      eventSystem.emit('ocr_progress', {
        taskId,
        ...update,
        timestamp: Date.now()
      });
    } catch (error) {
      logger.error(`Failed to emit OCR progress update: ${error.message}`, {
        taskId,
        error: error.stack
      });
      
      // Attempt to reconnect if WebSocket connection is lost
      this.handleEmitFailure(taskId, update, error);
    }
  }

  /**
   * Handle failure to emit event
   * @private
   * @param {string} taskId - ID of the task
   * @param {Object} update - Update information
   * @param {Error} error - Error that caused the failure
   */
  handleEmitFailure(taskId, update, error) {
    const reconnectKey = `${taskId}-${Date.now()}`;
    const attempts = this.reconnectionAttempts.get(reconnectKey) || 0;
    
    if (attempts < this.maxReconnectionAttempts) {
      // Exponential backoff for reconnection attempts
      const delay = Math.min(
        this.reconnectionDelay * Math.pow(2, attempts),
        this.maxReconnectionDelay
      );
      
      this.reconnectionAttempts.set(reconnectKey, attempts + 1);
      
      setTimeout(() => {
        logger.info(`Attempting to resend OCR progress update (attempt ${attempts + 1}): ${taskId}`);
        this.emitTaskUpdate(taskId, update);
      }, delay);
    } else {
      logger.error(`Failed to emit OCR progress update after ${attempts} attempts: ${taskId}`);
      this.reconnectionAttempts.delete(reconnectKey);
    }
  }
}

// Export singleton instance
module.exports = new OcrProgressManager();
