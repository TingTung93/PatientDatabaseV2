/**
 * Event System Index
 * 
 * Exports all components of the event system and provides
 * convenience functions for emitting events.
 */
const HybridEventSystem = require('./HybridEventSystem');
const EventClassifier = require('./EventClassifier');
const PersistenceManager = require('./PersistenceManager');
const ClientSessionTracker = require('./ClientSessionTracker');

/**
 * Emit an event to all subscribed clients
 * @param {string} eventType - The type of event
 * @param {Object} data - The event payload
 * @returns {Promise<Object|null>} - The emitted event or null on failure
 */
const emitEvent = async (eventType, data) => {
  return HybridEventSystem.emit(eventType, data);
};

// Specific event emitters for common events
const emitPatientCreated = async (patient) => {
  return emitEvent('patient_created', { patient });
};

const emitPatientUpdated = async (patient) => {
  return emitEvent('patient_updated', { patient });
};

const emitPatientDeleted = async (patientId) => {
  return emitEvent('patient_deleted', { patientId });
};

const emitPatientsUpdated = async () => {
  return emitEvent('patients_updated', { timestamp: Date.now() });
};

const emitOcrStarted = async (jobId, patientId) => {
  return emitEvent('ocr_started', { jobId, patientId });
};

const emitOcrProgress = async (jobId, progress) => {
  return emitEvent('ocr_progress', { jobId, progress });
};

const emitOcrCompleted = async (jobId, results) => {
  return emitEvent('ocr_completed', { jobId, results });
};

const emitOcrFailed = async (jobId, error) => {
  return emitEvent('ocr_failed', { jobId, error });
};

const emitCautionCardCreated = async (card) => {
  return emitEvent('caution_card_created', { card });
};

const emitCautionCardUpdated = async (card) => {
  return emitEvent('caution_card_updated', { card });
};

const emitCautionCardReadyForReview = async (cardId, ocrResults) => {
  return emitEvent('caution_card_ready_for_review', { cardId, ocrResults });
};

const emitCautionCardFinalized = async (cardId, status, linkedPatientId) => {
  return emitEvent('caution_card_finalized', { cardId, status, linkedPatientId });
};

const emitOrphanListUpdated = async (type, cardId) => {
  // type: 'added' | 'removed' | 'linked'
  return emitEvent('orphan_list_updated', { type, cardId });
};

const emitSystemAlert = async (message, level = 'info') => {
  return emitEvent('system_alert', { message, level, timestamp: Date.now() });
};

const emitSystemError = async (error, context) => {
  return emitEvent('system_error', { 
    message: error.message, 
    stack: error.stack,
    context,
    timestamp: Date.now()
  });
};

// Export everything
module.exports = {
  // Core components
  HybridEventSystem,
  EventClassifier,
  PersistenceManager,
  ClientSessionTracker,
  
  // Generic event emitter
  emitEvent,
  
  // Specific event emitters
  emitPatientCreated,
  emitPatientUpdated,
  emitPatientDeleted,
  emitPatientsUpdated,
  emitOcrStarted,
  emitOcrProgress,
  emitOcrCompleted,
  emitOcrFailed,
  emitCautionCardCreated,
  emitCautionCardUpdated,
  emitCautionCardReadyForReview,
  emitCautionCardFinalized,
  emitOrphanListUpdated,
  emitSystemAlert,
  emitSystemError
}; 