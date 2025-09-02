const express = require("express");
const router = express.Router();
const { register, login, logout } = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");

router.post("/register", register);
router.post("/login", login);
router.post("/logout", protect, logout);
router.get("/validate", protect, (req, res) => {
  res.json({ 
    success: true, 
    user: { 
      id: req.user.id,
      username: req.user.username,
      email: req.user.email,
      name: req.user.full_name || req.user.username,
      subscriptionTier: req.user.subscription_tier
    } 
  });
});
router.get("/me", protect, (req, res) => {
  res.json({ message: `Welcome user ${req.user.id}` });
});

module.exports = router;
