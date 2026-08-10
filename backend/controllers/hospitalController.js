const Hospital = require('../models/Hospital');

// Get nearby hospitals
exports.getNearbyHospitals = async (req, res) => {
  try {
    const { latitude, longitude, maxDistance = 50000, specialty } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required'
      });
    }

    console.log('🔍 Searching hospitals:', {
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      maxDistance: parseInt(maxDistance),
      specialty
    });

    const filters = {};
    if (specialty) {
      filters.specialties = specialty;
    }

    const hospitals = await Hospital.findNearby(
      parseFloat(longitude),
      parseFloat(latitude),
      parseInt(maxDistance),
      filters
    );

    console.log(`✅ Found ${hospitals.length} hospitals`);

    // Calculate distance for each hospital
    const hospitalsWithDistance = hospitals.map(hospital => {
      const [hospLng, hospLat] = hospital.location.coordinates;
      const distance = calculateDistance(
        parseFloat(latitude),
        parseFloat(longitude),
        hospLat,
        hospLng
      );

      return {
        ...hospital.toObject(),
        distance: parseFloat(distance.toFixed(2))
      };
    });

    // Sort by distance
    hospitalsWithDistance.sort((a, b) => a.distance - b.distance);

    res.status(200).json({
      success: true,
      count: hospitalsWithDistance.length,
      data: hospitalsWithDistance
    });
  } catch (error) {
    console.error('Get nearby hospitals error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch nearby hospitals',
      error: error.message
    });
  }
};

// Get hospital by ID
exports.getHospitalById = async (req, res) => {
  try {
    const hospital = await Hospital.findById(req.params.id);

    if (!hospital) {
      return res.status(404).json({
        success: false,
        message: 'Hospital not found'
      });
    }

    res.status(200).json({
      success: true,
      data: hospital
    });
  } catch (error) {
    console.error('Get hospital by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch hospital',
      error: error.message
    });
  }
};

// Get all hospitals (with filters)
exports.getAllHospitals = async (req, res) => {
  try {
    const { specialty, hospitalType, hasAmbulance, minBeds } = req.query;

    const query = { isActive: true, isVerified: true };

    if (specialty) {
      query.specialties = specialty;
    }
    if (hospitalType) {
      query.hospitalType = hospitalType;
    }
    if (hasAmbulance === 'true') {
      query['facilities.hasAmbulance'] = true;
    }
    if (minBeds) {
      query['facilities.availableBeds'] = { $gte: parseInt(minBeds) };
    }

    const hospitals = await Hospital.find(query);

    res.status(200).json({
      success: true,
      count: hospitals.length,
      data: hospitals
    });
  } catch (error) {
    console.error('Get all hospitals error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch hospitals',
      error: error.message
    });
  }
};

// Create hospital (admin only)
exports.createHospital = async (req, res) => {
  try {
    const hospital = await Hospital.create(req.body);

    res.status(201).json({
      success: true,
      data: hospital
    });
  } catch (error) {
    console.error('Create hospital error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create hospital',
      error: error.message
    });
  }
};

// Update hospital (admin only)
exports.updateHospital = async (req, res) => {
  try {
    const hospital = await Hospital.findByIdAndUpdate(
      req.params.id,
      { ...req.body, lastUpdated: Date.now() },
      { new: true, runValidators: true }
    );

    if (!hospital) {
      return res.status(404).json({
        success: false,
        message: 'Hospital not found'
      });
    }

    res.status(200).json({
      success: true,
      data: hospital
    });
  } catch (error) {
    console.error('Update hospital error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update hospital',
      error: error.message
    });
  }
};

// Update bed availability
exports.updateBedAvailability = async (req, res) => {
  try {
    const { type, count } = req.body;
    const hospital = await Hospital.findById(req.params.id);

    if (!hospital) {
      return res.status(404).json({
        success: false,
        message: 'Hospital not found'
      });
    }

    await hospital.updateBedAvailability(type, count);

    res.status(200).json({
      success: true,
      data: hospital
    });
  } catch (error) {
    console.error('Update bed availability error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update bed availability',
      error: error.message
    });
  }
};

// Delete hospital (admin only)
exports.deleteHospital = async (req, res) => {
  try {
    const hospital = await Hospital.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!hospital) {
      return res.status(404).json({
        success: false,
        message: 'Hospital not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Hospital deactivated successfully'
    });
  } catch (error) {
    console.error('Delete hospital error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete hospital',
      error: error.message
    });
  }
};

// Helper function to calculate distance
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

module.exports = exports;
