const Query = require('../models/Query');
const { generateQuery, explainQuery, optimizeQuery } = require('../services/geminiService');

/**
 * Generate a new query using Gemini AI
 * POST /api/queries/generate
 */
const generateNewQuery = async (req, res) => {
  try {
    const { prompt, queryType, title } = req.body;
    const userId = req.user._id;

    // Validate input
    if (!prompt) {
      return res.status(400).json({ message: 'Please provide a query prompt' });
    }

    // Generate query using Gemini AI
    const generatedQuery = await generateQuery(prompt, queryType || 'mongodb');

    // Save to database
    const newQuery = await Query.create({
      userId,
      title: title || 'Untitled Query',
      naturalLanguage: prompt,
      generatedQuery,
      queryType: queryType || 'mongodb'
    });

    res.status(201).json({
      success: true,
      query: newQuery
    });
  } catch (error) {
    console.error('Generate query error:', error);
    res.status(500).json({ 
      message: 'Failed to generate query',
      error: error.message 
    });
  }
};

/**
 * Get all queries for logged-in user
 * GET /api/queries
 */
const getUserQueries = async (req, res) => {
  try {
    const userId = req.user._id;
    const queries = await Query.find({ userId })
      .sort({ createdAt: -1 }); // Most recent first

    res.status(200).json({
      success: true,
      count: queries.length,
      queries
    });
  } catch (error) {
    console.error('Get queries error:', error);
    res.status(500).json({ 
      message: 'Failed to fetch queries',
      error: error.message 
    });
  }
};

/**
 * Get a single query by ID
 * GET /api/queries/:id
 */
const getQueryById = async (req, res) => {
  try {
    const query = await Query.findById(req.params.id);

    if (!query) {
      return res.status(404).json({ message: 'Query not found' });
    }

    // Check if query belongs to user
    if (query.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to access this query' });
    }

    res.status(200).json({
      success: true,
      query
    });
  } catch (error) {
    console.error('Get query error:', error);
    res.status(500).json({ 
      message: 'Failed to fetch query',
      error: error.message 
    });
  }
};

/**
 * Update a query (rename, add tags, favorite, etc.)
 * PUT /api/queries/:id
 */
const updateQuery = async (req, res) => {
  try {
    const { title, isFavorite, tags } = req.body;
    
    const query = await Query.findById(req.params.id);

    if (!query) {
      return res.status(404).json({ message: 'Query not found' });
    }

    // Check if query belongs to user
    if (query.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this query' });
    }

    // Update fields
    if (title !== undefined) query.title = title;
    if (isFavorite !== undefined) query.isFavorite = isFavorite;
    if (tags !== undefined) query.tags = tags;

    await query.save();

    res.status(200).json({
      success: true,
      query
    });
  } catch (error) {
    console.error('Update query error:', error);
    res.status(500).json({ 
      message: 'Failed to update query',
      error: error.message 
    });
  }
};

/**
 * Delete a query
 * DELETE /api/queries/:id
 */
const deleteQuery = async (req, res) => {
  try {
    const query = await Query.findById(req.params.id);

    if (!query) {
      return res.status(404).json({ message: 'Query not found' });
    }

    // Check if query belongs to user
    if (query.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this query' });
    }

    await query.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Query deleted successfully'
    });
  } catch (error) {
    console.error('Delete query error:', error);
    res.status(500).json({ 
      message: 'Failed to delete query',
      error: error.message 
    });
  }
};

/**
 * Explain what a query does
 * POST /api/queries/explain
 */
const explainQueryEndpoint = async (req, res) => {
  try {
    const { query } = req.body;

    if (!query) {
      return res.status(400).json({ message: 'Please provide a query to explain' });
    }

    const explanation = await explainQuery(query);

    res.status(200).json({
      success: true,
      explanation
    });
  } catch (error) {
    console.error('Explain query error:', error);
    res.status(500).json({ 
      message: 'Failed to explain query',
      error: error.message 
    });
  }
};

/**
 * Get optimization suggestions for a query
 * POST /api/queries/optimize
 */
const optimizeQueryEndpoint = async (req, res) => {
  try {
    const { query } = req.body;

    if (!query) {
      return res.status(400).json({ message: 'Please provide a query to optimize' });
    }

    const suggestions = await optimizeQuery(query);

    res.status(200).json({
      success: true,
      suggestions
    });
  } catch (error) {
    console.error('Optimize query error:', error);
    res.status(500).json({ 
      message: 'Failed to optimize query',
      error: error.message 
    });
  }
};

/**
 * Get favorite queries
 * GET /api/queries/favorites
 */
const getFavoriteQueries = async (req, res) => {
  try {
    const userId = req.user._id;
    const favorites = await Query.find({ userId, isFavorite: true })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: favorites.length,
      queries: favorites
    });
  } catch (error) {
    console.error('Get favorites error:', error);
    res.status(500).json({ 
      message: 'Failed to fetch favorite queries',
      error: error.message 
    });
  }
};

module.exports = {
  generateNewQuery,
  getUserQueries,
  getQueryById,
  updateQuery,
  deleteQuery,
  explainQueryEndpoint,
  optimizeQueryEndpoint,
  getFavoriteQueries
};
