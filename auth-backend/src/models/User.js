const mongoose = require('mongoose');

const subscriptionTiers = ['free', 'pro', 'enterprise'];

const UserSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      minlength: 3,
      maxlength: 50
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true
    },
    passwordHash: {
      type: String,
      required: true
    },
    fullName: {
      type: String,
      trim: true,
      maxlength: 120
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user'
    },
    subscriptionTier: {
      type: String,
      enum: subscriptionTiers,
      default: 'free'
    },
    subscriptionExpiresAt: {
      type: Date,
      default: null
    },
    isActive: {
      type: Boolean,
      default: true
    },
    lastLoginAt: Date,
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: true
  }
);

UserSchema.index({ role: 1 });
UserSchema.index({ subscriptionTier: 1 });

module.exports = mongoose.model('User', UserSchema);
