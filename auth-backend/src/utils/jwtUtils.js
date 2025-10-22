const jwt = require('jsonwebtoken');

const signToken = (payload, expiresIn = process.env.JWT_EXPIRES_IN || '24h') => {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });
};

module.exports = { signToken };
