const MedicalRecord = require('../models/MedicalRecord');
const path = require('path');
const fs = require('fs').promises;

// @desc    Upload medical file
// @route   POST /api/medical-records/upload
// @access  Private
exports.uploadMedicalFile = async (req, res) => {
  try {
    console.log('📤 Medical file upload request received');
    console.log('User:', req.user);
    console.log('File:', req.file);
    console.log('Body:', req.body);

    const userId = req.user.id || req.user._id;
    const { type, description } = req.body;

    if (!req.file) {
      console.error('❌ No file uploaded');
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    // Create a standalone medical file record (not tied to emergency)
    const medicalFile = {
      type: type || 'other',
      fileName: req.file.originalname,
      fileUrl: `/uploads/${req.file.fieldname}/${req.file.filename}`,
      uploadedBy: userId,
      uploadedAt: new Date(),
      description: description || ''
    };

    console.log('📄 Medical file object:', medicalFile);

    // Find or create a general medical record for the user
    let medicalRecord = await MedicalRecord.findOne({
      patient: userId,
      emergencyRequest: null // General records not tied to specific emergency
    });

    if (!medicalRecord) {
      console.log('📝 Creating new medical record');
      medicalRecord = await MedicalRecord.create({
        patient: userId,
        doctor: userId, // Self-uploaded
        medicalFiles: [medicalFile],
        status: 'active'
      });
    } else {
      console.log('📝 Adding to existing medical record');
      medicalRecord.medicalFiles.push(medicalFile);
      await medicalRecord.save();
    }

    console.log('✅ File uploaded successfully');
    res.status(201).json({
      success: true,
      message: 'File uploaded successfully',
      data: medicalFile
    });

  } catch (error) {
    console.error('❌ Upload medical file error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Error uploading file',
      error: error.message
    });
  }
};

// @desc    Get all medical records for user
// @route   GET /api/medical-records/my-records
// @route   GET /api/medical-records/user/:userId (for doctors)
// @access  Private
exports.getMyMedicalRecords = async (req, res) => {
  try {
    // Allow doctors to fetch patient records
    const userId = req.params.userId || req.user.id;
    
    // If fetching someone else's records, verify user is a doctor
    if (req.params.userId && req.params.userId !== req.user.id) {
      if (!['doctor', 'admin'].includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Only doctors can view patient records.'
        });
      }
    }

    const medicalRecords = await MedicalRecord.find({
      patient: userId
    }).populate('doctor', 'name specialization')
      .populate('emergencyRequest')
      .sort({ createdAt: -1 });

    // Return full medical records for doctors, not just files
    if (req.params.userId && req.user.role === 'doctor') {
      return res.status(200).json({
        success: true,
        count: medicalRecords.length,
        data: medicalRecords
      });
    }

    // Flatten all medical files from all records for patients
    let allFiles = [];
    medicalRecords.forEach(record => {
      if (record.medicalFiles && record.medicalFiles.length > 0) {
        record.medicalFiles.forEach(file => {
          allFiles.push({
            ...file.toObject(),
            recordId: record._id,
            emergencyId: record.emergencyRequest?._id
          });
        });
      }
    });

    res.status(200).json({
      success: true,
      count: allFiles.length,
      data: allFiles
    });

  } catch (error) {
    console.error('Get medical records error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching medical records',
      error: error.message
    });
  }
};

// @desc    Get specific medical record
// @route   GET /api/medical-records/:id
// @access  Private
exports.getMedicalRecordById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const medicalRecord = await MedicalRecord.findById(id)
      .populate('patient', 'name email phone')
      .populate('doctor', 'name specialization')
      .populate('emergencyRequest');

    if (!medicalRecord) {
      return res.status(404).json({
        success: false,
        message: 'Medical record not found'
      });
    }

    // Check if user has access (patient or doctor)
    if (medicalRecord.patient._id.toString() !== userId && 
        medicalRecord.doctor._id.toString() !== userId &&
        req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.status(200).json({
      success: true,
      data: medicalRecord
    });

  } catch (error) {
    console.error('Get medical record error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching medical record',
      error: error.message
    });
  }
};

// @desc    Create or update medical record information
// @route   POST /api/medical-records
// @access  Private
exports.createMedicalRecord = async (req, res) => {
  try {
    console.log('📝 Create/Update medical record request');
    console.log('User ID:', req.user.id || req.user._id);
    console.log('Body:', req.body);
    
    const userId = req.user.id || req.user._id;
    const { title, diagnosis, medications, allergies, bloodType, chronicConditions, notes } = req.body;

    // Find existing general record or create new
    let medicalRecord = await MedicalRecord.findOne({
      patient: userId,
      emergencyRequest: null
    });

    if (!medicalRecord) {
      console.log('📝 Creating new medical record');
      medicalRecord = await MedicalRecord.create({
        patient: userId,
        doctor: userId,
        title,
        diagnosis: { primary: diagnosis },
        medications: Array.isArray(medications) ? medications : [],
        allergies: Array.isArray(allergies) ? allergies : [],
        bloodType,
        chronicConditions,
        notes,
        status: 'active'
      });
      console.log('✅ Medical record created:', medicalRecord._id);
    } else {
      console.log('📝 Updating existing medical record:', medicalRecord._id);
      // Update existing
      medicalRecord.title = title || medicalRecord.title;
      medicalRecord.diagnosis = { primary: diagnosis };
      medicalRecord.medications = Array.isArray(medications) ? medications : [];
      medicalRecord.allergies = Array.isArray(allergies) ? allergies : [];
      medicalRecord.bloodType = bloodType || medicalRecord.bloodType;
      medicalRecord.chronicConditions = chronicConditions || medicalRecord.chronicConditions;
      medicalRecord.notes = notes || medicalRecord.notes;
      await medicalRecord.save();
      console.log('✅ Medical record updated');
    }

    res.status(201).json({
      success: true,
      message: 'Medical record saved successfully',
      data: medicalRecord
    });
  } catch (error) {
    console.error('❌ Create medical record error:', error);
    res.status(500).json({
      success: false,
      message: 'Error saving medical record',
      error: error.message
    });
  }
};

// @desc    Update medical record
// @route   PUT /api/medical-records/:id
// @access  Private
exports.updateMedicalRecord = async (req, res) => {
  try {
    console.log('📝 Update medical record request');
    console.log('Record ID:', req.params.id);
    console.log('User ID:', req.user.id || req.user._id);
    console.log('Body:', req.body);
    
    const { id } = req.params;
    const userId = req.user.id || req.user._id;
    const { title, diagnosis, medications, allergies, bloodType, chronicConditions, notes } = req.body;

    const medicalRecord = await MedicalRecord.findById(id);

    if (!medicalRecord) {
      console.error('❌ Medical record not found');
      return res.status(404).json({
        success: false,
        message: 'Medical record not found'
      });
    }

    // Check if user owns the record
    if (medicalRecord.patient.toString() !== userId && req.user.role !== 'admin') {
      console.error('❌ Access denied');
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Update fields
    medicalRecord.title = title || medicalRecord.title;
    medicalRecord.diagnosis = { primary: diagnosis };
    medicalRecord.medications = Array.isArray(medications) ? medications : [];
    medicalRecord.allergies = Array.isArray(allergies) ? allergies : [];
    medicalRecord.bloodType = bloodType || medicalRecord.bloodType;
    medicalRecord.chronicConditions = chronicConditions || medicalRecord.chronicConditions;
    medicalRecord.notes = notes || medicalRecord.notes;

    await medicalRecord.save();
    console.log('✅ Medical record updated successfully');

    res.status(200).json({
      success: true,
      message: 'Medical record updated successfully',
      data: medicalRecord
    });
  } catch (error) {
    console.error('❌ Update medical record error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating medical record',
      error: error.message
    });
  }
};

// @desc    Delete medical file
// @route   DELETE /api/medical-records/:id/file/:fileId
// @access  Private
exports.deleteMedicalFile = async (req, res) => {
  try {
    console.log('🗑️ Delete medical file request received');
    const { id, fileId } = req.params;
    const userId = req.user.id || req.user._id;
    
    console.log('Record ID:', id);
    console.log('File ID:', fileId);
    console.log('User ID:', userId);

    const medicalRecord = await MedicalRecord.findById(id);

    if (!medicalRecord) {
      console.error('❌ Medical record not found');
      return res.status(404).json({
        success: false,
        message: 'Medical record not found'
      });
    }

    console.log('Found record with', medicalRecord.medicalFiles.length, 'files');

    // Check if user owns the record
    if (medicalRecord.patient.toString() !== userId && req.user.role !== 'admin') {
      console.error('❌ Access denied - user does not own this record');
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Find and remove the file
    const fileIndex = medicalRecord.medicalFiles.findIndex(
      f => f._id.toString() === fileId
    );

    if (fileIndex === -1) {
      console.error('❌ File not found in record');
      console.log('Available file IDs:', medicalRecord.medicalFiles.map(f => f._id.toString()));
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    const file = medicalRecord.medicalFiles[fileIndex];
    console.log('📄 Found file:', file.fileName);
    
    // Delete physical file
    try {
      const filePath = path.join(__dirname, '..', file.fileUrl);
      console.log('Deleting physical file:', filePath);
      await fs.unlink(filePath);
      console.log('✅ Physical file deleted');
    } catch (err) {
      console.error('⚠️ Error deleting physical file (continuing anyway):', err.message);
    }

    // Remove from array
    medicalRecord.medicalFiles.splice(fileIndex, 1);
    await medicalRecord.save();

    console.log('✅ File deleted successfully from database');
    res.status(200).json({
      success: true,
      message: 'File deleted successfully'
    });

  } catch (error) {
    console.error('❌ Delete medical file error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Error deleting file',
      error: error.message
    });
  }
};
