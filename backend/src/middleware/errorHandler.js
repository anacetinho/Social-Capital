/**
 * Global Error Handler Middleware
 * Catches all errors and returns consistent JSON responses
 */
const errorHandler = (err, req, res, next) => {
  // Log error for debugging
  console.error('Error:', err);

  // Default error response
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';
  let error = 'Server error';

  // Handle specific error types
  if (err.name === 'ValidationError') {
    statusCode = 400;
    error = 'Validation error';
  } else if (err.name === 'UnauthorizedError' || err.message.includes('token')) {
    statusCode = 401;
    error = 'Authentication error';
  } else if (err.message.includes('not found') || err.message.includes('does not exist')) {
    statusCode = 404;
    error = 'Not found';
  } else if (err.message.includes('already exists') || err.message.includes('duplicate')) {
    statusCode = 409;
    error = 'Conflict';
  }

  // Don't leak internal error details in production
  if (process.env.NODE_ENV === 'production' && statusCode === 500) {
    message = 'An unexpected error occurred';
  }

  res.status(statusCode).json({
    error,
    message
  });
};

module.exports = errorHandler;
