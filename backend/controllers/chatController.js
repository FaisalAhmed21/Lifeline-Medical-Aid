const Chat = require('../models/Chat');
const EmergencyRequest = require('../models/EmergencyRequest');
const User = require('../models/User');
const { 
  sendNotificationToMultipleDevices,
  NotificationTemplates 
} = require('../services/notificationService');

// Get or create chat for an emergency
exports.getOrCreateChat = async (req, res) => {
  try {
    const { emergencyId } = req.params;
    const userId = req.user.id;

    // Verify emergency exists and user is participant
    const emergency = await EmergencyRequest.findById(emergencyId)
      .populate('patient assignedDoctor assignedVolunteer assignedDriver');

    if (!emergency) {
      return res.status(404).json({
        success: false,
        message: 'Emergency not found'
      });
    }

    // Check if user is authorized (patient or assigned helper)
    const isAuthorized = 
      emergency.patient._id.toString() === userId ||
      (emergency.assignedDoctor && emergency.assignedDoctor._id.toString() === userId) ||
      (emergency.assignedVolunteer && emergency.assignedVolunteer._id.toString() === userId) ||
      (emergency.assignedDriver && emergency.assignedDriver._id.toString() === userId);

    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this chat'
      });
    }

    // Find existing chat or create new one
    let chat = await Chat.findOne({ 
      emergency: emergencyId,
      isActive: true 
    }).populate('participants.user', 'name role phone');

    if (!chat) {
      // Create participants array
      const participants = [
        { user: emergency.patient._id, role: 'patient' }
      ];

      if (emergency.assignedDoctor) {
        participants.push({ user: emergency.assignedDoctor._id, role: 'doctor' });
      }
      if (emergency.assignedVolunteer) {
        participants.push({ user: emergency.assignedVolunteer._id, role: 'volunteer' });
      }
      if (emergency.assignedDriver) {
        participants.push({ user: emergency.assignedDriver._id, role: 'driver' });
      }

      // Create new chat
      chat = await Chat.create({
        emergency: emergencyId,
        participants,
        chatType: 'emergency-group'
      });

      // Populate participants
      chat = await Chat.findById(chat._id)
        .populate('participants.user', 'name role phone');

      // Add system message
      await chat.addMessage({
        sender: emergency.patient._id,
        senderName: 'System',
        senderRole: 'admin',
        content: 'Emergency chat room created. All participants can now communicate.',
        messageType: 'system'
      });
    }

    res.status(200).json({
      success: true,
      data: chat
    });
  } catch (error) {
    console.error('Get/Create chat error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get/create chat',
      error: error.message
    });
  }
};

// Send a message
exports.sendMessage = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { content, messageType, voiceUrl } = req.body;
    const userId = req.user.id;

    console.log(`📨 Sending message in chat ${chatId} from user ${userId}`);

    const chat = await Chat.findById(chatId).populate('emergency');

    if (!chat) {
      console.log(`❌ Chat ${chatId} not found`);
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    console.log(`✅ Chat found. Emergency ID: ${chat.emergency?._id || chat.emergency}`);

    // Verify user is participant
    const isParticipant = chat.participants.some(
      p => p.user.toString() === userId && p.isActive
    );

    if (!isParticipant) {
      console.log(`❌ User ${userId} is not a participant`);
      return res.status(403).json({
        success: false,
        message: 'Not authorized to send messages in this chat'
      });
    }

    // Get user details
    const user = await User.findById(userId);

    // Add message
    const messageData = {
      sender: userId,
      senderName: user.name,
      senderRole: user.role,
      content,
      messageType: messageType || 'text',
      voiceUrl: voiceUrl || null,
      isOfflineMessage: req.body.isOfflineMessage || false
    };

    await chat.addMessage(messageData);

    // Populate and return updated chat
    const updatedChat = await Chat.findById(chatId)
      .populate('participants.user', 'name role phone');

    // Send push notifications to other participants
    const otherParticipants = chat.participants.filter(
      p => p.user.toString() !== userId && p.isActive
    );

    console.log(`📨 Sending chat notification to ${otherParticipants.length} participants`);

    for (const participant of otherParticipants) {
      const recipientUser = await User.findById(participant.user);
      
      if (recipientUser && recipientUser.fcmTokens && recipientUser.fcmTokens.length > 0 && recipientUser.notificationPreferences?.pushEnabled) {
        // Create message preview (truncate if voice message)
        let messagePreview = content;
        if (messageType === 'voice') {
          messagePreview = '🎤 Voice message';
        } else if (messageType === 'image') {
          messagePreview = '📷 Image';
        } else if (messageType === 'location') {
          messagePreview = '📍 Location shared';
        }

        const notification = NotificationTemplates.newChatMessage(
          user.name,
          user.role,
          messagePreview
        );
        
        notification.data.chatId = chatId;
        notification.data.senderId = userId;
        notification.data.emergencyId = (chat.emergency?._id || chat.emergency).toString();
        
        console.log(`📤 Sending notification to ${recipientUser.name} (${recipientUser.fcmTokens.length} tokens)`);
        console.log(`📤 Notification:`, JSON.stringify(notification, null, 2));
        
        const result = await sendNotificationToMultipleDevices(recipientUser.fcmTokens, notification);
        console.log(`📤 Notification result:`, result);
      } else {
        console.log(`⚠️ Skipping notification for ${recipientUser?.name || 'unknown'}: FCM=${!!recipientUser?.fcmTokens?.length}, Enabled=${!!recipientUser?.notificationPreferences?.pushEnabled}`);
      }
    }

    res.status(200).json({
      success: true,
      data: updatedChat,
      message: updatedChat.messages[updatedChat.messages.length - 1]
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send message',
      error: error.message
    });
  }
};

// Mark messages as read
exports.markAsRead = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user.id;

    const chat = await Chat.findById(chatId);

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    await chat.markAsRead(userId);

    res.status(200).json({
      success: true,
      message: 'Messages marked as read'
    });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark messages as read',
      error: error.message
    });
  }
};

// Get chat messages with pagination
exports.getChatMessages = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const userId = req.user.id;

    const chat = await Chat.findById(chatId)
      .populate('participants.user', 'name role phone');

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    // Verify user is participant
    const isParticipant = chat.participants.some(
      p => p.user.toString() === userId
    );

    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this chat'
      });
    }

    // Paginate messages
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const messages = chat.messages.slice(-endIndex, -startIndex || undefined).reverse();

    res.status(200).json({
      success: true,
      data: {
        chat,
        messages,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: chat.messages.length,
          hasMore: startIndex + limit < chat.messages.length
        }
      }
    });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get messages',
      error: error.message
    });
  }
};

// Get all chats for a user
exports.getUserChats = async (req, res) => {
  try {
    const userId = req.user.id;

    const chats = await Chat.find({
      'participants.user': userId,
      'participants.isActive': true,
      isActive: true
    })
      .populate('participants.user', 'name role phone')
      .populate('emergency', 'urgencyLevel status createdAt')
      .sort('-lastMessageAt');

    res.status(200).json({
      success: true,
      count: chats.length,
      data: chats
    });
  } catch (error) {
    console.error('Get user chats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get chats',
      error: error.message
    });
  }
};

// Sync offline messages
exports.syncOfflineMessages = async (req, res) => {
  try {
    const { messages } = req.body; // Array of offline messages
    const userId = req.user.id;

    const results = [];

    for (const msg of messages) {
      try {
        const chat = await Chat.findById(msg.chatId);
        
        if (chat) {
          const user = await User.findById(userId);
          
          await chat.addMessage({
            sender: userId,
            senderName: user.name,
            senderRole: user.role,
            content: msg.content,
            messageType: msg.messageType || 'text',
            isOfflineMessage: true
          });

          results.push({
            localId: msg.localId,
            success: true,
            chatId: msg.chatId
          });
        }
      } catch (err) {
        results.push({
          localId: msg.localId,
          success: false,
          error: err.message
        });
      }
    }

    res.status(200).json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('Sync offline messages error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to sync offline messages',
      error: error.message
    });
  }
};

module.exports = exports;
