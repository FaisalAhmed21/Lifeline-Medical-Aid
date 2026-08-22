const axios = require('axios');

exports.askChatbot = async (req, res) => {
  try {
    const { message, history } = req.body;
    
    if (!message) {
      return res.status(400).json({ success: false, error: 'Message is required' });
    }

    const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
    const GROQ_API_KEY = process.env.GROQ_API_KEY;

    if ((!OPENROUTER_API_KEY || OPENROUTER_API_KEY === 'your-openrouter-api-key') && !GROQ_API_KEY) {
      return res.status(500).json({
        success: false,
        error: 'No AI provider API key is configured on the server.'
      });
    }

    // Prepare messages array for OpenRouter
    const systemPrompt = {
      role: 'system',
      content: 'You are LifeBot, a professional medical and first-aid navigation assistant for the Lifeline Medical Aid platform. Your primary job is to help users navigate medical emergencies, provide basic first-aid instructions, and direct them to book an ambulance or consult a doctor on the platform. Always advise them to seek professional medical help for severe issues.'
    };

    const formattedHistory = Array.isArray(history) ? history.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content
    })) : [];

    const messages = [systemPrompt, ...formattedHistory, { role: 'user', content: message }];

    const useGroq = !OPENROUTER_API_KEY || OPENROUTER_API_KEY === 'your-openrouter-api-key';

    const response = await axios.post(
      useGroq
        ? 'https://api.groq.com/openai/v1/chat/completions'
        : 'https://openrouter.ai/api/v1/chat/completions',
      {
        model: useGroq ? 'openai/gpt-oss-120b' : 'openrouter/free',
        messages: messages,
        max_tokens: 1000,
      },
      {
        headers: {
          'Authorization': `Bearer ${useGroq ? GROQ_API_KEY : OPENROUTER_API_KEY}`,
          'HTTP-Referer': process.env.CLIENT_URL || 'http://localhost:3000',
          'X-Title': 'Lifeline Medical Aid',
          'Content-Type': 'application/json'
        },
        timeout: 15000 // 15 seconds timeout
      }
    );

    const reply = response.data?.choices?.[0]?.message?.content || "I'm sorry, I couldn't process that.";
    
    res.json({
      success: true,
      reply: reply
    });
    
  } catch (error) {
    console.error('Chatbot API Error:', error.response?.data || error.message);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to communicate with AI provider. Please try again later.' 
    });
  }
};
