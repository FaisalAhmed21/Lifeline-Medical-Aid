const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const passport = require('passport');
const path = require('path');
const { Server } = require('socket.io'); // Import Server here for cleaner code structure

// Load environment variables
dotenv.config();

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const ratingRoutes = require('./routes/rating');
const emergencyRoutes = require('./routes/emergency');
const notificationRoutes = require('./routes/notification');
const chatRoutes = require('./routes/chat');
const hospitalRoutes = require('./routes/hospital');
const aiRoutes = require('./routes/ai');
const medicalRecordRoutes = require('./routes/medicalRecord');
const orderRoutes = require('./routes/order');
const prescriptionRoutes = require('./routes/prescription');
const debugRoutes = require('./routes/debug');
const chatbotRoutes = require('./routes/chatbot');
const paymentRoutes = require('./routes/payment');

// Import passport config
require('./config/passport');

const app = express();

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(passport.initialize());

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


// ----------------------------------------------------------------------
// DATABASE CONNECTION (UPDATED)
// ----------------------------------------------------------------------
const mongoUri = process.env.MONGODB_URI;

if (!mongoUri) {
  console.error('❌ FATAL ERROR: MONGODB_URI is not defined in .env file.');
  // We do not exit here so the server can still start, but DB features will fail.
}

// Modern Mongoose Connection (No deprecated options needed for Mongoose v6+)
mongoose.connect(mongoUri)
  .then(() => {
    console.log('✅ MongoDB Connected Successfully');
  })
  .catch((err) => {
    console.error('❌ MongoDB Connection Error:', err.message);
    console.log('💡 TIP: Check your IP Whitelist in MongoDB Atlas if this is a timeout error.');
  });
// ----------------------------------------------------------------------

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/ratings', ratingRoutes);
app.use('/api/emergency', emergencyRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/hospitals', hospitalRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/medical-records', medicalRecordRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/prescriptions', prescriptionRoutes);
app.use('/api/debug', debugRoutes);
app.use('/api/chatbot', chatbotRoutes);
app.use('/api/payment', paymentRoutes);

// Health check route
app.get('/api/health', (req, res) => {
  res.json({ status: 'Server is running', timestamp: new Date() });
});

// Serve frontend in production
if (process.env.NODE_ENV === 'production' || process.env.RENDER) {
  app.use(express.static(path.join(__dirname, '../frontend/build')));

  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../frontend', 'build', 'index.html'));
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    success: false, 
    message: 'Something went wrong!', 
    error: process.env.NODE_ENV === 'development' ? err.message : undefined 
  });
});

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, (err) => {
  if (err) {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📡 Server URL: http://localhost:${PORT}`);
});

// ----------------------------------------------------------------------
// SOCKET.IO SETUP
// ----------------------------------------------------------------------
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ['websocket', 'polling']
});

// Store active users and their socket connections
const activeUsers = new Map(); // userId -> socketId
const helperLocations = new Map(); // userId -> { latitude, longitude, timestamp }

io.on('connection', (socket) => {
  console.log(`✅ User connected: ${socket.id}`);

  // User joins with their userId
  socket.on('join', (userId) => {
    activeUsers.set(userId, socket.id);
    socket.join(`user_${userId}`);
    console.log(`User ${userId} joined with socket ${socket.id}`);
  });

  // User joins emergency room (for real-time tracking)
  socket.on('joinEmergency', (emergencyId) => {
    socket.join(`emergency_${emergencyId}`);
    console.log(`Socket ${socket.id} joined emergency room: emergency_${emergencyId}`);
  });

  // User joins chat room
  socket.on('joinChat', (chatId) => {
    socket.join(`chat_${chatId}`);
    console.log(`Socket ${socket.id} joined chat room: chat_${chatId}`);
  });

  // User leaves chat room
  socket.on('leaveChat', (chatId) => {
    socket.leave(`chat_${chatId}`);
    console.log(`Socket ${socket.id} left chat room: chat_${chatId}`);
  });

  // Send real-time chat message
  socket.on('sendChatMessage', (data) => {
    const { chatId, message } = data;
    // Broadcast message to all users in chat room
    io.to(`chat_${chatId}`).emit('newMessage', message);
    console.log(`💬 Message sent to chat_${chatId}`);
  });

  // User is typing indicator
  socket.on('userTyping', (data) => {
    const { chatId, userId, userName, isTyping } = data;
    // Broadcast typing status to others in chat
    socket.to(`chat_${chatId}`).emit('typingStatus', {
      userId,
      userName,
      isTyping
    });
  });

  // User leaves emergency room
  socket.on('leaveEmergency', (emergencyId) => {
    socket.leave(`emergency_${emergencyId}`);
    console.log(`Socket ${socket.id} left emergency room: emergency_${emergencyId}`);
  });

  // Helper (doctor/volunteer/driver) sends location update
  socket.on('updateLocation', (data) => {
    const { userId, emergencyId, latitude, longitude, role, name } = data;
    
    const locationData = {
      latitude,
      longitude,
      role,
      name,
      timestamp: new Date()
    };
    
    helperLocations.set(userId, locationData);

    // Broadcast to everyone in the emergency room
    if (emergencyId) {
      io.to(`emergency_${emergencyId}`).emit('locationUpdate', {
        helperId: userId,
        ...locationData
      });
      console.log(`📍 Location update sent to emergency_${emergencyId}: ${role} ${name} at [${latitude}, ${longitude}]`);
    }
  });

  // Legacy support - keep old event names
  socket.on('update_location', (data) => {
    socket.emit('updateLocation', data);
  });

  // Get current location of a helper
  socket.on('getHelperLocation', (helperId) => {
    const location = helperLocations.get(helperId);
    if (location) {
      socket.emit('locationUpdate', {
        helperId,
        ...location
      });
    }
  });

  // Patient requests tracking of assigned helpers
  socket.on('requestHelperLocations', (data) => {
    const { emergencyId, helperIds } = data;
    console.log(`📍 Patient requesting helper locations for emergency ${emergencyId}`);
    
    // Send current locations of all helpers
    helperIds.forEach(helperId => {
      const location = helperLocations.get(helperId);
      if (location) {
        socket.emit('locationUpdate', {
          helperId,
          ...location
        });
        console.log(`Sent location for helper ${helperId}`);
      } else {
        console.log(`No location data for helper ${helperId}`);
      }
    });
  });

  // Legacy support
  socket.on('track_helpers', (data) => {
    socket.emit('requestHelperLocations', data);
  });

  // Emergency status update
  socket.on('updateStatus', (data) => {
    const { emergencyId, status, message } = data;
    io.to(`emergency_${emergencyId}`).emit('statusUpdate', {
      emergencyId,
      status,
      message,
      timestamp: new Date()
    });
    console.log(`🔄 Status update for emergency ${emergencyId}: ${status}`);
  });

  // Legacy support
  socket.on('emergency_status_update', (data) => {
    socket.emit('updateStatus', data);
  });

  // Disconnect
  socket.on('disconnect', () => {
    // Remove user from active users
    for (const [userId, socketId] of activeUsers.entries()) {
      if (socketId === socket.id) {
        activeUsers.delete(userId);
        console.log(`User ${userId} disconnected`);
        break;
      }
    }
  });
});

// Export io for use in controllers
module.exports.io = io;