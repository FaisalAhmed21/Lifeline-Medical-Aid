const EmergencyRequest = require('../models/EmergencyRequest');
const User = require('../models/User');
const Order = require('../models/Order');
const { 
  sendNotificationToDevice, 
  sendNotificationToMultipleDevices,
  NotificationTemplates 
} = require('../services/notificationService');

// Create emergency request with auto-assignment (Only requested role)
exports.createEmergencyRequest = async (req, res) => {
  try {
  const { location, description, urgencyLevel, requestedRole, itemsNeeded, itemsCost, distance } = req.body;
    const patientId = req.user.id;

    // Validate requested role
    const validRoles = ['doctor', 'volunteer', 'driver'];
    const roleToAssign = validRoles.includes(requestedRole) ? requestedRole : 'doctor';

    // Set payment status if items with cost are requested
    const paymentStatus = (roleToAssign === 'volunteer' && itemsCost > 0) ? 'pending' : 'none';

    // Create emergency request
    const emergencyPayload = {
      patient: patientId,
      location,
      description,
      urgencyLevel: urgencyLevel || 'high',
      requestedRole: roleToAssign,
      itemsNeeded: itemsNeeded || '',
      itemsCost: itemsCost || 0,
      paymentStatus
    };

    // Persist optional ambulance distance if provided by client (used by frontend to compute fares)
    if (typeof distance !== 'undefined' && distance !== null && distance !== '') {
      emergencyPayload.distance = Number(distance);
      console.log(`Persisting ambulance distance on emergency: ${emergencyPayload.distance} km`);
    }

    const emergencyRequest = await EmergencyRequest.create(emergencyPayload);

    // Auto-assign nearest available helper (ONLY the requested role)
    const maxDistance = 50000; // 50km in meters
    const [longitude, latitude] = location.coordinates;
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to start of day for date comparison

    console.log(`🔍 Searching for nearest ${roleToAssign}...`);
    console.log(`📍 Patient location: [${latitude}, ${longitude}] (lat, lng)`);
    console.log(`📍 Patient coordinates: [${longitude}, ${latitude}] (GeoJSON format: [lng, lat])`);
    console.log(`🔍 Search radius: ${maxDistance/1000}km`);

    // Find all on-duty helpers of the requested role
    // Requirements: on-duty, active, and valid location (not [0, 0])
    // Note: Verification is NOT required for assignment (allows unverified helpers)
    
    // First, let's check what helpers exist without the isOnDuty requirement (like nearby users)
    console.log(`🔍 Step 1: Finding all ${roleToAssign}s nearby (without isOnDuty requirement)...`);
    let allNearbyHelpers = [];
    
    try {
      allNearbyHelpers = await User.find({
        role: roleToAssign,
        isActive: true,
        location: {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [longitude, latitude]
            },
            $maxDistance: maxDistance
          }
        }
      }).select('-password -googleId').limit(100);
    } catch (geoError) {
      console.error(`⚠️ Geospatial query error: ${geoError.message}`);
      // Fallback to manual search
      const allRoleHelpers = await User.find({
        role: roleToAssign,
        isActive: true,
        'location.coordinates': { $ne: [0, 0] }
      }).select('-password -googleId').limit(100);
      
      allNearbyHelpers = allRoleHelpers.filter(helper => {
        const coords = helper.location?.coordinates || [0, 0];
        const distance = calculateDistance(latitude, longitude, coords[1], coords[0]);
        return distance <= (maxDistance / 1000);
      });
    }
    
    console.log(`   Found ${allNearbyHelpers.length} ${roleToAssign}(s) nearby (regardless of duty status)`);
    
    // Helper function to check if a helper is on duty (handles various data types)
    const isHelperOnDuty = (helper) => {
      if (!helper.schedule) return false;
      const isOnDuty = helper.schedule.isOnDuty;
      // Handle boolean true, string "true", or truthy values
      return isOnDuty === true || isOnDuty === 'true' || (typeof isOnDuty === 'string' && isOnDuty.toLowerCase() === 'true') || (isOnDuty && isOnDuty !== false && isOnDuty !== 'false');
    };
    
    // Log all nearby helpers and their isOnDuty status
    allNearbyHelpers.forEach((helper, index) => {
      const coords = helper.location?.coordinates || [0, 0];
      const isOnDuty = isHelperOnDuty(helper);
      const scheduleObj = helper.schedule || {};
      const distance = calculateDistance(latitude, longitude, coords[1], coords[0]);
      console.log(`   ${index + 1}. ${helper.name}: isOnDuty=${isOnDuty} (raw: ${scheduleObj.isOnDuty}, type: ${typeof scheduleObj.isOnDuty}), location=[${coords[0]}, ${coords[1]}], distance=${distance.toFixed(2)}km`);
    });
    
    // Prioritize on-duty helpers, but fall back to all nearby helpers if none are on-duty
    let onDutyHelpers = allNearbyHelpers.filter(helper => {
      const isOnDuty = isHelperOnDuty(helper);
      if (!isOnDuty) {
        console.log(`   ⚠️ ${helper.name} is NOT on duty (schedule.isOnDuty=${helper.schedule?.isOnDuty}, type=${typeof helper.schedule?.isOnDuty})`);
      }
      return isOnDuty;
    });
    
    console.log(`🔍 Step 2: Found ${onDutyHelpers.length} on-duty ${roleToAssign}(s) within ${maxDistance/1000}km`);
    
    // Use on-duty helpers if available, otherwise use all nearby helpers
    // This ensures assignment works even if isOnDuty toggle isn't working properly
    let allHelpers = onDutyHelpers.length > 0 ? onDutyHelpers : allNearbyHelpers;
    
    if (onDutyHelpers.length === 0 && allNearbyHelpers.length > 0) {
      console.log(`⚠️ No on-duty ${roleToAssign}s found, but found ${allNearbyHelpers.length} nearby ${roleToAssign}(s). Using all nearby helpers...`);
    }
    
    // If still no helpers found, do detailed debugging
    if (allHelpers.length === 0) {
      console.log(`⚠️ No helpers found. Checking for ${roleToAssign}s in database...`);
      const allRoleHelpers = await User.find({
        role: roleToAssign,
        isActive: true
      }).select('name schedule.isOnDuty location.coordinates currentLoad');
      
      console.log(`   Total ${roleToAssign}s in database: ${allRoleHelpers.length}`);
      const onDutyCount = allRoleHelpers.filter(h => h.schedule?.isOnDuty === true).length;
      const withValidLocation = allRoleHelpers.filter(h => {
        const coords = h.location?.coordinates || [0, 0];
        return !(coords[0] === 0 && coords[1] === 0);
      }).length;
      
      console.log(`   - On duty: ${onDutyCount}`);
      console.log(`   - With valid location (not [0,0]): ${withValidLocation}`);
      
      // List all helpers and their status
      allRoleHelpers.forEach((helper, index) => {
        const coords = helper.location?.coordinates || [0, 0];
        const isOnDuty = helper.schedule?.isOnDuty || false;
        const hasValidLocation = !(coords[0] === 0 && coords[1] === 0);
        const activeEmergencies = helper.currentLoad?.activeEmergencies || 0;
        const maxConcurrent = helper.currentLoad?.maxConcurrent || 3;
        const distance = hasValidLocation ? calculateDistance(
          location.coordinates[1], // patient lat
          location.coordinates[0], // patient lng
          coords[1], // helper lat
          coords[0]  // helper lng
        ) : 'N/A';
        
        console.log(`   ${index + 1}. ${helper.name}: onDuty=${isOnDuty}, location=[${coords[1]}, ${coords[0]}], valid=${hasValidLocation}, distance=${typeof distance === 'number' ? distance.toFixed(2) + 'km' : distance}, workload=${activeEmergencies}/${maxConcurrent}, eligible=${isOnDuty && hasValidLocation}`);
      });
    }
    
    // Additional logging for found helpers (already logged above in try/catch)

    // Filter out helpers who are unavailable today (but allow assignment regardless of current workload)
    // If a doctor is on-duty, they should be available for assignment
    let availableHelpers = allHelpers.filter(helper => {
      // Check if today is in unavailable dates
      if (helper.schedule?.unavailableDates && helper.schedule.unavailableDates.length > 0) {
        const isUnavailableToday = helper.schedule.unavailableDates.some(unavailableDate => {
          const unavailable = new Date(unavailableDate.date);
          unavailable.setHours(0, 0, 0, 0);
          return unavailable.getTime() === today.getTime();
        });
        if (isUnavailableToday) {
          console.log(`   ⚠️ ${helper.name} is unavailable today (unavailable date)`);
          return false;
        }
      }

      // Note: We no longer filter by max workload - if a doctor is on-duty, they can be assigned
      // regardless of how many patients they're currently handling
      console.log(`   ✅ ${helper.name} is available for assignment (on-duty, not marked unavailable)`);
      return true;
    });

    // Select the closest helper from available ones
    // MongoDB $near already sorts by distance, so the first one should be closest
    // But let's calculate exact distances to be sure and select the closest
    let nearestHelper = null;
    let minDistance = Infinity;
    
    if (availableHelpers.length > 0) {
      console.log(`📋 Evaluating ${availableHelpers.length} available ${roleToAssign}(s) for assignment...`);
      
      for (const helper of availableHelpers) {
        const coords = helper.location?.coordinates || [0, 0];
        const [lng, lat] = coords;
        const distance = calculateDistance(
          latitude, // patient lat
          longitude, // patient lng
          lat, // helper lat
          lng  // helper lng
        );
        
        console.log(`   - ${helper.name}: distance=${distance.toFixed(2)}km, workload=${helper.currentLoad?.activeEmergencies || 0}/${helper.currentLoad?.maxConcurrent || 3}`);
        
        if (distance < minDistance) {
          minDistance = distance;
          nearestHelper = helper;
        }
      }
      
      if (nearestHelper) {
        console.log(`✅ Selected nearest ${roleToAssign}: ${nearestHelper.name} (${minDistance.toFixed(2)}km away)`);
      }
    } else {
      // Reset minDistance if no helper found
      minDistance = 0;
      console.log(`⚠️ No available ${roleToAssign}s after filtering (unavailable dates)`);
    }

    if (!nearestHelper) {
      console.log(`❌ No available on-duty ${roleToAssign} found within ${maxDistance/1000}km`);
      if (allHelpers.length > 0) {
        console.log(`   Found ${allHelpers.length} on-duty ${roleToAssign}(s) within ${maxDistance/1000}km, but ${allHelpers.length - availableHelpers.length} are unavailable (marked unavailable for today)`);
        console.log(`   Available helpers: ${availableHelpers.length}`);
        
        // Show why helpers were filtered out
        const filteredHelpers = allHelpers.filter(h => !availableHelpers.includes(h));
        filteredHelpers.forEach(helper => {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const isUnavailableToday = helper.schedule?.unavailableDates?.some(ud => {
            const udDate = new Date(ud.date);
            udDate.setHours(0, 0, 0, 0);
            return udDate.getTime() === today.getTime();
          });
          
          if (isUnavailableToday) {
            console.log(`     - ${helper.name}: Unavailable today (unavailable date)`);
          }
        });
      } else {
        console.log(`   No on-duty ${roleToAssign} found within ${maxDistance/1000}km of patient location [${latitude}, ${longitude}]`);
        console.log(`   Requirements: isActive=true, isOnDuty=true, location != [0,0], within ${maxDistance/1000}km`);
      }
    }

    // Assign the helper to the appropriate field
    if (nearestHelper) {
      console.log(`✅ Assigning ${nearestHelper.name} (${nearestHelper.role}) - ${minDistance.toFixed(2)}km away`);
      
      // If assigning a doctor, cancel ALL prescription orders for this emergency
      // This ensures patient must pay again for each doctor assignment (even if same doctor)
      if (roleToAssign === 'doctor') {
        const newDoctorId = nearestHelper._id.toString();
        
        // Get the current assigned doctor from the database (in case this is a reassignment)
        const currentEmergency = await EmergencyRequest.findById(emergencyRequest._id).select('assignedDoctor');
        const previousDoctorId = currentEmergency?.assignedDoctor?.toString();
        
        // Cancel ALL prescription orders for this emergency (all statuses: pending, paid, completed)
        // This ensures payment resets for each assignment, even if it's the same doctor
        // Note: We cancel completed orders too, which invalidates any prescriptions linked to them
        const cancelledOrders = await Order.updateMany(
          {
            emergencyId: emergencyRequest._id,
            serviceType: 'PRESCRIPTION',
            status: { $ne: 'cancelled' } // Don't re-cancel already cancelled orders
          },
          {
            status: 'cancelled',
            updatedAt: new Date()
          }
        );
        
        // Also update the assignedAt timestamp to mark when this doctor was assigned
        // This ensures prescriptions from before this assignment are not shown
        emergencyRequest.assignedAt = new Date();
        
        if (cancelledOrders.modifiedCount > 0) {
          console.log(`🔄 Cancelled ${cancelledOrders.modifiedCount} prescription order(s) for emergency ${emergencyRequest._id}`);
          if (previousDoctorId && previousDoctorId === newDoctorId) {
            console.log(`   ⚠️ Same doctor reassigned (${newDoctorId}) - payment reset required`);
          } else if (previousDoctorId) {
            console.log(`   Note: Doctor changed from ${previousDoctorId} to ${newDoctorId}`);
          } else {
            console.log(`   Note: New doctor assignment (${newDoctorId})`);
          }
        } else if (previousDoctorId && previousDoctorId === newDoctorId) {
          // Even if no orders were found, log that it's a reassignment
          console.log(`   ⚠️ Same doctor reassigned (${newDoctorId}) - any existing orders should be cancelled`);
        }
        
        emergencyRequest.assignedDoctor = nearestHelper._id;
      } else if (roleToAssign === 'volunteer') {
        emergencyRequest.assignedVolunteer = nearestHelper._id;
      } else if (roleToAssign === 'driver') {
        emergencyRequest.assignedDriver = nearestHelper._id;
      }

      emergencyRequest.status = 'assigned';
      emergencyRequest.assignedAt = new Date();
      
      // Update workload for assigned helper
      nearestHelper.currentLoad.activeEmergencies += 1;
      await nearestHelper.save();
    }

    await emergencyRequest.save();

    // Populate assigned users with all necessary fields including bkashNumber and prescriptionFee
    await emergencyRequest.populate([
      { path: 'patient', select: 'name email phone role' },
      { path: 'assignedDoctor', select: 'name email phone role specialization experience prescriptionFee bkashNumber location' },
      { path: 'assignedVolunteer', select: 'name email phone role bkashNumber location' },
      { path: 'assignedDriver', select: 'name email phone role bkashNumber location vehicleInfo' }
    ]);

    // Send push notification to assigned helper
    const patient = await User.findById(patientId);
    
    console.log(`🚨 New emergency created by ${patient.name}`);
    console.log(`📋 Requested role: ${roleToAssign}`);
    console.log(`📋 Assigned helper: ${nearestHelper ? `${nearestHelper.name} (${nearestHelper.role})` : 'None'}`);
    if (itemsNeeded) {
      console.log(`📦 Items needed: ${itemsNeeded} (Cost: ৳${itemsCost})`);
    }
    
    if (nearestHelper) {
      console.log(`📤 Sending emergency assignment notification to ${nearestHelper.name} (${nearestHelper.role})`);
      console.log(`   Distance: ${minDistance.toFixed(1)}km, Urgency: ${urgencyLevel}`);
    }

    // Prepare response message with detailed information
    let responseMessage = 'Emergency request created';
    if (nearestHelper && minDistance !== Infinity) {
      responseMessage = `Emergency request created. ${nearestHelper.name} (${roleToAssign}) assigned - ${minDistance.toFixed(1)}km away`;
    } else {
      // Provide more detailed error message
      let debugInfo = '';
      if (allHelpers.length > 0) {
        debugInfo = ` Found ${allHelpers.length} on-duty ${roleToAssign}(s) nearby, but they're marked as unavailable for today.`;
      } else {
        // Check if there are any helpers of this role at all
        const totalRoleHelpers = await User.countDocuments({ role: roleToAssign, isActive: true });
        if (totalRoleHelpers === 0) {
          debugInfo = ` No active ${roleToAssign}s found in the system.`;
        } else {
          const onDutyCount = await User.countDocuments({ 
            role: roleToAssign, 
            isActive: true, 
            'schedule.isOnDuty': true 
          });
          const withValidLocation = await User.countDocuments({ 
            role: roleToAssign, 
            isActive: true,
            'location.coordinates': { $ne: [0, 0] }
          });
          
          debugInfo = ` Found ${totalRoleHelpers} active ${roleToAssign}(s) in system: ${onDutyCount} on-duty, ${withValidLocation} with valid location.`;
        }
      }
      responseMessage = `Emergency request created. No available on-duty ${roleToAssign} found within ${maxDistance/1000}km.${debugInfo} Please ensure ${roleToAssign}s are on-duty and have valid locations set.`;
    }

    res.status(201).json({
      success: true,
      data: emergencyRequest,
      message: responseMessage,
      helperAssigned: !!nearestHelper
    });
  } catch (error) {
    console.error('Create emergency request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create emergency request',
      error: error.message
    });
  }
};

// Get user's emergency requests
exports.getMyEmergencyRequests = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status } = req.query;

    const query = { patient: userId };
    if (status) {
      query.status = status;
    }

    const emergencyRequests = await EmergencyRequest.find(query)
      .populate([
        { path: 'patient', select: 'name email phone role' },
        { path: 'assignedDoctor', select: 'name email phone role specialization experience prescriptionFee bkashNumber location' },
        { path: 'assignedVolunteer', select: 'name email phone role bkashNumber location' },
        { path: 'assignedDriver', select: 'name email phone role bkashNumber location vehicleInfo' }
      ])
      .sort('-createdAt');

    res.status(200).json({
      success: true,
      count: emergencyRequests.length,
      data: emergencyRequests
    });
  } catch (error) {
    console.error('Get emergency requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch emergency requests',
      error: error.message
    });
  }
};

// Get assigned emergency requests (for doctors, volunteers, drivers)
exports.getAssignedEmergencies = async (req, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;

    let query = {};
    if (role === 'doctor') {
      query.assignedDoctor = userId;
    } else if (role === 'volunteer') {
      query.assignedVolunteer = userId;
    } else if (role === 'driver') {
      query.assignedDriver = userId;
    } else {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view assigned emergencies'
      });
    }

    const emergencyRequests = await EmergencyRequest.find(query)
      .populate([
        { path: 'patient', select: 'name email phone role' },
        { path: 'assignedDoctor', select: 'name email phone role specialization experience prescriptionFee bkashNumber location' },
        { path: 'assignedVolunteer', select: 'name email phone role bkashNumber location' },
        { path: 'assignedDriver', select: 'name email phone role bkashNumber location vehicleInfo' }
      ])
      .sort('-createdAt');

    res.status(200).json({
      success: true,
      count: emergencyRequests.length,
      data: emergencyRequests
    });
  } catch (error) {
    console.error('Get assigned emergencies error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch assigned emergencies',
      error: error.message
    });
  }
};

// Update emergency request status
exports.updateEmergencyStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    const userId = req.user.id;

    const emergencyRequest = await EmergencyRequest.findById(id);
    
    if (!emergencyRequest) {
      return res.status(404).json({
        success: false,
        message: 'Emergency request not found'
      });
    }

    // Check authorization
    const isAuthorized = 
      emergencyRequest.patient.toString() === userId ||
      emergencyRequest.assignedDoctor?.toString() === userId ||
      emergencyRequest.assignedVolunteer?.toString() === userId ||
      emergencyRequest.assignedDriver?.toString() === userId ||
      req.user.role === 'admin';

    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this emergency request'
      });
    }

    // Business rule: Prevent completing an emergency when there are paid prescription
    // orders for this emergency that have not yet had a prescription issued. This
    // ensures a patient who paid for a prescription actually receives it before the
    // emergency/consultation is marked completed. Apply this check for any actor
    // attempting to set status to 'completed' to avoid client-side bypasses.
    if (status === 'completed') {
      try {
        const paidPrescriptionOrders = await Order.find({
          emergencyId: emergencyRequest._id,
          serviceType: 'PRESCRIPTION',
          status: 'paid'
        }).populate('prescriptionId');

        if (paidPrescriptionOrders && paidPrescriptionOrders.length > 0) {
          const anyUnissued = paidPrescriptionOrders.some(o => !o.prescriptionId);
          if (anyUnissued) {
            return res.status(400).json({
              success: false,
              message: 'There are paid prescription order(s) for this emergency that have not yet been issued. Please issue/send the prescription(s) before marking the emergency as completed.'
            });
          }
        }
      } catch (presCheckError) {
        console.error('Error checking prescription orders before completion:', presCheckError);
        return res.status(500).json({
          success: false,
          message: 'Failed to verify prescription status before completing emergency. Please try again.',
          error: presCheckError.message
        });
      }
    }

    // Update status
    emergencyRequest.status = status;
    if (notes) emergencyRequest.notes = notes;

    // Update timestamps based on status
    if (status === 'en-route' && !emergencyRequest.assignedAt) {
      emergencyRequest.assignedAt = new Date();
    }
    if (status === 'arrived') {
      emergencyRequest.arrivedAt = new Date();
    }
    if (status === 'completed') {
      emergencyRequest.completedAt = new Date();
      
      // Complete any associated paid orders to trigger payment distribution
      try {
        const orders = await Order.find({
          $or: [
            { doctorId: emergencyRequest.assignedDoctor },
            { driverId: emergencyRequest.assignedDriver },
            { volunteerId: emergencyRequest.assignedVolunteer }
          ],
          patientId: emergencyRequest.patient,
          status: 'paid'
        });
        
        for (const order of orders) {
          if (!order.paymentDistributed) {
            order.status = 'completed';
            order.paymentDistributed = true;
            order.paymentDistributedAt = new Date();
            await order.save();
            console.log(`💰 Payment distributed for order ${order.orderId} (${order.serviceType})`);
          }
        }
      } catch (orderError) {
        console.error('Error completing orders:', orderError);
        // Don't fail the emergency status update if order completion fails
      }
    }
    if (status === 'cancelled') {
      emergencyRequest.cancelledAt = new Date();
      emergencyRequest.cancellationReason = notes;
    }

    await emergencyRequest.save();
    await emergencyRequest.populate([
      { path: 'patient', select: 'name email phone role' },
      { path: 'assignedDoctor', select: 'name email phone role specialization experience prescriptionFee bkashNumber location' },
      { path: 'assignedVolunteer', select: 'name email phone role bkashNumber location' },
      { path: 'assignedDriver', select: 'name email phone role bkashNumber location vehicleInfo' }
    ]);

    console.log(`📝 Emergency status updated to: ${status}`);
    console.log(`👤 Updated by: ${helper?.name || 'Unknown'} (${req.user.role})`);

    // Send push notification to patient about status change
    const patient = await User.findById(emergencyRequest.patient._id);
    const helper = await User.findById(userId);
    
    if (patient && patient.fcmTokens && patient.fcmTokens.length > 0 && patient.notificationPreferences?.pushEnabled) {
      let notification;
      
      if (status === 'en-route') {
        notification = NotificationTemplates.helperEnRoute(helper.name, helper.role);
      } else if (status === 'arrived') {
        notification = NotificationTemplates.helperArrived(helper.name, helper.role);
      } else if (status === 'completed') {
        notification = NotificationTemplates.emergencyCompleted(patient.name);
      }
      
      if (notification) {
        notification.data.emergencyId = emergencyRequest._id.toString();
        console.log(`📤 Sending status update notification to patient ${patient.name}`);
        console.log(`   Status: ${status}, Helper: ${helper.name} (${helper.role})`);
        console.log(`   FCM tokens: ${patient.fcmTokens.length}`);
        
        const result = await sendNotificationToMultipleDevices(patient.fcmTokens, notification);
        console.log(`   Result:`, result.success ? `✅ Sent to ${result.successCount} devices` : `❌ Failed: ${result.error}`);
      }
    } else {
      console.log(`⚠️ No notification sent to patient ${patient?.name || 'unknown'}: FCM=${patient?.fcmTokens?.length > 0}, Enabled=${patient?.notificationPreferences?.pushEnabled}`);
    }

    res.status(200).json({
      success: true,
      data: emergencyRequest,
      message: `Emergency request status updated to ${status}`
    });
  } catch (error) {
    console.error('Update emergency status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update emergency status',
      error: error.message
    });
  }
};

// Get single emergency by ID
exports.getEmergencyById = async (req, res) => {
  try {
    const emergencyRequest = await EmergencyRequest.findById(req.params.id)
      .populate([
        { path: 'patient', select: 'name email phone role' },
        { path: 'assignedDoctor', select: 'name email phone role specialization experience prescriptionFee bkashNumber location' },
        { path: 'assignedVolunteer', select: 'name email phone role bkashNumber location' },
        { path: 'assignedDriver', select: 'name email phone role bkashNumber location vehicleInfo' }
      ]);

    if (!emergencyRequest) {
      return res.status(404).json({
        success: false,
        message: 'Emergency request not found'
      });
    }

    res.status(200).json({
      success: true,
      data: emergencyRequest
    });
  } catch (error) {
    console.error('Get emergency by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch emergency',
      error: error.message
    });
  }
};

// Get all emergency requests (admin only)
exports.getAllEmergencies = async (req, res) => {
  try {
    const { status, urgency } = req.query;
    
    const query = {};
    if (status) query.status = status;
    if (urgency) query.urgencyLevel = urgency;

    const emergencyRequests = await EmergencyRequest.find(query)
      .populate([
        { path: 'patient', select: 'name email phone role' },
        { path: 'assignedDoctor', select: 'name email phone role specialization experience prescriptionFee bkashNumber location' },
        { path: 'assignedVolunteer', select: 'name email phone role bkashNumber location' },
        { path: 'assignedDriver', select: 'name email phone role bkashNumber location vehicleInfo' }
      ])
      .sort('-createdAt');

    res.status(200).json({
      success: true,
      count: emergencyRequests.length,
      data: emergencyRequests
    });
  } catch (error) {
    console.error('Get all emergencies error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch emergencies',
      error: error.message
    });
  }
};

// Helper function to calculate distance between two coordinates (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of Earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance in km
}

// Delete emergency request
exports.deleteEmergencyRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const emergencyRequest = await EmergencyRequest.findById(id);

    if (!emergencyRequest) {
      return res.status(404).json({
        success: false,
        message: 'Emergency request not found'
      });
    }

    // Authorization logic:
    // 1. Patient can delete their own emergency
    // 2. Admin can delete any emergency
    // 3. Doctor can delete completed emergencies assigned to them
    // 4. Volunteer can delete completed emergencies assigned to them
    // 5. Driver can delete completed emergencies assigned to them
    const isPatient = emergencyRequest.patient.toString() === userId;
    const isAdmin = userRole === 'admin';
    const isAssignedDoctor = emergencyRequest.assignedDoctor && 
                             emergencyRequest.assignedDoctor.toString() === userId;
    const isAssignedVolunteer = emergencyRequest.assignedVolunteer && 
                                emergencyRequest.assignedVolunteer.toString() === userId;
    const isAssignedDriver = emergencyRequest.assignedDriver && 
                             emergencyRequest.assignedDriver.toString() === userId;
    
    const isAssignedHelper = isAssignedDoctor || isAssignedVolunteer || isAssignedDriver;
    const isCompleted = emergencyRequest.status === 'completed';

    // Check authorization
    if (!isPatient && !isAdmin) {
      // If not patient or admin, check if assigned helper with completed status
      if (!isAssignedHelper) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to delete this emergency request'
        });
      }
      
      // Assigned helpers can only delete completed emergencies
      if (!isCompleted) {
        return res.status(403).json({
          success: false,
          message: 'You can only delete completed emergencies'
        });
      }
    }

    await EmergencyRequest.findByIdAndDelete(id);

    console.log(`🗑️ Emergency request ${id} deleted by ${req.user.name} (${userRole})`);

    res.status(200).json({
      success: true,
      message: 'Emergency request deleted successfully'
    });
  } catch (error) {
    console.error('❌ Delete emergency request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete emergency request',
      error: error.message
    });
  }
};

// Log 999 emergency call
exports.log999Call = async (req, res) => {
  try {
    const { location, timestamp } = req.body;
    const userId = req.user.id;

    // Create a special emergency request for 999 calls
    const emergencyRequest = await EmergencyRequest.create({
      patient: userId,
      location,
      description: '999 Emergency Call - Government Emergency Services',
      urgencyLevel: 'critical',
      status: 'pending',
      notes: `999 call initiated at ${timestamp || new Date().toISOString()}`
    });

    res.status(201).json({
      success: true,
      data: emergencyRequest,
      message: '999 call logged successfully'
    });
  } catch (error) {
    console.error('Log 999 call error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to log 999 call',
      error: error.message
    });
  }
};

module.exports = exports;
