import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import Layout from '../components/Layout';
import api from '../services/api';

const EventForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isEdit = Boolean(id);
  const preselectedPersonId = searchParams.get('person');

  const [formData, setFormData] = useState({
    title: '',
    event_type: 'meeting',
    date: new Date().toISOString().split('T')[0],
    description: '',
    participant_ids: preselectedPersonId ? [preselectedPersonId] : [],
  });

  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchPeople = useCallback(async () => {
    try {
      const response = await api.get('/people');
      setPeople(response.data.data || response.data);
    } catch (err) {
      setError('Failed to load people');
    }
  }, []);

  const fetchEvent = useCallback(async () => {
    try {
      const response = await api.get(`/events/${id}`);
      const event = response.data;
      setFormData({
        title: event.title || '',
        event_type: event.event_type || 'meeting',
        date: event.date ? event.date.split('T')[0] : '',
        description: event.description || '',
        participant_ids: event.participants?.map(p => p.id) || [],
      });
    } catch (err) {
      setError('Failed to load event data');
    }
  }, [id]);

  useEffect(() => {
    fetchPeople();
    if (isEdit) {
      fetchEvent();
    }
  }, [fetchPeople, isEdit, fetchEvent]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleParticipantToggle = (personId) => {
    setFormData((prev) => {
      const isSelected = prev.participant_ids.includes(personId);
      return {
        ...prev,
        participant_ids: isSelected
          ? prev.participant_ids.filter(id => id !== personId)
          : [...prev.participant_ids, personId]
      };
    });
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

      if (!formData.date) {
        setError('Date is required');
        setLoading(false);
        return;
      }

      if (formData.participant_ids.length === 0) {
        setError('Please select at least one participant');
        setLoading(false);
        return;
      }

      if (isEdit) {
        await api.put(`/events/${id}`, formData);
      } else {
        await api.post('/events', formData);
      }

      navigate('/events');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save event');
      setLoading(false);
    }
  };

  // Filter people based on search query
  const filteredPeople = people.filter(person =>
    person.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Layout>
      <div className="page-header">
        <h1>{isEdit ? 'Edit Event' : 'Add New Event'}</h1>
        <p>{isEdit ? 'Update event details' : 'Log an interaction or touchpoint'}</p>
      </div>

      <div className="card" style={{ maxWidth: '800px' }}>
        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>
              Title <span style={{ color: '#e74c3c' }}>*</span>
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="e.g., Coffee meeting, Conference call..."
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>
                Event Type <span style={{ color: '#e74c3c' }}>*</span>
              </label>
              <select
                name="event_type"
                value={formData.event_type}
                onChange={handleChange}
                required
              >
                <option value="meeting">Meeting</option>
                <option value="call">Call</option>
                <option value="email">Email</option>
                <option value="social">Social</option>
                <option value="professional">Professional</option>
                <option value="personal">Personal</option>
              </select>
            </div>

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

          <div className="form-group">
            <label>
              Participants <span style={{ color: '#e74c3c' }}>*</span>
            </label>

            {/* Search input */}
            <input
              type="text"
              placeholder="Search participants..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                marginBottom: '8px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            />

            <div style={{
              border: '1px solid #ddd',
              borderRadius: '6px',
              padding: '12px',
              maxHeight: '300px',
              overflowY: 'auto',
              background: '#fafbfc'
            }}>
              {people.length === 0 ? (
                <p style={{ color: '#7f8c8d', margin: 0 }}>No people available</p>
              ) : filteredPeople.length === 0 ? (
                <p style={{ color: '#7f8c8d', margin: 0 }}>No matching participants found</p>
              ) : (
                filteredPeople.map((person) => (
                  <label
                    key={person.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '8px',
                      marginBottom: '4px',
                      cursor: 'pointer',
                      borderRadius: '4px',
                      background: formData.participant_ids.includes(person.id) ? '#e3f2fd' : 'transparent',
                      transition: 'background 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      if (!formData.participant_ids.includes(person.id)) {
                        e.currentTarget.style.background = '#f5f5f5';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!formData.participant_ids.includes(person.id)) {
                        e.currentTarget.style.background = 'transparent';
                      }
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={formData.participant_ids.includes(person.id)}
                      onChange={() => handleParticipantToggle(person.id)}
                      style={{
                        marginRight: '10px',
                        width: '18px',
                        height: '18px',
                        cursor: 'pointer'
                      }}
                    />
                    <span style={{ fontSize: '14px' }}>{person.name}</span>
                  </label>
                ))
              )}
            </div>
            <small style={{ color: '#7f8c8d', marginTop: '8px', display: 'block' }}>
              {formData.participant_ids.length} {formData.participant_ids.length === 1 ? 'person' : 'people'} selected
            </small>
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="4"
              placeholder="Add notes about this event..."
            />
          </div>

          <div className="form-actions">
            <button
              type="button"
              onClick={() => navigate('/events')}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn btn-primary">
              {loading ? 'Saving...' : isEdit ? 'Update Event' : 'Add Event'}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
};

export default EventForm;
