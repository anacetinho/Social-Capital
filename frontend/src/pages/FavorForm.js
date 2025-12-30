import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import api from '../services/api';

const FavorForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [formData, setFormData] = useState({
    giver_id: '',
    receiver_id: '',
    description: '',
    status: 'pending',
    date: new Date().toISOString().split('T')[0],
    notes: '',
    estimated_value: '',
    time_commitment: '',
    favor_type: 'other',
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

  const fetchFavor = useCallback(async () => {
    try {
      const response = await api.get(`/favors/${id}`);
      const favor = response.data;
      setFormData({
        giver_id: favor.giver_id || '',
        receiver_id: favor.receiver_id || '',
        description: favor.description || '',
        status: favor.status || 'pending',
        date: favor.date ? favor.date.split('T')[0] : '',
        notes: favor.notes || '',
        estimated_value: favor.estimated_value || '',
        time_commitment: favor.time_commitment || '',
        favor_type: favor.favor_type || 'other',
      });
    } catch (err) {
      setError('Failed to load favor data');
    }
  }, [id]);

  useEffect(() => {
    fetchPeople();
    if (isEdit) {
      fetchFavor();
    }
  }, [fetchPeople, isEdit, fetchFavor]);

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
      if (!formData.giver_id) {
        setError('Please select giver');
        setLoading(false);
        return;
      }

      if (!formData.receiver_id) {
        setError('Please select receiver');
        setLoading(false);
        return;
      }

      if (formData.giver_id === formData.receiver_id) {
        setError('Giver and receiver must be different people');
        setLoading(false);
        return;
      }

      if (!formData.description.trim()) {
        setError('Description is required');
        setLoading(false);
        return;
      }

      if (!formData.date) {
        setError('Date is required');
        setLoading(false);
        return;
      }

      if (isEdit) {
        await api.put(`/favors/${id}`, formData);
      } else {
        await api.post('/favors', formData);
      }

      navigate('/favors');
    } catch (err) {
      console.error('Failed to save favor:', err);
      console.error('Error response:', err.response?.data);
      setError(err.response?.data?.error || 'Failed to save favor');
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="page-header">
        <h1>{isEdit ? 'Edit Favor' : 'Add New Favor'}</h1>
        <p>{isEdit ? 'Update favor details' : 'Track a favor given or received'}</p>
      </div>

      <div className="card" style={{ maxWidth: '800px' }}>
        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>
                Giver (Who gave the favor) <span style={{ color: '#e74c3c' }}>*</span>
              </label>
              <select
                name="giver_id"
                value={formData.giver_id}
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
                Receiver (Who received the favor) <span style={{ color: '#e74c3c' }}>*</span>
              </label>
              <select
                name="receiver_id"
                value={formData.receiver_id}
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

          <div className="form-group">
            <label>
              Description <span style={{ color: '#e74c3c' }}>*</span>
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="3"
              placeholder="e.g., Helped with job referral, Borrowed equipment, Provided introduction..."
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>
                Type <span style={{ color: '#e74c3c' }}>*</span>
              </label>
              <select
                name="favor_type"
                value={formData.favor_type}
                onChange={handleChange}
                required
              >
                <option value="personal">Personal</option>
                <option value="professional">Professional</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="form-group">
              <label>
                Status <span style={{ color: '#e74c3c' }}>*</span>
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                required
              >
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
                <option value="declined">Declined</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>
                Date <span style={{ color: '#e74c3c' }}>*</span>
              </label>
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Estimated Value</label>
              <input
                type="number"
                name="estimated_value"
                value={formData.estimated_value}
                onChange={handleChange}
                step="0.01"
                min="0"
                placeholder="e.g., 50.00"
              />
            </div>

            <div className="form-group">
              <label>Time Commitment</label>
              <input
                type="text"
                name="time_commitment"
                value={formData.time_commitment}
                onChange={handleChange}
                placeholder="e.g., 2 hours, 1 day, 30 minutes"
              />
            </div>
          </div>

          <div className="form-group">
            <label>Additional Notes</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows="3"
              placeholder="Any additional details..."
            />
          </div>

          <div className="form-actions">
            <button
              type="button"
              onClick={() => navigate('/favors')}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn btn-primary">
              {loading ? 'Saving...' : isEdit ? 'Update Favor' : 'Add Favor'}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
};

export default FavorForm;
