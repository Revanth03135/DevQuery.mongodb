const express = require('express');
const WhitelistController = require('../controllers/whitelistController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// All whitelist routes require authentication
router.use(protect);

/**
 * GET /api/whitelist/:connectionId
 * Get whitelist configuration for a connection
 */
router.get('/:connectionId', WhitelistController.getWhitelist);

/**
 * POST /api/whitelist/:connectionId/enable
 * Enable/disable whitelist for a connection
 * Body: { userId, enabled: boolean }
 */
router.post('/:connectionId/enable', WhitelistController.enableWhitelist);

/**
 * POST /api/whitelist/:connectionId/table
 * Add table to whitelist
 * Body: { userId, tableName, allowedColumns?: string[] }
 */
router.post('/:connectionId/table', WhitelistController.addTable);

/**
 * DELETE /api/whitelist/:connectionId/table/:tableName
 * Remove table from whitelist
 * Body: { userId }
 */
router.delete('/:connectionId/table/:tableName', WhitelistController.removeTable);

/**
 * POST /api/whitelist/:connectionId/table/:tableName/columns
 * Add columns to a table in whitelist
 * Body: { userId, allowedColumns: string[] }
 */
router.post('/:connectionId/table/:tableName/columns', WhitelistController.addColumnsToTable);

/**
 * POST /api/whitelist/:connectionId/table/:tableName/columns/remove
 * Remove columns from a table in whitelist
 * Body: { userId, columnNames: string[] }
 */
router.post('/:connectionId/table/:tableName/columns/remove', WhitelistController.removeColumnsFromTable);

/**
 * GET /api/whitelist/:connectionId/export
 * Export whitelist configuration
 */
router.get('/:connectionId/export', WhitelistController.exportWhitelist);

/**
 * POST /api/whitelist/:connectionId/import
 * Import whitelist configuration
 * Body: { userId, configuration: object }
 */
router.post('/:connectionId/import', WhitelistController.importWhitelist);

module.exports = router;
