const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

class UserManager {
  constructor() {
    // Properly parse environment variables and ensure password is a string
    const password = process.env.DB_PASSWORD || '';
    // Remove quotes if they exist and ensure it's a string
    const cleanPassword = String(password).replace(/^["']|["']$/g, '');
    
    this.pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 5432,
      database: process.env.DB_NAME || 'dev',
      user: process.env.DB_USER || 'postgres',
      password: cleanPassword,
      ssl: false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
    
    // Log connection details (without password)
    console.log('Database connection config:', {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: cleanPassword === '' ? 'EMPTY' : '[HIDDEN]'
    });
    
    // Don't initialize tables automatically - let server handle it gracefully
    this.initializeTables().catch(error => {
      console.log('⚠️ Table initialization had issues, continuing anyway:', error.message);
    });
  }

  async initializeTables() {
    try {
      console.log('🔄 Checking database tables...');
      
      // Simple check if tables exist - the setup script already created them
      const result = await this.pool.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'users'
      `);
      
      if (result.rows.length > 0) {
        console.log('✅ Database tables already exist and are properly configured!');
        
        // Ensure admin user exists
        await this.ensureAdminUser();
        console.log('✅ Database initialization completed successfully!');
      } else {
        console.log('❌ Tables do not exist. Please run: npm run setup');
      }
      
    } catch (error) {
      console.error('❌ Error checking database tables:', error.message);
      console.log('⚠️  Continuing anyway - tables may already exist');
    }
  }

  async ensureAdminUser() {
    try {
      const adminEmail = process.env.ADMIN_EMAIL || 'admin@devquery.com';
      const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
      
      // Check if admin exists
      const existingAdmin = await this.pool.query(
        'SELECT id FROM users WHERE email = $1',
        [adminEmail]
      );
      
      if (existingAdmin.rows.length === 0) {
        // Create admin user
        const hashedPassword = await bcrypt.hash(adminPassword, 12);
        await this.pool.query(`
          INSERT INTO users (username, email, password_hash, role, subscription_tier)
          VALUES ($1, $2, $3, $4, $5)
        `, ['admin', adminEmail, hashedPassword, 'admin', 'enterprise']);
        
        console.log('✅ Admin user created successfully!');
        console.log(`   📧 Email: ${adminEmail}`);
        console.log(`   🔑 Password: ${adminPassword}`);
      } else {
        console.log('✅ Admin user already exists!');
      }
    } catch (error) {
      console.error('❌ Error creating admin user:', error.message);
    }
  }

  // User registration
  async registerUser(userData) {
    const client = await this.pool.connect();
    
    try {
      const { username, email, password, fullName, subscriptionTier = 'free' } = userData;
      
      // Check if user already exists
      const existingUser = await client.query(
        'SELECT 1 FROM users WHERE username = $1 OR email = $2',
        [username, email]
      );

      if (existingUser.rows.length > 0) {
        throw new Error('Username or email already exists');
      }

      const passwordHash = await bcrypt.hash(password, parseInt(process.env.BCRYPT_ROUNDS) || 12);
      
      // Calculate subscription expiry (free = no expiry, others = 30 days trial)
      const subscriptionExpiry = subscriptionTier === 'free' ? null : 
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days trial

      const result = await client.query(`
        INSERT INTO users (username, email, password_hash, subscription_tier, subscription_expires_at)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, username, email, subscription_tier, subscription_expires_at, created_at
      `, [username, email, passwordHash, subscriptionTier, subscriptionExpiry]);

      const user = result.rows[0];

      // Log activity
      await this.logActivity(user.id, null, 'user_registered', {
        subscription_tier: subscriptionTier,
        registration_method: 'email'
      });

      logger.info(`New user registered: ${username} (${email})`);
      return user;

    } catch (error) {
      logger.error('User registration failed:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // User login
  async loginUser(credentials, sessionInfo) {
    const client = await this.pool.connect();
    
    try {
      const { username, password } = credentials;
      const { ipAddress, userAgent } = sessionInfo;

      // Find user
      const userResult = await client.query(
        'SELECT * FROM users WHERE (username = $1 OR email = $1) AND is_active = true',
        [username]
      );

      if (userResult.rows.length === 0) {
        throw new Error('Invalid credentials');
      }

      const user = userResult.rows[0];

      // Check subscription expiry
      if (user.subscription_expires_at && new Date() > new Date(user.subscription_expires_at)) {
        // Downgrade to free plan
        await client.query(
          'UPDATE users SET subscription_tier = $1, subscription_expires_at = NULL WHERE id = $2',
          ['free', user.id]
        );
        user.subscription_tier = 'free';
        user.subscription_expires_at = null;
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password_hash);
      if (!isPasswordValid) {
        throw new Error('Invalid credentials');
      }

      // Create session
      const sessionId = uuidv4();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      await client.query(`
        INSERT INTO user_sessions (id, user_id, ip_address, user_agent, expires_at)
        VALUES ($1, $2, $3, $4, $5)
      `, [sessionId, user.id, ipAddress, userAgent, expiresAt]);

      // Generate JWT tokens
      const accessToken = jwt.sign(
        { userId: user.id, sessionId, type: 'user' },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
      );

      const refreshToken = jwt.sign(
        { userId: user.id, sessionId, type: 'refresh' },
        process.env.JWT_SECRET,
        { expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d' }
      );

      // Log activity
      await this.logActivity(user.id, sessionId, 'user_login', {
        ip_address: ipAddress,
        user_agent: userAgent
      });

      logger.info(`User logged in: ${user.username}`);

      return {
        user: {
          userId: user.id,
          username: user.username,
          email: user.email,
          subscriptionTier: user.subscription_tier,
          subscriptionExpiresAt: user.subscription_expires_at
        },
        sessionId,
        accessToken,
        refreshToken,
        expiresAt
      };

    } catch (error) {
      logger.error('User login failed:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Admin login
  async loginAdmin(credentials, sessionInfo) {
    const client = await this.pool.connect();
    
    try {
      const { username, password } = credentials;
      const { ipAddress, userAgent } = sessionInfo;

      // Find admin user (role = 'admin' in users table)
      const adminResult = await client.query(
        'SELECT * FROM users WHERE (username = $1 OR email = $1) AND role = $2 AND is_active = true',
        [username, 'admin']
      );

      if (adminResult.rows.length === 0) {
        throw new Error('Invalid admin credentials');
      }

      const admin = adminResult.rows[0];

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, admin.password_hash);
      if (!isPasswordValid) {
        throw new Error('Invalid admin credentials');
      }

      // Create session
      const sessionId = uuidv4();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      await client.query(`
        INSERT INTO user_sessions (id, user_id, ip_address, user_agent, expires_at)
        VALUES ($1, $2, $3, $4, $5)
      `, [sessionId, admin.id, ipAddress, userAgent, expiresAt]);

      // Generate JWT tokens
      const accessToken = jwt.sign(
        { userId: admin.id, sessionId, type: 'admin' },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
      );

      logger.info(`Admin logged in: ${admin.username}`);

      return {
        admin: {
          adminId: admin.id,
          username: admin.username,
          email: admin.email,
          role: admin.role,
          subscriptionTier: admin.subscription_tier
        },
        sessionId,
        accessToken,
        expiresAt
      };

    } catch (error) {
      logger.error('Admin login failed:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Validate session
  async validateSession(sessionId) {
    const client = await this.pool.connect();
    
    try {
      const sessionResult = await client.query(`
        SELECT s.*, u.username, u.role, u.subscription_tier, u.subscription_expires_at 
        FROM user_sessions s
        LEFT JOIN users u ON s.user_id = u.id
        WHERE s.id = $1 AND s.expires_at > CURRENT_TIMESTAMP
      `, [sessionId]);

      if (sessionResult.rows.length === 0) {
        return null;
      }

      const session = sessionResult.rows[0];

      // Update last activity
      await client.query(
        'UPDATE user_sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = $1',
        [sessionId]
      );

      return {
        sessionId: session.id,
        userId: session.user_id,
        username: session.username,
        role: session.role || 'user',
        subscriptionTier: session.subscription_tier,
        subscriptionExpiresAt: session.subscription_expires_at,
        expiresAt: session.expires_at
      };

    } catch (error) {
      logger.error('Session validation failed:', error);
      return null;
    } finally {
      client.release();
    }
  }

  // Check user permissions for database connections
  async checkConnectionPermissions(userId) {
    const client = await this.pool.connect();
    
    try {
      // Get user subscription info
      const userResult = await client.query(`
        SELECT u.subscription_type, sp.max_connections, sp.max_queries_per_hour 
        FROM users u
        JOIN subscription_plans sp ON u.subscription_type = sp.plan_name
        WHERE u.user_id = $1
      `, [userId]);

      if (userResult.rows.length === 0) {
        throw new Error('User not found');
      }

      const userPlan = userResult.rows[0];

      // Count active connections
      const activeConnectionsResult = await client.query(`
        SELECT COUNT(*) as count 
        FROM user_database_connections 
        WHERE user_id = $1 AND is_active = true
      `, [userId]);

      const activeConnections = parseInt(activeConnectionsResult.rows[0].count);

      return {
        canConnect: activeConnections < userPlan.max_connections,
        maxConnections: userPlan.max_connections,
        activeConnections,
        subscriptionType: userPlan.subscription_type,
        maxQueriesPerHour: userPlan.max_queries_per_hour
      };

    } catch (error) {
      logger.error('Permission check failed:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Track database connection
  async trackConnection(connectionData) {
    const client = await this.pool.connect();
    
    try {
      await client.query(`
        INSERT INTO user_database_connections 
        (connection_id, user_id, session_id, db_type, db_host, db_name, db_port)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        connectionData.connectionId,
        connectionData.userId,
        connectionData.sessionId,
        connectionData.dbType,
        connectionData.dbHost,
        connectionData.dbName,
        connectionData.dbPort
      ]);

      // Log activity
      await this.logActivity(connectionData.userId, connectionData.sessionId, 'database_connected', {
        db_type: connectionData.dbType,
        db_host: connectionData.dbHost,
        db_name: connectionData.dbName
      });

    } catch (error) {
      logger.error('Connection tracking failed:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Track query execution
  async trackQuery(connectionId, queryData) {
    const client = await this.pool.connect();
    
    try {
      // Update query count
      await client.query(`
        UPDATE user_database_connections 
        SET query_count = query_count + 1, last_used = CURRENT_TIMESTAMP 
        WHERE connection_id = $1
      `, [connectionId]);

      // Get connection info for activity log
      const connectionResult = await client.query(`
        SELECT user_id, session_id FROM user_database_connections 
        WHERE connection_id = $1
      `, [connectionId]);

      if (connectionResult.rows.length > 0) {
        const { user_id, session_id } = connectionResult.rows[0];
        
        await this.logActivity(user_id, session_id, 'query_executed', {
          connection_id: connectionId,
          execution_time: queryData.executionTime,
          row_count: queryData.rowCount
        });
      }

    } catch (error) {
      logger.error('Query tracking failed:', error);
    } finally {
      client.release();
    }
  }

  // Log user activity
  async logActivity(userId, sessionId, activityType, details, ipAddress = null, userAgent = null) {
    const client = await this.pool.connect();
    
    try {
      await client.query(`
        INSERT INTO user_activity (user_id, action, details, ip_address, user_agent)
        VALUES ($1, $2, $3, $4, $5)
      `, [userId, activityType, JSON.stringify(details), ipAddress, userAgent]);

    } catch (error) {
      logger.error('Activity logging failed:', error);
    } finally {
      client.release();
    }
  }

  // Admin: Get all users
  async getAllUsers(filters = {}) {
    const client = await this.pool.connect();
    
    try {
      let query = `
        SELECT 
          u.*,
          sp.max_connections,
          sp.max_queries_per_hour,
          (SELECT COUNT(*) FROM user_database_connections WHERE user_id = u.user_id AND is_active = true) as active_connections
        FROM users u
        LEFT JOIN subscription_plans sp ON u.subscription_type = sp.plan_name
        WHERE 1=1
      `;
      
      const params = [];
      let paramCount = 0;

      if (filters.subscriptionType) {
        paramCount++;
        query += ` AND u.subscription_type = $${paramCount}`;
        params.push(filters.subscriptionType);
      }

      if (filters.isActive !== undefined) {
        paramCount++;
        query += ` AND u.is_active = $${paramCount}`;
        params.push(filters.isActive);
      }

      query += ' ORDER BY u.created_at DESC';

      const result = await client.query(query, params);
      return result.rows;

    } catch (error) {
      logger.error('Get all users failed:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Admin: Disconnect user
  async disconnectUser(userId, reason = 'Admin action') {
    const client = await this.pool.connect();
    
    try {
      // Deactivate all user sessions
      await client.query(`
        UPDATE user_sessions 
        SET is_active = false 
        WHERE user_id = $1
      `, [userId]);

      // Mark database connections as disconnected
      await client.query(`
        UPDATE user_database_connections 
        SET is_active = false, disconnected_at = CURRENT_TIMESTAMP 
        WHERE user_id = $1 AND is_active = true
      `, [userId]);

      // Log activity
      await this.logActivity(userId, null, 'admin_disconnect', { reason });

      logger.info(`User ${userId} disconnected by admin: ${reason}`);
      return { success: true, message: 'User disconnected successfully' };

    } catch (error) {
      logger.error('Admin disconnect user failed:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Logout user
  async logout(sessionId) {
    const client = await this.pool.connect();
    
    try {
      await client.query(`
        UPDATE user_sessions 
        SET is_active = false 
        WHERE session_id = $1
      `, [sessionId]);

      return { success: true, message: 'Logged out successfully' };

    } catch (error) {
      logger.error('Logout failed:', error);
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = UserManager;
