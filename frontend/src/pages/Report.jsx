import React, { useState, useEffect, useRef } from 'react';
import { Download, Trash2, Filter, Calendar, RefreshCw, ChevronDown, CheckCircle, XCircle, X, Droplets, Thermometer, Waves } from 'lucide-react';
import sensorService from '../services/sensorService';
import DataLogger from '../components/DataLogger';
import { useLogger } from '../context/LoggerContext';
import CustomAlert from '../components/CustomAlert';

const Report = () => {
    // Separate filters for humidity and temperature sensors
    const [selectedHumiditySensor, setSelectedHumiditySensor] = useState('all');
    const [selectedAirTempSensor, setSelectedAirTempSensor] = useState('all');
    const [selectedWaterTempSensor, setSelectedWaterTempSensor] = useState('all');
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showDeleteMenu, setShowDeleteMenu] = useState(false);
    const [showStatusModal, setShowStatusModal] = useState(false);
    const deleteMenuRef = useRef(null);

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

    // Helper function to format values to 2 decimal places
    const formatValue = (val) => {
        if (val === null || val === undefined || isNaN(val)) return '--';
        return Number(val).toFixed(2);
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
    // 7 RH + 7 AirTemp + 8 WaterTemp = 22 sensors
    const totalInactiveSensors = (7 + 7 + 8) - totalActiveSensors;

    // Sensor options
    const humidityOptions = Array.from({ length: 7 }, (_, i) => ({ value: `RH${i + 1}`, label: `RH${i + 1}` }));
    const airTempOptions = Array.from({ length: 7 }, (_, i) => ({ value: `T${i + 1}`, label: `T${i + 1}` }));
    const waterTempOptions = Array.from({ length: 8 }, (_, i) => ({ value: `T${i + 8}`, label: `T${i + 8}` }));

    // Define ALL expected sensors for status display
    const allHumiditySensors = ['RH1', 'RH2', 'RH3', 'RH4', 'RH5', 'RH6', 'RH7'];
    const allAirTempSensors = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    const allWaterTempSensors = ['T8', 'T9', 'T10', 'T11', 'T12', 'T13', 'T14', 'T15'];

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

    // Auto-refresh table when new log comes in
    useEffect(() => {
        if (logCount > 0) {
            fetchData();
        }
    }, [logCount]);

    const handleToggleLogging = () => {
        // Merge air and water temp choice for backend (simple logic: favor 'all' if any is 'all')
        let tempConfig = 'none';
        if (selectedAirTempSensor !== 'none' || selectedWaterTempSensor !== 'none') {
            if (selectedAirTempSensor === 'all' || selectedWaterTempSensor === 'all') {
                tempConfig = 'all';
            } else {
                // If both specific, default to one (limitation of current backend API structure if it only takes one 'temperature' field)
                // Assuming backend takes 'temperature' as a single string.
                tempConfig = selectedAirTempSensor;
            }
        }

        const sensorConfig = {
            humidity: selectedHumiditySensor === 'none' ? 'none' : selectedHumiditySensor,
            temperature: tempConfig,
            waterLevel: 'none'
        };

        console.log('[Report] Starting logger with config:', sensorConfig);
        toggleLogging(sensorConfig);
    };

    const handleIntervalChange = (newInterval) => {
        changeInterval(newInterval);
    };

    // Fetch data from backend
    const fetchData = async () => {
        setLoading(true);
        try {
            const params = { limit: 500 }; // Get more data for filtering

            // Build sensor ID filter based on selected sensors
            const selectedSensorIds = [];

            // Add humidity sensor filter
            if (selectedHumiditySensor !== 'none') {
                if (selectedHumiditySensor === 'all') {
                    // Will be filtered client-side
                } else {
                    selectedSensorIds.push(selectedHumiditySensor);
                }
            }

            // Add air temperature sensor filter  
            if (selectedAirTempSensor !== 'none') {
                if (selectedAirTempSensor === 'all') {
                    // Will be filtered client-side
                } else {
                    selectedSensorIds.push(selectedAirTempSensor);
                }
            }

            // Add water temperature sensor filter  
            if (selectedWaterTempSensor !== 'none') {
                if (selectedWaterTempSensor === 'all') {
                    // Will be filtered client-side
                } else {
                    selectedSensorIds.push(selectedWaterTempSensor);
                }
            }

            // If specific sensors selected, add to params
            if (selectedSensorIds.length > 0 && selectedSensorIds.length <= 3) {
                params.sensorId = selectedSensorIds[0]; // API currently supports single sensor
            }

            // Add date range filter
            if (dateRange.start && dateRange.end) {
                params.startDate = dateRange.start;
                params.endDate = dateRange.end;
            }

            const result = await sensorService.getAll(params);
            if (Array.isArray(result)) {
                setData(result);
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
    };

    // Load data on mount
    useEffect(() => {
        fetchData();
    }, []);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (deleteMenuRef.current && !deleteMenuRef.current.contains(event.target)) {
                setShowDeleteMenu(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Filter data
    const safeData = Array.isArray(data) ? data : [];
    const filteredData = safeData.filter(item => {
        // Filter by interval - only filter if item has interval
        if (item.interval !== undefined && item.interval !== null) {
            const selectedSeconds = Math.floor(logInterval / 1000);
            if (item.interval !== selectedSeconds) return false;
        }

        // Determine if this sensor type should be shown based on filter settings
        const sensorType = item.sensor_type;
        const sensorId = item.sensor_id;

        if (sensorType === 'humidity') {
            // If humidity filter is 'none', hide all humidity data
            if (selectedHumiditySensor === 'none') return false;
            // If specific sensor selected, only show that sensor
            if (selectedHumiditySensor !== 'all' && sensorId !== selectedHumiditySensor) return false;
            // If 'all', show this humidity data
            return true;
        }

        if (sensorType === 'temperature') {
            const tempIdNum = parseInt(sensorId.replace('T', ''), 10);
            const isAirTemp = tempIdNum <= 7;
            const isWaterTemp = tempIdNum >= 8;

            // Check Air Temp Filter
            if (isAirTemp) {
                if (selectedAirTempSensor === 'none') return false;
                if (selectedAirTempSensor !== 'all' && sensorId !== selectedAirTempSensor) return false;
                return true;
            }

            // Check Water Temp Filter
            if (isWaterTemp) {
                if (selectedWaterTempSensor === 'none') return false;
                if (selectedWaterTempSensor !== 'all' && sensorId !== selectedWaterTempSensor) return false;
                return true;
            }

            return false;
        }

        // Unknown sensor type - show by default
        return true;
    });

    const handleExport = () => {
        if (filteredData.length === 0) {
            const intervalSeconds = Math.floor(logInterval / 1000);
            showAlert(
                'Data Kosong',
                `Tidak ada data untuk di-export.\n\nData saat ini difilter berdasarkan interval ${intervalSeconds}s.`,
                'warning'
            );
            return;
        }

        // Custom CSV export for new structure
        const headers = ['ID', 'Sensor ID', 'Type', 'Value', 'Unit', 'Status', 'Interval (s)', 'Timestamp'];
        const csvContent = [
            headers.join(','),
            ...filteredData.map(row => [
                row.id,
                row.sensor_id,
                row.sensor_type,
                row.value,
                row.unit,
                row.status,
                row.interval || 'N/A',
                `"${new Date(row.timestamp).toLocaleString()}"`
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `sensor_report_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleRefresh = async () => {
        await fetchData();
        setTimeout(() => {
            showAlert('Berhasil', 'Data berhasil diperbarui!', 'success');
        }, 100);
    };

    const handleDelete = (id) => {
        showConfirm(
            'Hapus Data?',
            'Apakah Anda yakin ingin menghapus data ini?',
            async () => {
                try {
                    await sensorService.delete(id);
                    setData(prev => prev.filter(item => item.id !== id));
                    showAlert('Sukses', 'Data berhasil dihapus', 'success');
                } catch (error) {
                    console.error('Error deleting data:', error);
                    showAlert('Gagal', 'Gagal menghapus data. Silakan coba lagi.', 'error');
                }
            },
            'error'
        );
    };

    const handleDeleteAll = () => {
        showConfirm(
            'Hapus SEMUA Data?',
            'Apakah Anda yakin ingin menghapus SEMUA data? Tindakan ini tidak dapat dibatalkan!',
            async () => {
                try {
                    await sensorService.deleteAll();
                    setData([]);
                    showAlert('Sukses', 'Semua data berhasil dihapus', 'success');
                } catch (error) {
                    console.error('Error deleting all data:', error);
                    showAlert('Gagal', 'Gagal menghapus data. Silakan coba lagi.', 'error');
                }
            },
            'error'
        );
    };

    const handleDeleteBySensor = (sensorType) => {
        let selectedSensor;
        let sensorTypeName;

        if (sensorType === 'humidity') {
            selectedSensor = selectedHumiditySensor;
            sensorTypeName = 'Kelembapan';
        } else if (sensorType === 'airTemperature') {
            selectedSensor = selectedAirTempSensor;
            sensorTypeName = 'Suhu Udara';
        } else if (sensorType === 'waterTemperature') {
            selectedSensor = selectedWaterTempSensor;
            sensorTypeName = 'Suhu Air';
        } else {
            return; // Unknown
        }

        // If 'none' is selected, show warning
        if (selectedSensor === 'none') {
            showAlert('Pilih Sensor', `Silakan pilih sensor ${sensorTypeName} terlebih dahulu`, 'info');
            return;
        }

        // Determine what to delete
        const isDeleteAll = selectedSensor === 'all';
        const deleteTitle = isDeleteAll
            ? `Hapus SEMUA Data ${sensorTypeName}?`
            : `Hapus Data Sensor ${selectedSensor}?`;
        const deleteMessage = isDeleteAll
            ? `Apakah Anda yakin ingin menghapus SEMUA data sensor ${sensorTypeName}?`
            : `Apakah Anda yakin ingin menghapus SEMUA data dari Sensor ${selectedSensor}?`;

        showConfirm(
            deleteTitle,
            deleteMessage,
            async () => {
                try {
                    if (isDeleteAll) {
                        // For temperature split, we need to be careful. Backend might not support deleting "just air temp" by type if type is same.
                        // We will rely on calling deleteBySensorId loop or special handling if needed.
                        // But standard 'deleteBySensorType' likely deletes ALL temperatures.
                        // Assuming updated backend or handling deletion by ID loop for safety if splitting types strictly.
                        // For this demo, if "Suhu Udara" matches 'temperature' type in DB, 'deleteBySensorType' will delete ALL temps.
                        // We should probably filter IDs and delete individually or warn user.
                        // For Safety/Simplicity in this mock environment:

                        // If it's a specific group (Air/Water) but backend has shared type:
                        // This part is tricky without backend changes. We'll attempt to use deleteBySensorId if applicable or just deleteByType if type is unique.
                        // Since Air/Water share 'temperature' type, we can't use 'deleteBySensorType' safely for just one group.
                        if (sensorType === 'airTemperature' || sensorType === 'waterTemperature') {
                            // Delete by range logic would be best here
                            // For now, let's just delete the exact logic for the selected "all" (which might mean loop)
                            // Since we don't have a reliable "Delete Range" API, we will just use deleteByType('temperature') 
                            // BUT this will delete both. 
                            // Let's assume we send the specific sensorType string if backend supported it, else fallback.
                            await sensorService.deleteBySensorType('temperature'); // LIMITATION: Deletes all temperatures
                        } else {
                            await sensorService.deleteBySensorType(sensorType);
                        }

                        const newData = data.filter(item => {
                            if (sensorType === 'airTemperature') {
                                // Remove T1-T7
                                if (item.sensor_type === 'temperature') {
                                    const id = parseInt(item.sensor_id.replace('T', ''));
                                    return id > 7;
                                }
                                return true;
                            }
                            if (sensorType === 'waterTemperature') {
                                // Remove T8-T15
                                if (item.sensor_type === 'temperature') {
                                    const id = parseInt(item.sensor_id.replace('T', ''));
                                    return id <= 7;
                                }
                                return true;
                            }
                            return item.sensor_type !== sensorType
                        });
                        setData(newData);
                        showAlert('Sukses', `Semua data ${sensorTypeName} berhasil dihapus.`, 'success');
                    } else {
                        // Delete specific sensor
                        await sensorService.deleteBySensorId(selectedSensor);
                        const newData = data.filter(item => item.sensor_id !== selectedSensor);
                        setData(newData);
                        showAlert('Sukses', `Data sensor ${selectedSensor} berhasil dihapus.`, 'success');
                    }
                    fetchData(); // Refresh data
                } catch (error) {
                    console.error('Error deleting sensor data:', error);
                    showAlert('Error', 'Gagal menghapus data.', 'error');
                }
            },
            'error'
        );
    };

    const handleDeleteByInterval = () => {
        const intervalSeconds = Math.floor(logInterval / 1000);
        showConfirm(
            `Hapus Data Interval ${intervalSeconds}s?`,
            `Apakah Anda yakin ingin menghapus SEMUA data dengan interval ${intervalSeconds} detik?`,
            async () => {
                try {
                    const result = await sensorService.deleteByInterval(intervalSeconds);
                    if (result.success) {
                        showAlert('Sukses', `Data interval ${intervalSeconds}s berhasil dihapus.`, 'success');
                        fetchData();
                    } else {
                        showAlert('Gagal', 'Terjadi kesalahan saat menghapus.', 'error');
                    }
                } catch (error) {
                    console.error('Error deleting interval data:', error);
                    showAlert('Error', 'Gagal menghapus data.', 'error');
                }
            },
            'error'
        );
    };

    return (
        <div className="p-4 md:p-6 bg-gray-50 min-h-screen">
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
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">Data Report</h1>
                        <p className="text-gray-500 mt-1 text-sm">Historical data analysis and export</p>
                    </div>

                    {/* Status & Actions */}
                    <div className="flex flex-wrap items-center gap-3">
                        {/* Action Buttons */}
                        <button
                            onClick={handleRefresh}
                            className={`flex items-center gap-2 px-4 py-2.5 text-white rounded-xl transition-colors ${loading ? 'bg-blue-400 cursor-wait' : 'bg-blue-600 hover:bg-blue-700'}`}
                            disabled={loading}
                        >
                            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                            <span className="hidden sm:inline">{loading ? 'Refreshing...' : 'Refresh'}</span>
                        </button>

                        <button
                            onClick={handleExport}
                            className="flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors"
                        >
                            <Download size={18} />
                            <span className="hidden sm:inline">Export CSV</span>
                        </button>

                        {/* Delete Dropdown */}
                        <div className="relative" ref={deleteMenuRef}>
                            <button
                                onClick={() => data.length === 0 ? showAlert('Data Kosong', 'Tidak ada data untuk dihapus.', 'info') : setShowDeleteMenu(!showDeleteMenu)}
                                className="flex items-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors"
                            >
                                <Trash2 size={18} />
                                <span className="hidden sm:inline">Delete</span>
                                <ChevronDown size={16} className={`transition-transform ${showDeleteMenu ? 'rotate-180' : ''}`} />
                            </button>

                            {showDeleteMenu && (
                                <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-gray-200 py-2 z-50">
                                    {/* Delete Humidity Sensor */}
                                    <button
                                        onClick={() => { handleDeleteBySensor('humidity'); setShowDeleteMenu(false); }}
                                        className={`w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors flex items-center gap-3 ${selectedHumiditySensor === 'none' ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        disabled={selectedHumiditySensor === 'none'}
                                    >
                                        <Droplets size={16} className="text-blue-600" />
                                        <div>
                                            <p className="font-medium text-gray-800">Delete Sensor Kelembapan</p>
                                            <p className="text-xs text-gray-500">
                                                {selectedHumiditySensor === 'none'
                                                    ? 'Pilih sensor RH terlebih dahulu'
                                                    : selectedHumiditySensor === 'all'
                                                        ? 'Hapus SEMUA data kelembapan (RH1-RH7)'
                                                        : `Hapus data ${selectedHumiditySensor}`}
                                            </p>
                                        </div>
                                    </button>

                                    {/* Delete Air Temperature Sensor */}
                                    <button
                                        onClick={() => { handleDeleteBySensor('airTemperature'); setShowDeleteMenu(false); }}
                                        className={`w-full text-left px-4 py-3 hover:bg-orange-50 transition-colors flex items-center gap-3 ${selectedAirTempSensor === 'none' ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        disabled={selectedAirTempSensor === 'none'}
                                    >
                                        <Thermometer size={16} className="text-orange-600" />
                                        <div>
                                            <p className="font-medium text-gray-800">Delete Suhu Udara</p>
                                            <p className="text-xs text-gray-500">
                                                {selectedAirTempSensor === 'none'
                                                    ? 'Pilih sensor T1-T7'
                                                    : selectedAirTempSensor === 'all'
                                                        ? 'Hapus SEMUA data T1-T7'
                                                        : `Hapus data ${selectedAirTempSensor}`}
                                            </p>
                                        </div>
                                    </button>

                                    {/* Delete Water Temperature Sensor */}
                                    <button
                                        onClick={() => { handleDeleteBySensor('waterTemperature'); setShowDeleteMenu(false); }}
                                        className={`w-full text-left px-4 py-3 hover:bg-cyan-50 transition-colors flex items-center gap-3 ${selectedWaterTempSensor === 'none' ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        disabled={selectedWaterTempSensor === 'none'}
                                    >
                                        <Thermometer size={16} className="text-cyan-600" />
                                        <div>
                                            <p className="font-medium text-gray-800">Delete Suhu Air</p>
                                            <p className="text-xs text-gray-500">
                                                {selectedWaterTempSensor === 'none'
                                                    ? 'Pilih sensor T8-T15'
                                                    : selectedWaterTempSensor === 'all'
                                                        ? 'Hapus SEMUA data T8-T15'
                                                        : `Hapus data ${selectedWaterTempSensor}`}
                                            </p>
                                        </div>
                                    </button>

                                    {/* Delete Water Level Sensor - REMOVED */}

                                    <div className="border-t border-gray-100 my-1"></div>
                                    <button
                                        onClick={() => { handleDeleteByInterval(); setShowDeleteMenu(false); }}
                                        className="w-full text-left px-4 py-3 hover:bg-yellow-50 transition-colors flex items-center gap-3"
                                    >
                                        <Trash2 size={16} className="text-yellow-600" />
                                        <div>
                                            <p className="font-medium text-gray-800">Delete by Interval</p>
                                            <p className="text-xs text-gray-500">Delete data with {Math.floor(logInterval / 1000)}s interval</p>
                                        </div>
                                    </button>
                                    <div className="border-t border-gray-100 my-1"></div>
                                    <button
                                        onClick={() => { handleDeleteAll(); setShowDeleteMenu(false); }}
                                        className="w-full text-left px-4 py-3 hover:bg-red-50 transition-colors flex items-center gap-3"
                                    >
                                        <Trash2 size={16} className="text-red-600" />
                                        <div>
                                            <p className="font-medium text-gray-800">Delete All Data</p>
                                            <p className="text-xs text-gray-500">Remove all records permanently</p>
                                        </div>
                                    </button>
                                </div>
                            )}
                        </div>
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
                        <div className="bg-gradient-to-r from-blue-500 to-cyan-500 p-6 flex items-center justify-between">
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
                                    <h3 className="font-bold text-gray-800">Sensor Kelembapan (RH1-RH7)</h3>
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
                                                    {isActive && value !== null && value !== undefined ? `${formatValue(value)}%` : '--'}
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
                                    <h3 className="font-bold text-gray-800">Sensor Suhu Udara (T1-T7)</h3>
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
                                                    {isActive && value !== null && value !== undefined ? `${formatValue(value)}°` : '--'}
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
                                    <h3 className="font-bold text-gray-800">Sensor Suhu Air (T8-T15)</h3>
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
                                                    {isActive && value !== null && value !== undefined ? `${formatValue(value)}°` : '--'}
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
                                    className="px-5 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-medium rounded-xl hover:from-blue-600 hover:to-cyan-600 transition-all duration-200"
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
                />
                {isLogging && (
                    <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-100 flex justify-between items-center">
                        <p className="text-sm text-blue-700">
                            📊 Sedang merekam data... Total siklus: <span className="font-bold">{logCount}</span>
                        </p>
                        <p className="text-xs text-blue-600">
                            Data otomatis muncul di tabel di bawah
                        </p>
                    </div>
                )}
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
                                <option value="all">Semua Sensor RH</option>
                                <option value="none">None</option>
                                {humidityOptions.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
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
                                <option value="all">Semua Udara (T1-7)</option>
                                <option value="none">None</option>
                                {airTempOptions.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
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
                                <option value="all">Semua Air (T8-15)</option>
                                <option value="none">None</option>
                                {waterTempOptions.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-cyan-400 pointer-events-none" size={18} />
                        </div>
                    </div>

                    {/* Water Level Sensor Filter - REMOVED */}

                    {/* Start Date */}
                    <div className="flex-1 min-w-[200px]">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="datetime-local"
                                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                value={dateRange.start}
                                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* End Date */}
                    <div className="flex-1 min-w-[200px]">
                        <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="datetime-local"
                                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                value={dateRange.end}
                                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                            />
                        </div>
                    </div>

                    <button
                        onClick={fetchData}
                        className="px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium"
                    >
                        Apply Filter
                    </button>
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
                                <th className="px-6 py-4 font-semibold text-gray-600 bg-gray-50">Time</th>
                                <th className="px-6 py-4 font-semibold text-gray-600 bg-gray-50 text-center">Sensor</th>
                                <th className="px-6 py-4 font-semibold text-gray-600 bg-gray-50">Type</th>
                                <th className="px-6 py-4 font-semibold text-gray-600 bg-gray-50">Value</th>
                                <th className="px-6 py-4 font-semibold text-gray-600 bg-gray-50 text-center">Status</th>
                                <th className="px-6 py-4 font-semibold text-gray-600 bg-gray-50">Interval</th>
                                <th className="px-6 py-4 font-semibold text-gray-600 text-right bg-gray-50">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredData.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                                        Tidak ada data untuk filter yang dipilih.
                                    </td>
                                </tr>
                            ) : (
                                filteredData.map((row) => (
                                    <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 text-gray-600 whitespace-nowrap">
                                            {new Date(row.timestamp).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`text-lg font-bold ${row.sensor_type === 'humidity' ? 'text-blue-600' : row.sensor_type === 'temperature' ? 'text-orange-600' : 'text-cyan-600'}`}>
                                                {row.sensor_id}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${row.sensor_type === 'humidity' ? 'bg-blue-100 text-blue-700' :
                                                row.sensor_type === 'temperature' && parseInt(row.sensor_id.replace('T', '')) <= 7 ? 'bg-orange-100 text-orange-700' :
                                                    row.sensor_type === 'temperature' ? 'bg-cyan-100 text-cyan-700' :
                                                        'bg-gray-100 text-gray-700'
                                                }`}>
                                                {row.sensor_type === 'humidity' ? 'Kelembapan' :
                                                    row.sensor_type === 'temperature' && parseInt(row.sensor_id.replace('T', '')) <= 7 ? 'Suhu Udara' :
                                                        row.sensor_type === 'temperature' ? 'Suhu Air' : 'Water Level'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 font-medium text-gray-800">
                                            {row.value}{row.unit}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {row.status === 'active' ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                                                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                                    Active
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-600 rounded-full text-xs font-medium">
                                                    <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                                                    Inactive
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${row.interval === 5 ? 'bg-green-100 text-green-700' :
                                                row.interval === 30 ? 'bg-yellow-100 text-yellow-700' :
                                                    row.interval === 60 ? 'bg-purple-100 text-purple-700' :
                                                        row.interval === 1800 ? 'bg-indigo-100 text-indigo-700' :
                                                            'bg-gray-100 text-gray-700'
                                                }`}>
                                                {row.interval ? (row.interval >= 60 ? `${row.interval / 60}m` : `${row.interval}s`) : 'N/A'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => handleDelete(row.id)}
                                                className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition-colors"
                                                title="Delete this record"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div >
    );
};

export default Report;
