const mongoose = require('mongoose');

const emergencyRequestSchema = new mongoose.Schema({
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      required: true
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true
    },
    address: String,
    district: String,
    division: String
  },
  description: {
    type: String,
    maxlength: 500
  },
  urgencyLevel: {
    type: String,
    enum: ['critical', 'high', 'medium', 'low'],
    default: 'high'
  },
  requestedRole: {
    type: String,
    enum: ['doctor', 'volunteer', 'driver'],
    required: true,
    default: 'doctor'
  },
  itemsNeeded: {
    type: String,
    maxlength: 300
  },
  itemsCost: {
    type: Number,
    default: 0
  },
  // Estimated transport distance (in km) provided by patient for ambulance requests
  distance: {
    type: Number,
    default: 0
  },
  paymentStatus: {
    type: String,
    enum: ['none', 'pending', 'paid', 'distributed'],
    default: 'none'
  },
  assignedDoctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  assignedVolunteer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  assignedDriver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  ambulanceService: {
    serviceType: String,
    distance: Number,
    equipment: [String],
    driverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    amount: Number,
    bookedAt: Date
  },
  status: {
    type: String,
    enum: ['pending', 'assigned', 'en-route', 'arrived', 'completed', 'cancelled'],
    default: 'pending'
  },
  assignedAt: Date,
  arrivedAt: Date,
  completedAt: Date,
  cancelledAt: Date,
  cancellationReason: String,
  notes: String
}, {
  timestamps: true
});

// Create geospatial index for emergency request locations
emergencyRequestSchema.index({ location: '2dsphere' });
emergencyRequestSchema.index({ patient: 1, createdAt: -1 });
emergencyRequestSchema.index({ status: 1 });

module.exports = mongoose.model('EmergencyRequest', emergencyRequestSchema);
