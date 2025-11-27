import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { FaMapMarkerAlt, FaStar, FaPhone, FaEnvelope, FaSearch, FaComments, FaUserMd } from 'react-icons/fa';
import api from '../utils/api';
import { toast } from 'react-toastify';

const NearbyUsers = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [nearbyUsers, setNearbyUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [roleFilter, setRoleFilter] = useState('');
  const [maxDistance, setMaxDistance] = useState(10000); // 10km default
  const [userLocation, setUserLocation] = useState(null);

  useEffect(() => {
    // Get user's current location
    if (user?.location?.coordinates[0] !== 0) {
      setUserLocation({
        latitude: user.location.coordinates[1],
        longitude: user.location.coordinates[0]
      });
    } else {
      getCurrentLocation();
    }
  }, [user]);

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }

    toast.info('Getting your location...');
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
        toast.success('Location detected!');
      },
      (error) => {
        console.error('Error getting location:', error);
        let errorMessage = 'Unable to get your location. ';
        
        switch(error.code) {
          case error.PERMISSION_DENIED:
            errorMessage += 'Please allow location access in your browser settings.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage += 'Location information is unavailable.';
            break;
          case error.TIMEOUT:
            errorMessage += 'Location request timed out.';
            break;
          default:
            errorMessage += 'An unknown error occurred.';
        }
        
        toast.error(errorMessage);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  const searchNearbyUsers = async () => {
    if (!userLocation) {
      toast.error('Please enable location services');
      return;
    }

    setLoading(true);
    try {
      const params = {
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        maxDistance
      };

      if (roleFilter) {
        params.role = roleFilter;
      }

      const response = await api.get('/users/nearby', { params });
      setNearbyUsers(response.data.data);
      
      if (response.data.count === 0) {
        toast.info('No users found nearby. Try increasing the search radius.');
      }
    } catch (error) {
      console.error('Error searching nearby users:', error);
      toast.error('Error searching nearby users');
    } finally {
      setLoading(false);
    }
  };

  const UserCard = ({ nearbyUser }) => {
    const navigate = useNavigate();
    const [showRatingForm, setShowRatingForm] = useState(false);
    const [rating, setRating] = useState(5);
    const [feedback, setFeedback] = useState('');
    const [showDoctorProfile, setShowDoctorProfile] = useState(false);

    const handleSubmitRating = async (e) => {
      e.preventDefault();
      try {
        await api.post('/ratings', {
          ratedUserId: nearbyUser._id,
          rating,
          feedback,
          serviceType: nearbyUser.role
        });
        
        toast.success(t('ratingSubmitted'));
        setShowRatingForm(false);
        setRating(5);
        setFeedback('');
        
        // Refresh the list
        searchNearbyUsers();
      } catch (error) {
        console.error('Error submitting rating:', error);
        toast.error(error.response?.data?.message || 'Error submitting rating');
      }
    };

    return (
      <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-xl font-semibold text-gray-800">
              {nearbyUser.name}
            </h3>
            <p className="text-sm text-primary capitalize">
              {t(nearbyUser.role)}
            </p>
          </div>
          {(nearbyUser.role === 'volunteer' || nearbyUser.role === 'driver') && (
            <div className="flex items-center space-x-1 bg-yellow-50 px-3 py-1 rounded-full">
              <FaStar className="text-yellow-400" />
              <span className="font-semibold text-gray-800">
                {nearbyUser.rating?.average?.toFixed(1) || '0.0'}
              </span>
              <span className="text-xs text-gray-600">
                ({nearbyUser.rating?.count || 0})
              </span>
            </div>
          )}
        </div>

        <div className="space-y-2 mb-4">
          {nearbyUser.role === 'doctor' && (
            <>
              {nearbyUser.specialization && (
                <p className="text-sm text-gray-600">
                  <strong>{t('specialization')}:</strong> {nearbyUser.specialization}
                </p>
              )}
              {nearbyUser.experience && (
                <p className="text-sm text-gray-600">
                  <strong>{t('experience')}:</strong> {nearbyUser.experience} years
                </p>
              )}
              {nearbyUser.prescriptionFee && (
                <p className="text-sm text-gray-600">
                  <strong>Detailed Prescription Fee:</strong> {nearbyUser.prescriptionFee} ৳
                </p>
              )}
            </>
          )}

          {nearbyUser.role === 'driver' && nearbyUser.vehicleInfo && (
            <p className="text-sm text-gray-600">
              <strong>{t('vehicleType')}:</strong> {nearbyUser.vehicleInfo.type}
            </p>
          )}

          {nearbyUser.location?.district && (
            <p className="text-sm text-gray-600">
              <FaMapMarkerAlt className="inline mr-2 text-primary" />
              {nearbyUser.location.district}
            </p>
          )}

          <div className="flex items-center space-x-4 mt-3">
            {nearbyUser.phone && (
              <a
                href={`tel:${nearbyUser.phone}`}
                className="flex items-center space-x-2 text-sm text-green-600 hover:text-green-700"
              >
                <FaPhone />
                <span>{nearbyUser.phone}</span>
              </a>
            )}
            <a
              href={`mailto:${nearbyUser.email}`}
              className="flex items-center space-x-2 text-sm text-blue-600 hover:text-blue-700"
            >
              <FaEnvelope />
              <span>{t('email')}</span>
            </a>
          </div>
        </div>

        {/* Doctor-specific actions */}
        {nearbyUser.role === 'doctor' && user?.role === 'patient' && (
          <div className="border-t pt-4 mt-4 space-y-2">
            <button
              onClick={() => setShowDoctorProfile(!showDoctorProfile)}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium flex items-center justify-center gap-2"
            >
              <FaUserMd />
              {showDoctorProfile ? 'Hide' : 'View'} Doctor Profile
            </button>
            
            {showDoctorProfile && (
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div className="text-sm space-y-1">
                  <p className="font-semibold text-gray-900">Free Features:</p>
                  <ul className="list-disc list-inside text-gray-700 space-y-1 ml-2">
                    <li>Chat with doctor</li>
                    <li>View doctor profile</li>
                    <li>Share symptoms anytime</li>
                  </ul>
                </div>
                
                <div className="text-sm space-y-1">
                  <p className="font-semibold text-gray-900">Paid Feature:</p>
                  <ul className="list-disc list-inside text-gray-700 space-y-1 ml-2">
                    <li>
                      Detailed Written Prescription ({nearbyUser.prescriptionFee || 50} ৳) with PDF download
                    </li>
                  </ul>
                  <p className="text-xs text-gray-500">
                    Pay inside the chat after the doctor asks, then receive a formatted prescription PDF saved to your history.
                  </p>
                </div>

                <button
                  onClick={async () => {
                    try {
                      if (!userLocation) {
                        toast.error('Please enable location services first');
                        return;
                      }

                      toast.info('Creating emergency request for chat...');
                      
                      const response = await api.post('/emergency', {
                        location: {
                          type: 'Point',
                          coordinates: [userLocation.longitude, userLocation.latitude]
                        },
                        description: `Chat consultation with ${nearbyUser.name}`,
                        urgencyLevel: 'low',
                        requestedRole: 'doctor'
                      });

                      if (response.data.success && response.data.data) {
                        const emergencyId = response.data.data._id;
                        navigate(`/chat/${emergencyId}`);
                        toast.success('Chat session created! Ask for a prescription inside the chat.');
                      } else {
                        toast.error('Failed to create chat session');
                      }
                    } catch (error) {
                      console.error('Error creating chat:', error);
                      toast.error(error.response?.data?.message || 'Failed to create chat session');
                    }
                  }}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium flex items-center justify-center gap-2"
                >
                  <FaComments />
                  Start Chat & Request Prescription
                </button>
              </div>
            )}
          </div>
        )}

        {/* Rating Section */}
        {(nearbyUser.role === 'volunteer' || nearbyUser.role === 'driver') && (
          <div className="border-t pt-4 mt-4">
            {!showRatingForm ? (
              <button
                onClick={() => setShowRatingForm(true)}
                className="text-sm text-primary hover:text-blue-700"
              >
                {t('submitFeedback')}
              </button>
            ) : (
              <form onSubmit={handleSubmitRating} className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('rating')}
                  </label>
                  <select
                    value={rating}
                    onChange={(e) => setRating(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value={5}>5 - Excellent</option>
                    <option value={4}>4 - Good</option>
                    <option value={3}>3 - Average</option>
                    <option value={2}>2 - Poor</option>
                    <option value={1}>1 - Very Poor</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('feedback')}
                  </label>
                  <textarea
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="Optional feedback..."
                  />
                </div>
                <div className="flex space-x-2">
                  <button
                    type="submit"
                    className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm"
                  >
                    {t('submit')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowRatingForm(false)}
                    className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 text-sm"
                  >
                    {t('cancel')}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          {t('findNearby')}
        </h1>

        {/* Search Filters */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Role Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('role')}
              </label>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">All Roles</option>
                <option value="doctor">{t('doctor')}</option>
                <option value="volunteer">{t('volunteer')}</option>
                <option value="driver">{t('driver')}</option>
              </select>
            </div>

            {/* Distance Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Max Distance
              </label>
              <select
                value={maxDistance}
                onChange={(e) => setMaxDistance(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value={5000}>5 km</option>
                <option value={10000}>10 km</option>
                <option value={20000}>20 km</option>
                <option value={50000}>50 km</option>
                <option value={100000}>100 km</option>
              </select>
            </div>

            {/* Search Button */}
            <div className="flex items-end">
              <button
                onClick={searchNearbyUsers}
                disabled={loading || !userLocation}
                className="w-full bg-primary text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                <FaSearch />
                <span>{loading ? t('loading') : t('search')}</span>
              </button>
            </div>
          </div>

          {!userLocation && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                ⚠️ Please enable location services to search for nearby users.
              </p>
              <button
                onClick={getCurrentLocation}
                className="mt-2 text-sm text-primary hover:text-blue-700 underline"
              >
                Enable Location
              </button>
            </div>
          )}
        </div>

        {/* Results */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {nearbyUsers.map((nearbyUser) => (
            <UserCard key={nearbyUser._id} nearbyUser={nearbyUser} />
          ))}
        </div>

        {nearbyUsers.length === 0 && !loading && (
          <div className="text-center py-12">
            <p className="text-gray-600">
              {t('noDataFound')}
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Click search to find nearby users
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default NearbyUsers;
