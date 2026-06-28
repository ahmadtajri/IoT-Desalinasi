// Authentication Routes
const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/AuthController');
const { authenticate, requireAdmin } = require('../middleware/auth');

// Public routes
router.post('/login', AuthController.login);
router.post('/refresh', AuthController.refreshToken);
router.post('/register', AuthController.register);

// Protected routes
router.get('/me', authenticate, AuthController.getCurrentUser);
router.put('/account', authenticate, AuthController.updateAccount);
router.post('/logout', authenticate, AuthController.logout);

module.exports = router;
