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
      console.log(
        "[authMiddleware] 🔍 Fetching user with user_id:",
        decoded.user_id
      );
      req.user = await User.findOne({ user_id: decoded.user_id }).select(
        "-pake_password -privkey_store"
      );
      console.log("[authMiddleware] ✅ User authenticated:", req.user.user_id);

      next();
      console.log("[authMiddleware] ⏭️ Moving to next middleware/route");
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
