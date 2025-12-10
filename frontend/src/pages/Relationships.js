import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import api from '../services/api';

const Relationships = () => {
  const [relationships, setRelationships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [strengthFilter, setStrengthFilter] = useState('all');

  const fetchRelationships = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (strengthFilter !== 'all') params.strength = strengthFilter;

      const response = await api.get('/relationships', { params });
      setRelationships(response.data.data || response.data);
      setLoading(false);
    } catch (err) {
      setError('Failed to load relationships');
      setLoading(false);
    }
  }, [strengthFilter]);

  useEffect(() => {
    fetchRelationships();
  }, [fetchRelationships]);

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this relationship?')) {
      return;
    }

    try {
      await api.delete(`/relationships/${id}`);
      setRelationships(relationships.filter((r) => r.id !== id));
    } catch (err) {
      alert('Failed to delete relationship');
    }
  };

  const getStrengthColor = (strength) => {
    const colors = {
      1: '#95a5a6',
      2: '#3498db',
      3: '#f39c12',
      4: '#e67e22',
      5: '#e74c3c',
    };
    return colors[strength] || '#95a5a6';
  };

  if (loading) {
    return (
      <Layout>
        <div>Loading relationships...</div>
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
  const stats = {
    total: relationships.length,
    strong: relationships.filter((r) => r.strength >= 4).length,
    medium: relationships.filter((r) => r.strength === 3).length,
    weak: relationships.filter((r) => r.strength <= 2).length,
  };

  return (
    <Layout>
      <div className="page-header">
        <h1>Relationships</h1>
        <p>Manage connections between people in your network</p>
      </div>

      <div className="stats-grid" style={{ marginBottom: '20px' }}>
        <div className="stat-card">
          <div className="stat-value">{stats.total}</div>
          <div className="stat-label">Total</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: '#e74c3c' }}>
            {stats.strong}
          </div>
          <div className="stat-label">Strong (4-5)</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: '#f39c12' }}>
            {stats.medium}
          </div>
          <div className="stat-label">Medium (3)</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: '#95a5a6' }}>
            {stats.weak}
          </div>
          <div className="stat-label">Weak (1-2)</div>
        </div>
      </div>

      <div className="card">
        <div className="people-controls">
          <div className="filter-group">
            <label>Strength:</label>
            <select
              value={strengthFilter}
              onChange={(e) => setStrengthFilter(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Strengths</option>
              <option value="5">5 - Very Strong</option>
              <option value="4">4 - Strong</option>
              <option value="3">3 - Medium</option>
              <option value="2">2 - Weak</option>
              <option value="1">1 - Very Weak</option>
            </select>
          </div>

          <Link to="/relationships/new" className="btn btn-primary" style={{ marginLeft: 'auto' }}>
            Add Relationship
          </Link>
        </div>
      </div>

      {relationships.length === 0 ? (
        <div className="card">
          <p style={{ color: '#7f8c8d', textAlign: 'center' }}>
            No relationships found. Click "Add Relationship" to connect people in your network.
          </p>
        </div>
      ) : (
        <div className="relationships-list">
          {relationships.map((rel) => (
            <div key={rel.id} className="relationship-card">
              <div className="relationship-card-content">
                <div className="relationship-people">
                  <Link to={`/people/${rel.person1_id}`} className="relationship-person">
                    {rel.person1_name}
                  </Link>
                  <div className="relationship-arrow">
                    <span style={{ fontSize: '20px', color: '#95a5a6' }}>⟷</span>
                  </div>
                  <Link to={`/people/${rel.person2_id}`} className="relationship-person">
                    {rel.person2_name}
                  </Link>
                </div>

                <div className="relationship-meta">
                  <div className="relationship-type">{rel.relationship_type}</div>
                  <div
                    className="relationship-strength-badge"
                    style={{ background: getStrengthColor(rel.strength) }}
                  >
                    Strength: {rel.strength}/5
                  </div>
                </div>

                {rel.notes && (
                  <div className="relationship-notes">{rel.notes}</div>
                )}

                {rel.computed_score && (
                  <div className="relationship-computed-score">
                    <strong>Computed Score:</strong> {rel.computed_score.toFixed(1)}/100
                    {rel.score_breakdown && (
                      <span style={{ fontSize: '12px', color: '#7f8c8d', marginLeft: '10px' }}>
                        (Base: {rel.score_breakdown.base},
                        Interaction: {rel.score_breakdown.interaction},
                        Reciprocity: {rel.score_breakdown.reciprocity},
                        Recency: {rel.score_breakdown.recency})
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="relationship-card-actions">
                <Link to={`/relationships/${rel.id}/edit`} className="btn btn-secondary">
                  Edit
                </Link>
                <button onClick={() => handleDelete(rel.id)} className="btn btn-danger">
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

export default Relationships;
