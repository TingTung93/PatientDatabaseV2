/**
 * CautionCard Repository
 * This class handles all database operations related to caution cards.
 */
const BaseRepository = require('./BaseRepository');

class CautionCardRepository extends BaseRepository {
  constructor(model) {
    super(model);
  }

  async findByPatientId(patientId) {
    return await this.model.findAll({
      where: { patientId },
      order: [['createdAt', 'DESC']]
    });
  }

  async findActiveCards(patientId) {
    return await this.model.findAll({
      where: {
        patientId,
        status: 'active'
      },
      order: [['issuedDate', 'DESC']]
    });
  }

  async findExpiredCards(patientId) {
    return await this.model.findAll({
      where: {
        patientId,
        status: 'expired'
      },
      order: [['expiryDate', 'DESC']]
    });
  }

  async markAsExpired(id) {
    return await this.update(id, {
      status: 'expired',
      expiryDate: new Date()
    });
  }

  async markAsRevoked(id) {
    return await this.update(id, {
      status: 'revoked'
    });
  }
}

module.exports = CautionCardRepository;