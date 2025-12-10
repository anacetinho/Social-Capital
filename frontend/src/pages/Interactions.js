import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import api from '../services/api';

const Interactions = () => {
  // Tab state
  const [activeTab, setActiveTab] = useState('events');

  // Events state
  const [events, setEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [eventsError, setEventsError] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  // Favors state
  const [favors, setFavors] = useState([]);
  const [people, setPeople] = useState([]);
  const [selectedPersonId, setSelectedPersonId] = useState('');
  const [favorsLoading, setFavorsLoading] = useState(true);
  const [favorsError, setFavorsError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [directionFilter, setDirectionFilter] = useState('all');

  // Events functions
  const fetchEvents = useCallback(async () => {
    try {
      setEventsLoading(true);
      const params = {};
      if (typeFilter !== 'all') params.event_type = typeFilter;

      const response = await api.get('/events', { params });
      setEvents(response.data.data || response.data);
      setEventsLoading(false);
    } catch (err) {
      setEventsError('Failed to load events');
      setEventsLoading(false);
    }
  }, [typeFilter]);

  useEffect(() => {
    if (activeTab === 'events') {
      fetchEvents();
    }
  }, [activeTab, fetchEvents]);

  const handleDeleteEvent = async (id) => {
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

  // Favors functions
  const fetchPeople = useCallback(async () => {
    try {
      const response = await api.get('/people');
      setPeople(response.data.data || response.data);
    } catch (err) {
      console.error('Failed to load people');
    }
  }, []);

  const fetchFavors = useCallback(async () => {
    try {
      setFavorsLoading(true);
      const params = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      if (directionFilter !== 'all') params.direction = directionFilter;
      if (selectedPersonId) params.person_id = selectedPersonId;

      const response = await api.get('/favors', { params });
      setFavors(response.data.data || response.data);
      setFavorsLoading(false);
    } catch (err) {
      setFavorsError('Failed to load favors');
      setFavorsLoading(false);
    }
  }, [statusFilter, directionFilter, selectedPersonId]);

  useEffect(() => {
    if (activeTab === 'favors') {
      fetchPeople();
      fetchFavors();
    }
  }, [activeTab, fetchPeople, fetchFavors]);

  const handleDeleteFavor = async (id) => {
    if (!window.confirm('Are you sure you want to delete this favor?')) {
      return;
    }

    try {
      await api.delete(`/favors/${id}`);
      setFavors(favors.filter((f) => f.id !== id));
    } catch (err) {
      alert('Failed to delete favor');
    }
  };

  const handleUpdateStatus = async (id, newStatus) => {
    try {
      await api.put(`/favors/${id}`, { status: newStatus });
      setFavors(
        favors.map((f) => (f.id === id ? { ...f, status: newStatus } : f))
      );
    } catch (err) {
      alert('Failed to update favor status');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: '#f39c12',
      completed: '#2ecc71',
      cancelled: '#95a5a6',
    };
    return colors[status] || '#95a5a6';
  };

  const getDirectionIcon = (direction) => {
    return direction === 'given' ? '→' : '←';
  };

  const getTypeColor = (type) => {
    const colors = {
      personal: '#9b59b6',
      professional: '#3498db',
      other: '#95a5a6',
    };
    return colors[type] || '#95a5a6';
  };

  const capitalizeFirst = (str) => {
    return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
  };

  // Calculate favor statistics
  const stats = selectedPersonId
    ? {
        given: favors.filter((f) => f.giver_id === selectedPersonId).length,
        received: favors.filter((f) => f.receiver_id === selectedPersonId).length,
        pending: favors.filter((f) => f.status === 'pending').length,
        completed: favors.filter((f) => f.status === 'completed').length,
      }
    : {
        given: favors.filter((f) => f.direction === 'given').length,
        received: favors.filter((f) => f.direction === 'received').length,
        pending: favors.filter((f) => f.status === 'pending').length,
        completed: favors.filter((f) => f.status === 'completed').length,
      };

  const selectedPerson = people.find(p => p.id === selectedPersonId) || null;

  const loading = activeTab === 'events' ? eventsLoading : favorsLoading;
  const error = activeTab === 'events' ? eventsError : favorsError;

  if (loading) {
    return (
      <Layout>
        <div>Loading {activeTab}...</div>
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
        <h1 style={{ margin: '0 0 15px 0' }}>Interactions</h1>

        {/* Tab Navigation */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '2px solid #ecf0f1' }}>
          <button
            onClick={() => setActiveTab('events')}
            style={{
              padding: '10px 20px',
              background: activeTab === 'events' ? '#3498db' : 'transparent',
              color: activeTab === 'events' ? 'white' : '#7f8c8d',
              border: 'none',
              borderBottom: activeTab === 'events' ? '3px solid #2980b9' : '3px solid transparent',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              transition: 'all 0.2s'
            }}
          >
            Events
          </button>
          <button
            onClick={() => setActiveTab('favors')}
            style={{
              padding: '10px 20px',
              background: activeTab === 'favors' ? '#3498db' : 'transparent',
              color: activeTab === 'favors' ? 'white' : '#7f8c8d',
              border: 'none',
              borderBottom: activeTab === 'favors' ? '3px solid #2980b9' : '3px solid transparent',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              transition: 'all 0.2s'
            }}
          >
            Favors
          </button>
        </div>
      </div>

      {/* Events Tab */}
      {activeTab === 'events' && (
        <>
          <p style={{ marginBottom: '20px' }}>Track interactions and touchpoints with your network</p>

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
                    <button onClick={() => handleDeleteEvent(event.id)} className="btn btn-danger">
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Favors Tab */}
      {activeTab === 'favors' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <p style={{ margin: '0' }}>
              {selectedPersonId && selectedPerson
                ? `Favors involving ${selectedPerson.name}`
                : 'Track favors given and received in your network'}
            </p>
            <div style={{ minWidth: '300px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: '#7f8c8d', marginBottom: '5px', fontWeight: '600' }}>
                Key Person:
              </label>
              <select
                value={selectedPersonId}
                onChange={(e) => setSelectedPersonId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '2px solid #3498db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  background: 'white',
                  cursor: 'pointer'
                }}
              >
                <option value="">All People</option>
                {people.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="stats-grid" style={{ marginBottom: '20px' }}>
            <div className="stat-card">
              <div className="stat-value">{stats.given}</div>
              <div className="stat-label">Given</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.received}</div>
              <div className="stat-label">Received</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.pending}</div>
              <div className="stat-label">Pending</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.completed}</div>
              <div className="stat-label">Completed</div>
            </div>
          </div>

          <div className="card">
            <div className="people-controls">
              <div className="filter-group">
                <label>Direction:</label>
                <select
                  value={directionFilter}
                  onChange={(e) => setDirectionFilter(e.target.value)}
                  className="filter-select"
                >
                  <option value="all">All</option>
                  <option value="given">Given</option>
                  <option value="received">Received</option>
                </select>
              </div>

              <div className="filter-group">
                <label>Status:</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="filter-select"
                >
                  <option value="all">All</option>
                  <option value="pending">Pending</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <Link to="/favors/new" className="btn btn-primary" style={{ marginLeft: 'auto' }}>
                Add Favor
              </Link>
            </div>
          </div>

          {favors.length === 0 ? (
            <div className="card">
              <p style={{ color: '#7f8c8d', textAlign: 'center' }}>
                No favors found. Click "Add Favor" to start tracking.
              </p>
            </div>
          ) : (
            <div className="favors-grid">
              {favors.map((favor) => (
                <div key={favor.id} className="favor-card">
                  <div className="favor-header">
                    <div className="favor-direction" style={{
                      color: favor.direction === 'given' ? '#3498db' : '#2ecc71'
                    }}>
                      <span style={{ fontSize: '24px' }}>
                        {getDirectionIcon(favor.direction)}
                      </span>
                      <span style={{ fontSize: '12px', textTransform: 'uppercase' }}>
                        {favor.direction}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {favor.favor_type && (
                        <span
                          className="favor-status-badge"
                          style={{ background: getTypeColor(favor.favor_type) }}
                        >
                          {capitalizeFirst(favor.favor_type)}
                        </span>
                      )}
                      <span
                        className="favor-status-badge"
                        style={{ background: getStatusColor(favor.status) }}
                      >
                        {favor.status}
                      </span>
                    </div>
                  </div>

                  <div className="favor-body">
                    <h3>{favor.title}</h3>
                    {favor.description && (
                      <p className="favor-description">{favor.description}</p>
                    )}

                    <div className="favor-person">
                      <strong>
                        {favor.direction === 'given' ? 'For: ' : 'From: '}
                      </strong>
                      <Link to={`/people/${favor.person_id}`}>
                        {favor.person_name}
                      </Link>
                    </div>

                    <div className="favor-date">
                      {new Date(favor.date).toLocaleDateString()}
                    </div>
                  </div>

                  <div className="favor-footer">
                    {favor.status === 'pending' && (
                      <button
                        onClick={() => handleUpdateStatus(favor.id, 'completed')}
                        className="btn btn-success"
                      >
                        Mark Complete
                      </button>
                    )}
                    <Link to={`/favors/${favor.id}`} className="btn btn-secondary">
                      View
                    </Link>
                    <Link to={`/favors/${favor.id}/edit`} className="btn btn-secondary">
                      Edit
                    </Link>
                    <button
                      onClick={() => handleDeleteFavor(favor.id)}
                      className="btn btn-danger"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </Layout>
  );
};

export default Interactions;
