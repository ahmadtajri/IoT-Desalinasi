// Logger Interval Routes
const express = require('express');
const router = express.Router();
const IntervalController = require('../controllers/IntervalController');
const { authenticate, requireAdmin } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// Get all available intervals (users see all, can select active)
router.get('/', IntervalController.getAllIntervals);

// User can get their own active interval
router.get('/active', IntervalController.getActiveInterval);

// User can set their own active interval
router.patch('/:id/activate', IntervalController.setActiveInterval);

// Admin-only routes for managing GLOBAL intervals
router.post('/', requireAdmin, IntervalController.createInterval);
router.put('/:id', requireAdmin, IntervalController.updateInterval);
router.delete('/:id', requireAdmin, IntervalController.deleteInterval);

module.exports = router;
