import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
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
import './LiveTracking.css';

// Fix Leaflet default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

// Custom marker icons
const createCustomIcon = (color, iconHtml) => {
  return L.divIcon({
    className: 'custom-div-icon',
    html: `<div style="background-color:${color}; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-center; border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);">
      <div style="color: white; font-size: 20px;">${iconHtml}</div>
    </div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -40]
  });
};

const patientIcon = createCustomIcon('#EAB308', '🏥');
const doctorIcon = createCustomIcon('#3B82F6', '👨‍⚕️');
const volunteerIcon = createCustomIcon('#10B981', '🤝');
const driverIcon = createCustomIcon('#EF4444', '🚑');

// Component to auto-fit bounds
function MapBounds({ patientLocation, helperLocations }) {
  const map = useMap();
  
  useEffect(() => {
    if (patientLocation && Object.keys(helperLocations).length > 0) {
      const bounds = L.latLngBounds([patientLocation]);
      
      Object.values(helperLocations).forEach(helper => {
        bounds.extend([helper.latitude, helper.longitude]);
      });
      
      map.fitBounds(bounds, { padding: [50, 50] });
    } else if (patientLocation) {
      map.setView(patientLocation, 13);
    }
  }, [map, patientLocation, helperLocations]);
  
  return null;
}

const LiveTrackingLeaflet = () => {
  const { emergencyId } = useParams();
  const navigate = useNavigate();
  const socketRef = useRef(null);
  
  const [emergency, setEmergency] = useState(null);
  const [helperLocations, setHelperLocations] = useState({});
  const [patientLocation, setPatientLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState('Connecting...');

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

        // Set patient location from emergency data
        if (emergencyData.location && emergencyData.location.coordinates) {
          const [lng, lat] = emergencyData.location.coordinates;
          setPatientLocation([lat, lng]);
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

  // Get helper icon based on role
  const getHelperIcon = (role) => {
    switch (role) {
      case 'doctor':
      case 'nurse':
        return doctorIcon;
      case 'volunteer':
        return volunteerIcon;
      case 'driver':
        return driverIcon;
      default:
        return doctorIcon;
    }
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
                  🗺️ Live Helper Tracking (FREE - OpenStreetMap)
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
              
              {patientLocation ? (
                <div style={{ height: '500px', borderRadius: '12px', overflow: 'hidden' }}>
                  <MapContainer
                    center={patientLocation}
                    zoom={13}
                    style={{ height: '100%', width: '100%' }}
                    zoomControl={true}
                  >
                    {/* OpenStreetMap tiles - FREE! */}
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    
                    <MapBounds patientLocation={patientLocation} helperLocations={helperLocations} />

                    {/* Patient Marker */}
                    <Marker position={patientLocation} icon={patientIcon}>
                      <Popup>
                        <div className="p-2">
                          <h3 className="font-bold text-gray-900">Your Location</h3>
                          <p className="text-sm text-gray-600">{emergency.patient?.name || 'Patient'}</p>
                          <p className="text-xs text-gray-500 mt-1">Emergency Type: {emergency.urgencyLevel}</p>
                        </div>
                      </Popup>
                    </Marker>

                    {/* Helper Markers */}
                    {Object.entries(helperLocations).map(([helperId, location]) => {
                      const helper = helpers.find(h => h._id === helperId);
                      if (!helper) return null;

                      const position = [location.latitude, location.longitude];
                      const distance = calculateDistance(
                        location.latitude,
                        location.longitude,
                        patientLocation[0],
                        patientLocation[1]
                      );

                      return (
                        <React.Fragment key={helperId}>
                          <Marker position={position} icon={getHelperIcon(helper.type)}>
                            <Popup>
                              <div className="p-2">
                                <h3 className="font-bold text-gray-900">{getRoleLabel(helper.type)}</h3>
                                <p className="text-sm text-gray-600">{helper.name}</p>
                                {helper.phone && (
                                  <p className="text-xs text-gray-500">📞 {helper.phone}</p>
                                )}
                                <p className="text-xs text-blue-600 font-semibold mt-1">
                                  {distance.toFixed(2)} km away
                                </p>
                                <p className="text-xs text-gray-400">
                                  Updated: {new Date(location.timestamp).toLocaleTimeString()}
                                </p>
                              </div>
                            </Popup>
                          </Marker>
                          
                          {/* Route line from helper to patient */}
                          <Polyline
                            positions={[position, patientLocation]}
                            color={helper.type === 'doctor' ? '#3B82F6' : helper.type === 'volunteer' ? '#10B981' : '#EF4444'}
                            weight={3}
                            opacity={0.6}
                            dashArray="5, 10"
                          />
                        </React.Fragment>
                      );
                    })}
                  </MapContainer>
                </div>
              ) : (
                <div className="h-96 flex items-center justify-center bg-gray-100 rounded-lg">
                  <p className="text-gray-500">Loading map...</p>
                </div>
              )}

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
                <p className="text-xs text-gray-400">✨ Powered by OpenStreetMap (FREE!)</p>
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
                          patientLocation[0],
                          patientLocation[1]
                        )
                      : null;

                    return (
                      <div 
                        key={helper._id} 
                        className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
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
                          >
                            <FaPhone className="mr-2" />
                            <span>{helper.phone}</span>
                          </a>
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
    </div>
  );
};

export default LiveTrackingLeaflet;
