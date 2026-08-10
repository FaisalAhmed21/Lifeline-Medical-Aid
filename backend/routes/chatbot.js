const express = require('express');
const router = express.Router();
const { askChatbot } = require('../controllers/chatbotController');
const { protect } = require('../middleware/auth');

// @route   POST /api/chatbot/ask
// @desc    Ask the AI chatbot a question
// @access  Public or Private (Allowing both, but if you want to restrict it, add protect)
router.post('/ask', askChatbot);

module.exports = router;
