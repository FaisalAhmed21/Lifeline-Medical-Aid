import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import EmergencyButton from '../components/EmergencyButton';
import HealthTipsFeed from '../components/HealthTipsFeed';
import WearableDeviceIntegration from '../components/WearableDeviceIntegration';
import { FaMapMarkerAlt, FaStar, FaHeart, FaBandAid, FaFilePdf, FaVideo, FaBook } from 'react-icons/fa';

const Dashboard = () => {
  const { t } = useTranslation();
  const { user, updateLocation } = useAuth();
  const [gettingLocation, setGettingLocation] = useState(false);

  const getCurrentLocation = () => {
    setGettingLocation(true);
    
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      setGettingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          
          // Reverse geocoding to get address (using a free API)
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
          );
          const data = await response.json();
          
          await updateLocation({
            latitude,
            longitude,
            address: data.display_name || '',
            district: data.address?.state_district || data.address?.county || '',
            division: data.address?.state || ''
          });
        } catch (error) {
          console.error('Error updating location:', error);
        } finally {
          setGettingLocation(false);
        }
      },
      (error) => {
        console.error('Error getting location:', error);
        alert('Unable to get your location. Please enable location services.');
        setGettingLocation(false);
      }
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          {t('dashboard')}
        </h1>

        {/* Welcome Card */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div>
            <h2 className="text-2xl font-semibold text-gray-800">
              {t('welcome')}, {user?.name}!
            </h2>
            <p className="text-gray-600 mt-1">
              {t('role')}: <span className="font-medium text-primary">{t(user?.role)}</span>
            </p>
          </div>
        </div>

        {/* Emergency Button - Show for patients only */}
        {user?.role === 'patient' && (
          <div className="mb-6">
            <EmergencyButton />
          </div>
        )}

        {/* Location Card - Full Width */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            {t('location')}
          </h3>
          {user?.location?.coordinates[0] !== 0 ? (
            <div className="text-sm text-gray-600">
              <p className="mb-2">
                <FaMapMarkerAlt className="inline mr-2 text-primary" />
                {user?.location?.address?.substring(0, 50)}...
              </p>
              <p className="text-xs">
                {t('district')}: {user?.location?.district || 'N/A'}
              </p>
            </div>
          ) : (
            <p className="text-sm text-gray-500 mb-3">
              No location set
            </p>
          )}
          <button
            onClick={getCurrentLocation}
            disabled={gettingLocation}
            className="mt-3 w-full bg-primary text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm disabled:opacity-50"
          >
            {gettingLocation ? t('loading') : t('currentLocation')}
          </button>
        </div>

        {/* Rating Card (for volunteers and drivers) */}
        {(user?.role === 'volunteer' || user?.role === 'driver') && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              {t('rating')}
            </h3>
            <div className="flex items-center space-x-2 mb-2">
              <FaStar className="text-yellow-400 text-2xl" />
              <span className="text-3xl font-bold text-gray-800">
                {user?.rating?.average?.toFixed(1) || '0.0'}
              </span>
            </div>
            <p className="text-sm text-gray-600">
              {user?.rating?.count || 0} {t('reviews')}
            </p>
          </div>
        )}

        {/* Learning Resources Section */}
        <div className="mb-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">{t('learningResources') || 'Learning Resources'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link
              to="/cpr-guide"
              className="bg-gradient-to-br from-red-500 to-pink-600 text-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-all transform hover:scale-105"
            >
              <FaHeart className="text-4xl mb-3" />
              <h4 className="text-lg font-bold mb-2">{t('cprGuide') || 'CPR Guide'}</h4>
              <p className="text-sm opacity-90">{t('cprGuideDesc') || 'Learn life-saving CPR techniques'}</p>
            </Link>

            <Link
              to="/wound-care"
              className="bg-gradient-to-br from-blue-500 to-cyan-600 text-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-all transform hover:scale-105"
            >
              <FaBandAid className="text-4xl mb-3" />
              <h4 className="text-lg font-bold mb-2">{t('woundCare') || 'Wound Care'}</h4>
              <p className="text-sm opacity-90">{t('woundCareDesc') || 'Step-by-step wound treatment'}</p>
            </Link>

            <Link
              to="/video-library"
              className="bg-gradient-to-br from-purple-500 to-indigo-600 text-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-all transform hover:scale-105"
            >
              <FaVideo className="text-4xl mb-3" />
              <h4 className="text-lg font-bold mb-2">{t('videoLibrary') || 'Video Library'}</h4>
              <p className="text-sm opacity-90">{t('videoLibraryDesc') || 'Watch emergency training videos'}</p>
            </Link>

            <Link
              to="/offline-guides"
              className="bg-gradient-to-br from-green-500 to-emerald-600 text-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-all transform hover:scale-105"
            >
              <FaFilePdf className="text-4xl mb-3" />
              <h4 className="text-lg font-bold mb-2">{t('offlineGuides') || 'Offline Guides'}</h4>
              <p className="text-sm opacity-90">{t('offlineGuidesDesc') || 'Download emergency PDFs'}</p>
            </Link>
          </div>
        </div>

        {/* Wearable Device Integration - Show for patients */}
        {user?.role === 'patient' && (
          <div className="mb-6">
            <WearableDeviceIntegration />
          </div>
        )}

        {/* Health Tips Feed */}
        <div className="mb-6">
          <HealthTipsFeed />
        </div>

        {/* Role-Specific Information */}
        {(user?.role === 'doctor' || user?.role === 'driver') && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            {user?.role === 'doctor' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">
                    <strong>{t('specialization')}:</strong> {user?.specialization || 'Not specified'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">
                    <strong>{t('experience')}:</strong> {user?.experience || 0} years
                  </p>
                </div>
              </div>
            )}

            {user?.role === 'driver' && user?.vehicleInfo && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">
                    <strong>{t('vehicleType')}:</strong> {user?.vehicleInfo?.type || 'Not specified'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">
                    <strong>{t('vehicleRegistration')}:</strong> {user?.vehicleInfo?.registrationNumber || 'Not specified'}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Verification Alert */}
        {!user?.isVerified && user?.role !== 'patient' && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              ⚠️ Please upload your verification documents to get verified and access all features.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
