import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FaComments, FaTimes, FaPaperPlane, FaMicrophone, FaStop, FaVolumeUp } from 'react-icons/fa';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';

const LifeBot = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const audioRef = useRef(null); // Reference to current audio playback
  const audioChunksRef = useRef([]); // Reference to audio chunks for Bangla

  const currentLang = i18n.language || 'en';

  // Reset chat history when user logs out
  useEffect(() => {
    if (!user) {
      console.log('🔄 User logged out, resetting chat');
      setMessages([]);
      setSessionId(null);
      setHistoryLoaded(false);
      setIsOpen(false);
    }
  }, [user]);

  // Load speech synthesis voices
  useEffect(() => {
    if ('speechSynthesis' in window) {
      // Load voices (they load asynchronously)
      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        console.log('Available voices:', voices.length);
        console.log('Bangla voices:', voices.filter(v => v.lang.startsWith('bn') || v.lang.startsWith('hi')));
      };
      
      // Voices might not be loaded immediately
      if (window.speechSynthesis.getVoices().length > 0) {
        loadVoices();
      }
      
      // Listen for voices changed event
      window.speechSynthesis.onvoiceschanged = loadVoices;
      
      return () => {
        window.speechSynthesis.onvoiceschanged = null;
      };
    }
  }, []);

  useEffect(() => {
    if (isOpen && messages.length === 0 && !historyLoaded) {
      loadChatHistory();
    }
  }, [isOpen, currentLang]);

  const loadChatHistory = async () => {
    try {
      console.log('📚 Loading chat history...');
      const response = await api.get('/ai/history');
      
      if (response.data.success && response.data.sessions && response.data.sessions.length > 0) {
        // Get the most recent active session
        const latestSession = response.data.sessions[0];
        console.log('Found session:', latestSession.sessionId);
        
        // Load full session messages
        const sessionResponse = await api.get(`/ai/history?sessionId=${latestSession.sessionId}`);
        
        if (sessionResponse.data.success && sessionResponse.data.messages) {
          const loadedMessages = sessionResponse.data.messages.map(msg => ({
            type: msg.role === 'user' ? 'user' : 'bot',
            text: msg.content,
            timestamp: new Date(msg.timestamp)
          }));
          
          setMessages(loadedMessages);
          setSessionId(latestSession.sessionId);
          console.log('✅ Loaded', loadedMessages.length, 'messages from history');
          setHistoryLoaded(true);
          return;
        }
      }
      
      // No history found, show welcome message
      const welcomeMsg = currentLang === 'bn' 
        ? 'নমস্কার! আমি লাইফবট, আপনার এআই মেডিকেল সহায়ক। আমি কীভাবে আপনাকে সাহায্য করতে পারি?'
        : 'Hello! I\'m LifeBot, your AI medical assistant. How can I help you today?';
      
      setMessages([{
        type: 'bot',
        text: welcomeMsg,
        timestamp: new Date()
      }]);
      setHistoryLoaded(true);
      
    } catch (error) {
      console.error('❌ Error loading chat history:', error);
      
      // Show welcome message on error
      const welcomeMsg = currentLang === 'bn' 
        ? 'নমস্কার! আমি লাইফবট, আপনার এআই মেডিকেল সহায়ক। আমি কীভাবে আপনাকে সাহায্য করতে পারি?'
        : 'Hello! I\'m LifeBot, your AI medical assistant. How can I help you today?';
      
      setMessages([{
        type: 'bot',
        text: welcomeMsg,
        timestamp: new Date()
      }]);
      setHistoryLoaded(true);
    }
  };

  useEffect(() => {
    // Initialize Speech Recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      
      // Enhanced settings for better recognition
      recognition.continuous = true; // Keep listening for more accurate results
      recognition.interimResults = true; // Show interim results
      recognition.maxAlternatives = 3; // Get multiple alternatives
      recognition.lang = currentLang === 'bn' ? 'bn-BD' : 'en-US';

      recognition.onstart = () => {
        console.log('Speech recognition started');
        setIsListening(true);
      };

      recognition.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';

        // Process all results
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          } else {
            interimTranscript += transcript;
          }
        }

        // Update input with final or interim results
        if (finalTranscript) {
          setInputMessage(prev => prev + finalTranscript);
        } else if (interimTranscript) {
          setInputMessage(interimTranscript);
        }
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        
        // Show helpful error messages
        if (event.error === 'no-speech') {
          console.log('No speech detected. Please try again.');
        } else if (event.error === 'audio-capture') {
          alert('Microphone not found. Please check your microphone settings.');
        } else if (event.error === 'not-allowed') {
          alert('Microphone permission denied. Please allow microphone access.');
        }
        
        setIsListening(false);
        
        // Try to stop if error occurs
        try {
          recognition.stop();
        } catch (e) {
          // Ignore
        }
      };

      recognition.onend = () => {
        console.log('Speech recognition ended');
        setIsListening(false);
      };

      recognition.onspeechstart = () => {
        console.log('Speech detected');
      };

      recognition.onspeechend = () => {
        console.log('Speech ended');
      };

      recognitionRef.current = recognition;
    } else {
      console.error('Speech Recognition not supported in this browser');
      alert('Voice input not supported in this browser. Please use Chrome or Edge.');
    }

    return () => {
      // Cleanup on unmount
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // Ignore if already stopped
        }
      }
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, [currentLang]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const startListening = () => {
    if (!recognitionRef.current) {
      alert('Voice recognition not available. Please use Chrome or Edge browser.');
      return;
    }

    if (isListening) {
      console.log('Already listening...');
      return;
    }

    try {
      // Clear input before starting
      setInputMessage('');
      
      // Stop any ongoing recognition first
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // Ignore if already stopped
      }
      
      // Small delay to ensure it's fully stopped
      setTimeout(() => {
        try {
          recognitionRef.current.lang = currentLang === 'bn' ? 'bn-BD' : 'en-US';
          console.log('Starting recognition with language:', recognitionRef.current.lang);
          recognitionRef.current.start();
        } catch (err) {
          console.error('Failed to start:', err);
          setIsListening(false);
        }
      }, 200);
    } catch (error) {
      console.error('Error starting speech recognition:', error);
      setIsListening(false);
      alert('Could not start voice recognition. Please check microphone permissions.');
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      try {
        recognitionRef.current.stop();
        console.log('Stopping recognition');
        setIsListening(false);
      } catch (error) {
        console.error('Error stopping speech recognition:', error);
        setIsListening(false);
      }
    }
  };

  const speakText = (text) => {
    if (!text) return;
    
    // Clean text: remove markdown formatting, asterisks, special characters
    const cleanText = text
      .replace(/\*\*/g, '') // Remove bold markers
      .replace(/\*/g, '')   // Remove asterisks
      .replace(/_/g, '')    // Remove underscores
      .replace(/#{1,6}\s/g, '') // Remove markdown headers
      .replace(/`/g, '')    // Remove code markers
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // Remove markdown links, keep text
      .replace(/\n+/g, '. ') // Replace newlines with periods
      .replace(/\s+/g, ' ') // Normalize spaces
      .trim();
    
    // Detect if text contains Bangla characters (Unicode range: 0980-09FF)
    const hasBangla = /[\u0980-\u09FF]/.test(cleanText);
    
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      
      // ALWAYS use Google Translate TTS for Bangla text (superior quality)
      if (hasBangla || currentLang === 'bn') {
        console.log('🔊 Using Google Translate TTS for Bangla voice');
        
        // Split long text into chunks (Google TTS has 200 char limit)
        const chunks = cleanText.match(/.{1,200}(\s|$)/g) || [cleanText];
        audioChunksRef.current = []; // Clear previous chunks
        
        let currentChunk = 0;
        const playNextChunk = () => {
          // Check if speaking was stopped
          if (!isSpeaking) {
            console.log('🛑 Voice playback stopped by user');
            return;
          }
          
          if (currentChunk >= chunks.length) {
            setIsSpeaking(false);
            audioRef.current = null;
            console.log('✅ Bangla voice playback complete');
            return;
          }
          
          const chunk = chunks[currentChunk].trim();
          if (!chunk) {
            currentChunk++;
            playNextChunk();
            return;
          }
          
          // Use Google Translate TTS API with Bangla voice (bn)
          const audioUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(chunk)}&tl=bn&client=tw-ob&ttsspeed=0.8`;
          const audio = new Audio(audioUrl);
          audioRef.current = audio; // Store reference
          audioChunksRef.current.push(audio); // Store in chunks array
          
          audio.onended = () => {
            console.log(`📢 Completed chunk ${currentChunk + 1}/${chunks.length}`);
            currentChunk++;
            playNextChunk();
          };
          
          audio.onerror = (err) => {
            console.error('❌ Google TTS failed for chunk:', err);
            currentChunk++;
            playNextChunk();
          };
          
          audio.play().catch(err => {
            console.error('❌ Audio play failed:', err);
            currentChunk++;
            playNextChunk();
          });
        };
        
        setIsSpeaking(true);
        playNextChunk();
        return;
      }
      
      // For English, use system voice
      speakWithDefaultVoice(cleanText);
    } else {
      console.warn('Speech synthesis not supported');
    }
  };

  const stopSpeaking = () => {
    console.log('🛑 Stopping voice playback');
    setIsSpeaking(false);
    
    // Stop Google TTS audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    
    // Stop all audio chunks
    if (audioChunksRef.current && audioChunksRef.current.length > 0) {
      audioChunksRef.current.forEach(audio => {
        try {
          audio.pause();
          audio.currentTime = 0;
        } catch (err) {
          // Ignore errors
        }
      });
      audioChunksRef.current = [];
    }
    
    // Stop system speech synthesis
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  };

  const speakWithDefaultVoice = (text) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = currentLang === 'bn' ? 'bn-BD' : 'en-US';
    utterance.rate = 0.85;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    
    // Try to find the best voice for the language
    const voices = window.speechSynthesis.getVoices();
    
    if (currentLang === 'bn') {
      // Try to find Bangla voice
      const banglaVoice = voices.find(voice => 
        voice.lang.startsWith('bn') || 
        voice.lang.startsWith('hi') || // Hindi as fallback (similar)
        voice.name.toLowerCase().includes('bangla') ||
        voice.name.toLowerCase().includes('bengali')
      );
      
      if (banglaVoice) {
        utterance.voice = banglaVoice;
        console.log('Using Bangla voice:', banglaVoice.name);
      } else {
        console.warn('No Bangla voice found. Available voices:', voices.map(v => v.name));
        // Will use default voice
      }
    } else {
      // Find best English voice
      const englishVoice = voices.find(voice => 
        voice.lang.startsWith('en')
      );
      if (englishVoice) {
        utterance.voice = englishVoice;
      }
    }
    
    utterance.onstart = () => {
      console.log('Speaking:', text.substring(0, 50) + '...');
      setIsSpeaking(true);
    };
    
    utterance.onend = () => {
      console.log('Speech ended');
      setIsSpeaking(false);
    };
    
    utterance.onerror = (event) => {
      console.error('Speech error:', event.error);
      setIsSpeaking(false);
      
      if (event.error === 'not-allowed') {
        alert('Speech permission denied. Please allow sound in your browser.');
      }
    };
    
    window.speechSynthesis.speak(utterance);
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMsg = {
      type: 'user',
      text: inputMessage,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMsg]);
    setInputMessage('');
    setIsTyping(true);

    try {
      console.log('💬 Sending message with sessionId:', sessionId);
      
      // Call backend API that uses Groq AI with persistent storage
      const response = await api.post('/ai/chat', {
        message: inputMessage,
        language: currentLang,
        sessionId: sessionId // Include session ID for persistence
      });

      // Update session ID if new one was created
      if (response.data.sessionId && !sessionId) {
        setSessionId(response.data.sessionId);
        console.log('📝 New session created:', response.data.sessionId);
      }

      const botMsg = {
        type: 'bot',
        text: response.data.response,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, botMsg]);
      
      // Auto-speak the response
      speakText(response.data.response);
    } catch (error) {
      console.error('❌ Error getting AI response:', error);
      const errorMsg = currentLang === 'bn'
        ? 'দুঃখিত, একটি ত্রুটি ঘটেছে। অনুগ্রহ করে আবার চেষ্টা করুন।'
        : 'Sorry, an error occurred. Please try again.';
      
      const botMsg = {
        type: 'bot',
        text: errorMsg,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const quickActions = [
    { 
      key: 'emergency', 
      labelEn: '🚨 Emergency Help', 
      labelBn: '🚨 জরুরি সাহায্য',
      prompt: currentLang === 'bn' 
        ? 'জরুরি পরিস্থিতিতে আমার কী করা উচিত?'
        : 'What should I do in an emergency?'
    },
    { 
      key: 'symptoms', 
      labelEn: '🩺 Check Symptoms', 
      labelBn: '🩺 লক্ষণ পরীক্ষা',
      prompt: currentLang === 'bn'
        ? 'আমি অসুস্থ বোধ করছি। আমাকে সাহায্য করুন।'
        : 'I\'m feeling sick. Help me check my symptoms.'
    },
    { 
      key: 'firstaid', 
      labelEn: '🏥 First Aid', 
      labelBn: '🏥 প্রাথমিক চিকিৎসা',
      prompt: currentLang === 'bn'
        ? 'প্রাথমিক চিকিৎসা সম্পর্কে বলুন'
        : 'Tell me about first aid procedures'
    },
    { 
      key: 'medication', 
      labelEn: '💊 Medications', 
      labelBn: '💊 ওষুধ',
      prompt: currentLang === 'bn'
        ? 'ওষুধ সম্পর্কে তথ্য দিন'
        : 'I need information about medications'
    }
  ];

  const handleQuickAction = (prompt) => {
    setInputMessage(prompt);
    setTimeout(() => handleSendMessage(), 100);
  };

  return (
    <>
      {/* Chatbot Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-4 right-4 z-50 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white p-4 rounded-full shadow-lg transition-all transform hover:scale-110"
          title="LifeBot - AI Medical Assistant"
        >
          <FaComments size={28} />
        </button>
      )}

      {/* Chatbot Window */}
      {isOpen && (
        <div className="fixed bottom-4 right-4 z-50 w-96 h-[600px] bg-white rounded-lg shadow-2xl flex flex-col">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4 rounded-t-lg flex justify-between items-center">
            <div>
              <h3 className="font-bold text-lg">🤖 LifeBot</h3>
              <p className="text-xs opacity-90">
                {currentLang === 'bn' ? 'এআই মেডিকেল সহায়ক' : 'AI Medical Assistant'}
              </p>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="hover:bg-white/20 p-2 rounded transition-all"
            >
              <FaTimes />
            </button>
          </div>

          {/* Quick Actions */}
          <div className="p-3 bg-gray-50 border-b overflow-x-auto">
            <div className="flex gap-2 flex-wrap">
              {quickActions.map(action => (
                <button
                  key={action.key}
                  onClick={() => handleQuickAction(action.prompt)}
                  className="bg-white border border-gray-300 px-3 py-1 rounded-full text-xs hover:bg-blue-50 hover:border-blue-500 transition-all whitespace-nowrap"
                >
                  {currentLang === 'bn' ? action.labelBn : action.labelEn}
                </button>
              ))}
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] p-3 rounded-lg ${
                    msg.type === 'user'
                      ? 'bg-blue-500 text-white rounded-br-none'
                      : 'bg-white text-gray-800 shadow rounded-bl-none'
                  }`}
                >
                  <p className="text-sm whitespace-pre-line">{msg.text}</p>
                  <p className={`text-xs mt-1 ${msg.type === 'user' ? 'text-blue-100' : 'text-gray-400'}`}>
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
            
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-white p-3 rounded-lg shadow">
                  <div className="flex space-x-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t bg-white">
            <div className="flex gap-2 items-end">
              <button
                onClick={isListening ? stopListening : startListening}
                className={`${
                  isListening 
                    ? 'bg-red-500 hover:bg-red-600 animate-pulse' 
                    : 'bg-purple-500 hover:bg-purple-600'
                } text-white p-3 rounded-lg transition-all`}
                title={isListening ? 'Stop listening' : 'Voice input'}
              >
                {isListening ? <FaStop /> : <FaMicrophone />}
              </button>
              
              {isSpeaking && (
                <button
                  onClick={stopSpeaking}
                  className="bg-red-500 hover:bg-red-600 text-white p-3 rounded-lg transition-all animate-pulse"
                  title="Stop voice"
                >
                  <FaVolumeUp className="animate-pulse" />
                </button>
              )}
              
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder={currentLang === 'bn' ? 'বার্তা লিখুন...' : 'Type a message...'}
                className="flex-1 border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500"
                disabled={isTyping || isListening}
              />
              
              <button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || isTyping}
                className={`${
                  !inputMessage.trim() || isTyping
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-500 hover:bg-blue-600'
                } text-white p-3 rounded-lg transition-all`}
              >
                <FaPaperPlane />
              </button>
            </div>
            
            <p className="text-xs text-red-500 mt-2 text-center">
              {currentLang === 'bn' 
                ? '⚠️ জরুরি অবস্থার জন্য ৯৯৯ কল করুন'
                : '⚠️ For emergencies, call 999 immediately'
              }
            </p>
          </div>
        </div>
      )}
    </>
  );
};

export default LifeBot;
