// Schema Controller - Handle schema API endpoints
const schemaService = require('../services/SchemaService');

class SchemaController {
    // GET /api/schema - Get active schema (public)
    async getActiveSchema(req, res) {
        try {
            const schema = await schemaService.getActiveSchema();

            if (!schema) {
                return res.status(404).json({
                    success: false,
                    message: 'No active schema found'
                });
            }

            res.json({
                success: true,
                data: {
                    id: schema.id,
                    fileName: schema.fileName,
                    svgContent: schema.svgContent,
                    version: schema.version,
                    createdAt: schema.createdAt,
                    updatedAt: schema.updatedAt
                }
            });
        } catch (error) {
            console.error('[SchemaController] Error getting active schema:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get schema'
            });
        }
    }

    // GET /api/schema/all - Get all schemas (admin only)
    async getAllSchemas(req, res) {
        try {
            const schemas = await schemaService.getAllSchemas();

            res.json({
                success: true,
                data: schemas.map(schema => ({
                    id: schema.id,
                    fileName: schema.fileName,
                    version: schema.version,
                    isActive: schema.isActive,
                    uploadedBy: schema.uploadedBy,
                    createdAt: schema.createdAt,
                    updatedAt: schema.updatedAt,
                    // Don't send full SVG content in list view
                    svgPreview: schema.svgContent.substring(0, 200) + '...'
                }))
            });
        } catch (error) {
            console.error('[SchemaController] Error getting all schemas:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get schemas'
            });
        }
    }

    // GET /api/schema/:id - Get specific schema (admin only)
    async getSchemaById(req, res) {
        try {
            const { id } = req.params;
            const schemas = await schemaService.getAllSchemas();
            const schema = schemas.find(s => s.id === parseInt(id));

            if (!schema) {
                return res.status(404).json({
                    success: false,
                    message: 'Schema not found'
                });
            }

            res.json({
                success: true,
                data: schema
            });
        } catch (error) {
            console.error('[SchemaController] Error getting schema:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get schema'
            });
        }
    }

    // POST /api/schema - Upload new schema (admin only)
    async uploadSchema(req, res) {
        try {
            const { fileName, svgContent } = req.body;
            const uploadedBy = req.user?.id;

            // Validate input
            if (!fileName || !svgContent) {
                return res.status(400).json({
                    success: false,
                    message: 'fileName and svgContent are required'
                });
            }

            // Validate SVG
            const validation = schemaService.validateSVG(svgContent);
            if (!validation.valid) {
                return res.status(400).json({
                    success: false,
                    message: validation.error
                });
            }

            // Upload schema
            const newSchema = await schemaService.uploadSchema(fileName, svgContent, uploadedBy);

            res.status(201).json({
                success: true,
                message: 'Schema uploaded successfully',
                data: {
                    id: newSchema.id,
                    fileName: newSchema.fileName,
                    version: newSchema.version,
                    isActive: newSchema.isActive,
                    createdAt: newSchema.createdAt
                }
            });
        } catch (error) {
            console.error('[SchemaController] Error uploading schema:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to upload schema'
            });
        }
    }

    // PUT /api/schema/:id - Update schema (admin only)
    async updateSchema(req, res) {
        try {
            const { id } = req.params;
            const { svgContent } = req.body;
            const uploadedBy = req.user?.id;

            if (!svgContent) {
                return res.status(400).json({
                    success: false,
                    message: 'svgContent is required'
                });
            }

            // Validate SVG
            const validation = schemaService.validateSVG(svgContent);
            if (!validation.valid) {
                return res.status(400).json({
                    success: false,
                    message: validation.error
                });
            }

            const updatedSchema = await schemaService.updateSchema(parseInt(id), svgContent, uploadedBy);

            res.json({
                success: true,
                message: 'Schema updated successfully',
                data: {
                    id: updatedSchema.id,
                    fileName: updatedSchema.fileName,
                    version: updatedSchema.version,
                    updatedAt: updatedSchema.updatedAt
                }
            });
        } catch (error) {
            console.error('[SchemaController] Error updating schema:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update schema'
            });
        }
    }

    // PATCH /api/schema/:id/activate - Set schema as active (admin only)
    async setActiveSchema(req, res) {
        try {
            const { id } = req.params;

            const activeSchema = await schemaService.setActiveSchema(parseInt(id));

            res.json({
                success: true,
                message: 'Schema set as active',
                data: {
                    id: activeSchema.id,
                    fileName: activeSchema.fileName,
                    version: activeSchema.version,
                    isActive: activeSchema.isActive
                }
            });
        } catch (error) {
            console.error('[SchemaController] Error setting active schema:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to set active schema'
            });
        }
    }

    // DELETE /api/schema/:id - Delete schema (admin only)
    async deleteSchema(req, res) {
        try {
            const { id } = req.params;

            await schemaService.deleteSchema(parseInt(id));

            res.json({
                success: true,
                message: 'Schema deleted successfully'
            });
        } catch (error) {
            console.error('[SchemaController] Error deleting schema:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to delete schema'
            });
        }
    }
}

module.exports = new SchemaController();
