const UserManager = require('../models/UserManager');
const logger = require('../utils/logger');

const userManager = new UserManager();

const register = async (req, res) => {
  try {
    const { username, email, password, fullName, name, subscriptionType } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

  const resolvedFullName = (fullName || name || '').trim();
    let resolvedUsername = username;

    if (!resolvedUsername) {
      const primarySource = resolvedFullName || (email ? email.split('@')[0] : 'user');
      const sanitized = primarySource.toLowerCase().replace(/[^a-z0-9]/g, '');
      let candidate = sanitized.slice(0, 24) || `user${Date.now()}`;
      if (candidate.length < 3) {
        candidate = `${candidate}${Math.random().toString(36).slice(2, 5)}`.slice(0, 6);
      }
      resolvedUsername = candidate;
    }

    const user = await userManager.registerUser({
      username: resolvedUsername,
      email,
      password,
      fullName: resolvedFullName || undefined,
      subscriptionTier: subscriptionType || 'free'
    });
    const session = await userManager.createSession(user, {
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent')
    }, 'user');

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token: session.accessToken,
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      sessionId: session.sessionId,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.fullName || user.username,
        subscriptionTier: user.subscriptionTier
      }
    });
  } catch (error) {
    logger.error('Registration error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Registration failed'
    });
  }
};

const login = async (req, res) => {
  try {
    const { email, username, password } = req.body;

    if ((!email && !username) || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email or username and password are required'
      });
    }

    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    const identifier = (email || username || '').trim();
    const normalizedIdentifier = identifier.toLowerCase();

    if (normalizedIdentifier.includes('admin') || identifier === process.env.ADMIN_EMAIL) {
      try {
        const adminResult = await userManager.loginAdmin({ username: identifier, password }, { ipAddress, userAgent });

        return res.json({
          success: true,
          message: 'Admin login successful',
          token: adminResult.accessToken,
          accessToken: adminResult.accessToken,
          refreshToken: adminResult.refreshToken,
          user: adminResult.admin,
          sessionId: adminResult.sessionId,
          isAdmin: true
        });
      } catch (adminError) {
        logger.info('Admin login failed, trying user login');
      }
    }

    const userResult = await userManager.loginUser({ username: identifier, password }, { ipAddress, userAgent });

    // Restore persistent connections
    const connectionRestoration = await userManager.restorePersistentConnections(userResult.user.userId);

    res.json({
      success: true,
      message: 'Login successful',
      token: userResult.accessToken,
      accessToken: userResult.accessToken,
      refreshToken: userResult.refreshToken,
      user: {
        id: userResult.user.userId,
        username: userResult.user.username,
        email: userResult.user.email,
        name: userResult.user.username,
        subscriptionTier: userResult.user.subscriptionTier
      },
      sessionId: userResult.sessionId,
      isAdmin: false,
      restoredConnections: connectionRestoration.restoredConnections
    });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(401).json({
      success: false,
      message: error.message || 'Invalid credentials'
    });
  }
};

const logout = async (req, res) => {
  try {
  const sessionId = req.user?.sessionId || req.sessionId || req.headers['x-session-id'];
    if (sessionId) {
      await userManager.logout(sessionId);
      logger.info(`User session ended: ${sessionId}`);
    }

    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    logger.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Logout failed'
    });
  }
};

const reAuthenticate = async (req, res) => {
  try {
    const { email, password } = req.body;
    const currentUser = req.user;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Verify the provided email matches current authenticated user
    if (email.toLowerCase() !== currentUser.email.toLowerCase()) {
      logger.warn(`Re-authentication email mismatch for user ${currentUser.id}`);
      return res.status(401).json({
        success: false,
        message: 'Email does not match current user'
      });
    }

    // Verify password by attempting login
    try {
      const userResult = await userManager.loginUser(
        { username: email, password },
        {
          ipAddress: req.ip || req.connection.remoteAddress,
          userAgent: req.get('User-Agent')
        }
      );

      logger.info(`User ${currentUser.id} re-authenticated successfully`);
      res.json({
        success: true,
        message: 'Password verified successfully',
        user: {
          id: userResult.user.userId,
          email: userResult.user.email,
          username: userResult.user.username
        }
      });
    } catch (loginError) {
      logger.warn(`Re-authentication password verification failed for user ${currentUser.id}`);
      return res.status(401).json({
        success: false,
        message: 'Invalid password'
      });
    }
  } catch (error) {
    logger.error('Re-authentication error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Re-authentication failed'
    });
  }
};

module.exports = { register, login, logout, reAuthenticate };
