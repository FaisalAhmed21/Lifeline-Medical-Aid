const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const passport = require('passport');
const {
  register,
  login,
  googleAuth,
  googleAuthCallback,
  getCurrentUser,
  updateProfile,
  updateLocation,
  uploadProfilePicture
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');

// Validation middleware
const registerValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password')
    .if(body('role').not().equals('patient'))
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').isIn(['patient', 'doctor', 'volunteer', 'driver', 'admin']).withMessage('Invalid role')
];

const loginValidation = [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required')
];

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', registerValidation, register);

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', loginValidation, login);

// @route   GET /api/auth/google
// @desc    Google OAuth (patients only)
// @access  Public
router.get('/google', googleAuth);

// @route   GET /api/auth/google/callback
// @desc    Google OAuth callback
// @access  Public
router.get('/google/callback', googleAuthCallback);

// @route   GET /api/auth/me
// @desc    Get current logged in user
// @access  Private
router.get('/me', protect, getCurrentUser);

// @route   PUT /api/auth/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', protect, updateProfile);

// @route   PUT /api/auth/location
// @desc    Update user location
// @access  Private
router.put('/location', protect, updateLocation);

// @route   POST /api/auth/profile-picture
// @desc    Upload profile picture
// @access  Private
router.post('/profile-picture', protect, upload.single('profilePicture'), uploadProfilePicture);

module.exports = router;
