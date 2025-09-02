const jwt = require("jsonwebtoken");
const UserManager = require("../models/UserManager");

const userManager = new UserManager();

const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Not authorized" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get full user details from database
    try {
      const client = await userManager.pool.connect();
      const result = await client.query(
        'SELECT id, username, email, full_name, subscription_tier, created_at FROM users WHERE id = $1 AND is_active = true',
        [decoded.id]
      );
      client.release();
      
      if (result.rows.length === 0) {
        return res.status(401).json({ message: "User not found" });
      }
      
      req.user = result.rows[0];
    } catch (dbError) {
      console.error('Database error in auth middleware:', dbError);
      // Fallback to basic user info from token
      req.user = { id: decoded.id };
    }
    
    next();
  } catch (err) {
    res.status(401).json({ message: "Token invalid" });
  }
};

module.exports = { protect };
