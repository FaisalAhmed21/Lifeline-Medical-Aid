const axios = require('axios');

// Initiate UddoktaPay payment
exports.initiatePayment = async (req, res) => {
  try {
    const { amount, serviceName, serviceId, serviceType } = req.body;
    const user = req.user;

    if (!amount || !serviceName) {
      return res.status(400).json({
        success: false,
        message: 'Amount and service name are required'
      });
    }

    const apiKey = process.env.UDDOKTAPAY_API_KEY;
    const baseUrl = (process.env.UDDOKTAPAY_BASE_URL || '').replace(/\/+$/, '');
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';

    if (!apiKey || !baseUrl || apiKey === 'your-uddoktapay-api-key') {
      return res.status(500).json({
        success: false,
        message: 'Payment gateway is not configured. Contact admin.'
      });
    }

    const initUrl = `${baseUrl}/api/checkout-v2`;
    const headers = {
      'RT-UDDOKTAPAY-API-KEY': apiKey,
      'Content-Type': 'application/json'
    };

    const payload = {
      full_name: user.name || user.username || 'Patient',
      email: user.email || 'patient@lifeline.com',
      amount: String(amount),
      metadata: {
        user_id: String(user._id),
        username: user.username || user.name,
        service_name: serviceName,
        service_id: serviceId || '',
        service_type: serviceType || 'general'
      },
      redirect_url: `${clientUrl}/payment/success`,
      cancel_url: `${clientUrl}/payment/cancelled`,
      // Prefer SERVER_URL env; otherwise derive from the incoming request host
      // (works both locally and behind Render's proxy)
      webhook_url: `${process.env.SERVER_URL || `${req.protocol}://${req.get('host')}`}/api/payment/webhook`
    };

    console.log('💳 Initiating UddoktaPay payment:', {
      amount,
      serviceName,
      user: user.name || user.username
    });

    const response = await axios.post(initUrl, payload, { headers, timeout: 15000 });
    const data = response.data;

    if (response.status === 200 && data.status) {
      const paymentUrl = data.payment_url;
      if (paymentUrl) {
        return res.json({
          success: true,
          payment_url: paymentUrl,
          message: 'Payment initiated successfully'
        });
      }
    }

    return res.status(400).json({
      success: false,
      message: `Payment gateway error: ${data.message || 'Unknown error'}`
    });
  } catch (error) {
    console.error('💳 Payment initiation error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Payment gateway connection error: ' + error.message
    });
  }
};

// Verify UddoktaPay payment
exports.verifyPayment = async (req, res) => {
  try {
    const { invoice_id } = req.query;

    if (!invoice_id) {
      return res.status(400).json({
        success: false,
        message: 'Invoice ID is required'
      });
    }

    const apiKey = process.env.UDDOKTAPAY_API_KEY;
    const baseUrl = (process.env.UDDOKTAPAY_BASE_URL || '').replace(/\/+$/, '');

    if (!apiKey || !baseUrl) {
      return res.status(500).json({
        success: false,
        message: 'Payment gateway is not configured'
      });
    }

    const verifyUrl = `${baseUrl}/api/verify-payment`;
    const headers = {
      'RT-UDDOKTAPAY-API-KEY': apiKey,
      'Content-Type': 'application/json'
    };

    const response = await axios.post(verifyUrl, { invoice_id }, { headers, timeout: 15000 });
    const verifyData = response.data;

    if (response.status === 200 && String(verifyData.status).toUpperCase() === 'COMPLETED') {
      console.log('✅ Payment verified successfully:', invoice_id);
      return res.json({
        success: true,
        status: 'COMPLETED',
        data: {
          invoice_id,
          amount: verifyData.amount,
          metadata: verifyData.metadata,
          transaction_id: verifyData.transaction_id,
          payment_method: verifyData.payment_method,
          date: verifyData.date
        }
      });
    }

    return res.json({
      success: true,
      status: verifyData.status || 'PENDING',
      data: verifyData
    });
  } catch (error) {
    console.error('💳 Payment verification error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Payment verification failed: ' + error.message
    });
  }
};

// Webhook handler for UddoktaPay
exports.paymentWebhook = async (req, res) => {
  try {
    console.log('🔔 Payment webhook received:', req.body);
    // Acknowledge receipt
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(500).json({ success: false });
  }
};
