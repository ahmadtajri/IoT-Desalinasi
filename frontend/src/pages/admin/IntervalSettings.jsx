import { useState, useEffect, useCallback } from 'react';
import userService from '../../services/userService';
import { Clock, Plus, Trash2, Loader2, AlertCircle } from 'lucide-react';
import CustomAlert from '../../components/shared/CustomAlert';
import LoggerMonitor from '../../components/admin/LoggerMonitor';
import BottomSheetModal from '../../components/shared/BottomSheetModal';
import PropTypes from 'prop-types';


export default function IntervalSettings() {
    const [intervals, setIntervals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [formLoading, setFormLoading] = useState(false);
    const [formError, setFormError] = useState('');
    const [intervalForm, setIntervalForm] = useState({ hours: 0, minutes: 1, seconds: 0, intervalName: '' });

    const [confirmConfig, setConfirmConfig] = useState({
        isOpen: false, title: '', message: '', type: 'warning', onConfirm: null
    });

    const fetchIntervals = useCallback(async () => {
        try {
            setLoading(true);
            setError('');
            const response = await userService.getGlobalIntervals();
            if (response.success) {
                setIntervals(response.data);
            } else {
                setError(response.message || 'Gagal memuat data interval');
            }
        } catch (err) {
            console.error('❌ Error fetching intervals:', err);
            let errorMsg = 'Gagal memuat data interval';
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
    }, []);

    useEffect(() => { fetchIntervals(); }, [fetchIntervals]);

    const formatDuration = (seconds) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        const parts = [];
        if (h > 0) parts.push(`${h} jam`);
        if (m > 0) parts.push(`${m} menit`);
        if (s > 0) parts.push(`${s} detik`);
        return parts.join(' ') || '0 detik';
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        setFormLoading(true);
        setFormError('');

        const totalSeconds = (intervalForm.hours * 3600) + (intervalForm.minutes * 60) + intervalForm.seconds;
        if (totalSeconds <= 0) {
            setFormError('Interval harus lebih dari 0 detik');
            setFormLoading(false);
            return;
        }

        try {
            const response = await userService.createInterval({
                intervalSeconds: totalSeconds,
                intervalName: intervalForm.intervalName
            });
            if (response.success) {
                setShowModal(false);
                setIntervalForm({ hours: 0, minutes: 1, seconds: 0, intervalName: '' });
                fetchIntervals();
            } else {
                setFormError(response.message);
            }
        } catch (err) {
            setFormError(err.response?.data?.message || 'Gagal membuat interval');
        } finally {
            setFormLoading(false);
        }
    };

    const handleDelete = (intervalId) => {
        setConfirmConfig({
            isOpen: true,
            title: 'Konfirmasi Hapus Interval',
            message: 'Hapus interval ini? Pengguna yang menggunakan interval ini akan kehilangan interval aktifnya.',
            type: 'error',
            onConfirm: async () => {
                try {
                    const response = await userService.deleteInterval(intervalId);
                    if (response.success) fetchIntervals();
                } catch (err) {
                    console.error('Gagal menghapus interval:', err);
                }
            }
        });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-16">
                <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
            </div>
        );
    }

    return (
        <div>
            <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-100 mb-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                            <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                        </div>
                        <div>
                            <h2 className="text-lg sm:text-xl font-bold text-gray-800">Pengaturan Interval</h2>
                            <p className="text-xs sm:text-sm text-gray-500">Atur interval pencatatan data untuk semua pengguna</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
                        <button
                            onClick={() => {
                                setIntervalForm({ hours: 0, minutes: 1, seconds: 0, intervalName: '' });
                                setFormError('');
                                setShowModal(true);
                            }}
                            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-xl transition-all text-sm sm:text-base"
                        >
                            <Plus size={16} />
                            <span className="hidden sm:inline">Tambah Interval</span>
                            <span className="sm:hidden">Interval</span>
                        </button>
                    </div>
                </div>
            </div>

            {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 mb-4">
                    <AlertCircle className="w-5 h-5 text-red-500" />
                    <p className="text-red-700">{error}</p>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {intervals.map((interval) => (
                    <div key={interval.id} className="bg-blue-50 border border-blue-100 rounded-xl p-5 group hover:shadow-md transition-all">
                        <div className="flex items-start justify-between">
                            <div>
                                <h4 className="text-gray-800 font-semibold text-lg">{interval.intervalName}</h4>
                                <p className="text-blue-600 text-sm mt-1 font-medium">{formatDuration(interval.intervalSeconds)}</p>
                                <p className="text-gray-400 text-xs mt-1">{interval.intervalSeconds} detik</p>
                            </div>
                            <button
                                onClick={() => handleDelete(interval.id)}
                                className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                                title="Hapus interval"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </div>
                ))}
                {intervals.length === 0 && (
                    <div className="col-span-full p-8 text-center text-gray-400 border border-gray-200 border-dashed rounded-xl bg-gray-50">
                        <Clock className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                        <p>Belum ada interval yang ditentukan.</p>
                        <p className="text-sm mt-1">Klik &quot;+ Interval&quot; untuk membuat interval baru.</p>
                    </div>
                )}
            </div>

            {/* Modal Buat Interval */}
            <BottomSheetModal isOpen={showModal} onClose={() => setShowModal(false)} title="Buat Interval Baru" headerColor="bg-blue-500">
                <form onSubmit={handleCreate} className="space-y-4">
                    {formError && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{formError}</div>}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nama Interval</label>
                        <input
                            type="text"
                            value={intervalForm.intervalName}
                            onChange={(e) => setIntervalForm({ ...intervalForm, intervalName: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Contoh: Setiap 5 Menit"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Jam</label>
                            <input type="number" min="0" max="23" value={intervalForm.hours} onChange={(e) => setIntervalForm({ ...intervalForm, hours: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Menit</label>
                            <input type="number" min="0" max="59" value={intervalForm.minutes} onChange={(e) => setIntervalForm({ ...intervalForm, minutes: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Detik</label>
                            <input type="number" min="0" max="59" value={intervalForm.seconds} onChange={(e) => setIntervalForm({ ...intervalForm, seconds: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                        </div>
                    </div>

                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm text-blue-700">
                            <strong>Total:</strong> {formatDuration((intervalForm.hours * 3600) + (intervalForm.minutes * 60) + intervalForm.seconds)}
                        </p>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-all">Batal</button>
                        <button type="submit" disabled={formLoading} className="flex-1 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-xl hover:shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                            {formLoading && <Loader2 size={16} className="animate-spin" />}
                            Buat Interval
                        </button>
                    </div>
                </form>
            </BottomSheetModal>

            <CustomAlert
                isOpen={confirmConfig.isOpen}
                onClose={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
                title={confirmConfig.title}
                message={confirmConfig.message}
                type={confirmConfig.type}
                isConfirm={true}
                onConfirm={confirmConfig.onConfirm}
            />

            {/* Logger Monitor Section */}
            <div className="mt-8 pt-8 border-t border-gray-200">
                <LoggerMonitor />
            </div>
        </div>
    );
}
