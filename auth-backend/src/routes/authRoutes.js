const express = require('express');
const { register, login, logout, reAuthenticate } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const { validateUserRegistration, validateUserLogin } = require('../middleware/validation');

const router = express.Router();

router.post('/register', validateUserRegistration, register);
router.post('/login', validateUserLogin, login);
router.post('/logout', protect, logout);
router.post('/re-authenticate', protect, reAuthenticate);

router.get('/validate', protect, (req, res) => {
  res.json({
    success: true,
    user: {
      id: req.user.id,
      username: req.user.username,
      email: req.user.email,
      name: req.user.name,
      subscriptionTier: req.user.subscriptionTier,
      role: req.user.role
    }
  });
});

router.get('/me', protect, (req, res) => {
  res.json({
    success: true,
    message: `Welcome user ${req.user.username}`
  });
});

module.exports = router;
