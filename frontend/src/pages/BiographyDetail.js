import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Layout from '../components/Layout';
import api from '../services/api';

const BiographyDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [biography, setBiography] = useState(null);
  const [person, setPerson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchBiography = useCallback(async () => {
    try {
      const response = await api.get(`/biographies/${id}`);
      const bioData = response.data;
      setBiography(bioData);

      // Fetch person details
      if (bioData.person_id) {
        const personRes = await api.get(`/people/${bioData.person_id}`);
        setPerson(personRes.data);
      }

      setLoading(false);
    } catch (err) {
      setError('Failed to load biography details');
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchBiography();
  }, [fetchBiography]);

  if (loading) {
    return (
      <Layout>
        <div>Loading biography details...</div>
      </Layout>
    );
  }

  if (error || !biography) {
    return (
      <Layout>
        <div className="error-message">{error || 'Biography note not found'}</div>
        <button onClick={() => navigate(-1)} className="btn btn-secondary">
          Go Back
        </button>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="page-header">
        <h1>Biography Note</h1>
        <p>View biography information</p>
      </div>

      <div className="card" style={{ maxWidth: '800px' }}>
        <div style={{ marginBottom: '30px' }}>
          <div style={{ marginBottom: '20px' }}>
            <h2 style={{ margin: '0 0 8px 0', color: '#2c3e50' }}>{biography.title}</h2>
            {biography.note_date && (
              <div style={{ fontSize: '14px', color: '#7f8c8d' }}>
                {new Date(biography.note_date).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </div>
            )}
          </div>

          {person && (
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: '#7f8c8d', marginBottom: '4px', fontWeight: '600' }}>
                Person
              </label>
              <Link
                to={`/people/${person.id}`}
                style={{
                  display: 'inline-block',
                  fontSize: '15px',
                  color: '#3498db',
                  textDecoration: 'none',
                  fontWeight: '500'
                }}
              >
                {person.name}
              </Link>
            </div>
          )}

          {biography.note && (
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#7f8c8d', marginBottom: '8px', fontWeight: '600' }}>
                Note
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
                {biography.note}
              </div>
            </div>
          )}

          <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #ecf0f1' }}>
            <div style={{ fontSize: '12px', color: '#95a5a6' }}>
              Created: {biography.created_at ? new Date(biography.created_at).toLocaleString() : 'Unknown'}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button
            onClick={() => navigate(-1)}
            className="btn btn-secondary"
          >
            Go Back
          </button>
          <Link
            to={`/biographies/${id}/edit`}
            className="btn btn-primary"
            style={{ textDecoration: 'none' }}
          >
            Edit Biography Note
          </Link>
        </div>
      </div>
    </Layout>
  );
};

export default BiographyDetail;
