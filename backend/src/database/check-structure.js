// ES Modules version of database structure checker
import { db } from './init.js';
import { queryExec } from '../utils/dbHelper.js';

async function checkDatabaseStructure() {
  try {
    console.log('Checking database structure...');
    
    // List all tables
    const tables = await queryExec(`
      SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';
    `);
    
    console.log('Tables in database:');
    tables.forEach(table => {
      console.log(`- ${table.name}`);
    });
    
    // Check each table structure
    for (const table of tables) {
      console.log(`\nStructure of table ${table.name}:`);
      
      const columns = await queryExec(`PRAGMA table_info(${table.name});`);
      
      columns.forEach(column => {
        console.log(`  - ${column.name} (${column.type})`);
      });
      
      // Check indexes
      const indexes = await queryExec(`PRAGMA index_list(${table.name});`);
      
      if (indexes.length > 0) {
        console.log(`\n  Indexes on ${table.name}:`);
        for (const index of indexes) {
          console.log(`  - ${index.name}`);
          
          // Get columns in the index
          const indexColumns = await queryExec(`PRAGMA index_info(${index.name});`);
          indexColumns.forEach(col => {
            const column = columns.find(c => c.cid === col.cid);
            console.log(`    - ${column.name}`);
          });
        }
      }
    }
    
    console.log('\nDatabase check complete.');
  } catch (error) {
    console.error('Error checking database structure:', error);
  }
}

// Run the check
checkDatabaseStructure().then(() => {
  console.log('Done.');
  process.exit(0);
}).catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
}); 