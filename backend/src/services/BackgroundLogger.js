const { PrismaClient } = require('@prisma/client');
const DataService = require('./DataService');

const prisma = new PrismaClient();
const SENSOR_CONFIG_TTL_MS = 5000;
let sensorConfigCache = { map: {}, fetchedAt: 0 };

const getSensorTypeMap = async () => {
    const now = Date.now();
    if (now - sensorConfigCache.fetchedAt < SENSOR_CONFIG_TTL_MS) {
        return sensorConfigCache.map;
    }

    const configs = await prisma.sensorConfig.findMany({
        where: { isEnabled: true },
        select: { sensorId: true, sensorType: true }
    });

    const map = {};
    for (const cfg of configs) {
        map[cfg.sensorId] = cfg.sensorType;
    }

    sensorConfigCache = { map, fetchedAt: now };
    return map;
};

const getSensorIdsByType = (map, type) => {
    return Object.entries(map)
        .filter(([, sensorType]) => sensorType === type)
        .map(([sensorId]) => sensorId);
};

// ============================================================
// Individual User Logger - one instance per user
// ============================================================
class UserLogger {
    constructor(userId, username) {
        this.userId = userId;
        this.username = username || `User#${userId}`;
        this.isLogging = false;
        this.interval = 5000;
        this.timer = null;
        this.logCount = 0;
        this.nextRunTime = null;
        this.startTime = null;

        this.enabledSensorTypes = {
            humidity: true,
            airTemperature: true,
            waterTemperature: true
        };
    }

    async start() {
        if (this.isLogging) {
            return { success: false, message: 'Logger sudah berjalan untuk user ini' };
        }

        const hasAnySensorEnabled =
            this.enabledSensorTypes.humidity ||
            this.enabledSensorTypes.airTemperature ||
            this.enabledSensorTypes.waterTemperature;

        if (!hasAnySensorEnabled) {
            return {
                success: false,
                message: 'Tidak bisa memulai logger: Tidak ada sensor yang dipilih.'
            };
        }

        // Check if there are any active sensors in the MQTT cache
        const ESP32Controller = require('../controllers/ESP32Controller');
        const cache = ESP32Controller.getCache();
        const sensorTypeMap = await getSensorTypeMap();

        let hasActiveSensor = false;

        if (this.enabledSensorTypes.humidity) {
            const ids = getSensorIdsByType(sensorTypeMap, 'humidity');
            for (const id of ids) {
                const data = cache.humidity?.[id];
                if (data && data.status === 'active') { hasActiveSensor = true; break; }
            }
        }

        if (!hasActiveSensor && this.enabledSensorTypes.airTemperature) {
            const ids = getSensorIdsByType(sensorTypeMap, 'air_temperature');
            for (const id of ids) {
                const data = cache.temperature?.[id];
                if (data && data.status === 'active') { hasActiveSensor = true; break; }
            }
        }

        if (!hasActiveSensor && this.enabledSensorTypes.waterTemperature) {
            const ids = getSensorIdsByType(sensorTypeMap, 'water_temperature');
            for (const id of ids) {
                const data = cache.temperature?.[id];
                if (data && data.status === 'active') { hasActiveSensor = true; break; }
            }
        }

        if (!hasActiveSensor) {
            return {
                success: false,
                message: 'Tidak bisa memulai Data Logger: Tidak ada sensor yang aktif saat ini. Pastikan ESP32 terhubung dan mengirim data.'
            };
        }

        this.isLogging = true;
        this.logCount = 0;
        this.startTime = Date.now();

        this._scheduleNextCycle();
        return { success: true, message: 'Logger started successfully' };
    }

    _scheduleNextCycle() {
        if (!this.isLogging) return;

        const now = Date.now();

        if (this.nextRunTime === null) {
            this.nextRunTime = now + this.interval;
        }

        const delay = Math.max(0, this.nextRunTime - now);

        this.timer = setTimeout(async () => {
            if (!this.isLogging) return;

            await this.runCycle();

            this.nextRunTime += this.interval;

            const nowAfterCycle = Date.now();
            if (this.nextRunTime <= nowAfterCycle) {
                console.log(`[Logger:${this.username}] Cycle took longer than interval, adjusting.`);
                this.nextRunTime = nowAfterCycle + this.interval;
            }

            this._scheduleNextCycle();
        }, delay);
    }

    stop() {
        if (!this.isLogging) return;

        this.isLogging = false;
        clearTimeout(this.timer);
        this.timer = null;
        this.nextRunTime = null;
        this.startTime = null;
        console.log(`[Logger:${this.username}] Stopped.`);
    }

    setIntervalTime(ms) {
        if (this.interval === ms) return;

        const oldInterval = this.interval;
        this.interval = ms;

        if (this.isLogging) {
            const now = Date.now();
            const timeUntilNextRun = this.nextRunTime - now;
            const elapsedInCurrentCycle = oldInterval - timeUntilNextRun;

            if (elapsedInCurrentCycle >= ms) {
                this.nextRunTime = now;
            } else {
                this.nextRunTime = now + (ms - elapsedInCurrentCycle);
            }

            clearTimeout(this.timer);
            this._scheduleNextCycle();
            console.log(`[Logger:${this.username}] Interval updated ${oldInterval}ms -> ${ms}ms`);
        }
    }

    setSensorConfig(sensorConfig) {
        if (sensorConfig.humidity === 'none' || sensorConfig.humidity === false) {
            this.enabledSensorTypes.humidity = false;
        } else if (sensorConfig.humidity === 'all' || sensorConfig.humidity === true) {
            this.enabledSensorTypes.humidity = true;
        }

        if (sensorConfig.airTemperature === 'none' || sensorConfig.airTemperature === false) {
            this.enabledSensorTypes.airTemperature = false;
        } else if (sensorConfig.airTemperature === 'all' || sensorConfig.airTemperature === true) {
            this.enabledSensorTypes.airTemperature = true;
        }

        if (sensorConfig.waterTemperature === 'none' || sensorConfig.waterTemperature === false) {
            this.enabledSensorTypes.waterTemperature = false;
        } else if (sensorConfig.waterTemperature === 'all' || sensorConfig.waterTemperature === true) {
            this.enabledSensorTypes.waterTemperature = true;
        }

        console.log(`[Logger:${this.username}] Sensors: humidity=${this.enabledSensorTypes.humidity}, airTemp=${this.enabledSensorTypes.airTemperature}, waterTemp=${this.enabledSensorTypes.waterTemperature}`);
    }

    getStatus() {
        return {
            userId: this.userId,
            username: this.username,
            isLogging: this.isLogging,
            interval: this.interval,
            logCount: this.logCount,
            enabledSensorTypes: { ...this.enabledSensorTypes },
            nextRunTime: this.nextRunTime,
            startTime: this.startTime
        };
    }

    async runCycle() {
        try {
            const intervalSeconds = Math.floor(this.interval / 1000);
            let recordsCreated = 0;
            const cycleTimestamp = new Date();

            const ESP32Controller = require('../controllers/ESP32Controller');
            const cache = ESP32Controller.getCache();
            const sensorTypeMap = await getSensorTypeMap();

            const humiditySensors = this.enabledSensorTypes.humidity
                ? getSensorIdsByType(sensorTypeMap, 'humidity') : [];
            const airTempSensors = this.enabledSensorTypes.airTemperature
                ? getSensorIdsByType(sensorTypeMap, 'air_temperature') : [];
            const waterTempSensors = this.enabledSensorTypes.waterTemperature
                ? getSensorIdsByType(sensorTypeMap, 'water_temperature') : [];

            // Log Humidity
            if (this.enabledSensorTypes.humidity && humiditySensors.length > 0) {
                for (const sensorId of humiditySensors) {
                    const cachedData = cache.humidity?.[sensorId];
                    if (cachedData && cachedData.value !== null && cachedData.value !== undefined) {
                        const isActive = cachedData.status === 'active';
                        await DataService.createData({
                            sensor_id: sensorId,
                            sensor_type: 'humidity',
                            value: isActive ? parseFloat(cachedData.value.toFixed(2)) : 0,
                            unit: '%',
                            status: cachedData.status || 'active',
                            interval: intervalSeconds,
                            timestamp: cycleTimestamp
                        }, this.userId);
                        recordsCreated++;
                    }
                }
            }

            // Log Air Temperature
            if (this.enabledSensorTypes.airTemperature && airTempSensors.length > 0) {
                for (const sensorId of airTempSensors) {
                    const cachedData = cache.temperature?.[sensorId];
                    if (cachedData && cachedData.value !== null && cachedData.value !== undefined) {
                        const isActive = cachedData.status === 'active';
                        await DataService.createData({
                            sensor_id: sensorId,
                            sensor_type: 'air_temperature',
                            value: isActive ? parseFloat(cachedData.value.toFixed(2)) : 0,
                            unit: '°C',
                            status: cachedData.status || 'active',
                            interval: intervalSeconds,
                            timestamp: cycleTimestamp
                        }, this.userId);
                        recordsCreated++;
                    }
                }
            }

            // Log Water Temperature
            if (this.enabledSensorTypes.waterTemperature && waterTempSensors.length > 0) {
                for (const sensorId of waterTempSensors) {
                    const cachedData = cache.temperature?.[sensorId];
                    if (cachedData && cachedData.value !== null && cachedData.value !== undefined) {
                        const isActive = cachedData.status === 'active';
                        await DataService.createData({
                            sensor_id: sensorId,
                            sensor_type: 'water_temperature',
                            value: isActive ? parseFloat(cachedData.value.toFixed(2)) : 0,
                            unit: '°C',
                            status: cachedData.status || 'active',
                            interval: intervalSeconds,
                            timestamp: cycleTimestamp
                        }, this.userId);
                        recordsCreated++;
                    }
                }
            }

            this.logCount++;
            const cycleTime = Date.now() - cycleTimestamp.getTime();
            console.log(`[Logger:${this.username}] Cycle #${this.logCount} | ${recordsCreated} records | ${cycleTime}ms`);
        } catch (error) {
            console.error(`[Logger:${this.username}] Error in cycle:`, error);
        }
    }
}

// ============================================================
// User Logger Manager - manages all per-user logger instances
// ============================================================
class UserLoggerManager {
    constructor() {
        /** @type {Map<number, UserLogger>} */
        this.loggers = new Map();
    }

    /**
     * Get or create a logger for a specific user
     */
    _getOrCreate(userId, username) {
        if (!this.loggers.has(userId)) {
            this.loggers.set(userId, new UserLogger(userId, username));
        }
        return this.loggers.get(userId);
    }

    /**
     * Start logger for a specific user
     */
    async startForUser(userId, username, intervalMs, sensorConfig) {
        const logger = this._getOrCreate(userId, username);

        if (intervalMs) logger.setIntervalTime(intervalMs);
        if (sensorConfig) logger.setSensorConfig(sensorConfig);

        const result = await logger.start();
        return result;
    }

    /**
     * Stop logger for a specific user
     */
    stopForUser(userId) {
        const logger = this.loggers.get(userId);
        if (logger) {
            logger.stop();
            console.log(`[LoggerManager] Active loggers: ${this.getActiveCount()}/${this.loggers.size}`);
        }
    }

    /**
     * Update config for a specific user's logger
     */
    configForUser(userId, username, intervalMs, sensorConfig) {
        const logger = this._getOrCreate(userId, username);

        if (intervalMs && typeof intervalMs === 'number') {
            logger.setIntervalTime(intervalMs);
        }
        if (sensorConfig) {
            logger.setSensorConfig(sensorConfig);
        }

        return logger.getStatus();
    }

    /**
     * Get status for a specific user
     */
    getStatusForUser(userId) {
        const logger = this.loggers.get(userId);
        if (!logger) {
            return {
                userId,
                isLogging: false,
                interval: 5000,
                logCount: 0,
                enabledSensorTypes: {
                    humidity: true,
                    airTemperature: true,
                    waterTemperature: true
                },
                nextRunTime: null,
                startTime: null
            };
        }
        return logger.getStatus();
    }

    /**
     * Get status of all loggers (admin view)
     */
    getAllStatus() {
        const statuses = [];
        for (const [, logger] of this.loggers) {
            statuses.push(logger.getStatus());
        }
        return {
            totalLoggers: this.loggers.size,
            activeLoggers: this.getActiveCount(),
            loggers: statuses
        };
    }

    /**
     * Stop all loggers (e.g., on server shutdown)
     */
    stopAll() {
        for (const [, logger] of this.loggers) {
            logger.stop();
        }
        console.log('[LoggerManager] All loggers stopped.');
    }

    /**
     * Get count of currently active loggers
     */
    getActiveCount() {
        let count = 0;
        for (const [, logger] of this.loggers) {
            if (logger.isLogging) count++;
        }
        return count;
    }
}

// Singleton manager instance
const loggerManager = new UserLoggerManager();
module.exports = loggerManager;
