/**
 * Sensor Config Routes
 * Routes for managing sensor custom names and settings
 * 
 * NEW: Supports flexible sensor mapping system
 * - /categories - Manage sensor categories
 * - /discovered - View auto-discovered sensors
 * - /auto-register - Auto-register new sensors
 */

const express = require('express');
const router = express.Router();
const SensorConfigController = require('../controllers/SensorConfigController');
const { authenticate, requireAdmin } = require('../middleware/auth');

// ============== CATEGORY ROUTES ==============
// Get all categories (public for frontend display)
router.get('/categories', SensorConfigController.getAllCategories);

// Admin-only category management
router.post('/categories', authenticate, requireAdmin, SensorConfigController.upsertCategory);

// ============== SENSOR CONFIG ROUTES ==============
// Public routes (for frontend to get sensor display names)
router.get('/', SensorConfigController.getAll);
router.get('/map', SensorConfigController.getMap);
router.get('/discovered', authenticate, requireAdmin, SensorConfigController.getDiscovered);
router.get('/:sensorId', SensorConfigController.getBySensorId);

// Admin-only routes
router.post('/', authenticate, requireAdmin, SensorConfigController.upsert);
router.post('/bulk', authenticate, requireAdmin, SensorConfigController.bulkUpsert);
router.post('/auto-register', authenticate, requireAdmin, SensorConfigController.autoRegister);
router.patch('/:sensorId/toggle', authenticate, requireAdmin, SensorConfigController.toggle);
router.delete('/:sensorId', authenticate, requireAdmin, SensorConfigController.delete);

module.exports = router;
