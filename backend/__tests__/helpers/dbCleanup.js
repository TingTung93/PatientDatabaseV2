const db = require('../../src/database/db');

async function cleanupDatabase() {
    try {
        // Try to roll back any open transactions
        if (db.inTransaction) {
            try {
                await db.rollback();
            } catch (error) {
                console.log('Transaction rollback failed (expected if no transaction):', error.message);
            }
        }

        // Cleanup tables in reverse order of dependencies
        const tables = [
            'transfusion_requirements',
            'reports',
            'documents',
            'patients',
            'users'
        ];

        for (const table of tables) {
            try {
                await db.query(`DELETE FROM ${table}`);
            } catch (error) {
                console.log(`Table cleanup failed for ${table} (expected if table doesn't exist):`, error.message);
            }
        }

        // Close database connection
        await db.close();

        // Reinitialize the database for the next test
        await db.initialize();
    } catch (error) {
        console.error('Database cleanup failed:', error);
        // Don't throw - we want to continue even if cleanup fails
        
        // Try to reinitialize the database even if cleanup failed
        try {
            await db.initialize();
        } catch (initError) {
            console.error('Failed to reinitialize database after cleanup:', initError);
        }
    }
}

module.exports = {
    cleanupDatabase
};