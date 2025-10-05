const express = require("express");
const {
  registerUser,
  getUserPublicKey,
  loginUser,
  searchUsers,
} = require("../controllers/userController");
const { protect } = require("../middleware/authMiddleware");
const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/pubkey/:user_id", getUserPublicKey);
router.get("/search", protect, searchUsers); // TODO: correct? to search users?

module.exports = router;
