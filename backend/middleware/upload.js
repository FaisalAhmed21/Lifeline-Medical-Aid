const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let fieldDir;
    if (file.fieldname === 'profilePicture') {
      fieldDir = path.join(uploadsDir, 'profiles');
    } else {
      fieldDir = path.join(uploadsDir, file.fieldname);
    }
    if (!fs.existsSync(fieldDir)) {
      fs.mkdirSync(fieldDir, { recursive: true });
    }
    cb(null, fieldDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const userId = req.user?.id || req.user?._id || 'user';
    cb(null, userId + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter - allow images, PDFs, and documents
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|pdf|doc|docx/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = /jpeg|jpg|png|pdf|msword|vnd\.openxmlformats-officedocument\.wordprocessingml\.document/.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only images (JPEG, PNG), PDF files, and Word documents are allowed!'));
  }
};

// Multer upload configuration
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: fileFilter
});

module.exports = upload;
