const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const User = require('./User');
const UserSession = require('./UserSession');
const UserConnection = require('./UserConnection');
const QueryLog = require('./QueryLog');
const AuditLog = require('./AuditLog');
const logger = require('../utils/logger');
const dbManager = require('../utils/dbManager');

const PLAN_LIMITS = {
  free: { maxConnections: 1, maxQueriesPerHour: 120 },
  pro: { maxConnections: 5, maxQueriesPerHour: 1200 },
  enterprise: { maxConnections: 20, maxQueriesPerHour: 2400 }
};

const SESSION_DURATION_HOURS = parseInt(process.env.SESSION_DURATION_HOURS, 10) || 24;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d';
const JWT_SECRET = process.env.JWT_SECRET || 'devquery-mongodb-secret';

const normalizeEmail = (email) => (email ? email.trim().toLowerCase() : email);

class UserManager {
  constructor() {}

  async registerUser({ username, email, password, fullName, subscriptionTier = 'free' }) {
    const normalizedEmail = normalizeEmail(email);
    const rawUsername = (username || '').trim().toLowerCase();

    if (!rawUsername) {
      throw new Error('Username is required');
    }

    const existingByEmail = await User.findOne({ email: normalizedEmail });
    if (existingByEmail) {
      throw new Error('Email already exists');
    }

    let candidateUsername = rawUsername;
    let suffix = 1;
    while (await User.exists({ username: candidateUsername })) {
      const suffixText = `${suffix}`;
      const baseSlice = rawUsername.slice(0, Math.max(3, 50 - suffixText.length));
      candidateUsername = `${baseSlice}${suffixText}`;
      suffix += 1;
    }

    const passwordHash = await bcrypt.hash(password, parseInt(process.env.BCRYPT_ROUNDS, 10) || 12);

    const subscriptionExpiresAt = subscriptionTier === 'free'
      ? null
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const trimmedFullName = fullName ? fullName.trim() : undefined;

    const user = await User.create({
      username: candidateUsername,
      email: normalizedEmail,
      passwordHash,
      fullName: trimmedFullName,
      subscriptionTier,
      subscriptionExpiresAt
    });

    await this.logActivity(user.id, null, 'user_registered', {
      subscriptionTier,
      registrationMethod: 'email'
    });

    logger.info(`New user registered: ${user.username} (${user.email})`);
    return user;
  }

  async loginUser(credentials, sessionInfo) {
    const { username, password } = credentials;
    const { ipAddress, userAgent } = sessionInfo;

    const normalized = normalizeEmail(username);

    const user = await User.findOne({
      isActive: true,
      $or: [{ email: normalized }, { username: username.trim() }],
      role: 'user'
    });

    if (!user) {
      throw new Error('Invalid credentials');
    }

    if (user.subscriptionExpiresAt && new Date() > new Date(user.subscriptionExpiresAt)) {
      user.subscriptionTier = 'free';
      user.subscriptionExpiresAt = null;
      await user.save();
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new Error('Invalid credentials');
    }

    user.lastLoginAt = new Date();
    await user.save();

    const sessionPayload = await this.createSession(user, { ipAddress, userAgent }, 'user');

    await this.logActivity(user.id, sessionPayload.sessionId, 'user_login', {
      ipAddress,
      userAgent
    });

    logger.info(`User logged in: ${user.username}`);

    return {
      user: {
        userId: user.id,
        username: user.username,
        email: user.email,
        subscriptionTier: user.subscriptionTier,
        subscriptionExpiresAt: user.subscriptionExpiresAt
      },
      ...sessionPayload
    };
  }

  async restorePersistentConnections(userId) {
    try {
      // Get all active persistent connections for this user
      const persistentConnections = await UserConnection.find({
        userId,
        isActive: true
      }).lean();

      if (!persistentConnections || persistentConnections.length === 0) {
        logger.info(`No persistent connections found for user ${userId}`);
        return { restoredConnections: [], failedConnections: [] };
      }

      const restoredConnections = [];
      const failedConnections = [];

      for (const connRecord of persistentConnections) {
        try {
          if (!connRecord.connectionConfig) {
            logger.warn(`Connection ${connRecord.connectionId} has no stored config`);
            failedConnections.push({
              connectionId: connRecord.connectionId,
              reason: 'No connection config stored'
            });
            continue;
          }

          // Attempt to restore the connection using stored config
          const connectionResult = await dbManager.connect(userId, connRecord.connectionConfig);
          
          // Update the connection record with the new session info
          await UserConnection.updateOne(
            { connectionId: connRecord.connectionId },
            {
              $set: {
                status: 'active',
                lastUsedAt: new Date()
              }
            }
          );

          restoredConnections.push({
            connectionId: connectionResult.connectionId,
            dbType: connRecord.dbType,
            dbName: connRecord.dbName
          });

          logger.info(`Restored connection ${connRecord.connectionId} for user ${userId}`);
        } catch (error) {
          logger.warn(`Failed to restore connection ${connRecord.connectionId}: ${error.message}`);
          failedConnections.push({
            connectionId: connRecord.connectionId,
            reason: error.message
          });
        }
      }

      return { restoredConnections, failedConnections };
    } catch (error) {
      logger.error(`Error restoring persistent connections for user ${userId}:`, error);
      return { restoredConnections: [], failedConnections: [] };
    }
  }

  async loginAdmin(credentials, sessionInfo) {
    const { username, password } = credentials;
    const { ipAddress, userAgent } = sessionInfo;

    const normalized = normalizeEmail(username);

    const admin = await User.findOne({
      isActive: true,
      role: 'admin',
      $or: [{ email: normalized }, { username: username.trim() }]
    });

    if (!admin) {
      throw new Error('Invalid admin credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, admin.passwordHash);
    if (!isPasswordValid) {
      throw new Error('Invalid admin credentials');
    }

    admin.lastLoginAt = new Date();
    await admin.save();

    const sessionPayload = await this.createSession(admin, { ipAddress, userAgent }, 'admin');

    await this.logActivity(admin.id, sessionPayload.sessionId, 'admin_login', {
      ipAddress,
      userAgent
    });

    logger.info(`Admin logged in: ${admin.username}`);

    return {
      admin: {
        adminId: admin.id,
        username: admin.username,
        email: admin.email,
        role: admin.role,
        subscriptionTier: admin.subscriptionTier
      },
      ...sessionPayload
    };
  }

  async createSession(user, sessionInfo, type) {
    const sessionId = uuidv4();
    const expiresAt = new Date(Date.now() + SESSION_DURATION_HOURS * 60 * 60 * 1000);

    await UserSession.create({
      sessionId,
      user: user._id,
      ipAddress: sessionInfo.ipAddress,
      userAgent: sessionInfo.userAgent,
      expiresAt
    });

    const accessToken = jwt.sign(
      { userId: user.id, sessionId, type },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    const refreshToken = jwt.sign(
      { userId: user.id, sessionId, type: 'refresh' },
      JWT_SECRET,
      { expiresIn: REFRESH_TOKEN_EXPIRES_IN }
    );

    return { sessionId, accessToken, refreshToken, expiresAt };
  }

  async validateSession(sessionId) {
    const session = await UserSession.findOne({ sessionId }).populate('user').lean();

    if (!session) {
      return null;
    }

    if (session.revokedAt) {
      return null;
    }

    if (session.expiresAt && new Date(session.expiresAt) < new Date()) {
      await UserSession.updateOne({ sessionId }, { $set: { revokedAt: new Date() } });
      return null;
    }

    const now = new Date();
    const newExpiry = new Date(now.getTime() + SESSION_DURATION_HOURS * 60 * 60 * 1000);

    await UserSession.updateOne(
      { sessionId },
      {
        $set: {
          lastSeenAt: now,
          expiresAt: newExpiry
        }
      }
    );

    return {
      sessionId: session.sessionId,
      userId: session.user._id.toString(),
      role: session.user.role,
      subscriptionTier: session.user.subscriptionTier,
      subscriptionExpiresAt: session.user.subscriptionExpiresAt,
      user: session.user,
      expiresAt: session.expiresAt
    };
  }

  async checkConnectionPermissions(userId) {
    const user = await User.findById(userId).lean();
    if (!user) {
      throw new Error('User not found');
    }

    await this.cleanupInactiveConnections(userId);

    const plan = PLAN_LIMITS[user.subscriptionTier] || PLAN_LIMITS.free;
    const activeConnections = await UserConnection.countDocuments({ userId, status: 'active' });

    return {
      canConnect: activeConnections < plan.maxConnections,
      maxConnections: plan.maxConnections,
      activeConnections,
      subscriptionType: user.subscriptionTier,
      maxQueriesPerHour: plan.maxQueriesPerHour
    };
  }

  async cleanupInactiveConnections(userId) {
    const runtimeConnections = dbManager.getUserConnections(userId) || [];
    const activeRuntimeIds = new Set(runtimeConnections.map((conn) => conn.connectionId));
    const now = new Date();

    await UserConnection.updateMany(
      {
        userId,
        status: 'active',
        connectionId: { $nin: Array.from(activeRuntimeIds) }
      },
      {
        $set: {
          status: 'disconnected',
          disconnectedAt: now
        }
      }
    );
  }

  async trackConnection(connectionData) {
    await UserConnection.findOneAndUpdate(
      { connectionId: connectionData.connectionId },
      {
        $set: {
          userId: connectionData.userId,
          sessionId: connectionData.sessionId,
          dbType: connectionData.dbType,
          dbHost: connectionData.dbHost,
          dbName: connectionData.dbName,
          dbPort: connectionData.dbPort,
          status: 'active',
          isActive: true,
          connectionConfig: connectionData.connectionConfig || null,
          lastUsedAt: new Date()
        },
        $setOnInsert: {
          connectedAt: new Date()
        }
      },
      { upsert: true, new: true }
    );

    await this.logActivity(connectionData.userId, connectionData.sessionId, 'database_connected', {
      connectionId: connectionData.connectionId,
      dbType: connectionData.dbType,
      dbHost: connectionData.dbHost,
      dbName: connectionData.dbName
    });
  }

  async trackQuery(connectionId, queryData) {
    await UserConnection.updateOne(
      { connectionId },
      {
        $inc: { queryCount: 1 },
        $set: {
          lastUsedAt: new Date()
        }
      }
    );

    await QueryLog.create({
      connectionId,
      userId: queryData.userId,
      dbType: queryData.dbType,
      executionTime: queryData.executionTime ?? 0,
      rowCount: queryData.rowCount ?? 0
    });

    await this.logActivity(queryData.userId, queryData.sessionId, 'query_executed', {
      connectionId,
      executionTime: queryData.executionTime,
      rowCount: queryData.rowCount
    });
  }

  async getAllUsers(filters = {}) {
    const query = {};
    if (filters.subscriptionType) {
      query.subscriptionTier = filters.subscriptionType;
    }
    if (filters.isActive !== undefined) {
      query.isActive = filters.isActive;
    }

    const users = await User.find(query).sort({ createdAt: -1 }).lean();

    const connectionCounts = await UserConnection.aggregate([
      { $match: { status: 'active' } },
      { $group: { _id: '$userId', count: { $sum: 1 } } }
    ]);
    const connectionMap = new Map(connectionCounts.map((item) => [item._id, item.count]));

    return users.map((user) => ({
      ...user,
      id: user._id.toString(),
      activeConnections: connectionMap.get(user._id.toString()) || 0
    }));
  }

  async disconnectUser(userId, reason = 'Admin action') {
    await UserSession.updateMany(
      { user: userId, revokedAt: { $exists: false } },
      { $set: { revokedAt: new Date() } }
    );

    await UserConnection.updateMany(
      { userId, status: 'active' },
      {
        $set: {
          status: 'disconnected',
          disconnectedAt: new Date()
        }
      }
    );

    await this.logActivity(userId, null, 'admin_disconnect', { reason });
    logger.info(`User ${userId} disconnected by admin: ${reason}`);

    return { success: true, message: 'User disconnected successfully' };
  }

  async endConnection(connectionId, reason = 'user_disconnect') {
    const connection = await UserConnection.findOneAndUpdate(
      { connectionId },
      {
        $set: {
          status: 'disconnected',
          isActive: false,
          disconnectedAt: new Date()
        }
      },
      { new: true }
    );

    await this.logActivity(connection?.userId || null, connection?.sessionId || null, 'connection_closed', {
      connectionId,
      reason
    });
  }

  async endAllConnectionsForUser(userId, reason = 'user_disconnect') {
    await UserConnection.updateMany(
      { userId, status: 'active' },
      {
        $set: {
          status: 'disconnected',
          isActive: false,
          disconnectedAt: new Date()
        }
      }
    );

    await this.logActivity(userId, null, 'connections_closed', { reason });
  }

  async logout(sessionId) {
    await UserSession.updateOne(
      { sessionId },
      { $set: { revokedAt: new Date() } }
    );

    return { success: true, message: 'Logged out successfully' };
  }

  async updateSubscription(userId, subscriptionType, expiresAt) {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    user.subscriptionTier = subscriptionType;
    user.subscriptionExpiresAt = expiresAt ? new Date(expiresAt) : null;
    await user.save();

    await this.logActivity(user.id, null, 'subscription_updated', {
      subscriptionType,
      expiresAt
    });
  }

  async getSystemStats({ totalConnections = 0, cachedConnections = 0 }) {
    const [
      totalUsers,
      activeSessions,
      premiumUsers,
      newUsersLast30Days
    ] = await Promise.all([
      User.countDocuments(),
      UserSession.countDocuments({
        revokedAt: { $exists: false },
        expiresAt: { $gt: new Date() }
      }),
      User.countDocuments({ subscriptionTier: { $ne: 'free' } }),
      User.countDocuments({ createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } })
    ]);

    return {
      totalUsers,
      activeSessions,
      premiumUsers,
      newUsersLast30Days,
      totalConnections,
      cachedConnections
    };
  }

  async getConnectionAnalytics(timeRange = '24h') {
    const now = new Date();
    let start;
    let buckets;
    let bucketFormatter;

    switch (timeRange) {
      case '7d':
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        buckets = 7;
        bucketFormatter = (date) => date.toLocaleDateString();
        break;
      case '30d':
        start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        buckets = 30;
        bucketFormatter = (date) => date.toLocaleDateString();
        break;
      case '24h':
      default:
        start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        buckets = 24;
        bucketFormatter = (date) => `${date.getHours()}:00`;
        break;
    }

    const queryLogs = await QueryLog.find({ executedAt: { $gte: start } }).lean();
    const connections = await UserConnection.find({ connectedAt: { $gte: start } }).lean();

    const bucketSize = (now.getTime() - start.getTime()) / buckets;
    const queryBuckets = Array.from({ length: buckets }, (_, index) => {
      const bucketStart = new Date(start.getTime() + bucketSize * index);
      return {
        label: bucketFormatter(bucketStart),
        count: 0
      };
    });

    queryLogs.forEach((log) => {
      const bucketIndex = Math.min(
        queryBuckets.length - 1,
        Math.floor((new Date(log.executedAt).getTime() - start.getTime()) / bucketSize)
      );
      if (bucketIndex >= 0) {
        queryBuckets[bucketIndex].count += 1;
      }
    });

    const totalQueries = queryLogs.length;
    const averageExecutionTime = totalQueries === 0
      ? 0
      : queryLogs.reduce((sum, log) => sum + (log.executionTime || 0), 0) / totalQueries;

    const topDatabasesMap = new Map();
    connections.forEach((connection) => {
      if (!connection.dbType) return;
      topDatabasesMap.set(
        connection.dbType,
        (topDatabasesMap.get(connection.dbType) || 0) + 1
      );
    });

    const topDatabases = Array.from(topDatabasesMap.entries())
      .map(([dbType, count]) => ({ dbType, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      timeframe: timeRange,
      totalQueries,
      averageExecutionTime,
      totalConnections: connections.length,
      queryVolume: queryBuckets,
      topDatabases
    };
  }

  async getLogs({ userId, action, limit = 50 } = {}) {
    const query = {};
    if (userId) {
      query.userId = userId;
    }
    if (action) {
      query.action = action;
    }

    const logs = await AuditLog.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit, 10))
      .lean();

    return logs;
  }

  async createAdmin({ username, email, password, fullName, permissions }) {
    const existingAdmin = await User.findOne({
      $or: [{ username: username.trim() }, { email: normalizeEmail(email) }]
    });

    if (existingAdmin) {
      throw new Error('Admin with provided username or email already exists');
    }

    const passwordHash = await bcrypt.hash(password, parseInt(process.env.BCRYPT_ROUNDS, 10) || 12);

    const admin = await User.create({
      username: username.trim(),
      email: normalizeEmail(email),
      passwordHash,
      fullName,
      role: 'admin',
      subscriptionTier: 'enterprise',
      metadata: { permissions }
    });

    await this.logActivity(admin.id, null, 'admin_created', {
      username: admin.username,
      permissions
    });
  }

  async getUserById(userId) {
    return User.findById(userId).lean();
  }

  async logActivity(userId, sessionId, action, details, meta = {}) {
    try {
      await AuditLog.create({
        userId,
        sessionId,
        action,
        details,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent
      });
    } catch (error) {
      logger.error('Activity logging failed:', error);
    }
  }
}

module.exports = UserManager;
