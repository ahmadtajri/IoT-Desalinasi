const express = require('express');
const router = express.Router();
const DailyLogController = require('../controllers/DailyLogController');
const { requireAdmin } = require('../middleware/auth');

// GET /api/daily-logs
//   Admin  → mengembalikan semua log semua user
//   User   → mengembalikan hanya log milik sendiri
router.get('/', DailyLogController.getAll);

// GET /api/daily-logs/:id/download - Download CSV (ownership check di controller)
router.get('/:id/download', DailyLogController.download);

// POST /api/daily-logs/generate - Trigger manual (Admin only)
router.post('/generate', requireAdmin, DailyLogController.triggerManual);

// DELETE /api/daily-logs/:id - Hapus log (Admin = hard delete, User = soft delete)
router.delete('/:id', DailyLogController.delete);

module.exports = router;
