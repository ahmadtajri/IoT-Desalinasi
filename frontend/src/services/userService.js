// User Management Service (Admin Only)
import api from './api';

const userService = {
    /**
     * Get all users
     */
    async getAllUsers() {
        try {
            const response = await api.get('/users');
            return response.data;
        } catch (error) {
            console.error('Get all users error:', error);
            throw error;
        }
    },

    /**
     * Get user by ID
     */
    async getUserById(id) {
        try {
            const response = await api.get(`/users/${id}`);
            return response.data;
        } catch (error) {
            console.error('Get user by ID error:', error);
            throw error;
        }
    },

    /**
     * Create new user
     */
    async createUser(userData) {
        try {
            const response = await api.post('/users', userData);
            return response.data;
        } catch (error) {
            console.error('Create user error:', error);
            throw error;
        }
    },

    /**
     * Update user
     */
    async updateUser(id, userData) {
        try {
            const response = await api.put(`/users/${id}`, userData);
            return response.data;
        } catch (error) {
            console.error('Update user error:', error);
            throw error;
        }
    },

    /**
     * Delete user
     */
    async deleteUser(id) {
        try {
            const response = await api.delete(`/users/${id}`);
            return response.data;
        } catch (error) {
            console.error('Delete user error:', error);
            throw error;
        }
    },

    /**
     * Toggle user status (activate/deactivate)
     */
    async toggleUserStatus(id) {
        try {
            const response = await api.patch(`/users/${id}/status`);
            return response.data;
        } catch (error) {
            console.error('Toggle user status error:', error);
            throw error;
        }
    },

    /**
     * Get global intervals
     */
    async getGlobalIntervals() {
        try {
            const response = await api.get('/intervals');
            return response.data;
        } catch (error) {
            console.error('Get global intervals error:', error);
            throw error;
        }
    },

    /**
     * Create global interval
     */
    async createInterval(intervalData) {
        try {
            const response = await api.post('/intervals', intervalData);
            return response.data;
        } catch (error) {
            console.error('Create interval error:', error);
            throw error;
        }
    },

    /**
     * Update interval
     */
    async updateInterval(id, intervalData) {
        try {
            const response = await api.put(`/intervals/${id}`, intervalData);
            return response.data;
        } catch (error) {
            console.error('Update interval error:', error);
            throw error;
        }
    },

    /**
     * Delete interval
     */
    async deleteInterval(id) {
        try {
            const response = await api.delete(`/intervals/${id}`);
            return response.data;
        } catch (error) {
            console.error('Delete interval error:', error);
            throw error;
        }
    },

    /**
     * Set active interval
     */
    async setActiveInterval(intervalId) {
        try {
            const response = await api.patch(`/intervals/${intervalId}/activate`);
            return response.data;
        } catch (error) {
            console.error('Set active interval error:', error);
            throw error;
        }
    },
};

export default userService;
