import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import io from 'socket.io-client';
import { 
  FaPaperPlane, 
  FaPhone, 
  FaMicrophone, 
  FaStop,
  FaUser,
  FaSpinner,
  FaFileMedical,
  FaFileAlt,
  FaImage
} from 'react-icons/fa';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import './ChatRoom.css';
import DetailedPrescriptionPanel from '../components/DetailedPrescriptionPanel';

const ChatRoom = () => {
  const { emergencyId } = useParams();
  const { user } = useAuth();
  const [chat, setChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineMessages, setOfflineMessages] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [patientData, setPatientData] = useState(null);
  const [showMedicalRecords, setShowMedicalRecords] = useState(false);
  const [emergencyDetails, setEmergencyDetails] = useState(null);
  
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const recognitionRef = useRef(null);

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Online/Offline detection
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncOfflineMessages();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Initialize Socket.IO
  useEffect(() => {
    const socket = io('http://localhost:5000');
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('✅ Connected to chat server');
      if (chat) {
        socket.emit('joinChat', chat._id);
      }
    });

    // Listen for new messages
    socket.on('newMessage', (message) => {
      setMessages(prev => [...prev, message]);
    });

    // Listen for typing status
    socket.on('typingStatus', (data) => {
      if (data.isTyping) {
        setTypingUsers(prev => [...new Set([...prev, data.userName])]);
      } else {
        setTypingUsers(prev => prev.filter(name => name !== data.userName));
      }
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [chat]);

  // Fetch or create chat
  useEffect(() => {
    fetchChat();
    if (user?.role === 'doctor') {
      fetchPatientMedicalRecords();
    } else {
      fetchEmergencyDetails();
    }
  }, [emergencyId, user?.role]);

  const fetchChat = async () => {
    try {
      const response = await api.get(`/chat/emergency/${emergencyId}`);
      if (response.data.success) {
        setChat(response.data.data);
        setMessages(response.data.data.messages || []);
        
        // Join chat room
        if (socketRef.current) {
          socketRef.current.emit('joinChat', response.data.data._id);
        }
        
        // Mark as read
        await api.put(`/chat/${response.data.data._id}/read`);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching chat:', error);
      setLoading(false);
    }
  };

  const fetchEmergencyDetails = async () => {
    try {
      const response = await api.get(`/emergency/${emergencyId}`);
      if (response.data.success) {
        setEmergencyDetails(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching emergency details:', error);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    
    if (!newMessage.trim()) return;

    const messageData = {
      content: newMessage,
      messageType: 'text'
    };

    setSending(true);

    try {
      if (isOnline) {
        // Send via API
        const response = await api.post(`/chat/${chat._id}/message`, messageData);
        
        if (response.data.success) {
          const sentMessage = response.data.message;
          
          // Broadcast via Socket.IO
          socketRef.current.emit('sendChatMessage', {
            chatId: chat._id,
            message: sentMessage
          });
          
          setNewMessage('');
        }
      } else {
        // Store offline
        const offlineMsg = {
          ...messageData,
          localId: Date.now(),
          chatId: chat._id,
          timestamp: new Date(),
          sender: user._id,
          senderName: user.name,
          senderRole: user.role,
          isOffline: true
        };
        
        setOfflineMessages(prev => [...prev, offlineMsg]);
        setMessages(prev => [...prev, offlineMsg]);
        setNewMessage('');
        
        // Store in IndexedDB
        saveToIndexedDB(offlineMsg);
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  // Voice recognition functions
  const startVoiceRecording = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Speech recognition is not supported in your browser. Please use Chrome or Edge.');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsRecording(true);
    };

    recognition.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' ';
        } else {
          interimTranscript += transcript;
        }
      }

      if (finalTranscript) {
        setNewMessage(prev => prev + finalTranscript);
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopVoiceRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }
  };

  // Fetch patient medical records for doctor
  const fetchPatientMedicalRecords = async () => {
    try {
      const emergencyResponse = await api.get(`/emergency/${emergencyId}`);
      if (emergencyResponse.data.success) {
        setEmergencyDetails(emergencyResponse.data.data);
        const patientId = emergencyResponse.data.data.patient._id || emergencyResponse.data.data.patient;
        
        const recordsResponse = await api.get(`/medical-records/user/${patientId}`);
        if (recordsResponse.data.success) {
          setPatientData(recordsResponse.data.data);
        }
      }
    } catch (error) {
      console.error('Error fetching patient records:', error);
    }
  };

  const handleTyping = () => {
    if (!isTyping) {
      setIsTyping(true);
      socketRef.current?.emit('userTyping', {
        chatId: chat._id,
        userId: user._id,
        userName: user.name,
        isTyping: true
      });
    }

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Stop typing after 2 seconds
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      socketRef.current?.emit('userTyping', {
        chatId: chat._id,
        userId: user._id,
        userName: user.name,
        isTyping: false
      });
    }, 2000);
  };

  const syncOfflineMessages = async () => {
    if (offlineMessages.length === 0) return;

    try {
      await api.post('/chat/sync-offline', {
        messages: offlineMessages
      });
      
      setOfflineMessages([]);
      clearIndexedDB();
      fetchChat(); // Refresh messages
    } catch (error) {
      console.error('Error syncing offline messages:', error);
    }
  };

  // IndexedDB functions (simplified)
  const saveToIndexedDB = (message) => {
    const stored = JSON.parse(localStorage.getItem('offlineMessages') || '[]');
    stored.push(message);
    localStorage.setItem('offlineMessages', JSON.stringify(stored));
  };

  const clearIndexedDB = () => {
    localStorage.removeItem('offlineMessages');
  };

  const makePhoneCall = (phoneNumber) => {
    window.location.href = `tel:${phoneNumber}`;
  };

  const assignedDoctor = emergencyDetails?.assignedDoctor;
  const patientInfo = emergencyDetails?.patient;
  const patientForPanel = user?.role === 'patient' ? user : patientInfo;
  const shouldShowPrescriptionPanel =
    assignedDoctor && patientForPanel && (user?.role === 'patient' || user?.role === 'doctor');

  if (loading) {
    return (
      <div className="chat-loading">
        <FaSpinner className="spinner" />
        <p>Loading chat...</p>
      </div>
    );
  }

  if (!chat) {
    return (
      <div className="chat-error">
        <p>Chat not found</p>
      </div>
    );
  }

  return (
    <div className="chat-container">
      <div className="chat-header">
        <div className="flex justify-between items-center w-full">
          <h2>Emergency Chat</h2>
          {user?.role === 'doctor' && patientData && (
            <button
              onClick={() => setShowMedicalRecords(!showMedicalRecords)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
            >
              <FaFileMedical />
              {showMedicalRecords ? 'Hide' : 'View'} Patient Records
            </button>
          )}
        </div>
        <div className="chat-participants">
          {chat.participants.map(p => (
            <div key={p.user._id} className="participant">
              <FaUser className="participant-icon" />
              <span>{p.user.name}</span>
              <span className={`role-badge ${p.role}`}>{p.role}</span>
              <button 
                onClick={() => makePhoneCall(p.user.phone)}
                className="call-btn"
                title="Call"
              >
                <FaPhone />
              </button>
            </div>
          ))}
        </div>
        {!isOnline && (
          <div className="offline-banner">
            ⚠️ You are offline. Messages will be sent when connection is restored.
          </div>
        )}
      </div>

      {user?.role === 'patient' && assignedDoctor && (
        <div className="bg-white border-l-4 border-green-500 p-4 mb-4 rounded-lg shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-sm uppercase text-green-600 font-semibold">Assigned Doctor</p>
              <h3 className="text-xl font-bold text-gray-900">{assignedDoctor.name}</h3>
              <p className="text-sm text-gray-600">
                {assignedDoctor.specialization || 'General Physician'}
                {assignedDoctor.experience && ` • ${assignedDoctor.experience}+ yrs experience`}
              </p>
            </div>
            <div className="text-sm text-gray-700">
              {assignedDoctor.phone && (
                <p>
                  Phone: <a className="text-blue-600" href={`tel:${assignedDoctor.phone}`}>{assignedDoctor.phone}</a>
                </p>
              )}
              {assignedDoctor.prescriptionFee && (
                <p>Prescription Fee: {assignedDoctor.prescriptionFee} ৳</p>
              )}
              {assignedDoctor.bkashNumber && (
                <p>bKash: {assignedDoctor.bkashNumber}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {shouldShowPrescriptionPanel && (
        <DetailedPrescriptionPanel
          emergencyId={emergencyId}
          doctor={assignedDoctor}
          patient={patientForPanel}
          currentUser={user}
        />
      )}
      
      {/* Medical Records Panel for Doctors */}
      {user?.role === 'doctor' && showMedicalRecords && patientData && (
        <div className="bg-white border-b-4 border-blue-500 p-6 max-h-96 overflow-y-auto">
          <h3 className="text-xl font-bold mb-4 text-blue-900">Patient Medical Records</h3>
          {patientData.length > 0 ? (
            <div className="space-y-4">
              {patientData.map((record) => (
                <div key={record._id} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-semibold text-lg">{record.title}</h4>
                    <span className="text-sm text-gray-500">
                      {new Date(record.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-gray-700 mb-2">{record.description}</p>
                  {record.type && (
                    <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                      {record.type}
                    </span>
                  )}
                  {record.fileUrl && (
                    <div className="mt-2">
                      <a
                        href={`http://localhost:5000${record.fileUrl}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 flex items-center gap-2"
                      >
                        {record.fileUrl.match(/\.(jpg|jpeg|png|gif)$/i) ? (
                          <>
                            <FaImage /> View Image
                          </>
                        ) : (
                          <>
                            <FaFileAlt /> View Document
                          </>
                        )}
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No medical records available for this patient.</p>
          )}
        </div>
      )}

      <div className="chat-messages">
        {messages.map((msg, index) => (
          <div 
            key={msg._id || msg.localId || index}
            className={`message ${msg.sender === user._id ? 'own-message' : 'other-message'} ${msg.isOffline ? 'offline-message' : ''}`}
          >
            <div className="message-header">
              <span className="sender-name">{msg.senderName}</span>
              <span className={`sender-role ${msg.senderRole}`}>{msg.senderRole}</span>
              <span className="message-time">
                {new Date(msg.createdAt || msg.timestamp).toLocaleTimeString()}
              </span>
            </div>
            <div className="message-content">
              {msg.content}
              {msg.isOffline && <span className="pending-badge">Pending</span>}
            </div>
          </div>
        ))}
        
        {typingUsers.length > 0 && (
          <div className="typing-indicator">
            <span>{typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...</span>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      <form className="chat-input-form" onSubmit={sendMessage}>
        <input
          type="text"
          value={newMessage}
          onChange={(e) => {
            setNewMessage(e.target.value);
            handleTyping();
          }}
          placeholder="Type a message or use voice..."
          className="chat-input"
          disabled={sending}
        />
        <button 
          type="button"
          onClick={isRecording ? stopVoiceRecording : startVoiceRecording}
          className={`voice-btn ${isRecording ? 'recording' : ''}`}
          title={isRecording ? 'Stop Recording' : 'Start Voice Input'}
        >
          {isRecording ? <FaStop className="text-red-600" /> : <FaMicrophone />}
        </button>
        <button 
          type="submit" 
          className="send-btn"
          disabled={sending || !newMessage.trim()}
        >
          {sending ? <FaSpinner className="spinner" /> : <FaPaperPlane />}
        </button>
      </form>
    </div>
  );
};

export default ChatRoom;
