const router = require('express').Router();
const { protect } = require('../middleware/authMiddleware');
const { fileStart, fileChunk, fileEnd } = require('../controllers/fileController');

router.post('/start', protect, fileStart);
router.post('/chunk', protect, fileChunk);
router.post('/end',   protect, fileEnd);

module.exports = router;
