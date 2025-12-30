const express = require('express');
const router = express.Router();
const db = require('../db/connection');
const authenticate = require('../middleware/auth');
const GeocodingService = require('../services/GeocodingService');

// Instantiate geocoding service
const geocodingService = new GeocodingService();

/**
 * GET /api/v1/map/locations
 * Get all locations (people and assets) with geocoded coordinates for map display
 *
 * Query params:
 * - type: 'people' | 'assets' | 'all' (default: 'all')
 * - search: search query to filter by name/address
 */
router.get('/locations', authenticate, async (req, res) => {
  const userId = req.userId;
  const { type = 'all', search = '' } = req.query;
  
  try {

    const locations = {
      people: [],
      assets: [],
      stats: {
        totalPeople: 0,
        totalAssets: 0,
        geocodedPeople: 0,
        geocodedAssets: 0,
        failedPeople: 0,
        failedAssets: 0
      }
    };

    // Fetch people with geocoded addresses
    if (type === 'all' || type === 'people') {
      let peopleQuery = `
        SELECT
          id,
          name,
          address,
          email,
          phone,
          linkedin_url,
          latitude,
          longitude,
          geocoded_at,
          geocode_error
        FROM people
        WHERE user_id = $1
          AND address IS NOT NULL
          AND address != ''
          AND latitude IS NOT NULL
          AND longitude IS NOT NULL
      `;

      const params = [userId];

      // Add search filter if provided
      if (search) {
        peopleQuery += ` AND (name ILIKE $2 OR address ILIKE $2)`;
        params.push(`%${search}%`);
      }

      peopleQuery += ` ORDER BY name`;

      const peopleResult = await db.query(peopleQuery, params);

      locations.people = peopleResult.rows.map(person => ({
        id: person.id,
        type: 'person',
        name: person.name,
        address: person.address,
        latitude: parseFloat(person.latitude),
        longitude: parseFloat(person.longitude),
        email: person.email,
        phone: person.phone,
        linkedinUrl: person.linkedin_url,
        geocodedAt: person.geocoded_at
      }));

      // Get stats for people
      const peopleStatsResult = await db.query(
        `SELECT
          COUNT(*) as total,
          COUNT(latitude) as geocoded,
          COUNT(geocode_error) as failed
         FROM people
         WHERE user_id = $1 AND address IS NOT NULL AND address != ''`,
        [userId]
      );

      locations.stats.totalPeople = parseInt(peopleStatsResult.rows[0].total);
      locations.stats.geocodedPeople = parseInt(peopleStatsResult.rows[0].geocoded);
      locations.stats.failedPeople = parseInt(peopleStatsResult.rows[0].failed);
    }

    // Fetch assets with geocoded addresses
    if (type === 'all' || type === 'assets') {
      let assetsQuery = `
        SELECT
          a.id,
          a.asset_type,
          a.address,
          a.availability,
          a.estimated_value,
          a.latitude,
          a.longitude,
          a.geocoded_at,
          a.geocode_error,
          a.owner_id,
          p.name as owner_name
        FROM assets a
        LEFT JOIN people p ON a.owner_id = p.id
        WHERE a.user_id = $1
          AND a.address IS NOT NULL
          AND a.address != ''
          AND a.latitude IS NOT NULL
          AND a.longitude IS NOT NULL
      `;

      const params = [userId];

      // Add search filter if provided
      if (search) {
        assetsQuery += ` AND (a.asset_type ILIKE $2 OR a.address ILIKE $2 OR p.name ILIKE $2)`;
        params.push(`%${search}%`);
      }

      assetsQuery += ` ORDER BY a.asset_type, p.name`;

      const assetsResult = await db.query(assetsQuery, params);

      locations.assets = assetsResult.rows.map(asset => ({
        id: asset.id,
        type: 'asset',
        assetType: asset.asset_type,
        name: `${asset.owner_name || 'Unknown'} - ${asset.asset_type}`,
        ownerName: asset.owner_name,
        ownerId: asset.owner_id,
        address: asset.address,
        latitude: parseFloat(asset.latitude),
        longitude: parseFloat(asset.longitude),
        availability: asset.availability,
        estimatedValue: asset.estimated_value,
        geocodedAt: asset.geocoded_at
      }));

      // Get stats for assets
      const assetsStatsResult = await db.query(
        `SELECT
          COUNT(*) as total,
          COUNT(latitude) as geocoded,
          COUNT(geocode_error) as failed
         FROM assets
         WHERE user_id = $1 AND address IS NOT NULL AND address != ''`,
        [userId]
      );

      locations.stats.totalAssets = parseInt(assetsStatsResult.rows[0].total);
      locations.stats.geocodedAssets = parseInt(assetsStatsResult.rows[0].geocoded);
      locations.stats.failedAssets = parseInt(assetsStatsResult.rows[0].failed);
    }

    res.json(locations);

  } catch (error) {
    console.error('Error fetching map locations:', error);
    console.error('Error stack:', error.stack);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      userId: req.userId,
      queryType: type,
      searchTerm: search
    });
    res.status(500).json({ 
      error: 'Failed to fetch locations',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/v1/map/failed
 * Get list of people and assets that failed geocoding
 */
router.get('/failed', authenticate, async (req, res) => {
  try {
    const userId = req.userId;

    const failed = {
      people: [],
      assets: []
    };

    // Get people with geocoding errors
    const peopleResult = await db.query(
      `SELECT id, name, address, geocode_error, geocoded_at
       FROM people
       WHERE user_id = $1
         AND address IS NOT NULL
         AND address != ''
         AND geocode_error IS NOT NULL
       ORDER BY name`,
      [userId]
    );

    failed.people = peopleResult.rows.map(person => ({
      id: person.id,
      name: person.name,
      address: person.address,
      error: person.geocode_error,
      attemptedAt: person.geocoded_at
    }));

    // Get assets with geocoding errors
    const assetsResult = await db.query(
      `SELECT a.id, a.asset_type, a.address, a.geocode_error, a.geocoded_at, p.name as owner_name
       FROM assets a
       LEFT JOIN people p ON a.owner_id = p.id
       WHERE a.user_id = $1
         AND a.address IS NOT NULL
         AND a.address != ''
         AND a.geocode_error IS NOT NULL
       ORDER BY a.asset_type`,
      [userId]
    );

    failed.assets = assetsResult.rows.map(asset => ({
      id: asset.id,
      assetType: asset.asset_type,
      ownerName: asset.owner_name,
      address: asset.address,
      error: asset.geocode_error,
      attemptedAt: asset.geocoded_at
    }));

    res.json(failed);

  } catch (error) {
    console.error('Error fetching failed geocoding:', error);
    console.error('Error stack:', error.stack);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      userId: req.userId
    });
    res.status(500).json({ 
      error: 'Failed to fetch geocoding errors',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * POST /api/v1/map/geocode/person/:id
 * Manually trigger geocoding for a specific person
 */
router.post('/geocode/person/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    // Verify person belongs to user
    const checkResult = await db.query(
      'SELECT id FROM people WHERE id = $1 AND user_id = $2',
      [id, req.userId]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Person not found' });
    }

    const result = await geocodingService.geocodePerson(id);

    if (result.success) {
      res.json({
        success: true,
        message: 'Person geocoded successfully',
        data: result
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Geocoding failed',
        error: result.error
      });
    }

  } catch (error) {
    console.error('Error geocoding person:', error);
    console.error('Error stack:', error.stack);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      personId: req.params.id,
      userId: req.userId
    });
    res.status(500).json({ 
      error: 'Failed to geocode person',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * POST /api/v1/map/geocode/asset/:id
 * Manually trigger geocoding for a specific asset
 */
router.post('/geocode/asset/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    // Verify asset belongs to user
    const checkResult = await db.query(
      'SELECT id FROM assets WHERE id = $1 AND user_id = $2',
      [id, req.userId]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    const result = await geocodingService.geocodeAsset(id);

    if (result.success) {
      res.json({
        success: true,
        message: 'Asset geocoded successfully',
        data: result
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Geocoding failed',
        error: result.error
      });
    }

  } catch (error) {
    console.error('Error geocoding asset:', error);
    console.error('Error stack:', error.stack);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      assetId: req.params.id,
      userId: req.userId
    });
    res.status(500).json({ 
      error: 'Failed to geocode asset',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * POST /api/v1/map/geocode-all
 * Batch geocode all people and assets with addresses
 * WARNING: This can take a long time for large datasets due to rate limiting
 */
router.post('/geocode-all', authenticate, async (req, res) => {
  try {
    const userId = req.userId;

    // Start background geocoding (don't wait for completion)
    // Note: In production, this should use a job queue
    (async () => {
      console.log(`Starting batch geocoding for user ${userId}`);

      const peopleResults = await geocodingService.geocodeAllPeople(userId);
      console.log('People geocoding complete:', peopleResults);

      const assetsResults = await geocodingService.geocodeAllAssets(userId);
      console.log('Assets geocoding complete:', assetsResults);
    })();

    res.json({
      success: true,
      message: 'Batch geocoding started in background. This may take several minutes depending on the number of addresses.',
      note: 'Refresh the map page in a few minutes to see updated locations'
    });

  } catch (error) {
    console.error('Error starting batch geocoding:', error);
    console.error('Error stack:', error.stack);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      userId: req.userId
    });
    res.status(500).json({ 
      error: 'Failed to start batch geocoding',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
