const express = require('express');
const router = express.Router();
const {
  initiatePayment,
  verifyPayment,
  paymentWebhook
} = require('../controllers/paymentController');
const { protect } = require('../middleware/auth');

// Protected routes (user must be logged in)
router.post('/initiate', protect, initiatePayment);
router.get('/verify', protect, verifyPayment);

// Public webhook (UddoktaPay calls this)
router.post('/webhook', paymentWebhook);

module.exports = router;
