import React, { useState } from 'react';
import axios from 'axios';
import { FaTimesCircle } from 'react-icons/fa';
import { toast } from 'react-toastify';

const PaymentPage = ({ order, onVerified, onCancel }) => {
  const [step, setStep] = useState('phone');
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [otp, setOtp] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');

  const handlePhoneSubmit = (e) => {
    e.preventDefault();
    if (phone.length !== 11 || !phone.startsWith('01')) {
      setError('Please enter a valid 11-digit bKash number starting with 01');
      return;
    }
    setError('');
    setStep('pin');
  };

  const handlePinSubmit = (e) => {
    e.preventDefault();
    if (pin.length !== 5) {
      setError('PIN must be exactly 5 digits');
      return;
    }
    setError('');
    // Generate a 6 digit random OTP
    const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(newOtp);
    setStep('otp');
    toast.info(`Your bKash OTP is: ${newOtp}`, { autoClose: false });
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    if (otp !== generatedOtp) {
      setError('Incorrect OTP. Please try again.');
      return;
    }

    setVerifying(true);
    setError('');
    try {
      // Simulate bKash transaction ID
      const txId = 'BKASH' + Math.floor(10000000 + Math.random() * 90000000);
      
      const res = await axios.post('/api/orders/verify', {
        orderId: order.orderId,
        transactionId: txId,
      });
      
      if (res.data.success) {
        toast.success('bKash Payment Successful!');
        setStep('success');
        setTimeout(() => {
          onVerified(res.data.order);
        }, 2000);
      } else {
        setError(res.data.error || 'Payment failed.');
        setVerifying(false);
      }
    } catch (e) {
      const errorMsg = e.response?.data?.error || 'Error processing payment.';
      setError(errorMsg);
      toast.error(errorMsg);
      setVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
      <div className="bg-[#e2136e] rounded-lg shadow-2xl max-w-sm w-full p-0 overflow-hidden relative">
        {/* Header */}
        <div className="bg-white p-4 flex justify-between items-center border-b-[6px] border-[#e2136e]">
          <div className="flex items-center gap-2">
            <h2 className="text-[#e2136e] text-2xl font-black italic tracking-tighter">bKash</h2>
            <span className="bg-[#e2136e] text-white text-xs px-2 py-0.5 rounded-full font-bold">Checkout</span>
          </div>
          {onCancel && (
            <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 transition">
              <FaTimesCircle size={24} />
            </button>
          )}
        </div>

        {/* Invoice Info */}
        <div className="bg-white px-6 py-4 flex items-center justify-between shadow-inner">
          <div>
            <p className="text-xs text-gray-500 font-semibold uppercase">Lifeline Medical Aid</p>
            <p className="text-sm font-medium text-gray-800">{order.serviceType || 'Service Fee'}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-[#e2136e]">{order.amount} ৳</p>
          </div>
        </div>

        {/* Dynamic Forms */}
        <div className="p-6 text-white min-h-[250px] flex flex-col justify-center">
          {error && (
            <div className="bg-white bg-opacity-20 text-white text-sm p-3 rounded mb-4 text-center border border-white border-opacity-30">
              {error}
            </div>
          )}

          {step === 'phone' && (
            <form onSubmit={handlePhoneSubmit} className="space-y-4">
              <p className="text-center text-white text-sm mb-4">Enter your bKash Account Number</p>
              <input
                type="text"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value.replace(/[^0-9]/g, ''));
                  setError('');
                }}
                maxLength="11"
                placeholder="e.g 017XXXXXXXX"
                className="w-full text-center text-xl tracking-widest px-4 py-3 bg-white text-[#e2136e] rounded focus:outline-none placeholder-[#fca5c7]"
                autoFocus
              />
              <button
                type="submit"
                disabled={phone.length !== 11}
                className="w-full py-3 bg-[#b50a54] text-white uppercase font-bold rounded shadow hover:bg-[#9a0847] disabled:opacity-50 transition"
              >
                Confirm
              </button>
            </form>
          )}

          {step === 'pin' && (
            <form onSubmit={handlePinSubmit} className="space-y-4">
              <p className="text-center text-white text-sm mb-4">Enter bKash PIN for {phone}</p>
              <input
                type="password"
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value.replace(/[^0-9]/g, ''));
                  setError('');
                }}
                maxLength="5"
                placeholder="PIN"
                className="w-full text-center text-2xl tracking-widest px-4 py-3 bg-white text-[#e2136e] rounded focus:outline-none placeholder-[#fca5c7]"
                autoFocus
              />
              <button
                type="submit"
                disabled={pin.length < 5}
                className="w-full py-3 bg-[#b50a54] text-white uppercase font-bold rounded shadow hover:bg-[#9a0847] disabled:opacity-50 transition"
              >
                Confirm
              </button>
            </form>
          )}

          {step === 'otp' && (
            <form onSubmit={handleOtpSubmit} className="space-y-4">
              <p className="text-center text-white text-sm mb-2">A 6-digit verification code has been sent to {phone}</p>
              <p className="text-center text-xs text-white opacity-70 mb-4">(Check the toast notification for your simulation OTP)</p>
              <input
                type="text"
                value={otp}
                onChange={(e) => {
                  setOtp(e.target.value.replace(/[^0-9]/g, ''));
                  setError('');
                }}
                maxLength="6"
                placeholder="bKash Verification Code"
                className="w-full text-center text-xl tracking-widest px-4 py-3 bg-white text-[#e2136e] rounded focus:outline-none placeholder-[#fca5c7]"
                autoFocus
                disabled={verifying}
              />
              <button
                type="submit"
                disabled={otp.length !== 6 || verifying}
                className="w-full py-3 bg-[#b50a54] text-white uppercase font-bold rounded shadow hover:bg-[#9a0847] disabled:opacity-50 transition flex justify-center items-center gap-2"
              >
                {verifying ? (
                  <>
                    <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full"></span>
                    Processing...
                  </>
                ) : 'Confirm'}
              </button>
            </form>
          )}

          {step === 'success' && (
            <div className="text-center space-y-4 py-4">
              <div className="mx-auto w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg">
                <svg className="w-8 h-8 text-[#e2136e]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
              <h3 className="text-xl font-bold">Payment Successful</h3>
              <p className="text-sm opacity-90">Redirecting back to platform...</p>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="bg-[#b50a54] text-white text-center text-xs py-2 opacity-80">
          ☎ 16247
        </div>
      </div>
    </div>
  );
};

export default PaymentPage;
