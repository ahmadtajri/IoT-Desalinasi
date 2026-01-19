// Mock Data Store - In-Memory Database Replacement
// This replaces MySQL database with in-memory data storage
// Updated to support new sensor structure (RH1-RH7, T1-T15, WL1)

class MockDataStore {
    constructor() {
        this.data = [];
        this.currentId = 1;
        this.initializeSampleData();
    }

    // Initialize with sample data using new sensor structure
    initializeSampleData() {
        console.log('📦 Initializing mock data store with new sensor structure...');

        const humiditySensors = ['RH1', 'RH2', 'RH3', 'RH4', 'RH5', 'RH6', 'RH7'];
        const temperatureSensors = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12', 'T13', 'T14', 'T15'];
        const intervals = [5, 30, 60];

        // Generate sample records for each sensor type
        for (let i = 0; i < 30; i++) {
            const interval = intervals[Math.floor(Math.random() * intervals.length)];
            const timestamp = new Date(Date.now() - i * 300000).toISOString(); // 5 min apart

            // Add some humidity sensor data
            const hSensor = humiditySensors[Math.floor(Math.random() * humiditySensors.length)];
            this.data.push({
                id: this.currentId++,
                sensor_id: hSensor,
                sensor_type: 'humidity',
                value: parseFloat((50 + Math.random() * 40).toFixed(1)),
                unit: '%',
                status: Math.random() > 0.2 ? 'active' : 'inactive',
                interval: interval,
                timestamp: timestamp
            });

            // Add some temperature sensor data
            const tSensor = temperatureSensors[Math.floor(Math.random() * temperatureSensors.length)];
            this.data.push({
                id: this.currentId++,
                sensor_id: tSensor,
                sensor_type: 'temperature',
                value: parseFloat((20 + Math.random() * 50).toFixed(1)),
                unit: '°C',
                status: Math.random() > 0.2 ? 'active' : 'inactive',
                interval: interval,
                timestamp: timestamp
            });
        }

        // Sort by timestamp descending (newest first)
        this.data.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        console.log('✅ Mock data initialized with ' + this.data.length + ' records');
    }

    // Get all data with optional limit
    findAll(options = {}) {
        let result = [...this.data];

        // Apply where clause
        if (options.where) {
            Object.keys(options.where).forEach(key => {
                const value = options.where[key];
                result = result.filter(item => item[key] === value);
            });
        }

        // Apply ordering
        if (options.order) {
            const [field, direction] = options.order[0];
            result.sort((a, b) => {
                const aVal = a[field];
                const bVal = b[field];
                if (direction === 'DESC') {
                    return bVal > aVal ? 1 : -1;
                }
                return aVal > bVal ? 1 : -1;
            });
        }

        // Apply limit
        if (options.limit) {
            result = result.slice(0, options.limit);
        }

        return Promise.resolve(result);
    }

    // Count records
    count(options = {}) {
        let result = [...this.data];

        if (options.where) {
            Object.keys(options.where).forEach(key => {
                const value = options.where[key];
                result = result.filter(item => item[key] === value);
            });
        }

        return Promise.resolve(result.length);
    }

    // Create new record with new sensor structure
    create(data) {
        const newRecord = {
            id: this.currentId++,
            sensor_id: data.sensor_id,
            sensor_type: data.sensor_type,
            value: parseFloat(data.value),
            unit: data.unit || '%',
            status: data.status || 'active',
            interval: data.interval || null,
            timestamp: new Date().toISOString()
        };

        this.data.unshift(newRecord); // Add to beginning (newest first)
        // Reduce logging noise - only log occasionally
        if (this.data.length % 10 === 0) {
            console.log('[MockDataStore] Total records: ' + this.data.length);
        }

        return Promise.resolve(newRecord);
    }

    // Delete records
    destroy(options = {}) {
        const initialLength = this.data.length;

        if (options.truncate) {
            // Delete all
            this.data = [];
            console.log('✅ Deleted all records (' + initialLength + ' total)');
            return Promise.resolve(initialLength);
        }

        if (options.where) {
            // Delete matching records
            const beforeLength = this.data.length;

            Object.keys(options.where).forEach(key => {
                const value = options.where[key];
                this.data = this.data.filter(item => item[key] !== value);
            });

            const deletedCount = beforeLength - this.data.length;
            console.log('✅ Deleted ' + deletedCount + ' records');
            return Promise.resolve(deletedCount);
        }

        return Promise.resolve(0);
    }

    // Find one record by ID
    findByPk(id) {
        const record = this.data.find(item => item.id === parseInt(id));
        return Promise.resolve(record || null);
    }

    // Get statistics
    getStats() {
        const sensorIds = [...new Set(this.data.map(d => d.sensor_id))].sort();
        const sensorTypes = [...new Set(this.data.map(d => d.sensor_type))];

        return {
            totalRecords: this.data.length,
            sensorIds: sensorIds,
            sensorTypes: sensorTypes,
            dateRange: {
                oldest: this.data[this.data.length - 1]?.timestamp,
                newest: this.data[0]?.timestamp
            }
        };
    }
}

// Create singleton instance
const mockDataStore = new MockDataStore();

module.exports = mockDataStore;
