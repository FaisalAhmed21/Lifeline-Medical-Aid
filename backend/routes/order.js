const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const User = require('../models/User');
const EmergencyRequest = require('../models/EmergencyRequest');
const { v4: uuidv4 } = require('uuid');

// Create order for paid service
router.post('/create', async (req, res) => {
  try {
    // Read request body; allow normalizing serviceType values from clients
    let { 
      patientId, 
      doctorId, 
      driverId, 
      volunteerId, 
      emergencyId,
      serviceType, 
      amount, 
      paymentTo,
      distance,
      equipment,
      itemPrice,
      volunteerFee
    } = req.body;

    // Log incoming serviceType and full body for debugging
    try {
      console.log('Incoming order.create body:', JSON.stringify(req.body));
    } catch (e) {}

    // Normalize legacy or frontend-specific/typoed serviceType values robustly
    try {
      const mapping = {
        'AMBULANCEADDON': 'AMBULANCE_EQUIPMENT',
        'AMBULANCE-ADDON': 'AMBULANCE_EQUIPMENT',
        'AMBULANCE_ADD_ON': 'AMBULANCE_EQUIPMENT',
        'ADDON': 'AMBULANCE_EQUIPMENT',
        'AMBULANCELONGDISTANCE': 'AMBULANCE_LONG_DISTANCE',
        'AMBULANCE-LONG-DISTANCE': 'AMBULANCE_LONG_DISTANCE'
      };
      if (serviceType && typeof serviceType === 'string') {
        const normalized = serviceType.toUpperCase().replace(/[^A-Z0-9]/g, '');
        if (mapping[normalized]) {
          console.log(`Normalizing serviceType ${serviceType} -> ${mapping[normalized]}`);
          serviceType = mapping[normalized];
        }
      }
    } catch (e) {
      console.warn('ServiceType normalization failed:', e && e.message);
    }

    // Defensive fallbacks: if patientId is not provided but the request is authenticated,
    // use the authenticated user as the patient. This helps prevent missing patientId when
    // clients omit it (clients should still provide it when appropriate).
    if (!patientId && req.user && req.user.id) {
      patientId = req.user.id;
      console.log('Falling back to authenticated user as patientId:', patientId);
    }

    // If patientId is still missing but an emergencyId is provided, try to set the patient
    // from the EmergencyRequest. Some clients only send `emergencyId` and expect the server
    // to infer the patient from it.
    if (!patientId && emergencyId) {
      try {
        const emForPatient = await EmergencyRequest.findById(emergencyId).select('patient distance ambulanceService').lean();
        if (emForPatient && emForPatient.patient) {
          patientId = emForPatient.patient;
          console.log(`Inferred patientId=${patientId} from EmergencyRequest ${emergencyId}`);
          // Also populate distance fallback for later amount calculation
          if (!distance) distance = emForPatient.distance || (emForPatient.ambulanceService && emForPatient.ambulanceService.distance) || distance;
        }
      } catch (err) {
        console.warn('Failed to infer patientId from EmergencyRequest:', err && err.message);
      }
    }

    // If this is an ambulance-related service and amount wasn't provided, but distance is
    // available, calculate the amount server-side using the pricing rule so clients don't
    // have to send the amount explicitly. Pricing: up to 5km free; each extra km = 100 BDT.
    if ((typeof amount === 'undefined' || amount === null || amount === '') && serviceType && typeof serviceType === 'string' && serviceType.toUpperCase().includes('AMBULANCE') && distance) {
      try {
        const perKm = 100;
        const extraKm = Math.max(0, Math.ceil(Number(distance) - 5));
        const calcAmount = perKm * extraKm;
        amount = calcAmount;
        console.log(`Calculated ambulance amount from distance=${distance}km -> amount=${amount}`);
      } catch (calcErr) {
        console.warn('Failed to calculate ambulance amount from distance:', calcErr && calcErr.message);
      }
    }

    // If amount is still missing but an emergencyId was provided, try to read the distance
    // from the persisted EmergencyRequest (covers older emergencies created before distance
    // was persisted or when the frontend omitted it). This ensures the server can compute
    // the fare authoritatively.
    if ((typeof amount === 'undefined' || amount === null || amount === '') && emergencyId) {
      try {
        const emergency = await EmergencyRequest.findById(emergencyId).lean();
        if (emergency) {
          const emDistance = emergency.distance || (emergency.ambulanceService && emergency.ambulanceService.distance) || null;
          if (emDistance) {
            const perKm = 100;
            const extraKm = Math.max(0, Math.ceil(Number(emDistance) - 5));
            const calcAmount = perKm * extraKm;
            amount = calcAmount;
            distance = distance || emDistance; // prefer incoming but fall back to emergency value
            console.log(`Calculated ambulance amount from EmergencyRequest (id=${emergencyId}) distance=${emDistance}km -> amount=${amount}`);
          } else {
            console.log(`No distance found on EmergencyRequest ${emergencyId}`);
          }
        } else {
          console.log(`EmergencyRequest ${emergencyId} not found when computing ambulance amount`);
        }
      } catch (eCalc) {
        console.warn('Error fetching EmergencyRequest to compute ambulance amount:', eCalc && eCalc.message);
      }
    }

    // If serviceType was not provided, try to infer it from distance (either incoming or from emergency)
    if ((!serviceType || serviceType === '') && (distance || emergencyId)) {
      try {
        let inferredDistance = distance;
        if ((!inferredDistance || inferredDistance === 0) && emergencyId) {
          const em = await EmergencyRequest.findById(emergencyId).lean();
          inferredDistance = em ? (em.distance || (em.ambulanceService && em.ambulanceService.distance) || null) : inferredDistance;
        }
        if (inferredDistance) {
          const numeric = Number(inferredDistance);
          serviceType = (numeric > 5) ? 'AMBULANCE_LONG_DISTANCE' : 'AMBULANCE_EQUIPMENT';
          console.log(`Inferred serviceType=${serviceType} from distance=${inferredDistance}km`);
          // If amount still missing, calculate it from inferredDistance
          if ((typeof amount === 'undefined' || amount === null || amount === '') && serviceType === 'AMBULANCE_LONG_DISTANCE') {
            const perKm = 100;
            const extraKm = Math.max(0, Math.ceil(numeric - 5));
            amount = perKm * extraKm;
            distance = distance || inferredDistance;
            console.log(`Calculated ambulance amount from inferred distance=${inferredDistance}km -> amount=${amount}`);
          }
        }
      } catch (inferErr) {
        console.warn('Failed to infer serviceType/amount from emergency distance:', inferErr && inferErr.message);
      }
    }

    // Validate required fields
    // amount may be 0 for free ambulance bookings; only require amount when applicable.
    // Treat empty string or non-numeric values as missing. 0 is allowed.
    const amountMissing = (typeof amount === 'undefined' || amount === null || amount === '' || Number.isNaN(Number(amount)));
    if (!patientId || !serviceType || amountMissing) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: patientId, serviceType, amount' 
      });
    }

    // If paymentTo is not provided, try to get it from the service provider's phone/bkashNumber
    let finalPaymentTo = paymentTo;
    // Only attempt to resolve payment recipient when an actual positive amount is charged
    const numericAmount = parseFloat(amount) || 0;
    if (numericAmount > 0) {
      if (!finalPaymentTo) {
        if (doctorId) {
          const doctor = await User.findById(doctorId).select('bkashNumber phone');
          finalPaymentTo = doctor?.bkashNumber || doctor?.phone;
        } else if (driverId) {
          const driver = await User.findById(driverId).select('bkashNumber phone');
          finalPaymentTo = driver?.bkashNumber || driver?.phone;
        } else if (volunteerId) {
          const volunteer = await User.findById(volunteerId).select('bkashNumber phone');
          finalPaymentTo = volunteer?.bkashNumber || volunteer?.phone;
        }
      }

      if (!finalPaymentTo) {
        return res.status(400).json({ 
          success: false, 
          error: 'Payment recipient (bKash/phone number) is required for paid services. Please provide paymentTo or ensure the service provider has a phone/bKash number.' 
        });
      }
    }

    const orderData = {
      orderId: uuidv4(),
      patientId,
      serviceType,
      amount,
      paymentTo: finalPaymentTo,
      status: 'pending'
    };

    // Add role-specific IDs
    if (doctorId) orderData.doctorId = doctorId;
    if (driverId) orderData.driverId = driverId;
    if (volunteerId) orderData.volunteerId = volunteerId;
    if (emergencyId) orderData.emergencyId = emergencyId;

    // Prevent duplicate payment orders for the same emergency and service/provider
    if (emergencyId) {
      try {
        const duplicateQuery = {
          emergencyId,
          serviceType,
          // Treat pending, paid, completed as existing payment lifecycle states that should block creating a new order
          status: { $in: ['pending', 'paid', 'completed'] }
        };
        // Narrow by provider id when applicable to avoid interfering with different service types
        if (volunteerId) duplicateQuery.volunteerId = volunteerId;
        if (driverId) duplicateQuery.driverId = driverId;
        if (doctorId) duplicateQuery.doctorId = doctorId;

        const existing = await Order.findOne(duplicateQuery).sort('-createdAt');
        if (existing) {
          // Return existing order rather than creating another one
          return res.json({ success: true, order: existing, message: 'Existing payment order found for this emergency' });
        }
      } catch (err) {
        console.warn('Error checking duplicate orders for emergency:', emergencyId, err.message || err);
      }
    }

  // Add ambulance-specific fields
  if (distance) orderData.distance = distance;
    if (equipment && Array.isArray(equipment)) orderData.equipment = equipment;

    // Add volunteer-specific fields
    if (itemPrice) orderData.itemPrice = itemPrice;
    if (volunteerFee) orderData.volunteerFee = volunteerFee;

    const order = new Order(orderData);
    try {
      await order.save();
    } catch (saveErr) {
      console.error('Order save failed:', saveErr && saveErr.message);
      // If it's a Mongoose validation error, provide clearer feedback including allowed enums
      if (saveErr && saveErr.name === 'ValidationError') {
        const svcErr = saveErr.errors && saveErr.errors.serviceType && saveErr.errors.serviceType.message;
        // Get allowed enum values if available
        let allowed = [];
        try {
          const OrderModel = require('../models/Order');
          allowed = OrderModel.schema.path('serviceType').enumValues || [];
        } catch (ee) {}

        return res.status(400).json({
          success: false,
          error: 'Order validation failed',
          details: {
            message: svcErr || saveErr.message,
            incomingServiceType: serviceType,
            allowedServiceTypes: allowed
          }
        });
      }
      throw saveErr;
    }
    // Special handling for ambulance services:
    // - If this is a free ambulance booking (amount == 0), treat it as an immediate/confirmed booking
    //   by marking the order as completed/distributed and updating the emergency paymentStatus so UIs reflect booking.
    try {
      if (order.serviceType && order.serviceType.startsWith('AMBULANCE')) {
        const amt = parseFloat(order.amount) || 0;
        // If long distance and distance provided, server-calculates amount if not passed in
        if (order.serviceType === 'AMBULANCE_LONG_DISTANCE' && order.distance && (!req.body.amount || req.body.amount === 0)) {
          // Pricing rule: up to 5 km is free; for each km beyond 5 km charge 100 BDT
          const perKm = 100;
          const extraKm = Math.max(0, Math.ceil(order.distance - 5));
          const calcAmount = perKm * extraKm;
          order.amount = calcAmount;
          await order.save();
        }

        // Reload numeric amount
        const finalAmt = parseFloat(order.amount) || 0;
        if (finalAmt <= 0) {
          // Mark as completed and distributed for free bookings so the client treats the booking as confirmed
          order.status = 'completed';
          order.paymentDistributed = true;
          order.paymentDistributedAt = new Date();
          await order.save();
          if (order.emergencyId) {
            await EmergencyRequest.findByIdAndUpdate(order.emergencyId, { $set: { paymentStatus: 'distributed', ambulanceService: { serviceType: order.serviceType, distance: order.distance || 0, equipment: order.equipment || [], driverId: order.driverId || null, amount: 0, bookedAt: new Date() } } });
          }

          // Emit booking/ paymentDistributed event to the emergency room and driver/patient
          try {
            const serverModule = require('../server');
            const io = serverModule && serverModule.io;
            if (io && order.emergencyId) {
              io.to(`emergency_${order.emergencyId.toString()}`).emit('paymentDistributed', {
                orderId: order.orderId,
                emergencyId: order.emergencyId.toString(),
                amount: order.amount,
                paymentTo: order.paymentTo || null,
                serviceType: order.serviceType,
                driverId: order.driverId || null
              });
              io.to(`user_${order.driverId && order.driverId.toString()}`).emit('ambulanceBooked', { orderId: order.orderId, emergencyId: order.emergencyId.toString(), amount: order.amount });
            }
          } catch (emitErr) {
            console.warn('Could not emit ambulance booking events:', emitErr.message || emitErr);
          }
        } else {
          // For paid ambulance orders, mark emergency as pending payment so UI reflects actionable state
          if (order.emergencyId) {
            await EmergencyRequest.findByIdAndUpdate(order.emergencyId, { $set: { paymentStatus: 'pending' } });
          }
        }
      } else {
        // If this order is linked to an emergency, mark the emergency paymentStatus as pending
        if (order.emergencyId) {
          await EmergencyRequest.findByIdAndUpdate(order.emergencyId, { $set: { paymentStatus: 'pending' } });
        }
      }
    } catch (err) {
      console.warn('Failed to set emergency paymentStatus for ambulance order', order.emergencyId, err.message || err);
    }

    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Verify payment (transaction ID)
router.post('/verify', async (req, res) => {
  try {
    const { orderId, transactionId } = req.body;
    
    if (!transactionId || transactionId.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Transaction ID is required' });
    }
    
    const order = await Order.findOne({ orderId }).populate('doctorId driverId volunteerId prescriptionId');
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }
    
    // TODO: Add bKash API verification here if available
    // For now, mark as paid if transactionId is provided
    order.transactionId = transactionId;
    order.status = 'paid';
    order.updatedAt = Date.now();
    await order.save();
    
    if (order.serviceType === 'PRESCRIPTION') {
      console.log(`✅ Prescription payment verified for order ${order.orderId}`);
    }

    // Emit socket event so connected clients (helpers/doctors/patient) can react in real-time
    try {
      const serverModule = require('../server');
      const io = serverModule && serverModule.io;
      if (io) {
        const payload = {
          orderId: order.orderId,
          emergencyId: order.emergencyId ? order.emergencyId.toString() : null,
          patientId: order.patientId ? (order.patientId._id ? order.patientId._id.toString() : order.patientId.toString()) : null,
          doctorId: order.doctorId ? (order.doctorId._id ? order.doctorId._id.toString() : order.doctorId.toString()) : null,
          volunteerId: order.volunteerId ? (order.volunteerId._id ? order.volunteerId._id.toString() : order.volunteerId.toString()) : null,
          serviceType: order.serviceType,
          amount: order.amount,
          transactionId: order.transactionId || null,
          paymentTo: order.paymentTo || null,
          itemPrice: order.itemPrice || null,
          volunteerFee: order.volunteerFee || null,
          createdAt: order.createdAt || new Date()
        };

        // Helper: log which rooms exist before emitting
        try {
          const rooms = io.sockets.adapter.rooms;
          const emergencyRoom = `emergency_${payload.emergencyId}`;
          const patientRoom = `user_${payload.patientId}`;
          const volunteerRoom = payload.volunteerId ? `user_${payload.volunteerId}` : null;
          console.log('🔍 orderPaid emit rooms present check:', {
            emergencyRoomExists: rooms.has && rooms.has(emergencyRoom),
            patientRoomExists: rooms.has && rooms.has(patientRoom),
            volunteerRoomExists: volunteerRoom ? (rooms.has && rooms.has(volunteerRoom)) : false,
            payload
          });
        } catch (rerr) {
          console.warn('Could not inspect socket rooms:', rerr.message || rerr);
        }

        // Emit to emergency room so helpers/volunteers in that emergency get notified
        if (payload.emergencyId) {
          io.to(`emergency_${payload.emergencyId}`).emit('orderPaid', payload);
        }
        // Emit to patient so patient sessions get notified
        if (payload.patientId) {
          io.to(`user_${payload.patientId}`).emit('orderPaid', payload);
        }
        // If volunteerId exists, emit directly to that volunteer's user room for immediate confirmation
        if (payload.volunteerId) {
          io.to(`user_${payload.volunteerId}`).emit('orderPaid', payload);
        }

        console.log(`🔔 Emitted orderPaid for order ${order.orderId} (emergency ${payload.emergencyId})`);
      }
    } catch (emitErr) {
      console.warn('Could not emit orderPaid socket event:', emitErr.message || emitErr);
    }

    // Update emergency paymentStatus to 'paid' so reloads correctly reflect payment state
    try {
      if (order.emergencyId) {
        // For volunteer purchases and ambulance payments, mark paid
        await EmergencyRequest.findByIdAndUpdate(order.emergencyId, { $set: { paymentStatus: 'paid' } });
      }
    } catch (err) {
      console.warn('Failed to update emergency paymentStatus to paid for emergency', order.emergencyId, err.message || err);
    }

    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Mark order as completed and distribute payment
router.post('/complete', async (req, res) => {
  try {
    const { orderId } = req.body;
    const order = await Order.findOne({ orderId }).populate('doctorId driverId volunteerId');
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }
    
    if (order.status !== 'paid') {
      return res.status(400).json({ success: false, error: 'Order must be paid before completion' });
    }
    
    order.status = 'completed';
    order.updatedAt = Date.now();
    
    // Distribute payment to service provider (doctor/driver/volunteer)
    if (!order.paymentDistributed && order.paymentTo) {
      // In a real implementation, you would use bKash API to send money
      // For now, we just mark it as distributed
      // TODO: Integrate with bKash Send Money API
      order.paymentDistributed = true;
      order.paymentDistributedAt = new Date();
      
      console.log(`💰 Payment of ${order.amount} BDT should be sent to ${order.paymentTo} (${order.serviceType})`);
      // In production, you would call bKash API here:
      // await sendBkashPayment(order.paymentTo, order.amount, order.orderId);
    }
    
    // Prescription orders will be marked as completed when the PDF is issued
    
    await order.save();
    // If this order is linked to an emergency, clear emergency paymentStatus (no outstanding payment)
    try {
      if (order.emergencyId) {
        const serverModule = require('../server');
        const io = serverModule && serverModule.io;
        // Mark emergency payment as distributed so patient UI shows verified state and pay option stays hidden
        await EmergencyRequest.findByIdAndUpdate(order.emergencyId, { $set: { paymentStatus: 'distributed' } });
        // Notify connected clients in the emergency room that payment has been distributed/completed
        if (io) {
          io.to(`emergency_${order.emergencyId}`).emit('paymentDistributed', {
            orderId: order.orderId,
            emergencyId: order.emergencyId.toString(),
            amount: order.amount,
            paymentTo: order.paymentTo || null
          });
        }
      }
    } catch (err) {
      console.warn('Failed to update emergency paymentStatus after order completion:', err.message || err);
    }

    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get orders with filters
router.get('/', async (req, res) => {
  try {
    const { patientId, doctorId, driverId, volunteerId, serviceType, status, emergencyId } = req.query;

    const query = {};
    if (patientId) query.patientId = patientId;
    if (doctorId) query.doctorId = doctorId;
    if (driverId) query.driverId = driverId;
    if (volunteerId) query.volunteerId = volunteerId;
    if (serviceType) query.serviceType = serviceType;
    if (status) query.status = status;
    if (emergencyId) query.emergencyId = emergencyId;

    const orders = await Order.find(query)
      .populate('patientId doctorId driverId volunteerId prescriptionId')
      .sort('-createdAt');

    res.json({ success: true, orders });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get order by ID
router.get('/:orderId', async (req, res) => {
  try {
  const order = await Order.findOne({ orderId: req.params.orderId })
      .populate('patientId doctorId driverId volunteerId prescriptionId');
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }
    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;