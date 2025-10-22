const mongoose = require('mongoose');

const UserConnectionSchema = new mongoose.Schema(
  {
    connectionId: {
      type: String,
      required: true,
      unique: true
    },
    userId: {
      type: String,
      required: true
    },
    sessionId: {
      type: String,
      required: true
    },
    dbType: String,
    dbHost: String,
    dbName: String,
    dbPort: String,
    status: {
      type: String,
      enum: ['active', 'disconnected'],
      default: 'active'
    },
    isActive: {
      type: Boolean,
      default: true,
      description: 'Whether this connection is currently active for the user'
    },
    // Encrypted connection credentials for reconnection
    connectionConfig: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
      description: 'Stored connection config (encrypted) for auto-reconnection'
    },
    queryCount: {
      type: Number,
      default: 0
    },
    lastUsedAt: {
      type: Date,
      default: Date.now
    },
    connectedAt: {
      type: Date,
      default: Date.now
    },
    disconnectedAt: Date
  },
  {
    timestamps: true
  }
);

UserConnectionSchema.index({ userId: 1, status: 1 });
UserConnectionSchema.index({ userId: 1, isActive: 1 });
UserConnectionSchema.index({ sessionId: 1 });

module.exports = mongoose.model('UserConnection', UserConnectionSchema);
