const express = require('express');
const router = express.Router();
const chapterController = require('../controllers/chapterController');
const { isAdmin } = require('../middlewares/auth');
const cache = require('../middlewares/cache');
const limiter = require('../middlewares/rateLimiter');

// Apply rate limiting to all routes
router.use(limiter);

// Get all chapters with caching
router.get('/', cache('chapters'), chapterController.getChapters);

// Get single chapter
router.get('/:id', chapterController.getChapter);

// Upload chapters (admin only)
router.post('/', isAdmin, chapterController.uploadChapters);

module.exports = router;