const express = require('express');
const router = express.Router();
const {
  getNearbyHospitals,
  getHospitalById,
  getAllHospitals,
  createHospital,
  updateHospital,
  updateBedAvailability,
  deleteHospital
} = require('../controllers/hospitalController');
const { protect, authorize } = require('../middleware/auth');

// Public routes
router.get('/nearby', getNearbyHospitals);
router.get('/', getAllHospitals);
router.get('/:id', getHospitalById);

// Protected routes - Admin only
router.post('/', protect, authorize('admin'), createHospital);
router.put('/:id', protect, authorize('admin'), updateHospital);
router.put('/:id/beds', protect, authorize('admin'), updateBedAvailability);
router.delete('/:id', protect, authorize('admin'), deleteHospital);

module.exports = router;
