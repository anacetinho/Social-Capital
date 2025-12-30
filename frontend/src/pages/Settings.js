import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import api, { preferencesAPI } from '../services/api';
import '../styles/Settings.css';

const Settings = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [generating, setGenerating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [summaryStatus, setSummaryStatus] = useState({ total_people: 0, summary_a_count: 0, summary_b_count: 0 });
  const [progress, setProgress] = useState({ current: 0, total: 0, personName: '', summaryType: '' });
  const [geocoding, setGeocoding] = useState(false);

  const [settings, setSettings] = useState({
    ai_assistant_enabled: false,
    ai_provider: 'local',
    ai_api_url: 'http://localhost:1234',
    ai_model: 'llama-2-7b-chat',
    ai_max_results: 100,
    ai_timeout: 200
  });

  const [uiPreferences, setUiPreferences] = useState({
    show_summary_a: true,
    show_summary_b: true
  });

  useEffect(() => {
    fetchSettings();
    fetchSummaryStatus();
    fetchUIPreferences();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await api.get('/settings/ai');
      setSettings(response.data.settings);
      setLoading(false);
    } catch (err) {
      setError('Failed to load settings');
      setLoading(false);
    }
  };

  const fetchSummaryStatus = async () => {
    try {
      const response = await api.get('/summaries/status');
      setSummaryStatus(response.data.status);
    } catch (err) {
      console.error('Failed to load summary status:', err);
    }
  };

  const fetchUIPreferences = async () => {
    try {
      const response = await preferencesAPI.getPreferences();
      setUiPreferences({
        show_summary_a: response.data.preferences.show_summary_a,
        show_summary_b: response.data.preferences.show_summary_b
      });
    } catch (err) {
      console.error('Failed to load UI preferences:', err);
    }
  };

  const handleUIPreferenceChange = async (e) => {
    const { name, checked } = e.target;
    const newPreferences = {
      ...uiPreferences,
      [name]: checked
    };
    setUiPreferences(newPreferences);

    // Save immediately
    try {
      await preferencesAPI.updatePreferences(newPreferences);
    } catch (err) {
      console.error('Failed to save UI preference:', err);
      setError('Failed to save UI preferences');
    }
  };

  const handleGenerateSummaries = async () => {
    if (!window.confirm(`Generate/update summaries for all ${summaryStatus.total_people} people? This may take several minutes.`)) {
      return;
    }

    setGenerating(true);
    setError('');
    setProgress({ current: 0, total: summaryStatus.total_people, personName: '', summaryType: '' });

    try {
      const token = localStorage.getItem('token');
      const baseURL = process.env.REACT_APP_API_URL || '/api/v1';

      const eventSource = new EventSource(
        `${baseURL}/summaries/generate-all?token=${encodeURIComponent(token)}`
      );

      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);

        if (data.type === 'start') {
          setProgress({ current: 0, total: data.total, personName: '', summaryType: '' });
        } else if (data.type === 'progress') {
          setProgress({
            current: data.current,
            total: data.total,
            personName: data.personName,
            summaryType: data.summaryType || ''
          });
        } else if (data.type === 'summary_a_complete' || data.type === 'summary_b_complete') {
          if (!data.success) {
            console.error(`Failed to generate summary for ${data.personName}:`, data.error);
          }
        } else if (data.type === 'person_complete') {
          // Person complete
        } else if (data.type === 'complete') {
          setSuccess(`Successfully generated summaries for ${data.total} people!`);
          fetchSummaryStatus();
          eventSource.close();
          setGenerating(false);
        } else if (data.type === 'error') {
          setError(`Error: ${data.error}`);
          eventSource.close();
          setGenerating(false);
        }
      };

      eventSource.onerror = (error) => {
        console.error('EventSource error:', error);
        setError('Connection error during summary generation');
        eventSource.close();
        setGenerating(false);
      };
    } catch (err) {
      setError('Failed to start summary generation: ' + err.message);
      setGenerating(false);
    }
  };

  const handleDeleteAllSummaries = async () => {
    const totalSummaries = Math.max(summaryStatus.summary_a_count, summaryStatus.summary_b_count);
    if (!window.confirm(`Delete all ${totalSummaries} summaries? This action cannot be undone.`)) {
      return;
    }

    setDeleting(true);
    setError('');
    setSuccess('');

    try {
      const response = await api.delete('/summaries/all');
      setSuccess(`Successfully deleted ${response.data.deleted_count} summaries`);
      fetchSummaryStatus();
    } catch (err) {
      setError('Failed to delete summaries: ' + (err.response?.data?.error || err.message));
    } finally {
      setDeleting(false);
    }
  };

  const handleGeocodeAddresses = async () => {
    if (!window.confirm('Geocode all addresses? This may take several minutes (~1 second per address due to rate limiting).')) {
      return;
    }

    setGeocoding(true);
    setError('');
    setSuccess('');

    try {
      const response = await api.post('/map/geocode-all');
      setSuccess('Geocoding started in background! This will take ~1 second per address. Refresh the map page in a few minutes to see results.');
    } catch (err) {
      setError('Failed to start geocoding: ' + (err.response?.data?.error || err.message));
    } finally {
      setGeocoding(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    setError('');
    setSuccess('');
    setTestResult(null);
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    setError('');

    try {
      const response = await api.post('/settings/ai/test-connection', {
        base_url: settings.ai_api_url,
        model: settings.ai_model
      });

      setTestResult({
        success: true,
        message: response.data.message,
        models: response.data.models
      });
    } catch (err) {
      setTestResult({
        success: false,
        message: err.response?.data?.error || 'Connection test failed'
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      await api.put('/settings/ai', settings);
      setSuccess('Settings saved successfully!');

      // If disabled, redirect to dashboard
      if (!settings.ai_assistant_enabled) {
        setTimeout(() => navigate('/dashboard'), 1500);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="settings-container">
          <div className="loading">Loading settings...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="settings-container">
        <div className="settings-header">
          <h1>AI Assistant Settings</h1>
          <p>Configure your local LLM for the AI assistant feature</p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <form onSubmit={handleSubmit} className="settings-form">
          {/* Enable/Disable Toggle */}
          <div className="form-section">
            <h2>Assistant Status</h2>
            <div className="form-group checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="ai_assistant_enabled"
                  checked={settings.ai_assistant_enabled}
                  onChange={handleChange}
                />
                <span>Enable AI Assistant</span>
              </label>
              <p className="help-text">
                Toggle the AI assistant feature on or off. When enabled, you'll see a chat button to ask questions about your network.
              </p>
            </div>
          </div>

          {/* LLM Configuration */}
          <div className={`form-section ${!settings.ai_assistant_enabled ? 'disabled' : ''}`}>
            <h2>LLM Configuration</h2>

            <div className="form-group">
              <label htmlFor="ai_provider">AI Provider *</label>
              <select
                id="ai_provider"
                name="ai_provider"
                value={settings.ai_provider || 'local'}
                onChange={handleChange}
                required={settings.ai_assistant_enabled}
                disabled={!settings.ai_assistant_enabled}
              >
                <option value="local">Local Server (LM Studio, Ollama)</option>
                <option value="openai">OpenAI</option>
                <option value="mock">Mock (for testing)</option>
              </select>
              <p className="help-text">
                Choose your LLM provider
              </p>
            </div>

            <div className="form-group">
              <label htmlFor="ai_api_url">API URL *</label>
              <input
                type="text"
                id="ai_api_url"
                name="ai_api_url"
                value={settings.ai_api_url}
                onChange={handleChange}
                placeholder="http://192.168.1.165:1234"
                required={settings.ai_assistant_enabled}
                disabled={!settings.ai_assistant_enabled}
              />
              <p className="help-text">
                URL of your LLM server (LM Studio, Ollama, etc.)
              </p>
            </div>

            <div className="form-group">
              <label htmlFor="ai_model">Model Name *</label>
              <input
                type="text"
                id="ai_model"
                name="ai_model"
                value={settings.ai_model}
                onChange={handleChange}
                placeholder="openai/gpt-oss-20b"
                required={settings.ai_assistant_enabled}
                disabled={!settings.ai_assistant_enabled}
              />
              <p className="help-text">
                Name of the model to use (e.g., llama2, mistral, openai/gpt-oss-20b)
              </p>
            </div>

            <div className="form-group">
              <label htmlFor="ai_max_results">Max Results</label>
              <input
                type="number"
                id="ai_max_results"
                name="ai_max_results"
                value={settings.ai_max_results}
                onChange={handleChange}
                min="50"
                max="1000"
                disabled={!settings.ai_assistant_enabled}
              />
              <p className="help-text">
                Maximum number of items to return in function responses (50-1000)
              </p>
            </div>

            <div className="form-group">
              <label htmlFor="ai_timeout">Request Timeout (seconds) *</label>
              <input
                type="number"
                id="ai_timeout"
                name="ai_timeout"
                value={settings.ai_timeout}
                onChange={handleChange}
                min="10"
                max="600"
                required={settings.ai_assistant_enabled}
                disabled={!settings.ai_assistant_enabled}
              />
              <p className="help-text">
                Maximum time to wait for LLM responses in seconds (10-600). Default: 200 seconds. Increase for slower models or complex queries.
              </p>
            </div>

            {/* Test Connection Button */}
            <div className="form-group">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={!settings.ai_assistant_enabled || testing}
                className="btn-secondary"
              >
                {testing ? 'Testing...' : 'Test Connection'}
              </button>

              {testResult && (
                <div className={`test-result ${testResult.success ? 'success' : 'error'}`}>
                  <strong>{testResult.success ? '✓ Success' : '✗ Failed'}</strong>
                  <p>{testResult.message}</p>
                  {testResult.models && testResult.models.length > 0 && (
                    <div className="models-list">
                      <small>Available models: {testResult.models.join(', ')}</small>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Person Summaries Section */}
          <div className={`form-section ${!settings.ai_assistant_enabled ? 'disabled' : ''}`}>
            <h2>Person Summaries</h2>
            <p className="help-text">
              Generate comprehensive AI summaries for each person in your network. Summaries analyze all data
              (biographical, professional, relationships, events, favors, assets) to provide deep insights.
            </p>

            <div className="summary-status" style={{
              padding: '15px',
              background: '#f8f9fa',
              borderRadius: '8px',
              marginBottom: '15px'
            }}>
              <div style={{ marginBottom: '8px' }}>
                <strong style={{ fontSize: '18px', color: '#2c3e50' }}>
                  Summary A: {summaryStatus.summary_a_count} / {summaryStatus.total_people}
                </strong>
              </div>
              <div>
                <strong style={{ fontSize: '18px', color: '#2c3e50' }}>
                  Summary B: {summaryStatus.summary_b_count} / {summaryStatus.total_people}
                </strong>
              </div>
            </div>

            <div className="form-group" style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={handleGenerateSummaries}
                disabled={!settings.ai_assistant_enabled || generating || deleting}
                className="btn-primary"
                style={{ width: 'auto', minWidth: '250px' }}
              >
                {generating
                  ? `Generating${progress.summaryType ? ` ${progress.summaryType}` : ''}... (${progress.current}/${progress.total})`
                  : 'Generate / Update Summaries'}
              </button>

              <button
                type="button"
                onClick={handleDeleteAllSummaries}
                disabled={!settings.ai_assistant_enabled || generating || deleting || (summaryStatus.summary_a_count === 0 && summaryStatus.summary_b_count === 0)}
                className="btn-secondary"
                style={{
                  width: 'auto',
                  minWidth: '200px',
                  background: '#e74c3c',
                  color: 'white',
                  border: '2px solid #c0392b'
                }}
              >
                {deleting ? 'Deleting...' : 'Delete all summaries'}
              </button>

              {generating && progress.personName && (
                <div style={{
                  marginTop: '15px',
                  padding: '12px',
                  background: '#e8f4f8',
                  borderRadius: '6px',
                  color: '#2c3e50',
                  width: '100%'
                }}>
                  <strong>Currently processing:</strong> {progress.personName}
                  {progress.summaryType && <span> (Summary {progress.summaryType})</span>}
                </div>
              )}
            </div>
          </div>

          {/* Map Geocoding Section */}
          <div className="form-section">
            <h2>Map Geocoding</h2>
            <p className="help-text">
              Convert all addresses to map coordinates for the location map feature.
              Takes approximately 1 second per address due to OpenStreetMap rate limiting.
            </p>

            <div className="form-group">
              <button
                type="button"
                onClick={handleGeocodeAddresses}
                disabled={geocoding}
                className="btn-primary"
                style={{ width: 'auto', minWidth: '250px' }}
              >
                {geocoding ? 'Geocoding...' : 'Geocode All Addresses'}
              </button>
            </div>

            <p className="help-text" style={{ marginTop: '10px', fontSize: '13px', color: '#7f8c8d' }}>
              <strong>Note:</strong> New and edited addresses are automatically geocoded.
              Use this button only for existing addresses that haven't been geocoded yet.
            </p>
          </div>

          {/* UI Preferences Section */}
          <div className="form-section">
            <h2>UI Preferences</h2>
            <p className="help-text">
              Control the visibility of summary types in person profiles
            </p>

            <div className="form-group checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="show_summary_a"
                  checked={uiPreferences.show_summary_a}
                  onChange={handleUIPreferenceChange}
                />
                <span>Show Summary A in person profiles</span>
              </label>
              <p className="help-text">
                Summary A is a plain-text fact listing of all person data and their connections
              </p>
            </div>

            <div className="form-group checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="show_summary_b"
                  checked={uiPreferences.show_summary_b}
                  onChange={handleUIPreferenceChange}
                />
                <span>Show Summary B in person profiles</span>
              </label>
              <p className="help-text">
                Summary B is an AI-generated analytical overview based on Summary A
              </p>
            </div>
          </div>

          {/* Save Button */}
          <div className="form-actions">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn-primary"
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
};

export default Settings;
