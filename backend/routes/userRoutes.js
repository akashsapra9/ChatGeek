const express = require('express');
const { registerUser, getUserPublicKey, loginUser } = require('../controllers/userController');
const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/pubkey/:user_id', getUserPublicKey);

module.exports = router;