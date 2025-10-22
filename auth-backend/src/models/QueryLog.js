const mongoose = require('mongoose');

const QueryLogSchema = new mongoose.Schema(
  {
    connectionId: {
      type: String,
      required: true
    },
    userId: {
      type: String,
      required: true
    },
    dbType: String,
    executionTime: Number,
    rowCount: Number,
    executedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: false
  }
);

QueryLogSchema.index({ executedAt: -1 });
QueryLogSchema.index({ userId: 1, executedAt: -1 });

module.exports = mongoose.model('QueryLog', QueryLogSchema);
