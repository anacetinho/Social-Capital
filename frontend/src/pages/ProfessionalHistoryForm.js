import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import Layout from '../components/Layout';
import api from '../services/api';

const ProfessionalHistoryForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isEdit = Boolean(id);
  const preselectedPersonId = searchParams.get('person');

  const [formData, setFormData] = useState({
    person_id: preselectedPersonId || '',
    company: '',
    position: '',
    start_date: '',
    end_date: '',
    description: '',
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

  const fetchProfessionalHistory = useCallback(async () => {
    try {
      const response = await api.get(`/professional-history/${id}`);
      const job = response.data;
      setFormData({
        person_id: job.person_id,
        company: job.company || '',
        position: job.position || '',
        start_date: job.start_date ? job.start_date.split('T')[0] : '',
        end_date: job.end_date ? job.end_date.split('T')[0] : '',
        description: job.description || '',
      });
    } catch (err) {
      setError('Failed to load job history');
    }
  }, [id]);

  useEffect(() => {
    fetchPeople();
    if (isEdit) {
      fetchProfessionalHistory();
    }
  }, [fetchPeople, isEdit, fetchProfessionalHistory]);

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
      if (!formData.person_id) {
        setError('Please select a person');
        setLoading(false);
        return;
      }

      if (!formData.company.trim()) {
        setError('Company is required');
        setLoading(false);
        return;
      }

      if (!formData.position.trim()) {
        setError('Position is required');
        setLoading(false);
        return;
      }

      if (!formData.start_date) {
        setError('Start date is required');
        setLoading(false);
        return;
      }

      // Clean up end_date if empty
      const submitData = { ...formData };
      if (!submitData.end_date) {
        delete submitData.end_date;
      }

      if (isEdit) {
        await api.put(`/professional-history/${id}`, submitData);
      } else {
        await api.post('/professional-history', submitData);
      }

      // Navigate back to person detail page
      navigate(`/people/${formData.person_id}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save job history');
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="page-header">
        <h1>{isEdit ? 'Edit Job History' : 'Add Job History'}</h1>
        <p>{isEdit ? 'Update employment details' : 'Add a job or position to someone\'s professional history'}</p>
      </div>

      <div className="card" style={{ maxWidth: '800px' }}>
        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>
              Person <span style={{ color: '#e74c3c' }}>*</span>
            </label>
            <select
              name="person_id"
              value={formData.person_id}
              onChange={handleChange}
              required
              disabled={isEdit || preselectedPersonId}
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
              Company <span style={{ color: '#e74c3c' }}>*</span>
            </label>
            <input
              type="text"
              name="company"
              value={formData.company}
              onChange={handleChange}
              placeholder="e.g., Google, Acme Corp..."
              required
            />
          </div>

          <div className="form-group">
            <label>
              Position/Title <span style={{ color: '#e74c3c' }}>*</span>
            </label>
            <input
              type="text"
              name="position"
              value={formData.position}
              onChange={handleChange}
              placeholder="e.g., Software Engineer, CEO..."
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>
                Start Date <span style={{ color: '#e74c3c' }}>*</span>
              </label>
              <input
                type="date"
                name="start_date"
                value={formData.start_date}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label>End Date</label>
              <input
                type="date"
                name="end_date"
                value={formData.end_date}
                onChange={handleChange}
              />
              <small>Leave blank if currently employed</small>
            </div>
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="4"
              placeholder="Add details about responsibilities, achievements, etc..."
            />
          </div>

          <div className="form-actions">
            <button
              type="button"
              onClick={() => navigate(formData.person_id ? `/people/${formData.person_id}` : '/people')}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn btn-primary">
              {loading ? 'Saving...' : isEdit ? 'Update Job' : 'Add Job'}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
};

export default ProfessionalHistoryForm;
