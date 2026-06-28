import { useState, useEffect, useCallback } from 'react';
import { Download, Trash2, ChevronDown, CheckCircle, X, Droplets, Thermometer, User } from 'lucide-react';
import sensorService from '../../services/sensorService';
import sensorConfigService from '../../services/sensorConfigService';
import DataLogger from '../../components/user/DataLogger';
import { useLogger } from '../../context/LoggerContext';
import { useAuth } from '../../context/AuthContext';
import CustomAlert from '../../components/shared/CustomAlert';

const Report = () => {
    // Separate filters for humidity and temperature sensors
    const [selectedHumiditySensor, setSelectedHumiditySensor] = useState('all');
    const [selectedAirTempSensor, setSelectedAirTempSensor] = useState('all');
    const [selectedWaterTempSensor, setSelectedWaterTempSensor] = useState('all');
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showStatusModal, setShowStatusModal] = useState(false);

    // Custom Alert State
    const [alertConfig, setAlertConfig] = useState({
        isOpen: false,
        title: '',
        message: '',
        type: 'info',
        isConfirm: false,
        onConfirm: () => { }
    });

    // Use Global Logger Context
    const { isLogging, toggleLogging, changeInterval, logCount, logInterval, realtimeData, sensorStatus } = useLogger();
    const { user, isAdmin } = useAuth();
    const currentUserIsAdmin = isAdmin();


    // Sensor configuration from database
    const [sensorConfigMap, setSensorConfigMap] = useState({});
    const [allSensorConfigs, setAllSensorConfigs] = useState([]);

    // Helper function to format values to 2 decimal places
    const formatValue = (val) => {
        if (val === null || val === undefined || isNaN(val)) return '--';
        return Number(val).toFixed(2);
    };

    const getTypeCategory = (row) => {
        if (row.sensor_type === 'temperature') {
            return getTemperatureCategory(row.sensor_id);
        }
        return row.sensor_type;
    };

    const getTypeLabel = (row) => {
        const type = getTypeCategory(row);
        if (type === 'humidity') return 'Kelembapan';
        if (type === 'air_temperature') return 'Suhu Udara';
        if (type === 'water_temperature') return 'Suhu Air';
        return row.sensor_type;
    };

    const getTypeBadgeClass = (row) => {
        const type = getTypeCategory(row);
        if (type === 'humidity') return 'bg-blue-100 text-blue-700';
        if (type === 'air_temperature') return 'bg-orange-100 text-orange-700';
        if (type === 'water_temperature') return 'bg-cyan-100 text-cyan-700';
        return 'bg-gray-100 text-gray-700';
    };

    // Calculate active sensors
    const activeHumiditySensors = sensorStatus?.humidity
        ? Object.values(sensorStatus.humidity).filter(s => s).length
        : 0;
    const activeAirTempSensors = sensorStatus?.airTemperature
        ? Object.values(sensorStatus.airTemperature).filter(s => s).length
        : 0;
    const activeWaterTempSensors = sensorStatus?.waterTemperature
        ? Object.values(sensorStatus.waterTemperature).filter(s => s).length
        : 0;
    const totalActiveSensors = activeHumiditySensors + activeAirTempSensors + activeWaterTempSensors;

    // Get sensors by type from config (DYNAMIC - based on database config!)
    const getSensorsByType = (sensorType) => {
        return allSensorConfigs
            .filter(c => c.sensorType === sensorType && c.isEnabled)
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map(c => c.sensorId);
    };

    const allHumiditySensors = getSensorsByType('humidity');
    const allAirTempSensors = getSensorsByType('air_temperature');
    const allWaterTempSensors = getSensorsByType('water_temperature');

    const getTemperatureCategory = (sensorId) => {
        const configuredType = sensorConfigMap[sensorId]?.sensorType;
        if (configuredType === 'air_temperature' || configuredType === 'water_temperature') {
            return configuredType;
        }

        const tempIdNum = parseInt(sensorId.replace('T', ''), 10);
        if (!isNaN(tempIdNum) && tempIdNum >= 8) return 'water_temperature';
        return 'air_temperature';
    };

    // Calculate total sensors from config
    const totalConfiguredSensors = allHumiditySensors.length + allAirTempSensors.length + allWaterTempSensors.length;
    const totalInactiveSensors = totalConfiguredSensors - totalActiveSensors;

    // Helper for Custom Alerts
    const showAlert = (title, message, type = 'info') => {
        setAlertConfig({
            isOpen: true,
            title,
            message,
            type,
            isConfirm: false,
            onConfirm: () => { }
        });
    };

    const showConfirm = (title, message, onConfirm, type = 'warning') => {
        setAlertConfig({
            isOpen: true,
            title,
            message,
            type,
            isConfirm: true,
            onConfirm
        });
    };

    const closeAlert = () => {
        setAlertConfig(prev => ({ ...prev, isOpen: false }));
    };

    // Fetch data from backend
    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const params = { limit: 500 }; // Get more data for filtering

            const result = await sensorService.getAll(params);
            if (Array.isArray(result)) {
                // Normalize data keys to ensure snake_case (frontend logic expects snake_case)
                // This handles if backend returns camelCase (Prisma default) or snake_case
                const normalizedData = result.map(item => ({
                    ...item,
                    id: item.id,
                    timestamp: item.timestamp,
                    value: item.value,
                    unit: item.unit || (item.sensorType === 'humidity' || item.sensor_type === 'humidity' ? '%' : '°C'),
                    status: item.status,
                    // Map camelCase to snake_case if needed
                    sensor_id: item.sensor_id || item.sensorId || '',
                    sensor_type: item.sensor_type || item.sensorType || '',
                    interval: item.interval || item.intervalSeconds || item.interval_seconds || null,
                    user_id: item.user_id || item.userId || null
                }));
                setData(normalizedData);
            } else {
                console.error('API returned non-array data:', result);
                setData([]);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
            setData([]);
            if (!alertConfig.isOpen) {
                // Optional: You could show a toast here, but console error is sufficient for now 
                // to avoid spamming alerts if it auto-refreshes.
                // showAlert('Connection Error', 'Gagal mengambil data dari server.', 'error');
            }
        } finally {
            setLoading(false);
        }
    }, [alertConfig.isOpen]);

    // Auto-refresh table when new log comes in
    useEffect(() => {
        if (logCount > 0) {
            fetchData();
        }
    }, [logCount, fetchData]);

    // Fetch sensor configuration from database
    useEffect(() => {
        const fetchSensorConfig = async () => {
            try {
                const response = await sensorConfigService.getAll();
                if (response.success && response.data) {
                    setAllSensorConfigs(response.data);
                    // Build map from list
                    const map = {};
                    response.data.forEach(config => {
                        if (config.isEnabled) {
                            map[config.sensorId] = config;
                        }
                    });
                    setSensorConfigMap(map);
                }
            } catch (error) {
                console.error('Error fetching sensor config:', error);
            }
        };
        fetchSensorConfig();
        // Refresh config every 30 seconds
        const interval = setInterval(fetchSensorConfig, 30000);
        return () => clearInterval(interval);
    }, []);

    // Load data on mount
    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleToggleLogging = async () => {
        const sensorConfig = {
            humidity: selectedHumiditySensor,
            airTemperature: selectedAirTempSensor,
            waterTemperature: selectedWaterTempSensor
        };

        // Validation: Check if at least one sensor type is selected before starting
        if (!isLogging) {
            const hasAnySensorSelected =
                selectedHumiditySensor !== 'none' ||
                selectedAirTempSensor !== 'none' ||
                selectedWaterTempSensor !== 'none';

            if (!hasAnySensorSelected) {
                showAlert(
                    'Tidak Ada Sensor Dipilih',
                    'Pilih minimal satu jenis sensor sebelum memulai Data Logger. Ubah filter sensor dari "none" ke "all" untuk mengaktifkan pencatatan.',
                    'warning'
                );
                return;
            }
        }

        // Call toggleLogging and handle the result
        const result = await toggleLogging(sensorConfig);

        // Show error using CustomAlert if failed
        if (result && !result.success) {
            const alertType = result.errorType === 'connection_error' ? 'error' : 'warning';
            const alertTitle = result.errorType === 'connection_error'
                ? 'Koneksi Gagal'
                : result.errorType === 'no_sensor'
                    ? 'Tidak Ada Sensor Dipilih'
                    : 'Gagal Memulai Logger';

            showAlert(alertTitle, result.error, alertType);
        }
    };



    const handleIntervalChange = (newInterval) => {
        changeInterval(newInterval);
    };

    // Filter data
    const safeData = Array.isArray(data) ? data : [];
    const filteredData = safeData.filter(item => {
        // Interval filter removed to show all historical data regardless of current logging settings

        // Determine if this sensor type should be shown based on filter settings
        const sensorType = item.sensor_type;
        const sensorId = item.sensor_id;

        if (sensorType === 'humidity') {
            return selectedHumiditySensor !== 'none';
        }

        if (sensorType === 'air_temperature') {
            return selectedAirTempSensor !== 'none';
        }

        if (sensorType === 'water_temperature') {
            return selectedWaterTempSensor !== 'none';
        }

        if (sensorType === 'temperature') {
            const category = getTemperatureCategory(sensorId);
            return category === 'air_temperature'
                ? selectedAirTempSensor !== 'none'
                : selectedWaterTempSensor !== 'none';
        }

        // Unknown sensor type - show by default
        return true;
    });

    const handleExport = async () => {
        if (filteredData.length === 0) {
            showAlert(
                'Data Kosong',
                'Tidak ada data untuk di-export.\n\nPastikan filter sensor sudah dipilih dan data tersedia.',
                'warning'
            );
            return;
        }

        try {
            // Build sensorTypes filter based on current filter settings
            const sensorTypes = [];
            if (selectedHumiditySensor !== 'none') sensorTypes.push('humidity');
            if (selectedAirTempSensor !== 'none') sensorTypes.push('air_temperature');
            if (selectedWaterTempSensor !== 'none') sensorTypes.push('water_temperature');

            await sensorService.exportToExcel({
                sensorTypes: sensorTypes.length > 0 ? sensorTypes : undefined,
                limit: 5000
            });

            showAlert(
                'Export Berhasil',
                'File Excel berhasil di-download dengan grafik dan multi-sheet.',
                'success'
            );
        } catch (error) {
            console.error('Error exporting Excel:', error);
            const message = error.response?.status === 404
                ? 'Tidak ada data sensor untuk di-export.'
                : 'Gagal mengekspor file Excel. Silakan coba lagi.';
            showAlert('Export Gagal', message, 'error');
        }
    };

    // Delete data based on active filters
    const handleDeleteByFilter = () => {
        // Check if any filter is selected
        const hasHumidity = selectedHumiditySensor !== 'none';
        const hasAirTemp = selectedAirTempSensor !== 'none';
        const hasWaterTemp = selectedWaterTempSensor !== 'none';

        if (!hasHumidity && !hasAirTemp && !hasWaterTemp) {
            showAlert(
                'Pilih Filter Terlebih Dahulu',
                'Silakan pilih minimal satu filter sensor (Kelembapan, Suhu Udara, atau Suhu Air) untuk menghapus data.',
                'warning'
            );
            return;
        }

        // Build filter description for confirmation
        const activeFilters = [];
        if (hasHumidity) activeFilters.push('Kelembapan');
        if (hasAirTemp) activeFilters.push('Suhu Udara');
        if (hasWaterTemp) activeFilters.push('Suhu Air');

        const filterDescription = activeFilters.join(', ');
        const dataCount = filteredData.length;

        showConfirm(
            'Hapus Data Sesuai Filter?',
            `Apakah Anda yakin ingin menghapus ${dataCount} data untuk filter: ${filterDescription}?\n\nTindakan ini tidak dapat dibatalkan!`,
            async () => {
                try {
                    // Build filter params
                    const filterParams = {
                        sensorTypes: []
                    };

                    if (hasHumidity) filterParams.sensorTypes.push('humidity');
                    if (hasAirTemp) filterParams.sensorTypes.push('air_temperature');
                    if (hasWaterTemp) filterParams.sensorTypes.push('water_temperature');

                    await sensorService.deleteByFilter(filterParams);

                    // Refresh data after deletion
                    await fetchData();

                    showAlert('Sukses', `${dataCount} data berhasil dihapus sesuai filter yang dipilih`, 'success');
                } catch (error) {
                    console.error('Error deleting data by filter:', error);
                    showAlert('Gagal', 'Gagal menghapus data. Silakan coba lagi.', 'error');
                }
            },
            'error'
        );
    };

    return (
        <div className="p-4 md:p-6 bg-gray-50 min-h-screen w-full max-w-full overflow-x-hidden">
            <CustomAlert
                isOpen={alertConfig.isOpen}
                onClose={closeAlert}
                title={alertConfig.title}
                message={alertConfig.message}
                type={alertConfig.type}
                isConfirm={alertConfig.isConfirm}
                onConfirm={alertConfig.onConfirm}
            />

            {/* Header Section */}
            <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-100 mb-6">
                <div className="flex flex-col gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">Laporan Data</h1>
                        <p className="text-gray-500 mt-1 text-sm">Analisis dan ekspor data historis</p>
                    </div>

                    {/* Action Buttons - full width on mobile */}
                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                        <button
                            onClick={handleExport}
                            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors text-sm font-medium w-full sm:w-auto"
                        >
                            <Download size={18} />
                            Ekspor Excel
                        </button>

                        <button
                            onClick={() => {
                                const hasFilter = selectedHumiditySensor !== 'none' || selectedAirTempSensor !== 'none' || selectedWaterTempSensor !== 'none';
                                if (!hasFilter) {
                                    showAlert('Pilih Filter', 'Silakan pilih minimal satu filter sensor untuk menghapus data.', 'info');
                                } else {
                                    handleDeleteByFilter();
                                }
                            }}
                            className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl transition-colors text-sm font-medium w-full sm:w-auto ${selectedHumiditySensor === 'none' && selectedAirTempSensor === 'none' && selectedWaterTempSensor === 'none'
                                ? 'bg-gray-400 text-white cursor-not-allowed opacity-60'
                                : 'bg-red-600 text-white hover:bg-red-700'
                                }`}
                            disabled={selectedHumiditySensor === 'none' && selectedAirTempSensor === 'none' && selectedWaterTempSensor === 'none'}
                            title={
                                selectedHumiditySensor === 'none' && selectedAirTempSensor === 'none' && selectedWaterTempSensor === 'none'
                                    ? 'Pilih filter sensor terlebih dahulu'
                                    : `Hapus ${filteredData.length} data sesuai filter yang dipilih`
                            }
                        >
                            <Trash2 size={18} />
                            Hapus Sesuai Filter
                            {filteredData.length > 0 && (selectedHumiditySensor !== 'none' || selectedAirTempSensor !== 'none' || selectedWaterTempSensor !== 'none') ? (
                                <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">
                                    {filteredData.length}
                                </span>
                            ) : null}
                        </button>
                    </div>
                </div>
            </div>


            {/* Sensor Status Modal */}
            {showStatusModal && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm"
                    onClick={() => setShowStatusModal(false)}
                >
                    <div
                        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="bg-blue-500 p-6 flex items-center justify-between">
                            <div className="flex items-center gap-3 text-white">
                                <div className="p-2 bg-white/20 rounded-lg">
                                    <CheckCircle size={24} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold">Status Semua Sensor</h2>
                                    <p className="text-blue-100 text-sm mt-1">
                                        {totalActiveSensors} Aktif • {totalInactiveSensors} Tidak Aktif
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowStatusModal(false)}
                                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                            >
                                <X size={24} className="text-white" />
                            </button>
                        </div>

                        <div className="p-6 overflow-auto max-h-[calc(90vh-200px)]">
                            {/* Humidity Sensors */}
                            <div className="mb-6">
                                <div className="flex items-center gap-2 mb-4">
                                    <Droplets size={20} className="text-blue-500" />
                                    <h3 className="font-bold text-gray-800">Sensor Kelembapan</h3>
                                    <span className="text-sm text-gray-500 ml-auto">{activeHumiditySensors}/7 Aktif</span>
                                </div>
                                <div className="grid grid-cols-3 sm:grid-cols-7 gap-3">
                                    {allHumiditySensors.map((sensorId) => {
                                        const isActive = sensorStatus?.humidity?.[sensorId] ?? false;
                                        const value = realtimeData?.humidity?.[sensorId];
                                        return (
                                            <div
                                                key={sensorId}
                                                className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${isActive ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}
                                            >
                                                <div className="relative mb-1">
                                                    {isActive ? (
                                                        <>
                                                            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                                                            <div className="w-3 h-3 bg-green-500 rounded-full animate-ping absolute top-0 left-0 opacity-75"></div>
                                                        </>
                                                    ) : (
                                                        <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                                                    )}
                                                </div>
                                                <span className={`font-bold text-sm ${isActive ? 'text-green-700' : 'text-red-600'}`}>{sensorId}</span>
                                                <span className={`text-lg font-bold mt-1 ${isActive ? 'text-blue-600' : 'text-gray-400'}`}>
                                                    {isActive ? (value !== null && value !== undefined ? `${formatValue(value)}%` : '0%') : '0%'}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Air Temperature Sensors */}
                            <div className="mb-6">
                                <div className="flex items-center gap-2 mb-4">
                                    <Thermometer size={20} className="text-orange-500" />
                                    <h3 className="font-bold text-gray-800">Sensor Suhu Udara</h3>
                                    <span className="text-sm text-gray-500 ml-auto">{activeAirTempSensors}/7 Aktif</span>
                                </div>
                                <div className="grid grid-cols-4 sm:grid-cols-7 gap-3">
                                    {allAirTempSensors.map((sensorId) => {
                                        const isActive = sensorStatus?.airTemperature?.[sensorId] ?? false;
                                        const value = realtimeData?.airTemperature?.[sensorId];
                                        return (
                                            <div
                                                key={sensorId}
                                                className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${isActive ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}
                                            >
                                                <div className="relative mb-1">
                                                    {isActive ? (
                                                        <>
                                                            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                                                            <div className="w-3 h-3 bg-green-500 rounded-full animate-ping absolute top-0 left-0 opacity-75"></div>
                                                        </>
                                                    ) : (
                                                        <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                                                    )}
                                                </div>
                                                <span className={`font-bold text-sm ${isActive ? 'text-green-700' : 'text-red-600'}`}>{sensorId}</span>
                                                <span className={`text-lg font-bold mt-1 ${isActive ? 'text-orange-600' : 'text-gray-400'}`}>
                                                    {isActive ? (value !== null && value !== undefined ? `${formatValue(value)}°` : '0°') : '0°'}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Water Temperature Sensors */}
                            <div>
                                <div className="flex items-center gap-2 mb-4">
                                    <Thermometer size={20} className="text-cyan-500" />
                                    <h3 className="font-bold text-gray-800">Sensor Suhu Air</h3>
                                    <span className="text-sm text-gray-500 ml-auto">{activeWaterTempSensors}/8 Aktif</span>
                                </div>
                                <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
                                    {allWaterTempSensors.map((sensorId) => {
                                        const isActive = sensorStatus?.waterTemperature?.[sensorId] ?? false;
                                        const value = realtimeData?.waterTemperature?.[sensorId];
                                        return (
                                            <div
                                                key={sensorId}
                                                className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${isActive ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}
                                            >
                                                <div className="relative mb-1">
                                                    {isActive ? (
                                                        <>
                                                            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                                                            <div className="w-3 h-3 bg-green-500 rounded-full animate-ping absolute top-0 left-0 opacity-75"></div>
                                                        </>
                                                    ) : (
                                                        <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                                                    )}
                                                </div>
                                                <span className={`font-bold text-sm ${isActive ? 'text-green-700' : 'text-red-600'}`}>{sensorId}</span>
                                                <span className={`text-lg font-bold mt-1 ${isActive ? 'text-cyan-600' : 'text-gray-400'}`}>
                                                    {isActive ? (value !== null && value !== undefined ? `${formatValue(value)}°` : '0°') : '0°'}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>


                        </div>

                        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-6">
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                                        <span className="text-sm text-gray-600">Sensor Aktif</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                                        <span className="text-sm text-gray-600">Sensor Offline</span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowStatusModal(false)}
                                    className="px-5 py-2 bg-blue-500 text-white font-medium rounded-xl hover:bg-blue-600 transition-all duration-200"
                                >
                                    Tutup
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )
            }

            {/* Data Logger Section */}
            <div className="mb-6">
                <DataLogger
                    onIntervalChange={handleIntervalChange}
                    isLogging={isLogging}
                    onToggleLogging={handleToggleLogging}
                    logCount={logCount}
                />
            </div>

            {/* Filters */}
            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 mb-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">Filter Data Sensor</h3>
                <div className="flex flex-wrap gap-4 items-end">
                    {/* Humidity Sensor Filter */}
                    <div className="flex-1 min-w-[200px]">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Sensor Kelembapan
                        </label>
                        <div className="relative">
                            <Droplets className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400" size={18} />
                            <select
                                className="w-full pl-10 pr-4 py-2.5 border border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none appearance-none bg-blue-50 text-gray-700 font-medium"
                                value={selectedHumiditySensor}
                                onChange={(e) => setSelectedHumiditySensor(e.target.value)}
                            >
                                <option value="all">all</option>
                                <option value="none">none</option>
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-400 pointer-events-none" size={18} />
                        </div>
                    </div>

                    {/* Air Temperature Filter */}
                    <div className="flex-1 min-w-[200px]">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Sensor Suhu Udara
                        </label>
                        <div className="relative">
                            <Thermometer className="absolute left-3 top-1/2 -translate-y-1/2 text-orange-400" size={18} />
                            <select
                                className="w-full pl-10 pr-4 py-2.5 border border-orange-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none appearance-none bg-orange-50 text-gray-700 font-medium"
                                value={selectedAirTempSensor}
                                onChange={(e) => setSelectedAirTempSensor(e.target.value)}
                            >
                                <option value="all">all</option>
                                <option value="none">none</option>
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-orange-400 pointer-events-none" size={18} />
                        </div>
                    </div>

                    {/* Water Temperature Filter */}
                    <div className="flex-1 min-w-[200px]">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Sensor Suhu Air
                        </label>
                        <div className="relative">
                            <Thermometer className="absolute left-3 top-1/2 -translate-y-1/2 text-cyan-400" size={18} />
                            <select
                                className="w-full pl-10 pr-4 py-2.5 border border-cyan-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none appearance-none bg-cyan-50 text-gray-700 font-medium"
                                value={selectedWaterTempSensor}
                                onChange={(e) => setSelectedWaterTempSensor(e.target.value)}
                            >
                                <option value="all">all</option>
                                <option value="none">none</option>
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-cyan-400 pointer-events-none" size={18} />
                        </div>
                    </div>

                    {/* Water Level Sensor Filter - REMOVED */}
                    {/* Date Range Filters - REMOVED (Daily Log feature replaces this functionality) */}
                </div>
            </div>

            {/* Data Count */}
            <div className="mb-4 flex items-center justify-between">
                <p className="text-sm text-gray-600">
                    Menampilkan <span className="font-bold">{filteredData.length}</span> data (dari total {data.length})
                </p>
                {loading && <p className="text-sm text-blue-600">Loading...</p>}
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-[600px]">
                <div className="overflow-auto flex-1 custom-scrollbar">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-50 border-b border-gray-100 sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th className="px-6 py-4 font-semibold text-gray-600 bg-gray-50">Waktu</th>
                                <th className="px-6 py-4 font-semibold text-gray-600 bg-gray-50 text-center">Sensor</th>
                                <th className="px-6 py-4 font-semibold text-gray-600 bg-gray-50">Tipe</th>
                                <th className="px-6 py-4 font-semibold text-gray-600 bg-gray-50">Nilai</th>
                                <th className="px-6 py-4 font-semibold text-gray-600 bg-gray-50 text-center">Status</th>
                                <th className="px-6 py-4 font-semibold text-gray-600 bg-gray-50">Interval</th>
                                {currentUserIsAdmin && (
                                    <th className="px-6 py-4 font-semibold text-gray-600 bg-gray-50 text-center">Direkam Oleh</th>
                                )}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredData.length === 0 ? (
                                <tr>
                                    <td colSpan={currentUserIsAdmin ? 7 : 6} className="px-6 py-12 text-center text-gray-500">
                                        {isLogging
                                            ? 'Data logger aktif. Menunggu data masuk...'
                                            : 'Belum ada data. Aktifkan Data Logger untuk mulai merekam.'}
                                    </td>
                                </tr>
                            ) : (
                                filteredData.map((row) => (
                                    <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 text-gray-600 whitespace-nowrap">
                                            {new Date(row.timestamp).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`text-lg font-bold ${getTypeCategory(row) === 'humidity' ? 'text-blue-600' : getTypeCategory(row) === 'air_temperature' ? 'text-orange-600' : getTypeCategory(row) === 'water_temperature' ? 'text-cyan-600' : 'text-gray-600'}`}>
                                                {row.sensor_id}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getTypeBadgeClass(row)}`}>
                                                {getTypeLabel(row)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 font-medium text-gray-800">
                                            {row.value}{row.unit}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {row.status === 'active' ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                                                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                                    Aktif
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-600 rounded-full text-xs font-medium">
                                                    <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                                                    Tidak Aktif
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${row.interval === 5 ? 'bg-green-100 text-green-700' :
                                                row.interval === 10 ? 'bg-yellow-100 text-yellow-700' :
                                                    row.interval === 60 ? 'bg-purple-100 text-purple-700' :
                                                        'bg-gray-100 text-gray-700'
                                                }`}>
                                                {row.interval ? `${row.interval}s` : 'N/A'}
                                            </span>
                                        </td>
                                        {/* Admin-only: show who recorded this data */}
                                        {currentUserIsAdmin && (
                                            <td className="px-6 py-4 text-center">
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-purple-50 text-purple-700 rounded-full text-xs font-medium">
                                                    <User size={11} />
                                                    {row.userName || 'N/A'}
                                                </span>
                                            </td>
                                        )}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Custom Alert Component */}
            <CustomAlert
                isOpen={alertConfig.isOpen}
                onClose={closeAlert}
                title={alertConfig.title}
                message={alertConfig.message}
                type={alertConfig.type}
                isConfirm={alertConfig.isConfirm}
                onConfirm={() => {
                    alertConfig.onConfirm();
                    closeAlert();
                }}
            />
        </div >
    );

};

export default Report;

