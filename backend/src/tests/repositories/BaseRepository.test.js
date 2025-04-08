const { sequelize } = require('../../database/db');
const { Model, DataTypes } = require('sequelize');
const BaseRepository = require('../../repositories/BaseRepository');

// Define a test model
class TestItem extends Model {}
TestItem.init({
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    description: {
        type: DataTypes.STRING
    }
}, {
    sequelize,
    modelName: 'TestItem',
    tableName: 'test_items'
});

// Create a test repository
class TestRepository extends BaseRepository {
    constructor() {
        super(TestItem);
    }
}

describe('BaseRepository', () => {
    let repository;

    beforeAll(async () => {
        // Sync the test model with the database
        await sequelize.sync({ force: true });
        repository = new TestRepository();
    });

    beforeEach(async () => {
        // Clear the test table before each test
        await TestItem.destroy({ where: {}, force: true });
    });

    afterAll(async () => {
        // Drop the test table and close connection
        await sequelize.drop();
        await sequelize.close();
    });

    describe('findAll', () => {
        it('should return all items', async () => {
            // Create test items
            await TestItem.bulkCreate([
                { name: 'Item 1', description: 'Description 1' },
                { name: 'Item 2', description: 'Description 2' }
            ]);

            const items = await repository.findAll();
            expect(items).toHaveLength(2);
            expect(items[0].name).toBe('Item 1');
            expect(items[1].name).toBe('Item 2');
        });

        it('should filter items', async () => {
            await TestItem.bulkCreate([
                { name: 'Item 1', description: 'Description 1' },
                { name: 'Item 2', description: 'Description 2' }
            ]);

            const items = await repository.findAll({ where: { name: 'Item 1' } });
            expect(items).toHaveLength(1);
            expect(items[0].name).toBe('Item 1');
        });
    });

    describe('create', () => {
        it('should create item', async () => {
            const item = await repository.create({
                name: 'New Item',
                description: 'New Description'
            });

            expect(item.name).toBe('New Item');
            expect(item.description).toBe('New Description');

            const savedItem = await TestItem.findByPk(item.id);
            expect(savedItem.name).toBe('New Item');
        });
    });

    describe('update', () => {
        it('should update item', async () => {
            const item = await TestItem.create({
                name: 'Original Name',
                description: 'Original Description'
            });

            const updatedItem = await repository.update(item.id, {
                name: 'Updated Name'
            });

            expect(updatedItem.name).toBe('Updated Name');
            expect(updatedItem.description).toBe('Original Description');

            const savedItem = await TestItem.findByPk(item.id);
            expect(savedItem.name).toBe('Updated Name');
        });

        it('should return null when item not found', async () => {
            const result = await repository.update(999, {
                name: 'Updated Name'
            });

            expect(result).toBeNull();
        });
    });

    describe('delete', () => {
        it('should delete item', async () => {
            const item = await TestItem.create({
                name: 'To Delete',
                description: 'Will be deleted'
            });

            await repository.delete(item.id);

            const deletedItem = await TestItem.findByPk(item.id);
            expect(deletedItem).toBeNull();
        });
    });

    describe('count', () => {
        it('should return count of items', async () => {
            await TestItem.bulkCreate([
                { name: 'Item 1', description: 'Description 1' },
                { name: 'Item 2', description: 'Description 2' },
                { name: 'Item 3', description: 'Description 3' }
            ]);

            const count = await repository.count();
            expect(count).toBe(3);

            const filteredCount = await repository.count({
                where: { name: 'Item 1' }
            });
            expect(filteredCount).toBe(1);
        });
    });

    describe('transactions', () => {
        it('should handle transactions', async () => {
            const transaction = await sequelize.transaction();
            try {
                const item = await repository.create({ name: 'test' }, { transaction });
                await repository.update(item.id, { name: 'updated' }, { transaction });
                await transaction.commit();
                
                const updatedItem = await repository.findOne({ where: { id: item.id } });
                expect(updatedItem.name).toBe('updated');
            } catch (error) {
                await transaction.rollback();
                throw error;
            }
        });

        it('should rollback on error', async () => {
            const transaction = await sequelize.transaction();
            try {
                await repository.create({ name: 'test' }, { transaction });
                
                // Force an error by trying to update a non-existent record
                await repository.update('non-existent-id', { name: 'updated' }, { transaction });
                
                // If we get here, fail the test
                fail('Transaction should have failed');
            } catch (error) {
                // Only rollback if transaction hasn't been committed
                if (!transaction.finished) {
                    await transaction.rollback();
                }
            }

            // After rollback, no items should exist
            const items = await repository.findAll();
            expect(items.length).toBe(0);
        });
    });
}); 