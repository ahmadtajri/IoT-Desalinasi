import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

/**
 * Custom Hook untuk memeriksa status koneksi backend
 * 
 * @param {number} checkInterval - Interval pengecekan dalam ms (default: 5000)
 * @returns {object} { isOnline, isChecking, lastChecked, checkStatus }
 */
const useBackendStatus = (checkInterval = 30000) => {
    const [isOnline, setIsOnline] = useState(false);
    const [isChecking, setIsChecking] = useState(true);
    const [lastChecked, setLastChecked] = useState(null);

    // Function to check backend status
    const checkStatus = useCallback(async () => {
        try {
            setIsChecking(true);

            // Ping backend API endpoint
            const response = await api.get('/', {
                timeout: 3000 // 3 second timeout
            });

            // If we get a response, backend is online
            if (response.status === 200) {
                setIsOnline(true);
                setLastChecked(new Date());
            } else {
                setIsOnline(false);
            }
        } catch (error) {
            // If error (network error, timeout, etc), backend is offline
            setIsOnline(false);
            setLastChecked(new Date());
        } finally {
            setIsChecking(false);
        }
    }, []);

    // Initial check
    useEffect(() => {
        checkStatus();
    }, [checkStatus]);

    // Periodic check
    useEffect(() => {
        const interval = setInterval(() => {
            checkStatus();
        }, checkInterval);

        return () => clearInterval(interval);
    }, [checkInterval, checkStatus]);

    return {
        isOnline,
        isChecking,
        lastChecked,
        checkStatus
    };
};

export default useBackendStatus;
