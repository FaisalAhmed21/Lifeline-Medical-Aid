const User = require('../models/User');
const { subscribeToTopic, unsubscribeFromTopic } = require('../services/notificationService');

// @desc    Save FCM token for user
// @route   POST /api/notifications/token
// @access  Private
exports.saveFCMToken = async (req, res) => {
  try {
    const { token } = req.body;
    const userId = req.user.id;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'FCM token is required'
      });
    }

    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Add token if not already exists
    if (!user.fcmTokens.includes(token)) {
      user.fcmTokens.push(token);
      await user.save();

      // Subscribe to role-based topic
      await subscribeToTopic(token, user.role);
      
      console.log(`✅ FCM token saved for user ${user.name} (${user.role})`);
    }

    res.status(200).json({
      success: true,
      message: 'FCM token saved successfully'
    });
  } catch (error) {
    console.error('Save FCM token error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save FCM token',
      error: error.message
    });
  }
};

// @desc    Remove FCM token for user
// @route   DELETE /api/notifications/token
// @access  Private
exports.removeFCMToken = async (req, res) => {
  try {
    const { token } = req.body;
    const userId = req.user.id;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'FCM token is required'
      });
    }

    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Remove token
    user.fcmTokens = user.fcmTokens.filter(t => t !== token);
    await user.save();

    // Unsubscribe from role-based topic
    await unsubscribeFromTopic(token, user.role);

    res.status(200).json({
      success: true,
      message: 'FCM token removed successfully'
    });
  } catch (error) {
    console.error('Remove FCM token error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove FCM token',
      error: error.message
    });
  }
};

// @desc    Update notification preferences
// @route   PUT /api/notifications/preferences
// @access  Private
exports.updateNotificationPreferences = async (req, res) => {
  try {
    const { pushEnabled, emailEnabled, smsEnabled } = req.body;
    const userId = req.user.id;

    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update preferences
    if (typeof pushEnabled !== 'undefined') {
      user.notificationPreferences.pushEnabled = pushEnabled;
    }
    if (typeof emailEnabled !== 'undefined') {
      user.notificationPreferences.emailEnabled = emailEnabled;
    }
    if (typeof smsEnabled !== 'undefined') {
      user.notificationPreferences.smsEnabled = smsEnabled;
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Notification preferences updated',
      data: user.notificationPreferences
    });
  } catch (error) {
    console.error('Update notification preferences error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update notification preferences',
      error: error.message
    });
  }
};

// @desc    Get notification preferences
// @route   GET /api/notifications/preferences
// @access  Private
exports.getNotificationPreferences = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId).select('notificationPreferences');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: user.notificationPreferences
    });
  } catch (error) {
    console.error('Get notification preferences error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notification preferences',
      error: error.message
    });
  }
};
