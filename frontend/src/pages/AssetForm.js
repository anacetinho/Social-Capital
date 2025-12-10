import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import api from '../services/api';

const AssetForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [formData, setFormData] = useState({
    owner_id: '',
    asset_type: 'other',
    name: '',
    description: '',
    availability: 'by_request',
    estimated_value: '',
    address: '',
    notes: '',
  });

  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchPeople = useCallback(async () => {
    try {
      const response = await api.get('/people');
      setPeople(response.data.data || response.data);
    } catch (err) {
      setError('Failed to load people');
    }
  }, []);

  const fetchAsset = useCallback(async () => {
    try {
      const response = await api.get(`/assets/${id}`);
      const asset = response.data;
      setFormData({
        owner_id: asset.owner_id || '',
        asset_type: asset.asset_type || 'other',
        name: asset.name || '',
        description: asset.description || '',
        availability: asset.availability || 'by_request',
        estimated_value: asset.estimated_value || '',
        address: asset.address || '',
        notes: asset.notes || '',
      });
    } catch (err) {
      setError('Failed to load asset');
    }
  }, [id]);

  useEffect(() => {
    fetchPeople();
    if (isEdit) {
      fetchAsset();
    }
  }, [fetchPeople, isEdit, fetchAsset]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Validation
      if (!formData.owner_id) {
        setError('Please select an owner');
        setLoading(false);
        return;
      }

      if (!formData.name.trim()) {
        setError('Asset name is required');
        setLoading(false);
        return;
      }

      if (!formData.asset_type.trim()) {
        setError('Asset type is required');
        setLoading(false);
        return;
      }

      let assetId = id;
      if (isEdit) {
        await api.put(`/assets/${id}`, formData);
      } else {
        const response = await api.post('/assets', formData);
        assetId = response.data.id;
      }

      // Trigger geocoding if address is provided (non-blocking)
      if (formData.address && formData.address.trim()) {
        api.post(`/map/geocode/asset/${assetId}`)
          .catch(err => {
            console.warn('Geocoding failed:', err.response?.data?.error || err.message);
          });
      }

      navigate('/assets');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save asset');
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="page-header">
        <h1>{isEdit ? 'Edit Asset' : 'Add New Asset'}</h1>
        <p>{isEdit ? 'Update asset details' : 'Add a resource, property, or skill to track'}</p>
      </div>

      <div className="card" style={{ maxWidth: '800px' }}>
        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>
                Owner <span style={{ color: '#e74c3c' }}>*</span>
              </label>
              <select
                name="owner_id"
                value={formData.owner_id}
                onChange={handleChange}
                required
              >
                <option value="">Select owner...</option>
                {people.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>
                Type <span style={{ color: '#e74c3c' }}>*</span>
              </label>
              <select
                name="asset_type"
                value={formData.asset_type}
                onChange={handleChange}
                required
              >
                <option value="property">Property</option>
                <option value="vehicle">Vehicle</option>
                <option value="equipment">Equipment</option>
                <option value="skill">Skill/Expertise</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>
              Name <span style={{ color: '#e74c3c' }}>*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g., Summer House, Pickup Truck, Photography Skills..."
              required
            />
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="4"
              placeholder="Detailed description of the asset..."
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Availability</label>
              <select
                name="availability"
                value={formData.availability}
                onChange={handleChange}
              >
                <option value="always">Always</option>
                <option value="by_request">By Request</option>
                <option value="never">Never</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="form-group">
              <label>Estimated Value</label>
              <input
                type="number"
                name="estimated_value"
                value={formData.estimated_value}
                onChange={handleChange}
                placeholder="0.00"
                step="0.01"
                min="0"
              />
            </div>
          </div>

          {formData.asset_type === 'property' && (
            <div className="form-group">
              <label>Address</label>
              <textarea
                name="address"
                value={formData.address}
                onChange={handleChange}
                rows="3"
                placeholder="Property address..."
              />
            </div>
          )}

          <div className="form-group">
            <label>Notes</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows="3"
              placeholder="Additional notes..."
            />
          </div>

          <div className="form-actions">
            <button
              type="button"
              onClick={() => navigate('/assets')}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn btn-primary">
              {loading ? 'Saving...' : isEdit ? 'Update Asset' : 'Add Asset'}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
};

export default AssetForm;
