import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaAmbulance, FaExclamationTriangle } from 'react-icons/fa';
import api from '../utils/api';
import { toast } from 'react-toastify';

const EmergencyButton = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [urgencyLevel, setUrgencyLevel] = useState('high');
  const [description, setDescription] = useState('');
  const [requestedRole, setRequestedRole] = useState('doctor'); // doctor, volunteer, or driver
  const [itemsNeeded, setItemsNeeded] = useState(''); // Items to bring (for volunteers)
  const [itemsCost, setItemsCost] = useState(0); // Cost of items
  const [distance, setDistance] = useState(''); // Distance in km for ambulance requests

  const handleEmergency = async () => {
    try {
      setLoading(true);

      // Get current location
      if (!navigator.geolocation) {
        toast.error('Geolocation is not supported by your browser');
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          // Prepare request data (do not send yet if volunteer payment required)
          const requestData = {
            location: {
              type: 'Point',
              coordinates: [longitude, latitude]
            },
            description,
            urgencyLevel,
            requestedRole // Send the specific role requested
          };

          // If volunteer and items needed, add them
          if (requestedRole === 'volunteer' && itemsNeeded.trim()) {
            requestData.itemsNeeded = itemsNeeded;
            requestData.itemsCost = parseFloat(itemsCost) || 0;
          }

          // If ambulance requested, include optional distance
          if (requestedRole === 'driver' && distance) {
            requestData.distance = parseFloat(distance) || 0;
          }

          // No pre-payment: always create emergency immediately (payment happens after volunteer assignment)

          // No payment required - create emergency immediately
          const response = await api.post('/emergency', requestData);

          if (response.data.success) {
            const helperAssigned = response.data.helperAssigned;
            const { assignedDoctor, assignedVolunteer, assignedDriver } = response.data.data;

            if (helperAssigned) {
              toast.success('🚨 Emergency request sent! Help is on the way!');

              // Show assigned helpers
              let assignedList = [];
              if (assignedDoctor) assignedList.push(`Doctor: ${assignedDoctor.name}`);
              if (assignedVolunteer) assignedList.push(`Volunteer: ${assignedVolunteer.name}`);
              if (assignedDriver) assignedList.push(`Driver: ${assignedDriver.name}`);

              if (assignedList.length > 0) {
                toast.info('Assigned: ' + assignedList.join(', '));
              }
            } else {
              // Show detailed error message from backend
              const errorMessage = response.data.message || 'Emergency request created, but no on-duty helper was found nearby.';
              toast.warning(`⚠️ ${errorMessage}`, { autoClose: 8000 });
              console.error('No helper assigned:', response.data);
            }

            setShowConfirm(false);
            setDescription('');
          }
        },
        (error) => {
          console.error('Geolocation error:', error);
          toast.error('Unable to get your location. Please enable location services.');
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    } catch (error) {
      console.error('Emergency request error:', error);
      toast.error(error.response?.data?.message || 'Failed to send emergency request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Emergency Button */}
      <button
        onClick={() => setShowConfirm(true)}
        className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 px-6 rounded-lg shadow-lg transform transition hover:scale-105 flex items-center justify-center gap-3"
        disabled={loading}
      >
        <FaAmbulance className="text-2xl animate-pulse" />
        <div className="text-left">
          <div className="text-lg">🚨 {t('emergencyHelp') || 'EMERGENCY HELP'}</div>
          <div className="text-xs opacity-90">{t('oneTapAssistance') || 'One-tap assistance'}</div>
        </div>
      </button>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <FaExclamationTriangle className="text-red-600 text-3xl" />
              <h3 className="text-xl font-bold text-gray-900">
                {t('confirmEmergency') || 'Confirm Emergency Request'}
              </h3>
            </div>

            <p className="text-gray-600 mb-4">
              {t('emergencyConfirmText') || 'Select the type of help you need'}
            </p>

            {/* Request Type Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('requestType') || 'Request Type'} *
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setRequestedRole('doctor')}
                  className={`p-3 border-2 rounded-lg text-center transition ${
                    requestedRole === 'doctor'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-300 hover:border-blue-300'
                  }`}
                >
                  <div className="text-2xl mb-1">👨‍⚕️</div>
                  <div className="text-xs font-medium">Doctor</div>
                </button>
                <button
                  type="button"
                  onClick={() => setRequestedRole('volunteer')}
                  className={`p-3 border-2 rounded-lg text-center transition ${
                    requestedRole === 'volunteer'
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-gray-300 hover:border-green-300'
                  }`}
                >
                  <div className="text-2xl mb-1">🤝</div>
                  <div className="text-xs font-medium">Volunteer</div>
                </button>
                <button
                  type="button"
                  onClick={() => setRequestedRole('driver')}
                  className={`p-3 border-2 rounded-lg text-center transition ${
                    requestedRole === 'driver'
                      ? 'border-red-500 bg-red-50 text-red-700'
                      : 'border-gray-300 hover:border-red-300'
                  }`}
                >
                  <div className="text-2xl mb-1">🚑</div>
                  <div className="text-xs font-medium">Ambulance</div>
                </button>
              </div>
            </div>

            {/* Items Needed (Only for Volunteer) */}
            {requestedRole === 'volunteer' && (
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  📦 Items to Bring ({t('optional') || 'Optional'})
                </label>
                <textarea
                  value={itemsNeeded}
                  onChange={(e) => setItemsNeeded(e.target.value)}
                  placeholder="e.g., Medicine, First-aid kit, etc."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 h-20 resize-none mb-2"
                  maxLength={300}
                />
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  💰 Estimated Cost (optional)
                </label>
                <input
                  type="number"
                  value={itemsCost}
                  onChange={(e) => setItemsCost(e.target.value)}
                  placeholder="Amount in ৳"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  min="0"
                  step="10"
                />
                {/* bKash number input for volunteer payments */}
                {/* paymentTo removed — payment happens after emergency is submitted and volunteer is assigned */}
                {itemsCost > 0 && (
                  <p className="text-xs text-yellow-700 mt-2">
                    ⚠️ Payment must be completed before marking emergency as complete
                  </p>
                )}
              </div>
            )}

            {/* Urgency Level */}
            {/* Distance input (Only for Ambulance) */}
            {requestedRole === 'driver' && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  🚗 Estimated Transport Distance (km) ({t('optional') || 'Optional'})
                </label>
                <input
                  type="number"
                  value={distance}
                  onChange={(e) => setDistance(e.target.value)}
                  placeholder="e.g., 3.5"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  min="0"
                  step="0.1"
                />
                <p className="text-xs text-gray-500 mt-1">If distance &gt; 5 km, a long-distance charge will apply.</p>
              </div>
            )}

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('urgencyLevel') || 'Urgency Level'}
              </label>
              <select
                value={urgencyLevel}
                onChange={(e) => setUrgencyLevel(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="critical">{t('critical') || 'Critical - Life Threatening'}</option>
                <option value="high">{t('high') || 'High - Urgent'}</option>
                <option value="medium">{t('medium') || 'Medium'}</option>
                <option value="low">{t('low') || 'Low'}</option>
              </select>
            </div>

            {/* Description */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('description') || 'Description'} ({t('optional') || 'Optional'})
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('describeEmergency') || 'Describe the emergency...'}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 h-24 resize-none"
                maxLength={500}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition"
                disabled={loading}
              >
                {t('cancel')}
              </button>
              <button
                onClick={handleEmergency}
                className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition disabled:opacity-50"
                disabled={loading}
              >
                {loading ? t('sending') || 'Sending...' : t('sendEmergency') || 'Send Emergency Request'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* no pre-submit payment modal in this component */}
    </div>
  );
};

export default EmergencyButton;
