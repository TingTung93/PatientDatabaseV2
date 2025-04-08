const { getIoInstance } = require('../server'); // Import the getter
const logger = require('../utils/logger');

/**
 * Emits a WebSocket event to all connected clients.
 * @param {string} eventName - The name of the event to emit.
 * @param {object} data - The data payload for the event.
 */
const emitEvent = (eventName, data) => {
  try {
    const io = getIoInstance();
    io.emit(eventName, data);
    logger.debug(`WebSocket event emitted: ${eventName}`, data);
  } catch (error) {
    // Log error if io instance isn't ready or emission fails
    logger.error(`Failed to emit WebSocket event ${eventName}:`, error.message);
  }
};

// Specific event emitters can be added here for convenience/type safety

const emitPatientsUpdated = (payload = {}) => {
  emitEvent('patients_updated', payload);
};

const emitCautionCardReadyForReview = (payload) => {
  // payload: { cardId, ocrResults }
  emitEvent('caution_card_ready_for_review', payload);
};

const emitCautionCardFinalized = (payload) => {
  // payload: { cardId, status, linkedPatientId? }
  emitEvent('caution_card_finalized', payload);
};

const emitOrphanListUpdated = (payload) => {
  // payload: { type: 'added' | 'removed' | 'linked', cardId }
  emitEvent('orphan_list_updated', payload);
};


module.exports = {
  emitEvent, // Generic emitter
  // Specific emitters:
  emitPatientsUpdated,
  emitCautionCardReadyForReview,
  emitCautionCardFinalized,
  emitOrphanListUpdated,
};