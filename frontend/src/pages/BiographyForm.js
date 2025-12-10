import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import Layout from '../components/Layout';
import api from '../services/api';

const BiographyForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const personId = searchParams.get('person');
  const isEdit = Boolean(id);

  const [formData, setFormData] = useState({
    person_id: personId || '',
    title: '',
    note: '',
    note_date: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchBiography = useCallback(async () => {
    try {
      const response = await api.get(`/biographies/${id}`);
      const bio = response.data;
      setFormData({
        person_id: bio.person_id,
        title: bio.title || '',
        note: bio.note || '',
        note_date: bio.note_date ? bio.note_date.split('T')[0] : ''
      });
    } catch (err) {
      setError('Failed to load biography');
    }
  }, [id]);

  useEffect(() => {
    if (isEdit) {
      fetchBiography();
    }
  }, [isEdit, fetchBiography]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Validation
      if (!formData.title.trim()) {
        setError('Title is required');
        setLoading(false);
        return;
      }

      if (!formData.note.trim()) {
        setError('Note is required');
        setLoading(false);
        return;
      }

      if (isEdit) {
        await api.put(`/biographies/${id}`, formData);
      } else {
        await api.post('/biographies', formData);
      }

      // Navigate back to person detail page
      navigate(`/people/${formData.person_id}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save biography note');
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate(`/people/${formData.person_id}`);
  };

  return (
    <Layout>
      <div className="page-header">
        <h1>{isEdit ? 'Edit Biography Note' : 'Add Biography Note'}</h1>
      </div>

      <div className="card">
        <form onSubmit={handleSubmit}>
          {error && <div className="alert alert-danger">{error}</div>}

          <div className="form-group">
            <label htmlFor="title">Title *</label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              className="form-control"
              placeholder="e.g., Early Life, Career Highlights, Personal Interests"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="note_date">Date</label>
            <input
              type="date"
              id="note_date"
              name="note_date"
              value={formData.note_date}
              onChange={handleChange}
              className="form-control"
            />
            <small className="form-text">
              Optional: Date this note refers to or was created
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="note">Note *</label>
            <textarea
              id="note"
              name="note"
              value={formData.note}
              onChange={handleChange}
              className="form-control"
              rows="8"
              placeholder="Write your biography note here..."
              required
            />
          </div>

          <div className="form-actions">
            <button
              type="button"
              onClick={handleCancel}
              className="btn btn-secondary"
              disabled={loading}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving...' : isEdit ? 'Update Note' : 'Save Note'}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
};

export default BiographyForm;
