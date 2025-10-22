const jwt = require('jsonwebtoken');
const UserManager = require('../models/UserManager');
const logger = require('../utils/logger');

const userManager = new UserManager();
const JWT_SECRET = process.env.JWT_SECRET || 'devquery-mongodb-secret';

const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized'
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (!decoded.sessionId) {
      return res.status(401).json({ success: false, message: 'Invalid session token' });
    }

    const session = await userManager.validateSession(decoded.sessionId);
    if (!session) {
      return res.status(401).json({ success: false, message: 'Session expired or invalid' });
    }

    const user = session.user || (await userManager.getUserById(session.userId));
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    req.user = {
      id: session.userId,
      username: user.username,
      email: user.email,
      name: user.fullName || user.username,
      subscriptionTier: user.subscriptionTier,
      role: user.role,
      sessionId: session.sessionId
    };

    next();
  } catch (error) {
    logger.error('Authorization middleware error:', error);
    res.status(401).json({
      success: false,
      message: 'Token invalid'
    });
  }
};

module.exports = { protect };
