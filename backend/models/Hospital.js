const mongoose = require('mongoose');

const hospitalSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  address: {
    street: String,
    city: String,
    state: String,
    country: String,
    zipCode: String
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      required: true
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true,
      validate: {
        validator: function(v) {
          return v.length === 2;
        },
        message: 'Coordinates must be [longitude, latitude]'
      }
    }
  },
  contact: {
    phone: String,
    emergencyLine: String,
    email: String,
    website: String
  },
  facilities: {
    totalBeds: {
      type: Number,
      default: 0
    },
    availableBeds: {
      type: Number,
      default: 0
    },
    icuBeds: {
      type: Number,
      default: 0
    },
    availableIcuBeds: {
      type: Number,
      default: 0
    },
    emergencyBeds: {
      type: Number,
      default: 0
    },
    availableEmergencyBeds: {
      type: Number,
      default: 0
    },
    hasAmbulance: {
      type: Boolean,
      default: false
    },
    ambulanceCount: {
      type: Number,
      default: 0
    },
    availableAmbulances: {
      type: Number,
      default: 0
    }
  },
  specialties: [{
    type: String,
    enum: [
      'Cardiology',
      'Neurology',
      'Orthopedics',
      'Pediatrics',
      'Oncology',
      'Emergency Medicine',
      'Surgery',
      'Internal Medicine',
      'Obstetrics & Gynecology',
      'Psychiatry',
      'Radiology',
      'Anesthesiology',
      'Dermatology',
      'Ophthalmology',
      'ENT',
      'Urology',
      'Nephrology',
      'Gastroenterology',
      'Pulmonology',
      'Endocrinology',
      'Rheumatology',
      'Infectious Disease',
      'Critical Care',
      'Trauma Care',
      'Burn Unit',
      'Dialysis',
      'Blood Bank',
      'Laboratory',
      'Pharmacy'
    ]
  }],
  services: [{
    type: String
  }],
  doctorCount: {
    type: Number,
    default: 0
  },
  nurseCount: {
    type: Number,
    default: 0
  },
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
  hospitalType: {
    type: String,
    enum: ['Government', 'Private', 'Trust', 'Research', 'Military'],
    default: 'Private'
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  operatingHours: {
    is24x7: {
      type: Boolean,
      default: true
    },
    regularHours: {
      monday: { open: String, close: String },
      tuesday: { open: String, close: String },
      wednesday: { open: String, close: String },
      thursday: { open: String, close: String },
      friday: { open: String, close: String },
      saturday: { open: String, close: String },
      sunday: { open: String, close: String }
    }
  },
  images: [{
    url: String,
    caption: String
  }],
  certifications: [{
    name: String,
    issuedBy: String,
    validUntil: Date
  }],
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Geospatial index for location-based queries
hospitalSchema.index({ location: '2dsphere' });
hospitalSchema.index({ isActive: 1, isVerified: 1 });
hospitalSchema.index({ 'facilities.availableBeds': -1 });
hospitalSchema.index({ specialties: 1 });

// Method to update bed availability
hospitalSchema.methods.updateBedAvailability = function(type, count) {
  if (type === 'general') {
    this.facilities.availableBeds = Math.max(0, Math.min(count, this.facilities.totalBeds));
  } else if (type === 'icu') {
    this.facilities.availableIcuBeds = Math.max(0, Math.min(count, this.facilities.icuBeds));
  } else if (type === 'emergency') {
    this.facilities.availableEmergencyBeds = Math.max(0, Math.min(count, this.facilities.emergencyBeds));
  }
  this.lastUpdated = new Date();
  return this.save();
};

// Method to check if specialty is available
hospitalSchema.methods.hasSpecialty = function(specialty) {
  return this.specialties.includes(specialty);
};

// Static method to find nearby hospitals
hospitalSchema.statics.findNearby = function(longitude, latitude, maxDistance = 50000, filters = {}) {
  const query = {
    location: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [longitude, latitude]
        },
        $maxDistance: maxDistance
      }
    },
    isActive: true,
    isVerified: true,
    ...filters
  };

  return this.find(query);
};

const Hospital = mongoose.model('Hospital', hospitalSchema);

module.exports = Hospital;
