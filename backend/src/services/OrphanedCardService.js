// Import Repositories
const CautionCardRepository = require('../repositories/CautionCardRepository');
const OrphanedCautionCardRepository = require('../repositories/OrphanedCautionCardRepository');
const PatientRepository = require('../repositories/PatientRepository'); // Assuming this exists
const logger = require('../utils/logger');
// const WebSocketHandler = require('../websocket/handler'); // TODO: Import WebSocket handler

class OrphanedCardService {

  /**
   * Creates an orphaned card record. Typically called by CautionCardService.
   * @param {object} cardData - Data from the original CautionCard.
   * @returns {Promise<object>} - The created OrphanedCautionCard object.
   */
  async createOrphan(cardData) {
    logger.info(`Creating orphaned record for original card ID: ${cardData.originalCardId}`);
    try {
      // Use repository
      const orphan = await OrphanedCautionCardRepository.create({
        originalCardId: cardData.originalCardId,
        originalFilePath: cardData.originalFilePath,
        ocrResults: cardData.ocrResults,
        reviewedData: cardData.reviewedData,
        // markedOrphanAt is handled by defaultValue
      });
      logger.debug(`Created OrphanedCautionCard record with ID: ${orphan.id}`);
      return orphan;
    } catch (dbError) {
      logger.error(`Error creating OrphanedCautionCard for original ID ${cardData.originalCardId}:`, dbError);
      throw new Error('Failed to save orphaned card information.');
    }
  }

  /**
   * Lists orphaned cards, potentially filtered.
   * @param {object} filters - { search, limit, offset }
   * @returns {Promise<object>} - { orphanedCards: [...], pagination: {...} }
   */
  async listOrphans(filters = {}) {
    logger.debug('Listing orphaned cards with filters:', filters);
    // Use repository
    const { count, rows } = await OrphanedCautionCardRepository.findAndCountAll(filters);
    // Repository method should handle filter logic
    // limit: filters.limit || 25,
    // offset: filters.offset || 0,
      // order: [['markedOrphanAt', 'DESC']]
    // Removed stray closing brace from previous diff error
    return { orphanedCards: rows, pagination: { totalItems: count /* ... */ } };
  }

  /**
   * Gets details for a specific orphaned card.
   * @param {string} orphanId - The UUID of the orphaned card record.
   * @returns {Promise<object>} - The OrphanedCautionCard object.
   */
  async getOrphanDetails(orphanId) {
    logger.debug(`Fetching details for orphaned card ID: ${orphanId}`);
    // Use repository
    const orphan = await OrphanedCautionCardRepository.findById(orphanId);
    if (!orphan) {
      throw new Error(`OrphanedCautionCard with ID ${orphanId} not found.`); // TODO: Use AppError
    }
    return orphan;
  }

  /**
   * Links an existing orphaned card to a patient.
   * @param {string} orphanId - The UUID of the orphaned card record.
   * @param {string} linkedPatientId - The ID of the patient to link to.
   * @returns {Promise<object>} - The updated CautionCard object (now linked).
   */
  async linkOrphan(orphanId, linkedPatientId) {
    logger.info(`Attempting to link orphaned card ${orphanId} to patient ${linkedPatientId}`);
    // Use repository
    const orphan = await OrphanedCautionCardRepository.findById(orphanId);
    if (!orphan) {
      throw new Error(`OrphanedCautionCard with ID ${orphanId} not found.`);
    }

    // Find the original caution card using repository
    const originalCard = await CautionCardRepository.findById(orphan.originalCardId);
    if (!originalCard) {
      // This indicates a data integrity issue if an orphan record exists without the original
      logger.error(`Original CautionCard ${orphan.originalCardId} not found for orphan ${orphanId}.`);
      throw new Error(`Original card data not found for orphan record.`);
    }

    // Verify patient exists using repository
    const patient = await PatientRepository.findById(linkedPatientId); // Assuming findById exists
    if (!patient) {
      throw new Error(`Patient with ID ${linkedPatientId} not found.`);
    }

    // Start transaction potentially?
    try {
      // Update original card status using repository
      const updateData = {
        status: 'linked',
        linkedPatientId: linkedPatientId
        // Optionally update reviewedData if corrections were made during linking?
      };
      await CautionCardRepository.update(originalCard.id, updateData);

      // Delete the orphan record using repository
      await OrphanedCautionCardRepository.delete(orphanId);

      logger.info(`Orphaned card ${orphanId} (original: ${originalCard.id}) successfully linked to patient ${linkedPatientId}.`);

      // Emit WebSocket events
      // WebSocketHandler.emit('caution_card_finalized', { cardId: originalCard.id, status: 'linked', linkedPatientId: originalCard.linkedPatientId });
      // WebSocketHandler.emit('orphan_list_updated', { type: 'linked', cardId: originalCard.id }); // Or use 'removed' type?
      logger.debug(`WebSocket events 'caution_card_finalized' (linked) & 'orphan_list_updated' (linked/removed) emitted for ${originalCard.id}`);

      return originalCard;
    } catch (error) {
       logger.error(`Error linking orphan ${orphanId}:`, error);
       // Rollback transaction if used
       throw new Error(`Failed to link orphaned card.`);
    }
  }

  /**
   * Deletes an orphaned card record permanently.
   * @param {string} orphanId - The UUID of the orphaned card record.
   * @returns {Promise<void>}
   */
  async deleteOrphan(orphanId) {
    logger.info(`Deleting orphaned card ID: ${orphanId}`);
    // Use repository
    const orphan = await OrphanedCautionCardRepository.findById(orphanId);
    if (!orphan) {
      throw new Error(`OrphanedCautionCard with ID ${orphanId} not found.`);
    }

    // Also delete the original CautionCard entry? Or just the orphan record?
    // Decision: Just delete the orphan record for now. The original might remain with 'orphaned' status.
    const originalCardId = orphan.originalCardId; // Get ID before destroying
    // Use repository
    await OrphanedCautionCardRepository.delete(orphanId);
    logger.info(`Orphaned record ${orphanId} deleted.`);

    // Emit WebSocket event
    // WebSocketHandler.emit('orphan_list_updated', { type: 'removed', cardId: originalCardId });
    logger.debug(`WebSocket event 'orphan_list_updated' (removed) emitted for original card ${originalCardId}`);
  }
}

module.exports = new OrphanedCardService();