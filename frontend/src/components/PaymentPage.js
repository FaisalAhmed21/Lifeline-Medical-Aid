import React, { useState } from 'react';
import axios from 'axios';
import { FaMobileAlt, FaCheckCircle, FaTimesCircle } from 'react-icons/fa';
import { toast } from 'react-toastify';

const PaymentPage = ({ order, onVerified, onCancel }) => {
  const [transactionId, setTransactionId] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  // Use bKash-inspired styling. QR code removed per requirements.

  const copyBkashNumber = () => {
    navigator.clipboard.writeText(order.paymentTo);
    setCopied(true);
    toast.success('bKash number copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleVerify = async () => {
    if (!transactionId.trim()) {
      setError('Please enter the transaction ID');
      return;
    }

    setVerifying(true);
    setError('');
    try {
      const res = await axios.post('/api/orders/verify', {
        orderId: order.orderId,
        transactionId: transactionId.trim(),
      });
      if (res.data.success) {
        toast.success('Payment verified successfully!');
        onVerified(res.data.order);
      } else {
        setError(res.data.error || 'Verification failed. Please check the transaction ID.');
      }
    } catch (e) {
      const errorMsg = e.response?.data?.error || 'Error verifying payment. Please try again.';
      setError(errorMsg);
      toast.error(errorMsg);
    }
    setVerifying(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Pay with bKash</h2>
          {onCancel && (
            <button
              onClick={onCancel}
              className="text-gray-500 hover:text-gray-700 text-xl"
            >
              <FaTimesCircle />
            </button>
          )}
        </div>

        <div className="rounded-lg mb-4 overflow-hidden shadow-md">
          <div className="px-6 py-5 bg-white">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-gray-500">Amount to Pay</div>
                <div className="text-3xl font-extrabold text-gray-900">{order.amount} ৳</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-500">Service</div>
                <div className="text-sm font-medium text-gray-700">{order.serviceType || 'Prescription'}</div>
              </div>
            </div>
          </div>
          <div className="px-6 py-4 bg-[#e6007a]">
            <div className="text-white text-sm">Pay via bKash</div>
          </div>
        </div>

        {/* Payment Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <h3 className="font-semibold text-gray-900 mb-2">📱 Payment Instructions:</h3>
          <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700">
            <li>Open your bKash app</li>
            <li>Go to "Send Money"</li>
            <li>Enter the bKash number below</li>
            <li>Enter amount: <strong>{order.amount} BDT</strong></li>
            <li>Complete the transaction</li>
            <li>Copy the Transaction ID and paste it below</li>
          </ol>
        </div>

        {/* bKash Number (prominent card) */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            bKash Number to Send Money:
          </label>
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-[#fde8f3] text-[#e6007a] p-3 rounded-md">
                <FaMobileAlt size={20} />
              </div>
              <div>
                <div className="text-xs text-gray-500">Recipient</div>
                <div className="text-lg font-mono font-semibold text-gray-900">{order.paymentTo}</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={copyBkashNumber}
                className="px-4 py-2 bg-white border border-gray-200 text-[#e6007a] rounded-lg hover:bg-gray-50 transition font-medium flex items-center gap-2"
                title="Copy bKash number"
              >
                {copied ? <FaCheckCircle className="text-green-600" /> : 'Copy'}
              </button>
            </div>
          </div>
        </div>
        {/* QR code removed as requested */}

        {/* Transaction ID Input */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            bKash Transaction ID: <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={transactionId}
            onChange={(e) => {
              setTransactionId(e.target.value);
              setError('');
            }}
            placeholder="Enter transaction ID (e.g., 8A7K9M2N1P)"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            disabled={verifying}
          />
          <p className="text-xs text-gray-500 mt-1">
            You can find this in your bKash transaction history or SMS
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          {onCancel && (
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-3 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 transition font-medium"
              disabled={verifying}
            >
              Cancel
            </button>
          )}
          <button
            onClick={handleVerify}
            disabled={verifying || !transactionId.trim()}
            className="flex-1 px-4 py-3 bg-[#e6007a] text-white rounded-lg hover:brightness-95 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {verifying ? (
              <>
                <span className="animate-spin">⏳</span>
                Verifying...
              </>
            ) : (
              <>
                <FaCheckCircle />
                I have paid
              </>
            )}
          </button>
        </div>

        <p className="text-xs text-gray-500 text-center mt-4">
          💡 Make sure the amount and bKash number match exactly
        </p>
      </div>
    </div>
  );
};

export default PaymentPage;
