const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const SensorData = sequelize.define('SensorData', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    sensor_id: {
        type: DataTypes.STRING(10),
        allowNull: false,
        comment: 'Sensor ID (RH1-RH7, T1-T15) - Note: WL1 is realtime only, not logged'
    },
    sensor_type: {
        type: DataTypes.ENUM('humidity', 'temperature'),
        allowNull: false,
        comment: 'Type of sensor (humidity, temperature) - Note: waterLevel is realtime only'
    },
    value: {
        type: DataTypes.FLOAT,
        allowNull: false,
        comment: 'Sensor reading value'
    },
    unit: {
        type: DataTypes.STRING(10),
        allowNull: false,
        defaultValue: '%',
        comment: 'Unit of measurement (%, °C)'
    },
    status: {
        type: DataTypes.ENUM('active', 'inactive'),
        allowNull: false,
        defaultValue: 'active',
        comment: 'Sensor status at time of reading'
    },
    interval: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Logging interval in seconds (5, 30, 60)'
    },
    timestamp: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        comment: 'Time of reading'
    }
}, {
    tableName: 'sensor_data',
    timestamps: false
});

module.exports = SensorData;
