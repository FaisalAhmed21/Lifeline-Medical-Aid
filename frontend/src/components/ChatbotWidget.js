import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { FaCommentDots, FaTimes, FaPaperPlane } from 'react-icons/fa';
import api from '../utils/api';

const ChatbotWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hi there! I am LifeBot, your Lifeline Medical Aid assistant. How can I help you today? You can ask me for basic first-aid advice or how to use the platform.' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  const toggleChat = () => setIsOpen(!isOpen);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSend = async (e) => {
    e?.preventDefault();
    if (!input.trim()) return;

    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    try {
      const response = await api.post('/chatbot/ask', {
        message: userMessage.content,
        history: messages
      });

      if (response.data.success) {
        setMessages(prev => [...prev, { role: 'assistant', content: response.data.reply }]);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }]);
      }
    } catch (error) {
      console.error('Chatbot error:', error);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I am unable to connect to the server right now.' }]);
    }
    setIsTyping(false);
  };

  const handleSuggestedPrompt = (prompt) => {
    setInput(prompt);
  };

  const suggestedPrompts = [
    "I need an ambulance quickly",
    "How do I perform CPR?",
    "First aid for a burn",
    "How do I book a doctor?"
  ];

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* Chat Window */}
      {isOpen && (
        <div className="bg-white w-[350px] max-w-[90vw] h-[500px] max-h-[80vh] rounded-2xl shadow-2xl flex flex-col mb-4 border border-gray-200 overflow-hidden transform transition-all duration-300 origin-bottom-right">
          {/* Header */}
          <div className="bg-[#e2136e] text-white p-4 flex justify-between items-center rounded-t-2xl shadow-md">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-[#e2136e] font-bold text-xl">
                L
              </div>
              <div>
                <h3 className="font-bold text-lg leading-tight">LifeBot</h3>
                <p className="text-xs text-red-100">Medical AI Assistant</p>
              </div>
            </div>
            <button onClick={toggleChat} className="text-red-100 hover:text-white transition">
              <FaTimes size={20} />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 bg-gray-50 space-y-4">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-2 shadow-sm text-sm ${msg.role === 'user' ? 'bg-[#e2136e] text-white rounded-br-none' : 'bg-white text-gray-800 border border-gray-100 rounded-bl-none'}`}>
                  {msg.content}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-white text-gray-800 border border-gray-100 rounded-2xl rounded-bl-none px-4 py-3 shadow-sm flex gap-1">
                  <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Suggested Prompts */}
          {messages.length === 1 && !isTyping && (
            <div className="px-4 pb-2 bg-gray-50 flex flex-wrap gap-2">
              {suggestedPrompts.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSuggestedPrompt(prompt)}
                  className="bg-white border border-[#e2136e] text-[#e2136e] text-xs px-3 py-1.5 rounded-full hover:bg-[#e2136e] hover:text-white transition shadow-sm"
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}

          {/* Input Area */}
          <form onSubmit={handleSend} className="p-3 bg-white border-t border-gray-100 flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask LifeBot..."
              className="flex-1 bg-gray-100 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#e2136e]"
              disabled={isTyping}
            />
            <button
              type="submit"
              disabled={!input.trim() || isTyping}
              className="w-10 h-10 bg-[#e2136e] text-white rounded-full flex items-center justify-center hover:bg-[#b50a54] disabled:opacity-50 transition shadow-md"
            >
              <FaPaperPlane size={14} className="ml-[-2px]" />
            </button>
          </form>
        </div>
      )}

      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={toggleChat}
          className="w-16 h-16 bg-[#e2136e] text-white rounded-full flex items-center justify-center shadow-2xl hover:bg-[#b50a54] hover:scale-110 transition transform duration-300"
        >
          <FaCommentDots size={28} />
        </button>
      )}
    </div>
  );
};

export default ChatbotWidget;
