import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { FaUser, FaEnvelope, FaPhone, FaEdit, FaSave, FaTimes, FaUpload, FaCamera } from 'react-icons/fa';
import api from '../utils/api';
import { toast } from 'react-toastify';
import WearableDeviceIntegration from '../components/WearableDeviceIntegration';

const Profile = () => {
  const { t } = useTranslation();
  const { user, updateProfile, uploadProfilePicture } = useAuth();
  const [editing, setEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingPicture, setUploadingPicture] = useState(false);
  const [profilePicturePreview, setProfilePicturePreview] = useState(null);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    specialization: user?.specialization || '',
    experience: user?.experience || '',
    vehicleType: user?.vehicleInfo?.type || '',
    vehicleRegistration: user?.vehicleInfo?.registrationNumber || '',
    vehicleModel: user?.vehicleInfo?.model || ''
  });

  const [documents, setDocuments] = useState({
    nid: null,
    bmdc: null,
    license: null,
    nidNumber: '',
    bmdcNumber: '',
    licenseNumber: ''
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleDocumentChange = (e) => {
    const { name, value, files } = e.target;
    if (files) {
      setDocuments({ ...documents, [name]: files[0] });
    } else {
      setDocuments({ ...documents, [name]: value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const updateData = {
        name: formData.name,
        phone: formData.phone,
        specialization: formData.specialization,
        experience: formData.experience
      };

      if (user?.role === 'driver') {
        updateData.vehicleInfo = {
          type: formData.vehicleType,
          registrationNumber: formData.vehicleRegistration,
          model: formData.vehicleModel
        };
      }

      await updateProfile(updateData);
      setEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  };

  const handleProfilePictureChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size should be less than 5MB');
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setProfilePicturePreview(reader.result);
    };
    reader.readAsDataURL(file);

    // Upload immediately
    setUploadingPicture(true);
    try {
      await uploadProfilePicture(file);
      setProfilePicturePreview(null);
    } catch (error) {
      console.error('Error uploading profile picture:', error);
    } finally {
      setUploadingPicture(false);
    }
  };

  const getProfilePictureUrl = () => {
    if (profilePicturePreview) return profilePicturePreview;
    if (user?.profilePicture) {
      // If it's a full URL (from Google OAuth)
      if (user.profilePicture.startsWith('http')) {
        return user.profilePicture;
      }
      // If it's a file path from our server (e.g., /uploads/profiles/filename.jpg)
      const apiBaseUrl = process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:5000';
      return `${apiBaseUrl}${user.profilePicture}`;
    }
    return null;
  };

  const handleDocumentUpload = async (e) => {
    e.preventDefault();
    setUploading(true);

    try {
      const formDataObj = new FormData();
      
      if (documents.nid) {
        formDataObj.append('nid', documents.nid);
        formDataObj.append('nidNumber', documents.nidNumber);
      }
      
      if (documents.bmdc && user?.role === 'doctor') {
        formDataObj.append('bmdc', documents.bmdc);
        formDataObj.append('bmdcNumber', documents.bmdcNumber);
      }
      
      if (documents.license && user?.role === 'driver') {
        formDataObj.append('license', documents.license);
        formDataObj.append('licenseNumber', documents.licenseNumber);
      }

      await api.post('/users/upload-documents', formDataObj, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      toast.success(t('documentsUploaded'));
      
      // Clear form
      setDocuments({
        nid: null,
        bmdc: null,
        license: null,
        nidNumber: '',
        bmdcNumber: '',
        licenseNumber: ''
      });
      
      // Reload page to show updated status
      setTimeout(() => window.location.reload(), 2000);
    } catch (error) {
      console.error('Error uploading documents:', error);
      toast.error(error.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          {t('profile')}
        </h1>

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              className="py-4 px-1 border-b-2 font-medium text-sm border-blue-500 text-blue-600"
            >
              👤 Profile Information
            </button>
          </nav>
        </div>

        {/* Profile Tab */}
        {true && (
          <>
            {/* Profile Picture Section */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-6">
                {t('profilePicture')}
              </h2>
              <div className="flex flex-col md:flex-row items-center gap-6">
                {/* Profile Picture Display */}
                <div className="relative">
                  <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center border-4 border-blue-500">
                    {getProfilePictureUrl() ? (
                      <img
                        src={getProfilePictureUrl()}
                        alt="Profile"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <FaUser className="text-6xl text-gray-400" />
                    )}
                  </div>
                  <label
                    htmlFor="profilePictureInput"
                    className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full cursor-pointer hover:bg-blue-700 transition shadow-lg"
                  >
                    <FaCamera className="text-lg" />
                    <input
                      id="profilePictureInput"
                      type="file"
                      accept="image/*"
                      onChange={handleProfilePictureChange}
                      className="hidden"
                      disabled={uploadingPicture}
                    />
                  </label>
                  {uploadingPicture && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                    </div>
                  )}
                </div>

                {/* Upload Instructions */}
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-800 mb-2">Upload your photo</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Your photo helps others recognize you. Choose a clear image of your face.
                  </p>
                  <ul className="text-xs text-gray-500 space-y-1">
                    <li>• Accepted formats: JPG, PNG</li>
                    <li>• Maximum size: 5MB</li>
                    <li>• Recommended: Square image, at least 400x400px</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Profile Information */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-800">
                  {t('contactInfo')}
                </h2>
                {!editing ? (
                  <button
                    onClick={() => setEditing(true)}
                    className="flex items-center space-x-2 text-primary hover:text-blue-700"
                  >
                    <FaEdit />
                    <span>{t('edit')}</span>
                  </button>
                ) : (
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setEditing(false)}
                      className="flex items-center space-x-2 text-gray-600 hover:text-gray-800"
                    >
                      <FaTimes />
                      <span>{t('cancel')}</span>
                </button>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <FaUser className="inline mr-2" />
                  {t('name')}
                </label>
                {editing ? (
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                ) : (
                  <p className="text-gray-900">{user?.name}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <FaEnvelope className="inline mr-2" />
                  {t('email')}
                </label>
                <p className="text-gray-900">{user?.email}</p>
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <FaPhone className="inline mr-2" />
                  {t('phone')}
                </label>
                {editing ? (
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                ) : (
                  <p className="text-gray-900">{user?.phone || 'Not set'}</p>
                )}
              </div>

              {/* Role */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('role')}
                </label>
                <p className="text-gray-900 capitalize">{t(user?.role)}</p>
              </div>

              {/* Doctor-specific fields */}
              {user?.role === 'doctor' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('specialization')}
                    </label>
                    {editing ? (
                      <input
                        type="text"
                        name="specialization"
                        value={formData.specialization}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    ) : (
                      <p className="text-gray-900">{user?.specialization || 'Not specified'}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('experience')}
                    </label>
                    {editing ? (
                      <input
                        type="number"
                        name="experience"
                        value={formData.experience}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    ) : (
                      <p className="text-gray-900">{user?.experience || 0} years</p>
                    )}
                  </div>
                </>
              )}

              {/* Driver-specific fields */}
              {user?.role === 'driver' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('vehicleType')}
                    </label>
                    {editing ? (
                      <input
                        type="text"
                        name="vehicleType"
                        value={formData.vehicleType}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    ) : (
                      <p className="text-gray-900">{user?.vehicleInfo?.type || 'Not specified'}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('vehicleRegistration')}
                    </label>
                    {editing ? (
                      <input
                        type="text"
                        name="vehicleRegistration"
                        value={formData.vehicleRegistration}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    ) : (
                      <p className="text-gray-900">{user?.vehicleInfo?.registrationNumber || 'Not specified'}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Driving License Number
                    </label>
                    <p className="text-gray-900">{user?.verificationDocuments?.drivingLicense?.number || 'Not set'}</p>
                  </div>
                </>
              )}
            </div>

            {editing && (
              <div className="mt-6">
                <button
                  type="submit"
                  className="flex items-center space-x-2 bg-primary text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
                >
                  <FaSave />
                  <span>{t('save')}</span>
                </button>
              </div>
            )}
          </form>
        </div>

        {/* Document Upload Section (for non-patients) */}
        {user?.role !== 'patient' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-6">
              {t('uploadDocuments')}
            </h2>

            <form onSubmit={handleDocumentUpload} className="space-y-4">
              {/* NID Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('nid')} {user?.verificationDocuments?.nid?.verified && '✅'}
                </label>
                <input
                  type="text"
                  name="nidNumber"
                  value={documents.nidNumber}
                  onChange={handleDocumentChange}
                  placeholder="NID Number"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-2"
                />
                <input
                  type="file"
                  name="nid"
                  onChange={handleDocumentChange}
                  accept="image/*,application/pdf"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              {/* BMDC Upload (Doctors only) */}
              {user?.role === 'doctor' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('bmdcNumber')} {user?.verificationDocuments?.bmdcNumber?.verified && '✅'}
                  </label>
                  <input
                    type="text"
                    name="bmdcNumber"
                    value={documents.bmdcNumber}
                    onChange={handleDocumentChange}
                    placeholder="BMDC Number"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-2"
                  />
                  <input
                    type="file"
                    name="bmdc"
                    onChange={handleDocumentChange}
                    accept="image/*,application/pdf"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              )}

              {/* License Upload (Drivers only) */}
              {user?.role === 'driver' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('drivingLicense')} {user?.verificationDocuments?.drivingLicense?.verified && '✅'}
                  </label>
                  <input
                    type="text"
                    name="licenseNumber"
                    value={documents.licenseNumber}
                    onChange={handleDocumentChange}
                    placeholder="License Number"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-2"
                  />
                  <input
                    type="file"
                    name="license"
                    onChange={handleDocumentChange}
                    accept="image/*,application/pdf"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={uploading}
                className="flex items-center space-x-2 bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition disabled:opacity-50"
              >
                <FaUpload />
                <span>{uploading ? t('loading') : t('uploadDocuments')}</span>
              </button>
            </form>
          </div>
        )}

        {/* Wearable Device Integration - Show for all users */}
        <div className="mt-6">
          <WearableDeviceIntegration />
        </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Profile;
