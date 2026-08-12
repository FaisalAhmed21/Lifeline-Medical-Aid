import React, { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { toast } from 'react-toastify';
import { 
  FaHospital, 
  FaPhone, 
  FaMapMarkerAlt, 
  FaClock,
  FaFilter,
  FaStar,
  FaSearch,
  FaSpinner,
  FaDirections,
  FaGlobe
} from 'react-icons/fa';
import 'leaflet/dist/leaflet.css';
import './HospitalLocator.css';

// Fix for default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

// Custom hospital icon
const hospitalIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgdmlld0JveD0iMCAwIDI0IDI0Ij48cGF0aCBmaWxsPSIjREMyNjI2IiBkPSJNMTIgMkM4LjE0IDIgNSA1LjE0IDUgOWMwIDUuMjUgNyAxMyA3IDEzczctNy43NSA3LTEzYzAtMy44Ni0zLjE0LTctNy03em0wIDExaC0ydi0ySDh2LTJoMlY3aDJ2Mmgydjh6Ii8+PC9zdmc+',
  iconSize: [40, 40],
  iconAnchor: [20, 40],
  popupAnchor: [0, -40],
});

// User location icon
const userIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiIgdmlld0JveD0iMCAwIDI0IDI0Ij48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSI4IiBmaWxsPSIjNDI4NUY0IiBzdHJva2U9IiNmZmZmZmYiIHN0cm9rZS13aWR0aD0iMiIvPjxjaXJjbGUgY3g9IjEyIiBjeT0iMTIiIHI9IjQiIGZpbGw9IiNmZmZmZmYiLz48L3N2Zz4=',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

const RecenterMap = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, 13);
    }
  }, [center, map]);
  return null;
};

const HospitalLocator = () => {
  const { user } = useAuth();
  const [hospitals, setHospitals] = useState([]);
  const [allHospitals, setAllHospitals] = useState([]); // Cache all fetched hospitals
  const [loading, setLoading] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [selectedHospital, setSelectedHospital] = useState(null);
  const [mapCenter, setMapCenter] = useState([23.8103, 90.4125]); // Default: Dhaka
  const [searchRadius, setSearchRadius] = useState(10000); // 10km default (increased from 5km)
  const [maxFetchedRadius, setMaxFetchedRadius] = useState(0); // Track largest radius fetched
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState('map'); // 'map' or 'list'

  useEffect(() => {
    getUserLocation();
  }, []);

  // Filter hospitals from cache when radius changes
  useEffect(() => {
    if (userLocation && allHospitals.length > 0) {
      // If current radius is within cached data, filter from cache
      if (searchRadius <= maxFetchedRadius) {
        console.log(`📦 Using cached data for ${searchRadius}m radius`);
        const filtered = allHospitals.filter(h => h.distance <= searchRadius / 1000);
        setHospitals(filtered);
        if (filtered.length > 0) {
          // Silent cache filtering
        }
        return;
      }
    }
    
    // Otherwise fetch new data
    if (userLocation) {
      searchNearbyHospitals();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userLocation, searchRadius]);

  const getUserLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }

    setLoading(true);
    toast.info('Getting your precise location... Please wait', { autoClose: 3000 });
    
    // First try: High accuracy with longer timeout
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        const accuracy = position.coords.accuracy;
        
        console.log('📍 Your location detected:', location);
        console.log('📏 Location accuracy:', accuracy, 'meters');
        console.log('🌐 Coordinates:', `Lat: ${location.lat.toFixed(6)}, Lng: ${location.lng.toFixed(6)}`);
        console.log('🕐 Timestamp:', new Date(position.timestamp).toLocaleString());
        
        setUserLocation(location);
        setMapCenter([location.lat, location.lng]);
        
        if (accuracy > 100) {
          toast.warning(`Location detected but accuracy is ${Math.round(accuracy)}m. Click "Refresh Location" if incorrect.`, {
            autoClose: 5000
          });
        } else {
          toast.success(`✓ Location accurate within ${Math.round(accuracy)}m`, {
            autoClose: 3000
          });
        }
        setLoading(false);
      },
      (error) => {
        console.error('Geolocation error:', error);
        let errorMessage = 'Unable to get your location. ';
        
        switch(error.code) {
          case error.PERMISSION_DENIED:
            errorMessage += 'Please allow location access in your browser settings.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage += 'Location unavailable. Try moving to a window or outdoors.';
            break;
          case error.TIMEOUT:
            errorMessage += 'Location request timed out. Retrying...';
            // Retry with lower accuracy requirements
            setTimeout(() => {
              navigator.geolocation.getCurrentPosition(
                (position) => {
                  const location = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                  };
                  setUserLocation(location);
                  setMapCenter([location.lat, location.lng]);
                  toast.success('Location detected (approximate)');
                  setLoading(false);
                },
                (err) => {
                  console.error('Retry failed:', err);
                  toast.error('Could not get location. Using default location.');
                  setLoading(false);
                },
                { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
              );
            }, 1000);
            return;
          default:
            errorMessage += 'An unknown error occurred.';
        }
        
        toast.error(errorMessage, { autoClose: 5000 });
        setLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 20000,  // Increased to 20 seconds
        maximumAge: 0    // Don't use cached position
      }
    );
  };

  const searchNearbyHospitals = async () => {
    if (!userLocation) {
      toast.error('Please enable location first');
      return;
    }

    setLoading(true);
    const radiusKm = (searchRadius / 1000).toFixed(1);
    
    console.log('🔍 Searching hospitals via backend proxy...');

    try {
      const response = await api.get(`/hospitals/nearby?latitude=${userLocation.lat}&longitude=${userLocation.lng}&maxDistance=${searchRadius}`);
      
      const data = response.data;
      
      if (data.success && data.data && data.data.length > 0) {
        // Map backend response format to frontend format
        const hospitalData = data.data.map(h => ({
          id: h._id,
          name: h.name,
          address: h.fullAddress || h.address?.street || 'Address not available',
          location: { lat: h.location.coordinates[1], lng: h.location.coordinates[0] },
          phone: h.contact?.phone || 'N/A',
          website: h.contact?.website || null,
          operator: h.operator || null,
          emergency: h.amenities?.emergencyRoom || h.amenities?.ambulance || false,
          beds: h.capacity?.totalBeds || null,
          wheelchair: h.amenities?.wheelchairAccess || false,
          type: h.type || 'hospital',
          distance: h.distance
        }));

        setAllHospitals(hospitalData);
        setHospitals(hospitalData);
        setMaxFetchedRadius(searchRadius);
        // Update map center to the first hospital found
        if (hospitalData.length > 0 && mapCenter[0] === userLocation.lat) {
          setMapCenter([hospitalData[0].location.lat, hospitalData[0].location.lng]);
        }
      } else {
        toast.warning(`No hospitals found within ${radiusKm}km. Try increasing the search radius.`);
        setHospitals([]);
      }
    } catch (error) {
      let errorMsg = 'Failed to load hospitals. ';
      if (error.name === 'AbortError') {
        errorMsg += 'Request timed out. Please try again.';
      } else if (error.message.includes('504')) {
        errorMsg += 'Server is busy. Please try again in a moment.';
      } else if (error.message.includes('429')) {
        errorMsg += 'Too many requests. Please wait a moment.';
      } else {
        errorMsg += error.message;
      }
      
      toast.error(errorMsg, {
        autoClose: 6000
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return (R * c).toFixed(2);
  };

  const openDirections = (hospital) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${hospital.location.lat},${hospital.location.lng}`;
    window.open(url, '_blank');
  };

  const getHospitalWebsite = (hospital) => {
    if (hospital.website) return hospital.website;

    const hospitalName = hospital.name.toLowerCase();
    const knownHospitals = {
      'square': 'https://squarehospitaldhaka.com',
      'apollo': 'https://www.apollodhaka.com',
      'labaid': 'https://labaidgroup.com',
      'united': 'https://unitedhospitalbd.com',
      'birdem': 'https://www.birdem-bd.org',
      'dmch': 'https://www.dmch.gov.bd',
      'dhaka medical': 'https://www.dmch.gov.bd',
      'holy family': 'https://holyfamilyhospitalbd.org',
      'ibn sina': 'https://ibnsina.com.bd',
      'evercare': 'https://evercarebd.com',
      'popular': 'https://populardiagnosticcentre.com',
      'delta': 'https://www.deltahealthcare.com',
      'anwer khan': 'https://anwerkhan.com'
    };

    for (const [key, url] of Object.entries(knownHospitals)) {
      if (hospitalName.includes(key)) {
        return url;
      }
    }
    return null;
  };

  const openHospitalWebsite = (hospital) => {
    const url = getHospitalWebsite(hospital);
    if (url) {
      window.open(url, '_blank');
    }
  };

  const callHospital = (phone) => {
    if (phone && phone !== 'N/A') {
      window.location.href = `tel:${phone}`;
    } else {
      toast.info('Phone number not available for this hospital');
    }
  };

  const HospitalCard = ({ hospital }) => {
    return (
      <div className="hospital-card" onClick={() => setSelectedHospital(hospital)}>
        <div className="hospital-header">
          <div className="hospital-title-section">
            <FaHospital className="hospital-icon" />
            <div>
              <h3 
                className={`hospital-name ${getHospitalWebsite(hospital) ? 'cursor-pointer hover:text-blue-600 transition-colors' : ''}`}
                onClick={(e) => {
                  if (getHospitalWebsite(hospital)) {
                    e.stopPropagation();
                    openHospitalWebsite(hospital);
                  }
                }}
              >
                {hospital.name}
                {getHospitalWebsite(hospital) && <FaGlobe className="inline ml-2 text-blue-500 text-sm" />}
              </h3>
              <p className="hospital-type">
                {hospital.distance} km away
                {hospital.emergency && <span className="emergency-badge">⚡ Emergency</span>}
              </p>
            </div>
          </div>
        </div>

        <div className="hospital-address">
          <FaMapMarkerAlt className="text-red-500" />
          <span>{hospital.address}</span>
        </div>

        {hospital.operator && (
          <div className="hospital-operator">
            Operated by: {hospital.operator}
          </div>
        )}

        <div className="hospital-info-row">
          {hospital.phone !== 'N/A' && (
            <div className="info-badge">
              <FaPhone />
              <span className="phone-text">{hospital.phone}</span>
            </div>
          )}
          {hospital.opening_hours && (
            <div className="info-badge">
              <FaClock />
              {hospital.is24x7 ? '24/7 Open' : hospital.opening_hours}
            </div>
          )}
        </div>

        {hospital.beds && (
          <div className="hospital-capacity">
            🛏️ {hospital.beds} beds
          </div>
        )}

        <div className="hospital-features">
          {hospital.wheelchair && <span className="feature-badge">♿ Wheelchair Access</span>}
          {hospital.type === 'clinic' && <span className="feature-badge">🏥 Clinic</span>}
          {hospital.type === 'hospital' && <span className="feature-badge">🏥 Hospital</span>}
        </div>

        <div className="hospital-actions">
          <button
            onClick={(e) => {
              e.stopPropagation();
              callHospital(hospital.phone);
            }}
            className="action-btn call-btn"
            disabled={hospital.phone === 'N/A'}
          >
            <FaPhone />
            Call
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              openDirections(hospital);
            }}
            className="action-btn directions-btn"
          >
            <FaDirections />
            Directions
          </button>
          {hospital.website && (
            <a
              href={hospital.website}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="action-btn website-btn"
            >
              <FaGlobe />
              Website
            </a>
          )}
        </div>

        <div className="osm-credit">
          <small>📍 Data from OpenStreetMap</small>
        </div>
      </div>
    );
  };

  return (
    <div className="hospital-locator">
      <div className="locator-header">
        <div className="header-content">
          <h1>
            <FaHospital className="header-icon" />
            Hospital Locator
          </h1>
          <p>Find nearby hospitals with available beds and emergency services</p>
          {userLocation && (
            <p className="text-sm text-gray-600 mt-2">
              📍 Current location: {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}
              {' '}
              <span className="text-xs italic">(Click "Refresh Location" if this seems incorrect)</span>
            </p>
          )}
        </div>

        <div className="header-actions">
          <button
            onClick={getUserLocation}
            className="filter-toggle"
            disabled={loading}
            title="Refresh your current location"
          >
            <FaMapMarkerAlt />
            {loading ? 'Locating...' : 'Refresh Location'}
          </button>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`filter-toggle ${showFilters ? 'active' : ''}`}
          >
            <FaFilter />
            Filters
          </button>
          <div className="view-toggle">
            <button
              className={viewMode === 'map' ? 'active' : ''}
              onClick={() => setViewMode('map')}
            >
              Map
            </button>
            <button
              className={viewMode === 'list' ? 'active' : ''}
              onClick={() => setViewMode('list')}
            >
              List
            </button>
          </div>
        </div>
      </div>

      {showFilters && (
        <div className="filters-panel">
          <div className="filter-group">
            <label>Search Radius</label>
            <select
              value={searchRadius}
              onChange={(e) => {
                setSearchRadius(Number(e.target.value));
              }}
            >
              <option value={1000}>1 km</option>
              <option value={2000}>2 km</option>
              <option value={5000}>5 km</option>
              <option value={10000}>10 km (Default)</option>
              <option value={15000}>15 km</option>
              <option value={20000}>20 km</option>
              <option value={30000}>30 km</option>
              <option value={50000}>50 km</option>
            </select>
            <small className="text-gray-600 mt-1 block">
              Current: {(searchRadius / 1000).toFixed(1)} km
            </small>
          </div>

          <button
            onClick={searchNearbyHospitals}
            className="apply-filters-btn"
            disabled={loading}
          >
            {loading ? <FaSpinner className="animate-spin" /> : <FaSearch />}
            Search Again
          </button>
        </div>
      )}

      <div className="locator-content">
        {viewMode === 'map' ? (
          <div className="map-view">
            <div className="map-container">
              <MapContainer
                center={mapCenter}
                zoom={13}
                style={{ height: '100%', width: '100%' }}
                scrollWheelZoom={true}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
                <RecenterMap center={mapCenter} />

                {/* User Location Marker */}
                {userLocation && (
                  <>
                    <Marker 
                      position={[userLocation.lat, userLocation.lng]} 
                      icon={userIcon}
                    >
                      <Popup>
                        <div style={{ textAlign: 'center' }}>
                          <strong>📍 Your Location</strong>
                          <br />
                          <small>{userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}</small>
                        </div>
                      </Popup>
                    </Marker>
                    <Circle
                      center={[userLocation.lat, userLocation.lng]}
                      radius={searchRadius}
                      pathOptions={{ 
                        color: '#4285F4', 
                        fillColor: '#4285F4', 
                        fillOpacity: 0.1,
                        weight: 2
                      }}
                    />
                  </>
                )}

                {/* Hospital Markers */}
                {hospitals.map((hospital, index) => {
                  const lat = hospital.location.lat;
                  const lng = hospital.location.lng;
                  
                  if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
                    console.error(`❌ Invalid coordinates for ${hospital.name}`);
                    return null;
                  }
                  
                  return (
                    <Marker
                      key={hospital.id || index}
                      position={[lat, lng]}
                      icon={hospitalIcon}
                      eventHandlers={{
                        click: () => {
                          setSelectedHospital(hospital);
                          console.log('🏥 Hospital clicked:', hospital.name);
                        },
                      }}
                    >
                      <Popup>
                        <div className="map-popup" style={{ minWidth: '200px' }}>
                          <h4 style={{ margin: '0 0 8px 0', color: '#DC2626' }}>
                            🏥 {hospital.name}
                          </h4>
                          <p style={{ margin: '4px 0', fontSize: '13px' }}>
                            📍 {hospital.address}
                          </p>
                          <p style={{ margin: '4px 0', fontSize: '13px', fontWeight: 'bold' }}>
                            📏 {hospital.distance} km away
                          </p>
                          {hospital.phone !== 'N/A' && (
                            <p style={{ margin: '4px 0', fontSize: '13px' }}>
                              📞 {hospital.phone}
                            </p>
                          )}
                          {hospital.opening_hours && (
                            <p style={{ margin: '4px 0', fontSize: '13px' }}>
                              🕐 {hospital.is24x7 ? '24/7 Open' : hospital.opening_hours}
                            </p>
                          )}
                          {hospital.emergency && (
                            <p style={{ margin: '4px 0', fontSize: '13px', color: '#DC2626', fontWeight: 'bold' }}>
                              ⚡ Emergency Services
                            </p>
                          )}
                          {hospital.beds && (
                            <p style={{ margin: '4px 0', fontSize: '13px' }}>
                              🛏️ {hospital.beds} beds
                            </p>
                          )}
                          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                            {getHospitalWebsite(hospital) && (
                              <button
                                onClick={() => openHospitalWebsite(hospital)}
                                style={{
                                  background: '#2563EB',
                                  color: 'white',
                                  border: 'none',
                                  padding: '6px 12px',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  flex: 1,
                                  fontSize: '13px'
                                }}
                              >
                                🌐 Website
                              </button>
                            )}
                            <button
                              onClick={() => openDirections(hospital)}
                              style={{
                                background: '#DC2626',
                                color: 'white',
                                border: 'none',
                                padding: '6px 12px',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                flex: 1,
                                fontSize: '13px'
                              }}
                            >
                              🗺️ Directions
                            </button>
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}
              </MapContainer>
            </div>

            <div className="hospitals-sidebar">
              <div className="sidebar-header">
                <h3>
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <FaSpinner className="animate-spin" />
                      Searching...
                    </span>
                  ) : (
                    `${hospitals.length} Hospitals Found`
                  )}
                </h3>
                {!loading && hospitals.length > 0 && (
                  <p className="text-xs text-gray-600 mt-1 italic">
                    💡 Click hospital name to visit website
                  </p>
                )}
              </div>
              <div className="hospitals-list">
                {hospitals.length === 0 && !loading ? (
                  <div className="empty-state">
                    <FaHospital className="empty-icon" />
                    <p>No hospitals found</p>
                    <p className="text-sm">Try adjusting your filters or search radius</p>
                  </div>
                ) : (
                  hospitals.map((hospital) => (
                    <div
                      key={hospital.id}
                      className={`sidebar-hospital-item ${
                        selectedHospital?.id === hospital.id ? 'selected' : ''
                      }`}
                      onClick={() => {
                        setSelectedHospital(hospital);
                        setMapCenter([
                          hospital.location.lat,
                          hospital.location.lng,
                        ]);
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <h4
                          className={`flex-1 ${getHospitalWebsite(hospital) ? 'cursor-pointer hover:text-blue-600 transition-colors' : ''}`}
                          onClick={(e) => {
                            if (getHospitalWebsite(hospital)) {
                              e.stopPropagation();
                              openHospitalWebsite(hospital);
                            }
                          }}
                        >
                          {hospital.name}
                          {getHospitalWebsite(hospital) && <FaGlobe className="inline ml-2 text-blue-500 text-xs" />}
                        </h4>
                      </div>
                      <p className="text-sm">
                        {hospital.distance && `${hospital.distance} km away`}
                      </p>
                      <div className="sidebar-stats">
                        <span>📞 {hospital.phone}</span>
                        {hospital.emergency && <span>🚨 Emergency</span>}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="list-view">
            {loading ? (
              <div className="loading-state">
                <FaSpinner className="animate-spin" />
                <p>Loading hospitals...</p>
              </div>
            ) : hospitals.length === 0 ? (
              <div className="empty-state">
                <FaHospital className="empty-icon" />
                <h3>No Hospitals Found</h3>
                <p>Try adjusting your filters or search radius</p>
              </div>
            ) : (
              <div className="hospitals-grid">
                {hospitals.map((hospital) => (
                  <HospitalCard key={hospital.id} hospital={hospital} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default HospitalLocator;
