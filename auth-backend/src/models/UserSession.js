const mongoose = require('mongoose');

const UserSessionSchema = new mongoose.Schema(
  {
    sessionId: {
      type: String,
      required: true,
      unique: true
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    ipAddress: String,
    userAgent: String,
    expiresAt: {
      type: Date,
      required: true
    },
    revokedAt: Date,
    lastSeenAt: {
      type: Date,
      default: Date.now
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: true
  }
);

UserSessionSchema.index({ expiresAt: 1 });
UserSessionSchema.index({ user: 1, revokedAt: 1 });

module.exports = mongoose.model('UserSession', UserSessionSchema);
