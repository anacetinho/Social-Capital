import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import api from '../services/api';

const PersonForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [formData, setFormData] = useState({
    name: '',
    gender: '',
    email: '',
    phone: '',
    birthday: '',
    address: '',
    notes: '',
    linkedin_url: '',
  });

  const [profilePicture, setProfilePicture] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchPerson = useCallback(async () => {
    try {
      const response = await api.get(`/people/${id}`);
      const person = response.data;
      setFormData({
        name: person.name || '',
        gender: person.gender || '',
        email: person.email || '',
        phone: person.phone || '',
        birthday: person.birthday ? person.birthday.split('T')[0] : '',
        address: person.address || '',
        notes: person.notes || '',
        linkedin_url: person.linkedin_url || '',
      });
    } catch (err) {
      setError('Failed to load person data');
    }
  }, [id]);

  useEffect(() => {
    if (isEdit) {
      fetchPerson();
    }
  }, [isEdit, fetchPerson]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleFileChange = (e) => {
    setProfilePicture(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Basic validation
      if (!formData.name.trim()) {
        setError('Name is required');
        setLoading(false);
        return;
      }

      if (!formData.gender) {
        setError('Gender is required');
        setLoading(false);
        return;
      }

      // Create or update person
      let personId = id;
      if (isEdit) {
        await api.put(`/people/${id}`, formData);
      } else {
        const response = await api.post('/people', formData);
        personId = response.data.id;
      }

      // Trigger geocoding if address is provided (non-blocking)
      if (formData.address && formData.address.trim()) {
        api.post(`/map/geocode/person/${personId}`)
          .catch(err => {
            console.warn('Geocoding failed:', err.response?.data?.error || err.message);
          });
      }

      // Upload profile picture if provided
      if (profilePicture) {
        const formDataFile = new FormData();
        formDataFile.append('picture', profilePicture);
        await api.post(`/people/${personId}/picture`, formDataFile, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
      }

      navigate(`/people/${personId}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save person');
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="page-header">
        <h1>{isEdit ? 'Edit Person' : 'Add New Person'}</h1>
        <p>{isEdit ? 'Update contact information' : 'Add a new contact to your network'}</p>
      </div>

      <div className="card" style={{ maxWidth: '800px' }}>
        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>
                Name <span style={{ color: '#e74c3c' }}>*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label>
                Gender <span style={{ color: '#e74c3c' }}>*</span>
              </label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                required
              >
                <option value="">Select gender...</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>Phone</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Birthday</label>
              <input
                type="date"
                name="birthday"
                value={formData.birthday}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Address</label>
            <input
              type="text"
              name="address"
              value={formData.address}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label>LinkedIn URL</label>
            <input
              type="url"
              name="linkedin_url"
              value={formData.linkedin_url}
              onChange={handleChange}
              placeholder="https://linkedin.com/in/username"
            />
          </div>

          <div className="form-group">
            <label>Profile Picture</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
            />
            <small>Upload a profile picture (JPG, PNG, etc.)</small>
          </div>

          <div className="form-group">
            <label>Notes</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows="6"
              placeholder="Add any additional notes about this person..."
            />
          </div>

          <div className="form-actions">
            <button
              type="button"
              onClick={() => navigate(id ? `/people/${id}` : '/people')}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn btn-primary">
              {loading ? 'Saving...' : isEdit ? 'Update Person' : 'Add Person'}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
};

export default PersonForm;
