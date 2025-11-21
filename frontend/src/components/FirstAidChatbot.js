import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FaComments, FaTimes, FaPaperPlane, FaMicrophone, FaStop } from 'react-icons/fa';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const FirstAidChatbot = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      type: 'bot',
      text: 'Hello! I\'m LifeBot, your AI medical assistant. How can I help you today?',
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const synthesisRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const firstAidKnowledgeBase = {
    // Symptom keywords and responses
    bleeding: {
      en: "For bleeding: 1) Apply direct pressure with a clean cloth. 2) Elevate the wound above heart level. 3) Don't remove the cloth if soaked - add more on top. 4) If severe, call emergency services immediately.",
      bn: "রক্তপাতের জন্য: ১) একটি পরিষ্কার কাপড় দিয়ে সরাসরি চাপ দিন। ২) ক্ষতস্থান হৃদয়ের উপরে তুলুন। ৩) কাপড় ভিজে গেলে সরাবেন না - উপরে আরও যোগ করুন। ৪) গুরুতর হলে অবিলম্বে জরুরি সেবায় কল করুন।"
    },
    burn: {
      en: "For burns: 1) Cool the burn with cool (not cold) running water for 10-20 minutes. 2) Remove jewelry/tight items before swelling. 3) Cover with sterile gauze. 4) Don't use ice, butter, or ointments. Seek medical help for severe burns.",
      bn: "পোড়ার জন্য: ১) ১০-২০ মিনিট ঠান্ডা (বরফ নয়) পানি দিয়ে পোড়া ঠান্ডা করুন। ২) ফুলে যাওয়ার আগে গহনা/টাইট জিনিস সরান। ৩) জীবাণুমুক্ত গজ দিয়ে ঢেকে দিন। ৪) বরফ, মাখন বা মলম ব্যবহার করবেন না। গুরুতর পোড়ার জন্য চিকিৎসা সহায়তা নিন।"
    },
    choking: {
      en: "For choking: 1) Encourage coughing if possible. 2) Perform 5 back blows between shoulder blades. 3) If unsuccessful, perform Heimlich maneuver (abdominal thrusts). 4) Call emergency if object doesn't dislodge.",
      bn: "দম বন্ধ হওয়ার জন্য: ১) সম্ভব হলে কাশি দিতে উৎসাহিত করুন। ২) কাঁধের ব্লেডের মাঝে ৫টি পিঠে আঘাত করুন। ৩) ব্যর্থ হলে হেইমলিখ পদ্ধতি (পেটে চাপ) করুন। ৪) বস্তু বের না হলে জরুরি কল করুন।"
    },
    fracture: {
      en: "For fractures: 1) Don't move the injured area. 2) Immobilize with splints if available. 3) Apply ice packs (wrapped in cloth). 4) Elevate if possible. 5) Seek immediate medical attention.",
      bn: "হাড় ভাঙার জন্য: ১) আহত এলাকা সরাবেন না। ২) স্প্লিন্ট পাওয়া গেলে স্থির করুন। ৩) বরফের প্যাক (কাপড়ে মোড়ানো) লাগান। ৪) সম্ভব হলে উপরে তুলুন। ৫) অবিলম্বে চিকিৎসা সহায়তা নিন।"
    },
    heartattack: {
      en: "For heart attack: 1) Call emergency immediately (999). 2) Help person sit down and rest. 3) Loosen tight clothing. 4) Give aspirin if not allergic. 5) If unconscious and not breathing, start CPR.",
      bn: "হার্ট অ্যাটাকের জন্য: ১) অবিলম্বে জরুরি (৯৯৯) কল করুন। ২) ব্যক্তিকে বসতে এবং বিশ্রাম নিতে সাহায্য করুন। ৩) আঁটসাঁট পোশাক ঢিলা করুন। ৪) এলার্জি না থাকলে অ্যাসপিরিন দিন। ৫) অজ্ঞান এবং শ্বাস না নিলে সিপিআর শুরু করুন।"
    },
    stroke: {
      en: "For stroke (FAST): Face drooping, Arm weakness, Speech difficulty - Time to call 999. Don't give food/water. Note symptom onset time.",
      bn: "স্ট্রোকের জন্য: মুখ ঝুলে পড়া, বাহু দুর্বলতা, কথা বলতে সমস্যা - ৯৯৯ কল করার সময়। খাবার/পানি দেবেন না। লক্ষণ শুরু হওয়ার সময় নোট করুন।"
    },
    seizure: {
      en: "For seizures: 1) Protect from injury - clear area. 2) Place on side. 3) Cushion head. 4) Don't restrain or put anything in mouth. 5) Time the seizure. Call 999 if lasts >5 minutes.",
      bn: "খিঁচুনির জন্য: ১) আঘাত থেকে রক্ষা করুন - এলাকা পরিষ্কার করুন। ২) পাশে রাখুন। ৩) মাথা কুশন করুন। ৪) সংযত করবেন না বা মুখে কিছু রাখবেন না। ৫) খিঁচুনির সময় নিন। ৫ মিনিটের বেশি স্থায়ী হলে ৯৯৯ কল করুন।"
    },
    poisoning: {
      en: "For poisoning: 1) Call poison control/999. 2) Don't induce vomiting unless instructed. 3) Keep poison container. 4) If on skin, rinse with water. 5) If inhaled, get to fresh air.",
      bn: "বিষক্রিয়ার জন্য: ১) পয়জন কন্ট্রোল/৯৯৯ কল করুন। ২) নির্দেশ না দিলে বমি করাবেন না। ৩) বিষের পাত্র রাখুন। ৪) ত্বকে লাগলে পানি দিয়ে ধুয়ে ফেলুন। ৫) শ্বাস নিলে তাজা বাতাসে নিয়ে যান।"
    }
  };

  const quickActions = [
    { key: 'bleeding', labelEn: 'Bleeding', labelBn: 'রক্তপাত' },
    { key: 'burn', labelEn: 'Burn', labelBn: 'পোড়া' },
    { key: 'choking', labelEn: 'Choking', labelBn: 'দম বন্ধ' },
    { key: 'fracture', labelEn: 'Fracture', labelBn: 'হাড় ভাঙা' },
    { key: 'heartattack', labelEn: 'Heart Attack', labelBn: 'হার্ট অ্যাটাক' },
    { key: 'stroke', labelEn: 'Stroke', labelBn: 'স্ট্রোক' }
  ];

  const handleQuickAction = (key) => {
    const userMsg = {
      type: 'user',
      text: quickActions.find(a => a.key === key)?.labelEn || key,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMsg]);
    
    setTimeout(() => {
      const response = firstAidKnowledgeBase[key];
      if (response) {
        const botMsg = {
          type: 'bot',
          text: response[t('langCode')] || response.en,
          isRaw: true,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, botMsg]);
      }
    }, 500);
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

    // Simple keyword matching
    const message = inputMessage.toLowerCase();
    let response = null;

    for (const [key, value] of Object.entries(firstAidKnowledgeBase)) {
      if (message.includes(key) || message.includes(key.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase())) {
        response = value[t('langCode')] || value.en;
        break;
      }
    }

    // Default response if no match
    if (!response) {
      response = t('langCode') === 'bn' 
        ? 'আপনার লক্ষণের জন্য, আমি উপরের দ্রুত বাটনগুলি থেকে একটি নির্বাচন করার পরামর্শ দিই বা আরও নির্দিষ্ট শব্দ ব্যবহার করুন যেমন "রক্তপাত", "পোড়া", "দম বন্ধ", ইত্যাদি। জরুরী অবস্থার জন্য, দয়া করে অবিলম্বে ৯৯৯ কল করুন।'
        : 'For your symptoms, I recommend selecting one of the quick buttons above or using more specific terms like "bleeding", "burn", "choking", etc. For emergencies, please call 999 immediately.';
    }

    setTimeout(() => {
      const botMsg = {
        type: 'bot',
        text: response,
        isRaw: true,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botMsg]);
      setIsTyping(false);
    }, 1000);
  };

  return (
    <>
      {/* Chatbot Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-4 right-4 z-50 bg-green-500 hover:bg-green-600 text-white p-4 rounded-full shadow-lg transition-all"
          title={t('firstAidAssistant')}
        >
          <FaComments size={24} />
        </button>
      )}

      {/* Chatbot Window */}
      {isOpen && (
        <div className="fixed bottom-4 right-4 z-50 w-96 h-[600px] bg-white rounded-lg shadow-2xl flex flex-col">
          {/* Header */}
          <div className="bg-green-500 text-white p-4 rounded-t-lg flex justify-between items-center">
            <div>
              <h3 className="font-bold">{t('firstAidAssistant')}</h3>
              <p className="text-xs opacity-90">{t('emergencyGuidance')}</p>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="hover:bg-green-600 p-2 rounded"
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
                  onClick={() => handleQuickAction(action.key)}
                  className="bg-white border border-gray-300 px-3 py-1 rounded-full text-sm hover:bg-green-50 hover:border-green-500 transition-all whitespace-nowrap"
                >
                  {t('langCode') === 'bn' ? action.labelBn : action.labelEn}
                </button>
              ))}
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] p-3 rounded-lg ${
                    msg.type === 'user'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  <p className="text-sm whitespace-pre-line">
                    {msg.isRaw ? msg.text : t(msg.text)}
                  </p>
                  <p className="text-xs mt-1 opacity-70">
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-gray-100 p-3 rounded-lg">
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
          <div className="p-4 border-t">
            <div className="flex gap-2">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder={t('typeSymptoms')}
                className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-green-500"
              />
              <button
                onClick={handleSendMessage}
                className="bg-green-500 hover:bg-green-600 text-white p-2 rounded-lg transition-all"
              >
                <FaPaperPlane />
              </button>
            </div>
            <p className="text-xs text-red-500 mt-2 text-center">
              {t('emergencyCall999')}
            </p>
          </div>
        </div>
      )}
    </>
  );
};

export default FirstAidChatbot;
