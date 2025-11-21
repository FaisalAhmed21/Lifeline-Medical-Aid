const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
  orderId: { type: String, required: true, unique: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  volunteerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  emergencyId: { type: mongoose.Schema.Types.ObjectId, ref: 'EmergencyRequest' }, // Link order to specific emergency
  serviceType: { 
    type: String, 
    required: true,
    enum: [
      'PRESCRIPTION',
      'AMBULANCE_PRIORITY',
      'AMBULANCE_ADDON',
      'AMBULANCE_LONG_DISTANCE',
      'AMBULANCE_EQUIPMENT',
      'AMBULANCE_NON_EMERGENCY',
      'VOLUNTEER_PURCHASE'
    ]
  },
  amount: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'paid', 'completed', 'cancelled'], default: 'pending' },
  transactionId: { type: String },
  paymentTo: { type: String }, // bKash number to send payment to
  prescriptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Prescription' },
  paymentDistributed: { type: Boolean, default: false }, // Whether payment has been sent to service provider
  paymentDistributedAt: Date,
  // For ambulance services
  distance: Number, // Distance in km
  equipment: [String], // Equipment add-ons
  // For volunteer services
  itemPrice: Number, // Original item price
  volunteerFee: Number, // 5% fee
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Order', OrderSchema);