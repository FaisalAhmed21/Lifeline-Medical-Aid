const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect } = require('../middleware/auth');

// Debug endpoint to check doctor availability
// @route   GET /api/debug/check-doctor/:doctorId
// @access  Private (Admin or the doctor themselves)
router.get('/check-doctor/:doctorId', protect, async (req, res) => {
  try {
    const doctorId = req.params.doctorId;
    const doctor = await User.findById(doctorId);

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }

    if (doctor.role !== 'doctor') {
      return res.status(400).json({
        success: false,
        message: 'User is not a doctor'
      });
    }

    // Check all criteria
    const checks = {
      isActive: doctor.isActive,
      isVerified: doctor.isVerified,
      availability: doctor.availability,
      isOnDuty: doctor.schedule?.isOnDuty || false,
      location: {
        coordinates: doctor.location?.coordinates || [0, 0],
        isValid: !(doctor.location?.coordinates[0] === 0 && doctor.location?.coordinates[1] === 0),
        type: doctor.location?.type
      },
      workload: {
        active: doctor.currentLoad?.activeEmergencies || 0,
        max: doctor.currentLoad?.maxConcurrent || 3,
        hasCapacity: (doctor.currentLoad?.activeEmergencies || 0) < (doctor.currentLoad?.maxConcurrent || 3)
      },
      unavailableDates: doctor.schedule?.unavailableDates || []
    };

    // Check if today is unavailable
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isUnavailableToday = checks.unavailableDates.some(unavailableDate => {
      const unavailable = new Date(unavailableDate.date);
      unavailable.setHours(0, 0, 0, 0);
      return unavailable.getTime() === today.getTime();
    });

    const allChecksPass = 
      checks.isActive &&
      checks.isVerified &&
      checks.availability &&
      checks.isOnDuty &&
      checks.location.isValid &&
      checks.workload.hasCapacity &&
      !isUnavailableToday;

    res.json({
      success: true,
      doctor: {
        name: doctor.name,
        email: doctor.email,
        role: doctor.role
      },
      checks,
      isUnavailableToday,
      allChecksPass,
      message: allChecksPass 
        ? '✅ Doctor meets all criteria for assignment'
        : '❌ Doctor does NOT meet all criteria. See checks above.'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Debug endpoint to check all helpers status
// @route   GET /api/debug/check-helpers?role=doctor
// @access  Private
router.get('/check-helpers', protect, async (req, res) => {
  try {
    const { role = 'doctor' } = req.query;
    const { latitude, longitude } = req.query;
    
    const helpers = await User.find({ role, isActive: true })
      .select('name email role isActive isVerified availability schedule location.coordinates currentLoad');
    
    const helpersWithStatus = helpers.map(helper => {
      const coords = helper.location?.coordinates || [0, 0];
      const hasValidLocation = !(coords[0] === 0 && coords[1] === 0);
      const isOnDuty = helper.schedule?.isOnDuty || false;
      const activeEmergencies = helper.currentLoad?.activeEmergencies || 0;
      const maxConcurrent = helper.currentLoad?.maxConcurrent || 3;
      const hasCapacity = activeEmergencies < maxConcurrent;
      
      let distance = null;
      if (latitude && longitude && hasValidLocation) {
        const R = 6371; // Earth radius in km
        const dLat = (coords[1] - parseFloat(latitude)) * Math.PI / 180;
        const dLon = (coords[0] - parseFloat(longitude)) * Math.PI / 180;
        const a = 
          Math.sin(dLat/2) * Math.sin(dLat/2) +
          Math.cos(parseFloat(latitude) * Math.PI / 180) * Math.cos(coords[1] * Math.PI / 180) *
          Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        distance = R * c;
      }
      
      return {
        id: helper._id,
        name: helper.name,
        email: helper.email,
        isActive: helper.isActive,
        isVerified: helper.isVerified,
        availability: helper.availability,
        isOnDuty,
        hasValidLocation,
        location: coords,
        distance: distance ? `${distance.toFixed(2)}km` : null,
        workload: `${activeEmergencies}/${maxConcurrent}`,
        hasCapacity,
        eligibleForAssignment: isOnDuty && hasValidLocation && hasCapacity && helper.isActive
      };
    });
    
    res.json({
      success: true,
      role,
      total: helpers.length,
      onDuty: helpersWithStatus.filter(h => h.isOnDuty).length,
      withValidLocation: helpersWithStatus.filter(h => h.hasValidLocation).length,
      eligibleForAssignment: helpersWithStatus.filter(h => h.eligibleForAssignment).length,
      helpers: helpersWithStatus
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Debug endpoint to find all doctors matching criteria
// @route   GET /api/debug/find-doctors?latitude=X&longitude=Y
// @access  Private
router.get('/find-doctors', protect, async (req, res) => {
  try {
    const { latitude, longitude, maxDistance = 50000 } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required'
      });
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    // Find all doctors
    const allDoctors = await User.find({ role: 'doctor' });

    // Find doctors matching assignment criteria
    const matchingDoctors = await User.find({
      role: 'doctor',
      isActive: true,
      isVerified: true,
      availability: true,
      'schedule.isOnDuty': true,
      'location.coordinates': { $ne: [0, 0] },
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [lng, lat]
          },
          $maxDistance: parseFloat(maxDistance)
        }
      }
    });

    res.json({
      success: true,
      searchLocation: { latitude: lat, longitude: lng },
      maxDistance: `${maxDistance / 1000}km`,
      totalDoctors: allDoctors.length,
      matchingDoctors: matchingDoctors.length,
      allDoctors: allDoctors.map(d => ({
        name: d.name,
        email: d.email,
        isActive: d.isActive,
        isVerified: d.isVerified,
        availability: d.availability,
        isOnDuty: d.schedule?.isOnDuty,
        location: d.location?.coordinates,
        workload: `${d.currentLoad?.activeEmergencies || 0}/${d.currentLoad?.maxConcurrent || 3}`
      })),
      matchingDoctorsDetails: matchingDoctors.map(d => ({
        name: d.name,
        email: d.email,
        location: d.location?.coordinates,
        distance: 'calculated by MongoDB'
      }))
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;

