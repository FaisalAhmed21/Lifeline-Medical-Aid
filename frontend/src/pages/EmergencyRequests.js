import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { toast } from 'react-toastify';
import { 
  FaAmbulance, 
  FaMapMarkerAlt, 
  FaClock, 
  FaCheckCircle, 
  FaTimesCircle,
  FaSpinner,
  FaPhone,
  FaUser,
  FaMapMarkedAlt,
  FaComments,
  FaTrash,
  FaUserMd
} from 'react-icons/fa';

import VolunteerPaymentRequest from '../components/VolunteerPaymentRequest';
import AmbulancePaymentRequest from '../components/AmbulancePaymentRequest';
import VolunteerQuickStatus from '../components/VolunteerQuickStatus';
import DriverQuickStatus from '../components/DriverQuickStatus';

const EmergencyRequests = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchRequests();
    // Refresh every 30 seconds
    const interval = setInterval(fetchRequests, 30000);
    return () => clearInterval(interval);
  }, [filter]);

  const fetchRequests = async () => {
    try {
      const endpoint = user?.role === 'patient' 
        ? '/emergency/my-requests' 
        : '/emergency/assigned';
      
      const params = filter !== 'all' ? `?status=${filter}` : '';
      const response = await api.get(`${endpoint}${params}`);
      
      if (response.data.success) {
        setRequests(response.data.data);
      }
    } catch (error) {
      console.error('Fetch requests error:', error);
      toast.error('Failed to load emergency requests');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (requestId, newStatus, notes = '') => {
    try {
      const response = await api.put(`/emergency/${requestId}/status`, {
        status: newStatus,
        notes
      });
      
      if (response.data.success) {
        toast.success(`Status updated to ${newStatus}`);
        fetchRequests();
      }
    } catch (error) {
      console.error('Update status error:', error);
      toast.error(error.response?.data?.message || 'Failed to update status');
    }
  };

  const deleteRequest = async (requestId) => {
    if (!window.confirm('Are you sure you want to delete this emergency request? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await api.delete(`/emergency/${requestId}`);
      
      if (response.data.success) {
        toast.success('Emergency request deleted successfully');
        fetchRequests();
      }
    } catch (error) {
      console.error('Delete request error:', error);
      toast.error(error.response?.data?.message || 'Failed to delete emergency request');
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return <FaSpinner className="text-gray-500 animate-spin" />;
      case 'assigned':
        return <FaCheckCircle className="text-blue-500" />;
      case 'en-route':
        return <FaAmbulance className="text-yellow-500" />;
      case 'arrived':
        return <FaMapMarkerAlt className="text-green-500" />;
      case 'completed':
        return <FaCheckCircle className="text-green-600" />;
      case 'cancelled':
        return <FaTimesCircle className="text-red-500" />;
      default:
        return <FaClock className="text-gray-400" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-gray-100 text-gray-700';
      case 'assigned': return 'bg-blue-100 text-blue-700';
      case 'en-route': return 'bg-yellow-100 text-yellow-700';
      case 'arrived': return 'bg-green-100 text-green-700';
      case 'completed': return 'bg-green-200 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getUrgencyColor = (urgency) => {
    switch (urgency) {
      case 'critical': return 'bg-red-600 text-white';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-yellow-500 text-white';
      case 'low': return 'bg-blue-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <FaSpinner className="animate-spin text-4xl text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading emergency requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            <FaAmbulance className="inline-block mr-2" />
            {user?.role === 'patient' ? 'My Emergency Requests' : 'Assigned Emergencies'}
          </h1>
          
          {/* Filter Tabs */}
          <div className="flex gap-2">
            {['all', 'pending', 'assigned', 'en-route', 'arrived', 'completed'].map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-4 py-2 rounded-lg capitalize transition ${
                  filter === status
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {requests.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <FaAmbulance className="text-6xl text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">
              No emergency requests found
            </h3>
            <p className="text-gray-500">
              {user?.role === 'patient' 
                ? "You haven't created any emergency requests yet." 
                : "You don't have any assigned emergencies."}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {requests.map((request) => (
              <div key={request._id} className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="p-6">
                  {/* Header */}
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(request.status)}
                      <div>
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(request.status)}`}>
                          {request.status.toUpperCase()}
                        </span>
                        <span className={`ml-2 inline-block px-3 py-1 rounded-full text-xs font-semibold ${getUrgencyColor(request.urgencyLevel)}`}>
                          {request.urgencyLevel.toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <div className="text-right text-sm text-gray-500">
                      <FaClock className="inline mr-1" />
                      {new Date(request.createdAt).toLocaleString()}
                    </div>
                  </div>

                  {/* Patient Info (for helpers) */}
                  {user?.role !== 'patient' && request.patient && (
                    <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-semibold text-gray-700 mb-2">
                        <FaUser className="inline mr-2" />
                        Patient Information
                      </h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Name:</span>
                          <span className="ml-2 font-medium">{request.patient.name}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Phone:</span>
                          <a href={`tel:${request.patient.phone}`} className="ml-2 font-medium text-blue-600 hover:underline">
                            <FaPhone className="inline mr-1" />
                            {request.patient.phone}
                          </a>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Description */}
                  {request.description && (
                    <div className="mb-4">
                      <p className="text-gray-700">
                        <strong>Description:</strong> {request.description}
                      </p>
                    </div>
                  )}

                  {/* Location */}
                  <div className="mb-4">
                    <p className="text-sm text-gray-600">
                      <FaMapMarkerAlt className="inline mr-1 text-red-500" />
                      {request.location.address || `${request.location.coordinates[1]}, ${request.location.coordinates[0]}`}
                    </p>
                    {request.location.district && (
                      <p className="text-sm text-gray-500 ml-5">
                        {request.location.district}, {request.location.division}
                      </p>
                    )}
                  </div>

                  {/* Assigned Helpers */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    {request.assignedDoctor && (
                      <div className="p-3 bg-blue-50 rounded-lg">
                        <p className="text-xs text-gray-600 mb-1">Doctor</p>
                        <p className="font-semibold text-gray-800">{request.assignedDoctor.name}</p>
                        <a href={`tel:${request.assignedDoctor.phone}`} className="text-sm text-blue-600 hover:underline">
                          <FaPhone className="inline mr-1" />
                          {request.assignedDoctor.phone}
                        </a>
                      </div>
                    )}
                    
                    {request.assignedVolunteer && (
                      <div className="p-3 bg-green-50 rounded-lg">
                        <p className="text-xs text-gray-600 mb-1">Volunteer</p>
                        <p className="font-semibold text-gray-800">{request.assignedVolunteer.name}</p>
                        <a href={`tel:${request.assignedVolunteer.phone}`} className="text-sm text-green-600 hover:underline">
                          <FaPhone className="inline mr-1" />
                          {request.assignedVolunteer.phone}
                        </a>
        {user?.role === 'patient' && (
              <VolunteerPaymentRequest volunteer={request.assignedVolunteer} patient={user} itemPrice={request.itemsCost || 0} emergencyId={request._id} paymentStatus={request.paymentStatus} />
            )}
                            {/* For volunteers: show quick payment status and allow marking received from the list */}
                        {user?.role === 'volunteer' && request.assignedVolunteer && user._id === (request.assignedVolunteer._id || request.assignedVolunteer) && (
                          <VolunteerQuickStatus volunteer={request.assignedVolunteer} emergencyId={request._id} />
                        )}
                      </div>
                    )}
                    
                    {request.assignedDriver && (
                      <div className="p-3 bg-yellow-50 rounded-lg">
                        <p className="text-xs text-gray-600 mb-1">Driver</p>
                        <p className="font-semibold text-gray-800">{request.assignedDriver.name}</p>
                        <a href={`tel:${request.assignedDriver.phone}`} className="text-sm text-yellow-700 hover:underline">
                          <FaPhone className="inline mr-1" />
                          {request.assignedDriver.phone}
                        </a>
                        {user?.role === 'patient' && (
                          // Determine serviceType by distance when available; pass distance so AmbulancePaymentRequest computes amount
                          <AmbulancePaymentRequest
                            driver={request.assignedDriver}
                            patient={user}
                            serviceType={ ( (request.distance || (request.ambulanceService && request.ambulanceService.distance)) && (request.distance || request.ambulanceService.distance) > 5) ? 'AMBULANCE_LONG_DISTANCE' : 'AMBULANCE_EQUIPMENT' }
                            distance={ request.distance || (request.ambulanceService && request.ambulanceService.distance) }
                            amount={ request.ambulanceService && request.ambulanceService.amount }
                            emergencyId={request._id}
                          />
                        )}

                        {/* Show quick status for drivers in the list so they see payment regardless of opening detail view */}
                        {user?.role === 'driver' && request.assignedDriver && (user._id === (request.assignedDriver._id || request.assignedDriver)) && (
                          <DriverQuickStatus driver={request.assignedDriver} emergencyId={request._id} />
                        )}
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="mt-4 flex gap-2 flex-wrap items-center">
                    {/* Chat Button (for all) - Works for both chat and paid prescription */}
                    <button
                      onClick={() => navigate(`/chat/${request._id}`)}
                      className="flex-1 px-4 py-2 h-14 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition flex items-center justify-center gap-2 font-medium text-sm min-w-[200px]"
                    >
                      <FaComments />
                      Open Chat
                    </button>

                    {/* Helper Actions */}
                    {user?.role !== 'patient' && request.status !== 'completed' && request.status !== 'cancelled' && (
                      <>
                        <button
                          onClick={() => navigate(`/emergency/${request._id}`)}
                          className={`flex-1 min-w-[200px] px-4 py-2 h-14 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-2 font-medium text-sm`}
                        >
                          <FaMapMarkerAlt />
                          {user?.role === 'doctor' ? 'View Emergency' : 'View Emergency & Share Location'}
                        </button>
                      </>
                    )}

                    {/* Patient Actions - Hide location tracking for doctor emergencies */}
                    {user?.role === 'patient' && request.status !== 'completed' && request.status !== 'cancelled' && 
                     (request.assignedVolunteer || request.assignedDriver) && !request.assignedDoctor && (
                      <button
                        onClick={() => navigate(`/track/${request._id}`)}
                        className="flex-1 min-w-[200px] px-4 py-2 h-14 bg-gradient-to-r from-blue-600 to-teal-600 text-white rounded-lg hover:from-blue-700 hover:to-teal-700 transition flex items-center justify-center gap-2 font-medium text-sm"
                      >
                        <FaMapMarkedAlt />
                        Track Live Location
                      </button>
                    )}

                    {/* Delete Button (for patient only) */}
                    {user?.role === 'patient' && (
                      <button
                        onClick={() => deleteRequest(request._id)}
                        className="flex-1 px-4 py-2 h-14 bg-red-600 text-white rounded-lg hover:bg-red-700 transition flex items-center justify-center gap-2 font-medium text-sm min-w-[200px]"
                        title="Delete this emergency request"
                      >
                        <FaTrash />
                        Delete
                      </button>
                    )}

                    {/* Delete Button for Doctors (only for completed emergencies) */}
                    {user?.role === 'doctor' && request.status === 'completed' && (
                      <button
                        onClick={() => deleteRequest(request._id)}
                        className="flex-1 px-4 py-2 h-14 bg-red-600 text-white rounded-lg hover:bg-red-700 transition flex items-center justify-center gap-2 font-medium text-sm min-w-[200px]"
                        title="Delete this completed emergency"
                      >
                        <FaTrash />
                        Delete
                      </button>
                    )}
                  </div>

                  {/* Notes */}
                  {request.notes && (
                    <div className="mt-4 p-3 bg-gray-100 rounded-lg">
                      <p className="text-sm text-gray-700">
                        <strong>Notes:</strong> {request.notes}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default EmergencyRequests;
