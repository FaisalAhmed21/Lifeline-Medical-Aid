const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  // Basic Information
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: function() {
      return this.authProvider === 'local';
    },
    minlength: 6,
    select: false
  },
  phone: {
    type: String,
    trim: true
  },
  bkashNumber: {
    type: String,
    trim: true,
    match: [/^01\d{9}$/, 'Please provide a valid bKash number (11 digits starting with 01)']
  },
  
  // Role Management
  role: {
    type: String,
    enum: ['patient', 'doctor', 'volunteer', 'driver', 'admin'],
    required: [true, 'Role is required']
  },
  
  // Authentication Provider
  authProvider: {
    type: String,
    enum: ['local', 'google', 'both'],
    default: 'local'
  },
  googleId: {
    type: String,
    sparse: true,
    unique: true
  },
  
  // Profile Verification
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationDocuments: {
    // National ID for all users
    nid: {
      number: { type: String },
      imageUrl: { type: String },
      verified: { type: Boolean, default: false }
    },
    // BMDC number for doctors
    bmdcNumber: {
      number: { type: String },
      imageUrl: { type: String },
      verified: { type: Boolean, default: false }
    },
    // Driving license for drivers
    drivingLicense: {
      number: { type: String },
      imageUrl: { type: String },
      verified: { type: Boolean, default: false }
    }
  },
  
  // Geolocation
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      default: [0, 0]
    },
    address: {
      type: String,
      trim: true
    },
    district: {
      type: String,
      trim: true
    },
    division: {
      type: String,
      trim: true
    }
  },
  
  // Language Preference
  preferredLanguage: {
    type: String,
    enum: ['en', 'bn'],
    default: 'en'
  },
  
  // Profile Picture
  profilePicture: {
    type: String,
    default: ''
  },
  
  // Additional Info for Different Roles
  specialization: {
    type: String, // For doctors
    trim: true
  },
  experience: {
    type: Number, // For doctors (years of experience)
  },
  prescriptionFee: {
    type: Number, // For doctors - fee per detailed prescription
    default: 50,
    min: 0
  },
  availability: {
    type: Boolean,
    default: true // For doctors, volunteers, and drivers
  },
  
  // Availability Schedule (for doctors, volunteers, drivers)
  schedule: {
    isOnDuty: {
      type: Boolean,
      default: false
    },
    workingHours: {
      monday: { available: { type: Boolean, default: false }, start: String, end: String },
      tuesday: { available: { type: Boolean, default: false }, start: String, end: String },
      wednesday: { available: { type: Boolean, default: false }, start: String, end: String },
      thursday: { available: { type: Boolean, default: false }, start: String, end: String },
      friday: { available: { type: Boolean, default: false }, start: String, end: String },
      saturday: { available: { type: Boolean, default: false }, start: String, end: String },
      sunday: { available: { type: Boolean, default: false }, start: String, end: String }
    },
    unavailableDates: [{
      date: Date,
      reason: String
    }],
    lastStatusChange: {
      type: Date,
      default: Date.now
    }
  },
  
  // Skills (for volunteers and doctors)
  skills: [{
    type: String,
    enum: [
      'First Aid',
      'CPR Certified',
      'Paramedic Training',
      'Emergency Response',
      'Patient Transport',
      'Medical Equipment Operation',
      'Trauma Care',
      'Pediatric Care',
      'Geriatric Care',
      'Mental Health Support',
      'Multilingual',
      'Driver License',
      'Ambulance Driver',
      'Search and Rescue',
      'Disaster Management'
    ]
  }],
  
  // Current workload (for assignment optimization)
  currentLoad: {
    activeEmergencies: {
      type: Number,
      default: 0
    },
    maxConcurrent: {
      type: Number,
      default: 3 // Maximum concurrent emergencies
    }
  },
  
  // Vehicle Information (for drivers)
  vehicleInfo: {
    type: {
      type: String, // ambulance, private car, bike, etc.
    },
    registrationNumber: String,
    model: String
  },
  
  // Rating System (for volunteers and drivers)
  rating: {
    average: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    count: {
      type: Number,
      default: 0
    }
  },
  
  // Account Status
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Push Notification Tokens
  fcmTokens: [{
    type: String
  }],
  
  // Notification Preferences
  notificationPreferences: {
    pushEnabled: {
      type: Boolean,
      default: true
    },
    emailEnabled: {
      type: Boolean,
      default: true
    },
    smsEnabled: {
      type: Boolean,
      default: false
    }
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Index for geospatial queries
userSchema.index({ location: '2dsphere' });

// Index for efficient queries
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ isVerified: 1 });

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password') || !this.password) {
    return next();
  }
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Update timestamp on save
userSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error(error);
  }
};

// Get public profile
userSchema.methods.getPublicProfile = function() {
  const user = this.toObject();
  delete user.password;
  delete user.googleId;
  return user;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
