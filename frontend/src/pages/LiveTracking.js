import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FaMapMarkerAlt, FaAmbulance, FaUserMd, FaHandsHelping, FaArrowLeft } from 'react-icons/fa';
import io from 'socket.io-client';
import api from '../utils/api';

const LiveTracking = () => {
  const { emergencyId } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const socketRef = useRef(null);
  const mapRef = useRef(null);
  
  const [emergency, setEmergency] = useState(null);
  const [helperLocations, setHelperLocations] = useState({});
  const [userLocation, setUserLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState('Connecting...');

  // Initialize Socket.IO connection
  useEffect(() => {
    const socket = io('http://localhost:5000');
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Connected to server');
      setConnectionStatus('Connected');
      
      // Get user from localStorage
      const user = JSON.parse(localStorage.getItem('user'));
      if (user) {
        socket.emit('join', user._id);
      }
    });

    socket.on('disconnect', () => {
      setConnectionStatus('Disconnected');
    });

    // Listen for helper location updates
    socket.on('helper_location_updated', (data) => {
      setHelperLocations(prev => ({
        ...prev,
        [data.helperId]: {
          latitude: data.latitude,
          longitude: data.longitude,
          role: data.role,
          timestamp: data.timestamp
        }
      }));
    });

    // Listen for individual helper locations
    socket.on('helper_location', (data) => {
      setHelperLocations(prev => ({
        ...prev,
        [data.helperId]: {
          latitude: data.latitude,
          longitude: data.longitude,
          role: data.role,
          timestamp: data.timestamp
        }
      }));
    });

    // Listen for emergency status changes
    socket.on('emergency_status_changed', (data) => {
      if (data.emergencyId === emergencyId) {
        setEmergency(prev => ({
          ...prev,
          status: data.status
        }));
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [emergencyId]);

  // Fetch emergency details
  useEffect(() => {
    const fetchEmergency = async () => {
      try {
        const response = await api.get(`/emergency/${emergencyId}`);
        const emergencyData = response.data.data;
        setEmergency(emergencyData);

        // Track assigned helpers
        const helperIds = [];
        if (emergencyData.assignedDoctor) helperIds.push(emergencyData.assignedDoctor._id);
        if (emergencyData.assignedVolunteer) helperIds.push(emergencyData.assignedVolunteer._id);
        if (emergencyData.assignedDriver) helperIds.push(emergencyData.assignedDriver._id);

        if (helperIds.length > 0 && socketRef.current) {
          socketRef.current.emit('track_helpers', {
            emergencyId,
            helperIds
          });
        }

        setLoading(false);
      } catch (error) {
        console.error('Error fetching emergency:', error);
        setLoading(false);
      }
    };

    fetchEmergency();
  }, [emergencyId]);

  // Get user's current location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => {
          console.error('Error getting location:', error);
        }
      );
    }
  }, []);

  const getHelperIcon = (role) => {
    switch (role) {
      case 'doctor':
        return <FaUserMd className="text-blue-500" />;
      case 'volunteer':
        return <FaHandsHelping className="text-green-500" />;
      case 'driver':
        return <FaAmbulance className="text-red-500" />;
      default:
        return <FaMapMarkerAlt />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'assigned':
        return 'bg-blue-100 text-blue-800';
      case 'in-progress':
        return 'bg-purple-100 text-purple-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radius of Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    return distance.toFixed(2);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!emergency) {
    return (
      <div className="max-w-2xl mx-auto mt-10 p-6 bg-white rounded-lg shadow-lg">
        <p className="text-red-600 text-center">Emergency request not found</p>
        <button
          onClick={() => navigate('/dashboard')}
          className="mt-4 w-full px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={() => navigate('/emergencies')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
          >
            <FaArrowLeft />
            Back to Emergencies
          </button>
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${connectionStatus === 'Connected' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
            <span className="text-sm text-gray-600">{connectionStatus}</span>
          </div>
        </div>

        {/* Emergency Info */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-800">Live Tracking</h1>
            <span className={`px-4 py-2 rounded-full text-sm font-semibold ${getStatusColor(emergency.status)}`}>
              {emergency.status.toUpperCase()}
            </span>
          </div>
          
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Emergency ID</p>
              <p className="font-semibold">#{emergency._id.slice(-8)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Urgency Level</p>
              <p className="font-semibold text-red-600">{emergency.urgencyLevel.toUpperCase()}</p>
            </div>
            <div className="md:col-span-2">
              <p className="text-sm text-gray-600">Description</p>
              <p className="font-semibold">{emergency.description || 'Emergency medical assistance required'}</p>
            </div>
          </div>
        </div>

        {/* Map Placeholder */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <FaMapMarkerAlt className="text-primary" />
            Real-Time Map View
          </h2>
          <div 
            ref={mapRef}
            className="w-full h-96 bg-gray-200 rounded-lg flex items-center justify-center relative overflow-hidden"
            style={{
              backgroundImage: "url('data:image/svg+xml,%3Csvg width=\"100\" height=\"100\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cpath d=\"M10 10h80v80H10z\" fill=\"%23f9fafb\" stroke=\"%23d1d5db\" stroke-width=\"1\"/%3E%3C/svg%3E')",
              backgroundSize: '50px 50px'
            }}
          >
            {/* User Location */}
            {userLocation && (
              <div className="absolute" style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
                <div className="relative">
                  <FaMapMarkerAlt className="text-4xl text-red-600 animate-bounce" />
                  <span className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs bg-white px-2 py-1 rounded shadow whitespace-nowrap">
                    You
                  </span>
                </div>
              </div>
            )}
            
            <div className="text-center text-gray-500">
              <p className="text-sm">📍 Interactive Map Integration</p>
              <p className="text-xs mt-2">Integrate with Google Maps, Mapbox, or Leaflet for full functionality</p>
              <p className="text-xs mt-1 text-gray-400">Currently showing placeholder with your location marker</p>
            </div>
          </div>
        </div>

        {/* Helper Status Cards */}
        <div className="grid md:grid-cols-3 gap-4">
          {/* Doctor */}
          {emergency.assignedDoctor && (
            <div className="bg-white rounded-lg shadow-lg p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="text-3xl">
                  <FaUserMd className="text-blue-500" />
                </div>
                <div>
                  <p className="text-xs text-gray-600">Doctor</p>
                  <p className="font-semibold">{emergency.assignedDoctor.name}</p>
                </div>
              </div>
              {helperLocations[emergency.assignedDoctor._id] ? (
                <div className="text-sm space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Status:</span>
                    <span className="text-green-600 font-semibold flex items-center gap-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      En Route
                    </span>
                  </div>
                  {userLocation && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Distance:</span>
                      <span className="font-semibold">
                        {calculateDistance(
                          userLocation.latitude,
                          userLocation.longitude,
                          helperLocations[emergency.assignedDoctor._id].latitude,
                          helperLocations[emergency.assignedDoctor._id].longitude
                        )} km away
                      </span>
                    </div>
                  )}
                  <div className="text-xs text-gray-500">
                    Last updated: {new Date(helperLocations[emergency.assignedDoctor._id].timestamp).toLocaleTimeString()}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500">Waiting for location...</p>
              )}
            </div>
          )}

          {/* Volunteer */}
          {emergency.assignedVolunteer && (
            <div className="bg-white rounded-lg shadow-lg p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="text-3xl">
                  <FaHandsHelping className="text-green-500" />
                </div>
                <div>
                  <p className="text-xs text-gray-600">Volunteer</p>
                  <p className="font-semibold">{emergency.assignedVolunteer.name}</p>
                </div>
              </div>
              {helperLocations[emergency.assignedVolunteer._id] ? (
                <div className="text-sm space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Status:</span>
                    <span className="text-green-600 font-semibold flex items-center gap-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      En Route
                    </span>
                  </div>
                  {userLocation && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Distance:</span>
                      <span className="font-semibold">
                        {calculateDistance(
                          userLocation.latitude,
                          userLocation.longitude,
                          helperLocations[emergency.assignedVolunteer._id].latitude,
                          helperLocations[emergency.assignedVolunteer._id].longitude
                        )} km away
                      </span>
                    </div>
                  )}
                  <div className="text-xs text-gray-500">
                    Last updated: {new Date(helperLocations[emergency.assignedVolunteer._id].timestamp).toLocaleTimeString()}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500">Waiting for location...</p>
              )}
            </div>
          )}

          {/* Driver */}
          {emergency.assignedDriver && (
            <div className="bg-white rounded-lg shadow-lg p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="text-3xl">
                  <FaAmbulance className="text-red-500" />
                </div>
                <div>
                  <p className="text-xs text-gray-600">Ambulance Driver</p>
                  <p className="font-semibold">{emergency.assignedDriver.name}</p>
                </div>
              </div>
              {helperLocations[emergency.assignedDriver._id] ? (
                <div className="text-sm space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Status:</span>
                    <span className="text-green-600 font-semibold flex items-center gap-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      En Route
                    </span>
                  </div>
                  {userLocation && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Distance:</span>
                      <span className="font-semibold">
                        {calculateDistance(
                          userLocation.latitude,
                          userLocation.longitude,
                          helperLocations[emergency.assignedDriver._id].latitude,
                          helperLocations[emergency.assignedDriver._id].longitude
                        )} km away
                      </span>
                    </div>
                  )}
                  <div className="text-xs text-gray-500">
                    Last updated: {new Date(helperLocations[emergency.assignedDriver._id].timestamp).toLocaleTimeString()}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500">Waiting for location...</p>
              )}
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-800 mb-2">ℹ️ Real-Time Tracking Active</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Helper locations update automatically every few seconds</li>
            <li>• Distance calculations show proximity to your location</li>
            <li>• You'll be notified when helpers arrive at your location</li>
            <li>• Emergency status changes are reflected in real-time</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default LiveTracking;
