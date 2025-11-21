const fs = require('fs');
const path = require('path');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const Prescription = require('../models/Prescription');
const Order = require('../models/Order');
const EmergencyRequest = require('../models/EmergencyRequest');
const Chat = require('../models/Chat');

const prescriptionDir = path.join(__dirname, '..', 'uploads', 'prescriptions');

const ensurePrescriptionDirectory = () => {
  if (!fs.existsSync(prescriptionDir)) {
    fs.mkdirSync(prescriptionDir, { recursive: true });
  }
};

const buildDownloadUrl = (req, relativePath) => {
  if (!relativePath) return null;
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  return `${baseUrl}${relativePath}`;
};

exports.getPrescriptionContext = async (req, res) => {
  try {
    const { emergencyId } = req.params;
    const emergency = await EmergencyRequest.findById(emergencyId)
      .populate('patient', 'name email phone role age gender')
      .populate('assignedDoctor', 'name email phone role specialization experience bkashNumber prescriptionFee');

    if (!emergency) {
      return res.status(404).json({
        success: false,
        message: 'Emergency request not found'
      });
    }

    const requesterId = req.user.id;
    const isPatient = emergency.patient._id.toString() === requesterId;
    const isDoctor = emergency.assignedDoctor && emergency.assignedDoctor._id.toString() === requesterId;
    const isAdmin = req.user.role === 'admin';

    if (!isPatient && !isDoctor && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this prescription context'
      });
    }

    let order = null;
    let prescription = null;

    if (emergency.assignedDoctor) {
      // Only find orders that are not cancelled - cancelled orders mean payment reset is required
      // Also ensure order was created after the doctor was assigned (to handle reassignment cases)
      const query = {
        patientId: emergency.patient._id,
        doctorId: emergency.assignedDoctor._id,
        emergencyId: emergencyId,
        serviceType: 'PRESCRIPTION',
        status: { $nin: ['cancelled'] } // Explicitly exclude cancelled orders
      };
      
      // If doctor was assigned at a specific time, only consider orders created after that
      // This ensures we don't show orders/prescriptions from before a reassignment
      if (emergency.assignedAt) {
        const assignedAtDate = new Date(emergency.assignedAt);
        query.createdAt = { $gte: assignedAtDate };
        console.log(`🔍 Looking for orders created after doctor assignment: ${assignedAtDate.toISOString()}`);
      }
      
      order = await Order.findOne(query)
        .sort({ createdAt: -1 })
        .populate('prescriptionId');

      // Only show prescription if:
      // 1. Order exists and is valid (not cancelled) - double check status
      // 2. Prescription exists
      // 3. Prescription was created after the doctor was assigned (to handle reassignments)
      // 4. Order was created after doctor assignment (additional safeguard)
      if (order) {
        // Double-check order status - never show cancelled orders
        if (order.status === 'cancelled') {
          console.log(`⚠️ Order ${order.orderId} is cancelled - hiding prescription`);
          order = null;
          prescription = null;
        } else if (order.prescriptionId) {
          const prescriptionDoc = order.prescriptionId;
          
          // Check if order was created after doctor assignment
          const orderCreatedAfterAssignment = !emergency.assignedAt || new Date(order.createdAt) >= new Date(emergency.assignedAt);
          
          // Check if prescription was created after doctor assignment
          const prescriptionCreatedAfterAssignment = !emergency.assignedAt || new Date(prescriptionDoc.createdAt) >= new Date(emergency.assignedAt);
          
          if (orderCreatedAfterAssignment && prescriptionCreatedAfterAssignment) {
            prescription = prescriptionDoc.toObject();
            prescription.downloadUrl = buildDownloadUrl(req, prescription.pdfUrl);
          } else {
            // Order or prescription is from before current assignment - don't show it
            console.log(`⚠️ Order/Prescription was created before current doctor assignment`);
            console.log(`   Order created: ${order.createdAt}, Assigned at: ${emergency.assignedAt}`);
            console.log(`   Prescription created: ${prescriptionDoc.createdAt}, Assigned at: ${emergency.assignedAt}`);
            order = null;
            prescription = null;
          }
        }
      }
    }

    res.json({
      success: true,
      data: {
        doctor: emergency.assignedDoctor,
        patient: emergency.patient,
        order,
        prescription
      }
    });
  } catch (error) {
    console.error('Error loading prescription context:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load prescription context',
      error: error.message
    });
  }
};

exports.issuePrescription = async (req, res) => {
  try {
    if (req.user.role !== 'doctor') {
      return res.status(403).json({
        success: false,
        message: 'Only doctors can issue prescriptions'
      });
    }

    const { emergencyId, orderId, medicines, notes, followUpDate } = req.body;

    if (!emergencyId || !orderId) {
      return res.status(400).json({
        success: false,
        message: 'emergencyId and orderId are required'
      });
    }

    if (!Array.isArray(medicines) || medicines.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one medicine is required'
      });
    }

    const hasInvalidMedicine = medicines.some(
      (med) => !med || !med.name || !med.dose || !med.duration
    );

    if (hasInvalidMedicine) {
      return res.status(400).json({
        success: false,
        message: 'Each medicine needs name, dose, and duration'
      });
    }

    const order = await Order.findOne({ orderId })
      .populate('patientId doctorId prescriptionId');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    if (order.serviceType !== 'PRESCRIPTION' || order.status !== 'paid') {
      return res.status(400).json({
        success: false,
        message: 'Prescription order must be paid before issuing'
      });
    }

    if (order.doctorId._id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You are not the assigned doctor for this order'
      });
    }

    if (order.prescriptionId) {
      return res.status(400).json({
        success: false,
        message: 'A prescription has already been issued for this order'
      });
    }

    const emergency = await EmergencyRequest.findById(emergencyId)
      .populate('patient', 'name age gender')
      .populate('assignedDoctor', 'name specialization experience');

    if (!emergency) {
      return res.status(404).json({
        success: false,
        message: 'Emergency request not found'
      });
    }

    if (emergency.assignedDoctor?._id.toString() !== req.user.id ||
        emergency.patient._id.toString() !== order.patientId._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Emergency, patient, and order information do not match'
      });
    }

    const chat = await Chat.findOne({ emergency: emergencyId, isActive: true }).select('_id');

    const prescription = new Prescription({
      order: order._id,
      patient: order.patientId._id,
      doctor: order.doctorId._id,
      emergency: emergencyId,
      chat: chat?._id,
      medicines,
      notes,
      followUpDate
    });

    ensurePrescriptionDirectory();

    const pdfFileName = `prescription-${prescription._id}.pdf`;
    const pdfPath = path.join(prescriptionDir, pdfFileName);

    await generatePrescriptionPdf({
      prescription,
      emergency,
      pdfPath
    });

    prescription.pdfUrl = `/uploads/prescriptions/${pdfFileName}`;
    await prescription.save();

    order.prescriptionId = prescription._id;
    order.status = 'completed';
    await order.save();

    // Emit Socket.IO event to notify any connected clients in the emergency room
    // that a prescription has been issued. This allows other browser tabs/devices
    // to refresh UI (e.g., re-check blocking paid prescription orders) in real-time.
    try {
      const serverModule = require('../server');
      const io = serverModule && serverModule.io;
      if (io) {
        const payload = {
          emergencyId,
          prescriptionId: prescription._id.toString(),
          orderId: order.orderId,
          doctorId: order.doctorId?._id ? order.doctorId._id.toString() : (order.doctorId || null),
          patientId: order.patientId?._id ? order.patientId._id.toString() : (order.patientId || null)
        };

        // Notify all sockets in the emergency room
        io.to(`emergency_${emergencyId}`).emit('prescriptionIssued', payload);

        // Also notify the patient directly if connected
        if (payload.patientId) {
          io.to(`user_${payload.patientId}`).emit('prescriptionIssued', payload);
        }

        console.log(`🔔 Emitted prescriptionIssued for emergency ${emergencyId}`);
      }
    } catch (emitErr) {
      console.warn('Could not emit prescriptionIssued socket event:', emitErr.message || emitErr);
    }

    const response = prescription.toObject();
    response.downloadUrl = buildDownloadUrl(req, prescription.pdfUrl);

    res.status(201).json({
      success: true,
      data: response
    });
  } catch (error) {
    console.error('Error issuing prescription:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to issue prescription',
      error: error.message
    });
  }
};

const generatePrescriptionPdf = async ({ prescription, emergency, pdfPath }) => {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  let cursorY = 800;

  const drawText = (text, options = {}) => {
    const {
      x = 40,
      y = cursorY,
      size = 12,
      fontType = font,
      color = rgb(0, 0, 0)
    } = options;

    page.drawText(text, { x, y, size, font: fontType, color });
    cursorY = y - size - 6;
  };

  drawText('Detailed Prescription', { size: 20, fontType: boldFont });
  drawText(`Date: ${new Date().toLocaleDateString()}`, { size: 10 });
  cursorY -= 10;

  drawText('Doctor Information', { fontType: boldFont, size: 14 });
  drawText(`Name: ${emergency.assignedDoctor.name}`);
  if (emergency.assignedDoctor.specialization) {
    drawText(`Specialization: ${emergency.assignedDoctor.specialization}`);
  }
  if (emergency.assignedDoctor.experience) {
    drawText(`Experience: ${emergency.assignedDoctor.experience} years`);
  }

  cursorY -= 10;
  drawText('Patient Information', { fontType: boldFont, size: 14 });
  drawText(`Name: ${emergency.patient.name}`);
  if (emergency.patient.gender) {
    drawText(`Gender: ${emergency.patient.gender}`);
  }
  if (emergency.patient.age) {
    drawText(`Age: ${emergency.patient.age}`);
  }

  cursorY -= 10;
  drawText('Medicines', { fontType: boldFont, size: 14 });

  prescription.medicines.forEach((med, index) => {
    cursorY -= 6;
    drawText(`${index + 1}. ${med.name}`, { fontType: boldFont });
    drawText(`   Dose: ${med.dose}`);
    drawText(`   Duration: ${med.duration}`);
    if (med.instructions) {
      drawText(`   Instructions: ${med.instructions}`);
    }
    cursorY -= 4;
  });

  if (prescription.notes) {
    cursorY -= 10;
    drawText('Notes', { fontType: boldFont, size: 14 });
    drawWrappedText(page, font, prescription.notes, 40, cursorY, 515, 12);
    cursorY -= 40;
  }

  if (prescription.followUpDate) {
    drawText(`Follow-Up Date: ${new Date(prescription.followUpDate).toLocaleDateString()}`);
  }

  drawText('Signature ______________________', { y: 60 });

  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync(pdfPath, pdfBytes);
};

const drawWrappedText = (page, font, text, x, y, maxWidth, fontSize) => {
  const words = text.split(' ');
  let line = '';
  let cursorY = y;

  words.forEach(word => {
    const testLine = `${line}${word} `;
    const lineWidth = font.widthOfTextAtSize(testLine, fontSize);

    if (lineWidth > maxWidth && line !== '') {
      page.drawText(line, { x, y: cursorY, size: fontSize, font });
      line = `${word} `;
      cursorY -= fontSize + 4;
    } else {
      line = testLine;
    }
  });

  if (line.trim()) {
    page.drawText(line.trim(), { x, y: cursorY, size: fontSize, font });
  }
};

