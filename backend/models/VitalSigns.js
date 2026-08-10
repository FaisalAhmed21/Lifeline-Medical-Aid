const mongoose = require('mongoose');

const vitalSignsSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  heartRate: {
    type: Number, // beats per minute
    min: 0,
    max: 300
  },
  oxygenLevel: {
    type: Number, // SpO2 percentage
    min: 0,
    max: 100
  },
  temperature: {
    type: Number, // Celsius
    min: 30,
    max: 45
  },
  bloodPressure: {
    systolic: Number,
    diastolic: Number
  },
  respiratoryRate: {
    type: Number, // breaths per minute
    min: 0,
    max: 100
  },
  glucoseLevel: {
    type: Number, // mg/dL
    min: 0,
    max: 600
  },
  source: {
    type: String,
    enum: ['manual', 'wearable', 'medical_device'],
    default: 'wearable'
  },
  deviceName: String,
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes
vitalSignsSchema.index({ user: 1, timestamp: -1 });
vitalSignsSchema.index({ timestamp: -1 });

module.exports = mongoose.model('VitalSigns', vitalSignsSchema);
