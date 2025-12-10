const NodeGeocoder = require('node-geocoder');
const db = require('../db/connection');

/**
 * GeocodingService
 * Handles geocoding addresses to latitude/longitude coordinates using OpenStreetMap Nominatim
 * Includes rate limiting, fallback strategies for incomplete addresses, and error handling
 */
class GeocodingService {
  constructor() {
    // Configure geocoder with Nominatim (OpenStreetMap) provider
    this.geocoder = NodeGeocoder({
      provider: 'openstreetmap',
      httpAdapter: 'https',
      // Nominatim requires a user agent header
      formatter: null,
      timeout: 10000 // 10 second timeout
    });

    // Rate limiting: Nominatim policy is 1 request per second
    this.lastRequestTime = 0;
    this.rateLimitDelay = 1000; // 1 second between requests
  }

  /**
   * Wait to respect rate limits (1 request/second for Nominatim)
   */
  async waitForRateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.rateLimitDelay) {
      const waitTime = this.rateLimitDelay - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    this.lastRequestTime = Date.now();
  }

  /**
   * Geocode an address with fallback strategy for incomplete addresses
   *
   * Strategy:
   * 1. Try full address first
   * 2. If fails, extract and try "street, city" only
   * 3. If fails, try city only
   * 4. If all fail, return error
   *
   * @param {string} address - The address to geocode
   * @returns {Promise<Object>} - { latitude, longitude, formattedAddress, confidence }
   */
  async geocodeAddress(address) {
    if (!address || address.trim() === '') {
      throw new Error('Address is empty');
    }

    await this.waitForRateLimit();

    try {
      // Strategy 1: Try full address
      let results = await this.geocoder.geocode(address);

      if (results && results.length > 0) {
        const result = results[0];
        return {
          latitude: result.latitude,
          longitude: result.longitude,
          formattedAddress: result.formattedAddress || address,
          confidence: 'high', // Full address matched
          provider: 'nominatim'
        };
      }

      // Strategy 2: Try extracting street and city
      const streetCity = this.extractStreetCity(address);
      if (streetCity) {
        await this.waitForRateLimit();
        results = await this.geocoder.geocode(streetCity);

        if (results && results.length > 0) {
          const result = results[0];
          return {
            latitude: result.latitude,
            longitude: result.longitude,
            formattedAddress: result.formattedAddress || streetCity,
            confidence: 'medium', // Partial address matched
            provider: 'nominatim'
          };
        }
      }

      // Strategy 3: Try city only
      const city = this.extractCity(address);
      if (city) {
        await this.waitForRateLimit();
        results = await this.geocoder.geocode(city);

        if (results && results.length > 0) {
          const result = results[0];
          return {
            latitude: result.latitude,
            longitude: result.longitude,
            formattedAddress: result.formattedAddress || city,
            confidence: 'low', // City-level only
            provider: 'nominatim'
          };
        }
      }

      // All strategies failed
      throw new Error('Unable to geocode address with any strategy');

    } catch (error) {
      throw new Error(`Geocoding failed: ${error.message}`);
    }
  }

  /**
   * Extract street and city from address
   * Simple heuristic: assumes format like "Street, City" or "Street, Postal Code City"
   */
  extractStreetCity(address) {
    const parts = address.split(',').map(p => p.trim());
    if (parts.length >= 2) {
      return `${parts[0]}, ${parts[1]}`;
    }
    return null;
  }

  /**
   * Extract city from address
   * Simple heuristic: takes the part after first comma, or the whole address if no comma
   */
  extractCity(address) {
    const parts = address.split(',').map(p => p.trim());
    if (parts.length >= 2) {
      // Return last part (often city)
      return parts[parts.length - 1];
    }
    return address; // Assume whole address is city name
  }

  /**
   * Geocode a person's address and update database
   * @param {string} personId - Person ID
   * @returns {Promise<Object>} - Geocoding result
   */
  async geocodePerson(personId) {
    try {
      // Get person's address
      const result = await db.query(
        'SELECT id, name, address FROM people WHERE id = $1 AND user_id = (SELECT user_id FROM people WHERE id = $1 LIMIT 1)',
        [personId]
      );

      if (result.rows.length === 0) {
        throw new Error('Person not found');
      }

      const person = result.rows[0];

      if (!person.address) {
        throw new Error('Person has no address');
      }

      // Geocode the address
      const geocoded = await this.geocodeAddress(person.address);

      // Update database with geocoded coordinates
      await db.query(
        `UPDATE people
         SET latitude = $1, longitude = $2, geocoded_at = NOW(), geocode_error = NULL
         WHERE id = $3`,
        [geocoded.latitude, geocoded.longitude, personId]
      );

      return {
        success: true,
        personId: person.id,
        personName: person.name,
        address: person.address,
        ...geocoded
      };

    } catch (error) {
      // Store error in database
      await db.query(
        `UPDATE people
         SET geocode_error = $1, geocoded_at = NOW()
         WHERE id = $2`,
        [error.message, personId]
      );

      return {
        success: false,
        personId,
        error: error.message
      };
    }
  }

  /**
   * Geocode an asset's address and update database
   * @param {string} assetId - Asset ID
   * @returns {Promise<Object>} - Geocoding result
   */
  async geocodeAsset(assetId) {
    try {
      // Get asset's address
      const result = await db.query(
        'SELECT id, asset_type, address FROM assets WHERE id = $1 AND user_id = (SELECT user_id FROM assets WHERE id = $1 LIMIT 1)',
        [assetId]
      );

      if (result.rows.length === 0) {
        throw new Error('Asset not found');
      }

      const asset = result.rows[0];

      if (!asset.address) {
        throw new Error('Asset has no address');
      }

      // Geocode the address
      const geocoded = await this.geocodeAddress(asset.address);

      // Update database with geocoded coordinates
      await db.query(
        `UPDATE assets
         SET latitude = $1, longitude = $2, geocoded_at = NOW(), geocode_error = NULL
         WHERE id = $3`,
        [geocoded.latitude, geocoded.longitude, assetId]
      );

      return {
        success: true,
        assetId: asset.id,
        assetType: asset.asset_type,
        address: asset.address,
        ...geocoded
      };

    } catch (error) {
      // Store error in database
      await db.query(
        `UPDATE assets
         SET geocode_error = $1, geocoded_at = NOW()
         WHERE id = $2`,
        [error.message, assetId]
      );

      return {
        success: false,
        assetId,
        error: error.message
      };
    }
  }

  /**
   * Geocode all people with addresses (batch operation)
   * @param {string} userId - User ID to filter by
   * @returns {Promise<Object>} - Summary of results
   */
  async geocodeAllPeople(userId) {
    const results = {
      total: 0,
      successful: 0,
      failed: 0,
      skipped: 0,
      details: []
    };

    try {
      // Get all people with addresses
      const query = await db.query(
        `SELECT id, name, address
         FROM people
         WHERE user_id = $1 AND address IS NOT NULL AND address != ''`,
        [userId]
      );

      results.total = query.rows.length;

      for (const person of query.rows) {
        const result = await this.geocodePerson(person.id);
        results.details.push(result);

        if (result.success) {
          results.successful++;
        } else {
          results.failed++;
        }

        // Log progress every 10 people
        if ((results.successful + results.failed) % 10 === 0) {
          console.log(`Geocoded ${results.successful + results.failed}/${results.total} people`);
        }
      }

    } catch (error) {
      console.error('Error in batch geocoding:', error);
    }

    return results;
  }

  /**
   * Geocode all assets with addresses (batch operation)
   * @param {string} userId - User ID to filter by
   * @returns {Promise<Object>} - Summary of results
   */
  async geocodeAllAssets(userId) {
    const results = {
      total: 0,
      successful: 0,
      failed: 0,
      skipped: 0,
      details: []
    };

    try {
      // Get all assets with addresses
      const query = await db.query(
        `SELECT id, asset_type, address
         FROM assets
         WHERE user_id = $1 AND address IS NOT NULL AND address != ''`,
        [userId]
      );

      results.total = query.rows.length;

      for (const asset of query.rows) {
        const result = await this.geocodeAsset(asset.id);
        results.details.push(result);

        if (result.success) {
          results.successful++;
        } else {
          results.failed++;
        }

        // Log progress every 10 assets
        if ((results.successful + results.failed) % 10 === 0) {
          console.log(`Geocoded ${results.successful + results.failed}/${results.total} assets`);
        }
      }

    } catch (error) {
      console.error('Error in batch geocoding:', error);
    }

    return results;
  }
}

module.exports = GeocodingService;
