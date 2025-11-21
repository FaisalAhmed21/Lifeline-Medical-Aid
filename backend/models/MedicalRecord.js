const mongoose = require('mongoose');

const medicalRecordSchema = new mongoose.Schema({
  emergencyRequest: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EmergencyRequest',
    required: false // Changed to false to allow general records
  },
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  doctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: String, // Record title/name
  bloodType: String, // A+, A-, B+, B-, AB+, AB-, O+, O-
  medications: [String], // List of current medications
  allergies: [String], // List of allergies
  chronicConditions: String, // Chronic medical conditions
  notes: String, // Additional medical notes
  symptoms: [{
    name: String,
    severity: {
      type: String,
      enum: ['mild', 'moderate', 'severe', 'critical']
    },
    duration: String, // e.g., "2 days", "1 hour"
    description: String
  }],
  vitalSigns: {
    heartRate: Number,
    bloodPressure: {
      systolic: Number,
      diastolic: Number
    },
    temperature: Number, // in Celsius
    oxygenSaturation: Number, // SpO2 percentage
    respiratoryRate: Number,
    recordedAt: Date
  },
  diagnosis: {
    primary: String,
    secondary: [String],
    icdCode: String, // International Classification of Diseases code
    notes: String
  },
  treatment: {
    medications: [{
      name: String,
      dosage: String,
      frequency: String,
      duration: String,
      route: String // oral, IV, IM, etc.
    }],
    procedures: [{
      name: String,
      performedAt: Date,
      performedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      notes: String
    }],
    instructions: String
  },
  prescription: {
    medications: [{
      name: String,
      dosage: String,
      frequency: String,
      duration: String,
      instructions: String
    }],
    followUpDate: Date,
    specialInstructions: String
  },
  medicalFiles: [{
    type: {
      type: String,
      enum: ['test_result', 'xray', 'scan', 'report', 'prescription', 'other']
    },
    fileName: String,
    fileUrl: String,
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    },
    description: String
  }],
  triageScore: {
    score: Number, // 1-10
    category: {
      type: String,
      enum: ['immediate', 'urgent', 'semi-urgent', 'non-urgent']
    },
    calculatedBy: String, // 'AI' or doctor ID
    calculatedAt: Date
  },
  handoverNotes: [{
    fromDoctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    toDoctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    summary: String,
    currentStatus: String,
    nextSteps: String,
    criticalInfo: String,
    handoverTime: {
      type: Date,
      default: Date.now
    }
  }],
  status: {
    type: String,
    enum: ['active', 'follow-up-required', 'completed', 'transferred'],
    default: 'active'
  },
  isEncrypted: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes
medicalRecordSchema.index({ patient: 1, createdAt: -1 });
medicalRecordSchema.index({ emergencyRequest: 1 });
medicalRecordSchema.index({ doctor: 1 });

module.exports = mongoose.model('MedicalRecord', medicalRecordSchema);
