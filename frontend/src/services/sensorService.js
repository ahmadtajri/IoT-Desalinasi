import api from './api';

const sensorService = {
    async getAll(params = {}) {
        const response = await api.get('/sensors', { params });
        return response.data;
    },

    async getBySensorId(sensorId, limit = 100) {
        const response = await api.get('/sensors', { params: { sensorId, limit } });
        return response.data;
    },

    async getBySensorType(sensorType, limit = 100) {
        const response = await api.get('/sensors', { params: { sensorType, limit } });
        return response.data;
    },

    async create(sensorData) {
        const response = await api.post('/sensors', sensorData);
        return response.data;
    },

    async deleteAll() {
        const response = await api.delete('/sensors');
        return response.data;
    },

    async deleteById(id) {
        const response = await api.delete(`/sensors/${id}`);
        return response.data;
    },

    async deleteByFilter(filterParams) {
        const response = await api.delete('/sensors/filtered', { data: filterParams });
        return response.data;
    },

    async getDatabaseStatus() {
        const response = await api.get('/database/status');
        return response.data;
    },

    async getRealtimeData() {
        const response = await api.get('/sensors/realtime');
        return response.data;
    },

    // Backend Logger Control (per-user)
    async getLoggerStatus() {
        const response = await api.get('/logger/status');
        return response.data;
    },

    // sensorConfig format: { humidity: 'all'|'none', airTemperature: 'all'|'none', waterTemperature: 'all'|'none' }
    async startLogger(sensorConfig = {}, intervalMs = null) {
        const body = {
            humidity: sensorConfig.humidity || 'all',
            airTemperature: sensorConfig.airTemperature || 'all',
            waterTemperature: sensorConfig.waterTemperature || 'all'
        };
        if (intervalMs) body.interval = intervalMs;
        const response = await api.post('/logger/start', body);
        return response.data;
    },

    async stopLogger() {
        const response = await api.post('/logger/stop');
        return response.data;
    },

    async configLogger(interval, sensorConfig = null) {
        const config = { interval };
        if (sensorConfig) {
            config.humidity = sensorConfig.humidity;
            config.airTemperature = sensorConfig.airTemperature;
            config.waterTemperature = sensorConfig.waterTemperature;
        }
        const response = await api.post('/logger/config', config);
        return response.data;
    },

    // Admin: get all active loggers
    async getAllLoggerStatus() {
        const response = await api.get('/logger/all');
        return response.data;
    },

    // Admin: stop all loggers
    async stopAllLoggers() {
        const response = await api.post('/logger/stop-all');
        return response.data;
    },

    // Admin: stop specific user's logger
    async stopLoggerForUser(userId) {
        const response = await api.post(`/logger/stop/${userId}`);
        return response.data;
    },

    exportToCSV(data, filename = 'sensor_data.csv') {
        // Validate data
        if (!data || !Array.isArray(data) || data.length === 0) {
            return false;
        }

        const headers = ['ID', 'Sensor ID', 'Type', 'Value', 'Unit', 'Status', 'Interval (s)', 'Timestamp'];
        const csvContent = [
            headers.join(','),
            ...data.map(row => [
                row.id,
                row.sensor_id,
                row.sensor_type,
                row.value,
                row.unit,
                row.status,
                row.interval || 'N/A',
                `"${new Date(row.timestamp).toLocaleString()}"`
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        return true;
    },

    /**
     * Export sensor data as Excel (.xlsx) with multi-sheet and charts
     * Calls backend API to generate the Excel file
     * @param {Object} params - Query parameters (sensorTypes, limit)
     * @returns {Promise<boolean>} - true if successful
     */
    async exportToExcel(params = {}) {
        try {
            const queryParams = {};
            if (params.sensorTypes && params.sensorTypes.length > 0) {
                queryParams.sensorTypes = params.sensorTypes.join(',');
            }
            if (params.limit) {
                queryParams.limit = params.limit;
            }

            const response = await api.get('/sensors/export-excel', {
                params: queryParams,
                responseType: 'blob'
            });

            // Extract filename from Content-Disposition header or use default
            const contentDisposition = response.headers['content-disposition'];
            let fileName = `Laporan_Desalinasi_${new Date().toISOString().slice(0, 10)}.xlsx`;
            if (contentDisposition) {
                const match = contentDisposition.match(/filename="?([^";\n]+)"?/);
                if (match) fileName = match[1];
            }

            // Create download link
            const blob = new Blob([response.data], {
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', fileName);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            return true;
        } catch (error) {
            console.error('Error exporting to Excel:', error);
            throw error;
        }
    }
};

export default sensorService;
