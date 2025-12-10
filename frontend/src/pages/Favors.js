import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import api from '../services/api';

const Favors = () => {
  const [favors, setFavors] = useState([]);
  const [people, setPeople] = useState([]);
  const [selectedPersonId, setSelectedPersonId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [directionFilter, setDirectionFilter] = useState('all');

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
      setLoading(true);
      const params = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      if (directionFilter !== 'all') params.direction = directionFilter;
      if (selectedPersonId) params.person_id = selectedPersonId;

      const response = await api.get('/favors', { params });
      setFavors(response.data.data || response.data);
      setLoading(false);
    } catch (err) {
      setError('Failed to load favors');
      setLoading(false);
    }
  }, [statusFilter, directionFilter, selectedPersonId]);

  useEffect(() => {
    fetchPeople();
  }, [fetchPeople]);

  useEffect(() => {
    fetchFavors();
  }, [fetchFavors]);

  const handleDelete = async (id) => {
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

  if (loading) {
    return (
      <Layout>
        <div>Loading favors...</div>
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

  // Calculate statistics
  const stats = selectedPersonId
    ? {
        // When a person is selected, count based on giver/receiver
        given: favors.filter((f) => f.giver_id === selectedPersonId).length,
        received: favors.filter((f) => f.receiver_id === selectedPersonId).length,
        pending: favors.filter((f) => f.status === 'pending').length,
        completed: favors.filter((f) => f.status === 'completed').length,
      }
    : {
        // When no person is selected, use direction field if it exists, otherwise count all
        given: favors.filter((f) => f.direction === 'given').length,
        received: favors.filter((f) => f.direction === 'received').length,
        pending: favors.filter((f) => f.status === 'pending').length,
        completed: favors.filter((f) => f.status === 'completed').length,
      };

  // Get the selected person object
  const selectedPerson = people.find(p => p.id === selectedPersonId) || null;

  return (
    <Layout>
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <div>
            <h1 style={{ margin: 0 }}>Favors</h1>
            <p style={{ margin: '5px 0 0 0' }}>
              {selectedPersonId && selectedPerson
                ? `Favors involving ${selectedPerson.name}`
                : 'Track favors given and received in your network'}
            </p>
          </div>
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
                  onClick={() => handleDelete(favor.id)}
                  className="btn btn-danger"
                >
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

export default Favors;
