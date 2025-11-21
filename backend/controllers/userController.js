const User = require('../models/User');

// @desc    Get all users with filters
// @route   GET /api/users
// @access  Private (Admin only)
exports.getAllUsers = async (req, res) => {
  try {
    const { role, isVerified, isActive, page = 1, limit = 10 } = req.query;
    
    // Build query
    const query = {};
    if (role) query.role = role;
    if (isVerified !== undefined) query.isVerified = isVerified === 'true';
    if (isActive !== undefined) query.isActive = isActive === 'true';
    
    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const users = await User.find(query)
      .select('-password')
      .limit(parseInt(limit))
      .skip(skip)
      .sort({ createdAt: -1 });
    
    const total = await User.countDocuments(query);
    
    res.status(200).json({
      success: true,
      count: users.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      data: users
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching users',
      error: error.message
    });
  }
};

// @desc    Get nearby users (doctors, volunteers, drivers)
// @route   GET /api/users/nearby
// @access  Private
exports.getNearbyUsers = async (req, res) => {
  try {
    const { longitude, latitude, maxDistance = 10000, role } = req.query; // maxDistance in meters (default 10km)
    
    if (!longitude || !latitude) {
      return res.status(400).json({
        success: false,
        message: 'Longitude and latitude are required'
      });
    }
    
    const query = {
      isActive: true,
      isVerified: true,
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(longitude), parseFloat(latitude)]
          },
          $maxDistance: parseInt(maxDistance)
        }
      }
    };
    
    // Filter by role if provided
    if (role) {
      query.role = role;
    } else {
      // Only show doctors, volunteers, and drivers
      query.role = { $in: ['doctor', 'volunteer', 'driver'] };
    }
    
    const users = await User.find(query)
      .select('-password -googleId')
      .limit(20);
    
    res.status(200).json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching nearby users',
      error: error.message
    });
  }
};

// @desc    Get user by ID
// @route   GET /api/users/:id
// @access  Private
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password -googleId');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching user',
      error: error.message
    });
  }
};

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private (Admin or own profile)
exports.updateUser = async (req, res) => {
  try {
    // Check if user is admin or updating own profile
    if (req.user.role !== 'admin' && req.user._id.toString() !== req.params.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this user'
      });
    }
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    ).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating user',
      error: error.message
    });
  }
};

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private (Admin only)
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting user',
      error: error.message
    });
  }
};

// @desc    Upload verification documents
// @route   POST /api/users/upload-documents
// @access  Private
exports.uploadDocuments = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Update document URLs (files are uploaded via multer middleware)
    if (req.files.nid) {
      user.verificationDocuments.nid = {
        number: req.body.nidNumber,
        imageUrl: req.files.nid[0].path,
        verified: false
      };
    }
    
    if (req.files.bmdc && user.role === 'doctor') {
      user.verificationDocuments.bmdcNumber = {
        number: req.body.bmdcNumber,
        imageUrl: req.files.bmdc[0].path,
        verified: false
      };
    }
    
    if (req.files.license && user.role === 'driver') {
      user.verificationDocuments.drivingLicense = {
        number: req.body.licenseNumber,
        imageUrl: req.files.license[0].path,
        verified: false
      };
    }
    
    await user.save();
    
    res.status(200).json({
      success: true,
      message: 'Documents uploaded successfully. Waiting for admin verification.',
      data: user.getPublicProfile()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error uploading documents',
      error: error.message
    });
  }
};

// @desc    Verify user document
// @route   PUT /api/users/:id/verify
// @access  Private (Admin only)
exports.verifyDocument = async (req, res) => {
  try {
    const { documentType, verified } = req.body; // documentType: 'nid', 'bmdc', 'license'
    
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Update verification status
    if (documentType === 'nid') {
      user.verificationDocuments.nid.verified = verified;
    } else if (documentType === 'bmdc') {
      user.verificationDocuments.bmdcNumber.verified = verified;
    } else if (documentType === 'license') {
      user.verificationDocuments.drivingLicense.verified = verified;
    }
    
    // Check if all required documents are verified
    let allVerified = user.verificationDocuments.nid.verified;
    
    if (user.role === 'doctor') {
      allVerified = allVerified && user.verificationDocuments.bmdcNumber.verified;
    } else if (user.role === 'driver') {
      allVerified = allVerified && user.verificationDocuments.drivingLicense.verified;
    }
    
    user.isVerified = allVerified;
    await user.save();
    
    res.status(200).json({
      success: true,
      message: 'Document verification updated',
      data: user.getPublicProfile()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error verifying document',
      error: error.message
    });
  }
};

// @desc    Toggle on/off duty status
// @route   PUT /api/users/duty-status
// @access  Private (Doctor, Volunteer, Driver)
exports.toggleDutyStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const { isOnDuty } = req.body;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Only doctors, volunteers, and drivers can toggle duty status
    if (!['doctor', 'volunteer', 'driver'].includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Only helpers can toggle duty status'
      });
    }

    user.schedule.isOnDuty = isOnDuty;
    user.schedule.lastStatusChange = new Date();
    await user.save();

    res.status(200).json({
      success: true,
      message: `Status changed to ${isOnDuty ? 'on-duty' : 'off-duty'}`,
      data: {
        isOnDuty: user.schedule.isOnDuty,
        lastStatusChange: user.schedule.lastStatusChange
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating duty status',
      error: error.message
    });
  }
};

// @desc    Update working hours schedule
// @route   PUT /api/users/schedule
// @access  Private (Doctor, Volunteer, Driver)
exports.updateSchedule = async (req, res) => {
  try {
    const userId = req.user.id;
    const { workingHours } = req.body;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (!['doctor', 'volunteer', 'driver'].includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Only helpers can update schedule'
      });
    }

    user.schedule.workingHours = workingHours;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Schedule updated successfully',
      data: user.schedule
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating schedule',
      error: error.message
    });
  }
};

// @desc    Add unavailable date
// @route   POST /api/users/unavailable-dates
// @access  Private (Doctor, Volunteer, Driver)
exports.addUnavailableDate = async (req, res) => {
  try {
    const userId = req.user.id;
    const { date, reason } = req.body;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    user.schedule.unavailableDates.push({ date, reason });
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Unavailable date added',
      data: user.schedule.unavailableDates
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error adding unavailable date',
      error: error.message
    });
  }
};

// @desc    Get user's schedule
// @route   GET /api/users/schedule
// @access  Private
exports.getSchedule = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId).select('schedule');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: user.schedule
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching schedule',
      error: error.message
    });
  }
};

// @desc    Save vital signs from wearable devices
// @route   POST /api/users/vital-signs
// @access  Private
exports.saveVitalSigns = async (req, res) => {
  try {
    const userId = req.user.id;
    const VitalSigns = require('../models/VitalSigns');
    
    const { heartRate, oxygenLevel, temperature, bloodPressure, respiratoryRate, glucoseLevel, deviceName, timestamp } = req.body;
    
    const vitalSigns = await VitalSigns.create({
      user: userId,
      heartRate,
      oxygenLevel,
      temperature,
      bloodPressure,
      respiratoryRate,
      glucoseLevel,
      deviceName,
      source: 'wearable',
      timestamp: timestamp || new Date()
    });
    
    res.status(201).json({
      success: true,
      message: 'Vital signs saved successfully',
      data: vitalSigns
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error saving vital signs',
      error: error.message
    });
  }
};

// @desc    Get user's vital signs history
// @route   GET /api/users/vital-signs
// @access  Private
exports.getVitalSigns = async (req, res) => {
  try {
    const userId = req.user.id;
    const VitalSigns = require('../models/VitalSigns');
    const { limit = 50, startDate, endDate } = req.query;
    
    const query = { user: userId };
    
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }
    
    const vitalSigns = await VitalSigns.find(query)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit));
    
    res.status(200).json({
      success: true,
      count: vitalSigns.length,
      data: vitalSigns
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching vital signs',
      error: error.message
    });
  }
};

