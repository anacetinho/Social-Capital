import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import api from '../services/api';

const People = () => {
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchPeople = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (searchQuery) params.search = searchQuery;

      const response = await api.get('/people', { params });
      setPeople(response.data.data || response.data);
      setLoading(false);
    } catch (err) {
      setError('Failed to load people');
      setLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    fetchPeople();
  }, [fetchPeople]);

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this person?')) {
      return;
    }

    try {
      await api.delete(`/people/${id}`);
      setPeople(people.filter((p) => p.id !== id));
    } catch (err) {
      alert('Failed to delete person');
    }
  };

  if (loading) {
    return (
      <Layout>
        <div>Loading people...</div>
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
        <h1>People</h1>
        <p>Manage your network contacts</p>
      </div>

      <div className="card">
        <div className="people-controls">
          <div className="search-box">
            <input
              type="text"
              placeholder="Search by name, email, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>

          <Link to="/people/new" className="btn btn-primary" style={{ marginLeft: 'auto' }}>
            Add Person
          </Link>
        </div>
      </div>

      {people.length === 0 ? (
        <div className="card">
          <p style={{ color: '#7f8c8d', textAlign: 'center' }}>
            No people found. Click "Add Person" to get started.
          </p>
        </div>
      ) : (
        <div className="people-grid">
          {people.map((person) => (
            <div key={person.id} className="person-card">
              <div className="person-card-header">
                {person.photo_url ? (
                  <img
                    src={person.photo_url}
                    alt={person.name}
                    className="person-avatar"
                  />
                ) : (
                  <div className="person-avatar-placeholder">
                    {person.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="person-info">
                  <h3>{person.name}</h3>
                  {person.email && (
                    <p className="person-email">{person.email}</p>
                  )}
                  {person.phone && (
                    <p className="person-phone">{person.phone}</p>
                  )}
                </div>
              </div>

              <div className="person-card-body">
                <div className="person-meta">
                  {person.last_contact_date && (
                    <span className="last-contact">
                      Last contact:{' '}
                      {new Date(person.last_contact_date).toLocaleDateString()}
                    </span>
                  )}
                </div>

                {person.notes && (
                  <p className="person-notes">
                    {person.notes.length > 100
                      ? `${person.notes.substring(0, 100)}...`
                      : person.notes}
                  </p>
                )}
              </div>

              <div className="person-card-footer">
                <Link to={`/people/${person.id}`} className="btn btn-secondary">
                  View Details
                </Link>
                <Link to={`/people/${person.id}/edit`} className="btn btn-primary">
                  Edit
                </Link>
                <button
                  onClick={() => handleDelete(person.id)}
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

export default People;
