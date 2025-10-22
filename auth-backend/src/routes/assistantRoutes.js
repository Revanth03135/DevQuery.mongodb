const express = require('express');
const AssistantController = require('../controllers/assistantController');
const { authenticateUser, checkSubscription } = require('../middleware/auth');
const { validateAssistantMessage } = require('../middleware/validation');

const router = express.Router();

router.use(authenticateUser);
router.use(checkSubscription);

router.post('/chat', validateAssistantMessage, AssistantController.handleChat);

/**
 * Debug endpoint to check schema availability
 * GET /api/assistant/debug/schema/:connectionId
 */
router.get('/debug/schema/:connectionId', AssistantController.debugSchema);

/**
 * Confirm and execute write operation
 * POST /api/assistant/confirm-write
 * Body: { connectionId, sql, confirmed: boolean }
 */
router.post('/confirm-write', AssistantController.confirmWriteOperation);

module.exports = router;
