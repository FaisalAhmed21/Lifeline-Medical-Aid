const Groq = require('groq-sdk');
const AIChatHistory = require('../models/AIChatHistory');

// Initialize Groq AI (FREE: 30 RPM, 14,400/day - much better than Gemini!)
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || 'Your API key' // Get free key from console.groq.com
});

// Medical context prompt for LifeBot
const SYSTEM_PROMPT = `You are LifeBot, an AI medical assistant for a rural healthcare coordination system in Bangladesh. 

Your role:
1. Provide accurate medical information and first-aid guidance
2. Help users understand symptoms and when to seek professional help
3. Support both English and Bangla languages
4. Always prioritize patient safety
5. Recommend calling 999 for emergencies
6. Be empathetic, clear, and culturally sensitive

Important guidelines:
- NEVER diagnose conditions - only provide general information
- ALWAYS recommend professional medical consultation for serious issues
- For life-threatening situations, immediately tell them to call 999
- Use simple, clear language
- Be supportive and reassuring
- Respect cultural sensitivities in Bangladesh

When responding:
- If the user speaks in Bangla, respond in Bangla
- If the user speaks in English, respond in English
- Keep responses concise but informative
- Use bullet points for step-by-step instructions
- Include emergency warnings when necessary`;

// @desc    Chat with AI (Groq - Llama 3)
// @route   POST /api/ai/chat
// @access  Private
exports.chatWithAI = async (req, res) => {
  try {
    const { message, language, conversationHistory, sessionId } = req.body;
    const userId = req.user.id || req.user._id;

    if (!message) {
      return res.status(400).json({
        success: false,
        message: 'Message is required'
      });
    }

    console.log('💬 AI Chat request:', { userId, sessionId, messageLength: message.length });

    // Get or create chat session
    let currentSessionId = sessionId;
    if (!currentSessionId) {
      currentSessionId = `${userId}-${Date.now()}`;
    }

    // Load existing chat history from database
    let chatHistory = await AIChatHistory.findOne({
      user: userId,
      sessionId: currentSessionId,
      isActive: true
    });

    if (!chatHistory) {
      console.log('📝 Creating new chat session');
      chatHistory = new AIChatHistory({
        user: userId,
        sessionId: currentSessionId,
        messages: []
      });
    } else {
      console.log('📚 Loaded existing chat history:', chatHistory.messages.length, 'messages');
    }

    // Build messages array for Groq API
    const messages = [
      {
        role: 'system',
        content: SYSTEM_PROMPT
      }
    ];

    // Add conversation history from database
    if (chatHistory.messages && chatHistory.messages.length > 0) {
      chatHistory.messages.forEach(msg => {
        messages.push({
          role: msg.role,
          content: msg.content
        });
      });
    }

    // Add current user message
    messages.push({
      role: 'user',
      content: message
    });

    console.log('🤖 Sending request to Groq AI...');

    // Call Groq API (Llama 3.3 70B - excellent for medical advice)
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile', // Best free model
      messages: messages,
      temperature: 0.7,
      max_tokens: 1024,
      top_p: 1,
      stream: false
    });

    const responseText = completion.choices[0].message.content;
    console.log('✅ AI response received:', responseText.substring(0, 100) + '...');

    // Save user message and AI response to database
    chatHistory.messages.push({
      role: 'user',
      content: message,
      timestamp: new Date()
    });

    chatHistory.messages.push({
      role: 'assistant',
      content: responseText,
      timestamp: new Date()
    });

    await chatHistory.save();
    console.log('💾 Chat history saved to database');

    res.status(200).json({
      success: true,
      response: responseText,
      sessionId: currentSessionId,
      conversationId: chatHistory._id
    });

  } catch (error) {
    console.error('Groq AI Error Details:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    });
    
    let errorMessage = 'Sorry, I\'m having trouble responding right now. For serious issues, please call 999 or consult a doctor.';
    
    if (error.message.includes('API key')) {
      errorMessage = 'AI service configuration error. Please contact support.';
    } else if (error.message.includes('rate limit')) {
      errorMessage = 'Too many requests. Please wait a moment and try again.';
    }
    
    res.status(500).json({
      success: false,
      message: errorMessage,
      error: error.message
    });
  }
};

// @desc    Translate text using Groq
// @route   POST /api/ai/translate
// @access  Private
exports.translateText = async (req, res) => {
  try {
    const { text, targetLanguage } = req.body;

    if (!text || !targetLanguage) {
      return res.status(400).json({
        success: false,
        message: 'Text and target language are required'
      });
    }

    const languageName = targetLanguage === 'bn' ? 'Bangla' : 'English';

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: `You are a translator. Translate the given text to ${languageName}. Only return the translation, nothing else.`
        },
        {
          role: 'user',
          content: text
        }
      ],
      temperature: 0.3,
      max_tokens: 500
    });

    const translatedText = completion.choices[0].message.content;

    res.status(200).json({
      success: true,
      translatedText: translatedText
    });

  } catch (error) {
    console.error('Groq Translation Error:', error);
    res.status(500).json({
      success: false,
      message: 'Translation failed',
      error: error.message
    });
  }
};

// @desc    Get AI health tips
// @route   GET /api/ai/health-tips
// @access  Public
exports.getHealthTips = async (req, res) => {
  try {
    const { language = 'en' } = req.query;

    const prompt = language === 'bn'
      ? 'বাংলাদেশের গ্রামীণ এলাকার মানুষের জন্য ৫টি গুরুত্বপূর্ণ স্বাস্থ্য টিপস দিন। প্রতিটি টিপস ২-৩ লাইনে লিখুন।'
      : 'Provide 5 important health tips for rural communities in Bangladesh. Keep each tip to 2-3 lines.';

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: 'You are a health advisor for rural Bangladesh.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.8,
      max_tokens: 600
    });

    const tips = completion.choices[0].message.content;

    res.status(200).json({
      success: true,
      tips: tips
    });

  } catch (error) {
    console.error('Groq Health Tips Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate health tips'
    });
  }
};

// @desc    Get chat history for user
// @route   GET /api/ai/history
// @access  Private
exports.getChatHistory = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const { sessionId } = req.query;

    console.log('📚 Fetching chat history for user:', userId);

    let query = {
      user: userId,
      isActive: true
    };

    if (sessionId) {
      query.sessionId = sessionId;
    }

    const chatHistories = await AIChatHistory.find(query)
      .sort({ lastActivity: -1 })
      .limit(10);

    if (!chatHistories || chatHistories.length === 0) {
      return res.status(200).json({
        success: true,
        history: [],
        message: 'No chat history found'
      });
    }

    // If sessionId specified, return that session's messages
    if (sessionId && chatHistories[0]) {
      return res.status(200).json({
        success: true,
        sessionId: chatHistories[0].sessionId,
        messages: chatHistories[0].messages,
        lastActivity: chatHistories[0].lastActivity
      });
    }

    // Otherwise return list of sessions
    const sessions = chatHistories.map(chat => ({
      sessionId: chat.sessionId,
      messageCount: chat.messages.length,
      lastActivity: chat.lastActivity,
      preview: chat.messages.length > 0 
        ? chat.messages[chat.messages.length - 1].content.substring(0, 50) + '...'
        : 'No messages'
    }));

    res.status(200).json({
      success: true,
      sessions: sessions
    });

  } catch (error) {
    console.error('❌ Get chat history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve chat history',
      error: error.message
    });
  }
};

// @desc    Clear chat history
// @route   DELETE /api/ai/history
// @access  Private
exports.clearChatHistory = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const { sessionId } = req.body;

    console.log('🗑️ Clearing chat history:', { userId, sessionId });

    if (sessionId) {
      // Clear specific session
      const result = await AIChatHistory.findOneAndUpdate(
        {
          user: userId,
          sessionId: sessionId
        },
        {
          isActive: false
        }
      );

      if (!result) {
        return res.status(404).json({
          success: false,
          message: 'Chat session not found'
        });
      }

      console.log('✅ Session marked as inactive');
    } else {
      // Clear all sessions
      await AIChatHistory.updateMany(
        {
          user: userId,
          isActive: true
        },
        {
          isActive: false
        }
      );

      console.log('✅ All sessions marked as inactive');
    }

    res.status(200).json({
      success: true,
      message: 'Chat history cleared successfully'
    });

  } catch (error) {
    console.error('❌ Clear chat history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear chat history',
      error: error.message
    });
  }
};
