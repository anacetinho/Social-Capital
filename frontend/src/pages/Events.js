import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import api from '../services/api';

const Events = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (typeFilter !== 'all') params.event_type = typeFilter;

      const response = await api.get('/events', { params });
      setEvents(response.data.data || response.data);
      setLoading(false);
    } catch (err) {
      setError('Failed to load events');
      setLoading(false);
    }
  }, [typeFilter]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this event?')) {
      return;
    }

    try {
      await api.delete(`/events/${id}`);
      setEvents(events.filter((e) => e.id !== id));
    } catch (err) {
      alert('Failed to delete event');
    }
  };

  const getEventTypeColor = (type) => {
    const colors = {
      meeting: '#3498db',
      call: '#2ecc71',
      email: '#9b59b6',
      social: '#f39c12',
      professional: '#e74c3c',
      personal: '#1abc9c',
    };
    return colors[type] || '#95a5a6';
  };

  if (loading) {
    return (
      <Layout>
        <div>Loading events...</div>
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
        <h1>Events</h1>
        <p>Track interactions and touchpoints with your network</p>
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
              <option value="meeting">Meeting</option>
              <option value="call">Call</option>
              <option value="email">Email</option>
              <option value="social">Social</option>
              <option value="professional">Professional</option>
              <option value="personal">Personal</option>
            </select>
          </div>

          <Link to="/events/new" className="btn btn-primary" style={{ marginLeft: 'auto' }}>
            Add Event
          </Link>
        </div>
      </div>

      {events.length === 0 ? (
        <div className="card">
          <p style={{ color: '#7f8c8d', textAlign: 'center' }}>
            No events found. Click "Add Event" to log your first interaction.
          </p>
        </div>
      ) : (
        <div className="events-timeline">
          {events.map((event) => (
            <div key={event.id} className="event-card">
              <div className="event-header">
                <div className="event-date">
                  <div className="event-day">
                    {new Date(event.date).getDate()}
                  </div>
                  <div className="event-month">
                    {new Date(event.date).toLocaleDateString('en', { month: 'short' })}
                  </div>
                  <div className="event-year">
                    {new Date(event.date).getFullYear()}
                  </div>
                </div>

                <div className="event-content">
                  <div className="event-title-row">
                    <h3>{event.title}</h3>
                    <span
                      className="event-type-badge"
                      style={{ background: getEventTypeColor(event.event_type) }}
                    >
                      {event.event_type}
                    </span>
                  </div>

                  {event.description && (
                    <p className="event-description">{event.description}</p>
                  )}

                  {event.participants && event.participants.length > 0 && (
                    <div className="event-participants">
                      <strong>Participants:</strong>{' '}
                      {event.participants.map((p, idx) => (
                        <span key={idx}>
                          <Link to={`/people/${p.person_id}`}>{p.person_name}</Link>
                          {idx < event.participants.length - 1 ? ', ' : ''}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="event-actions">
                <Link to={`/events/${event.id}`} className="btn btn-secondary">
                  View
                </Link>
                <Link to={`/events/${event.id}/edit`} className="btn btn-secondary">
                  Edit
                </Link>
                <button onClick={() => handleDelete(event.id)} className="btn btn-danger">
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

export default Events;
