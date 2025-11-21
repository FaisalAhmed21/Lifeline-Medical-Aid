const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  saveFCMToken,
  removeFCMToken,
  updateNotificationPreferences,
  getNotificationPreferences
} = require('../controllers/notificationController');

// @route   POST /api/notifications/token
// @desc    Save FCM token for user
// @access  Private
router.post('/token', protect, saveFCMToken);

// @route   DELETE /api/notifications/token
// @desc    Remove FCM token for user
// @access  Private
router.delete('/token', protect, removeFCMToken);

// @route   PUT /api/notifications/preferences
// @desc    Update notification preferences
// @access  Private
router.put('/preferences', protect, updateNotificationPreferences);

// @route   GET /api/notifications/preferences
// @desc    Get notification preferences
// @access  Private
router.get('/preferences', protect, getNotificationPreferences);

module.exports = router;
