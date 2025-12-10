const pool = require('./connection');
const fs = require('fs');
const path = require('path');

async function runMigrations() {
  const migrationsDir = path.join(__dirname, 'migrations');
  const files = fs.readdirSync(migrationsDir).sort();

  console.log('🔄 Running database migrations...\n');

  for (const file of files) {
    if (file.endsWith('.sql')) {
      console.log(`  Running migration: ${file}`);
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');

      try {
        await pool.query(sql);
        console.log(`  ✓ ${file} complete`);
      } catch (err) {
        console.error(`  ✗ ${file} failed:`, err.message);
        throw err;
      }
    }
  }

  console.log('\n✅ All migrations complete');
  process.exit(0);
}

runMigrations().catch((err) => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
