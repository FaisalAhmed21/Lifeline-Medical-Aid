import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { FaCreditCard, FaMobileAlt, FaCheckCircle, FaTimesCircle, FaSpinner } from 'react-icons/fa';
import { toast } from 'react-toastify';
import api from '../utils/api';

const PaymentPage = ({ order, onVerified, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleProceedToPayment = async () => {
    if (!order || !order.amount) {
      toast.error('Invalid order details');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/payment/initiate', {
        amount: order.amount,
        serviceName: order.serviceName || 'Medical Service',
        serviceId: order.serviceId || '',
        serviceType: order.serviceType || 'general'
      });

      if (response.data.success && response.data.payment_url) {
        // Redirect user to UddoktaPay payment gateway
        window.location.href = response.data.payment_url;
      } else {
        toast.error(response.data.message || 'Failed to initiate payment');
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast.error(error.response?.data?.message || 'Payment gateway connection error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-pink-500 to-red-500 p-6 text-white">
          <div className="flex items-center gap-3">
            <FaMobileAlt className="text-3xl" />
            <div>
              <h2 className="text-xl font-bold">Lifeline Payment</h2>
              <p className="text-pink-100 text-sm">Secure payment via UddoktaPay</p>
            </div>
          </div>
        </div>

        {/* Order Summary */}
        <div className="p-6">
          <div className="bg-gray-50 rounded-xl p-4 mb-6">
            <h3 className="font-semibold text-gray-700 mb-3">Order Summary</h3>
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-600">{order?.serviceName || 'Medical Service'}</span>
              <span className="font-bold text-lg">৳{order?.amount || '0'}</span>
            </div>
            {order?.description && (
              <p className="text-sm text-gray-500 mt-2">{order.description}</p>
            )}
          </div>

          {/* Payment Methods Info */}
          <div className="mb-6">
            <p className="text-sm text-gray-500 mb-2">Supported payment methods:</p>
            <div className="flex gap-3 flex-wrap">
              <span className="bg-pink-50 text-pink-700 px-3 py-1 rounded-full text-xs font-medium">bKash</span>
              <span className="bg-green-50 text-green-700 px-3 py-1 rounded-full text-xs font-medium">Nagad</span>
              <span className="bg-orange-50 text-orange-700 px-3 py-1 rounded-full text-xs font-medium">Rocket</span>
              <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-medium">Upay</span>
              <span className="bg-purple-50 text-purple-700 px-3 py-1 rounded-full text-xs font-medium">Cards</span>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 py-3 px-4 border-2 border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition-all font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleProceedToPayment}
              disabled={loading}
              className="flex-1 py-3 px-4 bg-gradient-to-r from-pink-500 to-red-500 text-white rounded-xl hover:from-pink-600 hover:to-red-600 transition-all font-medium flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <FaSpinner className="animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <FaCreditCard />
                  Pay ৳{order?.amount || '0'}
                </>
              )}
            </button>
          </div>

          <p className="text-xs text-gray-400 text-center mt-4">
            🔒 Secured by UddoktaPay — Your payment info is encrypted
          </p>
        </div>
      </div>
    </div>
  );
};

// Payment Success Page
export const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [verifying, setVerifying] = useState(true);
  const [result, setResult] = useState(null);

  useEffect(() => {
    const verifyPayment = async () => {
      const invoiceId = searchParams.get('invoice_id');
      if (!invoiceId) {
        setResult({ success: false, message: 'No invoice ID found' });
        setVerifying(false);
        return;
      }

      try {
        const response = await api.get(`/payment/verify?invoice_id=${invoiceId}`);
        setResult(response.data);
      } catch (error) {
        setResult({ success: false, message: error.response?.data?.message || 'Verification failed' });
      } finally {
        setVerifying(false);
      }
    };

    verifyPayment();
  }, [searchParams]);

  if (verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <FaSpinner className="animate-spin text-5xl text-pink-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-700">Verifying your payment...</h2>
          <p className="text-gray-500 mt-2">Please wait while we confirm your transaction</p>
        </div>
      </div>
    );
  }

  const isSuccess = result?.status === 'COMPLETED';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 text-center">
        {isSuccess ? (
          <>
            <FaCheckCircle className="text-6xl text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Payment Successful!</h2>
            <p className="text-gray-500 mb-6">Your payment has been processed successfully.</p>
            {result?.data && (
              <div className="bg-green-50 rounded-xl p-4 mb-6 text-left">
                <p className="text-sm text-green-700"><strong>Transaction ID:</strong> {result.data.transaction_id}</p>
                <p className="text-sm text-green-700"><strong>Amount:</strong> ৳{result.data.amount}</p>
                <p className="text-sm text-green-700"><strong>Method:</strong> {result.data.payment_method}</p>
              </div>
            )}
          </>
        ) : (
          <>
            <FaTimesCircle className="text-6xl text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Payment Pending</h2>
            <p className="text-gray-500 mb-6">{result?.message || 'Your payment is being processed.'}</p>
          </>
        )}
        <button
          onClick={() => navigate('/')}
          className="w-full py-3 bg-gradient-to-r from-pink-500 to-red-500 text-white rounded-xl hover:from-pink-600 hover:to-red-600 transition-all font-medium"
        >
          Return to Dashboard
        </button>
      </div>
    </div>
  );
};

// Payment Cancelled Page
export const PaymentCancelled = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 text-center">
        <FaTimesCircle className="text-6xl text-orange-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Payment Cancelled</h2>
        <p className="text-gray-500 mb-6">Your payment was cancelled. No charges were made.</p>
        <button
          onClick={() => navigate('/')}
          className="w-full py-3 bg-gradient-to-r from-pink-500 to-red-500 text-white rounded-xl hover:from-pink-600 hover:to-red-600 transition-all font-medium"
        >
          Return to Dashboard
        </button>
      </div>
    </div>
  );
};

export default PaymentPage;
