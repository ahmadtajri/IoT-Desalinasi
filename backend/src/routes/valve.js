const express = require('express');
const router = express.Router();
const ValveController = require('../controllers/ValveController');
const { authenticate } = require('../middleware/auth');

/**
 * Valve Control Routes
 * All routes require authentication
 */

// Get current valve status
router.get('/status', authenticate, ValveController.getStatus);

// Control valve (ON/OFF)
router.post('/control', authenticate, ValveController.control);

// Switch control mode (AUTO/MANUAL)
router.post('/mode', authenticate, ValveController.setMode);

// Set auto-control thresholds
router.post('/thresholds', authenticate, ValveController.setThresholds);

module.exports = router;
