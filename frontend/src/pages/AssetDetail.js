import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Layout from '../components/Layout';
import api from '../services/api';

const AssetDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [asset, setAsset] = useState(null);
  const [owner, setOwner] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchAsset = useCallback(async () => {
    try {
      const response = await api.get(`/assets/${id}`);
      const assetData = response.data;
      setAsset(assetData);

      // Fetch owner details
      if (assetData.owner_id) {
        const ownerRes = await api.get(`/people/${assetData.owner_id}`);
        setOwner(ownerRes.data);
      }

      setLoading(false);
    } catch (err) {
      setError('Failed to load asset details');
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchAsset();
  }, [fetchAsset]);

  if (loading) {
    return (
      <Layout>
        <div>Loading asset details...</div>
      </Layout>
    );
  }

  if (error || !asset) {
    return (
      <Layout>
        <div className="error-message">{error || 'Asset not found'}</div>
        <button onClick={() => navigate('/assets')} className="btn btn-secondary">
          Back to Assets
        </button>
      </Layout>
    );
  }

  const getAvailabilityBadge = (availability) => {
    const styles = {
      always: { background: '#d4edda', color: '#155724', border: '1px solid #c3e6cb' },
      by_request: { background: '#fff3cd', color: '#856404', border: '1px solid #ffeaa7' },
      never: { background: '#f8d7da', color: '#721c24', border: '1px solid #f5c6cb' },
      other: { background: '#e2e3e5', color: '#383d41', border: '1px solid #d6d8db' }
    };

    const labels = {
      always: 'Always Available',
      by_request: 'By Request',
      never: 'Not Available',
      other: 'Other'
    };

    return (
      <span style={{
        padding: '4px 12px',
        borderRadius: '12px',
        fontSize: '13px',
        fontWeight: '500',
        ...styles[availability] || styles.other
      }}>
        {labels[availability] || availability}
      </span>
    );
  };

  return (
    <Layout>
      <div className="page-header">
        <h1>Asset Details</h1>
        <p>View asset information</p>
      </div>

      <div className="card" style={{ maxWidth: '800px' }}>
        <div style={{ marginBottom: '30px' }}>
          <div style={{ marginBottom: '20px' }}>
            <h2 style={{ margin: '0 0 8px 0', color: '#2c3e50' }}>{asset.name}</h2>
            {asset.asset_type && (
              <div style={{ fontSize: '14px', color: '#7f8c8d', textTransform: 'capitalize' }}>
                {asset.asset_type.replace('_', ' ')}
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#7f8c8d', marginBottom: '4px', fontWeight: '600' }}>
                Owner
              </label>
              {owner ? (
                <Link
                  to={`/people/${owner.id}`}
                  style={{
                    display: 'inline-block',
                    fontSize: '15px',
                    color: '#3498db',
                    textDecoration: 'none',
                    fontWeight: '500'
                  }}
                >
                  {owner.name}
                </Link>
              ) : (
                <div style={{ fontSize: '15px', color: '#7f8c8d' }}>Unknown</div>
              )}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#7f8c8d', marginBottom: '4px', fontWeight: '600' }}>
                Availability
              </label>
              <div>
                {getAvailabilityBadge(asset.availability)}
              </div>
            </div>
          </div>

          {asset.estimated_value && (
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: '#7f8c8d', marginBottom: '4px', fontWeight: '600' }}>
                Estimated Value
              </label>
              <div style={{ fontSize: '18px', color: '#27ae60', fontWeight: '600' }}>
                €{parseFloat(asset.estimated_value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          )}

          {asset.address && asset.asset_type === 'property' && (
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: '#7f8c8d', marginBottom: '8px', fontWeight: '600' }}>
                Address
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
                {asset.address}
              </div>
            </div>
          )}

          {asset.description && (
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
                {asset.description}
              </div>
            </div>
          )}

          <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #ecf0f1' }}>
            <div style={{ fontSize: '12px', color: '#95a5a6' }}>
              Created: {asset.created_at ? new Date(asset.created_at).toLocaleString() : 'Unknown'}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button
            onClick={() => navigate('/assets')}
            className="btn btn-secondary"
          >
            Back to Assets
          </button>
          <Link
            to={`/assets/${id}/edit`}
            className="btn btn-primary"
            style={{ textDecoration: 'none' }}
          >
            Edit Asset
          </Link>
        </div>
      </div>
    </Layout>
  );
};

export default AssetDetail;
