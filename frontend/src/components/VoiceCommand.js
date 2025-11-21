import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { FaMicrophone, FaStop } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const VoiceCommand = ({ onCommand }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef(null);

  useEffect(() => {
    // Check if browser supports Speech Recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      setIsSupported(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      
      // Support both English and Bangla
      recognition.lang = user?.preferredLanguage === 'bn' ? 'bn-BD' : 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        setTranscript('');
      };

      recognition.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        setTranscript(finalTranscript || interimTranscript);

        if (finalTranscript) {
          processVoiceCommand(finalTranscript.toLowerCase());
        }
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [user?.preferredLanguage]);

  const processVoiceCommand = (command) => {
    // English commands
    const callHelpPatterns = ['call help', 'need help', 'emergency', 'help me', 'send help'];
    const sendLocationPatterns = ['send my location', 'share location', 'send location', 'where am i'];
    
    // Bangla commands (phonetic)
    const callHelpPatternsBn = ['সাহায্য চাই', 'হেল্প', 'জরুরি', 'সাহায্য', 'বাঁচাও'];
    const sendLocationPatternsBn = ['আমার লোকেশন পাঠাও', 'অবস্থান পাঠাও', 'লোকেশন শেয়ার'];

    const allCallHelp = [...callHelpPatterns, ...callHelpPatternsBn];
    const allSendLocation = [...sendLocationPatterns, ...sendLocationPatternsBn];

    // Check for call help command
    if (allCallHelp.some(pattern => command.includes(pattern))) {
      handleCallHelp();
    }
    // Check for send location command
    else if (allSendLocation.some(pattern => command.includes(pattern))) {
      handleSendLocation();
    }
    else {
      // Unknown command
      if (onCommand) {
        onCommand({ type: 'unknown', command });
      }
    }
  };

  const handleCallHelp = async () => {
    try {
      // Get current location
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;
            
            // Create emergency request
            await axios.post(`${process.env.REACT_APP_API_URL}/emergency/create`, {
              location: {
                type: 'Point',
                coordinates: [longitude, latitude]
              },
              description: 'Emergency activated via voice command',
              urgencyLevel: 'high'
            });

            if (onCommand) {
              onCommand({ type: 'call_help', success: true });
            }

            // Provide voice feedback
            speak('Emergency help has been dispatched to your location');
          },
          (error) => {
            console.error('Geolocation error:', error);
            if (onCommand) {
              onCommand({ type: 'call_help', success: false, error: 'Location unavailable' });
            }
            speak('Unable to get your location. Please enable location services.');
          }
        );
      }
    } catch (error) {
      console.error('Error calling help:', error);
      if (onCommand) {
        onCommand({ type: 'call_help', success: false, error: error.message });
      }
      speak('Failed to send emergency request. Please try again.');
    }
  };

  const handleSendLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          
          if (onCommand) {
            onCommand({ 
              type: 'send_location', 
              success: true, 
              location: { latitude, longitude } 
            });
          }

          // Copy to clipboard
          const locationText = `My location: https://www.google.com/maps?q=${latitude},${longitude}`;
          navigator.clipboard.writeText(locationText);
          
          speak('Your location has been copied to clipboard');
        },
        (error) => {
          console.error('Geolocation error:', error);
          if (onCommand) {
            onCommand({ type: 'send_location', success: false, error: 'Location unavailable' });
          }
          speak('Unable to get your location. Please enable location services.');
        }
      );
    }
  };

  const speak = (text) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = user?.preferredLanguage === 'bn' ? 'bn-BD' : 'en-US';
      window.speechSynthesis.speak(utterance);
    }
  };

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      recognitionRef.current.start();
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  };

  if (!isSupported) {
    return null;
  }

  return (
    <div className="fixed bottom-20 right-4 z-40">
      <button
        onClick={isListening ? stopListening : startListening}
        className={`p-4 rounded-full shadow-lg transition-all ${
          isListening 
            ? 'bg-red-500 hover:bg-red-600 animate-pulse' 
            : 'bg-blue-500 hover:bg-blue-600'
        } text-white`}
        title={isListening ? t('stopListening') : t('startListening')}
      >
        {isListening ? <FaStop size={24} /> : <FaMicrophone size={24} />}
      </button>
      
      {transcript && (
        <div className="mt-2 bg-white p-3 rounded-lg shadow-md max-w-xs">
          <p className="text-sm text-gray-700">{transcript}</p>
        </div>
      )}
    </div>
  );
};

export default VoiceCommand;
