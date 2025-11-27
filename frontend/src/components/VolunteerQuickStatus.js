import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import { toast } from 'react-toastify';

const VolunteerQuickStatus = ({ volunteer, emergencyId }) => {
  const [order, setOrder] = useState(null);
  const [status, setStatus] = useState('none'); // none | pending | paid | distributed
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    const fetchOrder = async () => {
      try {
        const res = await api.get(`/orders?emergencyId=${emergencyId}&volunteerId=${volunteer._id}`);
        if (res.data && res.data.success) {
          const orders = res.data.data || res.data.orders || [];
          const volOrder = (orders || []).find(o => o.serviceType === 'VOLUNTEER_PURCHASE');
          if (volOrder && mounted) {
            setOrder(volOrder);
            setStatus(volOrder.status === 'paid' ? (volOrder.paymentDistributed ? 'distributed' : 'paid') : volOrder.status || 'pending');
          }
        }
      } catch (err) {
        console.error('Error fetching volunteer order in QuickStatus', err);
      }
    };
    fetchOrder();
    return () => { mounted = false; };
  }, [emergencyId, volunteer._id]);

  const markReceived = async () => {
    if (!order) return;
    setLoading(true);
    try {
      const res = await api.post('/orders/complete', { orderId: order.orderId });
      if (res.data && res.data.success) {
        toast.success('Marked payment as received');
        setStatus('distributed');
        setOrder(prev => ({ ...(prev || {}), paymentDistributed: true }));
      } else {
        toast.error(res.data.error || 'Failed to mark received');
      }
    } catch (err) {
      console.error('Error marking payment received', err);
      toast.error('Failed to mark payment received');
    } finally {
      setLoading(false);
    }
  };

  if (status === 'none') {
    return (
      <div className="mt-2 p-2 bg-blue-50 rounded text-sm text-gray-700">No payment requested</div>
    );
  }

  return (
    <div className="mt-2 p-3 bg-white rounded border border-gray-200 text-sm">
      <div className="font-medium mb-1">Volunteer Payment</div>
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

export default VolunteerQuickStatus;
