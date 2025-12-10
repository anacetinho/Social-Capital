import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import api from '../services/api';

const Assets = () => {
  const [assets, setAssets] = useState([]);
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [ownerFilter, setOwnerFilter] = useState('all');

  const fetchPeople = useCallback(async () => {
    try {
      const response = await api.get('/people');
      setPeople(response.data.data || response.data);
    } catch (err) {
      console.error('Failed to load people:', err);
    }
  }, []);

  const fetchAssets = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (typeFilter !== 'all') params.asset_type = typeFilter;
      if (ownerFilter !== 'all') params.owner_id = ownerFilter;

      const response = await api.get('/assets', { params });
      setAssets(response.data.data || response.data);
      setLoading(false);
    } catch (err) {
      setError('Failed to load assets');
      setLoading(false);
    }
  }, [typeFilter, ownerFilter]);

  useEffect(() => {
    fetchPeople();
  }, [fetchPeople]);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this asset?')) {
      return;
    }

    try {
      await api.delete(`/assets/${id}`);
      setAssets(assets.filter((a) => a.id !== id));
    } catch (err) {
      alert('Failed to delete asset');
    }
  };

  const getTypeIcon = (type) => {
    const icons = {
      property: '🏠',
      vehicle: '🚗',
      equipment: '🔧',
      skill: '💡',
      other: '📦',
    };
    return icons[type] || '📦';
  };

  if (loading) {
    return (
      <Layout>
        <div>Loading assets...</div>
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

  return (
    <Layout>
      <div className="page-header">
        <h1>Assets</h1>
        <p>Track resources, property, and skills in your network</p>
      </div>

      <div className="card">
        <div className="people-controls">
          <div className="filter-group">
            <label>Type:</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Types</option>
              <option value="property">Property</option>
              <option value="vehicle">Vehicle</option>
              <option value="equipment">Equipment</option>
              <option value="skill">Skill</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="filter-group" style={{ marginLeft: '15px' }}>
            <label>Owner:</label>
            <select
              value={ownerFilter}
              onChange={(e) => setOwnerFilter(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Owners</option>
              {people.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name}
                </option>
              ))}
            </select>
          </div>

          <Link to="/assets/new" className="btn btn-primary" style={{ marginLeft: 'auto' }}>
            Add Asset
          </Link>
        </div>
      </div>

      {assets.length === 0 ? (
        <div className="card">
          <p style={{ color: '#7f8c8d', textAlign: 'center' }}>
            No assets found. Click "Add Asset" to start tracking.
          </p>
        </div>
      ) : (
        <div className="people-grid">
          {assets.map((asset) => (
            <div key={asset.id} className="card">
              <div style={{ display: 'flex', alignItems: 'start', gap: '15px', marginBottom: '15px' }}>
                <div style={{ fontSize: '32px' }}>
                  {getTypeIcon(asset.asset_type)}
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: '0 0 5px 0' }}>{asset.name}</h3>
                  <div style={{ fontSize: '13px', color: '#7f8c8d', marginBottom: '5px' }}>
                    <span style={{
                      background: '#ecf0f1',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      textTransform: 'capitalize'
                    }}>
                      {asset.asset_type}
                    </span>
                  </div>
                  {asset.owner_name && (
                    <div style={{ fontSize: '13px', color: '#555' }}>
                      <strong>Owner:</strong>{' '}
                      <Link to={`/people/${asset.owner_id}`}>{asset.owner_name}</Link>
                    </div>
                  )}
                </div>
              </div>

              {asset.description && (
                <p style={{
                  fontSize: '14px',
                  color: '#555',
                  marginBottom: '15px',
                  lineHeight: '1.5'
                }}>
                  {asset.description.length > 150
                    ? `${asset.description.substring(0, 150)}...`
                    : asset.description}
                </p>
              )}

              {asset.availability && (
                <div style={{
                  fontSize: '13px',
                  color: '#7f8c8d',
                  marginBottom: '15px',
                  padding: '8px',
                  background: '#f8f9fa',
                  borderRadius: '4px'
                }}>
                  <strong>Availability:</strong> {asset.availability}
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px' }}>
                <Link to={`/assets/${asset.id}/edit`} className="btn btn-secondary" style={{ flex: 1 }}>
                  Edit
                </Link>
                <button
                  onClick={() => handleDelete(asset.id)}
                  className="btn btn-danger"
                  style={{ flex: 1 }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Layout>
  );
};

export default Assets;
