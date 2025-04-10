'use strict';

module.exports = {
  up: async function(queryInterface, Sequelize) {
    // Check if column exists before adding it to avoid errors
    const tableInfo = await queryInterface.sequelize.query(
      `PRAGMA table_info(caution_cards);`
    );
    
    // Check if the blood_type column already exists
    const hasBloodType = tableInfo[0].some(column => column.name === 'blood_type');
    
    if (!hasBloodType) {
      await queryInterface.sequelize.query(
        `ALTER TABLE caution_cards ADD COLUMN blood_type TEXT;`
      );
      console.log('Added blood_type column to caution_cards table');
    } else {
      console.log('blood_type column already exists in caution_cards table');
    }

    // Check if other columns exist before adding them
    const hasImagePath = tableInfo[0].some(column => column.name === 'image_path');
    
    if (!hasImagePath) {
      await queryInterface.sequelize.query(
        `ALTER TABLE caution_cards ADD COLUMN image_path TEXT;`
      );
      console.log('Added image_path column to caution_cards table');
    }
  },

  down: async function(queryInterface, Sequelize) {
    // SQLite doesn't support dropping columns
    console.log('SQLite does not support dropping columns. No down migration performed.');
  }
}; 