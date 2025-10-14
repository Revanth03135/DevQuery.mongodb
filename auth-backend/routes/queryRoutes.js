const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  generateNewQuery,
  getUserQueries,
  getQueryById,
  updateQuery,
  deleteQuery,
  explainQueryEndpoint,
  optimizeQueryEndpoint,
  getFavoriteQueries
} = require('../controllers/queryController');

// Generate a new query using AI
router.post('/generate', protect, generateNewQuery);

// Explain what a query does
router.post('/explain', protect, explainQueryEndpoint);

// Get optimization suggestions
router.post('/optimize', protect, optimizeQueryEndpoint);

// Get all user's queries
router.get('/', protect, getUserQueries);

// Get favorite queries
router.get('/favorites', protect, getFavoriteQueries);

// Get, update, delete specific query
router.get('/:id', protect, getQueryById);
router.put('/:id', protect, updateQuery);
router.delete('/:id', protect, deleteQuery);

module.exports = router;
