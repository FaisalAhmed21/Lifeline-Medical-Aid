import React, { useState } from 'react';
import PaymentPage from './PaymentPage';
import api from '../utils/api';
import { useEffect } from 'react';
import { FaAmbulance, FaCheckCircle, FaSpinner, FaRoute, FaTools } from 'react-icons/fa';
import { toast } from 'react-toastify';

const AmbulancePaymentRequest = ({ driver, patient, serviceType, amount, distance, equipment, emergencyId, onClose }) => {
  const [order, setOrder] = useState(null);
  const [paid, setPaid] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [loading, setLoading] = useState(false);

  // Local copy of driver so we can fetch missing details if needed
  const [driverData, setDriverData] = React.useState(driver || null);
  // track distance used for fare calculation; prefer prop `distance` but allow fetching from emergency
  const [usedDistance, setUsedDistance] = React.useState(distance || null);

  // Prefer bkashNumber but fall back to phone if bkashNumber not set
  const paymentRecipient = (driverData && (driverData.bkashNumber || driverData.phone)) ? (driverData.bkashNumber || driverData.phone) : '';

  // If driver prop doesn't include contact info, fetch full user record (protected endpoint)
  useEffect(() => {
    let mounted = true;
    const ensureDriverDetails = async () => {
      try {
        // If driverData is missing or lacks phone/bkash but we have an _id, fetch it
        const id = (driverData && (driverData._id || driverData.id)) || (driver && (driver._id || driver.id));
        const hasContact = driverData && (driverData.bkashNumber || driverData.phone);
        if (!hasContact && id) {
          const res = await api.get(`/users/${id}`);
          if (res.data && res.data.success && mounted) {
            setDriverData(res.data.data);
          }
        }
      } catch (err) {
        // Ignore fetch errors; we'll show warning if no recipient
        console.warn('Could not fetch driver details for ambulance payment fallback', err?.message || err);
      }
    };
    ensureDriverDetails();
    return () => { mounted = false; };
  }, [driver]);

  // Determine whether this service will require payment (client-side UX calculation)
  // Prefer usedDistance (resolved from prop or emergency fetch). Also determine
  // whether this should be treated as long-distance by checking either the
  // passed serviceType or the resolved usedDistance > 5.
  const isLongDistance = (serviceType === 'AMBULANCE_LONG_DISTANCE') || (usedDistance && Number(usedDistance) > 5);
  let computedAmountPreview = parseFloat(amount) || 0;
  if (isLongDistance && usedDistance) {
    // Mirror server pricing: free up to 5km, 100 BDT per extra km
    const perKm = 100;
    const extraKm = Math.max(0, Math.ceil(Number(usedDistance) - 5));
    computedAmountPreview = perKm * extraKm;
  }

  // Debugging aid: log resolved distance/serviceType/preview so users can paste logs if needed
  React.useEffect(() => {
    console.log('AmbulancePaymentRequest debug:', { emergencyId, serviceType, usedDistance, computedAmountPreview });
  }, [emergencyId, serviceType, usedDistance, computedAmountPreview]);

  // If distance prop isn't provided, try to fetch emergency details to get the entered distance
  React.useEffect(() => {
    let mounted = true;
    const fetchEmergencyDistance = async () => {
      if ((!usedDistance || usedDistance === 0) && emergencyId) {
        try {
          const em = await api.get(`/emergency/${emergencyId}`);
          if (em.data && em.data.success && mounted) {
            const ed = em.data.data;
            const d = ed.distance || (ed.ambulanceService && ed.ambulanceService.distance) || null;
            if (d) setUsedDistance(d);
            // also, if patient not passed in props try to set from emergency (handled later in request)
          }
        } catch (err) {
          // ignore errors
        }
      }
    };
    fetchEmergencyDistance();
    return () => { mounted = false; };
  }, [emergencyId, usedDistance]);

  // On mount, check for existing orders for this emergency/driver so we don't show pay again
  useEffect(() => {
    let mounted = true;
    const fetchExisting = async () => {
      try {
        if (emergencyId) {
          // Prefer querying by both emergencyId and driverId when available
          const driverId = (driverData && (driverData._id || driverData.id)) || (driver && (driver._id || driver.id));
          let res;
          if (driverId) {
            res = await api.get(`/orders?emergencyId=${emergencyId}&driverId=${driverId}`);
          } else {
            res = await api.get(`/orders?emergencyId=${emergencyId}`);
          }

          if (res.data && res.data.success) {
            const orders = res.data.data || res.data.orders || [];
            // Find any ambulance-related order
            const ambOrder = (orders || []).find(o => (o.serviceType && o.serviceType.startsWith && o.serviceType.startsWith('AMBULANCE')) );
            if (ambOrder && mounted) {
              setOrder(ambOrder);
              setPaid(ambOrder.status === 'paid' || ambOrder.status === 'completed');
            } else {
              // Fallback: check emergency paymentStatus
              try {
                const em = await api.get(`/emergency/${emergencyId}`);
                if (em.data && em.data.success && mounted) {
                  const ed = em.data.data;
                  if (ed && (ed.paymentStatus === 'paid' || ed.paymentStatus === 'distributed')) {
                    setPaid(true);
                  }
                }
              } catch (e) {
                // ignore
              }
            }
          }
        }
      } catch (err) {
        // ignore
      }
    };
    fetchExisting();
    return () => { mounted = false; };
  }, [emergencyId, driverData]);

  // Only show missing payment recipient warning when a positive amount is required
  if (!paymentRecipient && computedAmountPreview > 0) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-sm text-yellow-800">
          ⚠️ This driver has not provided a bKash number or phone number. Please contact them directly.
        </p>
      </div>
    );
  }

  const getServiceTypeLabel = () => {
    // Prefer labeling based on resolved distance when available
    if (isLongDistance) return 'Ambulance Transport (distance-based fare)';
    const labels = {
      'AMBULANCE_PRIORITY': 'Priority Ambulance Transport',
      'AMBULANCE_EQUIPMENT': 'Ambulance Transport',
      'AMBULANCE_NON_EMERGENCY': 'Non-Emergency Ambulance Transport',
    };
    return labels[serviceType] || 'Ambulance Transport';
  };

  // Debugging aid: log resolved distance/serviceType/preview so users can paste logs if needed
  

  const handleRequestAmbulanceService = async () => {
    // Determine patient id: prefer passed `patient` prop, otherwise fallback to localStorage user
    let patientId = patient && (patient._id || patient.id);
    if (!patientId) {
      try {
        const stored = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
        const parsed = stored ? JSON.parse(stored) : null;
        patientId = parsed && (parsed._id || parsed.id);
      } catch (e) {
        // ignore
      }
    }

    if (!patientId) {
      toast.error('Patient information not available');
      return;
    }

    setLoading(true);
    try {
      // Determine whether this service requires payment
      let computedAmount = parseFloat(amount) || 0;
      // prefer usedDistance (fetched or prop) for authoritative calculation
      const calcDistance = (usedDistance && usedDistance > 0) ? usedDistance : distance;
      // Ensure we have a serviceType (fallback to distance-based heuristic)
      let finalServiceType = serviceType;
      if (!finalServiceType) {
        finalServiceType = (calcDistance && calcDistance > 5) ? 'AMBULANCE_LONG_DISTANCE' : 'AMBULANCE_EQUIPMENT';
      }
      if (finalServiceType === 'AMBULANCE_LONG_DISTANCE' && calcDistance) {
        // Pricing rule: up to 5 km is free; for each km beyond 5 km charge 100 BDT
        const perKm = 100;
        const extraKm = Math.max(0, Math.ceil(calcDistance - 5));
        computedAmount = perKm * extraKm;
      }

      const orderData = {
        patientId: patientId,
        driverId: driver && (driver._id || driver.id),
        emergencyId: emergencyId,
        serviceType: finalServiceType,
        amount: computedAmount,
        paymentTo: paymentRecipient,
      };

  if (distance) orderData.distance = distance;
  else if (usedDistance) orderData.distance = usedDistance;
      if (equipment && equipment.length > 0) orderData.equipment = equipment;

      const res = await api.post('/orders/create', orderData);
      
      if (res.data.success) {
        setOrder(res.data.order);
        // If backend created a completed free booking (amount 0), treat it as immediate confirmation
        if (res.data.order.status === 'completed') {
          setPaid(true);
          toast.success('Ambulance booking confirmed (no payment required)');
        } else {
          setShowPayment(true);
          toast.info('Please complete the payment to proceed');
        }
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
    toast.success('Payment verified! Ambulance service is confirmed.');
  };

  const handleCancelPayment = () => {
    setShowPayment(false);
    setOrder(null);
  };

  return (
    <div className="space-y-3">
      {!paid ? (
        <>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-3">
            <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <FaAmbulance />
              {getServiceTypeLabel()}
            </h3>
            <div className="space-y-1 text-sm">
              {distance && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 flex items-center gap-1">
                    <FaRoute />
                    Distance:
                  </span>
                  <span className="font-medium">{distance} km</span>
                </div>
              )}
                {equipment && equipment.length > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700 flex items-center gap-1">
                      <FaTools />
                      Equipment:
                    </span>
                    <span className="font-medium">{equipment.join(', ')}</span>
                  </div>
                )}
              <div className="border-t pt-1 mt-1 flex justify-between">
                <span className="font-semibold text-gray-900">Total Amount:</span>
                <span className="font-bold text-red-600">{computedAmountPreview} ৳</span>
              </div>
            </div>
              <p className="text-xs text-gray-600 mt-2">
                💡 Basic ambulance transport up to 5 km is free. For distances over 5 km, an additional 100 ৳ per extra km will apply. The fare is calculated based on the transport distance.
              </p>
          </div>

          <button
            onClick={handleRequestAmbulanceService}
            disabled={loading || showPayment}
            className="w-full px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <FaSpinner className="animate-spin" />
                Creating order...
              </>
            ) : (
              <>
                <FaAmbulance />
                {computedAmountPreview > 0 ? `Pay ${computedAmountPreview} ৳ for ambulance transport` : 'Confirm ambulance booking'}
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
            Your payment has been verified. The ambulance service is confirmed. Payment will be sent to the driver after service completion.
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

export default AmbulancePaymentRequest;
