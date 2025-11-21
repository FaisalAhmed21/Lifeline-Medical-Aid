const express = require('express');
const router = express.Router();
const {
  getOrCreateChat,
  sendMessage,
  markAsRead,
  getChatMessages,
  getUserChats,
  syncOfflineMessages
} = require('../controllers/chatController');
const { protect } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

// Get all user's chats
router.get('/', getUserChats);

// Get or create chat for an emergency
router.get('/emergency/:emergencyId', getOrCreateChat);

// Get chat messages with pagination
router.get('/:chatId/messages', getChatMessages);

// Send a message
router.post('/:chatId/message', sendMessage);

// Mark messages as read
router.put('/:chatId/read', markAsRead);

// Sync offline messages
router.post('/sync-offline', syncOfflineMessages);

module.exports = router;
