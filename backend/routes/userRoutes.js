const express = require('express');
const { registerUser, getUserPublicKey } = require('../controllers/userController');
const router = express.Router();

router.post('/register', registerUser);
router.get('/pubkey/:user_id', getUserPublicKey);

module.exports = router;