// Schema Service - Handle schema API calls
import api from './api';

class SchemaService {
    // Get active schema (public)
    async getActiveSchema() {
        try {
            const response = await api.get('/schema');
            return response.data;
        } catch (error) {
            console.error('Error getting active schema:', error);
            throw error;
        }
    }

    // Get all schemas (admin only)
    async getAllSchemas() {
        try {
            const response = await api.get('/schema/all');
            return response.data;
        } catch (error) {
            console.error('Error getting all schemas:', error);
            throw error;
        }
    }

    // Get specific schema by ID (admin only)
    async getSchemaById(id) {
        try {
            const response = await api.get(`/schema/${id}`);
            return response.data;
        } catch (error) {
            console.error('Error getting schema:', error);
            throw error;
        }
    }

    // Upload new schema (admin only)
    async uploadSchema(fileName, svgContent) {
        try {
            const response = await api.post(
                '/schema',
                { fileName, svgContent }
            );
            return response.data;
        } catch (error) {
            console.error('Error uploading schema:', error);
            throw error;
        }
    }

    // Update schema (admin only)
    async updateSchema(id, svgContent) {
        try {
            const response = await api.put(
                `/schema/${id}`,
                { svgContent }
            );
            return response.data;
        } catch (error) {
            console.error('Error updating schema:', error);
            throw error;
        }
    }

    // Set schema as active (admin only)
    async setActiveSchema(id) {
        try {
            const response = await api.patch(
                `/schema/${id}/activate`,
                {}
            );
            return response.data;
        } catch (error) {
            console.error('Error setting active schema:', error);
            throw error;
        }
    }

    // Delete schema (admin only)
    async deleteSchema(id) {
        try {
            const response = await api.delete(`/schema/${id}`);
            return response.data;
        } catch (error) {
            console.error('Error deleting schema:', error);
            throw error;
        }
    }

    // Validate SVG file
    validateSVGFile(file) {
        // Check file type
        if (!file.type.includes('svg')) {
            return { valid: false, error: 'File must be an SVG' };
        }

        // Check file size (max 5MB)
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSize) {
            return { valid: false, error: 'File size must be less than 5MB' };
        }

        return { valid: true };
    }

    // Read SVG file content
    async readSVGFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(e);
            reader.readAsText(file);
        });
    }
}

export default new SchemaService();
