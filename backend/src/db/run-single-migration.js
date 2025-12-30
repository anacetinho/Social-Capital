const pool = require('./connection');
const fs = require('fs');
const path = require('path');

async function runSingleMigration() {
  const migrationFile = process.argv[2];
  
  if (!migrationFile) {
    console.error('Usage: node run-single-migration.js <migration-filename>');
    process.exit(1);
  }

  const migrationPath = path.join(__dirname, 'migrations', migrationFile);
  
  if (!fs.existsSync(migrationPath)) {
    console.error(`Migration file not found: ${migrationPath}`);
    process.exit(1);
  }

  console.log(`🔄 Running migration: ${migrationFile}\n`);
  const sql = fs.readFileSync(migrationPath, 'utf8');

  try {
    await pool.query(sql);
    console.log(`✅ ${migrationFile} complete`);
    process.exit(0);
  } catch (err) {
    console.error(`❌ ${migrationFile} failed:`, err.message);
    process.exit(1);
  }
}

runSingleMigration();
