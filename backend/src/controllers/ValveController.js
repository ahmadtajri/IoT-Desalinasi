const MqttService = require('../services/MqttService');
const prisma = require('../config/prisma');

const DEFAULT_THRESHOLDS = {
    onThreshold: 6.0,   // Valve ON when distance >= this (air rendah)
    offThreshold: 5.0   // Valve OFF when distance <= this (air tinggi)
};

async function getOrCreateValveConfig() {
    const existing = await prisma.valveConfig.findFirst();
    if (existing) {
        return existing;
    }

    return prisma.valveConfig.create({
        data: {
            onThreshold: DEFAULT_THRESHOLDS.onThreshold,
            offThreshold: DEFAULT_THRESHOLDS.offThreshold
        }
    });
}

/**
 * Valve Controller
 * Handles valve control commands via MQTT
 */

class ValveController {
    /**
     * Get current valve status
     * GET /api/valve/status
     */
    static async getStatus(req, res) {
        try {
            const valveConfig = await getOrCreateValveConfig();

            // Get valve status from MqttService cache
            const cache = MqttService.getCache();
            const valveStatus = cache.valveStatus || {
                status: 'unknown',
                mode: 'unknown',
                level: 0,
                distance: 0,
                timestamp: null
            };

            res.json({
                success: true,
                data: {
                    ...valveStatus,
                    thresholds: {
                        onThreshold: valveConfig.onThreshold,
                        offThreshold: valveConfig.offThreshold
                    },
                    lastUpdate: valveStatus.timestamp
                }
            });
        } catch (error) {
            console.error('Error getting valve status:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get valve status',
                error: error.message
            });
        }
    }

    /**
     * Control valve (ON/OFF)
     * POST /api/valve/control
     * Body: { command: "on" | "off" }
     */
    static async control(req, res) {
        try {
            const { command } = req.body;

            // Validate command
            if (!command || !['on', 'off'].includes(command.toLowerCase())) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid command. Use "on" or "off"'
                });
            }

            // Check if MQTT is connected
            if (!MqttService.isConnected()) {
                return res.status(503).json({
                    success: false,
                    message: 'MQTT service is not connected'
                });
            }

            // Send command via MQTT - UPDATED TOPIC
            const payload = JSON.stringify({ command: command.toLowerCase() });
            const topic = 'esp32/valve/control';

            const published = await MqttService.publish(topic, payload);

            if (published) {
                console.log(`✓ Valve command sent: ${command.toUpperCase()}`);
                res.json({
                    success: true,
                    message: `Valve ${command.toUpperCase()} command sent successfully`,
                    data: {
                        command: command.toLowerCase(),
                        topic: topic,
                        timestamp: new Date()
                    }
                });
            } else {
                throw new Error('Failed to publish MQTT message');
            }

        } catch (error) {
            console.error('Error controlling valve:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to control valve',
                error: error.message
            });
        }
    }

    /**
     * Set control mode (AUTO/MANUAL)
     * POST /api/valve/mode
     * Body: { mode: "auto" | "manual" }
     */
    static async setMode(req, res) {
        try {
            const { mode } = req.body;

            // Validate mode
            if (!mode || !['auto', 'manual'].includes(mode.toLowerCase())) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid mode. Use "auto" or "manual"'
                });
            }

            // Check if MQTT is connected
            if (!MqttService.isConnected()) {
                return res.status(503).json({
                    success: false,
                    message: 'MQTT service is not connected'
                });
            }

            // Send mode command via MQTT - UPDATED TOPIC
            const payload = JSON.stringify({ command: mode.toLowerCase() });
            const topic = 'esp32/valve/control';

            const published = await MqttService.publish(topic, payload);

            if (published) {
                console.log(`✓ Valve mode changed to: ${mode.toUpperCase()}`);
                res.json({
                    success: true,
                    message: `Valve mode changed to ${mode.toUpperCase()} successfully`,
                    data: {
                        mode: mode.toLowerCase(),
                        topic: topic,
                        timestamp: new Date()
                    }
                });
            } else {
                throw new Error('Failed to publish MQTT message');
            }

        } catch (error) {
            console.error('Error setting valve mode:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to set valve mode',
                error: error.message
            });
        }
    }
    /**
     * Set auto-control thresholds
     * POST /api/valve/thresholds
     * Body: { onThreshold: number, offThreshold: number }
     */
    static async setThresholds(req, res) {
        try {
            const { onThreshold, offThreshold } = req.body;

            // Validate thresholds
            if (typeof onThreshold !== 'number' || typeof offThreshold !== 'number') {
                return res.status(400).json({
                    success: false,
                    message: 'onThreshold and offThreshold must be numbers'
                });
            }

            if (offThreshold >= onThreshold) {
                return res.status(400).json({
                    success: false,
                    message: 'offThreshold must be less than onThreshold'
                });
            }

            if (onThreshold < 0 || offThreshold < 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Thresholds must be positive numbers'
                });
            }

            const updatedThresholds = {
                onThreshold: parseFloat(onThreshold),
                offThreshold: parseFloat(offThreshold),
                updatedById: req.user?.id || null
            };

            const existing = await prisma.valveConfig.findFirst();
            const valveConfig = existing
                ? await prisma.valveConfig.update({
                    where: { id: existing.id },
                    data: updatedThresholds
                })
                : await prisma.valveConfig.create({ data: updatedThresholds });

            // Check if MQTT is connected
            if (!MqttService.isConnected()) {
                return res.status(503).json({
                    success: false,
                    message: 'MQTT service is not connected'
                });
            }

            // Send thresholds to ESP32 via MQTT
            const payload = JSON.stringify({
                command: 'set_thresholds',
                onThreshold: valveConfig.onThreshold,
                offThreshold: valveConfig.offThreshold
            });
            const topic = 'esp32/valve/control';

            const published = await MqttService.publish(topic, payload);

            if (published) {
                console.log(`✓ Valve thresholds updated: ON >= ${onThreshold}cm, OFF <= ${offThreshold}cm`);
                res.json({
                    success: true,
                    message: 'Thresholds updated successfully',
                    data: {
                        thresholds: {
                            onThreshold: valveConfig.onThreshold,
                            offThreshold: valveConfig.offThreshold
                        },
                        topic: topic,
                        timestamp: new Date()
                    }
                });
            } else {
                throw new Error('Failed to publish MQTT message');
            }

        } catch (error) {
            console.error('Error setting valve thresholds:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to set valve thresholds',
                error: error.message
            });
        }
    }
}

module.exports = ValveController;
