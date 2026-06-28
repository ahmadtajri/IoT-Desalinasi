import { useState, useEffect } from 'react';
import dailyLogService from '../../services/dailyLogService';
import {
    FileText, Download, Trash2, Loader2,
    Calendar, User, HardDrive, CheckCircle
} from 'lucide-react';
import Alert from '../shared/Alert';
import CustomAlert from '../shared/CustomAlert';

const DailyLogManagement = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // CustomAlert state
    const [confirmConfig, setConfirmConfig] = useState({
        isOpen: false,
        title: '',
        message: '',
        type: 'warning',
        onConfirm: null
    });

    useEffect(() => {
        fetchLogs();
        
        // Auto-refresh every 30 seconds
        const intervalId = setInterval(() => {
            fetchLogs();
        }, 30000);
        
        // Cleanup interval on unmount
        return () => clearInterval(intervalId);
    }, []);

    const fetchLogs = async () => {
        try {
            setLoading(true);
            setError('');
            const response = await dailyLogService.getAll();
            if (response.success) {
                setLogs(response.data);
            } else {
                setError(response.message || 'Gagal mengambil data log harian');
            }
        } catch (err) {
            console.error('❌ Error fetching daily logs:', err);
            let errorMsg = 'Gagal mengambil data log harian';
            if (err.code === 'ERR_NETWORK') {
                errorMsg = '🌐 Tidak dapat terhubung ke backend. Pastikan backend sedang berjalan.';
            } else if (err.code === 'ECONNABORTED') {
                errorMsg = '⏱️ Request timeout. Backend tidak merespons';
            } else if (err.response) {
                errorMsg = err.response.data?.message || `Error ${err.response.status}: ${err.response.statusText}`;
            } else if (err.message) {
                errorMsg = err.message;
            }
            setError(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    const handleGenerate = async () => {
        try {
            setGenerating(true);
            setError('');
            setSuccess('');
            const response = await dailyLogService.generateManual();
            if (response.success) {
                setSuccess(response.message);
                fetchLogs();
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Gagal generate log');
        } finally {
            setGenerating(false);
        }
    };

    const handleDownload = async (log) => {
        try {
            await dailyLogService.download(log.id, log.fileName);
        } catch (err) {
            setError('Gagal mengunduh file');
        }
    };

    const handleDelete = (log) => {
        setConfirmConfig({
            isOpen: true,
            title: 'Hapus Log',
            message: `Apakah Anda yakin ingin menghapus log "${log.fileName}"?`,
            type: 'error',
            onConfirm: async () => {
                try {
                    setError('');
                    setSuccess('');
                    await dailyLogService.delete(log.id);
                    setSuccess('Log berhasil dihapus');
                    fetchLogs();
                } catch (err) {
                    setError(err.response?.data?.message || 'Gagal menghapus log');
                }
            }
        });
    };

    const formatDate = (dateStr) => {
        return new Date(dateStr).toLocaleDateString('id-ID', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const formatFileSize = (bytes) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    // Group logs by date
    const groupedLogs = logs.reduce((acc, log) => {
        const dateKey = new Date(log.date).toISOString().slice(0, 10);
        if (!acc[dateKey]) acc[dateKey] = [];
        acc[dateKey].push(log);
        return acc;
    }, {});

    return (
        <div className="space-y-6">
            {/* Alerts */}
            <Alert type="error" message={error} onClose={() => setError('')} title="Error" />
            <Alert type="success" message={success} onClose={() => setSuccess('')} title="Berhasil" />

            {/* Header */}
            <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-100">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                            <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                        </div>
                        <div>
                            <h2 className="text-lg sm:text-xl font-bold text-gray-800">Log Data Harian</h2>
                            <p className="text-xs sm:text-sm text-gray-500">
                                Auto-refresh & tersimpan otomatis pukul 23:59 WIB
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
                        <button
                            onClick={handleGenerate}
                            disabled={generating}
                            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-xl transition-all disabled:opacity-50 text-sm sm:text-base"
                        >
                            {generating ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" />
                                    <span className="hidden sm:inline">Generating...</span>
                                    <span className="sm:hidden">Loading...</span>
                                </>
                            ) : (
                                <>
                                    <CheckCircle size={16} />
                                    <span className="hidden sm:inline">Generate Sekarang</span>
                                    <span className="sm:hidden">Generate</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Logs List */}
            <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-100">
                {loading ? (
                    <div className="flex items-center justify-center py-8 sm:py-12">
                        <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 text-blue-500 animate-spin" />
                    </div>
                ) : logs.length === 0 ? (
                    <div className="text-center py-8 sm:py-12 px-4">
                        <FileText className="w-10 h-10 sm:w-12 sm:h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-sm sm:text-base text-gray-500 font-medium">Belum ada log harian</p>
                        <p className="text-xs sm:text-sm text-gray-400 mt-1">
                            Log akan otomatis tersimpan setiap hari pukul 23:59, atau tekan &quot;Generate&quot;
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4 sm:space-y-6">
                        {Object.keys(groupedLogs)
                            .sort((a, b) => new Date(b) - new Date(a))
                            .map(dateKey => (
                                <div key={dateKey}>
                                    {/* Date Header */}
                                    <div className="flex items-center gap-2 mb-2 sm:mb-3">
                                        <Calendar size={14} className="text-blue-500 sm:w-4 sm:h-4" />
                                        <h3 className="text-xs sm:text-sm font-semibold text-gray-600 uppercase tracking-wide">
                                            {formatDate(dateKey)}
                                        </h3>
                                        <div className="flex-1 h-px bg-gray-200" />
                                    </div>

                                    {/* Logs for this date */}
                                    <div className="space-y-2">
                                        {groupedLogs[dateKey].map(log => (
                                            <div
                                                key={log.id}
                                                className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 bg-gray-50 rounded-xl border border-gray-100 hover:border-blue-200 transition-all group gap-3"
                                            >
                                                <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                                                    <div className="p-1.5 sm:p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors flex-shrink-0">
                                                        <FileText size={18} className="text-blue-600 sm:w-5 sm:h-5" />
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="font-semibold text-gray-800 text-xs sm:text-sm truncate">
                                                            {log.fileName}
                                                        </p>
                                                        <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-1 text-xs text-gray-500">
                                                            <span className="flex items-center gap-1">
                                                                <User size={11} className="flex-shrink-0" />
                                                                <span className="truncate max-w-[100px]">{log.userName || 'System'}</span>
                                                            </span>
                                                            <span className="flex items-center gap-1">
                                                                <HardDrive size={11} className="flex-shrink-0" />
                                                                {formatFileSize(log.fileSize)}
                                                            </span>
                                                            <span className="whitespace-nowrap">
                                                                {log.recordCount} data
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2 justify-end sm:justify-start">
                                                    <button
                                                        onClick={() => handleDownload(log)}
                                                        className="flex items-center justify-center gap-1.5 px-3 sm:px-3 py-2 bg-blue-100 hover:bg-blue-500 text-blue-600 hover:text-white rounded-lg text-xs sm:text-sm font-medium transition-all flex-1 sm:flex-initial"
                                                        title="Download Excel"
                                                    >
                                                        <Download size={14} className="sm:w-4 sm:h-4" />
                                                        <span>Unduh</span>
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(log)}
                                                        className="flex items-center justify-center w-9 h-9 bg-red-100 hover:bg-red-500 text-red-600 hover:text-white rounded-lg transition-all flex-shrink-0"
                                                        title="Hapus Log"
                                                    >
                                                        <Trash2 size={14} className="sm:w-4 sm:h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                    </div>
                )}
            </div>

            {/* CustomAlert */}
            <CustomAlert
                isOpen={confirmConfig.isOpen}
                onClose={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
                title={confirmConfig.title}
                message={confirmConfig.message}
                type={confirmConfig.type}
                isConfirm={true}
                onConfirm={confirmConfig.onConfirm}
            />
        </div>
    );
};

export default DailyLogManagement;
