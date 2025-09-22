const multer = require('multer');
const path = require('path');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // You can customize this based on file type
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter to accept only specific file types
const fileFilter = (req, file, cb) => {
  // Accept audio files
  if (file.mimetype.startsWith('audio/')) {
    cb(null, true);
  }
  // Accept image files
  else if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  }
  // Accept drawing files (SVG, etc.)
  else if (file.mimetype === 'image/svg+xml' || file.originalname.endsWith('.svg')) {
    cb(null, true);
  }
  // Reject other file types
  else {
    cb(new Error('Invalid file type. Only audio, image, and drawing files are allowed.'), false);
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 1 // Only allow 1 file per request
  }
});

// Error handling middleware for multer
const handleUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 10MB.'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files. Only 1 file allowed per request.'
      });
    }
  }
  
  if (error.message.includes('Invalid file type')) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }

  next(error);
};

// Middleware to process uploaded files and add metadata
const processUploadedFile = (req, res, next) => {
  if (req.file) {
    // Add file metadata to request
    req.file.url = `/uploads/${req.file.filename}`;
    req.file.size = req.file.size;
    
    // Add file info to response for client
    req.fileInfo = {
      originalName: req.file.originalname,
      filename: req.file.filename,
      url: req.file.url,
      size: req.file.size,
      mimetype: req.file.mimetype
    };
  }
  next();
};

module.exports = {
  upload,
  handleUploadError,
  processUploadedFile
};
