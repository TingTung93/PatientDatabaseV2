# Database Management Scripts

This directory contains scripts for managing the database in your Patient Info App.

## Reset Database Script

The reset database script is used to clear the SQLite database when schema changes cause errors in the application. This is particularly useful during development when database schema changes are frequent.

### When to use

Use this script when:
- You encounter database errors about table or column structures
- You've updated your models and need a fresh database
- You want to clear all data and start with a clean state

### Usage

#### For Windows users:

1. **Using the Batch file:**
   ```
   .\scripts\reset-db.bat
   ```

2. **Using npm:**
   ```
   npm run reset-db
   ```

3. **Using Node directly:**
   ```
   node scripts\reset-db.js
   ```

#### For macOS/Linux users:

1. **Using the Shell script:**
   ```
   ./scripts/reset-db.sh
   ```

2. **Using npm:**
   ```
   npm run reset-db
   ```

3. **Using Node directly:**
   ```
   node scripts/reset-db.js
   ```

### Important Notes

- This script will DELETE your database files and all data contained within them
- After running this script, the application will create a new empty database with the current schema
- In production environments, an additional `--force` flag is required for safety

### Production Warning

**Never run this script in production without backing up your data first!**

To run in production (not recommended):
```
NODE_ENV=production node scripts/reset-db.js --force
``` 