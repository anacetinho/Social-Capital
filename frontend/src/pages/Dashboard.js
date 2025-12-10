import React, { useState, useEffect, useCallback } from 'react';
import Layout from '../components/Layout';
import api from '../services/api';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [people, setPeople] = useState([]);
  const [selectedPersonId, setSelectedPersonId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Get the selected person object for context
  const selectedPerson = people.find(p => p.id === parseInt(selectedPersonId)) || null;

  const fetchPeople = useCallback(async () => {
    try {
      const response = await api.get('/people');
      setPeople(response.data.data || response.data);
    } catch (err) {
      console.error('Failed to load people');
    }
  }, []);

  const fetchDashboardStats = useCallback(async () => {
    try {
      setLoading(true);
      const params = selectedPersonId ? { person_id: selectedPersonId } : {};
      const response = await api.get('/dashboard/stats', { params });
      setStats(response.data);
      setLoading(false);
    } catch (err) {
      setError('Failed to load dashboard data');
      setLoading(false);
    }
  }, [selectedPersonId]);

  useEffect(() => {
    fetchPeople();
  }, [fetchPeople]);

  useEffect(() => {
    fetchDashboardStats();
  }, [fetchDashboardStats]);

  if (loading) {
    return (
      <Layout currentPerson={selectedPerson}>
        <div>Loading dashboard...</div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout currentPerson={selectedPerson}>
        <div className="error-message">{error}</div>
      </Layout>
    );
  }

  return (
    <Layout currentPerson={selectedPerson}>
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <div>
            <h1 style={{ margin: 0 }}>Dashboard</h1>
            <p style={{ margin: '5px 0 0 0' }}>
              {selectedPersonId && stats?.person
                ? `Showing statistics for ${stats.person.name}`
                : 'Overview of your social network'}
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
              <option value="">All People (Network Overview)</option>
              {people.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="stats-grid">
        {selectedPersonId && stats?.degree_connections ? (
          // Show degree connections when a person is selected
          <>
            <div className="stat-card">
              <div className="stat-value">{stats.degree_connections.n1}</div>
              <div className="stat-label">N1 (1st Degree)</div>
            </div>

            <div className="stat-card">
              <div className="stat-value">{stats.degree_connections.n2}</div>
              <div className="stat-label">N2 (N1 + 2nd Degree)</div>
            </div>

            <div className="stat-card">
              <div className="stat-value">{stats.degree_connections.n3}</div>
              <div className="stat-label">N3 (N1 + N2 + 3rd Degree)</div>
            </div>

            <div className="stat-card">
              <div className="stat-value">{stats.total_favors || 0}</div>
              <div className="stat-label">Favors</div>
            </div>
          </>
        ) : (
          // Show standard metrics when viewing all people
          <>
            <div className="stat-card">
              <div className="stat-value">{stats?.total_people || 0}</div>
              <div className="stat-label">People</div>
            </div>

            <div className="stat-card">
              <div className="stat-value">{stats?.total_relationships || 0}</div>
              <div className="stat-label">Relationships</div>
            </div>

            <div className="stat-card">
              <div className="stat-value">{stats?.total_events || 0}</div>
              <div className="stat-label">Events</div>
            </div>

            <div className="stat-card">
              <div className="stat-value">{stats?.total_favors || 0}</div>
              <div className="stat-label">Favors</div>
            </div>
          </>
        )}
      </div>

      {/* Network Health Score */}
      <div className="card" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: '0 0 8px 0', color: 'white' }}>Network Health Score</h3>
            <p style={{ margin: 0, fontSize: '13px', opacity: 0.9 }}>
              Based on activity, diversity, and engagement
            </p>
          </div>
          <div style={{ fontSize: '48px', fontWeight: 'bold' }}>
            {stats?.network_health_score || 0}
            <span style={{ fontSize: '24px', opacity: 0.8 }}>/100</span>
          </div>
        </div>
        <div style={{ marginTop: '15px', background: 'rgba(255,255,255,0.2)', borderRadius: '10px', height: '8px', overflow: 'hidden' }}>
          <div style={{
            width: `${stats?.network_health_score || 0}%`,
            height: '100%',
            background: 'white',
            borderRadius: '10px',
            transition: 'width 0.5s ease'
          }} />
        </div>
      </div>

      <div className="card">
        <h3>Relationship Strength Distribution</h3>
        {stats?.relationship_strength_distribution && (
          <div style={{ display: 'flex', gap: '15px', marginTop: '20px', alignItems: 'flex-end', height: '200px' }}>
            {[1, 2, 3, 4, 5].map((strength) => {
              const count = stats.relationship_strength_distribution[strength] || 0;
              const maxCount = Math.max(...Object.values(stats.relationship_strength_distribution || {}), 1);
              const heightPercent = (count / maxCount) * 100;
              const colors = {
                1: '#95a5a6',
                2: '#3498db',
                3: '#f39c12',
                4: '#e67e22',
                5: '#e74c3c'
              };

              return (
                <div key={strength} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', color: colors[strength], marginBottom: '8px' }}>
                    {count}
                  </div>
                  <div style={{
                    width: '100%',
                    height: `${heightPercent}%`,
                    background: colors[strength],
                    borderRadius: '6px 6px 0 0',
                    transition: 'height 0.3s ease',
                    minHeight: count > 0 ? '20px' : '0'
                  }} />
                  <div style={{ fontSize: '12px', color: '#7f8c8d', marginTop: '8px', fontWeight: '500' }}>
                    {strength === 1 ? 'Weak' : strength === 2 ? 'Basic' : strength === 3 ? 'Good' : strength === 4 ? 'Strong' : 'Very Strong'}
                  </div>
                  <div style={{ fontSize: '11px', color: '#95a5a6' }}>
                    {strength}★
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Top Connections */}
      <div className="card">
        <h3>Most Connected People</h3>
        {stats?.top_connections && stats.top_connections.length > 0 ? (
          <div style={{ marginTop: '15px' }}>
            {stats.top_connections.slice(0, 5).map((person, index) => (
              <div key={person.id} style={{
                display: 'flex',
                alignItems: 'center',
                padding: '12px',
                marginBottom: '10px',
                background: index === 0 ? '#fff9e6' : '#f8f9fa',
                borderRadius: '8px',
                border: index === 0 ? '2px solid #f39c12' : '1px solid #ecf0f1'
              }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: index === 0 ? '#f39c12' : '#3498db',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold',
                  fontSize: '14px',
                  marginRight: '12px'
                }}>
                  {index + 1}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '500', fontSize: '14px' }}>{person.name}</div>
                  <div style={{ fontSize: '12px', color: '#7f8c8d' }}>
                    {person.connection_count} {person.connection_count === 1 ? 'connection' : 'connections'}
                  </div>
                </div>
                {index === 0 && (
                  <div style={{ fontSize: '20px' }}>👑</div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: '#7f8c8d' }}>No connection data available</p>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div className="card">
          <h3>Recent Events</h3>
          {stats?.recent_events && stats.recent_events.length > 0 ? (
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {stats.recent_events.slice(0, 5).map((event) => (
                <li
                  key={event.id}
                  style={{
                    padding: '10px 0',
                    borderBottom: '1px solid #ecf0f1',
                  }}
                >
                  <div style={{ fontWeight: '500' }}>{event.title}</div>
                  <div style={{ fontSize: '12px', color: '#7f8c8d' }}>
                    {new Date(event.date).toLocaleDateString()}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p style={{ color: '#7f8c8d' }}>No recent events</p>
          )}
        </div>

        <div className="card">
          <h3>Upcoming Birthdays</h3>
          {stats?.upcoming_birthdays && stats.upcoming_birthdays.length > 0 ? (
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {stats.upcoming_birthdays.map((person) => (
                <li
                  key={person.id}
                  style={{
                    padding: '10px 0',
                    borderBottom: '1px solid #ecf0f1',
                  }}
                >
                  <div style={{ fontWeight: '500' }}>{person.name}</div>
                  <div style={{ fontSize: '12px', color: '#7f8c8d' }}>
                    {person.birthday
                      ? new Date(person.birthday).toLocaleDateString(undefined, {
                          month: 'long',
                          day: 'numeric',
                        })
                      : 'Date unknown'}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p style={{ color: '#7f8c8d' }}>No upcoming birthdays</p>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
