const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middlewares/authMiddleware');
const { validateRegistration, validateLogin } = require('../middlewares/validationMiddleware');

// Public routes (no authentication required)
router.post('/register', validateRegistration, authController.register);
router.post('/login', validateLogin, authController.login);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

// Protected routes (authentication required)
router.use(authenticateToken);
router.get('/profile', authController.getProfile);
router.put('/profile', authController.updateProfile);
router.put('/change-password', authController.changePassword);
router.post('/logout', authController.logout);
router.delete('/account', authController.deleteAccount);

module.exports = router;
