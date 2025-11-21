const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');
const {
  uploadMedicalFile,
  getMyMedicalRecords,
  getMedicalRecordById,
  createMedicalRecord,
  updateMedicalRecord,
  deleteMedicalFile
} = require('../controllers/medicalRecordController');

// @route   POST /api/medical-records
// @desc    Create or update medical record information
// @access  Private
router.post('/', protect, createMedicalRecord);

// @route   PUT /api/medical-records/:id
// @desc    Update medical record
// @access  Private
router.put('/:id', protect, updateMedicalRecord);

// @route   POST /api/medical-records/upload
// @desc    Upload a medical file
// @access  Private
router.post('/upload', protect, upload.single('file'), uploadMedicalFile);

// @route   GET /api/medical-records/my-records
// @desc    Get all medical records for logged-in user
// @access  Private
router.get('/my-records', protect, getMyMedicalRecords);

// @route   GET /api/medical-records/user/:userId
// @desc    Get medical records for a specific user (for doctors)
// @access  Private
router.get('/user/:userId', protect, getMyMedicalRecords);

// @route   GET /api/medical-records/:id
// @desc    Get a specific medical record
// @access  Private
router.get('/:id', protect, getMedicalRecordById);

// @route   DELETE /api/medical-records/:id/file/:fileId
// @desc    Delete a medical file
// @access  Private
router.delete('/:id/file/:fileId', protect, deleteMedicalFile);

module.exports = router;
