import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { GoogleMap, LoadScript, Marker, InfoWindow, Polyline } from '@react-google-maps/api';
import { 
  FaMapMarkerAlt, 
  FaAmbulance, 
  FaUserMd, 
  FaHandsHelping, 
  FaArrowLeft,
  FaPhone,
  FaClock,
  FaRoute
} from 'react-icons/fa';
import io from 'socket.io-client';
import api from '../utils/api';
import PaymentPage from '../components/PaymentPage';
import DriverQuickStatus from '../components/DriverQuickStatus';
import { toast } from 'react-toastify';
import './LiveTracking.css';

const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY || 'Your API key';

const mapContainerStyle = {
  width: '100%',
  height: '500px',
  borderRadius: '12px'
};

const defaultCenter = {
  lat: 23.8103, // Dhaka, Bangladesh
  lng: 90.4125
};

const LiveTrackingWithMap = () => {
  const { emergencyId } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const socketRef = useRef(null);
  
  const [emergency, setEmergency] = useState(null);
  const [helperLocations, setHelperLocations] = useState({});
  const [patientLocation, setPatientLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState('Connecting...');
  const [selectedHelper, setSelectedHelper] = useState(null);
  const [mapCenter, setMapCenter] = useState(defaultCenter);
  const [mapZoom, setMapZoom] = useState(13);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [activeOrder, setActiveOrder] = useState(null);
  const [volunteerPaid, setVolunteerPaid] = useState(false);
  // Parse current user from localStorage for quick checks in JSX
  const _localUserJson = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
  const _localUser = _localUserJson ? JSON.parse(_localUserJson) : null;

  // Initialize Socket.IO connection
  useEffect(() => {
    const socket = io('http://localhost:5000');
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('✅ Connected to tracking server');
      setConnectionStatus('Connected');
      
      const user = JSON.parse(localStorage.getItem('user'));
      if (user) {
        socket.emit('join', user._id);
        socket.emit('joinEmergency', emergencyId);
      }
    });

    socket.on('disconnect', () => {
      console.log('❌ Disconnected from tracking server');
      setConnectionStatus('Disconnected');
    });

    // Listen for helper location updates
    socket.on('locationUpdate', (data) => {
      console.log('📍 Helper location update:', data);
      setHelperLocations(prev => ({
        ...prev,
        [data.helperId]: {
          latitude: data.latitude,
          longitude: data.longitude,
          role: data.role,
          name: data.name,
          timestamp: data.timestamp
        }
      }));
    });

    // Listen for emergency status changes
    socket.on('statusUpdate', (data) => {
      if (data.emergencyId === emergencyId) {
        console.log('🔄 Emergency status changed:', data.status);
        setEmergency(prev => ({
          ...prev,
          status: data.status
        }));
      }
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.emit('leaveEmergency', emergencyId);
        socketRef.current.disconnect();
      }
    };
  }, [emergencyId]);

  // Fetch emergency details
  useEffect(() => {
    const fetchEmergency = async () => {
      try {
        const response = await api.get(`/emergency/${emergencyId}`);
        const emergencyData = response.data.data;
        setEmergency(emergencyData);
        // If emergency already marked paid on the server, reflect that immediately
        if (emergencyData.paymentStatus === 'paid' || emergencyData.paymentStatus === 'distributed') {
          setVolunteerPaid(true);
        }

        // Fetch orders related to this emergency so we know if volunteer payment already exists
        try {
          // When a volunteer is assigned, prefer querying by both emergencyId and volunteerId
          let ordersRes;
          if (emergencyData.assignedVolunteer && (emergencyData.assignedVolunteer._id || emergencyData.assignedVolunteer)) {
            const volId = emergencyData.assignedVolunteer._id || emergencyData.assignedVolunteer;
            ordersRes = await api.get(`/orders?emergencyId=${emergencyId}&volunteerId=${volId}`);
          } else {
            ordersRes = await api.get(`/orders?emergencyId=${emergencyId}`);
          }

          if (ordersRes.data && ordersRes.data.success) {
            const orders = ordersRes.data.data || ordersRes.data.orders || [];
            const volunteerOrders = orders.filter(o => o.serviceType === 'VOLUNTEER_PURCHASE');
            const paid = volunteerOrders.some(o => o.status === 'paid' || o.status === 'completed');
            // If there is a paid or completed volunteer order, remember that so reloads don't show the Pay button
            if (paid) {
              setVolunteerPaid(true);
              setActiveOrder(volunteerOrders.find(o => o.status === 'paid' || o.status === 'completed'));
            } else {
              setVolunteerPaid(false);
            }
          }
        } catch (err) {
          console.error('Error fetching orders for emergency in LiveTrackingWithMap', err);
        }

        // Set patient location from emergency data
        if (emergencyData.location && emergencyData.location.coordinates) {
          const [lng, lat] = emergencyData.location.coordinates;
          setPatientLocation({ lat, lng });
          setMapCenter({ lat, lng });
        }

        // Request helper locations via socket
        if (socketRef.current) {
          const helperIds = [];
          if (emergencyData.assignedDoctor) helperIds.push(emergencyData.assignedDoctor._id);
          if (emergencyData.assignedVolunteer) helperIds.push(emergencyData.assignedVolunteer._id);
          if (emergencyData.assignedDriver) helperIds.push(emergencyData.assignedDriver._id);

          if (helperIds.length > 0) {
            socketRef.current.emit('requestHelperLocations', {
              emergencyId,
              helperIds
            });
          }
        }

        setLoading(false);
      } catch (error) {
        console.error('❌ Error fetching emergency:', error);
        setLoading(false);
      }
    };

    fetchEmergency();

    // Refresh emergency data every 30 seconds
    const interval = setInterval(fetchEmergency, 30000);
    return () => clearInterval(interval);
  }, [emergencyId]);
  

  // Calculate distance between two points (Haversine formula)
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Get custom marker icon URL based on role
  const getMarkerIcon = (role) => {
    const icons = {
      doctor: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png',
      volunteer: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png',
      driver: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
      patient: 'https://maps.google.com/mapfiles/ms/icons/yellow-dot.png'
    };
    return icons[role] || icons.patient;
  };

  // Get helper role label
  const getRoleLabel = (role) => {
    const labels = {
      doctor: 'Doctor',
      volunteer: 'Volunteer',
      driver: 'Ambulance Driver',
      nurse: 'Nurse'
    };
    return labels[role] || role;
  };

  // Get helper role icon
  const getRoleIcon = (role) => {
    switch (role) {
      case 'doctor':
      case 'nurse':
        return <FaUserMd className="text-blue-600" />;
      case 'volunteer':
        return <FaHandsHelping className="text-green-600" />;
      case 'driver':
        return <FaAmbulance className="text-red-600" />;
      default:
        return <FaMapMarkerAlt />;
    }
  };

  // Get status badge color
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

  const onMapLoad = useCallback((map) => {
    // Fit map bounds to show all markers
    if (patientLocation && Object.keys(helperLocations).length > 0) {
      const bounds = new window.google.maps.LatLngBounds();
      bounds.extend(patientLocation);
      
      Object.values(helperLocations).forEach(helper => {
        bounds.extend({ lat: helper.latitude, lng: helper.longitude });
      });
      
      map.fitBounds(bounds);
    }
  }, [patientLocation, helperLocations]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading tracking information...</p>
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
            onClick={() => navigate('/dashboard')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const helpers = [];
  if (emergency.assignedDoctor) helpers.push({ ...emergency.assignedDoctor, type: 'doctor' });
  if (emergency.assignedVolunteer) helpers.push({ ...emergency.assignedVolunteer, type: 'volunteer' });
  if (emergency.assignedDriver) helpers.push({ ...emergency.assignedDriver, type: 'driver' });

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center text-blue-600 hover:text-blue-700 mb-4"
          >
            <FaArrowLeft className="mr-2" />
            Back to Dashboard
          </button>
          
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  Live Helper Tracking
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Map Section */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                <FaMapMarkerAlt className="mr-2 text-red-600" />
                Real-Time Location Map
              </h2>
              
              <LoadScript googleMapsApiKey={GOOGLE_MAPS_API_KEY}>
                <GoogleMap
                  mapContainerStyle={mapContainerStyle}
                  center={mapCenter}
                  zoom={mapZoom}
                  onLoad={onMapLoad}
                  options={{
                    zoomControl: true,
                    streetViewControl: false,
                    mapTypeControl: true,
                    fullscreenControl: true,
                  }}
                >
                  {/* Patient Marker */}
                  {patientLocation && (
                    <Marker
                      position={patientLocation}
                      icon={{
                        url: getMarkerIcon('patient'),
                        scaledSize: new window.google.maps.Size(40, 40)
                      }}
                      title="Patient Location"
                      onClick={() => setSelectedHelper('patient')}
                    />
                  )}

                  {/* Helper Markers */}
                  {Object.entries(helperLocations).map(([helperId, location]) => {
                    const helper = helpers.find(h => h._id === helperId);
                    if (!helper) return null;

                    const position = { lat: location.latitude, lng: location.longitude };
                    
                    return (
                      <React.Fragment key={helperId}>
                        <Marker
                          position={position}
                          icon={{
                            url: getMarkerIcon(helper.type),
                            scaledSize: new window.google.maps.Size(40, 40)
                          }}
                          title={`${getRoleLabel(helper.type)}: ${helper.name}`}
                          onClick={() => setSelectedHelper(helperId)}
                        />
                        
                        {/* Route line from helper to patient */}
                        {patientLocation && (
                          <Polyline
                            path={[position, patientLocation]}
                            options={{
                              strokeColor: helper.type === 'doctor' ? '#2563eb' : helper.type === 'volunteer' ? '#16a34a' : '#dc2626',
                              strokeOpacity: 0.6,
                              strokeWeight: 3,
                              geodesic: true
                            }}
                          />
                        )}
                      </React.Fragment>
                    );
                  })}

                  {/* Info Window */}
                  {selectedHelper === 'patient' && patientLocation && (
                    <InfoWindow
                      position={patientLocation}
                      onCloseClick={() => setSelectedHelper(null)}
                    >
                      <div className="p-2">
                        <h3 className="font-bold text-gray-900">Patient Location</h3>
                        <p className="text-sm text-gray-600">{emergency.patient?.name || 'Patient'}</p>
                        <p className="text-xs text-gray-500 mt-1">Emergency Type: {emergency.urgencyLevel}</p>
                      </div>
                    </InfoWindow>
                  )}

                  {selectedHelper && selectedHelper !== 'patient' && helperLocations[selectedHelper] && (
                    <InfoWindow
                      position={{ 
                        lat: helperLocations[selectedHelper].latitude, 
                        lng: helperLocations[selectedHelper].longitude 
                      }}
                      onCloseClick={() => setSelectedHelper(null)}
                    >
                      <div className="p-2">
                        {(() => {
                          const helper = helpers.find(h => h._id === selectedHelper);
                          if (!helper) return null;
                          
                          const distance = patientLocation 
                            ? calculateDistance(
                                helperLocations[selectedHelper].latitude,
                                helperLocations[selectedHelper].longitude,
                                patientLocation.lat,
                                patientLocation.lng
                              )
                            : 0;

                          return (
                            <>
                              <h3 className="font-bold text-gray-900">{getRoleLabel(helper.type)}</h3>
                              <p className="text-sm text-gray-600">{helper.name}</p>
                              {helper.phone && (
                                <p className="text-xs text-gray-500">📞 {helper.phone}</p>
                              )}
                              <p className="text-xs text-blue-600 font-semibold mt-1">
                                {distance.toFixed(2)} km away
                              </p>
                              <p className="text-xs text-gray-400">
                                Updated: {new Date(helperLocations[selectedHelper].timestamp).toLocaleTimeString()}
                              </p>
                            </>
                          );
                        })()}
                      </div>
                    </InfoWindow>
                  )}
                </GoogleMap>
              </LoadScript>

              <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-yellow-500 mr-2"></div>
                    <span>You (Patient)</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-blue-500 mr-2"></div>
                    <span>Doctor</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
                    <span>Volunteer</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-red-500 mr-2"></div>
                    <span>Ambulance</span>
                  </div>
                </div>
                <p className="text-xs text-gray-400">Auto-updates every 5 seconds</p>
              </div>
            </div>
          </div>

          {/* Helper Details Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Assigned Helpers</h2>
              
              {helpers.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FaClock className="mx-auto text-4xl mb-2" />
                  <p>Searching for nearby helpers...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {helpers.map((helper) => {
                    const location = helperLocations[helper._id];
                    const distance = location && patientLocation
                      ? calculateDistance(
                          location.latitude,
                          location.longitude,
                          patientLocation.lat,
                          patientLocation.lng
                        )
                      : null;

                    return (
                      <div 
                        key={helper._id} 
                        className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => setSelectedHelper(helper._id)}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center">
                            <div className="text-2xl mr-3">
                              {getRoleIcon(helper.type)}
                            </div>
                            <div>
                              <h3 className="font-semibold text-gray-900">{helper.name}</h3>
                              <p className="text-sm text-gray-600">{getRoleLabel(helper.type)}</p>
                            </div>
                          </div>
                          {location && (
                            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" title="Live tracking active"></div>
                          )}
                        </div>

                        {location && distance !== null && (
                          <>
                            <div className="flex items-center text-sm text-gray-600 mb-2">
                              <FaRoute className="mr-2" />
                              <span className="font-semibold text-blue-600">{distance.toFixed(2)} km</span>
                              <span className="ml-1">away</span>
                            </div>
                            
                            {/* Estimated arrival time */}
                            <div className="flex items-center text-sm text-gray-600 mb-2">
                              <FaClock className="mr-2" />
                              <span>ETA: ~{Math.ceil((distance / 40) * 60)} mins</span>
                            </div>
                          </>
                        )}

                        {helper.phone && (
                          <a 
                            href={`tel:${helper.phone}`}
                            className="flex items-center text-sm text-green-600 hover:text-green-700 mt-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <FaPhone className="mr-2" />
                            <span>{helper.phone}</span>
                          </a>
                        )}

                        {/* If the current user is the assigned driver, show ambulance payment quick status here */}
                        {helper.type === 'driver' && _localUser && _localUser.role === 'driver' && _localUser._id === helper._id && (
                          <div className="mt-3">
                            <DriverQuickStatus driver={helper} emergencyId={emergencyId} />
                          </div>
                        )}

                        {location && (
                          <p className="text-xs text-gray-400 mt-2">
                            Last updated: {new Date(location.timestamp).toLocaleTimeString()}
                          </p>
                        )}

                        {!location && (
                          <p className="text-xs text-yellow-600 mt-2">
                            ⏳ Waiting for location update...
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Emergency Details */}
            <div className="bg-white rounded-lg shadow-md p-6 mt-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Emergency Details</h2>
              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-gray-600">Type:</span>
                  <span className="ml-2 font-semibold text-gray-900">
                    {emergency.urgencyLevel || 'Medical Emergency'}
                  </span>
                </div>
                {/* Pay Volunteer button: shown to patient when volunteer is assigned and extras were requested */}
                {emergency && emergency.assignedVolunteer && emergency.itemsCost > 0 && !(emergency.paymentStatus === 'paid' || emergency.paymentStatus === 'distributed') && (
                  <div className="mt-4">
                    {/* Show button only for the patient who created the emergency */}
                    {_localUser && _localUser.role === 'patient' && _localUser._id === (emergency.patient?._id || emergency.patient) && (
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">You requested extra items worth <strong>{emergency.itemsCost} ৳</strong></p>
                          <p className="text-xs text-gray-500">Pay the assigned volunteer directly via bKash.</p>
                        </div>
                        <div>
                          {volunteerPaid ? (
                            <div className="px-3 py-2 bg-green-50 text-green-800 rounded">Volunteer already paid</div>
                          ) : (
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                try {
                                  // Check if a paid volunteer order already exists
                                  const ordersRes = await api.get(`/orders?emergencyId=${emergencyId}`);
                                  const orders = ordersRes.data.data || [];
                                  const volunteerOrders = orders.filter(o => o.serviceType === 'VOLUNTEER_PURCHASE');
                                  const hasPaid = volunteerOrders.some(o => o.status === 'paid' || o.status === 'completed');
                                  if (hasPaid || volunteerPaid) {
                                    toast.info('Volunteer payment already completed.');
                                    setVolunteerPaid(true);
                                    return;
                                  }

                                  // Create order to pay the volunteer
                                  const patientJson = localStorage.getItem('user');
                                  const patient = patientJson ? JSON.parse(patientJson) : null;

                                  const paymentTo = emergency.assignedVolunteer?.bkashNumber || emergency.assignedVolunteer?.phone || '';

                                  // Calculate volunteer fee and total amount (platform fee applied)
                                  const VOLUNTEER_FEE_PERCENT = 0.05; // 5%
                                  const itemPriceNum = parseFloat(emergency.itemsCost) || 0;
                                  const volunteerFee = Math.round(itemPriceNum * VOLUNTEER_FEE_PERCENT);
                                  const totalAmount = itemPriceNum + volunteerFee;

                                  const createRes = await api.post('/orders/create', {
                                    patientId: patient?._id || (patient && patient.id),
                                    emergencyId: emergencyId,
                                    serviceType: 'VOLUNTEER_PURCHASE',
                                    volunteerId: emergency.assignedVolunteer?._id || (emergency.assignedVolunteer && emergency.assignedVolunteer._id),
                                    amount: totalAmount,
                                    paymentTo: paymentTo,
                                    itemPrice: itemPriceNum,
                                    volunteerFee: volunteerFee
                                  });

                                  if (createRes.data && createRes.data.success) {
                                    setActiveOrder(createRes.data.order);
                                    setShowPaymentModal(true);
                                  } else {
                                    toast.error('Failed to create payment order.');
                                  }
                                } catch (err) {
                                  console.error('Failed to create volunteer order:', err);
                                  toast.error(err.response?.data?.error || 'Failed to create order');
                                }
                              }}
                              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                            >
                              Pay Volunteer
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                <div>
                  <span className="text-gray-600">Description:</span>
                  <p className="mt-1 text-gray-900">{emergency.description || 'No description provided'}</p>
                </div>
                <div>
                  <span className="text-gray-600">Created:</span>
                  <span className="ml-2 text-gray-900">
                    {new Date(emergency.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Payment modal for volunteer */}
      {showPaymentModal && activeOrder && (
        <PaymentPage
          order={activeOrder}
          onCancel={() => {
            setShowPaymentModal(false);
            setActiveOrder(null);
          }}
          onVerified={async (updatedOrder) => {
            setShowPaymentModal(false);
            setActiveOrder(null);
            toast.success('Payment verified!');
            try {
              const response = await api.get(`/emergency/${emergencyId}`);
              setEmergency(response.data.data);
              // mark volunteerPaid so reloads reflect payment
              setVolunteerPaid(true);
            } catch (err) {
              console.error('Failed to refresh emergency after payment:', err);
            }
          }}
        />
      )}
    </div>
  );
};

export default LiveTrackingWithMap;
