import { useState, useEffect } from 'react';
import {
    Settings, Save, Trash2, ToggleLeft, ToggleRight,
    Thermometer, Droplets, Waves, Scale, Edit2, X, Plus, Loader2,
    AlertCircle, HelpCircle, Zap
} from 'lucide-react';
import sensorConfigService from '../../services/sensorConfigService';
import Alert from '../shared/Alert';
import CustomAlert from '../shared/CustomAlert';
import BottomSheetModal from '../shared/BottomSheetModal';
import PropTypes from 'prop-types';

const SENSOR_TYPE_INFO = {
    air_temperature: { icon: Thermometer, color: '#f97316', label: 'Suhu Udara', unit: '°C' },
    water_temperature: { icon: Thermometer, color: '#06b6d4', label: 'Suhu Air', unit: '°C' },
    humidity: { icon: Droplets, color: '#3b82f6', label: 'kelembapan', unit: '%' },
    water_level: { icon: Waves, color: '#0ea5e9', label: 'Level Air', unit: '%' },
    water_weight: { icon: Scale, color: '#8b5cf6', label: 'Berat Air', unit: 'kg' },
    uncategorized: { icon: HelpCircle, color: '#6b7280', label: 'Belum Dikategorikan', unit: '' }
};

const SensorConfigPanel = ({ onConfigChange }) => {
    const [configs, setConfigs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({});
    const [showAddForm, setShowAddForm] = useState(false);
    const [newSensor, setNewSensor] = useState({
        sensorId: '',
        displayName: '',
        sensorType: 'air_temperature',
        unit: '°C',
        isEnabled: true
    });

    // Discovered sensors
    const [discoveredSensors, setDiscoveredSensors] = useState([]);

    // Drag and drop state
    const [draggedItem, setDraggedItem] = useState(null);
    const [draggedOverItem, setDraggedOverItem] = useState(null);
    const [longPressTimer, setLongPressTimer] = useState(null);
    const [isDragging, setIsDragging] = useState(false);

    // CustomAlert state
    const [alertConfig, setAlertConfig] = useState({
        isOpen: false,
        title: '',
        message: '',
        type: 'info',
        isConfirm: false,
        onConfirm: null
    });

    // Fetch configs on mount
    useEffect(() => {
        fetchConfigs();
    }, []);

    // Auto-refresh discovered sensors every 2 seconds (REALTIME)
    useEffect(() => {
        const refreshInterval = setInterval(() => {
            fetchDiscoveredSensors();
        }, 2000); // Refresh every 2 seconds (REALTIME)

        return () => clearInterval(refreshInterval);
    }, []);

    const fetchDiscoveredSensors = async () => {
        try {
            const discoveredResponse = await sensorConfigService.getDiscovered();
            const discovered = discoveredResponse.data || [];
            setDiscoveredSensors(discovered.filter(s => !s.isConfigured));
        } catch (err) {
            console.error('Error fetching discovered sensors:', err);
        }
    };

    const fetchConfigs = async () => {
        setLoading(true);
        setError(null);
        try {
            const [configsResponse, discoveredResponse] = await Promise.all([
                sensorConfigService.getAll(),
                sensorConfigService.getDiscovered().catch(() => ({ data: [], unconfiguredCount: 0 }))
            ]);

            setConfigs(configsResponse.data || []);

            // Set discovered sensors with config status
            const discovered = discoveredResponse.data || [];
            setDiscoveredSensors(discovered.filter(s => !s.isConfigured));

        } catch (err) {
            console.error('Error fetching configs:', err);
            setError('Gagal memuat konfigurasi sensor');
        } finally {
            setLoading(false);
        }
    };

    const handleAutoRegister = null; // removed

    const handleToggle = async (sensorId) => {
        try {
            await sensorConfigService.toggle(sensorId);
            await fetchConfigs();
            onConfigChange?.();
        } catch (err) {
            setError(`Gagal toggle sensor ${sensorId}`);
        }
    };

    const handleDelete = (sensorId) => {
        setAlertConfig({
            isOpen: true,
            title: 'Konfirmasi Hapus',
            message: `Apakah Anda yakin ingin menghapus konfigurasi sensor ${sensorId}?`,
            type: 'error',
            isConfirm: true,
            onConfirm: async () => {
                try {
                    await sensorConfigService.delete(sensorId);
                    await fetchConfigs();
                    setSuccess(`Sensor ${sensorId} dihapus`);
                    onConfigChange?.();
                    setTimeout(() => setSuccess(null), 3000);
                } catch (err) {
                    setError(`Gagal menghapus sensor ${sensorId}`);
                }
            }
        });
    };

    const startEdit = (config) => {
        setEditingId(config.sensorId);
        setEditForm({ ...config });
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditForm({});
    };

    const saveEdit = async () => {
        setSaving(true);
        try {
            await sensorConfigService.upsert(editForm);
            await fetchConfigs();
            setEditingId(null);
            setEditForm({});
            setSuccess('Perubahan disimpan');
            onConfigChange?.();
            setTimeout(() => setSuccess(null), 3000);
        } catch (err) {
            setError('Gagal menyimpan perubahan');
        } finally {
            setSaving(false);
        }
    };

    const handleAddSensor = async () => {
        if (!newSensor.sensorId || !newSensor.displayName) {
            setError('Sensor ID dan Nama harus diisi');
            return;
        }

        setSaving(true);
        try {
            await sensorConfigService.upsert(newSensor);
            await fetchConfigs();
            setShowAddForm(false);
            setNewSensor({
                sensorId: '',
                displayName: '',
                sensorType: 'temperature',
                unit: '°C',
                isEnabled: true
            });
            setSuccess('Sensor baru ditambahkan');
            onConfigChange?.();
            setTimeout(() => setSuccess(null), 3000);
        } catch (err) {
            setError('Gagal menambahkan sensor');
        } finally {
            setSaving(false);
        }
    };

    // Drag and Drop Handlers
    const handleDragStart = (e, sensorId, sensorType) => {
        setDraggedItem({ sensorId, sensorType });
        setIsDragging(true);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e, sensorId, sensorType) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';

        if (draggedItem && draggedItem.sensorType === sensorType) {
            setDraggedOverItem(sensorId);
        }
    };

    const handleDragEnd = () => {
        setDraggedItem(null);
        setDraggedOverItem(null);
        setIsDragging(false);
    };

    const handleDrop = async (e, targetSensorId, targetSensorType) => {
        e.preventDefault();

        if (!draggedItem || draggedItem.sensorType !== targetSensorType) {
            handleDragEnd();
            return;
        }

        const typeConfigs = configs.filter(c => c.sensorType === targetSensorType);
        const draggedIndex = typeConfigs.findIndex(c => c.sensorId === draggedItem.sensorId);
        const targetIndex = typeConfigs.findIndex(c => c.sensorId === targetSensorId);

        if (draggedIndex === -1 || targetIndex === -1 || draggedIndex === targetIndex) {
            handleDragEnd();
            return;
        }

        // Reorder within the same type
        const reordered = [...typeConfigs];
        const [removed] = reordered.splice(draggedIndex, 1);
        reordered.splice(targetIndex, 0, removed);

        // Update sortOrder
        const updatedConfigs = reordered.map((config, index) => ({
            ...config,
            sortOrder: index + 1
        }));

        try {
            // Save all updated sort orders
            await Promise.all(
                updatedConfigs.map(config =>
                    sensorConfigService.upsert(config)
                )
            );

            await fetchConfigs();
            setSuccess('Urutan sensor berhasil diubah');
            setTimeout(() => setSuccess(null), 2000);
        } catch (err) {
            setError('Gagal mengubah urutan sensor');
        }

        handleDragEnd();
    };

    // Long press handlers for mobile
    const handleTouchStart = (e, sensorId, sensorType) => {
        const timer = setTimeout(() => {
            setDraggedItem({ sensorId, sensorType });
            setIsDragging(true);
            // Haptic feedback if available (silently fail if blocked)
            try {
                if (navigator.vibrate) {
                    navigator.vibrate(50);
                }
            } catch (err) {
                // Vibration blocked by browser - ignore
            }
        }, 500); // 500ms long press
        setLongPressTimer(timer);
    };

    const handleTouchEnd = () => {
        if (longPressTimer) {
            clearTimeout(longPressTimer);
            setLongPressTimer(null);
        }

        if (isDragging) {
            setIsDragging(false);
            setDraggedItem(null);
            setDraggedOverItem(null);
        }
    };

    const handleTouchMove = (e, sensorId, sensorType) => {
        if (!isDragging || !draggedItem) return;

        // Don't call preventDefault - CSS touch-action: none handles scroll prevention
        const touch = e.touches[0];
        const element = document.elementFromPoint(touch.clientX, touch.clientY);
        const sensorItem = element?.closest('.sensor-item');

        if (sensorItem) {
            const targetId = sensorItem.dataset.sensorId;
            const targetType = sensorItem.dataset.sensorType;

            if (targetId && targetType === sensorType) {
                setDraggedOverItem(targetId);
            }
        }
    };

    const handleTouchDrop = async (targetSensorId, targetSensorType) => {
        if (!isDragging || !draggedItem) return;

        await handleDrop(
            { preventDefault: () => { } },
            targetSensorId,
            targetSensorType
        );
    };

    // Group configs by type
    const groupedConfigs = configs.reduce((acc, config) => {
        const type = config.sensorType || 'other';
        if (!acc[type]) acc[type] = [];
        acc[type].push(config);
        return acc;
    }, {});

    return (
        <div className="sensor-config-panel">
            {/* Header */}
            <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-100 mb-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <h3 className="text-base sm:text-lg font-bold text-gray-800">Daftar Sensor Terkonfigurasi</h3>
                        <p className="text-xs sm:text-sm text-gray-500 mt-1">
                            Tekan lama & geser untuk mengubah urutan
                        </p>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
                        <button
                            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-xl transition-all text-sm sm:text-base"
                            onClick={() => setShowAddForm(true)}
                        >
                            <Plus size={16} />
                            <span className="hidden sm:inline">Tambah Sensor</span>
                            <span className="sm:hidden">Sensor</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Alerts */}
            <Alert
                type="error"
                message={error}
                onClose={() => setError(null)}
            />
            <Alert
                type="success"
                message={success}
                onClose={() => setSuccess(null)}
            />

            {/* Discovered Sensors Section - Enhanced */}
            {discoveredSensors.length > 0 && (
                <div className="mb-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
                    <div className="mb-3">
                        <h4 className="text-sm font-bold text-blue-700 flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                            <Zap size={16} className="text-yellow-400" />
                            Sensor Baru Terdeteksi ({discoveredSensors.length})
                        </h4>
                    </div>
                    <p className="text-xs text-gray-600 mb-3">
                        Sensor berikut terdeteksi dari ESP32 tetapi belum dikonfigurasi. Klik &quot;Konfigurasi&quot; untuk mengatur kategori dan nama.
                    </p>
                    <div className="grid gap-2">
                        {discoveredSensors.map(sensor => (
                            <div key={sensor.sensorId} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-white rounded-lg border border-gray-200">
                                <div className="flex items-start sm:items-center gap-3">
                                    <div className="p-2 bg-blue-100 rounded-lg text-blue-700 font-mono text-sm font-bold shrink-0">
                                        {sensor.sensorId}
                                    </div>
                                    <div className="text-sm space-y-0.5">
                                        <div>
                                            <span className="text-gray-600">Kategori: </span>
                                            <span className="text-gray-900 font-medium">
                                                {SENSOR_TYPE_INFO[sensor.suggestedCategory]?.label || 'Belum ditentukan'}
                                            </span>
                                        </div>
                                        {sensor.lastValue !== null && (
                                            <div>
                                                <span className="text-gray-600">Nilai: </span>
                                                <span className="text-green-600 font-medium">{sensor.lastValue}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <button
                                    className="w-full sm:w-auto shrink-0 px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                                    onClick={() => {
                                        const typeInfo = SENSOR_TYPE_INFO[sensor.suggestedCategory] || SENSOR_TYPE_INFO.uncategorized;
                                        setNewSensor({
                                            sensorId: sensor.sensorId,
                                            sensorType: sensor.suggestedCategory || 'uncategorized',
                                            displayName: sensor.sensorId,
                                            unit: typeInfo.unit || '',
                                            isEnabled: true
                                        });
                                        setShowAddForm(true);
                                    }}
                                >
                                    <Settings size={14} />
                                    Konfigurasi
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}


            {/* Empty State */}
            {!loading && configs.length === 0 && (
                <div className="empty-state">
                    <Settings size={48} />
                    <p>Belum ada konfigurasi sensor</p>
                    <p className="text-sm text-gray-500 mt-2">Klik tombol + untuk menambahkan sensor baru</p>
                </div>
            )}

            {/* Modal Konfigurasi Sensor Baru */}
            <BottomSheetModal
                isOpen={showAddForm}
                onClose={() => setShowAddForm(false)}
                title="Konfigurasi Sensor Baru"
                headerColor="bg-blue-600"
            >
                <div className="flex flex-col md:flex-row gap-5">
                    {/* Kiri: Form Pengaturan */}
                    <div className="flex-1 space-y-4">
                        {/* Sensor ID */}
                        <div className="flex flex-col gap-1">
                            <label className="text-sm font-semibold text-gray-700">
                                Sensor ID <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-blue-500 focus:bg-white transition-all disabled:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-60"
                                value={newSensor.sensorId}
                                onChange={(e) => setNewSensor({ ...newSensor, sensorId: e.target.value.toUpperCase() })}
                                placeholder="Contoh: T7, RH8, WL2"
                                disabled={newSensor.sensorId && discoveredSensors.find(s => s.sensorId === newSensor.sensorId)}
                            />
                            <span className="text-xs text-gray-500">ID unik untuk mengidentifikasi sensor</span>
                        </div>

                        {/* Nama Display */}
                        <div className="flex flex-col gap-1">
                            <label className="text-sm font-semibold text-gray-700">
                                Nama Display <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                                value={newSensor.displayName}
                                onChange={(e) => setNewSensor({ ...newSensor, displayName: e.target.value })}
                                placeholder="Contoh: Suhu Kolam Utama"
                            />
                            <span className="text-xs text-gray-500">Nama yang akan ditampilkan pada dashboard</span>
                        </div>

                        {/* Kategori Sensor */}
                        <div className="flex flex-col gap-1">
                            <label className="text-sm font-semibold text-gray-700">
                                Kategori Sensor <span className="text-red-500">*</span>
                            </label>
                            <select
                                className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-blue-500 focus:bg-white transition-all cursor-pointer"
                                value={newSensor.sensorType}
                                onChange={(e) => {
                                    const type = e.target.value;
                                    const typeInfo = SENSOR_TYPE_INFO[type];
                                    setNewSensor({ ...newSensor, sensorType: type, unit: typeInfo?.unit || '°C' });
                                }}
                            >
                                <option value="air_temperature">🌡️ Suhu Udara</option>
                                <option value="water_temperature">💧 Suhu Air</option>
                                <option value="humidity">💦 Kelembapan</option>
                                <option value="water_level">🌊 Level Air</option>
                                <option value="water_weight">⚖️ Berat Air</option>
                                <option value="uncategorized">❓ Belum Dikategorikan</option>
                            </select>
                            <span className="text-xs text-gray-500">Tentukan jenis pengukuran sensor</span>
                        </div>

                        {/* Unit Pengukuran */}
                        <div className="flex flex-col gap-1">
                            <label className="text-sm font-semibold text-gray-700">Unit Pengukuran</label>
                            <input
                                type="text"
                                className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                                value={newSensor.unit}
                                onChange={(e) => setNewSensor({ ...newSensor, unit: e.target.value })}
                                placeholder="Contoh: °C, %, kg"
                            />
                            <span className="text-xs text-gray-500">Satuan yang digunakan untuk nilai sensor</span>
                        </div>
                    </div>

                    {/* Kanan: Preview Konfigurasi */}
                    <div className="md:w-56 flex-shrink-0">
                        <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-xl h-full">
                            <div className="flex items-center gap-2 text-blue-600 font-semibold text-sm mb-3">
                                <AlertCircle size={16} />
                                <span>Preview</span>
                            </div>
                            <div className="space-y-2">
                                {[{ label: 'ID', value: newSensor.sensorId }, { label: 'Nama', value: newSensor.displayName }, { label: 'Kategori', value: SENSOR_TYPE_INFO[newSensor.sensorType]?.label }, { label: 'Unit', value: newSensor.unit }].map(({ label, value }) => (
                                    <div key={label} className="flex flex-col px-3 py-2 bg-white rounded-lg">
                                        <span className="text-xs text-gray-500 font-medium">{label}</span>
                                        <span className="text-sm font-semibold font-mono text-gray-800 truncate">{value || '-'}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tombol Aksi */}
                <div className="flex gap-3 pt-4 mt-4 border-t border-gray-100">
                    <button
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-white text-gray-600 font-semibold rounded-xl border-2 border-gray-200 hover:bg-gray-50 transition-all"
                        onClick={() => setShowAddForm(false)}
                        disabled={saving}
                    >
                        <X size={16} />
                        Batal
                    </button>
                    <button
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={handleAddSensor}
                        disabled={saving || !newSensor.sensorId || !newSensor.displayName}
                    >
                        {saving ? (
                            <><Loader2 size={16} className="animate-spin" />Menyimpan...</>
                        ) : (
                            <><Save size={16} />Simpan Konfigurasi</>
                        )}
                    </button>
                </div>
            </BottomSheetModal>

            {/* Loading */}
            {loading && (
                <div className="loading-state">
                    <Loader2 size={32} className="spin" />
                    <p>Memuat konfigurasi...</p>
                </div>
            )}

            {/* Sensor Groups */}
            {!loading && Object.entries(groupedConfigs).map(([type, typeConfigs]) => {
                const typeInfo = SENSOR_TYPE_INFO[type] || { icon: Settings, color: '#888', label: type };
                const TypeIcon = typeInfo.icon;

                return (
                    <div key={type} className="sensor-group">
                        <div className="group-header" style={{ borderLeftColor: typeInfo.color }}>
                            <TypeIcon size={18} style={{ color: typeInfo.color }} />
                            <span>{typeInfo.label}</span>
                            <span className="count">{typeConfigs.length}</span>
                        </div>
                        <div className="sensor-list">
                            {typeConfigs.sort((a, b) => a.sortOrder - b.sortOrder).map(config => (
                                <div
                                    key={config.sensorId}
                                    className={`sensor-item ${!config.isEnabled ? 'disabled' : ''} ${draggedItem?.sensorId === config.sensorId ? 'dragging' : ''
                                        } ${draggedOverItem === config.sensorId ? 'drag-over' : ''}`}
                                    draggable={editingId !== config.sensorId}
                                    data-sensor-id={config.sensorId}
                                    data-sensor-type={config.sensorType}
                                    onDragStart={(e) => handleDragStart(e, config.sensorId, config.sensorType)}
                                    onDragOver={(e) => handleDragOver(e, config.sensorId, config.sensorType)}
                                    onDragEnd={handleDragEnd}
                                    onDrop={(e) => handleDrop(e, config.sensorId, config.sensorType)}
                                    onTouchStart={(e) => handleTouchStart(e, config.sensorId, config.sensorType)}
                                    onTouchEnd={handleTouchEnd}
                                    onTouchMove={(e) => handleTouchMove(e, config.sensorId, config.sensorType)}
                                    onClick={() => isDragging && handleTouchDrop(config.sensorId, config.sensorType)}
                                    style={{ cursor: editingId === config.sensorId ? 'default' : 'grab' }}
                                >
                                    {editingId === config.sensorId ? (
                                        // Edit Mode
                                        <div className="edit-form">
                                            <input
                                                type="text"
                                                value={editForm.displayName}
                                                onChange={(e) => setEditForm({ ...editForm, displayName: e.target.value })}
                                                className="edit-input"
                                                placeholder="Nama Display"
                                            />
                                            <select
                                                value={editForm.sensorType}
                                                onChange={(e) => {
                                                    const type = e.target.value;
                                                    const typeInfo = SENSOR_TYPE_INFO[type];
                                                    setEditForm({ ...editForm, sensorType: type, unit: typeInfo?.unit || editForm.unit });
                                                }}
                                                className="edit-select"
                                            >
                                                <option value="air_temperature">Suhu Udara</option>
                                                <option value="water_temperature">Suhu Air</option>
                                                <option value="humidity">kelembapan</option>
                                                <option value="water_level">Level Air</option>
                                                <option value="water_weight">Berat Air</option>
                                                <option value="uncategorized">Belum Dikategorikan</option>
                                            </select>
                                            <input
                                                type="text"
                                                value={editForm.unit}
                                                onChange={(e) => setEditForm({ ...editForm, unit: e.target.value })}
                                                className="edit-input unit-input"
                                                placeholder="Unit"
                                            />
                                            <div className="edit-actions">
                                                <button className="btn-icon save" onClick={saveEdit} disabled={saving}>
                                                    <Save size={16} />
                                                </button>
                                                <button className="btn-icon cancel" onClick={cancelEdit}>
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        // View Mode
                                        <>
                                            <div className="sensor-info">
                                                <span className="sensor-id">{config.sensorId}</span>
                                                <span className="sensor-name">{config.displayName}</span>
                                                {config.description && (
                                                    <span className="sensor-desc">{config.description}</span>
                                                )}
                                            </div>
                                            <div className="sensor-unit">{config.unit}</div>
                                            <div className="sensor-actions">
                                                <button
                                                    className="btn-icon toggle"
                                                    onClick={() => handleToggle(config.sensorId)}
                                                    title={config.isEnabled ? 'Nonaktifkan' : 'Aktifkan'}
                                                >
                                                    {config.isEnabled ?
                                                        <ToggleRight size={20} className="enabled" /> :
                                                        <ToggleLeft size={20} className="disabled" />
                                                    }
                                                </button>
                                                <button
                                                    className="btn-icon edit"
                                                    onClick={() => startEdit(config)}
                                                    title="Edit"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button
                                                    className="btn-icon delete"
                                                    onClick={() => handleDelete(config.sensorId)}
                                                    title="Hapus"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })}

            <style>{`
                .sensor-config-panel {
                    --primary-color: #2563eb;
                    --primary-color-hover: #1d4ed8;
                    --primary-soft: #eff6ff;
                    --primary-border: #bfdbfe;
                    --btn-height: 40px;
                    --btn-radius: 10px;
                }

                .config-btn {
                    min-height: var(--btn-height);
                }

                .spin {
                    animation: spin 1s linear infinite;
                }

                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }

                .alert {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 12px 16px;
                    border-radius: 8px;
                    margin-bottom: 16px;
                    font-size: 0.875rem;
                }

                .alert-error {
                    background: #fef2f2;
                    border: 1px solid #fecaca;
                    color: #b91c1c;
                }

                .alert-success {
                    background: #f0fdf4;
                    border: 1px solid #bbf7d0;
                    color: #15803d;
                }

                .alert button {
                    margin-left: auto;
                    background: none;
                    border: none;
                    color: inherit;
                    cursor: pointer;
                    padding: 4px;
                }

                .empty-state, .loading-state {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 48px 24px;
                    color: #9ca3af;
                    gap: 16px;
                }

                .empty-state p, .loading-state p {
                    margin: 0;
                }

                .add-form-card {
                    background: #f9fafb;
                    border-radius: 12px;
                    padding: 20px;
                    margin-bottom: 20px;
                    border: 1px solid #e5e7eb;
                }

                .form-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 16px;
                }

                .form-header h4 {
                    margin: 0;
                    color: #1f2937;
                    font-weight: 600;
                }

                .form-header button {
                    background: none;
                    border: none;
                    color: #6b7280;
                    cursor: pointer;
                    padding: 4px;
                    transition: color 0.2s;
                }

                .form-header button:hover {
                    color: #1f2937;
                }

                .form-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
                    gap: 12px;
                }

                .form-group label {
                    display: block;
                    font-size: 0.875rem;
                    color: #374151;
                    font-weight: 500;
                    margin-bottom: 6px;
                }

                .form-group input, .form-group select {
                    width: 100%;
                    padding: 8px 12px;
                    background: white;
                    border: 1px solid #d1d5db;
                    border-radius: 8px;
                    color: #1f2937;
                    font-size: 0.875rem;
                }

                .form-group input:focus, .form-group select:focus {
                    outline: none;
                    border-color: #3b82f6;
                    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
                }

                .form-actions {
                    display: flex;
                    justify-content: flex-end;
                    gap: 8px;
                    margin-top: 16px;
                }

                .sensor-group {
                    margin-bottom: 20px;
                }

                .group-header {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 12px 16px;
                    background: #f9fafb;
                    border-radius: 8px 8px 0 0;
                    border-left: 3px solid;
                    color: #1f2937;
                    font-weight: 600;
                }

                .group-header .count {
                    margin-left: auto;
                    background: white;
                    padding: 4px 10px;
                    border-radius: 12px;
                    font-size: 0.75rem;
                    color: #6b7280;
                    border: 1px solid #e5e7eb;
                }

                .sensor-list {
                    background: white;
                    border-radius: 0 0 8px 8px;
                    border: 1px solid #e5e7eb;
                    border-top: none;
                }

                .sensor-item {
                    display: flex;
                    align-items: center;
                    padding: 12px 16px;
                    border-bottom: 1px solid #f3f4f6;
                    gap: 12px;
                }

                .sensor-item:last-child {
                    border-bottom: none;
                }

                .sensor-item.disabled {
                    opacity: 0.5;
                }

                .sensor-info {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    gap: 2px;
                }

                .sensor-id {
                    font-family: monospace;
                    font-size: 0.75rem;
                    font-weight: 600;
                    color: #3b82f6;
                    background: #dbeafe;
                    padding: 4px 8px;
                    border-radius: 6px;
                    width: fit-content;
                }

                .sensor-name {
                    color: #1f2937;
                    font-weight: 500;
                }

                .sensor-desc {
                    font-size: 0.75rem;
                    color: #6b7280;
                }

                .sensor-unit {
                    color: #6b7280;
                    font-size: 0.875rem;
                    min-width: 40px;
                }

                /* Drag and Drop Styles */
                .sensor-item.dragging {
                    opacity: 0.5;
                    cursor: grabbing !important;
                    transform: scale(0.98);
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                }

                .sensor-item.drag-over {
                    border-top: 3px solid #3b82f6;
                    background: #eff6ff;
                    transform: translateY(2px);
                }

                .sensor-item:active {
                    cursor: grabbing !important;
                }

                @media (hover: hover) {
                    .sensor-item:hover {
                        background: #f9fafb;
                    }
                }

                /* Touch feedback for mobile */
                @media (max-width: 768px) {
                    .sensor-item {
                        user-select: none;
                        -webkit-user-select: none;
                        touch-action: none;
                    }
                    
                    .sensor-item.dragging {
                        opacity: 0.7;
                        box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
                    }
                }

                .sensor-actions {
                    display: flex;
                    gap: 4px;
                }

                .btn-icon {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 32px;
                    height: 32px;
                    background: #f3f4f6;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    color: #6b7280;
                    transition: all 0.2s;
                }

                .btn-icon:hover {
                    background: #e5e7eb;
                }

                .btn-icon.toggle .enabled {
                    color: #22c55e;
                }

                .btn-icon.toggle .disabled {
                    color: #9ca3af;
                }

                .btn-icon.edit:hover {
                    color: #3b82f6;
                }

                .btn-icon.delete:hover {
                    color: #ef4444;
                }

                .btn-icon.save {
                    color: #22c55e;
                }

                .btn-icon.cancel {
                    color: #6b7280;
                }

                .edit-form {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    flex: 1;
                    flex-wrap: wrap;
                }

                .edit-input {
                    padding: 6px 10px;
                    background: white;
                    border: 1px solid #d1d5db;
                    border-radius: 6px;
                    color: #1f2937;
                    font-size: 0.875rem;
                }

                .edit-input:focus {
                    outline: none;
                    border-color: #3b82f6;
                    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
                }

                .edit-input:first-child {
                    flex: 1;
                    min-width: 150px;
                }

                .unit-input {
                    width: 60px;
                }

                .edit-select {
                    padding: 6px 10px;
                    background: white;
                    border: 1px solid #d1d5db;
                    border-radius: 6px;
                    color: #1f2937;
                    font-size: 0.875rem;
                    min-width: 120px;
                }

                .edit-select:focus {
                    outline: none;
                    border-color: #3b82f6;
                    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
                }

                .desc-input {
                    flex: 1;
                    min-width: 150px;
                }

                .edit-actions {
                    display: flex;
                    gap: 4px;
                }

                @media (max-width: 768px) {
                    .sensor-item {
                        flex-wrap: wrap;
                    }

                    .sensor-info {
                        width: 100%;
                    }
                }

            `}</style>

            {/* CustomAlert for confirmations */}
            <CustomAlert
                isOpen={alertConfig.isOpen}
                onClose={() => setAlertConfig(prev => ({ ...prev, isOpen: false }))}
                title={alertConfig.title}
                message={alertConfig.message}
                type={alertConfig.type}
                isConfirm={alertConfig.isConfirm}
                onConfirm={alertConfig.onConfirm}
            />
        </div>
    );
};

SensorConfigPanel.propTypes = {
    onConfigChange: PropTypes.func
};

export default SensorConfigPanel;

