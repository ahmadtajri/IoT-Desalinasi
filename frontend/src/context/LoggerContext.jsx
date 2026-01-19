import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import sensorService from '../services/sensorService';

const LoggerContext = createContext({
    isLogging: false,
    toggleLogging: () => { },
    logInterval: 5000,
    changeInterval: () => { },
    logCount: 0,
    isRealtimeOnly: true,
    realtimeData: {
        humidity: {},
        airTemperature: {},
        waterTemperature: {}
    },
    sensorStatus: {
        humidity: {},
        airTemperature: {},
        waterTemperature: {}
    },
    pumpStatus: false, // Status ON/OFF dari ESP32
    waterWeight: 0,    // Berat air hasil (cumulative in grams)
});

export const useLogger = () => useContext(LoggerContext);

export const LoggerProvider = ({ children }) => {
    // Logger State (Sync with Backend)
    const [isLogging, setIsLogging] = useState(false);
    const [logInterval, setLogInterval] = useState(5000);
    const [logCount, setLogCount] = useState(0);

    // Dashboard Data State - NEW STRUCTURE
    const [realtimeData, setRealtimeData] = useState({
        humidity: {},
        airTemperature: {},
        waterTemperature: {},
        waterLevel: {}
    });

    // Sensor Status - Track which sensors are active/inactive
    // true = active (receiving data), false = inactive (no data/error)
    const [sensorStatus, setSensorStatus] = useState({
        humidity: {},
        airTemperature: {},
        waterTemperature: {},
        waterLevel: {}
    });

    // Pump/Relay Status from ESP32 (ON/OFF)
    const [pumpStatus, setPumpStatus] = useState(false);

    // Water Weight Result (grams)
    const [waterWeight, setWaterWeight] = useState(0);

    // Last update timestamps for detecting inactive sensors
    const lastUpdateRef = useRef({
        humidity: {},
        airTemperature: {},
        waterTemperature: {},
        waterLevel: {}
    });

    // 1. SYNC STATUS WITH BACKEND ON MOUNT & PERIODICALLY
    const syncStatus = async () => {
        try {
            const status = await sensorService.getLoggerStatus();
            setIsLogging(status.isLogging);
            if (status.isLogging) {
                setLogInterval(status.interval);
                setLogCount(status.logCount);
            }
        } catch (error) {
            console.error("Failed to sync logger status:", error);
        }
    };

    useEffect(() => {
        syncStatus();
        const intervalId = setInterval(syncStatus, 5000);
        return () => clearInterval(intervalId);
    }, []);

    // 2. REALTIME DATA FETCHER (Runs every 1 second to get data from Backend)
    // Replaces the mock data generator with real backend data
    useEffect(() => {
        const fetchRealtimeData = async () => {
            try {
                const data = await sensorService.getRealtimeData();

                // Update state with data from backend
                setRealtimeData(data.realtimeData);
                setSensorStatus(data.sensorStatus);
                setPumpStatus(data.pumpStatus);
                setWaterWeight(data.waterWeight);

                // Update last update timestamps
                const now = Date.now();
                Object.keys(data.realtimeData.humidity).forEach(key => {
                    if (data.realtimeData.humidity[key] !== null) {
                        lastUpdateRef.current.humidity[key] = now;
                    }
                });
                Object.keys(data.realtimeData.airTemperature).forEach(key => {
                    if (data.realtimeData.airTemperature[key] !== null) {
                        lastUpdateRef.current.airTemperature[key] = now;
                    }
                });
                Object.keys(data.realtimeData.waterTemperature).forEach(key => {
                    if (data.realtimeData.waterTemperature[key] !== null) {
                        lastUpdateRef.current.waterTemperature[key] = now;
                    }
                });
                Object.keys(data.realtimeData.waterLevel).forEach(key => {
                    if (data.realtimeData.waterLevel[key] !== null) {
                        lastUpdateRef.current.waterLevel[key] = now;
                    }
                });
            } catch (error) {
                console.error("Failed to fetch realtime data:", error);
                // On error, set all sensors to inactive/null
                // This will happen when backend is stopped
                setRealtimeData({
                    humidity: {},
                    airTemperature: {},
                    waterTemperature: {},
                    waterLevel: {}
                });
                setSensorStatus({
                    humidity: {},
                    airTemperature: {},
                    waterTemperature: {},
                    waterLevel: {}
                });
            }
        };

        fetchRealtimeData(); // Initial fetch
        const intervalId = setInterval(fetchRealtimeData, 1000); // Fetch every 1 second
        return () => clearInterval(intervalId);
    }, []);

    // 3. CONTROLS (Call Backend APIs)
    const toggleLogging = async (sensorConfig = null) => {
        try {
            if (isLogging) {
                await sensorService.stopLogger();
                setIsLogging(false);
            } else {
                // Configure with specific sensors if provided
                // Values can be: 'all', 'none', or specific sensor ID like 'RH1'
                const config = sensorConfig || {
                    humidity: 'all',
                    temperature: 'all'
                };
                console.log('[LoggerContext] Starting logger with config:', config);
                await sensorService.configLogger(logInterval, config);
                await sensorService.startLogger(config);
                setIsLogging(true);
                setLogCount(0);
            }
            syncStatus();
        } catch (error) {
            console.error("Error toggling logger:", error);
            alert("Gagal menghubungi server backend. Pastikan server berjalan.");
        }
    };

    const changeInterval = async (newInterval) => {
        try {
            setLogInterval(newInterval);
            if (isLogging) {
                await sensorService.configLogger(newInterval);
            }
        } catch (error) {
            console.error("Error updating interval:", error);
        }
    };

    return (
        <LoggerContext.Provider value={{
            isLogging,
            toggleLogging,
            logInterval,
            changeInterval,
            logCount,
            realtimeData,
            sensorStatus,
            pumpStatus,
            setPumpStatus,
            waterWeight
        }}>
            {children}
        </LoggerContext.Provider>
    );
};
