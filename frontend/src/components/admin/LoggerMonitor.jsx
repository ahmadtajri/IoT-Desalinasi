import { useState, useEffect, useCallback } from 'react';
import { Activity, StopCircle, User, Zap, Loader2 } from 'lucide-react';
import sensorService from '../../services/sensorService';
import CustomAlert from '../shared/CustomAlert';

export default function LoggerMonitor() {
    const [loggers, setLoggers] = useState([]);
    const [totalActive, setTotalActive] = useState(0);
    const [loading, setLoading] = useState(true);

    // Alert state
    const [alertConfig, setAlertConfig] = useState({
        isOpen: false,
        title: '',
        message: '',
        type: 'info',
        isConfirm: false,
        onConfirm: () => { }
    });

    const closeAlert = () => setAlertConfig(prev => ({ ...prev, isOpen: false }));

    const showAlert = (title, message, type = 'info') => {
        setAlertConfig({ isOpen: true, title, message, type, isConfirm: false, onConfirm: () => { } });
    };

    const fetchLoggers = useCallback(async () => {
        try {
            const data = await sensorService.getAllLoggerStatus();
            const allLoggers = data.loggers || [];
            // Only keep active loggers
            const activeLoggers = allLoggers.filter(l => l.isLogging);
            setLoggers(activeLoggers);
            setTotalActive(activeLoggers.length);
        } catch (error) {
            console.error('Error fetching logger status:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    // Auto-refresh every 5 seconds
    useEffect(() => {
        fetchLoggers();
        const interval = setInterval(fetchLoggers, 5000);
        return () => clearInterval(interval);
    }, [fetchLoggers]);

    const handleStopUser = (userId, username) => {
        setAlertConfig({
            isOpen: true,
            title: 'Hentikan Logger',
            message: `Apakah Anda yakin ingin menghentikan logger untuk ${username || `User #${userId}`}?`,
            type: 'warning',
            isConfirm: true,
            onConfirm: async () => {
                try {
                    await sensorService.stopLoggerForUser(userId);
                    showAlert('Berhasil', `Logger untuk ${username || `User #${userId}`} dihentikan`, 'success');
                    fetchLoggers();
                } catch (error) {
                    showAlert('Error', `Gagal menghentikan logger: ${error.message}`, 'error');
                }
            }
        });
    };

    const handleStopAll = () => {
        if (totalActive === 0) {
            showAlert('Info', 'Tidak ada logger aktif', 'info');
            return;
        }
        setAlertConfig({
            isOpen: true,
            title: 'Hentikan Semua Logger',
            message: `Apakah Anda yakin ingin menghentikan semua ${totalActive} logger aktif?`,
            type: 'warning',
            isConfirm: true,
            onConfirm: async () => {
                try {
                    await sensorService.stopAllLoggers();
                    showAlert('Berhasil', 'Semua logger telah dihentikan', 'success');
                    fetchLoggers();
                } catch (error) {
                    showAlert('Error', `Gagal menghentikan logger: ${error.message}`, 'error');
                }
            }
        });
    };

    const formatInterval = (ms) => {
        if (!ms) return '-';
        const seconds = ms / 1000;
        if (seconds >= 60) return `${seconds / 60} menit`;
        return `${seconds} detik`;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                <span className="ml-2 text-gray-500">Memuat data logger...</span>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        <Activity className="w-5 h-5 text-green-500" />
                        Monitor Logger Aktif
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">Pantau dan kelola data logger yang sedang berjalan</p>
                </div>
                {totalActive > 0 && (
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleStopAll}
                            className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-xl text-sm font-medium hover:bg-red-600 transition-colors"
                        >
                            <StopCircle className="w-4 h-4" />
                            Hentikan Semua
                        </button>
                    </div>
                )}
            </div>

            {/* Stats Card */}
            <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 ${totalActive > 0 ? 'bg-green-100' : 'bg-gray-100'} rounded-lg flex items-center justify-center`}>
                        <Zap className={`w-5 h-5 ${totalActive > 0 ? 'text-green-600' : 'text-gray-400'}`} />
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-gray-800">{totalActive}</p>
                        <p className="text-xs text-gray-500">Logger Aktif</p>
                    </div>
                </div>
            </div>

            {/* Logger Table - Only shown when there are active loggers */}
            {totalActive > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 border-b border-gray-100">
                                <tr>
                                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Pengguna</th>
                                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Status</th>
                                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Interval</th>
                                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Log</th>
                                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {loggers.map((logger) => (
                                    <tr key={logger.userId} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                                    <User className="w-4 h-4 text-blue-600" />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-800">{logger.username || `User #${logger.userId}`}</p>
                                                    <p className="text-xs text-gray-400">ID: {logger.userId}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                                Berjalan
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            {formatInterval(logger.interval)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="font-semibold text-gray-800">{logger.logCount || 0}</span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => handleStopUser(logger.userId, logger.username)}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-medium hover:bg-red-100 transition-colors"
                                            >
                                                <StopCircle className="w-3.5 h-3.5" />
                                                Hentikan
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Custom Alert */}
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
        </div>
    );
}
