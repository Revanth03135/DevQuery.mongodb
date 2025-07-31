const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");
const UserManager = require("../models/UserManager");
const { generateToken } = require("../utils/jwtUtils");
const logger = require("../utils/logger");

// Initialize UserManager
const userManager = new UserManager();

const register = async (req, res) => {
  try {
    const { username, email, password, fullName } = req.body;
    
    if (!username || !email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: "Username, email, and password are required" 
      });
    }

    // Register user with UserManager
    const userData = { username, email, password, fullName };
    const user = await userManager.registerUser(userData);

    // Generate JWT token
    const token = generateToken(user.id);

    res.status(201).json({ 
      success: true,
      message: "User registered successfully",
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        subscriptionTier: user.subscription_tier
      }
    });

  } catch (error) {
    logger.error('Registration error:', error);
    res.status(400).json({ 
      success: false, 
      message: error.message || "Registration failed" 
    });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: "Email and password are required" 
      });
    }

    // Get client IP and user agent
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    // Try admin login first if email suggests admin
    if (email.includes('admin') || email === process.env.ADMIN_EMAIL) {
      try {
        const adminResult = await userManager.loginAdmin(
          { username: email, password },
          { ipAddress, userAgent }
        );

        return res.json({
          success: true,
          message: "Admin login successful",
          token: adminResult.accessToken,
          user: adminResult.admin,
          sessionId: adminResult.sessionId,
          isAdmin: true
        });
      } catch (adminError) {
        // If admin login fails, continue to regular user login
        logger.info('Admin login failed, trying user login');
      }
    }

    // Regular user login
    const userResult = await userManager.loginUser(
      { username: email, password },
      { ipAddress, userAgent }
    );

    res.json({
      success: true,
      message: "Login successful",
      token: userResult.accessToken,
      user: userResult.user,
      sessionId: userResult.sessionId,
      isAdmin: false
    });

  } catch (error) {
    logger.error('Login error:', error);
    res.status(401).json({ 
      success: false, 
      message: error.message || "Invalid credentials" 
    });
  }
};

const logout = async (req, res) => {
  try {
    // The middleware should have attached user info to req.user
    const sessionId = req.sessionId || req.headers['x-session-id'];
    
    if (sessionId) {
      // TODO: Invalidate session in database if needed
      logger.info(`User logged out: sessionId=${sessionId}`);
    }
    
    res.json({
      success: true,
      message: "Logged out successfully"
    });

  } catch (error) {
    logger.error('Logout error:', error);
    res.status(500).json({ 
      success: false, 
      message: "Logout failed" 
    });
  }
};

module.exports = { register, login, logout };
