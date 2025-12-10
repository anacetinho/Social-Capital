import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Layout from '../components/Layout';
import api from '../services/api';

const FavorDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [favor, setFavor] = useState(null);
  const [giver, setGiver] = useState(null);
  const [receiver, setReceiver] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchFavor = useCallback(async () => {
    try {
      const response = await api.get(`/favors/${id}`);
      const favorData = response.data;
      setFavor(favorData);

      // Fetch giver and receiver details
      if (favorData.giver_id) {
        const giverRes = await api.get(`/people/${favorData.giver_id}`);
        setGiver(giverRes.data);
      }
      if (favorData.receiver_id) {
        const receiverRes = await api.get(`/people/${favorData.receiver_id}`);
        setReceiver(receiverRes.data);
      }

      setLoading(false);
    } catch (err) {
      setError('Failed to load favor details');
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchFavor();
  }, [fetchFavor]);

  if (loading) {
    return (
      <Layout>
        <div>Loading favor details...</div>
      </Layout>
    );
  }

  if (error || !favor) {
    return (
      <Layout>
        <div className="error-message">{error || 'Favor not found'}</div>
        <button onClick={() => navigate('/favors')} className="btn btn-secondary">
          Back to Favors
        </button>
      </Layout>
    );
  }

  const getStatusBadge = (status) => {
    const styles = {
      pending: { background: '#fff3cd', color: '#856404', border: '1px solid #ffeaa7' },
      completed: { background: '#d4edda', color: '#155724', border: '1px solid #c3e6cb' },
      declined: { background: '#f8d7da', color: '#721c24', border: '1px solid #f5c6cb' }
    };

    return (
      <span style={{
        padding: '4px 12px',
        borderRadius: '12px',
        fontSize: '13px',
        fontWeight: '500',
        textTransform: 'capitalize',
        ...styles[status] || styles.pending
      }}>
        {status}
      </span>
    );
  };

  return (
    <Layout>
      <div className="page-header">
        <h1>Favor Details</h1>
        <p>View favor information</p>
      </div>

      <div className="card" style={{ maxWidth: '800px' }}>
        <div style={{ marginBottom: '30px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ margin: 0, color: '#2c3e50' }}>{favor.description}</h2>
            {getStatusBadge(favor.status)}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#7f8c8d', marginBottom: '4px', fontWeight: '600' }}>
                Giver
              </label>
              {giver ? (
                <Link
                  to={`/people/${giver.id}`}
                  style={{
                    display: 'inline-block',
                    fontSize: '15px',
                    color: '#3498db',
                    textDecoration: 'none',
                    fontWeight: '500'
                  }}
                >
                  {giver.name}
                </Link>
              ) : (
                <div style={{ fontSize: '15px', color: '#7f8c8d' }}>Unknown</div>
              )}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#7f8c8d', marginBottom: '4px', fontWeight: '600' }}>
                Receiver
              </label>
              {receiver ? (
                <Link
                  to={`/people/${receiver.id}`}
                  style={{
                    display: 'inline-block',
                    fontSize: '15px',
                    color: '#3498db',
                    textDecoration: 'none',
                    fontWeight: '500'
                  }}
                >
                  {receiver.name}
                </Link>
              ) : (
                <div style={{ fontSize: '15px', color: '#7f8c8d' }}>Unknown</div>
              )}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#7f8c8d', marginBottom: '4px', fontWeight: '600' }}>
                Date
              </label>
              <div style={{ fontSize: '15px', color: '#2c3e50' }}>
                {favor.date ? new Date(favor.date).toLocaleDateString() : 'N/A'}
              </div>
            </div>

            {favor.estimated_value && (
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#7f8c8d', marginBottom: '4px', fontWeight: '600' }}>
                  Estimated Value
                </label>
                <div style={{ fontSize: '15px', color: '#2c3e50', fontWeight: '500' }}>
                  €{parseFloat(favor.estimated_value).toFixed(2)}
                </div>
              </div>
            )}
          </div>

          {favor.time_commitment && (
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: '#7f8c8d', marginBottom: '4px', fontWeight: '600' }}>
                Time Commitment
              </label>
              <div style={{ fontSize: '15px', color: '#2c3e50' }}>
                {favor.time_commitment}
              </div>
            </div>
          )}

          {favor.notes && (
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
                {favor.notes}
              </div>
            </div>
          )}

          <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #ecf0f1' }}>
            <div style={{ fontSize: '12px', color: '#95a5a6' }}>
              Created: {favor.created_at ? new Date(favor.created_at).toLocaleString() : 'Unknown'}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button
            onClick={() => navigate('/favors')}
            className="btn btn-secondary"
          >
            Back to Favors
          </button>
          <Link
            to={`/favors/${id}/edit`}
            className="btn btn-primary"
            style={{ textDecoration: 'none' }}
          >
            Edit Favor
          </Link>
        </div>
      </div>
    </Layout>
  );
};

export default FavorDetail;
