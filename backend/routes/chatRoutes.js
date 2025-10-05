const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const {
  accessChat,
  fetchChats,
  createGroupChat,
  renameGroup,
  addToGroup,
  removeFromGroup,
} = require("../controllers/chatControllers");

const router = express.Router();

// Direct (DM) chat creation + fetching
router.route("/").post(protect, accessChat).get(protect, fetchChats);

// Group management
router.post("/group", protect, createGroupChat);
router.put("/rename", protect, renameGroup);
router.put("/group/add", protect, addToGroup);
router.put("/group/remove", protect, removeFromGroup);

module.exports = router;
