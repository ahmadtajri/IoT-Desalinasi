// Schema Routes
const express = require('express');
const router = express.Router();
const schemaController = require('../controllers/SchemaController');
const { authenticate, requireAdmin } = require('../middleware/auth');

// Public routes
router.get('/', schemaController.getActiveSchema); // Get active schema

// Admin-only routes
router.get('/all', authenticate, requireAdmin, schemaController.getAllSchemas); // Get all schemas
router.get('/:id', authenticate, requireAdmin, schemaController.getSchemaById); // Get specific schema
router.post('/', authenticate, requireAdmin, schemaController.uploadSchema); // Upload new schema
router.put('/:id', authenticate, requireAdmin, schemaController.updateSchema); // Update schema
router.patch('/:id/activate', authenticate, requireAdmin, schemaController.setActiveSchema); // Set active
router.delete('/:id', authenticate, requireAdmin, schemaController.deleteSchema); // Delete schema

module.exports = router;
