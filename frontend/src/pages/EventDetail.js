import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Layout from '../components/Layout';
import api from '../services/api';

const EventDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchEvent = useCallback(async () => {
    try {
      const response = await api.get(`/events/${id}`);
      setEvent(response.data);
      setLoading(false);
    } catch (err) {
      setError('Failed to load event details');
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchEvent();
  }, [fetchEvent]);

  if (loading) {
    return (
      <Layout>
        <div>Loading event details...</div>
      </Layout>
    );
  }

  if (error || !event) {
    return (
      <Layout>
        <div className="error-message">{error || 'Event not found'}</div>
        <button onClick={() => navigate('/events')} className="btn btn-secondary">
          Back to Events
        </button>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="page-header">
        <h1>Event Details</h1>
        <p>View event information</p>
      </div>

      <div className="card" style={{ maxWidth: '800px' }}>
        <div style={{ marginBottom: '30px' }}>
          <h2 style={{ margin: '0 0 20px 0', color: '#2c3e50' }}>{event.title}</h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#7f8c8d', marginBottom: '4px', fontWeight: '600' }}>
                Event Type
              </label>
              <div style={{ fontSize: '15px', color: '#2c3e50', textTransform: 'capitalize' }}>
                {event.event_type || 'N/A'}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#7f8c8d', marginBottom: '4px', fontWeight: '600' }}>
                Date
              </label>
              <div style={{ fontSize: '15px', color: '#2c3e50' }}>
                {event.date ? new Date(event.date).toLocaleDateString() : 'N/A'}
              </div>
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '12px', color: '#7f8c8d', marginBottom: '8px', fontWeight: '600' }}>
              Participants
            </label>
            {event.participants && event.participants.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {event.participants.map((participant) => (
                  <Link
                    key={participant.id}
                    to={`/people/${participant.id}`}
                    style={{
                      display: 'inline-block',
                      padding: '6px 12px',
                      background: '#e3f2fd',
                      color: '#1976d2',
                      borderRadius: '20px',
                      fontSize: '14px',
                      textDecoration: 'none',
                      border: '1px solid #bbdefb',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#bbdefb';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#e3f2fd';
                    }}
                  >
                    {participant.name}
                  </Link>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: '15px', color: '#7f8c8d' }}>No participants</div>
            )}
          </div>

          {event.description && (
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#7f8c8d', marginBottom: '8px', fontWeight: '600' }}>
                Description
              </label>
              <div style={{
                padding: '15px',
                background: '#f8f9fa',
                borderRadius: '6px',
                fontSize: '14px',
                color: '#2c3e50',
                lineHeight: '1.6',
                whiteSpace: 'pre-wrap'
              }}>
                {event.description}
              </div>
            </div>
          )}

          <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #ecf0f1' }}>
            <div style={{ fontSize: '12px', color: '#95a5a6' }}>
              Created: {event.created_at ? new Date(event.created_at).toLocaleString() : 'Unknown'}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button
            onClick={() => navigate('/events')}
            className="btn btn-secondary"
          >
            Back to Events
          </button>
          <Link
            to={`/events/${id}/edit`}
            className="btn btn-primary"
            style={{ textDecoration: 'none' }}
          >
            Edit Event
          </Link>
        </div>
      </div>
    </Layout>
  );
};

export default EventDetail;
