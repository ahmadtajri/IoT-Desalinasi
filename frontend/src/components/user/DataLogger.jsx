import { useState, useEffect, useRef } from 'react';
import { Play, Pause, Settings, Loader2 } from 'lucide-react';
import userService from '../../services/userService';
import { useAuth } from '../../context/AuthContext';
import PropTypes from 'prop-types';

const DataLogger = ({ onIntervalChange, isLogging, onToggleLogging, logCount = 0 }) => {
    const [interval, setInterval] = useState('');
    const [intervals, setIntervals] = useState([]);
    const [loading, setLoading] = useState(true);
    const { user } = useAuth(); // To access user's active interval
    const previousIntervalRef = useRef(null); // Track previous interval to prevent unnecessary updates

    // Fetch intervals on mount
    useEffect(() => {
        const fetchIntervals = async () => {
            try {
                // Get all global intervals loaded (with isActive flag for current user)
                const result = await userService.getGlobalIntervals();
                if (result.success && result.data.length > 0) {
                    // Map to format
                    const formattedIntervals = result.data.map(i => ({
                        id: i.id,
                        value: i.intervalSeconds.toString(),
                        label: i.intervalName,
                        isActive: i.isActive
                    }));
                    setIntervals(formattedIntervals);

                    // Set default active
                    const active = formattedIntervals.find(i => i.isActive) || formattedIntervals[0];
                    if (active) {
                        setInterval(active.value);

                        // Only call onIntervalChange if this is a NEW value
                        const newIntervalMs = parseInt(active.value) * 1000;
                        if (previousIntervalRef.current !== newIntervalMs) {
                            onIntervalChange(newIntervalMs);
                            previousIntervalRef.current = newIntervalMs;
                        }
                    }
                }
            } catch (error) {
                console.error('Failed to load intervals', error);
            } finally {
                setLoading(false);
            }
        };

        fetchIntervals();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleIntervalChange = async (newIntervalSecStr, intervalId) => {
        setInterval(newIntervalSecStr);
        onIntervalChange(parseInt(newIntervalSecStr) * 1000);

        // Also save this as user's active preference in backend
        if (intervalId && user) {
            try {
                await userService.setActiveInterval(intervalId);
            } catch (err) {
                console.error("Failed to save active interval preference", err);
            }
        }
    };

    if (loading) {
        return (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex justify-center">
                <Loader2 className="animate-spin text-blue-500" />
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                        <Settings className="text-purple-600" size={20} />
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-800">Data Logger</h3>
                        <p className="text-sm text-gray-500">
                            {isLogging ? 'Pencatatan aktif' : 'Pencatatan tidak aktif'}
                        </p>
                    </div>
                </div>

                <button
                    onClick={onToggleLogging}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${isLogging
                        ? 'bg-red-600 hover:bg-red-700 text-white'
                        : 'bg-green-600 hover:bg-green-700 text-white'
                        }`}
                >
                    {isLogging ? (
                        <>
                            <Pause size={18} />
                            Stop
                        </>
                    ) : (
                        <>
                            <Play size={18} />
                            Start
                        </>
                    )}
                </button>
            </div>

            <div className="space-y-3">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Pilih Interval Pencatatan
                    </label>
                    {intervals.length === 0 ? (
                        <p className="text-sm text-yellow-600 bg-yellow-50 p-2 rounded-lg">
                            Belum ada interval global yang diatur Admin.
                        </p>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {intervals.map((int) => (
                                <button
                                    key={int.id}
                                    onClick={() => handleIntervalChange(int.value, int.id)}
                                    disabled={isLogging}
                                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${interval === int.value
                                        ? 'bg-purple-600 text-white shadow-md'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        } ${isLogging ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    {int.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {isLogging && (
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2 p-3 bg-green-50 rounded-lg">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse flex-shrink-0"></div>
                            <span className="text-sm text-green-700 font-medium">
                                Merekam: {intervals.find(i => i.value === interval)?.label || interval + 's'}
                            </span>
                        </div>
                        <span className="text-xs text-green-600 pl-4 sm:pl-0">
                            Total siklus: <span className="font-bold">{logCount}</span>
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
};

DataLogger.propTypes = {
    onIntervalChange: PropTypes.func.isRequired,
    isLogging: PropTypes.bool.isRequired,
    onToggleLogging: PropTypes.func.isRequired,
    logCount: PropTypes.number
};

export default DataLogger;
