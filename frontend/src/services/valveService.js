import api from './api';

/**
 * Valve Service
 * Handles valve control API calls
 */

class ValveService {
    /**
     * Get current valve status
     */
    async getStatus() {
        try {
            const response = await api.get('/valve/status');
            return response.data;
        } catch (error) {
            console.error('Error getting valve status:', error);
            throw error;
        }
    }

    /**
     * Control valve (ON/OFF)
     * @param {string} command - "on" or "off"
     */
    async control(command) {
        try {
            const response = await api.post('/valve/control', { command });
            return response.data;
        } catch (error) {
            console.error('Error controlling valve:', error);
            throw error;
        }
    }

    /**
     * Set control mode (AUTO/MANUAL)
     * @param {string} mode - "auto" or "manual"
     */
    async setMode(mode) {
        try {
            const response = await api.post('/valve/mode', { mode });
            return response.data;
        } catch (error) {
            console.error('Error setting valve mode:', error);
            throw error;
        }
    }

    /**
     * Set auto-control thresholds
     * @param {number} onThreshold - Distance to turn valve ON (cm)
     * @param {number} offThreshold - Distance to turn valve OFF (cm)
     */
    async setThresholds(onThreshold, offThreshold) {
        try {
            const response = await api.post('/valve/thresholds', { onThreshold, offThreshold });
            return response.data;
        } catch (error) {
            console.error('Error setting valve thresholds:', error);
            throw error;
        }
    }
}

export default new ValveService();
