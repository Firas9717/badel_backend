const express = require('express');
const router = express.Router();
const { getConversations, getMessages, sendMessage, startConversation, getUnreadCount } = require('../controllers/message.controller');
const { protect } = require('../middleware/auth.middleware');
const upload = require('../middleware/upload.middleware');
const { messageLimiter } = require('../middleware/rateLimiter');

router.get('/conversations', protect, getConversations);
router.post('/conversations', protect, messageLimiter, startConversation);
router.get('/unread-count', protect, getUnreadCount);
router.get('/conversation/:conversationId', protect, getMessages);
router.post('/', protect, messageLimiter, upload.single('file'), sendMessage);

module.exports = router;
