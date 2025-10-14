const mongoose = require('mongoose');

const querySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    default: 'Untitled Query'
  },
  naturalLanguage: {
    type: String,
    required: true
  },
  generatedQuery: {
    type: String,
    required: true
  },
  queryType: {
    type: String,
    enum: ['mongodb', 'sql', 'aggregation'],
    default: 'mongodb'
  },
  isFavorite: {
    type: Boolean,
    default: false
  },
  tags: [{
    type: String
  }],
  executionCount: {
    type: Number,
    default: 0
  }
}, { 
  timestamps: true 
});

module.exports = mongoose.model('Query', querySchema);
