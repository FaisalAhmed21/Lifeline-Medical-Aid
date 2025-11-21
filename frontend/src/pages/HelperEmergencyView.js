import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  FaMapMarkerAlt, 
  FaArrowLeft,
  FaPhone,
  FaUser,
  FaExclamationTriangle,
  FaCheckCircle,
  FaSpinner,
  FaFileMedical,
  FaFileAlt,
  FaImage,
  FaComments
} from 'react-icons/fa';
import io from 'socket.io-client';
import { toast } from 'react-toastify';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import HelperLocationUpdater from '../components/HelperLocationUpdater';
import './LiveTracking.css';

// Fix Leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

// Custom icons
const patientIcon = L.divIcon({
  className: 'custom-div-icon',
  html: `<div style="background-color:#EF4444; width: 50px; height: 50px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 4px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.4); animation: pulse 2s infinite;">
    <div style="color: white; font-size: 28px;">🆘</div>
  </div>`,
  iconSize: [50, 50],
  iconAnchor: [25, 50],
  popupAnchor: [0, -50]
});

const HelperEmergencyView = () => {
  const { emergencyId } = useParams();
  const navigate = useNavigate();
  const socketRef = useRef(null);
  const { user } = useAuth();
  
  const [emergency, setEmergency] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('Connecting...');
  const [medicalRecords, setMedicalRecords] = useState([]);
  const [showMedicalInfo, setShowMedicalInfo] = useState(false);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [blockingPrescriptionOrders, setBlockingPrescriptionOrders] = useState([]);
  const [volunteerOrder, setVolunteerOrder] = useState(null);
  const [volunteerPaymentStatus, setVolunteerPaymentStatus] = useState('none'); // none | pending | paid
  const [markingPayment, setMarkingPayment] = useState(false);
  const [driverOrder, setDriverOrder] = useState(null);
  const [driverPaymentStatus, setDriverPaymentStatus] = useState('none'); // none | pending | paid
  const [markingDriverPayment, setMarkingDriverPayment] = useState(false);

  useEffect(() => {
    // Initialize Socket.IO
    const socket = io('http://localhost:5000');
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('✅ Helper connected to tracking server');
      setConnectionStatus('Connected');
      
      // Try to join using stored user info, fall back to auth context `user` if available
      let storedUser = null;
      try {
        storedUser = JSON.parse(localStorage.getItem('user'));
      } catch (e) {
        storedUser = null;
      }
      const userToJoin = storedUser || user;
      if (userToJoin && userToJoin._id) {
        socket.emit('join', userToJoin._id);
      }
      // Always join the emergency room so we receive emergency-specific events
      if (emergencyId) {
        socket.emit('joinEmergency', emergencyId);
      }
    });

    socket.on('disconnect', () => {
      setConnectionStatus('Disconnected');
    });

    socket.on('statusUpdate', (data) => {
      if (data.emergencyId === emergencyId) {
        setEmergency(prev => ({ ...prev, status: data.status }));
      }
    });

    // Listen for prescription issuance in this emergency (real-time)
    socket.on('prescriptionIssued', (data) => {
      try {
        if (data && data.emergencyId === emergencyId) {
          // Notify user about the issued prescription (use orderId if available)
          if (data.orderId) {
            toast.success(`Prescription issued for order ${data.orderId}`);
          } else {
            toast.success('A prescription has been issued for this emergency');
          }

          // Re-run the orders check to update blockingPrescriptionOrders and show any unblocked orders
          api.get(`/orders?emergencyId=${emergencyId}&serviceType=PRESCRIPTION&status=paid`)
            .then((ordersRes) => {
              if (ordersRes.data.success) {
                const newBlocking = ordersRes.data.orders.filter(o => !o.prescriptionId);
                setBlockingPrescriptionOrders((prev) => {
                  const prevIds = new Set((prev || []).map(o => o._id || o.orderId));
                  const newIds = new Set(newBlocking.map(o => o._id || o.orderId));
                  // Orders that were previously blocking but are no longer
                  const unblocked = (prev || []).filter(p => !newIds.has(p._id || p.orderId));
                  if (unblocked.length > 0) {
                    const ids = unblocked.map(u => u.orderId || u._id).join(', ');
                    toast.info(`Order(s) ${ids} no longer block completion`);
                  }
                  return newBlocking;
                });
              }
            }).catch(err => console.error('Error refreshing orders after prescriptionIssued socket event', err));
        }
      } catch (err) {
        console.error('prescriptionIssued socket handler error', err);
      }
    });

    // Listen for order payments so UI can refresh payment/blocked state in real-time
    socket.on('orderPaid', (data) => {
      try {
        console.log('socket orderPaid received in HelperEmergencyView', { data, emergencyId, currentUser: user?._id });
        // Process if this payment is for this emergency OR explicitly targeted to this volunteer
        const targetedToThisVolunteer = data && data.volunteerId && user && (data.volunteerId === user._id || data.volunteerId === user._id.toString());
        if (data && (data.emergencyId === emergencyId || targetedToThisVolunteer)) {
          if (data.orderId) {
            toast.success(`Payment received for order ${data.orderId}`);
          } else {
            toast.success('A payment was received for this emergency');
          }
            // If this is a volunteer purchase, update volunteer payment state
            if (data.serviceType === 'VOLUNTEER_PURCHASE') {
            // If payload contains detailed info (sent from server), use it to update UI immediately
            if (data.transactionId || data.volunteerId || data.paymentTo) {
              const volPayload = {
                orderId: data.orderId,
                amount: data.amount,
                transactionId: data.transactionId,
                paymentTo: data.paymentTo,
                itemPrice: data.itemPrice,
                volunteerFee: data.volunteerFee,
                createdAt: data.createdAt
              };
              setVolunteerOrder(volPayload);
              setVolunteerPaymentStatus('paid');
              // Dispatch same-tab event for other listeners
              try {
                window.dispatchEvent(new CustomEvent('orderPaid', { detail: { orderId: data.orderId, emergencyId: data.emergencyId } }));
              } catch (e) {}
            } else if (data.orderId && targetedToThisVolunteer) {
              // If payload lacks details but was targeted to this volunteer, fetch order details by orderId
              api.get(`/orders/${data.orderId}`)
                .then(res => {
                  if (res.data && res.data.success) {
                    const ord = res.data.order || res.data.data;
                    if (ord) {
                      setVolunteerOrder(ord);
                      setVolunteerPaymentStatus(ord.status === 'paid' ? 'paid' : (ord.status === 'pending' ? 'pending' : 'none'));
                      try { window.dispatchEvent(new CustomEvent('orderPaid', { detail: { orderId: ord.orderId || ord._id, emergencyId: ord.emergencyId } })); } catch (e) {}
                    }
                  }

                    // If this is an ambulance/driver payment, update driver UI when targeted
                    const targetedToThisDriver = data && data.driverId && user && (data.driverId === user._id || data.driverId === user._id.toString());
                    const isAmbulance = data && data.serviceType && typeof data.serviceType === 'string' && data.serviceType.startsWith && data.serviceType.startsWith('AMBULANCE');
                    if (isAmbulance || targetedToThisDriver) {
                      // If payload contains driver-targeted details, update UI immediately
                      if (data.transactionId || data.driverId || data.paymentTo) {
                        const drvPayload = {
                          orderId: data.orderId,
                          amount: data.amount,
                          transactionId: data.transactionId,
                          paymentTo: data.paymentTo,
                          createdAt: data.createdAt
                        };
                        setDriverOrder(drvPayload);
                        setDriverPaymentStatus('paid');
                        try { window.dispatchEvent(new CustomEvent('orderPaid', { detail: { orderId: data.orderId, emergencyId: data.emergencyId } })); } catch (e) {}
                      } else if (data.orderId && targetedToThisDriver) {
                        // fetch order details by id
                        api.get(`/orders/${data.orderId}`).then(res => {
                          if (res.data && res.data.success) {
                            const ord = res.data.order || res.data.data;
                            if (ord) {
                              setDriverOrder(ord);
                              setDriverPaymentStatus(ord.status === 'paid' ? 'paid' : (ord.status === 'pending' ? 'pending' : 'none'));
                              try { window.dispatchEvent(new CustomEvent('orderPaid', { detail: { orderId: ord.orderId || ord._id, emergencyId: ord.emergencyId } })); } catch (e) {}
                            }
                          }
                        }).catch(err => console.error('Error fetching order by id after targeted orderPaid (driver)', err));
                      } else {
                        // fallback: refresh ambulance orders for this emergency
                        api.get(`/orders?emergencyId=${emergencyId}`)
                          .then(res => {
                            if (res.data && res.data.success) {
                              const allOrders = res.data.data || res.data.orders || [];
                              const amb = (allOrders || []).find(o => o.serviceType && o.serviceType.startsWith && o.serviceType.startsWith('AMBULANCE'));
                              if (amb) {
                                setDriverOrder(amb);
                                setDriverPaymentStatus(amb.status === 'paid' || amb.status === 'completed' ? 'paid' : (amb.status === 'pending' ? 'pending' : 'none'));
                                try { window.dispatchEvent(new CustomEvent('orderPaid', { detail: { orderId: amb.orderId || amb._id, emergencyId } })); } catch (e) {}
                              }
                            }
                          }).catch(err => console.error('Error fetching orders after ambulance payment', err));
                      }
                    }
                }).catch(err => console.error('Error fetching order by id after targeted orderPaid', err));
            } else {
              // Fallback: refresh volunteer orders from API
              api.get(`/orders?emergencyId=${emergencyId}`)
                .then(res => {
                  if (res.data.success) {
                    const vOrders = res.data.data || res.data.orders || [];
                    const vol = (vOrders || []).find(o => o.serviceType === 'VOLUNTEER_PURCHASE');
                    if (vol) {
                      setVolunteerOrder(vol);
                      setVolunteerPaymentStatus(vol.status === 'paid' ? 'paid' : (vol.status === 'pending' ? 'pending' : 'none'));
                      try {
                        window.dispatchEvent(new CustomEvent('orderPaid', { detail: { orderId: vol.orderId || vol._id, emergencyId: emergencyId } }));
                      } catch (e) {}
                    }
                  }
                }).catch(err => console.error('Error fetching orders after volunteer payment', err));
            }
          }

          api.get(`/orders?emergencyId=${emergencyId}&serviceType=PRESCRIPTION&status=paid`)
            .then((ordersRes) => {
              if (ordersRes.data.success) {
                const newBlocking = ordersRes.data.orders.filter(o => !o.prescriptionId);
                setBlockingPrescriptionOrders((prev) => {
                  const prevIds = new Set((prev || []).map(o => o._id || o.orderId));
                  const newIds = new Set(newBlocking.map(o => o._id || o.orderId));
                  // New blocking orders that appeared because of payment
                  const newlyBlocking = newBlocking.filter(o => !prevIds.has(o._id || o.orderId));
                  if (newlyBlocking.length > 0) {
                    const ids = newlyBlocking.map(n => n.orderId || n._id).join(', ');
                    toast.info(`Order(s) ${ids} are now paid and need prescription issuance before completion.`);
                  }
                  return newBlocking;
                });
              }
            }).catch(err => console.error('Error refreshing orders after orderPaid socket event', err));
        }
      } catch (err) {
        console.error('orderPaid socket handler error', err);
      }
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.emit('leaveEmergency', emergencyId);
        socketRef.current.disconnect();
      }
    };
  }, [emergencyId]);

  useEffect(() => {
    fetchEmergency();
  }, [emergencyId]);

  // Listen for prescription issuance events in the same window and refresh blocking orders
  useEffect(() => {
    const handler = (e) => {
      try {
        const issued = e?.detail?.emergencyId;
        if (issued && issued === emergencyId) {
          // Re-run the orders check
          api.get(`/orders?emergencyId=${emergencyId}&serviceType=PRESCRIPTION&status=paid`)
            .then((ordersRes) => {
              if (ordersRes.data.success) {
                const blocking = ordersRes.data.orders.filter(o => !o.prescriptionId);
                setBlockingPrescriptionOrders(blocking);
              }
            }).catch(err => console.error('Error refreshing orders after prescriptionIssued event', err));
        }
      } catch (err) {
        console.error('prescriptionIssued handler error', err);
      }
    };

    window.addEventListener('prescriptionIssued', handler);
    return () => window.removeEventListener('prescriptionIssued', handler);
  }, [emergencyId]);

  const fetchEmergency = async () => {
    try {
      const response = await api.get(`/emergency/${emergencyId}`);
      if (response.data.success) {
        setEmergency(response.data.data);
        // If emergency already marked paid/distributed on the server, reflect that immediately for volunteer UI
        if (response.data.data.paymentStatus === 'paid' || response.data.data.paymentStatus === 'distributed') {
          setVolunteerPaymentStatus('paid');
        }
        // If user is doctor, check for any paid prescription orders for this emergency
        // that do not yet have an issued prescription. This prevents the doctor
        // from completing the consultation prematurely in the UI.
        try {
          const ordersRes = await api.get(`/orders?emergencyId=${emergencyId}&serviceType=PRESCRIPTION&status=paid`);
          if (ordersRes.data.success) {
            const blocking = ordersRes.data.orders.filter(o => !o.prescriptionId);
            setBlockingPrescriptionOrders(blocking);
          }
        } catch (err) {
          console.error('Failed to fetch orders for emergency:', err);
          setBlockingPrescriptionOrders([]);
        }

        // Fetch volunteer-related order (if any) so assigned volunteer can see payment status
        try {
          // Prefer querying by both emergencyId and volunteerId when available to ensure we get the exact order
          let volRes;
          const assignedVolId = response.data.data.assignedVolunteer && (response.data.data.assignedVolunteer._id || response.data.data.assignedVolunteer);
          if (assignedVolId) {
            volRes = await api.get(`/orders?emergencyId=${emergencyId}&volunteerId=${assignedVolId}`);
          } else {
            volRes = await api.get(`/orders?emergencyId=${emergencyId}`);
          }

          if (volRes.data && volRes.data.success) {
            const allOrders = volRes.data.data || volRes.data.orders || [];
            const volOrder = (allOrders || []).find(o => o.serviceType === 'VOLUNTEER_PURCHASE');
            if (volOrder) {
              setVolunteerOrder(volOrder);
              setVolunteerPaymentStatus(volOrder.status === 'paid' ? 'paid' : (volOrder.status === 'pending' ? 'pending' : 'none'));
            } else {
              setVolunteerOrder(null);
              setVolunteerPaymentStatus('none');
            }
          }
        } catch (err) {
          console.error('Failed to fetch volunteer orders for emergency:', err);
        }

        // Fetch ambulance/driver-related order (if any) so assigned driver can see payment status
        try {
          // Use assignedDriver from response or ambulanceService.driverId if present
          const assignedDriverId = response.data.data.assignedDriver && (response.data.data.assignedDriver._id || response.data.data.assignedDriver) ||
            (response.data.data.ambulanceService && (response.data.data.ambulanceService.driverId || response.data.data.ambulanceService.driver)) || null;

          if (assignedDriverId) {
            const drvRes = await api.get(`/orders?emergencyId=${emergencyId}&driverId=${assignedDriverId}`);
            if (drvRes.data && drvRes.data.success) {
              const drvOrders = drvRes.data.data || drvRes.data.orders || [];
              // pick any ambulance-related order
              const ambOrder = (drvOrders || []).find(o => o.serviceType && o.serviceType.startsWith && o.serviceType.startsWith('AMBULANCE'));
              if (ambOrder) {
                setDriverOrder(ambOrder);
                setDriverPaymentStatus(ambOrder.status === 'paid' || ambOrder.status === 'completed' ? 'paid' : (ambOrder.status === 'pending' ? 'pending' : 'none'));
              } else {
                setDriverOrder(null);
                setDriverPaymentStatus('none');
              }
            }
          } else {
            // Fallback: check emergency.paymentStatus for ambulance bookings
            if (response.data.data.paymentStatus === 'paid' || response.data.data.paymentStatus === 'distributed') {
              setDriverPaymentStatus('paid');
            }
          }
        } catch (err) {
          console.error('Failed to fetch driver/ambulance orders for emergency:', err);
        }

        // If still no volunteer order found and current user is the volunteer, try fetching by volunteerId as fallback
        try {
          if ((!volunteerOrder || volunteerOrder === null) && user?.role === 'volunteer') {
            const byVol = await api.get(`/orders?volunteerId=${user._id}&emergencyId=${emergencyId}`);
            if (byVol.data && byVol.data.success) {
              const found = (byVol.data.data || byVol.data.orders || []).find(o => o.serviceType === 'VOLUNTEER_PURCHASE');
              if (found) {
                setVolunteerOrder(found);
                setVolunteerPaymentStatus(found.status === 'paid' ? 'paid' : (found.status === 'pending' ? 'pending' : 'none'));
              }
            }
          }
        } catch (err) {
          // ignore fallback errors
        }

        // Fetch medical records for doctors
        if (user?.role === 'doctor') {
          fetchMedicalRecords(response.data.data.patient._id || response.data.data.patient);
        }
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching emergency:', error);
      setLoading(false);
    }
  };

  const fetchMedicalRecords = async (patientId) => {
    try {
      setLoadingRecords(true);
      const response = await api.get(`/medical-records/user/${patientId}`);
      if (response.data.success) {
        setMedicalRecords(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching medical records:', error);
    } finally {
      setLoadingRecords(false);
    }
  };

  const updateStatus = async (newStatus) => {
    try {
      setUpdating(true);
      const response = await api.put(`/emergency/${emergencyId}/status`, {
        status: newStatus
      });
      
      if (response.data.success) {
        setEmergency(response.data.data);
        
        // Notify via socket
        if (socketRef.current) {
          socketRef.current.emit('updateStatus', {
            emergencyId,
            status: newStatus,
            message: `Helper updated status to ${newStatus}`
          });
        }
      }
    } catch (error) {
      console.error('Error updating status:', error);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <FaSpinner className="animate-spin text-6xl text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading emergency details...</p>
        </div>
      </div>
    );
  }

  if (!emergency) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <p className="text-red-600 text-xl mb-4">Emergency not found</p>
          <button 
            onClick={() => navigate('/emergencies')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go to Emergencies
          </button>
        </div>
      </div>
    );
  }

  const patientLocation = emergency.location?.coordinates 
    ? [emergency.location.coordinates[1], emergency.location.coordinates[0]]
    : null;

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-500',
      assigned: 'bg-blue-500',
      'in-progress': 'bg-purple-500',
      'en-route': 'bg-orange-500',
      arrived: 'bg-green-500',
      completed: 'bg-gray-500',
      cancelled: 'bg-red-500'
    };
    return colors[status] || 'bg-gray-500';
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/emergencies')}
            className="flex items-center text-blue-600 hover:text-blue-700 mb-4"
          >
            <FaArrowLeft className="mr-2" />
            Back to Emergencies
          </button>
          
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  🚨 Emergency Response
                </h1>
                <p className="text-gray-600">Emergency ID: {emergencyId.slice(0, 8)}...</p>
              </div>
              <div className="flex items-center space-x-4">
                <div className={`px-4 py-2 rounded-full ${getStatusColor(emergency.status)} text-white font-semibold`}>
                  {emergency.status.toUpperCase()}
                </div>
                <div className={`flex items-center ${connectionStatus === 'Connected' ? 'text-green-600' : 'text-red-600'}`}>
                  <div className={`h-2 w-2 rounded-full mr-2 ${connectionStatus === 'Connected' ? 'bg-green-600 animate-pulse' : 'bg-red-600'}`}></div>
                  {connectionStatus}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className={`grid grid-cols-1 ${user?.role === 'doctor' ? 'lg:grid-cols-1' : 'lg:grid-cols-3'} gap-6`}>
          {/* Map Section - Hide for doctors */}
          {user?.role !== 'doctor' && (
            <div className="lg:col-span-2 space-y-6">
              {/* Patient Location Map - Only show for volunteer/driver, not doctor */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                  <FaMapMarkerAlt className="mr-2 text-red-600" />
                  Patient Location (Where to Go)
                </h2>
                
                {patientLocation ? (
                <div style={{ height: '400px', borderRadius: '12px', overflow: 'hidden' }}>
                  <MapContainer
                    center={patientLocation}
                    zoom={15}
                    style={{ height: '100%', width: '100%' }}
                    zoomControl={true}
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    
                    {/* Patient Emergency Marker */}
                    <Marker position={patientLocation} icon={patientIcon}>
                      <Popup>
                        <div className="p-3">
                          <h3 className="font-bold text-red-600 text-lg mb-2">🆘 EMERGENCY LOCATION</h3>
                          <p className="text-sm text-gray-700 mb-1">
                            <strong>Patient:</strong> {emergency.patient?.name || 'Unknown'}
                          </p>
                          {emergency.patient?.phone && (
                            <p className="text-sm text-gray-700 mb-1">
                              <strong>Phone:</strong> {emergency.patient.phone}
                            </p>
                          )}
                          <p className="text-sm text-gray-700 mb-1">
                            <strong>Urgency:</strong> <span className="text-red-600 font-bold">{emergency.urgencyLevel || 'HIGH'}</span>
                          </p>
                          <p className="text-sm text-gray-700">
                            <strong>Description:</strong> {emergency.description || 'Medical emergency'}
                          </p>
                        </div>
                      </Popup>
                    </Marker>

                    {/* Circle around emergency */}
                    <Circle
                      center={patientLocation}
                      radius={500}
                      pathOptions={{
                        color: '#EF4444',
                        fillColor: '#FEE2E2',
                        fillOpacity: 0.2,
                        weight: 2,
                        dashArray: '5, 5'
                      }}
                    />
                  </MapContainer>
                </div>
              ) : (
                <div className="h-96 flex items-center justify-center bg-gray-100 rounded-lg">
                  <p className="text-gray-500">Location not available</p>
                </div>
              )}

              <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800 font-semibold flex items-center">
                  <FaExclamationTriangle className="mr-2" />
                  Go to the marked location immediately!
                </p>
                <p className="text-sm text-red-600 mt-1">
                  📍 Latitude: {patientLocation?.[0]?.toFixed(6)}, Longitude: {patientLocation?.[1]?.toFixed(6)}
                </p>
              </div>
            </div>

            {/* Location Sharing Widget - Only for volunteer/driver */}
            <HelperLocationUpdater emergencyId={emergencyId} />
          </div>
          )}

          {/* Patient Details & Actions Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Patient Information */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                <FaUser className="mr-2 text-blue-600" />
                Patient Information
              </h2>
              
              <div className="space-y-3">
                {/* Volunteer payment status badge (visible to assigned volunteer) */}
                {user?.role === 'volunteer' && volunteerPaymentStatus && volunteerPaymentStatus !== 'none' && (
                  <div className={`p-3 rounded-lg ${volunteerPaymentStatus === 'paid' ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-yellow-50 border border-yellow-200 text-yellow-800'}`}>
                    {volunteerPaymentStatus === 'paid' ? (
                      <div className="space-y-1">
                        <div className="font-semibold">💰 Volunteer payment received: {volunteerOrder?.amount} ৳</div>
                        {volunteerOrder?.transactionId && (
                          <div className="text-sm text-gray-700">Transaction ID: <span className="font-mono text-gray-800">{volunteerOrder.transactionId}</span></div>
                        )}
                        {volunteerOrder?.orderId && (
                          <div className="text-sm text-gray-700">Order: <span className="font-medium">{volunteerOrder.orderId}</span></div>
                        )}
                        {volunteerOrder?.createdAt && (
                          <div className="text-xs text-gray-600">Paid on {new Date(volunteerOrder.createdAt).toLocaleString()}</div>
                        )}
                      </div>
                      ) : (
                      <div className="space-y-1">
                        <div className="font-medium">⏳ Volunteer payment pending</div>
                        {volunteerOrder?.orderId && (
                          <div className="text-sm text-gray-700">Order: <span className="font-medium">{volunteerOrder.orderId}</span></div>
                        )}
                      </div>
                    )}

                    {/* Volunteer: Mark payment received button (visible when paid but not yet distributed) */}
                    {user?.role === 'volunteer' && volunteerPaymentStatus === 'paid' && !(volunteerOrder?.paymentDistributed) && (
                      <div className="mt-3">
                        <button
                          onClick={async () => {
                            if (!volunteerOrder || !volunteerOrder.orderId) return;
                            try {
                              setMarkingPayment(true);
                              const res = await api.post('/orders/complete', { orderId: volunteerOrder.orderId });
                              if (res.data && res.data.success) {
                                // Update local UI to reflect distribution
                                setVolunteerOrder(prev => ({ ...(prev || {}), paymentDistributed: true }));
                                setVolunteerPaymentStatus('distributed');
                                toast.success('Marked payment as received and distributed.');
                                // Refresh emergency/orders to reflect server state
                                fetchEmergency();
                              } else {
                                toast.error((res.data && res.data.error) || 'Failed to mark payment received');
                              }
                            } catch (err) {
                              console.error('Error marking payment received', err);
                              toast.error('Error marking payment received');
                            } finally {
                              setMarkingPayment(false);
                            }
                          }}
                          disabled={markingPayment}
                          className="mt-2 w-full bg-green-600 text-white font-semibold py-2 px-3 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {markingPayment ? 'Marking...' : 'Mark payment received'}
                        </button>
                      </div>
                    )}
                  </div>
                )}
                {/* Driver payment badge (visible to assigned driver) */}
                {user?.role === 'driver' && driverPaymentStatus && driverPaymentStatus !== 'none' && (
                  <div className={`p-3 rounded-lg ${driverPaymentStatus === 'paid' ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-yellow-50 border border-yellow-200 text-yellow-800'}`}>
                    {driverPaymentStatus === 'paid' ? (
                      <div className="space-y-1">
                        <div className="font-semibold">💰 Passenger payment received: {driverOrder?.amount} ৳</div>
                        {driverOrder?.transactionId && (
                          <div className="text-sm text-gray-700">Transaction ID: <span className="font-mono text-gray-800">{driverOrder.transactionId}</span></div>
                        )}
                        {driverOrder?.orderId && (
                          <div className="text-sm text-gray-700">Order: <span className="font-medium">{driverOrder.orderId}</span></div>
                        )}
                        {driverOrder?.createdAt && (
                          <div className="text-xs text-gray-600">Paid on {new Date(driverOrder.createdAt).toLocaleString()}</div>
                        )}
                      </div>
                      ) : (
                      <div className="space-y-1">
                        <div className="font-medium">⏳ Passenger payment pending</div>
                        {driverOrder?.orderId && (
                          <div className="text-sm text-gray-700">Order: <span className="font-medium">{driverOrder.orderId}</span></div>
                        )}
                      </div>
                    )}

                    {/* Driver: Mark payment received button (visible when paid but not yet distributed) */}
                    {user?.role === 'driver' && driverPaymentStatus === 'paid' && !(driverOrder?.paymentDistributed) && (
                      <div className="mt-3">
                        <button
                          onClick={async () => {
                            if (!driverOrder || !driverOrder.orderId) return;
                            try {
                              setMarkingDriverPayment(true);
                              const res = await api.post('/orders/complete', { orderId: driverOrder.orderId });
                              if (res.data && res.data.success) {
                                // Update local UI to reflect distribution
                                setDriverOrder(prev => ({ ...(prev || {}), paymentDistributed: true }));
                                setDriverPaymentStatus('distributed');
                                toast.success('Marked payment as received and distributed to driver.');
                                // Refresh emergency/orders to reflect server state
                                fetchEmergency();
                              } else {
                                toast.error((res.data && res.data.error) || 'Failed to mark payment received');
                              }
                            } catch (err) {
                              console.error('Error marking driver payment received', err);
                              toast.error('Error marking payment received');
                            } finally {
                              setMarkingDriverPayment(false);
                            }
                          }}
                          disabled={markingDriverPayment}
                          className="mt-2 w-full bg-green-600 text-white font-semibold py-2 px-3 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {markingDriverPayment ? 'Marking...' : 'Mark payment received'}
                        </button>
                      </div>
                    )}
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-600">Name</p>
                  <p className="text-lg font-semibold text-gray-900">{emergency.patient?.name || 'Not available'}</p>
                </div>

                {emergency.patient?.phone && (
                  <div>
                    <p className="text-sm text-gray-600">Phone Number</p>
                    <a 
                      href={`tel:${emergency.patient.phone}`}
                      className="flex items-center text-lg font-semibold text-green-600 hover:text-green-700"
                    >
                      <FaPhone className="mr-2" />
                      {emergency.patient.phone}
                    </a>
                  </div>
                )}

                <div>
                  <p className="text-sm text-gray-600">Urgency Level</p>
                  <p className="text-lg font-semibold text-red-600">{emergency.urgencyLevel || 'HIGH'}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-600">Description</p>
                  <p className="text-gray-900">{emergency.description || 'Medical emergency - immediate assistance required'}</p>
                </div>

                {/* Requested extra items (visible to helpers/volunteers) */}
                {(emergency.itemsNeeded || (emergency.itemsCost && emergency.itemsCost > 0)) && (
                  <div>
                    <p className="text-sm text-gray-600">Requested Items</p>
                    <p className="text-lg font-semibold text-gray-900">{emergency.itemsNeeded || 'Extra items requested'}</p>
                    {emergency.itemsCost && emergency.itemsCost > 0 && (
                      <p className="text-sm text-gray-600 mt-1">Estimated Cost: <span className="font-medium">{emergency.itemsCost} ৳</span></p>
                    )}
                  </div>
                )}

                <div>
                  <p className="text-sm text-gray-600">Reported At</p>
                  <p className="text-gray-900">{new Date(emergency.createdAt).toLocaleString()}</p>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                {user?.role === 'doctor' ? 'Actions' : 'Update Status'}
              </h2>
              
              <div className="space-y-3">
                {/* For doctors: Show only chat and medical info buttons */}
                {user?.role === 'doctor' ? (
                  <>
                    <button
                      onClick={() => navigate(`/chat/${emergencyId}`)}
                      className="w-full bg-blue-600 text-white font-semibold py-4 px-6 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center text-lg"
                    >
                      <FaComments className="mr-3 text-xl" />
                      Open Chat
                    </button>

                    <button
                      onClick={() => setShowMedicalInfo(!showMedicalInfo)}
                      className="w-full bg-green-600 text-white font-semibold py-4 px-6 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center text-lg"
                    >
                      <FaFileMedical className="mr-3 text-xl" />
                      {showMedicalInfo ? 'Hide' : 'View'} Medical Information
                    </button>

                    {emergency.status !== 'completed' && (
                      <div>
                        <button
                          onClick={async () => {
                            try {
                              await updateStatus('completed');
                              setTimeout(() => navigate('/emergencies'), 500);
                            } catch (error) {
                              console.error('Failed to complete consultation:', error);
                            }
                          }}
                          disabled={updating || blockingPrescriptionOrders.length > 0}
                          className="w-full bg-purple-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {updating ? <FaSpinner className="animate-spin mr-2" /> : <FaCheckCircle className="mr-2" />}
                          ✔️ Complete Consultation
                        </button>
                        {blockingPrescriptionOrders.length > 0 && (
                          <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
                            ⚠️ There {blockingPrescriptionOrders.length === 1 ? 'is' : 'are'} paid prescription order{blockingPrescriptionOrders.length === 1 ? '' : 's'} that {blockingPrescriptionOrders.length === 1 ? 'is' : 'are'} not yet issued. Please issue the prescription before completing the consultation.
                          </div>
                        )}
                      </div>
                    )}

                    {emergency.status === 'completed' && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                        <FaCheckCircle className="text-green-600 text-4xl mx-auto mb-2" />
                        <p className="text-green-800 font-semibold">Consultation Completed!</p>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {/* For volunteers/drivers: Show original status buttons */}
                    {emergency.status === 'assigned' && (
                      <button
                        onClick={() => updateStatus('en-route')}
                        disabled={updating}
                        className="w-full bg-orange-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-orange-700 transition-colors flex items-center justify-center"
                      >
                        {updating ? <FaSpinner className="animate-spin mr-2" /> : null}
                        📍 I'm On My Way
                      </button>
                    )}

                    {emergency.status === 'en-route' && (
                      <button
                        onClick={() => updateStatus('arrived')}
                        disabled={updating}
                        className="w-full bg-green-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center"
                      >
                        {updating ? <FaSpinner className="animate-spin mr-2" /> : null}
                        I've Arrived
                      </button>
                    )}

                    {emergency.status === 'arrived' && (
                      <button
                        onClick={async () => {
                          try {
                            await updateStatus('completed');
                            setTimeout(() => navigate('/emergencies'), 500);
                          } catch (error) {
                            console.error('Failed to complete emergency:', error);
                          }
                        }}
                        disabled={updating}
                        className="w-full bg-blue-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
                      >
                        {updating ? <FaSpinner className="animate-spin mr-2" /> : null}
                        Complete Emergency
                      </button>
                    )}

                    {emergency.status === 'completed' && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                        <FaCheckCircle className="text-green-600 text-4xl mx-auto mb-2" />
                        <p className="text-green-800 font-semibold">Emergency Completed!</p>
                      </div>
                    )}

                    <button
                      onClick={() => navigate(`/track/${emergencyId}`)}
                      className="w-full bg-purple-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      🗺️ View Full Tracking Map
                    </button>

                    <button
                      onClick={() => navigate(`/chat/${emergencyId}`)}
                      className="w-full bg-blue-600 text-white font-semibold py-4 px-6 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center text-lg"
                    >
                      <FaComments className="mr-3 text-xl" />
                      Open Chat
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Medical Information Section - Only for doctors */}
            {user?.role === 'doctor' && showMedicalInfo && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                  <FaFileMedical className="mr-2 text-green-600" />
                  Patient Medical Records
                </h2>

                {loadingRecords ? (
                  <div className="flex items-center justify-center py-8">
                    <FaSpinner className="animate-spin text-3xl text-blue-600 mr-3" />
                    <p className="text-gray-600">Loading medical records...</p>
                  </div>
                ) : medicalRecords.length > 0 ? (
                  <div className="space-y-4 max-h-[600px] overflow-y-auto">
                    {medicalRecords.map((record) => (
                      <div key={record._id} className="bg-gradient-to-br from-white to-blue-50 border-l-4 border-blue-600 rounded-lg p-5 shadow-sm hover:shadow-md transition-all">
                        {/* Header */}
                        <div className="flex items-start justify-between mb-3">
                          <h4 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                            <FaFileMedical className="text-blue-600" />
                            {record.title || 'Medical Record'}
                          </h4>
                          <span className="text-xs text-gray-600 bg-white px-3 py-1 rounded-full border border-gray-300">
                            {new Date(record.createdAt).toLocaleDateString()}
                          </span>
                        </div>

                        {/* Blood Type */}
                        {record.bloodType && (
                          <div className="mb-3 bg-red-50 border border-red-200 rounded-lg p-3">
                            <span className="text-xs font-bold text-red-700 uppercase">Blood Type:</span>
                            <p className="text-lg font-bold text-red-800">{record.bloodType}</p>
                          </div>
                        )}

                        {/* Diagnosis */}
                        {record.diagnosis && (record.diagnosis.primary || record.diagnosis) && (
                          <div className="mb-3">
                            <span className="text-xs font-bold text-gray-700 uppercase flex items-center gap-1">
                              📋 Diagnosis:
                            </span>
                            <p className="text-sm text-gray-800 mt-1 bg-white p-2 rounded border border-gray-200">
                              {record.diagnosis.primary || record.diagnosis}
                            </p>
                          </div>
                        )}

                        {/* Medications */}
                        {record.medications && record.medications.length > 0 && (
                          <div className="mb-3">
                            <span className="text-xs font-bold text-gray-700 uppercase flex items-center gap-1">
                              💊 Current Medications:
                            </span>
                            <ul className="text-sm text-gray-800 mt-1 space-y-1">
                              {record.medications.map((med, idx) => (
                                <li key={idx} className="bg-white p-2 rounded border-l-2 border-green-500">
                                  {med}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Allergies */}
                        {record.allergies && record.allergies.length > 0 && (
                          <div className="mb-3 bg-red-50 border border-red-300 rounded-lg p-3">
                            <span className="text-xs font-bold text-red-700 uppercase flex items-center gap-1">
                              ⚠️ Allergies:
                            </span>
                            <ul className="text-sm text-red-800 mt-1 space-y-1">
                              {record.allergies.map((allergy, idx) => (
                                <li key={idx} className="font-semibold">• {allergy}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Chronic Conditions */}
                        {record.chronicConditions && (
                          <div className="mb-3">
                            <span className="text-xs font-bold text-gray-700 uppercase flex items-center gap-1">
                              🏥 Chronic Conditions:
                            </span>
                            <p className="text-sm text-gray-800 mt-1 bg-white p-2 rounded border border-gray-200">
                              {record.chronicConditions}
                            </p>
                          </div>
                        )}

                        {/* Notes */}
                        {record.notes && (
                          <div className="mb-3">
                            <span className="text-xs font-bold text-gray-700 uppercase flex items-center gap-1">
                              📝 Additional Notes:
                            </span>
                            <p className="text-sm text-gray-700 mt-1 bg-white p-2 rounded border border-gray-200 italic">
                              {record.notes}
                            </p>
                          </div>
                        )}

                        {/* Medical Files */}
                        {record.medicalFiles && record.medicalFiles.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-gray-300">
                            <span className="text-xs font-bold text-gray-700 uppercase mb-2 block">📎 Attached Documents:</span>
                            <div className="space-y-2">
                              {record.medicalFiles.map((file, idx) => (
                                <a
                                  key={idx}
                                  href={`http://localhost:5000${file.fileUrl}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 text-blue-600 hover:text-blue-800 font-semibold transition-colors bg-white p-2 rounded border border-blue-200 hover:border-blue-400"
                                >
                                  {file.fileUrl.match(/\.(jpg|jpeg|png|gif)$/i) ? (
                                    <>
                                      <FaImage className="text-xl" />
                                      <span className="text-sm">{file.fileName || 'Medical Image'}</span>
                                    </>
                                  ) : (
                                    <>
                                      <FaFileAlt className="text-xl" />
                                      <span className="text-sm">{file.fileName || 'Document'}</span>
                                    </>
                                  )}
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                    <FaFileMedical className="text-gray-400 text-5xl mx-auto mb-4" />
                    <p className="text-gray-700 font-semibold text-lg">No medical records available</p>
                    <p className="text-sm text-gray-500 mt-2">The patient has not uploaded any medical information yet.</p>
                  </div>
                )}
              </div>
            )}

            {/* Instructions - Only for volunteers/drivers */}
            {user?.role !== 'doctor' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-bold text-blue-900 mb-2">📋 Instructions</h3>
                <ol className="text-sm text-blue-800 space-y-2">
                  <li>1. Click "Start Location Sharing" above</li>
                  <li>2. Allow browser location permission</li>
                  <li>3. Go to the marked location on the map</li>
                  <li>4. Update your status as you progress</li>
                  <li>5. Patient can track you in real-time</li>
                </ol>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HelperEmergencyView;
