/**
 * Script to verify geocoding database schema
 * Checks if latitude, longitude, geocoded_at, and geocode_error columns exist
 * in both people and assets tables
 */

const db = require('../backend/src/db/connection');

async function verifySchema() {
  console.log('Verifying geocoding schema...\n');

  try {
    // Check people table columns
    console.log('Checking people table:');
    const peopleColumns = await db.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'people'
        AND column_name IN ('latitude', 'longitude', 'geocoded_at', 'geocode_error')
      ORDER BY column_name;
    `);

    if (peopleColumns.rows.length === 4) {
      console.log('✓ All geocoding columns exist in people table:');
      peopleColumns.rows.forEach(col => {
        console.log(`  - ${col.column_name} (${col.data_type}, nullable: ${col.is_nullable})`);
      });
    } else {
      console.log('✗ Missing columns in people table:');
      console.log(`  Found ${peopleColumns.rows.length}/4 required columns`);
      peopleColumns.rows.forEach(col => {
        console.log(`  - ${col.column_name} (${col.data_type})`);
      });
    }

    console.log('');

    // Check assets table columns
    console.log('Checking assets table:');
    const assetsColumns = await db.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'assets'
        AND column_name IN ('latitude', 'longitude', 'geocoded_at', 'geocode_error')
      ORDER BY column_name;
    `);

    if (assetsColumns.rows.length === 4) {
      console.log('✓ All geocoding columns exist in assets table:');
      assetsColumns.rows.forEach(col => {
        console.log(`  - ${col.column_name} (${col.data_type}, nullable: ${col.is_nullable})`);
      });
    } else {
      console.log('✗ Missing columns in assets table:');
      console.log(`  Found ${assetsColumns.rows.length}/4 required columns`);
      assetsColumns.rows.forEach(col => {
        console.log(`  - ${col.column_name} (${col.data_type})`);
      });
    }

    console.log('');

    // Check sample data with geocoded addresses
    console.log('Checking geocoded data:');
    const geocodedPeople = await db.query(`
      SELECT COUNT(*) as total,
             COUNT(latitude) as with_coords,
             COUNT(geocode_error) as with_errors
      FROM people
      WHERE address IS NOT NULL AND address != '';
    `);

    console.log('People with addresses:');
    console.log(`  Total: ${geocodedPeople.rows[0].total}`);
    console.log(`  With coordinates: ${geocodedPeople.rows[0].with_coords}`);
    console.log(`  With errors: ${geocodedPeople.rows[0].with_errors}`);

    const geocodedAssets = await db.query(`
      SELECT COUNT(*) as total,
             COUNT(latitude) as with_coords,
             COUNT(geocode_error) as with_errors
      FROM assets
      WHERE address IS NOT NULL AND address != '';
    `);

    console.log('Assets with addresses:');
    console.log(`  Total: ${geocodedAssets.rows[0].total}`);
    console.log(`  With coordinates: ${geocodedAssets.rows[0].with_coords}`);
    console.log(`  With errors: ${geocodedAssets.rows[0].with_errors}`);

    console.log('\n✓ Schema verification complete');

  } catch (error) {
    console.error('✗ Error verifying schema:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  } finally {
    await db.end();
  }
}

verifySchema();
