const DailyLogService = require("../services/DailyLogService");
const ExcelExportService = require("../services/ExcelExportService");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const DailyLogController = {
  /**
   * GET /api/daily-logs - List all daily logs
   */
  getAll: async (req, res) => {
    try {
      const logs = await DailyLogService.getAll();
      res.json({ success: true, data: logs });
    } catch (error) {
      console.error("[DailyLog] Error fetching logs:", error);
      res
        .status(500)
        .json({ success: false, message: "Gagal mengambil data log" });
    }
  },

  /**
   * GET /api/daily-logs/:id/download - Download CSV file
   * Ownership check: user hanya bisa download log milik sendiri
   */
  download: async (req, res) => {
    try {
      const log = await DailyLogService.getById(req.params.id);
      if (!log) {
        return res
          .status(404)
          .json({ success: false, message: "Log tidak ditemukan" });
      }

      // Ownership check: non-admin only allowed to download their own logs
      const isAdmin = req.user?.role === "ADMIN";
      if (!isAdmin && log.userId !== req.user?.id) {
        return res
          .status(403)
          .json({ success: false, message: "Akses ditolak" });
      }

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${log.fileName}"`,
      );
      res.send(log.csvContent);
    } catch (error) {
      console.error("[DailyLog] Error downloading log:", error);
      res.status(500).json({ success: false, message: "Gagal mengunduh log" });
    }
  },

  /**
   * DELETE /api/daily-logs/:id - Delete a log
   */
  delete: async (req, res) => {
    try {
      await DailyLogService.deleteById(req.params.id);
      res.json({ success: true, message: "Log berhasil dihapus" });
    } catch (error) {
      console.error("[DailyLog] Error deleting log:", error);
      res.status(500).json({ success: false, message: "Gagal menghapus log" });
    }
  },

  /**
   * POST /api/daily-logs/generate - Manually trigger log generation
   */
  triggerManual: async (req, res) => {
    try {
      const result = await DailyLogService.generateDailyLogs();
      if (result.success) {
        res.json({
          success: true,
          message: `Berhasil generate ${result.count} log untuk tanggal ${result.date}`,
          data: result,
        });
      } else {
        res.status(500).json({ success: false, message: result.error });
      }
    } catch (error) {
      console.error("[DailyLog] Error manual trigger:", error);
      res.status(500).json({ success: false, message: "Gagal generate log" });
    }
  },
};

module.exports = DailyLogController;
