import api from './api';

const sensorConfigService = {
    // ============== CATEGORY MANAGEMENT ==============

    /**
     * Get all sensor categories
     */
    async getCategories() {
        const response = await api.get('/sensor-config/categories');
        return response.data;
    },

    /**
     * Create or update a sensor category
     */
    async upsertCategory(category) {
        const response = await api.post('/sensor-config/categories', category);
        return response.data;
    },


    // ============== SENSOR CONFIG MANAGEMENT ==============

    /**
     * Get all sensor configurations
     */
    async getAll() {
        const response = await api.get('/sensor-config');
        return response.data;
    },

    /**
     * Get discovered sensors (detected by MQTT but maybe not configured)
     */
    async getDiscovered() {
        const response = await api.get('/sensor-config/discovered');
        return response.data;
    },

    /**
     * Get sensor config map (for display name lookup)
     * Returns { "T1": { displayName: "...", ... }, ... }
     */
    async getMap() {
        const response = await api.get('/sensor-config/map');
        return response.data;
    },

    /**
     * Get sensor config by sensor ID
     */
    async getBySensorId(sensorId) {
        const response = await api.get(`/sensor-config/${sensorId}`);
        return response.data;
    },

    /**
     * Create or update sensor config
     */
    async upsert(config) {
        const response = await api.post('/sensor-config', config);
        return response.data;
    },

    /**
     * Bulk create/update sensor configs
     */
    async bulkUpsert(configs) {
        const response = await api.post('/sensor-config/bulk', { configs });
        return response.data;
    },

    /**
     * Toggle sensor enabled status
     */
    async toggle(sensorId) {
        const response = await api.patch(`/sensor-config/${sensorId}/toggle`);
        return response.data;
    },

    /**
     * Delete sensor config
     */
    async delete(sensorId) {
        const response = await api.delete(`/sensor-config/${sensorId}`);
        return response.data;
    },

    /**
     * Auto-register all discovered sensors
     * Creates placeholder configs for unconfigured sensors
     */
    async autoRegister() {
        const response = await api.post('/sensor-config/auto-register');
        return response.data;
    },

    /**
     * Helper: Get display name for a sensor ID
     * Falls back to sensor ID if no config found
     */
    getDisplayName(sensorId, configMap) {
        if (configMap && configMap[sensorId]) {
            return configMap[sensorId].displayName;
        }
        return sensorId;
    },

    /**
     * Helper: Format sensor value with unit
     */
    formatValue(value, sensorId, configMap) {
        if (value === null || value === undefined) return '-';

        const unit = configMap?.[sensorId]?.unit || '';
        return `${value.toFixed(1)}${unit}`;
    }
};

export default sensorConfigService;
