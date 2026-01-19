const DataService = require('./DataService');

class BackgroundLogger {
    constructor() {
        this.isLogging = false;
        this.interval = 5000; // Default 5 seconds
        this.timer = null;
        this.logCount = 0;

        // Default sensor configuration - which sensors to log
        this.allSensors = {
            humidity: ['RH1', 'RH2', 'RH3', 'RH4', 'RH5', 'RH6', 'RH7'],
            temperature: ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12', 'T13', 'T14', 'T15']
        };

        // Active sensors to record (can be specific sensors or 'all')
        this.activeSensors = {
            humidity: ['RH1', 'RH2', 'RH3', 'RH4', 'RH5', 'RH6', 'RH7'], // Default: all
            temperature: ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12', 'T13', 'T14', 'T15']
        };

        // Which sensor types are enabled
        this.enabledSensorTypes = {
            humidity: true,
            temperature: true
        };
    }

    start() {
        if (this.isLogging) {
            console.log('[BackgroundLogger] Already running.');
            return;
        }

        this.isLogging = true;
        this.logCount = 0;
        console.log(`[BackgroundLogger] Started with interval ${this.interval}ms`);
        console.log(`[BackgroundLogger] Active Humidity Sensors: ${this.activeSensors.humidity.join(', ') || 'NONE'}`);
        console.log(`[BackgroundLogger] Active Temperature Sensors: ${this.activeSensors.temperature.join(', ') || 'NONE'}`);

        this.timer = setInterval(() => this.runCycle(), this.interval);
    }

    stop() {
        if (!this.isLogging) return;

        this.isLogging = false;
        clearInterval(this.timer);
        this.timer = null;
        console.log('[BackgroundLogger] Stopped.');
    }

    setIntervalTime(ms) {
        this.interval = ms;
        if (this.isLogging) {
            clearInterval(this.timer);
            this.timer = setInterval(() => this.runCycle(), this.interval);
            console.log(`[BackgroundLogger] Interval updated to ${this.interval}ms`);
        }
    }

    // Configure which sensors to record
    // sensorConfig format: { humidity: 'all'|'none'|'RH1', temperature: 'all'|'none'|'T5' }
    setSensorConfig(sensorConfig) {
        console.log('[BackgroundLogger] Configuring sensors:', sensorConfig);

        // Process humidity
        if (sensorConfig.humidity === 'none' || sensorConfig.humidity === false) {
            this.enabledSensorTypes.humidity = false;
            this.activeSensors.humidity = [];
        } else if (sensorConfig.humidity === 'all' || sensorConfig.humidity === true) {
            this.enabledSensorTypes.humidity = true;
            this.activeSensors.humidity = [...this.allSensors.humidity];
        } else if (typeof sensorConfig.humidity === 'string') {
            // Specific sensor like 'RH1'
            this.enabledSensorTypes.humidity = true;
            this.activeSensors.humidity = [sensorConfig.humidity];
        }

        // Process temperature
        if (sensorConfig.temperature === 'none' || sensorConfig.temperature === false) {
            this.enabledSensorTypes.temperature = false;
            this.activeSensors.temperature = [];
        } else if (sensorConfig.temperature === 'all' || sensorConfig.temperature === true) {
            this.enabledSensorTypes.temperature = true;
            this.activeSensors.temperature = [...this.allSensors.temperature];
        } else if (typeof sensorConfig.temperature === 'string') {
            // Specific sensor like 'T5'
            this.enabledSensorTypes.temperature = true;
            this.activeSensors.temperature = [sensorConfig.temperature];
        }

        console.log(`[BackgroundLogger] Updated - H: [${this.activeSensors.humidity.join(',')}], T: [${this.activeSensors.temperature.join(',')}]`);
    }

    // Legacy method for backwards compatibility
    setSensorTypes(humidity = true, temperature = true) {
        this.setSensorConfig({
            humidity: humidity ? 'all' : 'none',
            temperature: temperature ? 'all' : 'none'
        });
    }

    getStatus() {
        return {
            isLogging: this.isLogging,
            interval: this.interval,
            logCount: this.logCount,
            enabledSensorTypes: this.enabledSensorTypes,
            activeSensors: this.activeSensors
        };
    }

    async runCycle() {
        try {
            const intervalSeconds = Math.floor(this.interval / 1000);
            let recordsCreated = 0;

            // Get ESP32 cache for real-time data
            const ESP32Controller = require('../controllers/ESP32Controller');
            const cache = ESP32Controller.getCache();

            // Log Humidity Sensors (only active ones from ESP32 cache)
            if (this.enabledSensorTypes.humidity && this.activeSensors.humidity.length > 0) {
                for (const sensorId of this.activeSensors.humidity) {
                    const cachedData = cache.humidity?.[sensorId];

                    // Only log if we have real data from ESP32
                    if (cachedData && cachedData.value !== null && cachedData.value !== undefined) {
                        const sensorData = {
                            sensor_id: sensorId,
                            sensor_type: 'humidity',
                            value: parseFloat(cachedData.value.toFixed(2)),
                            unit: '%',
                            status: cachedData.status || 'active',
                            interval: intervalSeconds
                        };
                        await DataService.createData(sensorData);
                        recordsCreated++;
                    }
                }
            }

            // Log Temperature Sensors (T1-T7 Air Temp, T8-T15 Water Temp) from ESP32 cache
            if (this.enabledSensorTypes.temperature && this.activeSensors.temperature.length > 0) {
                for (const sensorId of this.activeSensors.temperature) {
                    const cachedData = cache.temperature?.[sensorId];

                    // Only log if we have real data from ESP32
                    if (cachedData && cachedData.value !== null && cachedData.value !== undefined) {
                        const sensorData = {
                            sensor_id: sensorId,
                            sensor_type: 'temperature',
                            value: parseFloat(cachedData.value.toFixed(2)),
                            unit: '°C',
                            status: cachedData.status || 'active',
                            interval: intervalSeconds
                        };
                        await DataService.createData(sensorData);
                        recordsCreated++;
                    }
                }
            }

            this.logCount++;
            console.log(`[BackgroundLogger] Cycle #${this.logCount} completed. ${recordsCreated} records saved from ESP32 cache.`);
        } catch (error) {
            console.error('[BackgroundLogger] Error in logging cycle:', error);
        }
    }
}

// Singleton instance
const loggerInstance = new BackgroundLogger();
module.exports = loggerInstance;
