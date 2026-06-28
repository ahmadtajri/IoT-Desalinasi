// User Management Routes
const express = require('express');
const router = express.Router();
const UserController = require('../controllers/UserController');
const { authenticate, requireAdmin } = require('../middleware/auth');

// Change password - requires authentication only (not admin)
router.patch('/change-password', authenticate, UserController.changePassword);

// All routes below require admin authentication
router.use(authenticate);
router.use(requireAdmin);

router.get('/', UserController.getAllUsers);
router.get('/:id', UserController.getUserById);
router.post('/', UserController.createUser);
router.put('/:id', UserController.updateUser);
router.delete('/:id', UserController.deleteUser);
router.patch('/:id/status', UserController.toggleUserStatus);

module.exports = router;
