const { Sequelize, Model, DataTypes } = require('sequelize');
const CautionCardRepository = require('../../repositories/CautionCardRepository');

describe('CautionCardRepository', () => {
    let sequelize;
    let repository;
    let CautionCard;

    beforeAll(async () => {
        // Initialize Sequelize with SQLite for testing
        sequelize = new Sequelize('sqlite::memory:', {
            logging: false
        });

        // Define CautionCard model for testing
        CautionCard = sequelize.define('CautionCard', {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true
            },
            patientId: {
                type: DataTypes.UUID,
                allowNull: false
            },
            bloodType: {
                type: DataTypes.STRING,
                allowNull: false
            },
            antibodies: {
                type: DataTypes.JSON,
                allowNull: true
            },
            specialRequirements: {
                type: DataTypes.TEXT,
                allowNull: true
            },
            issuedDate: {
                type: DataTypes.DATE,
                allowNull: false
            },
            expiryDate: {
                type: DataTypes.DATE,
                allowNull: true
            },
            status: {
                type: DataTypes.ENUM('active', 'expired', 'revoked'),
                defaultValue: 'active'
            }
        });

        repository = new CautionCardRepository(CautionCard);

        // Sync the model with the database
        await sequelize.sync({ force: true });
    });

    beforeEach(async () => {
        await CautionCard.destroy({ where: {}, force: true });
    });

    afterAll(async () => {
        await sequelize.close();
    });

    describe('create', () => {
        it('should create a new caution card', async () => {
            const cardData = {
                patientId: '123e4567-e89b-12d3-a456-426614174000',
                bloodType: 'A+',
                antibodies: ['Anti-D', 'Anti-K'],
                specialRequirements: 'Requires irradiated blood products',
                issuedDate: new Date(),
                status: 'active'
            };

            const card = await repository.create(cardData);

            expect(card).toBeDefined();
            expect(card.id).toBeDefined();
            expect(card.patientId).toBe(cardData.patientId);
            expect(card.bloodType).toBe(cardData.bloodType);
            expect(card.antibodies).toEqual(cardData.antibodies);
            expect(card.specialRequirements).toBe(cardData.specialRequirements);
            expect(card.status).toBe(cardData.status);
        });
    });

    describe('findByPatientId', () => {
        it('should find caution cards by patient ID', async () => {
            const patientId = '123e4567-e89b-12d3-a456-426614174000';
            const cardData = {
                patientId,
                bloodType: 'A+',
                antibodies: ['Anti-D'],
                issuedDate: new Date(),
                status: 'active'
            };

            await repository.create(cardData);

            const cards = await repository.findByPatientId(patientId);
            expect(cards).toHaveLength(1);
            expect(cards[0].patientId).toBe(patientId);
        });

        it('should return empty array when no cards found', async () => {
            const cards = await repository.findByPatientId('non-existent-id');
            expect(cards).toHaveLength(0);
        });
    });

    describe('update', () => {
        it('should update a caution card', async () => {
            const cardData = {
                patientId: '123e4567-e89b-12d3-a456-426614174000',
                bloodType: 'A+',
                antibodies: ['Anti-D'],
                issuedDate: new Date(),
                status: 'active'
            };

            const card = await repository.create(cardData);
            const updateData = {
                antibodies: ['Anti-D', 'Anti-K'],
                specialRequirements: 'Updated requirements'
            };

            const updatedCard = await repository.update(card.id, updateData);
            expect(updatedCard.antibodies).toEqual(updateData.antibodies);
            expect(updatedCard.specialRequirements).toBe(updateData.specialRequirements);
        });
    });

    describe('delete', () => {
        it('should delete a caution card', async () => {
            const cardData = {
                patientId: '123e4567-e89b-12d3-a456-426614174000',
                bloodType: 'A+',
                antibodies: ['Anti-D'],
                issuedDate: new Date(),
                status: 'active'
            };

            const card = await repository.create(cardData);
            const result = await repository.delete(card.id);
            expect(result).toBe(1);

            const deletedCard = await CautionCard.findByPk(card.id);
            expect(deletedCard).toBeNull();
        });
    });
}); 