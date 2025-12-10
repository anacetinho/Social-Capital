const AuthService = require('../services/AuthService');

/**
 * Authentication Middleware
 * Verifies JWT token and attaches user to request
 */
const authenticate = async (req, res, next) => {
  try {
    let token;

    // Get token from Authorization header (primary method)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7); // Remove 'Bearer ' prefix
    }

    // Fallback: Get token from query parameter (for SSE/EventSource)
    if (!token && req.query.token) {
      token = req.query.token;
    }

    if (!token) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'No token provided'
      });
    }

    // Verify token
    const decoded = AuthService.verifyToken(token);

    // Attach user ID to request
    req.userId = decoded.userId;

    next();
  } catch (err) {
    return res.status(401).json({
      error: 'Authentication failed',
      message: err.message
    });
  }
};

module.exports = authenticate;
