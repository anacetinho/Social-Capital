import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Layout from '../components/Layout';
import api from '../services/api';

const RelationshipDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [relationship, setRelationship] = useState(null);
  const [person1, setPerson1] = useState(null);
  const [person2, setPerson2] = useState(null);
  const [score, setScore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchRelationship = useCallback(async () => {
    try {
      const response = await api.get(`/relationships/${id}`);
      const relationshipData = response.data;
      setRelationship(relationshipData);

      // Fetch person1 and person2 details
      if (relationshipData.person1_id) {
        const person1Res = await api.get(`/people/${relationshipData.person1_id}`);
        setPerson1(person1Res.data);
      }
      if (relationshipData.person2_id) {
        const person2Res = await api.get(`/people/${relationshipData.person2_id}`);
        setPerson2(person2Res.data);
      }

      // Fetch relationship score
      if (relationshipData.person1_id && relationshipData.person2_id) {
        try {
          const scoreRes = await api.get(`/relationships/score?person1_id=${relationshipData.person1_id}&person2_id=${relationshipData.person2_id}`);
          setScore(scoreRes.data);
        } catch (err) {
          console.warn('Failed to load relationship score:', err);
        }
      }

      setLoading(false);
    } catch (err) {
      setError('Failed to load relationship details');
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchRelationship();
  }, [fetchRelationship]);

  const getStrengthLabel = (strength) => {
    const labels = {
      1: 'Very Weak',
      2: 'Weak',
      3: 'Moderate',
      4: 'Strong',
      5: 'Very Strong'
    };
    return labels[strength] || 'Unknown';
  };

  const getStrengthColor = (strength) => {
    const colors = {
      1: '#e74c3c',
      2: '#e67e22',
      3: '#f39c12',
      4: '#2ecc71',
      5: '#27ae60'
    };
    return colors[strength] || '#95a5a6';
  };

  if (loading) {
    return (
      <Layout>
        <div>Loading relationship details...</div>
      </Layout>
    );
  }

  if (error || !relationship) {
    return (
      <Layout>
        <div className="error-message">{error || 'Relationship not found'}</div>
        <button onClick={() => navigate('/relationships')} className="btn btn-secondary">
          Back to Relationships
        </button>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="page-header">
        <h1>Relationship Details</h1>
        <p>View relationship information</p>
      </div>

      <div className="card" style={{ maxWidth: '800px' }}>
        <div style={{ marginBottom: '30px' }}>
          <div style={{ marginBottom: '25px' }}>
            <label style={{ display: 'block', fontSize: '12px', color: '#7f8c8d', marginBottom: '8px', fontWeight: '600' }}>
              People
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              {person1 ? (
                <Link
                  to={`/people/${person1.id}`}
                  style={{
                    fontSize: '18px',
                    color: '#3498db',
                    textDecoration: 'none',
                    fontWeight: '600'
                  }}
                >
                  {person1.name}
                </Link>
              ) : (
                <span style={{ fontSize: '18px', color: '#7f8c8d' }}>Unknown</span>
              )}
              <span style={{ fontSize: '18px', color: '#95a5a6' }}>↔</span>
              {person2 ? (
                <Link
                  to={`/people/${person2.id}`}
                  style={{
                    fontSize: '18px',
                    color: '#3498db',
                    textDecoration: 'none',
                    fontWeight: '600'
                  }}
                >
                  {person2.name}
                </Link>
              ) : (
                <span style={{ fontSize: '18px', color: '#7f8c8d' }}>Unknown</span>
              )}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#7f8c8d', marginBottom: '4px', fontWeight: '600' }}>
                Relationship Type
              </label>
              <div style={{ fontSize: '15px', color: '#2c3e50', textTransform: 'capitalize' }}>
                {relationship.relationship_type?.replace('_', ' ') || 'N/A'}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#7f8c8d', marginBottom: '4px', fontWeight: '600' }}>
                Strength
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    backgroundColor: getStrengthColor(relationship.strength),
                    color: 'white',
                    fontSize: '16px',
                    fontWeight: 'bold'
                  }}
                >
                  {relationship.strength}
                </div>
                <span style={{ fontSize: '15px', color: '#2c3e50' }}>
                  {getStrengthLabel(relationship.strength)}
                </span>
              </div>
            </div>
          </div>

          {score && (
            <div style={{ marginBottom: '20px', padding: '15px', background: '#f8f9fa', borderRadius: '6px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: '#7f8c8d', marginBottom: '8px', fontWeight: '600' }}>
                Computed Relationship Score
              </label>
              <div style={{ fontSize: '24px', color: '#2c3e50', fontWeight: 'bold', marginBottom: '10px' }}>
                {score.total_score ? score.total_score.toFixed(1) : '0.0'} / 100
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', fontSize: '13px' }}>
                <div>
                  <span style={{ color: '#7f8c8d' }}>Base Strength:</span>{' '}
                  <span style={{ color: '#2c3e50', fontWeight: '500' }}>
                    {score.base_strength ? score.base_strength.toFixed(1) : '0.0'}
                  </span>
                </div>
                <div>
                  <span style={{ color: '#7f8c8d' }}>Interaction:</span>{' '}
                  <span style={{ color: '#2c3e50', fontWeight: '500' }}>
                    {score.interaction_score ? score.interaction_score.toFixed(1) : '0.0'}
                  </span>
                </div>
                <div>
                  <span style={{ color: '#7f8c8d' }}>Reciprocity:</span>{' '}
                  <span style={{ color: '#2c3e50', fontWeight: '500' }}>
                    {score.reciprocity_score ? score.reciprocity_score.toFixed(1) : '0.0'}
                  </span>
                </div>
                <div>
                  <span style={{ color: '#7f8c8d' }}>Recency:</span>{' '}
                  <span style={{ color: '#2c3e50', fontWeight: '500' }}>
                    {score.recency_score ? score.recency_score.toFixed(1) : '0.0'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {relationship.notes && (
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#7f8c8d', marginBottom: '8px', fontWeight: '600' }}>
                Notes
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
                {relationship.notes}
              </div>
            </div>
          )}

          <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #ecf0f1' }}>
            <div style={{ fontSize: '12px', color: '#95a5a6' }}>
              Created: {relationship.created_at ? new Date(relationship.created_at).toLocaleString() : 'Unknown'}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button
            onClick={() => navigate('/relationships')}
            className="btn btn-secondary"
          >
            Back to Relationships
          </button>
          <Link
            to={`/relationships/${id}/edit`}
            className="btn btn-primary"
            style={{ textDecoration: 'none' }}
          >
            Edit Relationship
          </Link>
        </div>
      </div>
    </Layout>
  );
};

export default RelationshipDetail;
