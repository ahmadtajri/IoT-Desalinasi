import { useState, useEffect } from 'react';
import valveService from '../../services/valveService';
import { Power, PowerOff, Settings, RefreshCw } from 'lucide-react';

/**
 * Valve Control Component
 * Allows users to control the water valve remotely
 */
const ValveControl = () => {
    const [valveStatus, setValveStatus] = useState({
        status: 'unknown',
        mode: 'unknown',
        level: 0,
        distance: 0,
        lastUpdate: null
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    // Fetch valve status on component mount and every 5 seconds
    useEffect(() => {
        fetchValveStatus();
        const interval = setInterval(fetchValveStatus, 5000);
        return () => clearInterval(interval);
    }, []);

    const fetchValveStatus = async () => {
        try {
            const response = await valveService.getStatus();
            if (response.success) {
                setValveStatus(response.data);
            }
        } catch (err) {
            console.error('Error fetching valve status:', err);
        }
    };

    const handleControl = async (command) => {
        if (valveStatus.mode !== 'manual') {
            setError('Tidak dapat mengontrol valve dalam mode AUTO. Pindah ke mode MANUAL terlebih dahulu.');
            setTimeout(() => setError(null), 3000);
            return;
        }

        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            const response = await valveService.control(command);
            if (response.success) {
                setSuccess(`Perintah valve ${command === 'on' ? 'BUKA' : 'TUTUP'} berhasil dikirim`);
                setTimeout(() => setSuccess(null), 3000);
                // Refresh status after a short delay
                setTimeout(fetchValveStatus, 1000);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Gagal mengontrol valve');
            setTimeout(() => setError(null), 3000);
        } finally {
            setLoading(false);
        }
    };

    const handleModeChange = async (mode) => {
        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            const response = await valveService.setMode(mode);
            if (response.success) {
                setSuccess(`Beralih ke mode ${mode.toUpperCase()}`);
                setTimeout(() => setSuccess(null), 3000);
                // Refresh status after a short delay
                setTimeout(fetchValveStatus, 1000);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Gagal mengubah mode');
            setTimeout(() => setError(null), 3000);
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = () => {
        if (valveStatus.status === 'open') return '#10b981'; // green
        if (valveStatus.status === 'closed') return '#ef4444'; // red
        return '#6b7280'; // gray
    };

    const getModeColor = () => {
        if (valveStatus.mode === 'auto') return '#3b82f6'; // blue
        if (valveStatus.mode === 'manual') return '#f59e0b'; // amber
        return '#6b7280'; // gray
    };

    return (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-6 hover:shadow-xl transition-shadow duration-300">
            <div className="flex justify-between items-center mb-5">
                <h3 className="text-xl font-bold text-blue-600 m-0">Kontrol Valve</h3>
                <button
                    className="bg-blue-50 border border-blue-200 text-blue-600 p-2 rounded-lg cursor-pointer transition-all duration-300 flex items-center justify-center hover:bg-blue-100 hover:border-blue-300 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={fetchValveStatus}
                    disabled={loading}
                    title="Muat ulang status"
                >
                    <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                </button>
            </div>

            {/* Status Display */}
            <div className="bg-gray-50 rounded-xl p-4 mb-5 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                    <span className="text-sm text-gray-600 font-medium">Status:</span>
                    <span
                        className="text-lg font-bold"
                        style={{ color: getStatusColor() }}
                    >
                        {valveStatus.status === 'open' ? 'TERBUKA' : valveStatus.status === 'closed' ? 'TERTUTUP' : valveStatus.status.toUpperCase()}
                    </span>
                </div>
                <div className="flex flex-col gap-1">
                    <span className="text-sm text-gray-600 font-medium">Mode:</span>
                    <span
                        className="text-lg font-bold"
                        style={{ color: getModeColor() }}
                    >
                        {valveStatus.mode.toUpperCase()}
                    </span>
                </div>
                <div className="flex flex-col gap-1">
                    <span className="text-sm text-gray-600 font-medium">Ketinggian Air:</span>
                    <span className="text-lg text-gray-900 font-semibold">{valveStatus.level.toFixed(1)}%</span>
                </div>
                <div className="flex flex-col gap-1">
                    <span className="text-sm text-gray-600 font-medium">Jarak:</span>
                    <span className="text-lg text-gray-900 font-semibold">{valveStatus.distance.toFixed(1)} cm</span>
                </div>
            </div>

            {/* Mode Control */}
            <div className="mb-5">
                <label className="block text-sm text-gray-700 mb-2 font-medium">Mode Kontrol:</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <button
                        className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-all duration-200 ${valveStatus.mode === 'auto'
                                ? 'bg-blue-500 text-white shadow-lg'
                                : 'bg-gray-50 border border-gray-200 text-gray-700 hover:bg-gray-100'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                        onClick={() => handleModeChange('auto')}
                        disabled={loading || valveStatus.mode === 'auto'}
                    >
                        <Settings size={16} />
                        AUTO
                    </button>
                    <button
                        className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-all duration-200 ${valveStatus.mode === 'manual'
                                ? 'bg-blue-500 text-white shadow-lg'
                                : 'bg-gray-50 border border-gray-200 text-gray-700 hover:bg-gray-100'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                        onClick={() => handleModeChange('manual')}
                        disabled={loading || valveStatus.mode === 'manual'}
                    >
                        <Settings size={16} />
                        MANUAL
                    </button>
                </div>
            </div>

            {/* Valve Control Buttons */}
            <div className="mb-5">
                <label className="block text-sm text-gray-700 mb-2 font-medium">Kontrol Valve:</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-2">
                    <button
                        className="flex items-center justify-center gap-2 px-5 py-3 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-all duration-200 font-medium shadow-lg disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-xl hover:-translate-y-0.5"
                        onClick={() => handleControl('on')}
                        disabled={loading || valveStatus.mode !== 'manual' || valveStatus.status === 'open'}
                    >
                        <Power size={20} />
                        BUKA
                    </button>
                    <button
                        className="flex items-center justify-center gap-2 px-5 py-3 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-all duration-200 font-medium shadow-lg disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-xl hover:-translate-y-0.5"
                        onClick={() => handleControl('off')}
                        disabled={loading || valveStatus.mode !== 'manual' || valveStatus.status === 'closed'}
                    >
                        <PowerOff size={20} />
                        TUTUP
                    </button>
                </div>
                {valveStatus.mode === 'auto' && (
                    <p className="text-xs text-amber-600 text-center italic mt-2">
                        Pindah ke mode MANUAL untuk mengontrol valve
                    </p>
                )}
            </div>

            {/* Messages */}
            {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 mb-4 text-sm font-medium animate-slide-in">
                    {error}
                </div>
            )}
            {success && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 mb-4 text-sm font-medium animate-slide-in">
                    {success}
                </div>
            )}

            {/* Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs text-gray-700 my-1 leading-relaxed">
                    <strong className="text-blue-600 font-semibold">Mode AUTO:</strong> Valve dikontrol otomatis berdasarkan ketinggian air
                </p>
                <p className="text-xs text-gray-700 my-1 leading-relaxed">
                    <strong className="text-blue-600 font-semibold">Mode MANUAL:</strong> Valve dikontrol secara manual dari panel ini
                </p>
            </div>
        </div>
    );
};

export default ValveControl;
