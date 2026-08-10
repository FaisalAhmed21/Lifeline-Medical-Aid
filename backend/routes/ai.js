const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { 
  chatWithAI, 
  translateText, 
  getChatHistory, 
  clearChatHistory 
} = require('../controllers/aiController');

// @route   POST /api/ai/chat
// @desc    Chat with Groq AI (Llama 3)
// @access  Private
router.post('/chat', protect, chatWithAI);

// @route   POST /api/ai/translate
// @desc    Translate text using Groq AI
// @access  Private
router.post('/translate', protect, translateText);

// @route   GET /api/ai/history
// @desc    Get user's chat history
// @access  Private
router.get('/history', protect, getChatHistory);

// @route   DELETE /api/ai/history
// @desc    Clear chat history
// @access  Private
router.delete('/history', protect, clearChatHistory);

module.exports = router;
