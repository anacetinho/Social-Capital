const jwt = require('jsonwebtoken');
const User = require('../models/User');
const config = require('../config');

class AuthService {
  /**
   * Register a new user
   */
  static async register(email, password) {
    // Check if email already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      throw new Error('Email already registered');
    }

    // Create user
    const user = await User.create(email, password);

    // Generate token
    const token = this.generateToken(user.id);

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
        preferences: user.preferences
      }
    };
  }

  /**
   * Login user
   */
  static async login(email, password) {
    // Find user
    const user = await User.findByEmail(email);
    if (!user) {
      throw new Error('Invalid email or password');
    }

    // Verify password
    const isValid = await User.verifyPassword(user, password);
    if (!isValid) {
      throw new Error('Invalid email or password');
    }

    // Generate token
    const token = this.generateToken(user.id);

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
        preferences: user.preferences
      }
    };
  }

  /**
   * Generate JWT token
   */
  static generateToken(userId) {
    return jwt.sign(
      { userId },
      config.jwt.secret,
      { expiresIn: config.jwt.expiration }
    );
  }

  /**
   * Verify JWT token
   */
  static verifyToken(token) {
    try {
      return jwt.verify(token, config.jwt.secret);
    } catch (err) {
      throw new Error('Invalid or expired token');
    }
  }

  /**
   * Get user from token
   */
  static async getUserFromToken(token) {
    const decoded = this.verifyToken(token);
    const user = await User.findById(decoded.userId);

    if (!user) {
      throw new Error('User not found');
    }

    return user;
  }
}

module.exports = AuthService;
