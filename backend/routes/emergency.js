const express = require('express');
const router = express.Router();
const {
  createEmergencyRequest,
  getMyEmergencyRequests,
  getAssignedEmergencies,
  updateEmergencyStatus,
  getAllEmergencies,
  getEmergencyById,
  deleteEmergencyRequest,
  log999Call
} = require('../controllers/emergencyController');
const { protect, authorize } = require('../middleware/auth');

// Patient routes
router.post('/', protect, createEmergencyRequest);
router.post('/999-call', protect, log999Call);
router.get('/my-requests', protect, getMyEmergencyRequests);

// Helper routes (doctor, volunteer, driver)
router.get('/assigned', protect, authorize('doctor', 'volunteer', 'driver'), getAssignedEmergencies);

// Get single emergency by ID (accessible to anyone authenticated)
router.get('/:id', protect, getEmergencyById);

// Update status
router.put('/:id/status', protect, updateEmergencyStatus);

// Delete emergency
router.delete('/:id', protect, deleteEmergencyRequest);

// Admin routes
router.get('/all', protect, authorize('admin'), getAllEmergencies);

module.exports = router;
