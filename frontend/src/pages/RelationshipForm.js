import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import api from '../services/api';

const RelationshipForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [formData, setFormData] = useState({
    person1_id: '',
    person2_id: '',
    relationship_type: '',
    strength: 3,
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

  const fetchRelationship = useCallback(async () => {
    try {
      const response = await api.get(`/relationships/${id}`);
      const rel = response.data;
      setFormData({
        person1_id: rel.person1_id,
        person2_id: rel.person2_id,
        relationship_type: rel.relationship_type || '',
        strength: rel.strength || 3,
        notes: rel.notes || '',
      });
    } catch (err) {
      setError('Failed to load relationship data');
    }
  }, [id]);

  useEffect(() => {
    fetchPeople();
    if (isEdit) {
      fetchRelationship();
    }
  }, [fetchPeople, isEdit, fetchRelationship]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'strength' ? parseInt(value) : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Validation
      if (!formData.person1_id || !formData.person2_id) {
        setError('Please select both people');
        setLoading(false);
        return;
      }

      if (formData.person1_id === formData.person2_id) {
        setError('Cannot create relationship with the same person');
        setLoading(false);
        return;
      }

      if (!formData.relationship_type.trim()) {
        setError('Relationship type is required');
        setLoading(false);
        return;
      }

      if (isEdit) {
        await api.put(`/relationships/${id}`, formData);
      } else {
        await api.post('/relationships', formData);
      }

      navigate('/relationships');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save relationship');
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="page-header">
        <h1>{isEdit ? 'Edit Relationship' : 'Add New Relationship'}</h1>
        <p>{isEdit ? 'Update relationship details' : 'Connect people in your network'}</p>
      </div>

      <div className="card" style={{ maxWidth: '800px' }}>
        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>
                First Person <span style={{ color: '#e74c3c' }}>*</span>
              </label>
              <select
                name="person1_id"
                value={formData.person1_id}
                onChange={handleChange}
                required
              >
                <option value="">Select person...</option>
                {people.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>
                Second Person <span style={{ color: '#e74c3c' }}>*</span>
              </label>
              <select
                name="person2_id"
                value={formData.person2_id}
                onChange={handleChange}
                required
              >
                <option value="">Select person...</option>
                {people.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>
                Relationship Type <span style={{ color: '#e74c3c' }}>*</span>
              </label>
              <select
                name="relationship_type"
                value={formData.relationship_type}
                onChange={handleChange}
                required
              >
                <option value="">Select type...</option>
                <option value="family">Family</option>
                <option value="extended_family">Extended Family</option>
                <option value="friend">Friend</option>
                <option value="colleague">Colleague</option>
                <option value="acquaintance">Acquaintance</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="form-group">
              <label>Strength (1-5)</label>
              <select
                name="strength"
                value={formData.strength}
                onChange={handleChange}
              >
                <option value="1">1 - Very Weak</option>
                <option value="2">2 - Weak</option>
                <option value="3">3 - Medium</option>
                <option value="4">4 - Strong</option>
                <option value="5">5 - Very Strong</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Notes</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows="4"
              placeholder="Add any additional notes about this relationship..."
            />
          </div>

          <div className="form-actions">
            <button
              type="button"
              onClick={() => navigate('/relationships')}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn btn-primary">
              {loading ? 'Saving...' : isEdit ? 'Update Relationship' : 'Add Relationship'}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
};

export default RelationshipForm;
