import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import * as d3 from 'd3';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import Layout from '../components/Layout';
import api from '../services/api';

// Fix for default marker icons in Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

// Custom icons for different marker types
const personIcon = new L.Icon({
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
  className: 'marker-person'
});

const assetIcon = new L.Icon({
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
  className: 'marker-asset'
});

// Component to auto-fit map bounds to markers
const AutoFitBounds = ({ locations }) => {
  const map = useMap();

  useEffect(() => {
    if (locations.length > 0) {
      const bounds = L.latLngBounds(
        locations.map(loc => [loc.latitude, loc.longitude])
      );
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  }, [locations, map]);

  return null;
};

const NetworkGraph = () => {
  // Tab state
  const [activeTab, setActiveTab] = useState('network');

  // Network Graph state
  const svgRef = useRef();
  const [networkData, setNetworkData] = useState(null);
  const [allPeople, setAllPeople] = useState([]); // For dropdown
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedNode, setSelectedNode] = useState(null);
  const [pathfindingMode, setPathfindingMode] = useState(false);
  const [personA, setPersonA] = useState('');
  const [personB, setPersonB] = useState('');
  const [pathResult, setPathResult] = useState(null);
  const [focusPerson, setFocusPerson] = useState('');
  const [degreeFilter, setDegreeFilter] = useState(3);
  const [focusData, setFocusData] = useState(null);
  const [expandedPaths, setExpandedPaths] = useState([0]); // Track which paths are expanded (first one by default)

  // Map state
  const [people, setPeople] = useState([]);
  const [assets, setAssets] = useState([]);
  const [failedLocations, setFailedLocations] = useState({ people: [], assets: [] });
  const [mapLoading, setMapLoading] = useState(true);
  const [mapError, setMapError] = useState('');
  const [stats, setStats] = useState({});
  const [showPeople, setShowPeople] = useState(true);
  const [showAssets, setShowAssets] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedId, setHighlightedId] = useState(null);
  const [showFailedList, setShowFailedList] = useState(false);

  const fetchNetworkData = useCallback(async () => {
    try {
      const response = await api.get('/network/graph');
      setNetworkData(response.data);
      setAllPeople(response.data.nodes || []); // Store for dropdown
      setLoading(false);
    } catch (err) {
      setError('Failed to load network data');
      setLoading(false);
    }
  }, []);

  const fetchFocusedGraph = useCallback(async () => {
    try {
      const response = await api.get('/network/focus', {
        params: {
          person_id: focusPerson,
          degrees: degreeFilter
        }
      });
      setFocusData(response.data);
      setNetworkData(response.data); // Update displayed graph
    } catch (err) {
      setError('Failed to load focused graph data');
    }
  }, [focusPerson, degreeFilter]);

  const getNodeColor = useCallback((node) => {
    // If in focus mode, color by degree from focal person
    if (focusPerson && node.degreeFromFocus !== undefined) {
      if (node.isFocalPerson) return '#e74c3c'; // Red for focal person
      const degreeColors = ['#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c', '#95a5a6'];
      return degreeColors[(node.degreeFromFocus - 1) % degreeColors.length] || '#95a5a6';
    }
    // Default: Color by cluster
    const colors = ['#3498db', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c'];
    return colors[node.cluster % colors.length];
  }, [focusPerson]);

  const handleFocusPersonChange = useCallback((personId) => {
    setFocusPerson(personId);
    setSelectedNode(null);
    setPathResult(null);
    setPathfindingMode(false);
    setDegreeFilter(3); // Reset to default degree when changing focus person

    if (!personId) {
      // Reset to full network
      setFocusData(null);
      fetchNetworkData();
    }
  }, [fetchNetworkData]);

  const handleNodeClick = useCallback((node) => {
    // Clicking a node sets it as the focus person
    handleFocusPersonChange(node.id);
  }, [handleFocusPersonChange]);

  const renderGraph = useCallback(() => {
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = svgRef.current.parentElement.clientWidth;
    const height = 600;

    const g = svg
      .attr('width', width)
      .attr('height', height)
      .append('g');

    // Add zoom behavior
    const zoom = d3.zoom()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);

    // Create force simulation
    const simulation = d3.forceSimulation(networkData.nodes)
      .force('link', d3.forceLink(networkData.links)
        .id(d => d.id)
        .distance(d => 150 - (d.strength * 20)))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(40));

    // Create links
    const link = g.append('g')
      .selectAll('line')
      .data(networkData.links)
      .enter()
      .append('line')
      .attr('stroke', '#95a5a6')
      .attr('stroke-width', d => d.strength)
      .attr('stroke-opacity', 0.6);

    // Create nodes
    const node = g.append('g')
      .selectAll('g')
      .data(networkData.nodes)
      .enter()
      .append('g')
      .call(d3.drag()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended));

    // Add circles for nodes
    node.append('circle')
      .attr('r', 15)
      .attr('fill', d => getNodeColor(d))
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .style('cursor', 'pointer')
      .on('click', (event, d) => {
        event.stopPropagation();
        handleNodeClick(d);
      })
      .on('mouseover', function(event, d) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('r', 20);
      })
      .on('mouseout', function(event, d) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('r', 15);
      });

    // Add labels
    node.append('text')
      .text(d => d.name)
      .attr('x', 0)
      .attr('y', -20)
      .attr('text-anchor', 'middle')
      .attr('font-size', '12px')
      .attr('fill', '#2c3e50')
      .attr('font-weight', '500')
      .style('pointer-events', 'none');

    // Update positions on each tick
    simulation.on('tick', () => {
      link
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);

      node.attr('transform', d => `translate(${d.x},${d.y})`);
    });

    function dragstarted(event, d) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event, d) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event, d) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }
  }, [networkData, getNodeColor, handleNodeClick]);

  useEffect(() => {
    fetchNetworkData();
  }, [fetchNetworkData]);

  useEffect(() => {
    if (focusPerson) {
      fetchFocusedGraph();
    }
  }, [focusPerson, fetchFocusedGraph]);

  useEffect(() => {
    if (networkData) {
      renderGraph();
    }
  }, [networkData, renderGraph]);

  const handleDegreeFilterChange = (degrees) => {
    setDegreeFilter(degrees);
  };

  const findPathBetweenPeople = async () => {
    if (!personA || !personB) {
      setError('Please select both people');
      return;
    }

    if (personA === personB) {
      setError('Please select different people');
      return;
    }

    try {
      setError('');
      const response = await api.get('/network/path', {
        params: {
          from: personA,
          to: personB,
        },
      });
      setPathResult(response.data);
    } catch (err) {
      setError('Failed to find path');
    }
  };

  const resetPathfinding = () => {
    setPathfindingMode(false);
    setPersonA('');
    setPersonB('');
    setPathResult(null);
    setError('');
    setExpandedPaths([0]); // Reset to first path expanded
  };

  const togglePathExpanded = (index) => {
    setExpandedPaths(prev =>
      prev.includes(index)
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  const getDegreeColor = (degrees) => {
    if (degrees === 1) return '#27ae60'; // green
    if (degrees === 2) return '#2ecc71'; // light green
    if (degrees === 3) return '#f39c12'; // yellow/orange
    if (degrees === 4) return '#e67e22'; // orange
    if (degrees === 5) return '#e74c3c'; // red
    return '#c0392b'; // dark red (6+)
  };

  // Map functions
  const fetchLocations = useCallback(async () => {
    try {
      setMapLoading(true);
      const response = await api.get('/map/locations');
      setPeople(response.data.people || []);
      setAssets(response.data.assets || []);
      setStats(response.data.stats || {});
      setMapLoading(false);
    } catch (err) {
      setMapError('Failed to load map locations');
      setMapLoading(false);
    }
  }, []);

  const fetchFailedLocations = useCallback(async () => {
    try {
      const response = await api.get('/map/failed');
      setFailedLocations(response.data);
    } catch (err) {
      console.error('Failed to fetch geocoding errors:', err);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'map') {
      fetchLocations();
      fetchFailedLocations();
    }
  }, [activeTab, fetchLocations, fetchFailedLocations]);

  const retryGeocoding = async (type, id) => {
    try {
      const endpoint = type === 'person' ? `/map/geocode/person/${id}` : `/map/geocode/asset/${id}`;
      await api.post(endpoint);
      alert('Geocoding retry successful! Refreshing map...');
      fetchLocations();
      fetchFailedLocations();
    } catch (err) {
      alert(`Geocoding failed: ${err.response?.data?.error || 'Unknown error'}`);
    }
  };

  const filteredLocations = useMemo(() => {
    let locations = [];

    if (showPeople) {
      locations = [...locations, ...people];
    }

    if (showAssets) {
      locations = [...locations, ...assets];
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      locations = locations.filter(loc =>
        loc.name.toLowerCase().includes(query) ||
        loc.address.toLowerCase().includes(query)
      );
    }

    return locations;
  }, [people, assets, showPeople, showAssets, searchQuery]);

  const mapCenter = useMemo(() => {
    if (filteredLocations.length === 0) {
      return [38.7223, -9.1393]; // Default to Lisbon, Portugal
    }

    const avgLat = filteredLocations.reduce((sum, loc) => sum + loc.latitude, 0) / filteredLocations.length;
    const avgLng = filteredLocations.reduce((sum, loc) => sum + loc.longitude, 0) / filteredLocations.length;

    return [avgLat, avgLng];
  }, [filteredLocations]);

  const handleSearch = (e) => {
    const query = e.target.value;
    setSearchQuery(query);

    if (query && filteredLocations.length > 0) {
      setHighlightedId(filteredLocations[0].id);
    } else {
      setHighlightedId(null);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div>Loading network graph...</div>
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
        <h1 style={{ margin: '0 0 15px 0' }}>Network Visualization</h1>

        {/* Tab Navigation */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '2px solid #ecf0f1' }}>
          <button
            onClick={() => setActiveTab('network')}
            style={{
              padding: '10px 20px',
              background: activeTab === 'network' ? '#3498db' : 'transparent',
              color: activeTab === 'network' ? 'white' : '#7f8c8d',
              border: 'none',
              borderBottom: activeTab === 'network' ? '3px solid #2980b9' : '3px solid transparent',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              transition: 'all 0.2s'
            }}
          >
            Network Graph
          </button>
          <button
            onClick={() => setActiveTab('map')}
            style={{
              padding: '10px 20px',
              background: activeTab === 'map' ? '#3498db' : 'transparent',
              color: activeTab === 'map' ? 'white' : '#7f8c8d',
              border: 'none',
              borderBottom: activeTab === 'map' ? '3px solid #2980b9' : '3px solid transparent',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              transition: 'all 0.2s'
            }}
          >
            World Map
          </button>
        </div>
      </div>

      {/* Network Graph Tab */}
      {activeTab === 'network' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <p style={{ margin: '0' }}>
                {focusPerson && focusData && focusData.focal_person
                  ? `Network focused on ${focusData.focal_person.name}`
                  : 'Visualize your social network connections'}
              </p>
            </div>
            <div style={{ minWidth: '300px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: '#7f8c8d', marginBottom: '5px', fontWeight: '600' }}>
                Focus Person:
              </label>
              <select
                value={focusPerson}
                onChange={(e) => handleFocusPersonChange(e.target.value)}
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
                <option value="">All People (Full Network)</option>
                {allPeople.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

      {/* Pathfinding Section */}
      {pathfindingMode && (
        <div className="card" style={{ marginBottom: '20px' }}>
          <h3>Find Connection Path</h3>
          <p style={{ color: '#7f8c8d', fontSize: '14px', marginBottom: '20px' }}>
            Select two people to find the connection path between them
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '15px', alignItems: 'end' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                Person A <span style={{ color: '#e74c3c' }}>*</span>
              </label>
              <select
                value={personA}
                onChange={(e) => setPersonA(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #dfe6e9',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              >
                <option value="">Select person...</option>
                {networkData.nodes.map((node) => (
                  <option key={node.id} value={node.id}>
                    {node.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                Person B <span style={{ color: '#e74c3c' }}>*</span>
              </label>
              <select
                value={personB}
                onChange={(e) => setPersonB(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #dfe6e9',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              >
                <option value="">Select person...</option>
                {networkData.nodes.map((node) => (
                  <option key={node.id} value={node.id}>
                    {node.name}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={findPathBetweenPeople}
                className="btn btn-primary"
                disabled={!personA || !personB}
              >
                Find Path
              </button>
              <button
                onClick={resetPathfinding}
                className="btn btn-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: selectedNode || pathResult || focusPerson ? '3fr 1fr' : '1fr', gap: '20px' }}>
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '15px', borderBottom: '1px solid #ecf0f1', background: '#f8f9fa' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', fontSize: '13px', color: '#7f8c8d', flexWrap: 'wrap' }}>
              <div>
                <strong>{networkData.nodes.length}</strong> People
              </div>
              <div>
                <strong>{networkData.links.length}</strong> Relationships
              </div>
              {!pathfindingMode && (
                <button
                  onClick={() => {
                    setPathfindingMode(true);
                    setSelectedNode(null);
                  }}
                  className="btn btn-primary"
                  style={{ marginLeft: 'auto', padding: '6px 12px', fontSize: '12px' }}
                >
                  Find Connection
                </button>
              )}
              <div style={{ color: '#555', marginLeft: pathfindingMode ? 'auto' : '0' }}>
                💡 Click and drag nodes • Scroll to zoom • Click nodes for details
              </div>
            </div>
          </div>
          <svg ref={svgRef} style={{ background: '#fafbfc', width: '100%' }}></svg>
        </div>

        {pathResult && (
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '15px' }}>
              <h3 style={{ margin: 0 }}>Connection Paths</h3>
              <button
                onClick={resetPathfinding}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '18px',
                  cursor: 'pointer',
                  color: '#7f8c8d',
                }}
              >
                ×
              </button>
            </div>

            {pathResult.found ? (
              <>
                <div style={{ fontSize: '14px', marginBottom: '15px', padding: '12px', background: '#d5f4e6', borderRadius: '6px', color: '#27ae60' }}>
                  <strong>✓ {pathResult.totalFound} Connection{pathResult.totalFound > 1 ? 's' : ''} Found!</strong>
                  {pathResult.totalFound > 10 && <span style={{ display: 'block', marginTop: '5px', fontSize: '12px' }}>(Showing top 10 paths)</span>}
                </div>

                <div className="path-accordion">
                  {pathResult.paths && pathResult.paths.map((pathData, pathIndex) => {
                    const isExpanded = expandedPaths.includes(pathIndex);
                    return (
                      <div key={pathIndex} className="path-accordion-item">
                        <div
                          className="path-accordion-header"
                          onClick={() => togglePathExpanded(pathIndex)}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '12px 15px',
                            background: '#f8f9fa',
                            borderRadius: '6px',
                            marginBottom: isExpanded ? '10px' : '8px',
                            cursor: 'pointer',
                            border: `2px solid ${getDegreeColor(pathData.degrees)}`,
                            transition: 'all 0.2s',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '50%',
                              background: getDegreeColor(pathData.degrees),
                              color: 'white',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '14px',
                              fontWeight: 'bold'
                            }}>
                              {pathIndex + 1}
                            </div>
                            <div>
                              <div style={{ fontSize: '13px', fontWeight: '600', color: '#2c3e50' }}>
                                {pathData.degrees} degree{pathData.degrees > 1 ? 's' : ''} • Score: {pathData.qualityScore}
                              </div>
                              <div style={{ fontSize: '11px', color: '#7f8c8d', marginTop: '2px' }}>
                                Min strength: {pathData.strength}/5
                              </div>
                            </div>
                          </div>
                          <div style={{
                            fontSize: '16px',
                            color: '#7f8c8d',
                            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                            transition: 'transform 0.2s'
                          }}>
                            ▼
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="path-accordion-body" style={{ paddingLeft: '15px', paddingBottom: '15px' }}>
                            <div style={{ marginTop: '5px' }}>
                              {pathData.pathWithDetails && pathData.pathWithDetails.map((person, idx) => {
                                return (
                                  <div key={person.id} style={{ marginBottom: '8px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                      <div style={{
                                        width: '24px',
                                        height: '24px',
                                        borderRadius: '50%',
                                        background: idx === 0 ? '#3498db' : idx === pathData.pathWithDetails.length - 1 ? '#e74c3c' : '#95a5a6',
                                        color: 'white',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '12px',
                                        fontWeight: 'bold'
                                      }}>
                                        {idx + 1}
                                      </div>
                                      <div style={{ fontSize: '13px' }}>{person.name}</div>
                                    </div>
                                    {idx < pathData.pathWithDetails.length - 1 && (
                                      <div style={{ marginLeft: '12px', height: '16px', borderLeft: '2px solid #ecf0f1' }} />
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: '14px', marginBottom: '15px', padding: '12px', background: '#ffeaa7', borderRadius: '6px', color: '#d63031' }}>
                  <strong>⚠ No Connection Found</strong>
                </div>
                <p style={{ fontSize: '13px', color: '#555', marginBottom: '15px' }}>
                  {pathResult.message}
                </p>
                {pathResult.suggestedIntermediaries && pathResult.suggestedIntermediaries.length > 0 && (
                  <div>
                    <strong style={{ fontSize: '13px', color: '#7f8c8d' }}>Suggested Intermediaries:</strong>
                    <ul style={{ fontSize: '13px', color: '#555', marginTop: '8px', paddingLeft: '20px' }}>
                      {pathResult.suggestedIntermediaries.map(person => (
                        <li key={person.id}>{person.name}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {focusPerson && focusData && !pathResult && (
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '15px' }}>
              <h3 style={{ margin: 0 }}>{focusData.focal_person?.name || 'Focus'}</h3>
              <button
                onClick={() => handleFocusPersonChange('')}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '18px',
                  cursor: 'pointer',
                  color: '#7f8c8d',
                }}
              >
                ×
              </button>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', fontSize: '13px', color: '#7f8c8d', marginBottom: '8px', fontWeight: '600' }}>
                Degrees of Separation:
              </label>
              <select
                value={degreeFilter}
                onChange={(e) => handleDegreeFilterChange(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #dfe6e9',
                  borderRadius: '6px',
                  fontSize: '14px',
                  background: 'white',
                  cursor: 'pointer'
                }}
              >
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="4">4</option>
                <option value="5">5</option>
                <option value="6">6</option>
                <option value="all">All</option>
              </select>
            </div>

            <div style={{ fontSize: '14px', color: '#555', marginBottom: '10px' }}>
              <strong>Connections:</strong> {focusData.total_connections || 0}
            </div>

            {focusData.degree_counts && Object.keys(focusData.degree_counts).length > 1 && (
              <div style={{ fontSize: '13px', color: '#7f8c8d', marginBottom: '10px' }}>
                {Object.entries(focusData.degree_counts)
                  .filter(([degree]) => degree !== '0')
                  .sort(([a], [b]) => parseInt(a) - parseInt(b))
                  .map(([degree, count]) => `N${degree}: ${count}`)
                  .join(', ')}
              </div>
            )}

            <div style={{ fontSize: '14px', color: '#555', marginBottom: '10px' }}>
              <strong>Cluster:</strong> {focusData.focal_person?.cluster || 'N/A'}
            </div>

            <div style={{ fontSize: '14px', color: '#555', marginBottom: '20px' }}>
              <strong>Centrality Score:</strong> {focusData.focal_person?.centrality?.toFixed(2) || 'N/A'}
            </div>

            <a
              href={`/people/${focusPerson}`}
              className="btn btn-primary"
              style={{ width: '100%', textAlign: 'center', display: 'block', textDecoration: 'none' }}
            >
              View Full Profile
            </a>
          </div>
        )}

        {selectedNode && !pathResult && !focusPerson && (
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '15px' }}>
              <h3 style={{ margin: 0 }}>{selectedNode.name}</h3>
              <button
                onClick={() => setSelectedNode(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '18px',
                  cursor: 'pointer',
                  color: '#7f8c8d',
                }}
              >
                ×
              </button>
            </div>

            <div style={{ fontSize: '14px', color: '#555', marginBottom: '10px' }}>
              <strong>Connections:</strong> {selectedNode.degree}
            </div>

            <div style={{ fontSize: '14px', color: '#555', marginBottom: '10px' }}>
              <strong>Cluster:</strong> {selectedNode.cluster}
            </div>

            <div style={{ fontSize: '14px', color: '#555', marginBottom: '20px' }}>
              <strong>Centrality Score:</strong> {selectedNode.centrality?.toFixed(2) || 'N/A'}
            </div>

            <a
              href={`/people/${selectedNode.id}`}
              className="btn btn-primary"
              style={{ width: '100%', textAlign: 'center', display: 'block', textDecoration: 'none' }}
            >
              View Full Profile
            </a>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="card">
        <h3>Legend</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
          <div>
            <strong>Link Thickness:</strong> Relationship strength (1-5)
          </div>
          <div>
            <strong>Node Color:</strong> Community cluster
          </div>
          <div>
            <strong>Centrality:</strong> Network influence score
          </div>
        </div>
      </div>

      {/* Statistics */}
      {networkData.statistics && (
        <div className="card">
          <h3>Network Statistics</h3>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-value">{networkData.statistics.total_nodes}</div>
              <div className="stat-label">Total Nodes</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{networkData.statistics.total_edges}</div>
              <div className="stat-label">Total Edges</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{networkData.statistics.clusters}</div>
              <div className="stat-label">Clusters</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{networkData.statistics.avg_degree?.toFixed(1)}</div>
              <div className="stat-label">Avg Connections</div>
            </div>
          </div>
        </div>
      )}
        </>
      )}

      {/* World Map Tab */}
      {activeTab === 'map' && (
        <>
          {mapLoading ? (
            <div>Loading map...</div>
          ) : mapError ? (
            <div className="error-message">{mapError}</div>
          ) : (
            <>
              <p style={{ marginBottom: '20px' }}>Geographic view of your network and assets</p>

              {/* Statistics */}
              <div className="stats-grid" style={{ marginBottom: '20px' }}>
                <div className="stat-card">
                  <div className="stat-value">{filteredLocations.length}</div>
                  <div className="stat-label">Locations Shown</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value" style={{ color: '#3498db' }}>
                    {stats.geocodedPeople || 0}
                  </div>
                  <div className="stat-label">People Located</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value" style={{ color: '#e74c3c' }}>
                    {stats.geocodedAssets || 0}
                  </div>
                  <div className="stat-label">Assets Located</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value" style={{ color: (failedLocations.people?.length || 0) + (failedLocations.assets?.length || 0) > 0 ? '#f39c12' : '#95a5a6' }}>
                    {(failedLocations.people?.length || 0) + (failedLocations.assets?.length || 0)}
                  </div>
                  <div className="stat-label">Failed to Geocode</div>
                </div>
              </div>

              {/* Filters and Controls */}
              <div className="card" style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
                  {/* Search */}
                  <div style={{ flex: '1 1 300px' }}>
                    <label style={{ display: 'block', fontSize: '12px', color: '#7f8c8d', marginBottom: '5px', fontWeight: '600' }}>
                      Search Locations:
                    </label>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={handleSearch}
                      placeholder="Search by name or address..."
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '2px solid #3498db',
                        borderRadius: '6px',
                        fontSize: '14px'
                      }}
                    />
                  </div>

                  {/* Filter Toggles */}
                  <div style={{ display: 'flex', gap: '15px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={showPeople}
                        onChange={(e) => setShowPeople(e.target.checked)}
                        style={{ marginRight: '8px', width: '18px', height: '18px' }}
                      />
                      <span style={{ fontSize: '14px', color: '#3498db', fontWeight: '600' }}>
                        Show People ({people.length})
                      </span>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={showAssets}
                        onChange={(e) => setShowAssets(e.target.checked)}
                        style={{ marginRight: '8px', width: '18px', height: '18px' }}
                      />
                      <span style={{ fontSize: '14px', color: '#e74c3c', fontWeight: '600' }}>
                        Show Properties ({assets.length})
                      </span>
                    </label>
                  </div>

                  {/* Failed Geocoding Toggle */}
                  {((failedLocations.people?.length || 0) + (failedLocations.assets?.length || 0)) > 0 && (
                    <button
                      onClick={() => setShowFailedList(!showFailedList)}
                      className="btn btn-secondary"
                      style={{ marginLeft: 'auto' }}
                    >
                      {showFailedList ? 'Hide' : 'Show'} Failed ({(failedLocations.people?.length || 0) + (failedLocations.assets?.length || 0)})
                    </button>
                  )}
                </div>
              </div>

              {/* Failed Geocoding List */}
              {showFailedList && ((failedLocations.people?.length || 0) + (failedLocations.assets?.length || 0)) > 0 && (
                <div className="card" style={{ marginBottom: '20px', background: '#fff3cd', borderLeft: '4px solid #f39c12' }}>
                  <h3 style={{ margin: '0 0 15px 0', color: '#856404' }}>Failed to Geocode</h3>
                  <p style={{ fontSize: '14px', color: '#856404', marginBottom: '15px' }}>
                    The following addresses could not be geocoded. Try editing the address to be more complete or click "Retry" to attempt geocoding again.
                  </p>

                  {failedLocations.people.length > 0 && (
                    <>
                      <h4 style={{ fontSize: '14px', color: '#856404', marginBottom: '10px' }}>People:</h4>
                      {failedLocations.people.map(person => (
                        <div key={person.id} style={{ marginBottom: '10px', padding: '10px', background: 'white', borderRadius: '4px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <strong>{person.name}</strong> - {person.address}
                              <div style={{ fontSize: '12px', color: '#95a5a6', marginTop: '4px' }}>
                                Error: {person.error}
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <Link to={`/people/${person.id}/edit`} className="btn btn-secondary" style={{ fontSize: '12px', padding: '4px 8px' }}>
                                Edit
                              </Link>
                              <button
                                onClick={() => retryGeocoding('person', person.id)}
                                className="btn btn-primary"
                                style={{ fontSize: '12px', padding: '4px 8px' }}
                              >
                                Retry
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </>
                  )}

                  {failedLocations.assets.length > 0 && (
                    <>
                      <h4 style={{ fontSize: '14px', color: '#856404', marginBottom: '10px', marginTop: '15px' }}>Assets:</h4>
                      {failedLocations.assets.map(asset => (
                        <div key={asset.id} style={{ marginBottom: '10px', padding: '10px', background: 'white', borderRadius: '4px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <strong>{asset.ownerName} - {asset.assetType}</strong> - {asset.address}
                              <div style={{ fontSize: '12px', color: '#95a5a6', marginTop: '4px' }}>
                                Error: {asset.error}
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <Link to={`/assets/${asset.id}/edit`} className="btn btn-secondary" style={{ fontSize: '12px', padding: '4px 8px' }}>
                                Edit
                              </Link>
                              <button
                                onClick={() => retryGeocoding('asset', asset.id)}
                                className="btn btn-primary"
                                style={{ fontSize: '12px', padding: '4px 8px' }}
                              >
                                Retry
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )}

              {/* Map Container */}
              {filteredLocations.length === 0 ? (
                <div className="card">
                  <p style={{ color: '#7f8c8d', textAlign: 'center' }}>
                    No locations to display. Add addresses to people or assets to see them on the map.
                  </p>
                </div>
              ) : (
                <div className="card" style={{ padding: 0, height: '600px', overflow: 'hidden' }}>
                  <MapContainer
                    center={mapCenter}
                    zoom={13}
                    style={{ height: '100%', width: '100%' }}
                    scrollWheelZoom={true}
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />

                    <AutoFitBounds locations={filteredLocations} />

                    {filteredLocations.map(location => (
                      <Marker
                        key={`${location.type}-${location.id}`}
                        position={[location.latitude, location.longitude]}
                        icon={location.type === 'person' ? personIcon : assetIcon}
                        opacity={highlightedId === location.id ? 1 : 0.8}
                      >
                        <Popup>
                          <div style={{ minWidth: '200px' }}>
                            <h3 style={{ margin: '0 0 10px 0', fontSize: '16px', color: '#2c3e50' }}>
                              {location.name}
                            </h3>

                            <div style={{ fontSize: '13px', marginBottom: '8px' }}>
                              <strong>Address:</strong><br />
                              {location.address}
                            </div>

                            {location.type === 'person' && (
                              <>
                                {location.email && (
                                  <div style={{ fontSize: '13px', marginBottom: '4px' }}>
                                    <strong>Email:</strong> {location.email}
                                  </div>
                                )}
                                {location.phone && (
                                  <div style={{ fontSize: '13px', marginBottom: '4px' }}>
                                    <strong>Phone:</strong> {location.phone}
                                  </div>
                                )}
                                <Link
                                  to={`/people/${location.id}`}
                                  style={{ display: 'inline-block', marginTop: '8px', color: '#3498db', textDecoration: 'none', fontSize: '13px' }}
                                >
                                  View Profile →
                                </Link>
                              </>
                            )}

                            {location.type === 'asset' && (
                              <>
                                <div style={{ fontSize: '13px', marginBottom: '4px' }}>
                                  <strong>Type:</strong> {location.assetType}
                                </div>
                                <div style={{ fontSize: '13px', marginBottom: '4px' }}>
                                  <strong>Owner:</strong> {location.ownerName}
                                </div>
                                {location.availability && (
                                  <div style={{ fontSize: '13px', marginBottom: '4px' }}>
                                    <strong>Availability:</strong> {location.availability}
                                  </div>
                                )}
                                <Link
                                  to={`/assets/${location.id}`}
                                  style={{ display: 'inline-block', marginTop: '8px', color: '#e74c3c', textDecoration: 'none', fontSize: '13px' }}
                                >
                                  View Asset →
                                </Link>
                              </>
                            )}
                          </div>
                        </Popup>
                      </Marker>
                    ))}
                  </MapContainer>
                </div>
              )}
            </>
          )}
        </>
      )}
    </Layout>
  );
};

export default NetworkGraph;
