import React, { useState, useEffect } from 'react';
import SensorSelectCard from '../components/SensorSelectCard';
import WaterLevelCard from '../components/WaterLevelCard';
import WaterWeightCard from '../components/WaterWeightCard';
import CardsCarousel from '../components/CardsCarousel';
import SensorChart from '../components/SensorChart';
import sensorService from '../services/sensorService';
import { useLogger } from '../context/LoggerContext';
import { Thermometer, Droplets, AlertTriangle, AlertOctagon, X, CheckCircle, XCircle } from 'lucide-react';

const Dashboard = () => {
    // Get Realtime Data Stream, Sensor Status, and Pump Status
    const { realtimeData, sensorStatus, pumpStatus, waterWeight } = useLogger();

    // Defensive check to avoid runtime errors
    const isWaterWeightActive = waterWeight !== null && waterWeight !== undefined;

    // Helper function to format values to 2 decimal places
    const formatValue = (val) => {
        if (val === null || val === undefined || isNaN(val)) return '--';
        return Number(val).toFixed(2);
    };

    // Selected sensors for each card
    const [selectedHumidity, setSelectedHumidity] = useState('RH1');
    const [selectedAirTemp, setSelectedAirTemp] = useState('T1');
    const [selectedWaterTemp, setSelectedWaterTemp] = useState('T8');
    const [selectedWaterLevel, setSelectedWaterLevel] = useState('WL1');

    const [dbStatus, setDbStatus] = useState(null);
    const [showStatusModal, setShowStatusModal] = useState(false);

    // History data for chart
    const [chartData, setChartData] = useState([]);

    // Options for dropdown
    const humidityOptions = Array.from({ length: 7 }, (_, i) => ({
        value: `RH${i + 1}`,
        label: `Kelembapan (RH${i + 1})`
    }));

    const airTempOptions = Array.from({ length: 7 }, (_, i) => ({
        value: `T${i + 1}`,
        label: `Suhu Udara (T${i + 1})`
    }));

    const waterTempOptions = Array.from({ length: 8 }, (_, i) => ({
        value: `T${i + 8}`,
        label: `Suhu Air (T${i + 8})`
    }));

    // Define ALL expected sensors for status display
    const allHumiditySensors = ['RH1', 'RH2', 'RH3', 'RH4', 'RH5', 'RH6', 'RH7'];
    const allAirTempSensors = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    const allWaterTempSensors = ['T8', 'T9', 'T10', 'T11', 'T12', 'T13', 'T14', 'T15'];
    const allWaterLevelSensors = ['WL1'];

    // Fetch database status
    useEffect(() => {
        const fetchDbStatus = async () => {
            try {
                const status = await sensorService.getDatabaseStatus();
                setDbStatus(status);
            } catch (error) {
                console.error("Error fetching DB status:", error);
            }
        };

        fetchDbStatus();
        const interval = setInterval(fetchDbStatus, 60000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (!realtimeData || !realtimeData.humidity || !realtimeData.airTemperature || !realtimeData.waterTemperature) return;

        const humidValue = realtimeData.humidity[selectedHumidity];
        const airTempValue = realtimeData.airTemperature[selectedAirTemp];
        const waterTempValue = realtimeData.waterTemperature[selectedWaterTemp];

        if (humidValue === null && airTempValue === null && waterTempValue === null) return;

        const timeString = new Date().toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });

        setChartData(prev => {
            const newPoint = {
                time: timeString,
                humidity: humidValue ?? prev[prev.length - 1]?.humidity ?? 0,
                airTemp: airTempValue ?? prev[prev.length - 1]?.airTemp ?? 0,
                waterTemp: waterTempValue ?? prev[prev.length - 1]?.waterTemp ?? 0
            };

            const newHistory = [...prev, newPoint];
            if (newHistory.length > 20) return newHistory.slice(newHistory.length - 20);
            return newHistory;
        });
    }, [realtimeData, selectedHumidity, selectedAirTemp, selectedWaterTemp]);

    // Clear chart when switching sensors
    useEffect(() => {
        setChartData([]);
    }, [selectedHumidity, selectedAirTemp, selectedWaterTemp]);

    // Get current values
    const currentHumidityValue = realtimeData?.humidity?.[selectedHumidity] ?? 0;
    const currentAirTempValue = realtimeData?.airTemperature?.[selectedAirTemp] ?? 0;
    const currentWaterTempValue = realtimeData?.waterTemperature?.[selectedWaterTemp] ?? 0;
    const currentWaterLevelValue = realtimeData?.waterLevel?.[selectedWaterLevel] ?? 0;

    // Count active sensors
    const activeHumiditySensors = sensorStatus?.humidity
        ? Object.values(sensorStatus.humidity).filter(s => s).length
        : 0;
    const activeAirTempSensors = sensorStatus?.airTemperature
        ? Object.values(sensorStatus.airTemperature).filter(s => s).length
        : 0;
    const activeWaterTempSensors = sensorStatus?.waterTemperature
        ? Object.values(sensorStatus.waterTemperature).filter(s => s).length
        : 0;
    const activeWaterLevelSensors = sensorStatus?.waterLevel
        ? Object.values(sensorStatus.waterLevel).filter(s => s).length
        : 0;

    const totalActiveSensors = activeHumiditySensors + activeAirTempSensors + activeWaterTempSensors + activeWaterLevelSensors;
    // 7 RH + 7 AirTemp + 8 WaterTemp + 1 WaterLevel = 23 sensors
    const totalInactiveSensors = (7 + 7 + 8 + 1) - totalActiveSensors;

    return (
        <div className="p-4 md:p-6 bg-gray-50 min-h-screen">
            {/* Database Status Alert */}
            {dbStatus && dbStatus.status !== 'OK' && (
                <div className={`mb-6 p-4 rounded-xl flex items-start gap-3 shadow-sm ${dbStatus.status === 'CRITICAL'
                    ? 'bg-red-50 border border-red-200 text-red-700'
                    : 'bg-yellow-50 border border-yellow-200 text-yellow-700'
                    }`}>
                    <div className="mt-1">
                        {dbStatus.status === 'CRITICAL' ? <AlertOctagon size={24} /> : <AlertTriangle size={24} />}
                    </div>
                    <div>
                        <h3 className="font-bold text-lg">
                            {dbStatus.status === 'CRITICAL' ? 'Database Critical Warning!' : 'Database Warning'}
                        </h3>
                        <p className="mt-1">{dbStatus.message}</p>
                        <div className="mt-2 text-sm opacity-90 flex gap-4">
                            <span>Current Records: <strong>{dbStatus.total_records?.toLocaleString()}</strong></span>
                            <span>Size: <strong>{dbStatus.table_size_mb} MB</strong></span>
                        </div>
                    </div>
                </div>
            )}

            {/* Header Section */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800">Monitoring Sensor</h2>
                        <p className="text-gray-500 text-sm mt-1">Pilih sensor individual untuk melihat data real-time</p>
                    </div>

                    {/* Status Indicators - Clickable */}
                    <div className="flex items-center gap-3">
                        {/* Live Data indicator removed as per request */}

                        {/* Clickable Sensor Status */}
                        <button
                            onClick={() => setShowStatusModal(true)}
                            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl border border-blue-200 hover:from-blue-100 hover:to-cyan-100 transition-all duration-200 cursor-pointer group"
                        >
                            <div className="flex items-center gap-1.5">
                                <CheckCircle size={16} className="text-green-500" />
                                <span className="text-green-700 font-bold text-sm">{totalActiveSensors}</span>
                            </div>
                            <div className="w-px h-4 bg-gray-300"></div>
                            <div className="flex items-center gap-1.5">
                                <XCircle size={16} className="text-red-400" />
                                <span className="text-red-600 font-bold text-sm">{totalInactiveSensors}</span>
                            </div>
                            <span className="text-gray-500 text-xs ml-1 group-hover:text-blue-600 transition-colors">Detail →</span>
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
                        {/* Modal Header */}
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

                        {/* Modal Content */}
                        <div className="p-6 overflow-auto max-h-[calc(90vh-200px)]">
                            {/* Humidity Sensors */}
                            <div className="mb-6">
                                <div className="flex items-center gap-2 mb-4">
                                    <Droplets size={20} className="text-blue-500" />
                                    <h3 className="font-bold text-gray-800">Sensor Kelembapan (RH1-RH7)</h3>
                                    <span className="text-sm text-gray-500 ml-auto">
                                        {activeHumiditySensors}/7 Aktif
                                    </span>
                                </div>
                                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-3">
                                    {allHumiditySensors.map((sensorId) => {
                                        const isActive = sensorStatus?.humidity?.[sensorId] ?? false;
                                        const value = realtimeData?.humidity?.[sensorId];
                                        return (
                                            <div
                                                key={sensorId}
                                                className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${isActive
                                                    ? 'bg-green-50 border-green-200'
                                                    : 'bg-red-50 border-red-200'
                                                    }`}
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
                                                <span className={`font-bold text-sm ${isActive ? 'text-green-700' : 'text-red-600'}`}>
                                                    {sensorId}
                                                </span>
                                                <span className={`text-lg font-bold mt-1 ${isActive ? 'text-blue-600' : 'text-gray-400'}`}>
                                                    {isActive && value !== null && value !== undefined ? `${formatValue(value)}%` : '--'}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Temperature Sensors - Air */}
                            <div className="mb-6">
                                <div className="flex items-center gap-2 mb-4">
                                    <Thermometer size={20} className="text-orange-500" />
                                    <h3 className="font-bold text-gray-800">Sensor Suhu Udara (T1-T7)</h3>
                                    <span className="text-sm text-gray-500 ml-auto">
                                        {activeAirTempSensors}/7 Aktif
                                    </span>
                                </div>
                                <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-7 gap-3">
                                    {allAirTempSensors.map((sensorId) => {
                                        const isActive = sensorStatus?.airTemperature?.[sensorId] ?? false;
                                        const value = realtimeData?.airTemperature?.[sensorId];
                                        return (
                                            <div
                                                key={sensorId}
                                                className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${isActive
                                                    ? 'bg-green-50 border-green-200'
                                                    : 'bg-red-50 border-red-200'
                                                    }`}
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
                                                <span className={`font-bold text-sm ${isActive ? 'text-green-700' : 'text-red-600'}`}>
                                                    {sensorId}
                                                </span>
                                                <span className={`text-lg font-bold mt-1 ${isActive ? 'text-orange-600' : 'text-gray-400'}`}>
                                                    {isActive && value !== null && value !== undefined ? `${formatValue(value)}°` : '--'}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Temperature Sensors - Water */}
                            <div className="mb-6">
                                <div className="flex items-center gap-2 mb-4">
                                    <Thermometer size={20} className="text-cyan-500" />
                                    <h3 className="font-bold text-gray-800">Sensor Suhu Air (T8-T15)</h3>
                                    <span className="text-sm text-gray-500 ml-auto">
                                        {activeWaterTempSensors}/8 Aktif
                                    </span>
                                </div>
                                <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-8 gap-3">
                                    {allWaterTempSensors.map((sensorId) => {
                                        const isActive = sensorStatus?.waterTemperature?.[sensorId] ?? false;
                                        const value = realtimeData?.waterTemperature?.[sensorId];
                                        return (
                                            <div
                                                key={sensorId}
                                                className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${isActive
                                                    ? 'bg-green-50 border-green-200'
                                                    : 'bg-red-50 border-red-200'
                                                    }`}
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
                                                <span className={`font-bold text-sm ${isActive ? 'text-green-700' : 'text-red-600'}`}>
                                                    {sensorId}
                                                </span>
                                                <span className={`text-lg font-bold mt-1 ${isActive ? 'text-cyan-600' : 'text-gray-400'}`}>
                                                    {isActive && value !== null && value !== undefined ? `${formatValue(value)}°` : '--'}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Water Level Sensors */}
                            <div>
                                <div className="flex items-center gap-2 mb-4">
                                    <Droplets size={20} className="text-cyan-500" />
                                    <h3 className="font-bold text-gray-800">Sensor Water Level</h3>
                                    <span className="text-sm text-gray-500 ml-auto">
                                        {activeWaterLevelSensors}/1 Aktif
                                    </span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                    {allWaterLevelSensors.map((sensorId) => {
                                        const isActive = sensorStatus?.waterLevel?.[sensorId] ?? false;
                                        const value = realtimeData?.waterLevel?.[sensorId];
                                        return (
                                            <div
                                                key={sensorId}
                                                className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${isActive
                                                    ? 'bg-green-50 border-green-200'
                                                    : 'bg-red-50 border-red-200'
                                                    }`}
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
                                                <span className={`font-bold text-sm ${isActive ? 'text-green-700' : 'text-red-600'}`}>
                                                    {sensorId}
                                                </span>
                                                <span className={`text-lg font-bold mt-1 ${isActive ? 'text-cyan-600' : 'text-gray-400'}`}>
                                                    {isActive && value !== null && value !== undefined ? `${formatValue(value)}%` : '--'}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Water Weight / Desalination Result Sensor */}
                            <div className="mt-6">
                                <div className="flex items-center gap-2 mb-4">
                                    <Droplets size={20} className="text-teal-500" />
                                    <h3 className="font-bold text-gray-800">Sensor Hasil Desalinasi</h3>
                                    <span className="text-sm text-gray-500 ml-auto">
                                        {isWaterWeightActive ? '1' : '0'}/1 Aktif
                                    </span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                    <div
                                        className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${isWaterWeightActive
                                            ? 'bg-green-50 border-green-200'
                                            : 'bg-red-50 border-red-200'
                                            }`}
                                    >
                                        <div className="relative mb-1">
                                            {isWaterWeightActive ? (
                                                <>
                                                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                                                    <div className="w-3 h-3 bg-green-500 rounded-full animate-ping absolute top-0 left-0 opacity-75"></div>
                                                </>
                                            ) : (
                                                <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                                            )}
                                        </div>
                                        <span className={`font-bold text-sm ${isWaterWeightActive ? 'text-green-700' : 'text-red-600'}`}>
                                            Water Weight
                                        </span>
                                        <span className={`text-lg font-bold mt-1 ${isWaterWeightActive ? 'text-teal-600' : 'text-gray-400'}`}>
                                            {isWaterWeightActive ? `${formatValue(waterWeight)} g` : '--'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer with Legend */}
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
            )}

            {/* Cards Section with Carousel behavior */}
            <div className="mb-8">
                <CardsCarousel>
                    {/* Card 1: Kelembapan (RH1-RH7) */}
                    <SensorSelectCard
                        title="Humidity"
                        subtitle="Monitoring kelembapan udara"
                        value={currentHumidityValue}
                        unit="%"
                        icon={Droplets}
                        colorTheme="blue"
                        options={humidityOptions}
                        selectedOption={selectedHumidity}
                        onSelectChange={setSelectedHumidity}
                        sensorStatus={sensorStatus?.humidity || {}}
                        max={100}
                    />

                    {/* Card 2: Suhu Udara (T1-T7) */}
                    <SensorSelectCard
                        title="Suhu Udara"
                        subtitle="Monitoring Suhu udara"
                        value={currentAirTempValue}
                        unit="°C"
                        icon={Thermometer}
                        colorTheme="orange"
                        options={airTempOptions}
                        selectedOption={selectedAirTemp}
                        onSelectChange={setSelectedAirTemp}
                        sensorStatus={sensorStatus?.airTemperature || {}}
                    />

                    {/* Card 3: Suhu Air (T8-T15) */}
                    <SensorSelectCard
                        title="Suhu Air"
                        subtitle="Monitoring Suhu Air"
                        value={currentWaterTempValue}
                        unit="°C"
                        icon={Thermometer}
                        colorTheme="cyan"
                        options={waterTempOptions}
                        selectedOption={selectedWaterTemp}
                        onSelectChange={setSelectedWaterTemp}
                        sensorStatus={sensorStatus?.waterTemperature || {}}
                    />

                    {/* Card 3: Water Level */}
                    <WaterLevelCard
                        value={currentWaterLevelValue}
                        status={sensorStatus?.waterLevel?.[selectedWaterLevel] ?? true}
                        pumpStatus={pumpStatus}
                    />

                    {/* Card 4: Water Weight Result */}
                    <WaterWeightCard
                        weightInGrams={waterWeight}
                    />
                </CardsCarousel>
            </div>

            {/* Chart Section */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <div className="mb-6">
                    <h3 className="text-xl font-bold text-gray-800">Grafik Real-time</h3>
                    <p className="text-gray-500 text-sm mt-1">
                        Menampilkan data {selectedHumidity} (Kelembapan), {selectedAirTemp} (Suhu Udara), dan {selectedWaterTemp} (Suhu Air)
                    </p>
                </div>
                <SensorChart
                    data={chartData}
                    dataKeys={[
                        { key: 'humidity', name: `Kelembapan (${selectedHumidity})`, color: '#3b82f6' },
                        { key: 'airTemp', name: `Suhu Udara (${selectedAirTemp})`, color: '#f97316' },
                        { key: 'waterTemp', name: `Suhu Air (${selectedWaterTemp})`, color: '#06b6d4' }
                    ]}
                />
            </div>
        </div>
    );
};

export default Dashboard;
