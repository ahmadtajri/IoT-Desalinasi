import api from "./api";

const dailyLogService = {
  /**
   * Get all daily logs
   */
  async getAll() {
    const response = await api.get("/daily-logs");
    return response.data;
  },

  /**
   * Download a CSV log file
   */
  async download(id, fileName) {
    const response = await api.get(`/daily-logs/${id}/download`, {
      responseType: "blob",
    });

    // Create download link
    const blob = new Blob([response.data], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", downloadName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  /**
   * Delete a daily log
   */
  async delete(id) {
    const response = await api.delete(`/daily-logs/${id}`);
    return response.data;
  },

  /**
   * Manually trigger daily log generation
   */
  async generateManual() {
    const response = await api.post("/daily-logs/generate");
    return response.data;
  },
};

export default dailyLogService;
