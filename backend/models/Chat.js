const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  senderName: {
    type: String,
    required: true
  },
  senderRole: {
    type: String,
    enum: ['patient', 'doctor', 'volunteer', 'driver', 'admin'],
    required: true
  },
  content: {
    type: String,
    required: true,
    trim: true
  },
  messageType: {
    type: String,
    enum: ['text', 'voice', 'system', 'location'],
    default: 'text'
  },
  voiceUrl: {
    type: String // URL to voice recording if messageType is 'voice'
  },
  isRead: {
    type: Boolean,
    default: false
  },
  readBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    readAt: {
      type: Date,
      default: Date.now
    }
  }],
  deliveredTo: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    deliveredAt: {
      type: Date,
      default: Date.now
    }
  }],
  isOfflineMessage: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

const chatSchema = new mongoose.Schema({
  emergency: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EmergencyRequest',
    required: true,
    index: true
  },
  participants: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    role: {
      type: String,
      enum: ['patient', 'doctor', 'volunteer', 'driver', 'admin']
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    leftAt: Date,
    isActive: {
      type: Boolean,
      default: true
    }
  }],
  messages: [messageSchema],
  chatType: {
    type: String,
    enum: ['emergency-group', 'one-on-one'],
    default: 'emergency-group'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastMessageAt: {
    type: Date,
    default: Date.now
  },
  unreadCount: {
    type: Map,
    of: Number,
    default: {}
  }
}, {
  timestamps: true
});

// Indexes for better query performance
chatSchema.index({ emergency: 1, isActive: 1 });
chatSchema.index({ 'participants.user': 1, isActive: 1 });
chatSchema.index({ lastMessageAt: -1 });

// Update lastMessageAt when new message is added
chatSchema.pre('save', function(next) {
  if (this.messages && this.messages.length > 0) {
    this.lastMessageAt = this.messages[this.messages.length - 1].createdAt || new Date();
  }
  next();
});

// Method to add a message
chatSchema.methods.addMessage = function(messageData) {
  this.messages.push(messageData);
  this.lastMessageAt = new Date();
  
  // Update unread count for all participants except sender
  this.participants.forEach(participant => {
    if (participant.user.toString() !== messageData.sender.toString() && participant.isActive) {
      const userId = participant.user.toString();
      const currentCount = this.unreadCount.get(userId) || 0;
      this.unreadCount.set(userId, currentCount + 1);
    }
  });
  
  return this.save();
};

// Method to mark messages as read
chatSchema.methods.markAsRead = function(userId) {
  const unreadMessages = this.messages.filter(
    msg => !msg.readBy.some(read => read.user.toString() === userId.toString())
  );
  
  unreadMessages.forEach(msg => {
    msg.readBy.push({
      user: userId,
      readAt: new Date()
    });
  });
  
  // Reset unread count for this user
  this.unreadCount.set(userId.toString(), 0);
  
  return this.save();
};

// Method to get unread messages for a user
chatSchema.methods.getUnreadMessages = function(userId) {
  return this.messages.filter(
    msg => !msg.readBy.some(read => read.user.toString() === userId.toString()) &&
           msg.sender.toString() !== userId.toString()
  );
};

const Chat = mongoose.model('Chat', chatSchema);

module.exports = Chat;
