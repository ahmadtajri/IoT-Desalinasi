import { createContext, useState, useContext, useEffect, useRef, useMemo } from 'react';
import sensorService from '../services/sensorService';
import PropTypes from 'prop-types';

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
    valveStatus: null, // Detail status valve dari ESP32
    waterWeight: 0,    // Berat air hasil (cumulative in grams)
    isMachineActive: false, // Status mesin aktif berdasarkan sensor aktif
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

    // Valve Status details from ESP32
    const [valveStatus, setValveStatus] = useState(null);

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
    // Backend now returns per-user status automatically based on JWT
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
        const intervalId = setInterval(syncStatus, 10000); // Sync every 10 seconds
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
                setValveStatus(data.valveStatus || null);
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
                setValveStatus(null);
            }
        };

        fetchRealtimeData(); // Initial fetch
        const intervalId = setInterval(fetchRealtimeData, 2000); // Fetch every 2 seconds
        return () => clearInterval(intervalId);
    }, []);

    // 3. CONTROLS (Call Backend APIs)
    // Returns { success: boolean, error?: string } so caller can show custom alerts
    const toggleLogging = async (sensorConfig = null) => {
        try {
            if (isLogging) {
                await sensorService.stopLogger();
                setIsLogging(false);
                syncStatus();
                return { success: true };
            } else {
                // Configure categories only (values: 'all' | 'none')
                const config = sensorConfig || {
                    humidity: 'all',
                    airTemperature: 'all',
                    waterTemperature: 'all'
                };

                // Frontend validation: check if at least one sensor is selected
                const hasAnySensorSelected =
                    config.humidity !== 'none' ||
                    config.airTemperature !== 'none' ||
                    config.waterTemperature !== 'none';

                if (!hasAnySensorSelected) {
                    return {
                        success: false,
                        error: 'Tidak bisa memulai Data Logger: Tidak ada sensor yang dipilih. Pilih minimal satu jenis sensor.',
                        errorType: 'no_sensor'
                    };
                }

                // Start logger with interval included - backend handles per-user
                const result = await sensorService.startLogger(config, logInterval);

                // Check if backend returned an error
                if (result && result.success === false) {
                    return {
                        success: false,
                        error: result.error || 'Gagal memulai Data Logger.',
                        errorType: 'backend_error'
                    };
                }

                setIsLogging(true);
                setLogCount(0);
                syncStatus();
                return { success: true };
            }
        } catch (error) {
            console.error("Error toggling logger:", error);
            const errorMessage = error.response?.data?.error || error.message || "Gagal menghubungi server backend. Pastikan server berjalan.";
            return {
                success: false,
                error: errorMessage,
                errorType: 'connection_error'
            };
        }
    };


    const changeInterval = async (newInterval) => {
        try {
            // Only update if the interval actually changed
            if (logInterval === newInterval) {
                return;
            }

            setLogInterval(newInterval);

            // Only send to backend if logger is running
            if (isLogging) {
                await sensorService.configLogger(newInterval);
            }
        } catch (error) {
            console.error("Error updating interval:", error);
        }
    };

    // Compute machine active status: machine is active if at least one sensor is active
    const isMachineActive = useMemo(() => {
        // Check if any sensor is active
        const hasActiveHumidity = Object.values(sensorStatus?.humidity || {}).some(status => status === true);
        const hasActiveAirTemp = Object.values(sensorStatus?.airTemperature || {}).some(status => status === true);
        const hasActiveWaterTemp = Object.values(sensorStatus?.waterTemperature || {}).some(status => status === true);
        const hasActiveWaterLevel = Object.values(sensorStatus?.waterLevel || {}).some(status => status === true);

        return hasActiveHumidity || hasActiveAirTemp || hasActiveWaterTemp || hasActiveWaterLevel;
    }, [sensorStatus]);

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
            valveStatus,
            waterWeight,
            isMachineActive  // Export computed machine status
        }}>
            {children}
        </LoggerContext.Provider>
    );
};

LoggerProvider.propTypes = {
    children: PropTypes.node.isRequired
};
