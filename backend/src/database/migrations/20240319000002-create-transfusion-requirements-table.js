'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('TransfusionRequirements', { // Use standard model name convention
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      patient_id: { // Keep underscored if models use it
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Patients', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE', // Or SET NULL
      },
      blood_type_required: {
        type: Sequelize.STRING(5), // Allow slightly more length?
        allowNull: false
      },
      units_required: {
        type: Sequelize.INTEGER,
        allowNull: false,
        validate: { // Add validation if model doesn't handle it
          min: 1
        }
      },
      urgency_level: {
        type: Sequelize.ENUM('Low', 'Medium', 'High', 'Critical'),
        allowNull: false
      },
      required_by_date: {
        type: Sequelize.DATEONLY,
        allowNull: false
      },
      status: {
        type: Sequelize.ENUM('Pending', 'In Progress', 'Completed'),
        allowNull: false,
        defaultValue: 'Pending'
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE
      },
      deleted_at: {
        allowNull: true,
        type: Sequelize.DATE
      }
    });

    // Add indexes
    await queryInterface.addIndex('TransfusionRequirements', ['patient_id']);
    await queryInterface.addIndex('TransfusionRequirements', ['required_by_date']);
    await queryInterface.addIndex('TransfusionRequirements', ['status']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('TransfusionRequirements');
  }
};