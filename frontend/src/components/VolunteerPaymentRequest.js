import React, { useState, useEffect } from 'react';
import PaymentPage from './PaymentPage';
import api from '../utils/api';
import { FaShoppingCart, FaCheckCircle, FaSpinner } from 'react-icons/fa';
import { toast } from 'react-toastify';

const VolunteerPaymentRequest = ({ volunteer, patient, itemPrice, itemsNeeded, onClose, emergencyId, paymentStatus }) => {
  const [order, setOrder] = useState(null);
  const [paid, setPaid] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [loading, setLoading] = useState(false);

  // Prefer explicit bkashNumber, fall back to phone if volunteer used phone as their bKash identifier
  const volunteerBkash = volunteer?.bkashNumber || volunteer?.phone;
  const VOLUNTEER_FEE_PERCENT = 0.05; // 5% platform fee for volunteer handling
  const itemPriceNum = parseFloat(itemPrice) || 0;
  const volunteerFee = Math.round(itemPriceNum * VOLUNTEER_FEE_PERCENT);
  const totalAmount = itemPriceNum + volunteerFee;

  // On mount, check if an order already exists for this emergency and volunteer
  // This hook must run unconditionally (before any early returns) to satisfy React Hooks rules
  useEffect(() => {
    let mounted = true;
    // If parent passed paymentStatus (from emergency), initialize paid accordingly to avoid flicker
    if (paymentStatus === 'paid' || paymentStatus === 'distributed') {
      setPaid(true);
    }
    const fetchExisting = async () => {
      try {
        // Prefer querying by emergencyId + volunteerId when available
        if (emergencyId) {
          const res = await api.get(`/orders?emergencyId=${emergencyId}&volunteerId=${volunteer._id}`);
          if (res.data && res.data.success) {
            const orders = res.data.data || res.data.orders || [];
            const volOrder = (orders || []).find(o => o.serviceType === 'VOLUNTEER_PURCHASE');
            if (volOrder) {
              if (!mounted) return;
              setOrder(volOrder);
              // Treat 'paid' and 'completed' as paid for UI purposes so the pay button is hidden
              setPaid(volOrder.status === 'paid' || volOrder.status === 'completed');
              return;
            }
            // If no volunteer order found, fall through to check emergency.paymentStatus
          }
          // Fallback: check emergency record directly for paymentStatus
          try {
            const emRes = await api.get(`/emergency/${emergencyId}`);
            if (emRes.data && emRes.data.success) {
              const em = emRes.data.data;
              // Treat both 'paid' and 'distributed' as finalized/verified payment states
              if (em && (em.paymentStatus === 'paid' || em.paymentStatus === 'distributed')) {
                if (!mounted) return;
                // No order object available, but emergency shows paid/distributed -> mark UI as paid
                setPaid(true);
              }
            }
          } catch (e) {
            // ignore
          }
        }
      } catch (err) {
        // ignore
      }
    };
    fetchExisting();
    return () => { mounted = false; };
  }, [emergencyId, volunteer._id]);

  if (!volunteerBkash) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-sm text-yellow-800">
          ⚠️ This volunteer has not provided a phone or bKash number. Please contact them directly.
        </p>
      </div>
    );
  }

  if (itemPriceNum <= 0) {
    return (
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-800">
          ℹ️ No payment required for this volunteer service.
        </p>
      </div>
    );
  }


  const handleRequestVolunteerService = async () => {
    if (!patient?._id) {
      toast.error('Patient information not available');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/orders/create', {
        patientId: patient._id,
        volunteerId: volunteer._id,
        emergencyId: emergencyId,
        serviceType: 'VOLUNTEER_PURCHASE',
        amount: totalAmount,
        paymentTo: volunteerBkash,
        itemPrice: itemPriceNum,
        volunteerFee: volunteerFee,
      });
      
      if (res.data.success) {
        setOrder(res.data.order);
        setShowPayment(true);
        toast.info('Please complete the payment to proceed');
      }
    } catch (e) {
      console.error('Error creating order:', e);
      toast.error(e.response?.data?.error || 'Error creating order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentVerified = (verifiedOrder) => {
    setOrder(verifiedOrder);
    setPaid(true);
    setShowPayment(false);
    toast.success('Payment verified! Volunteer will receive the amount after delivery.');
  };

  const handleCancelPayment = () => {
    setShowPayment(false);
    setOrder(null);
  };

  return (
    <div className="space-y-3">
      {!paid ? (
        <>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-3">
            <h3 className="font-semibold text-gray-900 mb-2">Payment Breakdown:</h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-700">Item Price:</span>
                <span className="font-medium">{itemPriceNum} ৳</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700">Volunteer Fee (5%):</span>
                <span className="font-medium">{volunteerFee} ৳</span>
              </div>
              <div className="border-t pt-1 mt-1 flex justify-between">
                <span className="font-semibold text-gray-900">Total Amount:</span>
                <span className="font-bold text-blue-600">{totalAmount} ৳</span>
              </div>
            </div>
            {itemsNeeded && (
              <p className="text-xs text-gray-600 mt-2">
                📦 Items: {itemsNeeded}
              </p>
            )}
            <p className="text-xs text-gray-600 mt-2">
              💡 Payment will be sent to volunteer after delivery completion
            </p>
          </div>

          <button
            onClick={handleRequestVolunteerService}
            disabled={loading || showPayment}
            className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <FaSpinner className="animate-spin" />
                Creating order...
              </>
            ) : (
              <>
                <FaShoppingCart />
                Pay {totalAmount} ৳ for Volunteer Service
              </>
            )}
          </button>
        </>
      ) : (
        <div className="bg-green-50 border-2 border-green-300 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <FaCheckCircle className="text-green-600 text-xl" />
            <span className="font-semibold text-green-800">Payment Verified!</span>
          </div>
          <p className="text-sm text-gray-700 mb-3">
            Your payment has been verified. The volunteer will receive {totalAmount} ৳ after completing the delivery.
          </p>
        </div>
      )}

      {showPayment && order && (
        <PaymentPage 
          order={order} 
          onVerified={handlePaymentVerified}
          onCancel={handleCancelPayment}
        />
      )}
    </div>
  );
};

export default VolunteerPaymentRequest;
