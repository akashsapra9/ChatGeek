const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { accessChat, fetchChats, createGroupChat, renameGroup, addToGroup, removeFromGroup, createCommunity, addToCommunity, renameCommunity, removeFromCommunity } = require('../controllers/chatControllers');

const router = express.Router();

router.route('/').post(protect, accessChat)
router.route('/').get(protect, fetchChats)
router.route('/group').post(protect, createGroupChat);
router.route('/community').post(protect, createCommunity);
router.route('/communityadd').post(protect, addToCommunity);
router.route('/renamecommunity').put(protect, renameCommunity);
router.route('/communityRemove').put(protect, removeFromCommunity);
router.route('/rename').put(protect, renameGroup);
router.route('/groupadd').put(protect, addToGroup);
router.route('/groupRemove').put(protect, removeFromGroup);

module.exports = router;