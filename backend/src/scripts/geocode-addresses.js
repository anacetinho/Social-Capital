const GeocodingService = require('../services/GeocodingService');
const pool = require('../db/connection');

/**
 * Batch geocoding script for all people and assets
 * Usage: node src/scripts/geocode-addresses.js
 *
 * Options:
 * - Set GEOCODE_TYPE environment variable to 'people' or 'assets' to geocode only one type
 *   Example: GEOCODE_TYPE=people node src/scripts/geocode-addresses.js
 * - Set USER_ID environment variable to geocode only for a specific user
 *   Example: USER_ID=<uuid> node src/scripts/geocode-addresses.js
 */

const geocodingService = new GeocodingService();

async function geocodeAllAddresses() {
  let connection;

  try {
    console.log('Starting batch geocoding...\n');

    // Get options from environment variables
    const geocodeType = process.env.GEOCODE_TYPE || 'all'; // 'people', 'assets', or 'all'
    const specificUserId = process.env.USER_ID || null;

    connection = await pool.connect();

    // Get all users (or specific user if provided)
    const userQuery = specificUserId
      ? 'SELECT id, email FROM users WHERE id = $1'
      : 'SELECT id, email FROM users ORDER BY created_at';
    const userParams = specificUserId ? [specificUserId] : [];
    const usersResult = await connection.query(userQuery, userParams);
    const users = usersResult.rows;

    if (users.length === 0) {
      console.log('No users found.');
      return;
    }

    console.log(`Found ${users.length} user(s) to process.\n`);

    let totalPeopleGeocoded = 0;
    let totalAssetsGeocoded = 0;
    let totalPeopleFailed = 0;
    let totalAssetsFailed = 0;

    for (const user of users) {
      console.log(`\n========================================`);
      console.log(`Processing user: ${user.email} (${user.id})`);
      console.log(`========================================\n`);

      // Geocode people
      if (geocodeType === 'all' || geocodeType === 'people') {
        console.log('Geocoding people...');
        try {
          const result = await geocodingService.geocodeAllPeople(user.id);
          totalPeopleGeocoded += result.successCount;
          totalPeopleFailed += result.failureCount;
          console.log(`  ✓ Successfully geocoded ${result.successCount} people`);
          console.log(`  ✗ Failed to geocode ${result.failureCount} people\n`);
        } catch (err) {
          console.error(`  Error geocoding people:`, err.message);
        }
      }

      // Geocode assets
      if (geocodeType === 'all' || geocodeType === 'assets') {
        console.log('Geocoding assets...');
        try {
          const result = await geocodingService.geocodeAllAssets(user.id);
          totalAssetsGeocoded += result.successCount;
          totalAssetsFailed += result.failureCount;
          console.log(`  ✓ Successfully geocoded ${result.successCount} assets`);
          console.log(`  ✗ Failed to geocode ${result.failureCount} assets\n`);
        } catch (err) {
          console.error(`  Error geocoding assets:`, err.message);
        }
      }
    }

    // Print summary
    console.log('\n========================================');
    console.log('GEOCODING SUMMARY');
    console.log('========================================');
    if (geocodeType === 'all' || geocodeType === 'people') {
      console.log(`People:`);
      console.log(`  ✓ Successfully geocoded: ${totalPeopleGeocoded}`);
      console.log(`  ✗ Failed: ${totalPeopleFailed}`);
    }
    if (geocodeType === 'all' || geocodeType === 'assets') {
      console.log(`Assets:`);
      console.log(`  ✓ Successfully geocoded: ${totalAssetsGeocoded}`);
      console.log(`  ✗ Failed: ${totalAssetsFailed}`);
    }
    console.log('========================================\n');

  } catch (err) {
    console.error('Fatal error during geocoding:', err);
    process.exit(1);
  } finally {
    if (connection) {
      connection.release();
    }
    await pool.end();
  }
}

// Run the script
console.log('\n╔════════════════════════════════════════╗');
console.log('║   Social Capital - Batch Geocoding    ║');
console.log('╚════════════════════════════════════════╝\n');

geocodeAllAddresses()
  .then(() => {
    console.log('Geocoding completed successfully.');
    process.exit(0);
  })
  .catch(err => {
    console.error('Script failed:', err);
    process.exit(1);
  });
