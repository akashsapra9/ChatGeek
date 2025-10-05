const jwt = require("jsonwebtoken");
const User = require("../models/userModel");

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log("[authMiddleware] 🔑 Decoded token payload:", decoded);

      // ⚠️ Your token payload uses {id: user_id}
      req.user = await User.findOne({ user_id: decoded.id }).select(
        "-pake_password -privkey_store"
      );

      next();
    } catch (error) {
      console.error("[protect] Token verification failed:", error.message);
      res.status(401).json({ error: "Not authorized, token failed" });
    }
  }

  if (!token) {
    res.status(401).json({ error: "Not authorized, no token" });
  }
};

module.exports = { protect };
