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

    async delete(id) {
        const response = await api.delete(`/sensors/${id}`);
        return response.data;
    },

    async deleteAll() {
        const response = await api.delete('/sensors');
        return response.data;
    },

    async deleteBySensorId(sensorId) {
        const response = await api.delete(`/sensors/sensor/${sensorId}`);
        return response.data;
    },

    async deleteBySensorType(sensorType) {
        const response = await api.delete(`/sensors/type/${sensorType}`);
        return response.data;
    },

    async deleteByInterval(interval) {
        const response = await api.delete(`/sensors/interval/${interval}`);
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

    // Backend Logger Control
    async getLoggerStatus() {
        const response = await api.get('/logger/status');
        return response.data;
    },

    // sensorConfig format: { humidity: 'all'|'none'|'RH1', temperature: 'all'|'none'|'T5' }
    async startLogger(sensorConfig = {}) {
        const response = await api.post('/logger/start', {
            humidity: sensorConfig.humidity || 'all',
            temperature: sensorConfig.temperature || 'all'
        });
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
            config.temperature = sensorConfig.temperature;
        }
        const response = await api.post('/logger/config', config);
        return response.data;
    },

    exportToCSV(data, filename = 'sensor_data.csv') {
        // Validate data
        if (!data || !Array.isArray(data) || data.length === 0) {
            console.warn('exportToCSV: No data to export');
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
    }
};

export default sensorService;
