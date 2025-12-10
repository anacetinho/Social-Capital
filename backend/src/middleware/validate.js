const { validationResult } = require('express-validator');

/**
 * Validation Middleware
 * Checks express-validator results and returns formatted errors
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation error',
      message: 'Invalid input data',
      details: errors.array().map(err => ({
        field: err.path || err.param,
        message: err.msg
      }))
    });
  }

  next();
};

module.exports = validate;
