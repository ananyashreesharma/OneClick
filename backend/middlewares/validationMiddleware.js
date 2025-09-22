const { body, validationResult } = require('express-validator');

// Middleware to check for validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(error => ({
        field: error.path,
        message: error.msg,
        value: error.value
      }))
    });
  }
  next();
};

// Validation rules for user registration
const validateRegistration = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-zA-Z])/)
    .withMessage('Password must contain at least one letter'),
  
  body('displayName')
    .optional()
    .isLength({ min: 2, max: 50 })
    .withMessage('Display name must be between 2 and 50 characters')
    .trim(),
  
  handleValidationErrors
];

// Validation rules for user login
const validateLogin = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  
  handleValidationErrors
];

// Validation rules for note creation/update
const validateNote = [
  body('title')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Title must be less than 200 characters')
    .trim(),
  
  body('content')
    .optional()
    .isLength({ max: 10000 })
    .withMessage('Content must be less than 10,000 characters')
    .trim(),
  
  body('type')
    .optional()
    .isIn(['text', 'draw', 'voice', 'photo', 'supernote'])
    .withMessage('Invalid note type'),
  
  body('mood')
    .optional()
    .isIn(['happy', 'sad', 'excited', 'tired', 'inspired', 'frustrated'])
    .withMessage('Invalid mood value'),
  
  body('isPrivate')
    .optional()
    .isBoolean()
    .withMessage('isPrivate must be a boolean'),
  
  body('pinned')
    .optional()
    .isBoolean()
    .withMessage('pinned must be a boolean'),
  
  body('archived')
    .optional()
    .isBoolean()
    .withMessage('archived must be a boolean'),
  
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  
  body('tags.*')
    .optional()
    .isString()
    .isLength({ max: 50 })
    .withMessage('Each tag must be a string less than 50 characters'),
  
  handleValidationErrors
];

// Validation rules for profile update
const validateProfileUpdate = [
  body('displayName')
    .optional()
    .isLength({ min: 2, max: 50 })
    .withMessage('Display name must be between 2 and 50 characters')
    .trim(),
  
  body('avatar')
    .optional()
    .isURL()
    .withMessage('Avatar must be a valid URL'),
  
  body('preferences.theme')
    .optional()
    .isIn(['light', 'dark', 'auto'])
    .withMessage('Invalid theme value'),
  
  body('preferences.defaultNoteType')
    .optional()
    .isIn(['text', 'draw', 'voice', 'photo', 'supernote'])
    .withMessage('Invalid default note type'),
  
  body('preferences.autoSave')
    .optional()
    .isBoolean()
    .withMessage('autoSave must be a boolean'),
  
  handleValidationErrors
];

// Validation rules for password change
const validatePasswordChange = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long')
    .matches(/^(?=.*[a-zA-Z])/)
    .withMessage('New password must contain at least one letter'),
  
  handleValidationErrors
];

// Validation rules for password reset
const validatePasswordReset = [
  body('resetToken')
    .notEmpty()
    .withMessage('Reset token is required'),
  
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long')
    .matches(/^(?=.*[a-zA-Z])/)
    .withMessage('New password must contain at least one letter'),
  
  handleValidationErrors
];

// Validation rules for forgot password
const validateForgotPassword = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  
  handleValidationErrors
];

module.exports = {
  validateRegistration,
  validateLogin,
  validateNote,
  validateProfileUpdate,
  validatePasswordChange,
  validatePasswordReset,
  validateForgotPassword,
  handleValidationErrors
};
