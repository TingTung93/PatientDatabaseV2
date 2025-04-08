/**
 * EventClassifier
 * 
 * Classifies events by importance to determine persistence strategy
 * and delivery guarantees.
 */
class EventClassifier {
  constructor() {
    // Define event importance levels
    this.importanceLevels = {
      CRITICAL: 'critical',   // Must be delivered, persisted long-term
      STANDARD: 'standard',   // Should be delivered, persisted short-term
      TRANSIENT: 'transient'  // Best-effort delivery, not persisted
    };
    
    // Map event types to importance levels
    this.eventImportance = {
      // Patient events
      'patient_created': this.importanceLevels.CRITICAL,
      'patient_updated': this.importanceLevels.STANDARD,
      'patient_deleted': this.importanceLevels.CRITICAL,
      
      // OCR events
      'ocr_started': this.importanceLevels.TRANSIENT,
      'ocr_progress': this.importanceLevels.TRANSIENT,
      'ocr_completed': this.importanceLevels.STANDARD,
      'ocr_failed': this.importanceLevels.STANDARD,
      
      // Caution card events
      'caution_card_created': this.importanceLevels.CRITICAL,
      'caution_card_updated': this.importanceLevels.STANDARD,
      'caution_card_linked': this.importanceLevels.CRITICAL,
      'caution_card_ready_for_review': this.importanceLevels.STANDARD,
      'caution_card_finalized': this.importanceLevels.CRITICAL,
      
      // Report events
      'report_created': this.importanceLevels.CRITICAL,
      'report_updated': this.importanceLevels.STANDARD,
      
      // System events
      'system_alert': this.importanceLevels.STANDARD,
      'system_error': this.importanceLevels.CRITICAL,
      
      // User events
      'user_login': this.importanceLevels.STANDARD,
      'user_logout': this.importanceLevels.STANDARD,
      
      // List updates
      'patients_updated': this.importanceLevels.STANDARD,
      'orphan_list_updated': this.importanceLevels.STANDARD
    };
  }
  
  /**
   * Get the importance level for an event type
   * @param {string} eventType - The type of event
   * @returns {string} - The importance level
   */
  getImportance(eventType) {
    return this.eventImportance[eventType] || this.importanceLevels.STANDARD;
  }
  
  /**
   * Check if an event is critical
   * @param {string} eventType - The type of event
   * @returns {boolean} - True if the event is critical
   */
  isCritical(eventType) {
    return this.getImportance(eventType) === this.importanceLevels.CRITICAL;
  }
  
  /**
   * Check if an event is transient
   * @param {string} eventType - The type of event
   * @returns {boolean} - True if the event is transient
   */
  isTransient(eventType) {
    return this.getImportance(eventType) === this.importanceLevels.TRANSIENT;
  }
  
  /**
   * Add a new event type with specified importance
   * @param {string} eventType - The type of event
   * @param {string} importance - The importance level
   */
  registerEventType(eventType, importance) {
    if (!Object.values(this.importanceLevels).includes(importance)) {
      throw new Error(`Invalid importance level: ${importance}`);
    }
    
    this.eventImportance[eventType] = importance;
  }
}

module.exports = new EventClassifier(); 