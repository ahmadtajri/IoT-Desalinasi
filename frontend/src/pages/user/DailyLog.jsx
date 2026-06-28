import { useState, useEffect, useCallback } from 'react';
import {
    Download, Trash2, RefreshCw, FileText, Calendar,
    Database, User, ChevronLeft, ChevronRight, Search,
    Info, Shield, Clock, CheckCircle
} from 'lucide-react';
import dailyLogService from '../../services/dailyLogService';
import { useAuth } from '../../context/AuthContext';
import CustomAlert from '../../components/shared/CustomAlert';

/* ─────────────────────────── helpers ─────────────────────────── */
const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('id-ID', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });
};

const formatDateShort = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('id-ID', {
        day: 'numeric', month: 'short', year: 'numeric'
    });
};

/* ─────────────────────── stat card component ─────────────────── */
function StatCard({ icon: Icon, label, value, color, bg }) {
    return (
        <div className={`${bg} rounded-2xl p-4 flex items-center gap-4 shadow-sm border border-white/60`}>
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${color} bg-white/70 shadow-sm shrink-0`}>
                <Icon size={22} />
            </div>
            <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
                <p className="text-xl font-bold text-gray-800 mt-0.5">{value}</p>
            </div>
        </div>
    );
}

/* ─────────────────────────── main page ─────────────────────────── */
const DailyLog = () => {
    const { user, isAdmin } = useAuth();
    const currentUserIsAdmin = isAdmin();

    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [downloading, setDownloading] = useState(null); // id of log being downloaded
    const [generating, setGenerating] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const PAGE_SIZE = 10;

    const [alertConfig, setAlertConfig] = useState({
        isOpen: false, title: '', message: '', type: 'info',
        isConfirm: false, onConfirm: () => {}
    });

    /* ── fetch logs ── */
    const fetchLogs = useCallback(async () => {
        setLoading(true);
        try {
            const res = await dailyLogService.getAll();
            if (res.success) setLogs(res.data || []);
        } catch (err) {
            console.error('Failed to fetch daily logs:', err);
            showAlert('Gagal memuat', 'Gagal mengambil daftar daily log.', 'error');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchLogs(); }, [fetchLogs]);

    /* ── alert helpers ── */
    const showAlert = (title, message, type = 'info') =>
        setAlertConfig({ isOpen: true, title, message, type, isConfirm: false, onConfirm: () => {} });

    const showConfirm = (title, message, onConfirm, type = 'warning') =>
        setAlertConfig({ isOpen: true, title, message, type, isConfirm: true, onConfirm });

    const closeAlert = () => setAlertConfig(prev => ({ ...prev, isOpen: false }));

    /* ── download ── */
    const handleDownload = async (log) => {
        setDownloading(log.id);
        try {
            await dailyLogService.download(log.id, log.fileName);
        } catch (err) {
            console.error('Download error:', err);
            showAlert('Gagal Mengunduh', 'Gagal mengunduh file log. Silakan coba lagi.', 'error');
        } finally {
            setDownloading(null);
        }
    };

    /* ── delete (admin only) ── */
    const handleDelete = (log) => {
        showConfirm(
            'Hapus Daily Log?',
            `Apakah Anda yakin ingin menghapus log tanggal ${formatDateShort(log.date)} milik "${log.userName}"?\n\nFile CSV ini tidak dapat dikembalikan!`,
            async () => {
                try {
                    await dailyLogService.delete(log.id);
                    showAlert('Berhasil', 'Log berhasil dihapus.', 'success');
                    fetchLogs();
                } catch (err) {
                    console.error('Delete error:', err);
                    showAlert('Gagal', 'Gagal menghapus log.', 'error');
                }
            },
            'error'
        );
    };

    /* ── manual generate (admin only) ── */
    const handleGenerate = async () => {
        showConfirm(
            'Generate Daily Log Sekarang?',
            'Sistem akan membuat file CSV dari semua data sensor hari ini untuk semua user yang memiliki data.\n\nLanjutkan?',
            async () => {
                setGenerating(true);
                try {
                    const res = await dailyLogService.generateManual();
                    if (res.success) {
                        showAlert('Berhasil', res.message, 'success');
                        fetchLogs();
                    } else {
                        showAlert('Gagal', res.message || 'Gagal generate log.', 'error');
                    }
                } catch (err) {
                    console.error('Generate error:', err);
                    showAlert('Gagal', 'Terjadi kesalahan saat generate log.', 'error');
                } finally {
                    setGenerating(false);
                }
            },
            'info'
        );
    };

    /* ── filtered + paginated ── */
    const filtered = logs.filter(log => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
            log.userName?.toLowerCase().includes(q) ||
            formatDateShort(log.date).toLowerCase().includes(q) ||
            log.fileName?.toLowerCase().includes(q)
        );
    });

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

    // Reset page when search changes
    useEffect(() => setCurrentPage(1), [searchQuery]);

    /* ── stats ── */
    const totalRecords  = logs.reduce((sum, l) => sum + (l.recordCount || 0), 0);
    const totalSize     = logs.reduce((sum, l) => sum + (l.fileSize || 0), 0);
    const uniqueUsers   = new Set(logs.map(l => l.userId).filter(Boolean)).size;

    const isInsideAdminPanel = window.location.pathname.includes('/admin');

    /* ────────────────────────── render ────────────────────────── */
    return (
        <div className={isInsideAdminPanel ? "space-y-6" : "p-4 md:p-6 bg-gray-50 min-h-screen w-full max-w-full overflow-x-hidden"}>
            <CustomAlert

                isOpen={alertConfig.isOpen}
                onClose={closeAlert}
                title={alertConfig.title}
                message={alertConfig.message}
                type={alertConfig.type}
                isConfirm={alertConfig.isConfirm}
                onConfirm={alertConfig.onConfirm}
            />

            {/* ── Header ── */}
            <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-gray-100 mb-6">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-sm shrink-0 ${currentUserIsAdmin ? 'bg-purple-100' : 'bg-blue-100'}`}>
                            {currentUserIsAdmin
                                ? <Shield size={24} className="text-purple-600" />
                                : <FileText size={24} className="text-blue-600" />
                            }
                        </div>
                        <div>
                            <h1 className="text-xl sm:text-2xl font-bold text-gray-800">
                                Daily Log
                            </h1>
                            <p className="text-gray-500 text-sm mt-0.5">
                                {currentUserIsAdmin
                                    ? 'Laporan harian semua pengguna dalam format CSV'
                                    : `Laporan harian data sensor Anda (${user?.username})`
                                }
                            </p>
                        </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-2 shrink-0">
                        <button
                            onClick={fetchLogs}
                            disabled={loading}
                            className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors text-sm font-medium disabled:opacity-50"
                        >
                            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                            <span className="hidden sm:inline">Refresh</span>
                        </button>

                        {currentUserIsAdmin && (
                            <button
                                onClick={handleGenerate}
                                disabled={generating}
                                className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors text-sm font-medium disabled:opacity-60 shadow-sm"
                            >
                                {generating
                                    ? <RefreshCw size={16} className="animate-spin" />
                                    : <FileText size={16} />
                                }
                                <span className="hidden sm:inline">Generate Sekarang</span>
                                <span className="sm:hidden">Generate</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Info banner */}
                <div className={`mt-4 flex items-start gap-2.5 p-3 rounded-xl text-sm ${currentUserIsAdmin ? 'bg-purple-50 text-purple-800 border border-purple-100' : 'bg-blue-50 text-blue-800 border border-blue-100'}`}>
                    <Info size={16} className="shrink-0 mt-0.5" />
                    <span>
                        {currentUserIsAdmin
                            ? 'Sebagai Admin, Anda melihat semua daily log milik seluruh pengguna. Log CSV di-generate otomatis setiap hari pukul 23:59 WIB dan data histori logger dihapus otomatis setelah 24 jam.'
                            : 'Log CSV di-generate otomatis setiap hari pukul 23:59 WIB. Data histori logger di halaman Laporan akan terhapus otomatis setelah 24 jam — pastikan log harian sudah ter-generate sebelum keesokan harinya.'
                        }
                    </span>
                </div>
            </div>

            {/* ── Stats Cards ── */}
            <div className={`grid gap-4 mb-6 ${currentUserIsAdmin ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-2 md:grid-cols-3'}`}>
                <StatCard
                    icon={FileText}
                    label="Total File"
                    value={logs.length}
                    color="text-blue-600"
                    bg="bg-blue-50"
                />
                <StatCard
                    icon={Database}
                    label="Total Data"
                    value={totalRecords.toLocaleString('id-ID')}
                    color="text-green-600"
                    bg="bg-green-50"
                />
                <StatCard
                    icon={Calendar}
                    label="Ukuran Total"
                    value={formatBytes(totalSize)}
                    color="text-orange-600"
                    bg="bg-orange-50"
                />
                {currentUserIsAdmin && (
                    <StatCard
                        icon={User}
                        label="Pengguna"
                        value={uniqueUsers}
                        color="text-purple-600"
                        bg="bg-purple-50"
                    />
                )}
            </div>

            {/* ── Table Card ── */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {/* Toolbar */}
                <div className="p-4 sm:p-5 border-b border-gray-100 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                    <div>
                        <h2 className="font-semibold text-gray-800 text-base">
                            Daftar File Log
                        </h2>
                        <p className="text-xs text-gray-500 mt-0.5">
                            {filtered.length} dari {logs.length} file
                        </p>
                    </div>
                    {/* Search */}
                    <div className="relative w-full sm:w-64">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder={currentUserIsAdmin ? 'Cari nama, tanggal...' : 'Cari tanggal...'}
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-gray-50"
                        />
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[640px]">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                    <div className="flex items-center gap-1.5"><Calendar size={13} />Tanggal</div>
                                </th>
                                {currentUserIsAdmin && (
                                    <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                        <div className="flex items-center gap-1.5"><User size={13} />Pengguna</div>
                                    </th>
                                )}
                                <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                    <div className="flex items-center gap-1.5"><FileText size={13} />File</div>
                                </th>
                                <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide text-right">
                                    <div className="flex items-center gap-1.5 justify-end"><Database size={13} />Data</div>
                                </th>
                                <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide text-right">
                                    Ukuran
                                </th>
                                <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                    <div className="flex items-center gap-1.5"><Clock size={13} />Dibuat</div>
                                </th>
                                <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide text-center">
                                    Aksi
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                /* Loading skeleton */
                                [...Array(5)].map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        {[...Array(currentUserIsAdmin ? 7 : 6)].map((__, j) => (
                                            <td key={j} className="px-5 py-4">
                                                <div className="h-4 bg-gray-100 rounded w-full max-w-[120px]" />
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            ) : paginated.length === 0 ? (
                                <tr>
                                    <td colSpan={currentUserIsAdmin ? 7 : 6} className="px-5 py-16 text-center">
                                        <div className="flex flex-col items-center gap-3 text-gray-400">
                                            <FileText size={40} className="opacity-30" />
                                            {searchQuery
                                                ? <p className="font-medium">Tidak ada log yang cocok dengan pencarian</p>
                                                : (
                                                    <>
                                                        <p className="font-medium text-gray-500">Belum ada daily log</p>
                                                        <p className="text-sm max-w-xs text-center">
                                                            Log akan otomatis dibuat setiap malam pukul 23:59 WIB saat ada data logger yang dicatat.
                                                            {currentUserIsAdmin && ' Anda juga bisa generate manual dengan tombol "Generate Sekarang" di atas.'}
                                                        </p>
                                                    </>
                                                )
                                            }
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                paginated.map((log) => {
                                    const isDownloading = downloading === log.id;
                                    return (
                                        <tr key={log.id} className="hover:bg-gray-50 transition-colors group">
                                            {/* Date */}
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                                                        <Calendar size={14} className="text-blue-600" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-semibold text-gray-800">
                                                            {formatDateShort(log.date)}
                                                        </p>
                                                        <p className="text-[11px] text-gray-400 hidden sm:block">
                                                            {new Date(log.date).toLocaleDateString('id-ID', { weekday: 'long' })}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* User (admin only) */}
                                            {currentUserIsAdmin && (
                                                <td className="px-5 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-7 h-7 rounded-full bg-purple-100 flex items-center justify-center shrink-0">
                                                            <User size={12} className="text-purple-600" />
                                                        </div>
                                                        <span className="text-sm font-medium text-gray-700">
                                                            {log.userName || 'System'}
                                                        </span>
                                                    </div>
                                                </td>
                                            )}

                                            {/* File name */}
                                            <td className="px-5 py-4 max-w-[220px]">
                                                <p className="text-sm text-gray-600 truncate font-mono" title={log.fileName}>
                                                    {log.fileName}
                                                </p>
                                            </td>

                                            {/* Record count */}
                                            <td className="px-5 py-4 text-right">
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-50 text-green-700 rounded-full text-xs font-semibold">
                                                    <CheckCircle size={11} />
                                                    {(log.recordCount || 0).toLocaleString('id-ID')}
                                                </span>
                                            </td>

                                            {/* File size */}
                                            <td className="px-5 py-4 text-right">
                                                <span className="text-sm text-gray-500 font-mono">
                                                    {formatBytes(log.fileSize)}
                                                </span>
                                            </td>

                                            {/* Created at */}
                                            <td className="px-5 py-4">
                                                <span className="text-xs text-gray-400">
                                                    {log.createdAt
                                                        ? new Date(log.createdAt).toLocaleString('id-ID', {
                                                            day: 'numeric', month: 'short',
                                                            hour: '2-digit', minute: '2-digit'
                                                        })
                                                        : '-'
                                                    }
                                                </span>
                                            </td>

                                            {/* Actions */}
                                            <td className="px-5 py-4">
                                                <div className="flex items-center justify-center gap-2">
                                                    {/* Download */}
                                                    <button
                                                        onClick={() => handleDownload(log)}
                                                        disabled={isDownloading}
                                                        title={`Unduh ${log.fileName}`}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-xs font-medium disabled:opacity-50 disabled:cursor-wait"
                                                    >
                                                        {isDownloading
                                                            ? <RefreshCw size={13} className="animate-spin" />
                                                            : <Download size={13} />
                                                        }
                                                        {isDownloading ? 'Mengunduh...' : 'Unduh'}
                                                    </button>

                                                    {/* Delete (admin only) */}
                                                    {currentUserIsAdmin && (
                                                        <button
                                                            onClick={() => handleDelete(log)}
                                                            title="Hapus log ini"
                                                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {!loading && filtered.length > PAGE_SIZE && (
                    <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between gap-3">
                        <p className="text-sm text-gray-500">
                            Halaman <span className="font-semibold text-gray-700">{currentPage}</span> dari{' '}
                            <span className="font-semibold text-gray-700">{totalPages}</span>
                        </p>
                        <div className="flex gap-1">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronLeft size={16} />
                            </button>
                            {/* Page numbers */}
                            {[...Array(totalPages)].map((_, i) => {
                                const pg = i + 1;
                                const show = pg === 1 || pg === totalPages || Math.abs(pg - currentPage) <= 1;
                                if (!show) {
                                    if (pg === 2 || pg === totalPages - 1) return <span key={pg} className="px-1 py-2 text-gray-400 text-sm">…</span>;
                                    return null;
                                }
                                return (
                                    <button
                                        key={pg}
                                        onClick={() => setCurrentPage(pg)}
                                        className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${currentPage === pg
                                            ? 'bg-blue-600 text-white shadow-sm'
                                            : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
                                        }`}
                                    >
                                        {pg}
                                    </button>
                                );
                            })}
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

        </div>
    );
};

export default DailyLog;
