// Schema Service - Handle SVG schema upload and retrieval
const prisma = require('../config/prisma');
const fs = require('fs').promises;
const path = require('path');

class SchemaService {
    // Get active schema
    async getActiveSchema() {
        try {
            const schema = await prisma.desalinationSchema.findFirst({
                where: { isActive: true },
                orderBy: { createdAt: 'desc' }
            });

            return schema;
        } catch (error) {
            console.error('[SchemaService] Error getting active schema:', error);
            throw error;
        }
    }

    // Get all schemas (admin only)
    async getAllSchemas() {
        try {
            const schemas = await prisma.desalinationSchema.findMany({
                orderBy: { createdAt: 'desc' }
            });

            return schemas;
        } catch (error) {
            console.error('[SchemaService] Error getting all schemas:', error);
            throw error;
        }
    }

    // Upload new schema
    async uploadSchema(fileName, svgContent, uploadedBy) {
        try {
            // Deactivate all previous schemas
            await prisma.desalinationSchema.updateMany({
                where: { isActive: true },
                data: { isActive: false }
            });

            // Get next version number
            const latestSchema = await prisma.desalinationSchema.findFirst({
                orderBy: { version: 'desc' }
            });
            const nextVersion = latestSchema ? latestSchema.version + 1 : 1;

            // Create new schema
            const newSchema = await prisma.desalinationSchema.create({
                data: {
                    fileName,
                    svgContent,
                    version: nextVersion,
                    isActive: true,
                    uploadedBy
                }
            });

            console.log(`[SchemaService] New schema uploaded: v${nextVersion} by user ${uploadedBy}`);
            return newSchema;
        } catch (error) {
            console.error('[SchemaService] Error uploading schema:', error);
            throw error;
        }
    }

    // Update existing schema
    async updateSchema(schemaId, svgContent, uploadedBy) {
        try {
            const updatedSchema = await prisma.desalinationSchema.update({
                where: { id: schemaId },
                data: {
                    svgContent,
                    uploadedBy,
                    updatedAt: new Date()
                }
            });

            console.log(`[SchemaService] Schema ${schemaId} updated by user ${uploadedBy}`);
            return updatedSchema;
        } catch (error) {
            console.error('[SchemaService] Error updating schema:', error);
            throw error;
        }
    }

    // Set active schema
    async setActiveSchema(schemaId) {
        try {
            // Deactivate all schemas
            await prisma.desalinationSchema.updateMany({
                where: { isActive: true },
                data: { isActive: false }
            });

            // Activate selected schema
            const activeSchema = await prisma.desalinationSchema.update({
                where: { id: schemaId },
                data: { isActive: true }
            });

            console.log(`[SchemaService] Schema ${schemaId} set as active`);
            return activeSchema;
        } catch (error) {
            console.error('[SchemaService] Error setting active schema:', error);
            throw error;
        }
    }

    // Delete schema
    async deleteSchema(schemaId) {
        try {
            const id = parseInt(schemaId);

            const schema = await prisma.desalinationSchema.findUnique({
                where: { id }
            });

            if (!schema) {
                throw new Error('Schema not found');
            }

            // Allowed to delete active schema (frontend handles warning)

            await prisma.desalinationSchema.delete({
                where: { id }
            });

            console.log(`[SchemaService] Schema ${id} deleted`);
            return true;
        } catch (error) {
            console.error('[SchemaService] Error deleting schema:', error);
            throw error;
        }
    }

    // Validate SVG content
    validateSVG(svgContent) {
        // Basic SVG validation
        if (!svgContent || typeof svgContent !== 'string') {
            return { valid: false, error: 'Invalid SVG content' };
        }

        // Check if it's an SVG
        if (!svgContent.trim().startsWith('<svg') && !svgContent.trim().startsWith('<?xml')) {
            return { valid: false, error: 'Content is not a valid SVG' };
        }

        // Check for closing svg tag
        if (!svgContent.includes('</svg>')) {
            return { valid: false, error: 'SVG is not properly closed' };
        }

        return { valid: true };
    }
}

module.exports = new SchemaService();
