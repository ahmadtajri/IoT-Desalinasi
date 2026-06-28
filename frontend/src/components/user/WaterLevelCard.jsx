import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Power, Droplets, Settings, X, ToggleLeft, ToggleRight, Save } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import valveService from '../../services/valveService';
import PropTypes from 'prop-types';

const WaterLevelCard = ({ value, pumpStatus = false, valveStatus = null }) => {
    const { user } = useAuth();
    const isAdmin = user?.role === 'ADMIN';

    const [showSettings, setShowSettings] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    // Threshold settings for auto mode
    const [onThreshold, setOnThreshold] = useState(6.0);
    const [offThreshold, setOffThreshold] = useState(5.0);
    const [isEditingThresholds, setIsEditingThresholds] = useState(false);

    // Local mode state to prevent form from disappearing
    const [localMode, setLocalMode] = useState(null);

    // Sync local mode with props
    useEffect(() => {
        if (valveStatus?.mode) {
            setLocalMode(valveStatus.mode);
        }
    }, [valveStatus?.mode]);

    // Load thresholds from backend when modal opens
    useEffect(() => {
        if (showSettings) {
            loadThresholds();
        }
    }, [showSettings]);

    const loadThresholds = async () => {
        try {
            const response = await valveService.getStatus();
            if (response.success && response.data.thresholds) {
                setOnThreshold(response.data.thresholds.onThreshold || 6.0);
                setOffThreshold(response.data.thresholds.offThreshold || 5.0);
            }
        } catch (err) {
            console.error('Failed to load thresholds:', err);
        }
    };

    // pumpStatus: true = ON, false = OFF (dikirim dari ESP32)
    const isPumpOn = pumpStatus === true || pumpStatus === 'on' || pumpStatus === 'ON' || pumpStatus === 1;
    const currentValveStatus = valveStatus?.status || (isPumpOn ? 'open' : 'closed');
    // Use localMode as fallback to prevent form from disappearing
    const currentMode = localMode || valveStatus?.mode || 'auto';
    const valveStateLabel = currentValveStatus.toUpperCase();
    const valveModeLabel = currentMode.toUpperCase();
    const valveDistance = valveStatus?.distance !== undefined && valveStatus?.distance !== null
        ? Number(valveStatus.distance).toFixed(2)
        : null;

    // Handle valve ON/OFF
    const handleValveControl = async (command) => {
        setLoading(true);
        setError('');
        try {
            await valveService.control(command);
        } catch (err) {
            setError('Gagal mengirim perintah');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // Handle mode change
    const handleModeChange = async (mode) => {
        setLoading(true);
        setError('');
        setSuccessMsg('');
        try {
            await valveService.setMode(mode);
            // Update local mode immediately for instant UI feedback
            setLocalMode(mode);
        } catch (err) {
            setError('Gagal mengubah mode');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // Handle save thresholds
    const handleSaveThresholds = async () => {
        setLoading(true);
        setError('');
        setSuccessMsg('');

        // Validate
        if (offThreshold >= onThreshold) {
            setError('Jarak OFF harus lebih kecil dari jarak ON');
            setLoading(false);
            return;
        }

        try {
            await valveService.setThresholds(onThreshold, offThreshold);
            setSuccessMsg('Pengaturan threshold berhasil disimpan');

            // Refresh thresholds to show updated values
            await loadThresholds();

            // Close edit mode to show only the set values
            setIsEditingThresholds(false);

            setTimeout(() => setSuccessMsg(''), 3000);
        } catch (err) {
            setError('Gagal menyimpan pengaturan');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden flex flex-col h-full hover:shadow-xl transition-shadow duration-300 relative">
            {/* Header */}
            <div className="bg-sky-500 px-6 py-4">
                <div className="flex items-center gap-3 text-white">
                    <div className="p-2 bg-white/20 rounded-lg">
                        <Droplets size={24} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold">Ketinggian Air</h3>
                        <p className="text-sm text-white/80">Monitoring ketinggian air</p>
                    </div>
                </div>
            </div>

            {/* Body - Water Level & Pump Status */}
            <div className="p-6 flex flex-col justify-center flex-1">
                {/* Water Level Percentage */}
                <div className="text-center mb-6">
                    <span className="text-gray-500 text-sm font-medium">Level Saat Ini</span>
                    <div className="flex items-baseline justify-center gap-1 mt-1">
                        <span className="text-5xl font-bold text-cyan-600">
                            {value !== null ? Number(value).toFixed(2) : '--'}
                        </span>
                        <span className="text-2xl font-medium text-gray-400">%</span>
                    </div>
                </div>

                {/* Pump Status with Settings Icon */}
                <div className={`rounded-xl p-6 text-center relative ${isPumpOn ? 'bg-emerald-50 border-2 border-emerald-200' : 'bg-gray-50 border-2 border-gray-200'}`}>
                    {/* Settings Icon - Top Right Corner */}
                    {isAdmin && (
                        <button
                            onClick={() => setShowSettings(true)}
                            className="absolute top-3 right-3 p-2 bg-white/80 hover:bg-white rounded-lg transition-all shadow-sm hover:shadow-md"
                            title="Pengaturan Valve"
                        >
                            <Settings size={18} className="text-gray-600" />
                        </button>
                    )}

                    <p className="text-xs text-gray-500 mb-3 font-medium">Status Pompa</p>
                    <div className="flex items-center justify-center gap-3">
                        {isPumpOn ? (
                            <>
                                <Power size={32} className="text-emerald-500" />
                                <p className="text-3xl font-bold text-emerald-600">ON</p>
                                <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse ml-1"></div>
                            </>
                        ) : (
                            <>
                                <Power size={32} className="text-gray-400" />
                                <p className="text-3xl font-bold text-gray-500">OFF</p>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Settings Modal - Rendered via Portal to escape overflow-hidden */}
            {showSettings && createPortal(
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                    onClick={() => setShowSettings(false)}
                >
                    <div
                        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm max-h-[90vh] overflow-hidden flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header - Fixed */}
                        <div className="bg-sky-500 px-5 py-4 flex items-center justify-between flex-shrink-0">
                            <div className="flex items-center gap-2 text-white">
                                <Settings size={20} />
                                <h3 className="font-bold">Kontrol Valve</h3>
                            </div>
                            <button
                                onClick={() => setShowSettings(false)}
                                className="p-1.5 hover:bg-white/20 rounded-lg text-white transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Modal Body - Scrollable */}
                        <div className="p-5 space-y-5 overflow-y-auto flex-1">
                            {error && (
                                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                                    {error}
                                </div>
                            )}

                            {successMsg && (
                                <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-600 text-sm">
                                    {successMsg}
                                </div>
                            )}

                            {/* Current Status */}
                            <div className="p-4 bg-gray-50 rounded-xl">
                                <p className="text-xs text-gray-500 mb-2">Status Saat Ini</p>
                                <div className="flex items-center justify-between">
                                    <span className="text-gray-700">Valve</span>
                                    <span className={`font-bold ${currentValveStatus === 'open' ? 'text-emerald-600' : 'text-gray-600'}`}>
                                        {valveStateLabel}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between mt-1">
                                    <span className="text-gray-700">Mode</span>
                                    <span className={`font-bold ${currentMode === 'auto' ? 'text-blue-600' : 'text-orange-600'}`}>
                                        {valveModeLabel}
                                    </span>
                                </div>
                                {valveDistance !== null && (
                                    <div className="flex items-center justify-between mt-1">
                                        <span className="text-gray-700">Jarak Sensor</span>
                                        <span className="font-bold text-gray-700">{valveDistance} cm</span>
                                    </div>
                                )}
                            </div>

                            {/* Mode Selection */}
                            <div>
                                <p className="text-sm font-medium text-gray-700 mb-2">Mode Kontrol</p>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        onClick={() => handleModeChange('auto')}
                                        disabled={loading}
                                        className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-all ${currentMode === 'auto'
                                            ? 'bg-blue-500 text-white shadow-md'
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                            } disabled:opacity-50`}
                                    >
                                        <ToggleLeft size={18} />
                                        AUTO
                                    </button>
                                    <button
                                        onClick={() => handleModeChange('manual')}
                                        disabled={loading}
                                        className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-all ${currentMode === 'manual'
                                            ? 'bg-orange-500 text-white shadow-md'
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                            } disabled:opacity-50`}
                                    >
                                        <ToggleRight size={18} />
                                        MANUAL
                                    </button>
                                </div>
                                <p className="text-xs text-gray-500 mt-2">
                                    {currentMode === 'auto'
                                        ? 'Valve dikontrol otomatis berdasarkan ketinggian air'
                                        : 'Valve dikontrol manual dari tombol di bawah'}
                                </p>
                            </div>

                            {/* Manual Control */}
                            {currentMode === 'manual' && (
                                <div>
                                    <p className="text-sm font-medium text-gray-700 mb-2">Kontrol Manual</p>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            onClick={() => handleValveControl('on')}
                                            disabled={loading}
                                            className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-all duration-200 disabled:cursor-not-allowed ${currentValveStatus === 'open'
                                                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200 ring-2 ring-emerald-400 scale-[1.03]'
                                                    : 'bg-gray-100 text-gray-400 hover:bg-emerald-50 hover:text-emerald-500 disabled:opacity-50'
                                                }`}
                                        >
                                            <Power size={18} />
                                            ON
                                        </button>
                                        <button
                                            onClick={() => handleValveControl('off')}
                                            disabled={loading}
                                            className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-all duration-200 disabled:cursor-not-allowed ${currentValveStatus === 'closed'
                                                    ? 'bg-red-500 text-white shadow-lg shadow-red-200 ring-2 ring-red-400 scale-[1.03]'
                                                    : 'bg-gray-100 text-gray-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-50'
                                                }`}
                                        >
                                            <Power size={18} />
                                            OFF
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Auto Mode Settings */}
                            {currentMode === 'auto' && (
                                <div className="space-y-3">
                                    <p className="text-sm font-medium text-gray-700">Pengaturan Mode Otomatis</p>

                                    {!isEditingThresholds ? (
                                        // View Mode - Show set values
                                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl space-y-3">
                                            <p className="text-xs text-blue-600">
                                                Pengaturan jarak sensor untuk kontrol otomatis valve.
                                            </p>

                                            {/* Display Current Settings */}
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between p-2 bg-white rounded-lg">
                                                    <span className="text-xs text-gray-600">Valve ON jika jarak ≥</span>
                                                    <span className="text-sm font-bold text-gray-800">{onThreshold} cm</span>
                                                </div>
                                                <div className="flex items-center justify-between p-2 bg-white rounded-lg">
                                                    <span className="text-xs text-gray-600">Valve OFF jika jarak ≤</span>
                                                    <span className="text-sm font-bold text-gray-800">{offThreshold} cm</span>
                                                </div>
                                            </div>

                                            {/* Edit Button */}
                                            <button
                                                onClick={() => setIsEditingThresholds(true)}
                                                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
                                            >
                                                <Settings size={16} />
                                                Ubah Pengaturan
                                            </button>
                                        </div>
                                    ) : (
                                        // Edit Mode - Show input form
                                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl space-y-4">
                                            <p className="text-xs text-blue-600">
                                                Atur jarak sensor (cm) untuk menentukan kapan valve ON/OFF secara otomatis.
                                            </p>

                                            {/* ON Threshold */}
                                            <div>
                                                <label className="block text-xs font-medium text-gray-600 mb-1">
                                                    Valve ON jika jarak ≥ (air rendah)
                                                </label>
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="number"
                                                        step="0.1"
                                                        min="0"
                                                        value={onThreshold}
                                                        onChange={(e) => setOnThreshold(parseFloat(e.target.value) || 0)}
                                                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                                    />
                                                    <span className="text-sm text-gray-500">cm</span>
                                                </div>
                                            </div>

                                            {/* OFF Threshold */}
                                            <div>
                                                <label className="block text-xs font-medium text-gray-600 mb-1">
                                                    Valve OFF jika jarak ≤ (air tinggi)
                                                </label>
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="number"
                                                        step="0.1"
                                                        min="0"
                                                        value={offThreshold}
                                                        onChange={(e) => setOffThreshold(parseFloat(e.target.value) || 0)}
                                                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                                    />
                                                    <span className="text-sm text-gray-500">cm</span>
                                                </div>
                                            </div>

                                            {/* Action Buttons */}
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => setIsEditingThresholds(false)}
                                                    disabled={loading}
                                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition-colors disabled:opacity-50"
                                                >
                                                    <X size={16} />
                                                    Batal
                                                </button>
                                                <button
                                                    onClick={handleSaveThresholds}
                                                    disabled={loading}
                                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                                                >
                                                    <Save size={16} />
                                                    Simpan
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Modal Footer - Fixed */}
                        <div className="px-5 py-4 bg-gray-50 border-t flex-shrink-0">
                            <button
                                onClick={() => setShowSettings(false)}
                                className="w-full py-2.5 bg-sky-500 text-white font-medium rounded-xl hover:bg-sky-600 transition-all"
                            >
                                Tutup
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

WaterLevelCard.propTypes = {
    value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    pumpStatus: PropTypes.bool,
    valveStatus: PropTypes.object
};

export default WaterLevelCard;
