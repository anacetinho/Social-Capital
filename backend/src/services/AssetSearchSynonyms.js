/**
 * Asset Search Synonym Dictionary
 * Maps common search terms to their variations for flexible asset searching
 *
 * Usage: expandSearchQuery('motorcycle') returns ['motorcycle', 'motorbike', 'bike', 'moto', 'scooter']
 */

const ASSET_SYNONYMS = {
  // Vehicles - Two-wheeled
  'motorcycle': ['motorcycle', 'motorbike', 'bike', 'moto', 'scooter'],
  'motorbike': ['motorcycle', 'motorbike', 'bike', 'moto'],
  'bike': ['bike', 'bicycle', 'motorcycle', 'motorbike'],
  'scooter': ['scooter', 'moto', 'motorcycle'],

  // Vehicles - Four-wheeled
  'car': ['car', 'vehicle', 'automobile', 'auto'],
  'vehicle': ['vehicle', 'car', 'automobile'],
  'truck': ['truck', 'pickup', 'lorry'],

  // Vehicles - Watercraft
  'boat': ['boat', 'yacht', 'vessel', 'watercraft', 'ship'],
  'yacht': ['yacht', 'boat', 'vessel'],

  // Properties - Vacation/Holiday
  'vacation house': ['vacation house', 'vacation home', 'holiday house', 'holiday home',
                     'summer house', 'summer home', 'beach house', 'getaway', 'cottage', 'retreat'],
  'summer house': ['vacation house', 'vacation home', 'holiday house', 'summer house',
                   'summer home', 'beach house', 'getaway', 'cottage'],
  'holiday house': ['vacation house', 'vacation home', 'holiday house', 'holiday home',
                    'summer house', 'getaway'],
  'beach house': ['beach house', 'vacation house', 'vacation home', 'coastal property'],
  'cottage': ['cottage', 'cabin', 'vacation house', 'getaway'],

  // Properties - Rental/Investment
  'rental property': ['rental property', 'rental', 'rental home', 'rental house',
                      'rental apartment', 'investment property', 'rental propiety',
                      'rental proprieties', 'rental propriety'],
  'rental': ['rental', 'rental property', 'rental home', 'rental house', 'rental apartment'],
  'investment property': ['investment property', 'rental property', 'rental'],

  // Properties - Types
  'apartment': ['apartment', 'flat', 'condo', 'condominium', 'apt'],
  'flat': ['flat', 'apartment', 'condo'],
  'condo': ['condo', 'condominium', 'apartment'],
  'house': ['house', 'home', 'residence', 'dwelling', 'property'],
  'home': ['home', 'house', 'residence'],
  'property': ['property', 'real estate', 'estate'],

  // Facilities - Pool/Water
  'pool': ['pool', 'swimming pool', 'pool facility', 'natatorium'],
  'swimming pool': ['swimming pool', 'pool'],

  // Facilities - Parking
  'garage': ['garage', 'parking', 'parking space', 'parking spot', 'carport'],
  'parking': ['parking', 'garage', 'parking space', 'parking spot'],

  // Financial Assets
  'stocks': ['stocks', 'shares', 'equity', 'securities', 'stock portfolio'],
  'shares': ['shares', 'stocks', 'equity'],
  'stock': ['stock', 'stocks', 'shares', 'equity'],

  // Equipment
  'camera': ['camera', 'camera equipment', 'photography equipment'],
  'tools': ['tools', 'power tools', 'equipment'],
  'equipment': ['equipment', 'tools', 'gear'],
};

/**
 * Expand a search query to include synonyms
 * Returns array of search terms to try
 *
 * @param {string} query - User's search query (e.g., "motorcycle", "vacation house")
 * @returns {Array<string>} Array of synonyms including original query
 *
 * @example
 * expandSearchQuery('motorcycle')
 * // Returns: ['motorcycle', 'motorbike', 'bike', 'moto', 'scooter']
 *
 * expandSearchQuery('vacation house')
 * // Returns: ['vacation house', 'vacation home', 'holiday house', ...]
 */
function expandSearchQuery(query) {
  const lower = query.toLowerCase().trim();

  // Direct match: if query exactly matches a synonym key
  if (ASSET_SYNONYMS[lower]) {
    return ASSET_SYNONYMS[lower];
  }

  // Partial match: if query contains any synonym key (or vice versa)
  for (const [key, synonyms] of Object.entries(ASSET_SYNONYMS)) {
    if (lower.includes(key) || key.includes(lower)) {
      return synonyms;
    }
  }

  // No synonyms found: return original query
  return [query];
}

module.exports = {
  expandSearchQuery,
  ASSET_SYNONYMS
};
