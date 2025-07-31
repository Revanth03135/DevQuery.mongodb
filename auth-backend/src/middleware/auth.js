const jwt = require('jsonwebtoken');
const UserManager = require('../models/UserManager');
const logger = require('../utils/logger');

const userManager = new UserManager();

// Authenticate user middleware
const authenticateUser = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '') || req.cookies.token;
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Access denied. No token provided.' 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (decoded.type !== 'user' && decoded.type !== 'admin') {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid token type' 
      });
    }

    // Validate session
    const session = await userManager.validateSession(decoded.sessionId);
    
    if (!session) {
      return res.status(401).json({ 
        success: false, 
        message: 'Session expired or invalid' 
      });
    }

    req.user = {
      userId: decoded.userId,
      sessionId: decoded.sessionId,
      type: decoded.type,
      subscriptionType: session.subscription_type,
      subscriptionExpiresAt: session.subscription_expires_at
    };

    next();
  } catch (error) {
    logger.error('Authentication failed:', error);
    res.status(401).json({ 
      success: false, 
      message: 'Invalid token' 
    });
  }
};

// Authenticate admin middleware
const authenticateAdmin = async (req, res, next) => {
  try {
    await authenticateUser(req, res, () => {});
    
    if (req.user.type !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Admin access required' 
      });
    }

    next();
  } catch (error) {
    logger.error('Admin authentication failed:', error);
    res.status(401).json({ 
      success: false, 
      message: 'Admin authentication failed' 
    });
  }
};

// Check subscription middleware
const checkSubscription = async (req, res, next) => {
  try {
    if (req.user.type === 'admin') {
      return next(); // Admins bypass subscription checks
    }

    // Check if subscription has expired
    if (req.user.subscriptionExpiresAt && new Date() > new Date(req.user.subscriptionExpiresAt)) {
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

// Check connection permissions middleware
const checkConnectionPermissions = async (req, res, next) => {
  try {
    if (req.user.type === 'admin') {
      return next(); // Admins bypass connection limits
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
