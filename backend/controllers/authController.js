const { validationResult } = require('express-validator');
const User = require('../models/User');
const { sendTokenResponse } = require('../middleware/auth');

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

  const { name, email, password, phone, role, preferredLanguage, drivingLicenseNumber } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Validate role - allow patient registration
    const allowedRoles = ['patient', 'doctor', 'volunteer', 'driver'];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Allowed roles: patient, doctor, volunteer, driver'
      });
    }

    // Prepare user data
    const userData = {
      name,
      email,
      password,
      phone,
      role: role || 'patient',
      preferredLanguage: preferredLanguage || 'en',
      authProvider: 'local'
    };
    // If driver, add driving license number
    if (role === 'driver' && drivingLicenseNumber) {
      userData.verificationDocuments = {
        drivingLicense: { number: drivingLicenseNumber }
      };
    }
    // Create user
    const user = await User.create(userData);

    console.log('✅ User registered successfully:', user.email, 'Role:', user.role);

    // Send token response
    sendTokenResponse(user, 201, res);

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Error registering user',
      error: error.message
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { email, password } = req.body;

    // Check if user exists and get password
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account has been deactivated'
      });
    }

    // Check if user registered with Google
    if (user.authProvider === 'google') {
      return res.status(400).json({
        success: false,
        message: 'Please use Google Sign-In to login'
      });
    }

    // Verify password
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Send token response
    sendTokenResponse(user, 200, res);

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Error logging in',
      error: error.message
    });
  }
};

// @desc    Google OAuth authentication
// @route   GET /api/auth/google
// @access  Public
exports.googleAuth = (req, res, next) => {
  const passport = require('passport');
  console.log('🔐 Google OAuth initiated');
  console.log('Google Client ID:', process.env.GOOGLE_CLIENT_ID ? 'Set' : 'Missing');
  console.log('Callback URL:', process.env.GOOGLE_CALLBACK_URL);
  
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return res.status(500).json({
      success: false,
      message: 'Google OAuth not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in environment variables.'
    });
  }
  
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false
  })(req, res, next);
};

// @desc    Google OAuth callback
// @route   GET /api/auth/google/callback
// @access  Public
exports.googleAuthCallback = (req, res, next) => {
  const passport = require('passport');
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
  
  console.log('🔐 Google OAuth callback received');
  console.log('Client URL:', clientUrl);
  console.log('Callback URL:', process.env.GOOGLE_CALLBACK_URL);
  
  passport.authenticate('google', { 
    session: false,
    failureRedirect: `${clientUrl}/login?error=google_auth_failed`
  }, (err, user, info) => {
    if (err) {
      console.error('❌ Google OAuth error:', err);
      return res.redirect(`${clientUrl}/login?error=${encodeURIComponent(err.message)}`);
    }
    
    if (!user) {
      const message = info?.message || 'Authentication failed';
      console.error('❌ Google OAuth failed - no user:', message);
      return res.redirect(`${clientUrl}/login?error=${encodeURIComponent(message)}`);
    }
    
    // Generate token
    const { generateToken } = require('../middleware/auth');
    const token = generateToken(user._id);
    
    console.log('✅ Google OAuth successful for user:', user.email);
    
    // Redirect to frontend with token
    res.redirect(`${clientUrl}/auth/callback?token=${token}`);
    
  })(req, res, next);
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    res.status(200).json({
      success: true,
      data: user.getPublicProfile()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching user data',
      error: error.message
    });
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
exports.updateProfile = async (req, res) => {
  try {
    const fieldsToUpdate = {
      name: req.body.name,
      phone: req.body.phone,
      preferredLanguage: req.body.preferredLanguage,
      specialization: req.body.specialization,
      experience: req.body.experience,
      availability: req.body.availability,
      vehicleInfo: req.body.vehicleInfo
    };

    // Remove undefined fields
    Object.keys(fieldsToUpdate).forEach(key => 
      fieldsToUpdate[key] === undefined && delete fieldsToUpdate[key]
    );

    const user = await User.findByIdAndUpdate(
      req.user._id,
      fieldsToUpdate,
      {
        new: true,
        runValidators: true
      }
    );

    res.status(200).json({
      success: true,
      data: user.getPublicProfile()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating profile',
      error: error.message
    });
  }
};

// @desc    Update user location
// @route   PUT /api/auth/location
// @access  Private
exports.updateLocation = async (req, res) => {
  try {
    const { longitude, latitude, address, district, division } = req.body;

    if (!longitude || !latitude) {
      return res.status(400).json({
        success: false,
        message: 'Longitude and latitude are required'
      });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        location: {
          type: 'Point',
          coordinates: [parseFloat(longitude), parseFloat(latitude)],
          address,
          district,
          division
        }
      },
      {
        new: true,
        runValidators: true
      }
    );

    res.status(200).json({
      success: true,
      data: user.getPublicProfile()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating location',
      error: error.message
    });
  }
};

// @desc    Upload profile picture
// @route   POST /api/auth/profile-picture
// @access  Private
exports.uploadProfilePicture = async (req, res) => {
  try {
    console.log('📸 Profile picture upload request');
    console.log('User ID:', req.user?.id || req.user?._id);
    console.log('File:', req.file);

    if (!req.file) {
      console.error('❌ No file uploaded');
      return res.status(400).json({
        success: false,
        message: 'Please upload a profile picture'
      });
    }

    const userId = req.user?.id || req.user?._id;
    
    // Construct proper URL path for the profile picture
    const profilePictureUrl = `/uploads/profiles/${req.file.filename}`;
    console.log('Profile picture URL:', profilePictureUrl);

    // Update user's profile picture path
    const user = await User.findByIdAndUpdate(
      userId,
      { profilePicture: profilePictureUrl },
      { new: true, runValidators: true }
    );

    if (!user) {
      console.error('❌ User not found');
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    console.log('✅ Profile picture uploaded successfully');
    res.status(200).json({
      success: true,
      message: 'Profile picture uploaded successfully',
      data: user.getPublicProfile()
    });
  } catch (error) {
    console.error('❌ Profile picture upload error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Error uploading profile picture',
      error: error.message
    });
  }
};
