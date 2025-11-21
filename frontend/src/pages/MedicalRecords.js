import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FaFileUpload, FaDownload, FaEye, FaFilePdf, FaFileImage, FaFileAlt, FaTrash } from 'react-icons/fa';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';

const MedicalRecords = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileType, setFileType] = useState('test_result');
  const [description, setDescription] = useState('');
  const [editingRecord, setEditingRecord] = useState(null);
  
  // New form fields
  const [formData, setFormData] = useState({
    title: '',
    diagnosis: '',
    medications: '',
    allergies: '',
    bloodType: '',
    chronicConditions: '',
    notes: ''
  });

  useEffect(() => {
    fetchMedicalRecords();
  }, []);

  const fetchMedicalRecords = async () => {
    try {
      // Get medical files for display
      const filesResponse = await api.get('/medical-records/my-records');
      const fetchedFiles = filesResponse.data.data || [];
      setRecords(fetchedFiles);
      
      // Get actual medical record info if files exist
      if (fetchedFiles.length > 0 && fetchedFiles[0].recordId) {
        try {
          const recordResponse = await api.get(`/medical-records/${fetchedFiles[0].recordId}`);
          const fullRecord = recordResponse.data.data;
          
          setEditingRecord(fullRecord);
          setFormData({
            title: fullRecord.title || '',
            diagnosis: fullRecord.diagnosis?.primary || fullRecord.diagnosis || '',
            medications: Array.isArray(fullRecord.medications) ? fullRecord.medications.join(', ') : fullRecord.medications || '',
            allergies: Array.isArray(fullRecord.allergies) ? fullRecord.allergies.join(', ') : fullRecord.allergies || '',
            bloodType: fullRecord.bloodType || '',
            chronicConditions: fullRecord.chronicConditions || '',
            notes: fullRecord.notes || ''
          });
        } catch (recordError) {
          console.error('Error fetching full record:', recordError);
          // If we can't get full record, just show empty form
        }
      }
    } catch (error) {
      console.error('Error fetching medical records:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSaveMedicalInfo = async (e) => {
    e.preventDefault();
    console.log('📝 Saving medical information...');
    console.log('Form Data:', formData);
    console.log('Editing Record:', editingRecord);
    
    setUploading(true);
    
    try {
      const dataToSend = {
        ...formData,
        medications: formData.medications ? formData.medications.split(',').map(m => m.trim()).filter(m => m) : [],
        allergies: formData.allergies ? formData.allergies.split(',').map(a => a.trim()).filter(a => a) : []
      };

      console.log('Data to send:', dataToSend);

      let response;
      if (editingRecord && editingRecord._id) {
        // Update existing record
        console.log('Updating record:', editingRecord._id);
        response = await api.put(`/medical-records/${editingRecord._id}`, dataToSend);
        console.log('Update response:', response.data);
        alert('Medical information updated successfully!');
      } else {
        // Create new record
        console.log('Creating new record');
        response = await api.post('/medical-records', dataToSend);
        console.log('Create response:', response.data);
        alert('Medical information saved successfully!');
      }
      
      await fetchMedicalRecords();
    } catch (error) {
      console.error('❌ Error saving medical info:', error);
      console.error('Error response:', error.response);
      const errorMessage = error.response?.data?.message || error.message || 'Unknown error';
      alert('Failed to save medical information: ' + errorMessage);
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = (e) => {
    setSelectedFile(e.target.files[0]);
  };

  const handleDelete = async (recordId, fileId) => {
    if (!window.confirm(t('confirmDelete') || 'Are you sure you want to delete this file?')) {
      return;
    }

    setDeleting(fileId);
    try {
      console.log(`🗑️ Deleting file: recordId=${recordId}, fileId=${fileId}`);
      await api.delete(`/medical-records/${recordId}/file/${fileId}`);
      
      console.log('✅ File deleted successfully');
      alert(t('deleteSuccess') || 'File deleted successfully!');
      fetchMedicalRecords();
    } catch (error) {
      console.error('❌ Delete error:', error);
      console.error('Error response:', error.response?.data);
      const errorMsg = error.response?.data?.message || error.message || 'Delete failed';
      alert(`${t('deleteFailed') || 'Delete failed'}: ${errorMsg}`);
    } finally {
      setDeleting(null);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      alert('Please select a file first');
      return;
    }

    console.log('📤 Uploading file:', selectedFile.name);
    setUploading(true);
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('type', fileType);
    formData.append('description', description);

    try {
      console.log('Sending request to: /medical-records/upload');
      const response = await api.post(
        '/medical-records/upload', 
        formData, 
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      
      console.log('✅ Upload successful:', response.data);
      alert(t('uploadComplete') || 'File uploaded successfully!');
      setSelectedFile(null);
      setDescription('');
      document.querySelector('input[type="file"]').value = '';
      fetchMedicalRecords();
    } catch (error) {
      console.error('❌ Upload error:', error);
      console.error('Error response:', error.response?.data);
      const errorMsg = error.response?.data?.message || error.message || 'Upload failed';
      alert(`${t('uploadFailed') || 'Upload failed'}: ${errorMsg}`);
    } finally {
      setUploading(false);
    }
  };

  const getFileIcon = (type) => {
    switch (type) {
      case 'xray':
      case 'scan':
        return <FaFileImage className="text-blue-500" />;
      case 'prescription':
        return <FaFilePdf className="text-red-500" />;
      default:
        return <FaFileAlt className="text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">{t('medicalRecords')}</h1>

      {/* Medical Information Form */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <FaFileAlt />
          {editingRecord ? 'Update Medical Information' : 'Add Medical Information'}
        </h2>
        
        <form onSubmit={handleSaveMedicalInfo} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Title / Record Name *
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
                placeholder="e.g., Annual Checkup 2024"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Blood Type
              </label>
              <select
                name="bloodType"
                value={formData.bloodType}
                onChange={handleInputChange}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
              >
                <option value="">Select Blood Type</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Diagnosis / Medical Condition
            </label>
            <textarea
              name="diagnosis"
              value={formData.diagnosis}
              onChange={handleInputChange}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
              rows="3"
              placeholder="Enter diagnosis or medical condition"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Current Medications (separate with commas)
            </label>
            <textarea
              name="medications"
              value={formData.medications}
              onChange={handleInputChange}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
              rows="2"
              placeholder="e.g., Aspirin 100mg daily, Metformin 500mg twice daily"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Allergies (separate with commas)
            </label>
            <textarea
              name="allergies"
              value={formData.allergies}
              onChange={handleInputChange}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
              rows="2"
              placeholder="e.g., Penicillin, Peanuts, Latex"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Chronic Conditions
            </label>
            <textarea
              name="chronicConditions"
              value={formData.chronicConditions}
              onChange={handleInputChange}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
              rows="2"
              placeholder="e.g., Diabetes Type 2, Hypertension, Asthma"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Additional Notes
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
              rows="3"
              placeholder="Any additional medical information, surgery history, family history, etc."
            />
          </div>

          <button
            type="submit"
            disabled={uploading}
            className={`w-full ${
              uploading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-700'
            } text-white py-3 rounded-lg font-semibold transition-all`}
          >
            {uploading ? 'Saving...' : (editingRecord ? 'Update Medical Information' : 'Save Medical Information')}
          </button>
        </form>
      </div>

      {/* Upload Document Section */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <FaFileUpload />
          {t('uploadMedicalFile')}
        </h2>
        
        <form onSubmit={handleUpload} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('fileType')}
            </label>
            <select
              value={fileType}
              onChange={(e) => setFileType(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
            >
              <option value="test_result">{t('testResults')}</option>
              <option value="xray">{t('xrays')}</option>
              <option value="scan">{t('scans')}</option>
              <option value="prescription">{t('prescriptions')}</option>
              <option value="report">{t('reports')}</option>
              <option value="other">{t('other')}</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('description')} ({t('optional')})
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
              rows="3"
              placeholder={t('enterValue')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('chooseFile')}
            </label>
            <input
              type="file"
              onChange={handleFileSelect}
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
              required
            />
            {selectedFile && (
              <p className="text-sm text-gray-600 mt-2">
                {selectedFile.name}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={!selectedFile || uploading}
            className={`w-full ${
              uploading || !selectedFile
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-500 hover:bg-blue-600'
            } text-white py-3 rounded-lg font-semibold transition-all`}
          >
            {uploading ? t('uploading') : t('upload')}
          </button>
        </form>
      </div>

      {/* Records List */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">{t('viewMedicalFiles')}</h2>
        
        {records.length === 0 ? (
          <p className="text-gray-500 text-center py-8">{t('noDataFound')}</p>
        ) : (
          <div className="space-y-3">
            {records.map((record, idx) => {
              const fileUrl = `${process.env.REACT_APP_API_URL.replace('/api', '')}${record.fileUrl}`;
              
              return (
                <div
                  key={record._id || idx}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="text-2xl">
                        {getFileIcon(record.type)}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-800">
                          {record.fileName || `${t(record.type)} - ${new Date(record.uploadedAt).toLocaleDateString()}`}
                        </h3>
                        {record.description && typeof record.description === 'string' && record.description.trim() && (
                          <p className="text-sm text-gray-600">{record.description}</p>
                        )}
                        <p className="text-xs text-gray-500">
                          {t('uploaded')}: {new Date(record.uploadedAt).toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-400">
                          Type: {record.type}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <a
                        href={fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-all flex items-center gap-2"
                      >
                        <FaEye />
                        {t('view')}
                      </a>
                      <a
                        href={fileUrl}
                        download={record.fileName}
                        className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-all flex items-center gap-2"
                      >
                        <FaDownload />
                        {t('download')}
                      </a>
                      <button
                        onClick={() => handleDelete(record.recordId, record._id)}
                        disabled={deleting === record._id}
                        className={`${
                          deleting === record._id
                            ? 'bg-gray-400 cursor-not-allowed'
                            : 'bg-red-500 hover:bg-red-600'
                        } text-white px-4 py-2 rounded-lg transition-all flex items-center gap-2`}
                      >
                        <FaTrash />
                        {deleting === record._id ? t('deleting') || 'Deleting...' : t('delete')}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default MedicalRecords;
