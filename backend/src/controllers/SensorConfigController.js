/**
 * Sensor Configuration Controller
 * Handles CRUD operations for sensor custom names and settings
 * 
 * NEW: Supports flexible sensor mapping system
 * - Admin can create/manage sensor categories
 * - Sensors are auto-discovered when ESP32 sends data
 * - Admin maps discovered sensors to categories and sets display names
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const MqttService = require('../services/MqttService');

const SensorConfigController = {
    // ============== CATEGORY MANAGEMENT ==============

    /**
     * Get all sensor categories
     * GET /api/sensor-config/categories
     */
    async getAllCategories(req, res) {
        try {
            const categories = await prisma.sensorCategory.findMany({
                orderBy: { sortOrder: 'asc' },
                include: {
                    _count: {
                        select: { sensorConfigs: true }
                    }
                }
            });

            res.json({
                success: true,
                data: categories,
                count: categories.length
            });
        } catch (error) {
            console.error('[SensorConfig] Error getting categories:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    },

    /**
     * Create or update a sensor category
     * POST /api/sensor-config/categories
     */
    async upsertCategory(req, res) {
        try {
            const { name, displayName, icon, color, unit, sortOrder, isActive } = req.body;

            if (!name || !displayName) {
                return res.status(400).json({
                    success: false,
                    error: 'name and displayName are required'
                });
            }

            const category = await prisma.sensorCategory.upsert({
                where: { name },
                update: { displayName, icon, color, unit, sortOrder, isActive },
                create: {
                    name,
                    displayName,
                    icon,
                    color,
                    unit: unit || '',
                    sortOrder: sortOrder || 0,
                    isActive: isActive !== false,
                    createdById: req.user?.id || null
                }
            });

            res.json({
                success: true,
                data: category,
                message: `Category "${displayName}" saved`
            });
        } catch (error) {
            console.error('[SensorConfig] Error upserting category:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    },


    // ============== SENSOR CONFIG MANAGEMENT ==============

    /**
     * Get all sensor configurations
     * GET /api/sensor-config
     */
    async getAll(req, res) {
        try {
            const configs = await prisma.sensorConfig.findMany({
                orderBy: [
                    { sensorType: 'asc' },
                    { sortOrder: 'asc' }
                ],
                include: {
                    category: true
                }
            });

            res.json({
                success: true,
                data: configs,
                count: configs.length
            });
        } catch (error) {
            console.error('[SensorConfig] Error getting configs:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    },

    /**
     * Get sensor config by sensor ID
     * GET /api/sensor-config/:sensorId
     */
    async getBySensorId(req, res) {
        try {
            const { sensorId } = req.params;

            const config = await prisma.sensorConfig.findUnique({
                where: { sensorId }
            });

            if (!config) {
                return res.status(404).json({
                    success: false,
                    error: `Sensor config for ${sensorId} not found`
                });
            }

            res.json({
                success: true,
                data: config
            });
        } catch (error) {
            console.error('[SensorConfig] Error getting config:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    },

    /**
     * Create or update sensor config
     * POST /api/sensor-config
     * Body: { sensorId, displayName, sensorType, categoryId?, unit?, isEnabled?, minValue?, maxValue?, sortOrder?, description? }
     */
    async upsert(req, res) {
        try {
            const {
                sensorId,
                displayName,
                sensorType,
                categoryId = null,
                unit = '',
                isEnabled = true,
                minValue = null,
                maxValue = null,
                sortOrder = 0,
                description = null
            } = req.body;

            if (!sensorId || !displayName || !sensorType) {
                return res.status(400).json({
                    success: false,
                    error: 'sensorId, displayName, and sensorType are required'
                });
            }

            const config = await prisma.sensorConfig.upsert({
                where: { sensorId },
                update: {
                    displayName,
                    sensorType,
                    categoryId,
                    unit,
                    isEnabled,
                    isConfigured: true, // Mark as configured when admin saves
                    minValue,
                    maxValue,
                    sortOrder,
                    description
                },
                create: {
                    sensorId,
                    displayName,
                    sensorType,
                    categoryId,
                    unit,
                    isEnabled,
                    isConfigured: true,
                    minValue,
                    maxValue,
                    sortOrder,
                    description,
                    configuredById: req.user?.id || null
                },
                include: {
                    category: true
                }
            });

            console.log(`[SensorConfig] Upserted: ${sensorId} -> "${displayName}" (${sensorType})`);

            res.json({
                success: true,
                data: config,
                message: `Sensor ${sensorId} configuration saved`
            });
        } catch (error) {
            console.error('[SensorConfig] Error upserting config:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    },

    /**
     * Bulk upsert sensor configs
     * POST /api/sensor-config/bulk
     * Body: { configs: [{ sensorId, displayName, ... }, ...] }
     */
    async bulkUpsert(req, res) {
        try {
            const { configs } = req.body;

            if (!configs || !Array.isArray(configs)) {
                return res.status(400).json({
                    success: false,
                    error: 'configs array is required'
                });
            }

            const results = [];
            for (const config of configs) {
                const {
                    sensorId,
                    displayName,
                    sensorType,
                    unit = '',
                    isEnabled = true,
                    minValue = null,
                    maxValue = null,
                    sortOrder = 0,
                    description = null
                } = config;

                if (!sensorId || !displayName || !sensorType) {
                    continue;
                }

                const result = await prisma.sensorConfig.upsert({
                    where: { sensorId },
                    update: {
                        displayName,
                        sensorType,
                        unit,
                        isEnabled,
                        minValue,
                        maxValue,
                        sortOrder,
                        description
                    },
                    create: {
                        sensorId,
                        displayName,
                        sensorType,
                        unit,
                        isEnabled,
                        minValue,
                        maxValue,
                        sortOrder,
                        description,
                        configuredById: req.user?.id || null
                    }
                });
                results.push(result);
            }

            console.log(`[SensorConfig] Bulk upserted ${results.length} configs`);

            res.json({
                success: true,
                data: results,
                count: results.length,
                message: `${results.length} sensor configurations saved`
            });
        } catch (error) {
            console.error('[SensorConfig] Error bulk upserting:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    },

    /**
     * Toggle sensor enabled status
     * PATCH /api/sensor-config/:sensorId/toggle
     */
    async toggle(req, res) {
        try {
            const { sensorId } = req.params;

            const existing = await prisma.sensorConfig.findUnique({
                where: { sensorId }
            });

            if (!existing) {
                return res.status(404).json({
                    success: false,
                    error: `Sensor config for ${sensorId} not found`
                });
            }

            const config = await prisma.sensorConfig.update({
                where: { sensorId },
                data: { isEnabled: !existing.isEnabled }
            });

            console.log(`[SensorConfig] Toggled ${sensorId}: ${config.isEnabled ? 'Enabled' : 'Disabled'}`);

            res.json({
                success: true,
                data: config,
                message: `Sensor ${sensorId} ${config.isEnabled ? 'enabled' : 'disabled'}`
            });
        } catch (error) {
            console.error('[SensorConfig] Error toggling:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    },

    /**
     * Delete sensor config
     * DELETE /api/sensor-config/:sensorId
     */
    async delete(req, res) {
        try {
            const { sensorId } = req.params;

            await prisma.sensorConfig.delete({
                where: { sensorId }
            });

            console.log(`[SensorConfig] Deleted: ${sensorId}`);

            res.json({
                success: true,
                message: `Sensor ${sensorId} configuration deleted`
            });
        } catch (error) {
            console.error('[SensorConfig] Error deleting:', error);
            if (error.code === 'P2025') {
                return res.status(404).json({
                    success: false,
                    error: `Sensor config for ${req.params.sensorId} not found`
                });
            }
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    },

    /**
     * Get sensor config as lookup map
     * GET /api/sensor-config/map
     * Returns { "T1": { displayName: "...", ... }, "RH1": { ... } }
     */
    async getMap(req, res) {
        try {
            const configs = await prisma.sensorConfig.findMany({
                where: { isEnabled: true }
            });

            const map = {};
            for (const config of configs) {
                map[config.sensorId] = {
                    displayName: config.displayName,
                    sensorType: config.sensorType,
                    unit: config.unit,
                    minValue: config.minValue,
                    maxValue: config.maxValue,
                    description: config.description
                };
            }

            res.json({
                success: true,
                data: map,
                count: Object.keys(map).length
            });
        } catch (error) {
            console.error('[SensorConfig] Error getting map:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    },

    /**
     * Get discovered sensors from MQTT - enhanced for flexible system
     * GET /api/sensor-config/discovered
     */
    async getDiscovered(req, res) {
        try {
            const discovered = MqttService.getDiscoveredSensors();

            // Get existing configs to check status
            const existingConfigs = await prisma.sensorConfig.findMany({
                select: { sensorId: true, isConfigured: true, displayName: true, sensorType: true }
            });
            const configMap = new Map(existingConfigs.map(c => [c.sensorId, c]));

            // Merge discovered sensors with config info
            const result = discovered.map(s => {
                const config = configMap.get(s.sensorId);
                return {
                    ...s,
                    isConfigured: config?.isConfigured || false,
                    currentConfig: config || null
                };
            });

            // Sort: unconfigured first, then by sensorId
            result.sort((a, b) => {
                if (a.isConfigured !== b.isConfigured) {
                    return a.isConfigured ? 1 : -1;
                }
                return a.sensorId.localeCompare(b.sensorId, undefined, { numeric: true });
            });

            res.json({
                success: true,
                data: result,
                count: result.length,
                unconfiguredCount: result.filter(s => !s.isConfigured).length
            });
        } catch (error) {
            console.error('[SensorConfig] Error getting discovered sensors:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    },

    /**
     * Auto-register discovered sensors (create placeholder configs)
     * POST /api/sensor-config/auto-register
     * This creates placeholder configs for all discovered but unconfigured sensors
     */
    async autoRegister(req, res) {
        try {
            const discovered = MqttService.getDiscoveredSensors();

            // Get existing configs
            const existingConfigs = await prisma.sensorConfig.findMany({
                select: { sensorId: true }
            });
            const existingIds = new Set(existingConfigs.map(c => c.sensorId));

            // Filter to only new sensors
            const newSensors = discovered.filter(s => !existingIds.has(s.sensorId));

            if (newSensors.length === 0) {
                return res.json({
                    success: true,
                    message: 'No new sensors to register',
                    registered: 0
                });
            }

            // Create placeholder configs for new sensors
            const results = [];
            for (const sensor of newSensors) {
                const config = await prisma.sensorConfig.create({
                    data: {
                        sensorId: sensor.sensorId,
                        displayName: sensor.sensorId, // Default: use sensor ID as name
                        sensorType: sensor.suggestedCategory || 'uncategorized',
                        unit: getDefaultUnit(sensor.suggestedCategory),
                        isEnabled: true,
                        isConfigured: false, // Mark as NOT configured (needs admin attention)
                        lastSeenAt: new Date(sensor.lastSeenAt)
                    }
                });
                results.push(config);
            }

            console.log(`[SensorConfig] Auto-registered ${results.length} new sensors`);

            res.json({
                success: true,
                data: results,
                registered: results.length,
                message: `${results.length} new sensors registered. Please configure them in admin panel.`
            });
        } catch (error) {
            console.error('[SensorConfig] Error auto-registering:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
};

// Helper function to get default unit based on category
function getDefaultUnit(category) {
    const unitMap = {
        'air_temperature': '°C',
        'water_temperature': '°C',
        'humidity': '%',
        'water_level': '%',
        'water_weight': 'kg',
        'uncategorized': ''
    };
    return unitMap[category] || '';
}

module.exports = SensorConfigController;

