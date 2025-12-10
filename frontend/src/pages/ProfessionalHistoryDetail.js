import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Layout from '../components/Layout';
import api from '../services/api';

const ProfessionalHistoryDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [person, setPerson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchProfessionalHistory = useCallback(async () => {
    try {
      const response = await api.get(`/professional-history/${id}`);
      const jobData = response.data;
      setJob(jobData);

      // Fetch person details
      if (jobData.person_id) {
        const personRes = await api.get(`/people/${jobData.person_id}`);
        setPerson(personRes.data);
      }

      setLoading(false);
    } catch (err) {
      setError('Failed to load professional history details');
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchProfessionalHistory();
  }, [fetchProfessionalHistory]);

  if (loading) {
    return (
      <Layout>
        <div>Loading professional history details...</div>
      </Layout>
    );
  }

  if (error || !job) {
    return (
      <Layout>
        <div className="error-message">{error || 'Professional history not found'}</div>
        <button onClick={() => navigate(-1)} className="btn btn-secondary">
          Go Back
        </button>
      </Layout>
    );
  }

  const formatDateRange = () => {
    const startDate = job.start_date
      ? new Date(job.start_date).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short'
        })
      : 'Unknown';

    const endDate = job.end_date
      ? new Date(job.end_date).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short'
        })
      : 'Present';

    return `${startDate} - ${endDate}`;
  };

  return (
    <Layout>
      <div className="page-header">
        <h1>Professional History</h1>
        <p>View work experience details</p>
      </div>

      <div className="card" style={{ maxWidth: '800px' }}>
        <div style={{ marginBottom: '30px' }}>
          <div style={{ marginBottom: '20px' }}>
            <h2 style={{ margin: '0 0 8px 0', color: '#2c3e50' }}>
              {job.position || job.title || 'Position'}
            </h2>
            <div style={{ fontSize: '16px', color: '#3498db', fontWeight: '500', marginBottom: '4px' }}>
              {job.company}
            </div>
            <div style={{ fontSize: '14px', color: '#7f8c8d' }}>
              {formatDateRange()}
            </div>
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

          {job.notes && (
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
                {job.notes}
              </div>
            </div>
          )}

          <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #ecf0f1' }}>
            <div style={{ fontSize: '12px', color: '#95a5a6' }}>
              Created: {job.created_at ? new Date(job.created_at).toLocaleString() : 'Unknown'}
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
            to={`/professional-history/${id}/edit`}
            className="btn btn-primary"
            style={{ textDecoration: 'none' }}
          >
            Edit Professional History
          </Link>
        </div>
      </div>
    </Layout>
  );
};

export default ProfessionalHistoryDetail;
