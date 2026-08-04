const express = require('express');
const { register, login, logout, reAuthenticate } = require('../controllers/authController');
const { authenticateUser } = require('../middleware/auth');
const { validateUserRegistration, validateUserLogin } = require('../middleware/validation');

const router = express.Router();

router.post('/register', validateUserRegistration, register);
router.post('/login', validateUserLogin, login);
router.post('/logout', authenticateUser, logout);
router.post('/re-authenticate', authenticateUser, reAuthenticate);

router.get('/validate', authenticateUser, (req, res) => {
  res.json({
    success: true,
    user: {
      id: req.user.userId || req.user.id,
      username: req.user.metadata?.username || req.user.username,
      email: req.user.metadata?.email || req.user.email,
      name: req.user.metadata?.fullName || req.user.metadata?.username || req.user.name,
      subscriptionTier: req.user.subscriptionType || req.user.subscriptionTier,
      role: req.user.type || req.user.role
    }
  });
});

router.get('/me', authenticateUser, (req, res) => {
  res.json({
    success: true,
    message: `Welcome user ${req.user.metadata?.username || req.user.username || 'user'}`
  });
});

module.exports = router;
