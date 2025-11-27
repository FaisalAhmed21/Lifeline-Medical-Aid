import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import { toast } from 'react-toastify';

const DriverQuickStatus = ({ driver, emergencyId }) => {
  const [order, setOrder] = useState(null);
  const [status, setStatus] = useState('none'); // none | pending | paid | distributed
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    const fetchOrder = async () => {
      try {
        const drvId = driver && (driver._id || driver.id);
        const res = await api.get(`/orders?emergencyId=${emergencyId}&driverId=${drvId}`);
        if (res.data && res.data.success) {
          const orders = res.data.data || res.data.orders || [];
          // find any ambulance-related order
          const ambOrder = (orders || []).find(o => o.serviceType && o.serviceType.startsWith && o.serviceType.startsWith('AMBULANCE'));
          if (ambOrder && mounted) {
            setOrder(ambOrder);
            setStatus(ambOrder.status === 'paid' || ambOrder.status === 'completed' ? (ambOrder.paymentDistributed ? 'distributed' : 'paid') : (ambOrder.status || 'pending'));
          }
        }
      } catch (err) {
        console.error('Error fetching driver order in DriverQuickStatus', err);
      }
    };
    fetchOrder();
    return () => { mounted = false; };
  }, [emergencyId, driver && (driver._id || driver.id)]);

  const markReceived = async () => {
    if (!order) return;
    setLoading(true);
    try {
      const res = await api.post('/orders/complete', { orderId: order.orderId || order._id });
      if (res.data && res.data.success) {
        toast.success('Marked payment as received');
        setStatus('distributed');
        setOrder(prev => ({ ...(prev || {}), paymentDistributed: true }));
      } else {
        toast.error(res.data.error || 'Failed to mark received');
      }
    } catch (err) {
      console.error('Error marking driver payment received', err);
      toast.error('Failed to mark payment received');
    } finally {
      setLoading(false);
    }
  };

  if (status === 'none') {
    return (
      <div className="mt-2 p-2 bg-yellow-50 rounded text-sm text-gray-700">No ambulance payment requested</div>
    );
  }

  return (
    <div className="mt-2 p-3 bg-white rounded border border-gray-200 text-sm">
      <div className="font-medium mb-1">Ambulance Payment</div>
      {status === 'pending' && <div className="text-yellow-700 mb-2">Status: Pending</div>}
      {status === 'paid' && <div className="text-green-700 mb-2">Status: Paid (awaiting confirmation)</div>}
      {status === 'distributed' && <div className="text-green-800 mb-2">Status: Received</div>}
      {order && order.transactionId && (
        <div className="text-xs text-gray-600 mb-2">TX: <span className="font-mono">{order.transactionId}</span></div>
      )}
      {status === 'paid' && (
        <button onClick={markReceived} disabled={loading} className="px-3 py-2 bg-green-600 text-white rounded">
          {loading ? 'Marking...' : 'Mark payment received'}
        </button>
      )}
    </div>
  );
};

export default DriverQuickStatus;
