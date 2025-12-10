import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Layout from '../components/Layout';
import api, { preferencesAPI } from '../services/api';

const PersonDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [person, setPerson] = useState(null);
  const [relationships, setRelationships] = useState([]);
  const [relationshipScores, setRelationshipScores] = useState({});
  const [events, setEvents] = useState([]);
  const [favors, setFavors] = useState([]);
  const [biographies, setBiographies] = useState([]);
  const [professionalHistory, setProfessionalHistory] = useState([]);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('biography'); // biography, professional, assets, events, favors
  const [uiPreferences, setUiPreferences] = useState({ show_summary_a: true, show_summary_b: true });

  const fetchUIPreferences = useCallback(async () => {
    try {
      const response = await preferencesAPI.getPreferences();
      setUiPreferences({
        show_summary_a: response.data.preferences.show_summary_a,
        show_summary_b: response.data.preferences.show_summary_b
      });
    } catch (err) {
      console.error('Failed to load UI preferences:', err);
    }
  }, []);

  const fetchRelationshipScores = useCallback(async (relationshipsData) => {
    const scores = {};

    for (const rel of relationshipsData) {
      try {
        const otherPersonId = rel.person1_id === id ? rel.person2_id : rel.person1_id;

        const response = await api.get('/relationships/score', {
          params: {
            person1_id: id,
            person2_id: otherPersonId
          }
        });
        scores[otherPersonId] = response.data;
      } catch (err) {
        console.error(`Failed to fetch score for relationship ${rel.id}:`, err);
      }
    }

    setRelationshipScores(scores);
  }, [id]);

  const fetchPersonData = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch person data first
      const personRes = await api.get(`/people/${id}`);
      setPerson(personRes.data);

      // Fetch other data with error handling for each
      const [relRes, eventsRes, favorsRes, profRes, assetsRes] = await Promise.all([
        api.get(`/relationships?person_id=${id}`).catch(() => ({ data: [] })),
        api.get(`/events?person_id=${id}`).catch(() => ({ data: [] })),
        api.get(`/favors`, { params: { person_id: id } }).catch(() => ({ data: [] })),
        api.get(`/professional-history?person_id=${id}`).catch(() => ({ data: [] })),
        api.get(`/assets?owner_id=${id}`).catch(() => ({ data: [] })),
      ]);

      // Try to fetch biographies separately with error handling
      try {
        const bioRes = await api.get(`/biographies?person_id=${id}`);
        setBiographies(bioRes.data || []);
      } catch (err) {
        console.warn('Biographies endpoint not available:', err);
        setBiographies([]);
      }

      const relationshipsData = relRes.data.data || relRes.data || [];
      setRelationships(relationshipsData);
      setEvents(eventsRes.data.data || eventsRes.data || []);
      setFavors(favorsRes.data.data || favorsRes.data || []);
      setProfessionalHistory(profRes.data.data || profRes.data || []);
      setAssets(assetsRes.data.data || assetsRes.data || []);

      // Fetch relationship scores
      if (relationshipsData.length > 0) {
        fetchRelationshipScores(relationshipsData);
      }

      setLoading(false);
    } catch (err) {
      console.error('Error loading person details:', err);
      setError('Failed to load person details');
      setLoading(false);
    }
  }, [id, fetchRelationshipScores]);

  useEffect(() => {
    fetchPersonData();
    fetchUIPreferences();
  }, [fetchPersonData, fetchUIPreferences]);

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this person? This cannot be undone.')) {
      return;
    }

    try {
      await api.delete(`/people/${id}`);
      navigate('/people');
    } catch (err) {
      alert('Failed to delete person');
    }
  };

  const handleDeleteProfessionalHistory = async (jobId) => {
    if (!window.confirm('Are you sure you want to delete this job entry?')) {
      return;
    }

    try {
      await api.delete(`/professional-history/${jobId}`);
      fetchPersonData();
    } catch (err) {
      alert('Failed to delete professional history entry');
    }
  };

  const handleDeleteBiography = async (bioId) => {
    if (!window.confirm('Are you sure you want to delete this note?')) {
      return;
    }

    try {
      await api.delete(`/biographies/${bioId}`);
      fetchPersonData();
    } catch (err) {
      alert('Failed to delete biography note');
    }
  };

  // Calculate total networth from assets
  const totalNetworth = assets.reduce((sum, asset) => {
    return sum + (parseFloat(asset.estimated_value) || 0);
  }, 0);

  if (loading) {
    return (
      <Layout>
        <div>Loading person details...</div>
      </Layout>
    );
  }

  if (error || !person) {
    return (
      <Layout>
        <div className="error-message">{error || 'Person not found'}</div>
        <Link to="/people" className="btn btn-secondary">
          Back to People
        </Link>
      </Layout>
    );
  }

  return (
    <Layout currentPerson={person}>
      {/* Basic Data Section - Top */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '30px', alignItems: 'start' }}>
          {/* Profile Picture */}
          <div style={{ flexShrink: 0 }}>
            {person.photo_url ? (
              <img
                src={person.photo_url}
                alt={person.name}
                style={{
                  width: '150px',
                  height: '150px',
                  borderRadius: '10px',
                  objectFit: 'cover',
                }}
              />
            ) : (
              <div
                style={{
                  width: '150px',
                  height: '150px',
                  background: '#3498db',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '60px',
                  fontWeight: 'bold',
                  borderRadius: '10px',
                }}
              >
                {person.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          {/* Basic Info */}
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
              <h1 style={{ margin: 0, marginBottom: '15px' }}>{person.name}</h1>
              <div style={{ display: 'flex', gap: '10px' }}>
                <Link to={`/people/${id}/edit`} className="btn btn-primary">
                  Edit
                </Link>
                <button onClick={handleDelete} className="btn btn-danger">
                  Delete
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px', marginTop: '10px' }}>
              {person.gender && (
                <div>
                  <strong style={{ color: '#7f8c8d', fontSize: '13px' }}>Gender:</strong>
                  <div style={{ textTransform: 'capitalize' }}>{person.gender}</div>
                </div>
              )}
              {person.email && (
                <div>
                  <strong style={{ color: '#7f8c8d', fontSize: '13px' }}>Email:</strong>
                  <div><a href={`mailto:${person.email}`}>{person.email}</a></div>
                </div>
              )}
              {person.phone && (
                <div>
                  <strong style={{ color: '#7f8c8d', fontSize: '13px' }}>Phone:</strong>
                  <div><a href={`tel:${person.phone}`}>{person.phone}</a></div>
                </div>
              )}
              {person.birthday && (
                <div>
                  <strong style={{ color: '#7f8c8d', fontSize: '13px' }}>Birthday:</strong>
                  <div>{new Date(person.birthday).toLocaleDateString()}</div>
                </div>
              )}
              {person.address && (
                <div>
                  <strong style={{ color: '#7f8c8d', fontSize: '13px' }}>Address:</strong>
                  <div>{person.address}</div>
                </div>
              )}
              {person.linkedin_url && (
                <div>
                  <strong style={{ color: '#7f8c8d', fontSize: '13px' }}>LinkedIn:</strong>
                  <div>
                    <a href={person.linkedin_url} target="_blank" rel="noopener noreferrer">
                      View Profile
                    </a>
                  </div>
                </div>
              )}
              {person.last_contact_date && (
                <div>
                  <strong style={{ color: '#7f8c8d', fontSize: '13px' }}>Last Contact:</strong>
                  <div>{new Date(person.last_contact_date).toLocaleDateString()}</div>
                </div>
              )}
            </div>

            {person.notes && (
              <div style={{ marginTop: '20px', padding: '15px', background: '#f8f9fa', borderRadius: '6px' }}>
                <strong style={{ color: '#7f8c8d', fontSize: '13px', display: 'block', marginBottom: '8px' }}>Quick Notes:</strong>
                <p style={{ margin: 0, whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                  {person.notes}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div style={{ borderBottom: '2px solid #ecf0f1', marginBottom: '20px', display: 'flex', gap: '0' }}>
        <button
          onClick={() => setActiveTab('biography')}
          style={{
            padding: '15px 25px',
            border: 'none',
            background: activeTab === 'biography' ? '#3498db' : 'transparent',
            color: activeTab === 'biography' ? 'white' : '#7f8c8d',
            fontWeight: activeTab === 'biography' ? 'bold' : 'normal',
            cursor: 'pointer',
            borderBottom: activeTab === 'biography' ? '3px solid #2980b9' : 'none',
            transition: 'all 0.3s ease',
          }}
        >
          Biography
        </button>
        <button
          onClick={() => setActiveTab('relationships')}
          style={{
            padding: '15px 25px',
            border: 'none',
            background: activeTab === 'relationships' ? '#3498db' : 'transparent',
            color: activeTab === 'relationships' ? 'white' : '#7f8c8d',
            fontWeight: activeTab === 'relationships' ? 'bold' : 'normal',
            cursor: 'pointer',
            borderBottom: activeTab === 'relationships' ? '3px solid #2980b9' : 'none',
            transition: 'all 0.3s ease',
          }}
        >
          Relationships
        </button>
        <button
          onClick={() => setActiveTab('professional')}
          style={{
            padding: '15px 25px',
            border: 'none',
            background: activeTab === 'professional' ? '#3498db' : 'transparent',
            color: activeTab === 'professional' ? 'white' : '#7f8c8d',
            fontWeight: activeTab === 'professional' ? 'bold' : 'normal',
            cursor: 'pointer',
            borderBottom: activeTab === 'professional' ? '3px solid #2980b9' : 'none',
            transition: 'all 0.3s ease',
          }}
        >
          Professional History
        </button>
        <button
          onClick={() => setActiveTab('assets')}
          style={{
            padding: '15px 25px',
            border: 'none',
            background: activeTab === 'assets' ? '#3498db' : 'transparent',
            color: activeTab === 'assets' ? 'white' : '#7f8c8d',
            fontWeight: activeTab === 'assets' ? 'bold' : 'normal',
            cursor: 'pointer',
            borderBottom: activeTab === 'assets' ? '3px solid #2980b9' : 'none',
            transition: 'all 0.3s ease',
          }}
        >
          Assets
        </button>
        <button
          onClick={() => setActiveTab('events')}
          style={{
            padding: '15px 25px',
            border: 'none',
            background: activeTab === 'events' ? '#3498db' : 'transparent',
            color: activeTab === 'events' ? 'white' : '#7f8c8d',
            fontWeight: activeTab === 'events' ? 'bold' : 'normal',
            cursor: 'pointer',
            borderBottom: activeTab === 'events' ? '3px solid #2980b9' : 'none',
            transition: 'all 0.3s ease',
          }}
        >
          Events
        </button>
        <button
          onClick={() => setActiveTab('favors')}
          style={{
            padding: '15px 25px',
            border: 'none',
            background: activeTab === 'favors' ? '#3498db' : 'transparent',
            color: activeTab === 'favors' ? 'white' : '#7f8c8d',
            fontWeight: activeTab === 'favors' ? 'bold' : 'normal',
            cursor: 'pointer',
            borderBottom: activeTab === 'favors' ? '3px solid #2980b9' : 'none',
            transition: 'all 0.3s ease',
          }}
        >
          Favors
        </button>
        <button
          onClick={() => setActiveTab('summary')}
          style={{
            padding: '15px 25px',
            border: 'none',
            background: activeTab === 'summary' ? '#3498db' : 'transparent',
            color: activeTab === 'summary' ? 'white' : '#7f8c8d',
            fontWeight: activeTab === 'summary' ? 'bold' : 'normal',
            cursor: 'pointer',
            borderBottom: activeTab === 'summary' ? '3px solid #2980b9' : 'none',
            transition: 'all 0.3s ease',
          }}
        >
          Summary
        </button>
      </div>

      {/* Tab Content */}
      <div>
        {/* Biography Tab */}
        {activeTab === 'biography' && (
          <div className="card">
            <h2>Biography</h2>
            {biographies.length > 0 ? (
              <div style={{ display: 'grid', gap: '15px' }}>
                {biographies.map((bio) => (
                  <div
                    key={bio.id}
                    style={{
                      padding: '15px',
                      border: '1px solid #ecf0f1',
                      borderRadius: '8px',
                      background: '#f8f9fa',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '10px' }}>
                      <div>
                        <h3 style={{ margin: 0, marginBottom: '5px' }}>{bio.title}</h3>
                        <div style={{ fontSize: '13px', color: '#7f8c8d' }}>
                          {new Date(bio.note_date).toLocaleDateString()}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <Link
                          to={`/biographies/${bio.id}`}
                          className="btn btn-secondary"
                          style={{ padding: '5px 10px', fontSize: '12px', textDecoration: 'none', whiteSpace: 'nowrap' }}
                        >
                          View
                        </Link>
                        <Link
                          to={`/biographies/${bio.id}/edit`}
                          className="btn btn-primary"
                          style={{ padding: '5px 10px', fontSize: '12px', textDecoration: 'none', whiteSpace: 'nowrap' }}
                        >
                          Edit
                        </Link>
                        <button
                          onClick={() => handleDeleteBiography(bio.id)}
                          className="btn btn-danger"
                          style={{ padding: '5px 10px', fontSize: '12px' }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    <p style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6', margin: 0 }}>
                      {bio.note}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: '#7f8c8d', marginBottom: '15px' }}>No biography notes recorded</p>
            )}
            <Link
              to={`/biographies/new?person=${id}`}
              className="btn btn-primary"
              style={{ marginTop: '15px', display: 'inline-block' }}
            >
              Add Biography Note
            </Link>
          </div>
        )}

        {/* Relationships Tab */}
        {activeTab === 'relationships' && (
          <div className="card">
            <h2>Relationships</h2>
            {relationships.length > 0 ? (
              <div style={{ display: 'grid', gap: '12px' }}>
                {relationships.map((rel) => {
                  const otherPersonId = rel.person1_id === id ? rel.person2_id : rel.person1_id;
                  const otherPersonName = rel.person1_id === id ? rel.person2_name : rel.person1_name;
                  const score = relationshipScores[otherPersonId];

                  return (
                    <div
                      key={rel.id}
                      style={{
                        padding: '15px',
                        border: '1px solid #ecf0f1',
                        borderRadius: '8px',
                        background: '#f8f9fa',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                        <div style={{ flex: 1 }}>
                          <Link
                            to={`/people/${otherPersonId}`}
                            style={{
                              fontSize: '18px',
                              fontWeight: 'bold',
                              color: '#3498db',
                              textDecoration: 'none',
                            }}
                          >
                            {otherPersonName}
                          </Link>

                          <div style={{ marginTop: '8px', display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                            {/* Relationship Type Badge */}
                            <span style={{
                              background: '#3498db',
                              color: 'white',
                              padding: '4px 12px',
                              borderRadius: '12px',
                              fontSize: '12px',
                              textTransform: 'capitalize',
                            }}>
                              {rel.relationship_type?.replace('_', ' ') || 'Unknown'}
                            </span>

                            {/* Strength Rating */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                              <span style={{ fontSize: '12px', color: '#7f8c8d' }}>Strength:</span>
                              <div style={{ display: 'flex', gap: '2px' }}>
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <span
                                    key={star}
                                    style={{
                                      color: star <= rel.strength ? '#f39c12' : '#ddd',
                                      fontSize: '14px',
                                    }}
                                  >
                                    ★
                                  </span>
                                ))}
                              </div>
                              <span style={{ fontSize: '12px', color: '#555', marginLeft: '5px' }}>
                                ({rel.strength}/5)
                              </span>
                            </div>

                            {/* Computed Score */}
                            {score && (
                              <div style={{
                                background: score.score >= 70 ? '#27ae60' : score.score >= 40 ? '#f39c12' : '#e74c3c',
                                color: 'white',
                                padding: '4px 10px',
                                borderRadius: '12px',
                                fontSize: '12px',
                                fontWeight: 'bold',
                              }}>
                                Score: {score.score}/100
                              </div>
                            )}
                          </div>

                          {/* Score Breakdown */}
                          {score && (
                            <div style={{
                              marginTop: '10px',
                              fontSize: '11px',
                              color: '#7f8c8d',
                              display: 'grid',
                              gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                              gap: '8px',
                            }}>
                              <div>
                                <span style={{ fontWeight: 'bold' }}>Base:</span> {score.components?.baseStrength || 0}
                              </div>
                              <div>
                                <span style={{ fontWeight: 'bold' }}>Interactions:</span> {score.components?.interactionFrequency || 0}
                              </div>
                              <div>
                                <span style={{ fontWeight: 'bold' }}>Reciprocity:</span> {score.components?.reciprocity || 0}
                              </div>
                              <div>
                                <span style={{ fontWeight: 'bold' }}>Recency:</span> {score.components?.recency || 0}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <Link
                            to={`/relationships/${rel.id}`}
                            className="btn btn-secondary"
                            style={{ padding: '5px 10px', fontSize: '12px', textDecoration: 'none', whiteSpace: 'nowrap' }}
                          >
                            View
                          </Link>
                          <Link
                            to={`/relationships/${rel.id}/edit`}
                            className="btn btn-primary"
                            style={{ padding: '5px 10px', fontSize: '12px', textDecoration: 'none', whiteSpace: 'nowrap' }}
                          >
                            Edit
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p style={{ color: '#7f8c8d', marginBottom: '15px' }}>No relationships recorded</p>
            )}
            <Link
              to={`/relationships/new?person=${id}`}
              className="btn btn-primary"
              style={{ marginTop: '15px', display: 'inline-block' }}
            >
              Add Relationship
            </Link>
          </div>
        )}

        {/* Professional History Tab */}
        {activeTab === 'professional' && (
          <div className="card">
            <h2>Professional History</h2>
            {professionalHistory.length > 0 ? (
              <div className="timeline">
                {professionalHistory.map((job) => (
                  <div key={job.id} className="timeline-item">
                    <div className="timeline-marker"></div>
                    <div className="timeline-content">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                        <div style={{ flex: 1 }}>
                          <h4>{job.position || job.title}</h4>
                          <p className="company">{job.company}</p>
                          <p className="date-range">
                            {new Date(job.start_date).toLocaleDateString()} -{' '}
                            {job.end_date
                              ? new Date(job.end_date).toLocaleDateString()
                              : 'Present'}
                          </p>
                          {(job.notes || job.description) && (
                            <p className="description">{job.notes || job.description}</p>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <Link
                            to={`/professional-history/${job.id}`}
                            className="btn btn-secondary"
                            style={{ padding: '5px 10px', fontSize: '12px', textDecoration: 'none', whiteSpace: 'nowrap' }}
                          >
                            View
                          </Link>
                          <Link
                            to={`/professional-history/${job.id}/edit`}
                            className="btn btn-primary"
                            style={{ padding: '5px 10px', fontSize: '12px', textDecoration: 'none', whiteSpace: 'nowrap' }}
                          >
                            Edit
                          </Link>
                          <button
                            onClick={() => handleDeleteProfessionalHistory(job.id)}
                            className="btn btn-danger"
                            style={{ padding: '5px 10px', fontSize: '12px' }}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: '#7f8c8d', marginBottom: '15px' }}>No professional history recorded</p>
            )}
            <Link
              to={`/professional-history/new?person=${id}`}
              className="btn btn-primary"
              style={{ marginTop: '15px', display: 'inline-block' }}
            >
              Add Job
            </Link>
          </div>
        )}

        {/* Assets Tab */}
        {activeTab === 'assets' && (
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0 }}>Assets</h2>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '13px', color: '#7f8c8d' }}>Estimated Net Worth</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#27ae60' }}>
                  €{totalNetworth.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            </div>

            {assets.length > 0 ? (
              <div style={{ display: 'grid', gap: '12px' }}>
                {assets.map((asset) => (
                  <div
                    key={asset.id}
                    style={{
                      padding: '15px',
                      border: '1px solid #ecf0f1',
                      borderRadius: '8px',
                      background: '#f8f9fa',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                      <div>
                        <strong style={{ fontSize: '16px' }}>{asset.name}</strong>
                        <div style={{ fontSize: '12px', color: '#7f8c8d', marginTop: '3px' }}>
                          <span style={{
                            background: '#ecf0f1',
                            padding: '2px 8px',
                            borderRadius: '3px',
                            textTransform: 'capitalize',
                            marginRight: '8px'
                          }}>
                            {asset.asset_type}
                          </span>
                          {asset.estimated_value && (
                            <span style={{ color: '#27ae60', fontWeight: 'bold' }}>
                              €{parseFloat(asset.estimated_value).toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <Link
                          to={`/assets/${asset.id}`}
                          className="btn btn-secondary"
                          style={{ padding: '5px 10px', fontSize: '12px', textDecoration: 'none', whiteSpace: 'nowrap' }}
                        >
                          View
                        </Link>
                        <Link
                          to={`/assets/${asset.id}/edit`}
                          className="btn btn-primary"
                          style={{ padding: '5px 10px', fontSize: '12px', textDecoration: 'none', whiteSpace: 'nowrap' }}
                        >
                          Edit
                        </Link>
                      </div>
                    </div>
                    {asset.description && (
                      <p style={{ fontSize: '14px', color: '#555', margin: '0', marginBottom: '8px' }}>
                        {asset.description}
                      </p>
                    )}
                    {asset.availability && (
                      <div style={{ fontSize: '13px', color: '#7f8c8d' }}>
                        Availability: <span style={{ textTransform: 'capitalize', color: '#555' }}>{asset.availability.replace('_', ' ')}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: '#7f8c8d', marginBottom: '15px' }}>No assets recorded</p>
            )}
            <Link
              to="/assets/new"
              className="btn btn-primary"
              style={{ marginTop: '15px', display: 'inline-block' }}
            >
              Add Asset
            </Link>
          </div>
        )}

        {/* Events Tab */}
        {activeTab === 'events' && (
          <div className="card">
            <h2>Events</h2>
            {events.length > 0 ? (
              <div style={{ display: 'grid', gap: '12px' }}>
                {events.map((event) => (
                  <div
                    key={event.id}
                    style={{
                      padding: '15px',
                      border: '1px solid #ecf0f1',
                      borderRadius: '8px',
                      background: '#f8f9fa',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '10px' }}>
                      <div>
                        <strong style={{ fontSize: '16px' }}>{event.title}</strong>
                        <div style={{ fontSize: '13px', color: '#7f8c8d', marginTop: '5px' }}>
                          {new Date(event.date).toLocaleDateString()} - <span style={{ textTransform: 'capitalize' }}>{event.event_type}</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <Link
                          to={`/events/${event.id}`}
                          className="btn btn-secondary"
                          style={{ padding: '5px 10px', fontSize: '12px', textDecoration: 'none', whiteSpace: 'nowrap' }}
                        >
                          View
                        </Link>
                        <Link
                          to={`/events/${event.id}/edit`}
                          className="btn btn-primary"
                          style={{ padding: '5px 10px', fontSize: '12px', textDecoration: 'none', whiteSpace: 'nowrap' }}
                        >
                          Edit
                        </Link>
                      </div>
                    </div>
                    {event.description && (
                      <p style={{ fontSize: '14px', color: '#555', margin: 0 }}>
                        {event.description}
                      </p>
                    )}
                    {event.location && (
                      <div style={{ fontSize: '13px', color: '#7f8c8d', marginTop: '8px' }}>
                        📍 {event.location}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: '#7f8c8d', marginBottom: '15px' }}>No events recorded</p>
            )}
            <Link
              to={`/events/new?person=${id}`}
              className="btn btn-primary"
              style={{ marginTop: '15px', display: 'inline-block' }}
            >
              Add Event
            </Link>
          </div>
        )}

        {/* Favors Tab */}
        {activeTab === 'favors' && (
          <div className="card">
            <h2>Favors</h2>
            {favors.length > 0 ? (
              <div style={{ display: 'grid', gap: '12px' }}>
                {favors.map((favor) => (
                  <div
                    key={favor.id}
                    style={{
                      padding: '15px',
                      border: '1px solid #ecf0f1',
                      borderRadius: '8px',
                      background: favor.giver_id === id ? '#e8f8f5' : '#fef5e7',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                      <div style={{ flex: 1 }}>
                        <strong style={{ fontSize: '16px' }}>{favor.description}</strong>
                        <div style={{ fontSize: '13px', color: '#7f8c8d', marginTop: '5px' }}>
                          {favor.giver_id === id ? '🎁 Given to' : '🙏 Received from'} {favor.giver_id === id ? favor.receiver_name : favor.giver_name}
                        </div>
                        {favor.date && (
                          <div style={{ fontSize: '12px', color: '#555', marginTop: '5px' }}>
                            {new Date(favor.date).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'start' }}>
                        <span style={{
                          padding: '4px 10px',
                          borderRadius: '4px',
                          background: favor.status === 'completed' ? '#27ae60' : favor.status === 'pending' ? '#f39c12' : '#e74c3c',
                          color: 'white',
                          fontSize: '12px',
                          textTransform: 'capitalize'
                        }}>
                          {favor.status}
                        </span>
                        <Link
                          to={`/favors/${favor.id}`}
                          className="btn btn-secondary"
                          style={{ padding: '5px 10px', fontSize: '12px', textDecoration: 'none', whiteSpace: 'nowrap' }}
                        >
                          View
                        </Link>
                        <Link
                          to={`/favors/${favor.id}/edit`}
                          className="btn btn-primary"
                          style={{ padding: '5px 10px', fontSize: '12px', textDecoration: 'none', whiteSpace: 'nowrap' }}
                        >
                          Edit
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: '#7f8c8d', marginBottom: '15px' }}>No favors recorded</p>
            )}
            <Link
              to={`/favors/new?person=${id}`}
              className="btn btn-primary"
              style={{ marginTop: '15px', display: 'inline-block' }}
            >
              Add Favor
            </Link>
          </div>
        )}

        {/* Summary Tab */}
        {activeTab === 'summary' && (
          <div className="card">
            <h2 style={{ marginBottom: '25px' }}>AI-Generated Summaries</h2>

            {/* Summary A Section */}
            {uiPreferences.show_summary_a && (
              <div style={{ marginBottom: '30px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                  <h3 style={{ margin: 0, color: '#2c3e50' }}>Summary A: Fact Listing</h3>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={async () => {
                        if (window.confirm('Clear Summary A for this person?')) {
                          try {
                            setLoading(true);
                            await api.delete(`/summaries/${id}?type=a`);
                            await fetchPersonData();
                            alert('Summary A cleared successfully!');
                          } catch (err) {
                            alert('Failed to clear Summary A: ' + (err.response?.data?.error || err.message));
                          } finally {
                            setLoading(false);
                          }
                        }
                      }}
                      className="btn btn-danger"
                      style={{ padding: '6px 12px', fontSize: '13px' }}
                      disabled={!person.summary_a}
                    >
                      Clear A
                    </button>
                    <button
                      onClick={async () => {
                        if (window.confirm('Regenerate Summary A? This may take 30-60 seconds.')) {
                          try {
                            setLoading(true);
                            await api.post(`/summaries/${id}?type=a`);
                            await fetchPersonData();
                            alert('Summary A regenerated successfully!');
                          } catch (err) {
                            alert('Failed to regenerate Summary A: ' + (err.response?.data?.error || err.message));
                          } finally {
                            setLoading(false);
                          }
                        }
                      }}
                      className="btn btn-secondary"
                      style={{ padding: '6px 12px', fontSize: '13px' }}
                    >
                      Regenerate A
                    </button>
                  </div>
                </div>

                {person.summary_a ? (
                  <div>
                    {person.summary_a_generated_at && (
                      <div style={{
                        fontSize: '12px',
                        color: '#7f8c8d',
                        marginBottom: '12px',
                        padding: '8px',
                        background: '#f8f9fa',
                        borderRadius: '5px'
                      }}>
                        Last generated: {new Date(person.summary_a_generated_at).toLocaleString()}
                      </div>
                    )}
                    <div style={{
                      whiteSpace: 'pre-wrap',
                      lineHeight: '1.7',
                      fontSize: '14px',
                      color: '#2c3e50',
                      padding: '18px',
                      background: '#ffffff',
                      border: '1px solid #d5dbdb',
                      borderRadius: '7px'
                    }}>
                      {person.summary_a}
                    </div>
                  </div>
                ) : (
                  <div style={{
                    padding: '25px 18px',
                    textAlign: 'center',
                    background: '#fef9e7',
                    borderRadius: '7px',
                    border: '2px dashed #f4d03f'
                  }}>
                    <div style={{ fontSize: '36px', marginBottom: '10px' }}>📋</div>
                    <h4 style={{ color: '#7f8c8d', marginBottom: '8px', fontSize: '16px' }}>No Summary A generated yet</h4>
                    <p style={{ color: '#95a5a6', fontSize: '13px', margin: 0 }}>
                      Summary A contains plain-text facts about this person and their connections.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Summary B Section */}
            {uiPreferences.show_summary_b && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                  <h3 style={{ margin: 0, color: '#2c3e50' }}>Summary B: AI Analysis</h3>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={async () => {
                        if (window.confirm('Clear Summary B for this person?')) {
                          try {
                            setLoading(true);
                            await api.delete(`/summaries/${id}?type=b`);
                            await fetchPersonData();
                            alert('Summary B cleared successfully!');
                          } catch (err) {
                            alert('Failed to clear Summary B: ' + (err.response?.data?.error || err.message));
                          } finally {
                            setLoading(false);
                          }
                        }
                      }}
                      className="btn btn-danger"
                      style={{ padding: '6px 12px', fontSize: '13px' }}
                      disabled={!person.summary_b}
                    >
                      Clear B
                    </button>
                    <button
                      onClick={async () => {
                        if (window.confirm('Regenerate Summary B? This may take 30-60 seconds.')) {
                          try {
                            setLoading(true);
                            await api.post(`/summaries/${id}?type=b`);
                            await fetchPersonData();
                            alert('Summary B regenerated successfully!');
                          } catch (err) {
                            alert('Failed to regenerate Summary B: ' + (err.response?.data?.error || err.message));
                          } finally {
                            setLoading(false);
                          }
                        }
                      }}
                      className="btn btn-secondary"
                      style={{ padding: '6px 12px', fontSize: '13px' }}
                      disabled={!person.summary_a}
                    >
                      Regenerate B
                    </button>
                  </div>
                </div>

                {person.summary_b ? (
                  <div>
                    {person.summary_b_generated_at && (
                      <div style={{
                        fontSize: '12px',
                        color: '#7f8c8d',
                        marginBottom: '12px',
                        padding: '8px',
                        background: '#f8f9fa',
                        borderRadius: '5px'
                      }}>
                        Last generated: {new Date(person.summary_b_generated_at).toLocaleString()}
                      </div>
                    )}
                    <div style={{
                      whiteSpace: 'pre-wrap',
                      lineHeight: '1.8',
                      fontSize: '15px',
                      color: '#2c3e50',
                      padding: '20px',
                      background: '#ffffff',
                      border: '1px solid #aed6f1',
                      borderRadius: '7px'
                    }}>
                      {person.summary_b}
                    </div>
                  </div>
                ) : (
                  <div style={{
                    padding: '25px 18px',
                    textAlign: 'center',
                    background: '#ebf5fb',
                    borderRadius: '7px',
                    border: '2px dashed #5dade2'
                  }}>
                    <div style={{ fontSize: '36px', marginBottom: '10px' }}>🤖</div>
                    <h4 style={{ color: '#7f8c8d', marginBottom: '8px', fontSize: '16px' }}>
                      {person.summary_a ? 'No Summary B generated yet' : 'Summary A required first'}
                    </h4>
                    <p style={{ color: '#95a5a6', fontSize: '13px', margin: 0 }}>
                      {person.summary_a
                        ? 'Summary B provides AI-generated analysis based on Summary A.'
                        : 'Generate Summary A before creating Summary B.'}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Empty state if both summaries are hidden */}
            {!uiPreferences.show_summary_a && !uiPreferences.show_summary_b && (
              <div style={{
                padding: '40px 20px',
                textAlign: 'center',
                background: '#f8f9fa',
                borderRadius: '8px',
                border: '2px dashed #ddd'
              }}>
                <div style={{ fontSize: '48px', marginBottom: '15px' }}>⚙️</div>
                <h3 style={{ color: '#7f8c8d', marginBottom: '10px' }}>Summaries Hidden</h3>
                <p style={{ color: '#95a5a6', marginBottom: '20px' }}>
                  Both summary types are currently hidden. Enable them in Settings to view summaries.
                </p>
                <Link
                  to="/settings"
                  className="btn btn-primary"
                  style={{ textDecoration: 'none' }}
                >
                  Go to Settings
                </Link>
              </div>
            )}

            {/* Generate All Button */}
            {(uiPreferences.show_summary_a || uiPreferences.show_summary_b) && (!person.summary_a || !person.summary_b) && (
              <div style={{ marginTop: '25px', paddingTop: '20px', borderTop: '2px solid #ecf0f1' }}>
                <Link
                  to="/settings"
                  className="btn btn-primary"
                  style={{ textDecoration: 'none', width: '100%', textAlign: 'center', display: 'block', padding: '12px' }}
                >
                  Go to Settings to Generate Summaries
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default PersonDetail;
