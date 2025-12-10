const pool = require('../db/connection');

/**
 * Pathfinding Service
 * Implements algorithms to find paths between people in network
 * Enforces 6-degree separation limit
 */

// Relationship type weights for path quality scoring
// See PATH_SCORING.md for detailed explanation
const RELATIONSHIP_TYPE_WEIGHTS = {
  family: 1.5,
  friend: 1.3,
  extended_family: 1.2,
  colleague: 1.0,
  acquaintance: 0.8,
  other: 0.5
};

const MAX_DEGREES = 6; // Maximum degrees of separation

class PathfindingService {
  /**
   * Find shortest path between two people using BFS
   */
  static async findPath(userId, fromPersonId, toPersonId) {
    // Build adjacency graph
    const graph = await this.buildGraph(userId);

    // Run BFS
    const path = this.bfs(graph, fromPersonId, toPersonId);

    if (!path) {
      return null; // No path found
    }

    // Calculate path strength (minimum strength along path)
    const pathStrength = await this.calculatePathStrength(userId, path);

    // Get person details for path
    const pathWithDetails = await this.getPathDetails(userId, path);

    return {
      from: pathWithDetails[0],
      to: pathWithDetails[pathWithDetails.length - 1],
      path: path,
      degrees: path.length - 1,
      strength: pathStrength,
      intermediaries: pathWithDetails.slice(1, -1)
    };
  }

  /**
   * Build adjacency graph from relationships
   * Includes relationship type for path quality scoring
   */
  static async buildGraph(userId) {
    const result = await pool.query(
      'SELECT person_a_id, person_b_id, strength, relationship_type FROM relationships WHERE user_id = $1',
      [userId]
    );

    const graph = {};

    for (const rel of result.rows) {
      if (!graph[rel.person_a_id]) {
        graph[rel.person_a_id] = [];
      }
      if (!graph[rel.person_b_id]) {
        graph[rel.person_b_id] = [];
      }

      // Bidirectional edges with strength and type
      graph[rel.person_a_id].push({
        node: rel.person_b_id,
        strength: rel.strength,
        type: rel.relationship_type
      });
      graph[rel.person_b_id].push({
        node: rel.person_a_id,
        strength: rel.strength,
        type: rel.relationship_type
      });
    }

    return graph;
  }

  /**
   * BFS algorithm with 3-degree limit
   */
  static bfs(graph, start, end) {
    const queue = [[start]];
    const visited = new Set([start]);

    while (queue.length > 0) {
      const path = queue.shift();
      const node = path[path.length - 1];

      // Degree limit check (path length - 1 = degrees of separation)
      if (path.length > MAX_DEGREES + 1) {
        continue;
      }

      // Found target
      if (node === end) {
        return path;
      }

      // Explore neighbors
      const neighbors = graph[node] || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor.node)) {
          visited.add(neighbor.node);
          queue.push([...path, neighbor.node]);
        }
      }
    }

    return null; // No path found within 3 degrees
  }

  /**
   * Calculate path strength (minimum relationship strength along path)
   */
  static async calculatePathStrength(userId, path) {
    let minStrength = 5;

    for (let i = 0; i < path.length - 1; i++) {
      const result = await pool.query(
        `SELECT strength FROM relationships
         WHERE user_id = $1
           AND ((person_a_id = $2 AND person_b_id = $3) OR (person_a_id = $3 AND person_b_id = $2))`,
        [userId, path[i], path[i + 1]]
      );

      if (result.rows[0]) {
        minStrength = Math.min(minStrength, result.rows[0].strength);
      }
    }

    return minStrength;
  }

  /**
   * Get person details for path
   */
  static async getPathDetails(userId, path) {
    const details = [];

    for (const personId of path) {
      const result = await pool.query(
        'SELECT id, name, email FROM people WHERE id = $1 AND user_id = $2',
        [personId, userId]
      );

      if (result.rows[0]) {
        details.push(result.rows[0]);
      }
    }

    return details;
  }

  /**
   * Suggest intermediaries (people connected to both from and to)
   */
  static async suggestIntermediaries(userId, fromPersonId, toPersonId) {
    const result = await pool.query(
      `SELECT DISTINCT p.id, p.name, p.email
       FROM people p
       JOIN relationships r1 ON (r1.person_a_id = p.id OR r1.person_b_id = p.id)
       JOIN relationships r2 ON (r2.person_a_id = p.id OR r2.person_b_id = p.id)
       WHERE r1.user_id = $1 AND r2.user_id = $1
         AND ((r1.person_a_id = $2 OR r1.person_b_id = $2) AND (r2.person_a_id = $3 OR r2.person_b_id = $3))
         AND p.id NOT IN ($2, $3)
       LIMIT 5`,
      [userId, fromPersonId, toPersonId]
    );

    return result.rows;
  }

  /**
   * Find all paths between two people using DFS
   * Returns top 10 paths sorted by degrees then quality score
   */
  static async findAllPathsBetweenPeople(userId, fromPersonId, toPersonId) {
    const graph = await this.buildGraph(userId);
    const allPaths = [];

    // DFS to find all paths
    const dfs = (currentPath, visited) => {
      const currentNode = currentPath[currentPath.length - 1];

      // Check if we've reached the target
      if (currentNode === toPersonId) {
        allPaths.push([...currentPath]);
        return;
      }

      // Check degree limit (path length - 1 = degrees)
      if (currentPath.length > MAX_DEGREES) {
        return;
      }

      // Explore neighbors
      const neighbors = graph[currentNode] || [];
      for (const neighbor of neighbors) {
        // Prevent cycles
        if (!visited.has(neighbor.node)) {
          const newVisited = new Set(visited);
          newVisited.add(neighbor.node);
          dfs([...currentPath, neighbor.node], newVisited);
        }
      }
    };

    // Start DFS
    const initialVisited = new Set([fromPersonId]);
    dfs([fromPersonId], initialVisited);

    // If no paths found, return empty result
    if (allPaths.length === 0) {
      return {
        found: false,
        totalFound: 0,
        paths: []
      };
    }

    // Calculate quality scores for all paths
    const pathsWithScores = await Promise.all(
      allPaths.map(async (path) => {
        const qualityScore = await this.calculatePathQualityScore(userId, path, graph);
        const pathStrength = await this.calculatePathStrength(userId, path);
        const pathWithDetails = await this.getPathDetails(userId, path);

        return {
          path,
          degrees: path.length - 1,
          qualityScore,
          strength: pathStrength,
          pathWithDetails
        };
      })
    );

    // Sort: Primary by degrees (ascending), Secondary by quality score (descending)
    pathsWithScores.sort((a, b) => {
      if (a.degrees !== b.degrees) {
        return a.degrees - b.degrees;
      }
      return b.qualityScore - a.qualityScore;
    });

    // Limit to top 10 paths
    const top10Paths = pathsWithScores.slice(0, 10);

    return {
      found: true,
      totalFound: allPaths.length,
      paths: top10Paths
    };
  }

  /**
   * Calculate path quality score using formula from PATH_SCORING.md
   * Score = (Σ(strength × type_weight)) / degrees
   */
  static async calculatePathQualityScore(userId, path, graph) {
    let totalWeightedStrength = 0;

    // Sum up weighted strengths for each edge in the path
    for (let i = 0; i < path.length - 1; i++) {
      const fromNode = path[i];
      const toNode = path[i + 1];

      // Find the edge in the graph
      const neighbors = graph[fromNode] || [];
      const edge = neighbors.find(n => n.node === toNode);

      if (edge) {
        const typeWeight = RELATIONSHIP_TYPE_WEIGHTS[edge.type] || 0.5; // Default to 'other' weight
        const weightedStrength = edge.strength * typeWeight;
        totalWeightedStrength += weightedStrength;
      }
    }

    const degrees = path.length - 1;
    const qualityScore = degrees > 0 ? totalWeightedStrength / degrees : 0;

    // Round to 2 decimal places
    return Math.round(qualityScore * 100) / 100;
  }

  /**
   * Find all paths within N degrees (original method - kept for potential future use)
   */
  static async findAllPaths(userId, fromPersonId, maxDegrees = 3) {
    const graph = await this.buildGraph(userId);
    const allPaths = [];

    const dfs = (path) => {
      const node = path[path.length - 1];

      if (path.length > maxDegrees + 1) {
        return;
      }

      allPaths.push([...path]);

      const neighbors = graph[node] || [];
      for (const neighbor of neighbors) {
        if (!path.includes(neighbor.node)) {
          dfs([...path, neighbor.node]);
        }
      }
    };

    dfs([fromPersonId]);

    return allPaths;
  }
}

module.exports = PathfindingService;
