const pool = require('../db/connection');

/**
 * Network Graph Service
 * Generates data for D3.js force-directed graph visualization
 */
class NetworkGraphService {
  /**
   * Get network graph data (nodes and links)
   */
  static async getGraphData(userId, { type, min_strength } = {}) {
    // Get all people (nodes)
    const nodesResult = await pool.query(
      'SELECT id, name, photo_url, importance FROM people WHERE user_id = $1',
      [userId]
    );

    const nodes = nodesResult.rows.map(p => ({
      id: p.id,
      name: p.name,
      picture: p.photo_url,
      importance: p.importance
    }));

    // Get relationships (links)
    let linksQuery = `
      SELECT person_a_id as source, person_b_id as target, relationship_type as type, strength
      FROM relationships
      WHERE user_id = $1
    `;
    const params = [userId];

    if (type) {
      linksQuery += ` AND relationship_type = $${params.length + 1}`;
      params.push(type);
    }

    if (min_strength) {
      linksQuery += ` AND strength >= $${params.length + 1}`;
      params.push(min_strength);
    }

    const linksResult = await pool.query(linksQuery, params);

    const links = linksResult.rows.map(r => ({
      source: r.source,
      target: r.target,
      type: r.type,
      strength: r.strength
    }));

    // Filter nodes to only those with relationships (if type filter applied)
    let filteredNodes = nodes;
    if (type || min_strength) {
      const nodeIds = new Set();
      links.forEach(link => {
        nodeIds.add(link.source);
        nodeIds.add(link.target);
      });
      filteredNodes = nodes.filter(n => nodeIds.has(n.id));
    }

    return {
      nodes: filteredNodes,
      links
    };
  }

  /**
   * Identify network clusters using connected components
   */
  static async getClusters(userId) {
    const graph = await this.getGraphData(userId);
    const clusters = [];
    const visited = new Set();

    // Build adjacency list
    const adjacency = {};
    graph.nodes.forEach(node => {
      adjacency[node.id] = [];
    });

    graph.links.forEach(link => {
      adjacency[link.source].push(link.target);
      adjacency[link.target].push(link.source);
    });

    // Find connected components using DFS
    const dfs = (nodeId, cluster) => {
      visited.add(nodeId);
      cluster.push(nodeId);

      for (const neighbor of adjacency[nodeId]) {
        if (!visited.has(neighbor)) {
          dfs(neighbor, cluster);
        }
      }
    };

    for (const node of graph.nodes) {
      if (!visited.has(node.id)) {
        const cluster = [];
        dfs(node.id, cluster);
        clusters.push({
          id: clusters.length + 1,
          members: cluster,
          size: cluster.length
        });
      }
    }

    // Sort by size descending
    clusters.sort((a, b) => b.size - a.size);

    return { clusters };
  }

  /**
   * Get most connected people (central nodes by degree centrality)
   */
  static async getCentralNodes(userId, limit = 10) {
    const result = await pool.query(
      `SELECT
        p.id as person_id,
        p.name,
        COUNT(r.id) as connection_count
       FROM people p
       LEFT JOIN relationships r ON (r.person_a_id = p.id OR r.person_b_id = p.id) AND r.user_id = p.user_id
       WHERE p.user_id = $1
       GROUP BY p.id, p.name
       ORDER BY connection_count DESC
       LIMIT $2`,
      [userId, limit]
    );

    return {
      central_nodes: result.rows.map(row => ({
        person_id: row.person_id,
        name: row.name,
        connection_count: parseInt(row.connection_count)
      }))
    };
  }

  /**
   * Get isolated people (few or no connections)
   */
  static async getIsolatedPeople(userId, max_connections = 1) {
    const result = await pool.query(
      `SELECT
        p.id,
        p.name,
        COUNT(r.id) as connection_count
       FROM people p
       LEFT JOIN relationships r ON (r.person_a_id = p.id OR r.person_b_id = p.id) AND r.user_id = p.user_id
       WHERE p.user_id = $1
       GROUP BY p.id, p.name
       HAVING COUNT(r.id) <= $2
       ORDER BY connection_count ASC, p.name ASC`,
      [userId, max_connections]
    );

    return {
      isolated_people: result.rows.map(row => ({
        id: row.id,
        name: row.name,
        connection_count: parseInt(row.connection_count)
      }))
    };
  }

  /**
   * Calculate network density (actual connections / possible connections)
   */
  static async calculateNetworkDensity(userId) {
    const result = await pool.query(
      `SELECT
        COUNT(DISTINCT p.id) as people_count,
        COUNT(r.id) as relationship_count
       FROM people p
       LEFT JOIN relationships r ON r.user_id = p.user_id
       WHERE p.user_id = $1`,
      [userId]
    );

    const peopleCount = parseInt(result.rows[0].people_count);
    const relationshipCount = parseInt(result.rows[0].relationship_count);

    if (peopleCount < 2) {
      return 0;
    }

    // Maximum possible connections in undirected graph
    const maxConnections = (peopleCount * (peopleCount - 1)) / 2;
    const density = relationshipCount / maxConnections;

    return Math.min(density, 1); // Cap at 1.0
  }

  /**
   * Get focused graph data - nodes within N degrees of separation from a focal person
   */
  static async getFocusedGraph(userId, focalPersonId, maxDegrees = 3) {
    // Get full graph data
    const fullGraph = await this.getGraphData(userId);

    // Build adjacency list
    const adjacency = {};
    fullGraph.nodes.forEach(node => {
      adjacency[node.id] = [];
    });

    fullGraph.links.forEach(link => {
      if (!adjacency[link.source]) adjacency[link.source] = [];
      if (!adjacency[link.target]) adjacency[link.target] = [];
      adjacency[link.source].push(link.target);
      adjacency[link.target].push(link.source);
    });

    // BFS to find nodes within N degrees
    const nodeDistances = {}; // Maps node ID to degree from focal person
    const degreeCounts = {}; // Count of nodes at each degree level
    const queue = [[focalPersonId, 0]]; // [nodeId, degree]
    const visited = new Set([focalPersonId]);

    nodeDistances[focalPersonId] = 0;
    degreeCounts[0] = 1;

    // Handle "all" as infinite degrees
    const degreeLimit = maxDegrees === 'all' ? Infinity : parseInt(maxDegrees);

    while (queue.length > 0) {
      const [currentNode, currentDegree] = queue.shift();

      // Stop if we've reached the degree limit
      if (currentDegree >= degreeLimit) {
        continue;
      }

      const neighbors = adjacency[currentNode] || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          const neighborDegree = currentDegree + 1;
          nodeDistances[neighbor] = neighborDegree;
          degreeCounts[neighborDegree] = (degreeCounts[neighborDegree] || 0) + 1;
          queue.push([neighbor, neighborDegree]);
        }
      }
    }

    // Filter nodes to only those within degree limit
    const visibleNodeIds = new Set(Object.keys(nodeDistances));
    const filteredNodes = fullGraph.nodes.filter(node => visibleNodeIds.has(node.id));

    // Filter links to only connect visible nodes
    const filteredLinks = fullGraph.links.filter(link =>
      visibleNodeIds.has(link.source) && visibleNodeIds.has(link.target)
    );

    // Add degree information to nodes
    const nodesWithDegree = filteredNodes.map(node => ({
      ...node,
      degreeFromFocus: nodeDistances[node.id] || 0,
      isFocalPerson: node.id === focalPersonId
    }));

    // Calculate cumulative connection counts
    const cumulativeCounts = {};
    let cumulative = 0;
    for (let i = 0; i <= degreeLimit && i <= 6; i++) {
      cumulative += degreeCounts[i] || 0;
      cumulativeCounts[`n${i}`] = cumulative;
    }

    // Get focal person details
    const focalPerson = fullGraph.nodes.find(n => n.id === focalPersonId);

    return {
      nodes: nodesWithDegree,
      links: filteredLinks,
      focal_person: focalPerson,
      degree_counts: degreeCounts,
      cumulative_counts: cumulativeCounts,
      total_connections: filteredNodes.length - 1, // Exclude focal person
      max_degrees: degreeLimit
    };
  }
}

module.exports = NetworkGraphService;
