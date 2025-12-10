import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import Layout from '../components/Layout';
import api from '../services/api';

// Fix for default marker icons in Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

// Custom icons for different marker types
const personIcon = new L.Icon({
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
  className: 'marker-person'
});

const assetIcon = new L.Icon({
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
  className: 'marker-asset'
});

// Component to auto-fit map bounds to markers
const AutoFitBounds = ({ locations }) => {
  const map = useMap();

  useEffect(() => {
    if (locations.length > 0) {
      const bounds = L.latLngBounds(
        locations.map(loc => [loc.latitude, loc.longitude])
      );
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  }, [locations, map]);

  return null;
};

const Map = () => {
  const [people, setPeople] = useState([]);
  const [assets, setAssets] = useState([]);
  const [failedLocations, setFailedLocations] = useState({ people: [], assets: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({});

  // Filter states
  const [showPeople, setShowPeople] = useState(true);
  const [showAssets, setShowAssets] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedId, setHighlightedId] = useState(null);
  const [showFailedList, setShowFailedList] = useState(false);

  // Fetch map locations
  const fetchLocations = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/map/locations');
      setPeople(response.data.people || []);
      setAssets(response.data.assets || []);
      setStats(response.data.stats || {});
      setLoading(false);
    } catch (err) {
      setError('Failed to load map locations');
      setLoading(false);
    }
  }, []);

  // Fetch failed geocoding attempts
  const fetchFailedLocations = useCallback(async () => {
    try {
      const response = await api.get('/map/failed');
      setFailedLocations(response.data);
    } catch (err) {
      console.error('Failed to fetch geocoding errors:', err);
    }
  }, []);

  useEffect(() => {
    fetchLocations();
    fetchFailedLocations();
  }, [fetchLocations, fetchFailedLocations]);

  // Retry geocoding for a failed person
  const retryGeocoding = async (type, id) => {
    try {
      const endpoint = type === 'person' ? `/map/geocode/person/${id}` : `/map/geocode/asset/${id}`;
      await api.post(endpoint);
      alert('Geocoding retry successful! Refreshing map...');
      fetchLocations();
      fetchFailedLocations();
    } catch (err) {
      alert(`Geocoding failed: ${err.response?.data?.error || 'Unknown error'}`);
    }
  };

  // Filter locations based on toggles and search
  const filteredLocations = useMemo(() => {
    let locations = [];

    if (showPeople) {
      locations = [...locations, ...people];
    }

    if (showAssets) {
      locations = [...locations, ...assets];
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      locations = locations.filter(loc =>
        loc.name.toLowerCase().includes(query) ||
        loc.address.toLowerCase().includes(query)
      );
    }

    return locations;
  }, [people, assets, showPeople, showAssets, searchQuery]);

  // Calculate center point for map
  const mapCenter = useMemo(() => {
    if (filteredLocations.length === 0) {
      return [38.7223, -9.1393]; // Default to Lisbon, Portugal
    }

    const avgLat = filteredLocations.reduce((sum, loc) => sum + loc.latitude, 0) / filteredLocations.length;
    const avgLng = filteredLocations.reduce((sum, loc) => sum + loc.longitude, 0) / filteredLocations.length;

    return [avgLat, avgLng];
  }, [filteredLocations]);

  // Handle marker search/highlight
  const handleSearch = (e) => {
    const query = e.target.value;
    setSearchQuery(query);

    if (query && filteredLocations.length > 0) {
      // Highlight first matching result
      setHighlightedId(filteredLocations[0].id);
    } else {
      setHighlightedId(null);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div>Loading map...</div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="error-message">{error}</div>
      </Layout>
    );
  }

  const totalFailed = (failedLocations.people?.length || 0) + (failedLocations.assets?.length || 0);

  return (
    <Layout>
      <div className="page-header">
        <h1>Location Map</h1>
        <p>Geographic view of your network and assets</p>
      </div>

      {/* Statistics */}
      <div className="stats-grid" style={{ marginBottom: '20px' }}>
        <div className="stat-card">
          <div className="stat-value">{filteredLocations.length}</div>
          <div className="stat-label">Locations Shown</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: '#3498db' }}>
            {stats.geocodedPeople || 0}
          </div>
          <div className="stat-label">People Located</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: '#e74c3c' }}>
            {stats.geocodedAssets || 0}
          </div>
          <div className="stat-label">Assets Located</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: totalFailed > 0 ? '#f39c12' : '#95a5a6' }}>
            {totalFailed}
          </div>
          <div className="stat-label">Failed to Geocode</div>
        </div>
      </div>

      {/* Filters and Controls */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Search */}
          <div style={{ flex: '1 1 300px' }}>
            <label style={{ display: 'block', fontSize: '12px', color: '#7f8c8d', marginBottom: '5px', fontWeight: '600' }}>
              Search Locations:
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearch}
              placeholder="Search by name or address..."
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '2px solid #3498db',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            />
          </div>

          {/* Filter Toggles */}
          <div style={{ display: 'flex', gap: '15px' }}>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={showPeople}
                onChange={(e) => setShowPeople(e.target.checked)}
                style={{ marginRight: '8px', width: '18px', height: '18px' }}
              />
              <span style={{ fontSize: '14px', color: '#3498db', fontWeight: '600' }}>
                Show People ({people.length})
              </span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={showAssets}
                onChange={(e) => setShowAssets(e.target.checked)}
                style={{ marginRight: '8px', width: '18px', height: '18px' }}
              />
              <span style={{ fontSize: '14px', color: '#e74c3c', fontWeight: '600' }}>
                Show Properties ({assets.length})
              </span>
            </label>
          </div>

          {/* Failed Geocoding Toggle */}
          {totalFailed > 0 && (
            <button
              onClick={() => setShowFailedList(!showFailedList)}
              className="btn btn-secondary"
              style={{ marginLeft: 'auto' }}
            >
              {showFailedList ? 'Hide' : 'Show'} Failed ({totalFailed})
            </button>
          )}
        </div>
      </div>

      {/* Failed Geocoding List */}
      {showFailedList && totalFailed > 0 && (
        <div className="card" style={{ marginBottom: '20px', background: '#fff3cd', borderLeft: '4px solid #f39c12' }}>
          <h3 style={{ margin: '0 0 15px 0', color: '#856404' }}>Failed to Geocode</h3>
          <p style={{ fontSize: '14px', color: '#856404', marginBottom: '15px' }}>
            The following addresses could not be geocoded. Try editing the address to be more complete or click "Retry" to attempt geocoding again.
          </p>

          {failedLocations.people.length > 0 && (
            <>
              <h4 style={{ fontSize: '14px', color: '#856404', marginBottom: '10px' }}>People:</h4>
              {failedLocations.people.map(person => (
                <div key={person.id} style={{ marginBottom: '10px', padding: '10px', background: 'white', borderRadius: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong>{person.name}</strong> - {person.address}
                      <div style={{ fontSize: '12px', color: '#95a5a6', marginTop: '4px' }}>
                        Error: {person.error}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <Link to={`/people/${person.id}/edit`} className="btn btn-secondary" style={{ fontSize: '12px', padding: '4px 8px' }}>
                        Edit
                      </Link>
                      <button
                        onClick={() => retryGeocoding('person', person.id)}
                        className="btn btn-primary"
                        style={{ fontSize: '12px', padding: '4px 8px' }}
                      >
                        Retry
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}

          {failedLocations.assets.length > 0 && (
            <>
              <h4 style={{ fontSize: '14px', color: '#856404', marginBottom: '10px', marginTop: '15px' }}>Assets:</h4>
              {failedLocations.assets.map(asset => (
                <div key={asset.id} style={{ marginBottom: '10px', padding: '10px', background: 'white', borderRadius: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong>{asset.ownerName} - {asset.assetType}</strong> - {asset.address}
                      <div style={{ fontSize: '12px', color: '#95a5a6', marginTop: '4px' }}>
                        Error: {asset.error}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <Link to={`/assets/${asset.id}/edit`} className="btn btn-secondary" style={{ fontSize: '12px', padding: '4px 8px' }}>
                        Edit
                      </Link>
                      <button
                        onClick={() => retryGeocoding('asset', asset.id)}
                        className="btn btn-primary"
                        style={{ fontSize: '12px', padding: '4px 8px' }}
                      >
                        Retry
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* Map Container */}
      {filteredLocations.length === 0 ? (
        <div className="card">
          <p style={{ color: '#7f8c8d', textAlign: 'center' }}>
            No locations to display. Add addresses to people or assets to see them on the map.
          </p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, height: '600px', overflow: 'hidden' }}>
          <MapContainer
            center={mapCenter}
            zoom={13}
            style={{ height: '100%', width: '100%' }}
            scrollWheelZoom={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <AutoFitBounds locations={filteredLocations} />

            {filteredLocations.map(location => (
              <Marker
                key={`${location.type}-${location.id}`}
                position={[location.latitude, location.longitude]}
                icon={location.type === 'person' ? personIcon : assetIcon}
                opacity={highlightedId === location.id ? 1 : 0.8}
              >
                <Popup>
                  <div style={{ minWidth: '200px' }}>
                    <h3 style={{ margin: '0 0 10px 0', fontSize: '16px', color: '#2c3e50' }}>
                      {location.name}
                    </h3>

                    <div style={{ fontSize: '13px', marginBottom: '8px' }}>
                      <strong>Address:</strong><br />
                      {location.address}
                    </div>

                    {location.type === 'person' && (
                      <>
                        {location.email && (
                          <div style={{ fontSize: '13px', marginBottom: '4px' }}>
                            <strong>Email:</strong> {location.email}
                          </div>
                        )}
                        {location.phone && (
                          <div style={{ fontSize: '13px', marginBottom: '4px' }}>
                            <strong>Phone:</strong> {location.phone}
                          </div>
                        )}
                        <Link
                          to={`/people/${location.id}`}
                          style={{ display: 'inline-block', marginTop: '8px', color: '#3498db', textDecoration: 'none', fontSize: '13px' }}
                        >
                          View Profile →
                        </Link>
                      </>
                    )}

                    {location.type === 'asset' && (
                      <>
                        <div style={{ fontSize: '13px', marginBottom: '4px' }}>
                          <strong>Type:</strong> {location.assetType}
                        </div>
                        <div style={{ fontSize: '13px', marginBottom: '4px' }}>
                          <strong>Owner:</strong> {location.ownerName}
                        </div>
                        {location.availability && (
                          <div style={{ fontSize: '13px', marginBottom: '4px' }}>
                            <strong>Availability:</strong> {location.availability}
                          </div>
                        )}
                        <Link
                          to={`/assets/${location.id}`}
                          style={{ display: 'inline-block', marginTop: '8px', color: '#e74c3c', textDecoration: 'none', fontSize: '13px' }}
                        >
                          View Asset →
                        </Link>
                      </>
                    )}
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      )}
    </Layout>
  );
};

export default Map;
