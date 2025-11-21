const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  verifyDocument,
  getNearbyUsers,
  uploadDocuments,
  toggleDutyStatus,
  updateSchedule,
  addUnavailableDate,
  getSchedule,
  saveVitalSigns,
  getVitalSigns
} = require('../controllers/userController');
const upload = require('../middleware/upload');

// @route   GET /api/users
// @desc    Get all users (with filters)
// @access  Private (Admin only)
router.get('/', protect, authorize('admin'), getAllUsers);

// @route   GET /api/users/nearby
// @desc    Get nearby users (doctors, volunteers, drivers)
// @access  Private
router.get('/nearby', protect, getNearbyUsers);

// @route   PUT /api/users/duty-status
// @desc    Toggle on/off duty status
// @access  Private (Doctor, Volunteer, Driver)
router.put('/duty-status', protect, authorize('doctor', 'volunteer', 'driver'), toggleDutyStatus);

// @route   GET /api/users/schedule
// @desc    Get user's schedule
// @access  Private
router.get('/schedule', protect, getSchedule);

// @route   PUT /api/users/schedule
// @desc    Update working hours schedule
// @access  Private (Doctor, Volunteer, Driver)
router.put('/schedule', protect, authorize('doctor', 'volunteer', 'driver'), updateSchedule);

// @route   POST /api/users/unavailable-dates
// @desc    Add unavailable date
// @access  Private (Doctor, Volunteer, Driver)
router.post('/unavailable-dates', protect, authorize('doctor', 'volunteer', 'driver'), addUnavailableDate);

// @route   POST /api/users/vital-signs
// @desc    Save vital signs from wearable devices
// @access  Private
router.post('/vital-signs', protect, saveVitalSigns);

// @route   GET /api/users/vital-signs
// @desc    Get user's vital signs history
// @access  Private
router.get('/vital-signs', protect, getVitalSigns);

// @route   GET /api/users/:id
// @desc    Get user by ID
// @access  Private
router.get('/:id', protect, getUserById);

// @route   PUT /api/users/:id
// @desc    Update user
// @access  Private (Admin or own profile)
router.put('/:id', protect, updateUser);

// @route   DELETE /api/users/:id
// @desc    Delete user
// @access  Private (Admin only)
router.delete('/:id', protect, authorize('admin'), deleteUser);

// @route   POST /api/users/upload-documents
// @desc    Upload verification documents
// @access  Private
router.post('/upload-documents', protect, upload.fields([
  { name: 'nid', maxCount: 1 },
  { name: 'bmdc', maxCount: 1 },
  { name: 'license', maxCount: 1 }
]), uploadDocuments);

// @route   PUT /api/users/:id/verify
// @desc    Verify user documents
// @access  Private (Admin only)
router.put('/:id/verify', protect, authorize('admin'), verifyDocument);

module.exports = router;
