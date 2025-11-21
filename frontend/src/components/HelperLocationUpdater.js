import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { FaMapMarkerAlt, FaCheckCircle, FaTimes } from 'react-icons/fa';
import io from 'socket.io-client';

const HelperLocationUpdater = ({ emergencyId }) => {
  const { user } = useAuth();
  const socketRef = useRef(null);
  const [tracking, setTracking] = useState(false);
  const [locationError, setLocationError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const watchIdRef = useRef(null);

  useEffect(() => {
    // Initialize Socket.IO
    const socket = io('http://localhost:5000');
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('✅ Helper connected to tracking server');
      socket.emit('join', user._id);
      if (emergencyId) {
        socket.emit('joinEmergency', emergencyId);
      }
    });

    return () => {
      stopTracking();
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [user._id, emergencyId]);

  const startTracking = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser');
      return;
    }

    setTracking(true);
    setLocationError(null);

    // Watch position with high accuracy
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        
        // Send location update via socket
        if (socketRef.current && socketRef.current.connected) {
          socketRef.current.emit('updateLocation', {
            userId: user._id,
            emergencyId: emergencyId,
            latitude,
            longitude,
            role: user.role,
            name: user.name
          });
          
          setLastUpdate(new Date());
          console.log(`📍 Location sent: [${latitude}, ${longitude}]`);
        }
      },
      (error) => {
        console.error('Location error:', error);
        setLocationError(error.message);
        setTracking(false);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000, // 5 seconds
        timeout: 10000 // 10 seconds
      }
    );
  };

  const stopTracking = () => {
    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setTracking(false);
  };

  return (
    <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <FaMapMarkerAlt className="text-3xl mr-3" />
          <div>
            <h3 className="text-xl font-bold">Live Location Sharing</h3>
            <p className="text-sm text-blue-100">
              {tracking ? 'Sharing your location with patient' : 'Start sharing to help patient track you'}
            </p>
          </div>
        </div>
        {tracking && (
          <div className="h-3 w-3 rounded-full bg-green-400 animate-pulse"></div>
        )}
      </div>

      {locationError && (
        <div className="bg-red-500 bg-opacity-20 border border-red-300 rounded-lg p-3 mb-4 flex items-center">
          <FaTimes className="mr-2" />
          <span className="text-sm">{locationError}</span>
        </div>
      )}

      {lastUpdate && (
        <div className="bg-white bg-opacity-20 rounded-lg p-3 mb-4">
          <div className="flex items-center text-sm">
            <FaCheckCircle className="mr-2" />
            <span>Last update: {lastUpdate.toLocaleTimeString()}</span>
          </div>
        </div>
      )}

      <div className="flex space-x-3">
        {!tracking ? (
          <button
            onClick={startTracking}
            className="flex-1 bg-white text-blue-600 font-semibold py-3 px-6 rounded-lg hover:bg-blue-50 transition-colors flex items-center justify-center"
          >
            <FaMapMarkerAlt className="mr-2" />
            Start Location Sharing
          </button>
        ) : (
          <button
            onClick={stopTracking}
            className="flex-1 bg-red-500 text-white font-semibold py-3 px-6 rounded-lg hover:bg-red-600 transition-colors flex items-center justify-center"
          >
            <FaTimes className="mr-2" />
            Stop Sharing
          </button>
        )}
      </div>

      <p className="text-xs text-blue-100 mt-4 text-center">
        🔒 Your location is only shared with the patient you're helping
      </p>
    </div>
  );
};

export default HelperLocationUpdater;
