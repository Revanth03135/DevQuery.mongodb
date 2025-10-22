const jwt = require('jsonwebtoken');
const UserManager = require('../models/UserManager');
const logger = require('../utils/logger');

const userManager = new UserManager();
const JWT_SECRET = process.env.JWT_SECRET || 'devquery-mongodb-secret';

const extractToken = (req) => {
  if (req.headers.authorization?.startsWith('Bearer ')) {
    return req.headers.authorization.split(' ')[1];
  }
  if (req.cookies?.token) {
    return req.cookies.token;
  }
  return null;
};

const authenticate = async (req, res) => {
  const token = extractToken(req);

  if (!token) {
    res.status(401).json({
      success: false,
      message: 'Access denied. No token provided.'
    });
    return false;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    if (!decoded.sessionId) {
      res.status(401).json({
        success: false,
        message: 'Invalid session token'
      });
      return false;
    }

    const session = await userManager.validateSession(decoded.sessionId);
    if (!session) {
      res.status(401).json({
        success: false,
        message: 'Session expired or invalid'
      });
      return false;
    }

    req.user = {
      userId: decoded.userId,
      sessionId: decoded.sessionId,
      type: decoded.type || session.role || 'user',
      subscriptionType: session.subscriptionTier,
      subscriptionExpiresAt: session.subscriptionExpiresAt,
      metadata: session.user
    };

    return true;
  } catch (error) {
    logger.error('Authentication failed:', error);
    res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
    return false;
  }
};

const authenticateUser = async (req, res, next) => {
  const isAuthenticated = await authenticate(req, res);
  if (isAuthenticated) {
    next();
  }
};

const authenticateAdmin = async (req, res, next) => {
  const isAuthenticated = await authenticate(req, res);
  if (!isAuthenticated) {
    return;
  }

  if (req.user.type !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }

  next();
};

const checkSubscription = async (req, res, next) => {
  try {
    if (req.user.type === 'admin') {
      return next();
    }

    if (req.user.subscriptionExpiresAt && new Date(req.user.subscriptionExpiresAt) < new Date()) {
      return res.status(403).json({
        success: false,
        message: 'Subscription expired. Please upgrade your plan.',
        code: 'SUBSCRIPTION_EXPIRED'
      });
    }

    next();
  } catch (error) {
    logger.error('Subscription check failed:', error);
    res.status(500).json({
      success: false,
      message: 'Subscription validation failed'
    });
  }
};

const checkConnectionPermissions = async (req, res, next) => {
  try {
    if (req.user.type === 'admin') {
      return next();
    }

    const permissions = await userManager.checkConnectionPermissions(req.user.userId);

    if (!permissions.canConnect) {
      return res.status(403).json({
        success: false,
        message: `Connection limit reached. Your ${permissions.subscriptionType} plan allows ${permissions.maxConnections} concurrent connections.`,
        code: 'CONNECTION_LIMIT_EXCEEDED',
        details: permissions
      });
    }

    req.connectionPermissions = permissions;
    next();
  } catch (error) {
    logger.error('Connection permission check failed:', error);
    res.status(500).json({
      success: false,
      message: 'Permission check failed'
    });
  }
};

module.exports = {
  authenticateUser,
  authenticateAdmin,
  checkSubscription,
  checkConnectionPermissions
};
