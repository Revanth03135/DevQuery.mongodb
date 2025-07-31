const express = require("express");
const router = express.Router();
const { register, login, logout } = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");

router.post("/register", register);
router.post("/login", login);
router.post("/logout", protect, logout);
router.get("/me", protect, (req, res) => {
  res.json({ message: `Welcome user ${req.user.id}` });
});

module.exports = router;
