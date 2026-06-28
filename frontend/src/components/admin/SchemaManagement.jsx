// Schema Management Component - Admin can upload/manage SVG schemas
import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../context/AuthContext';
import schemaService from '../../services/schemaService';
import {
    Upload, Trash2, CheckCircle, XCircle, Loader2, FileText,
    AlertCircle, Eye, Image, Edit2
} from 'lucide-react';
import Alert from '../shared/Alert';
import CustomAlert from '../shared/CustomAlert';

const SchemaManagement = () => {
    const { user } = useAuth();
    const [schemas, setSchemas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [selectedFile, setSelectedFile] = useState(null);
    const [previewSVG, setPreviewSVG] = useState('');
    const [showPreview, setShowPreview] = useState(false);
    const fileInputRef = useRef(null);

    // Edit/update states
    const [editingSchema, setEditingSchema] = useState(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editSelectedFile, setEditSelectedFile] = useState(null);
    const [editPreviewSVG, setEditPreviewSVG] = useState('');
    const [editUploading, setEditUploading] = useState(false);
    const editFileInputRef = useRef(null);
    const [previewingSchema, setPreviewingSchema] = useState(null);

    // CustomAlert state
    const [confirmConfig, setConfirmConfig] = useState({
        isOpen: false,
        title: '',
        message: '',
        type: 'warning',
        onConfirm: null
    });

    useEffect(() => {
        if (user?.role === 'ADMIN') {
            fetchSchemas();
        }
    }, [user]);

    const fetchSchemas = async () => {
        try {
            setLoading(true);
            const response = await schemaService.getAllSchemas();
            if (response.success) {
                setSchemas(response.data);
            }
        } catch (err) {
            console.error('Error fetching schemas:', err);
            setError('Failed to load schemas');
        } finally {
            setLoading(false);
        }
    };

    const handleFileSelect = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validate file
        const validation = schemaService.validateSVGFile(file);
        if (!validation.valid) {
            setError(validation.error);
            return;
        }

        try {
            // Read file content
            const content = await schemaService.readSVGFile(file);
            setSelectedFile(file);
            setPreviewSVG(content);
            setError('');
        } catch (err) {
            setError('Failed to read file');
            console.error(err);
        }
    };

    const handleUpload = async () => {
        if (!selectedFile || !previewSVG) {
            setError('Please select a file first');
            return;
        }

        try {
            setUploading(true);
            setError('');
            setSuccess('');

            const response = await schemaService.uploadSchema(
                selectedFile.name,
                previewSVG
            );

            if (response.success) {
                setSuccess('Schema uploaded successfully!');
                setSelectedFile(null);
                setPreviewSVG('');
                setShowPreview(false);
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
                fetchSchemas();
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to upload schema');
        } finally {
            setUploading(false);
        }
    };

    // Edit handlers
    const openEditModal = async (schema) => {
        setEditingSchema(schema);
        setEditSelectedFile(null);
        setEditPreviewSVG('');
        setShowEditModal(true);
        if (editFileInputRef.current) editFileInputRef.current.value = '';
        setError('');
        setSuccess('');
    };

    const handleEditFileSelect = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const validation = schemaService.validateSVGFile(file);
        if (!validation.valid) {
            setError(validation.error);
            return;
        }

        try {
            setError('');
            const content = await schemaService.readSVGFile(file);
            setEditSelectedFile(file);
            setEditPreviewSVG(content);
        } catch (err) {
            setError('Failed to read file');
            console.error(err);
        }
    };

    const handleUpdate = async () => {
        if (!editingSchema || !editPreviewSVG) {
            setError('Please select an SVG file to update');
            return;
        }

        try {
            setEditUploading(true);
            setError('');
            setSuccess('');

            const response = await schemaService.updateSchema(editingSchema.id, editPreviewSVG);
            if (response.success) {
                setSuccess('Schema updated successfully!');
                setShowEditModal(false);
                setEditingSchema(null);
                setEditSelectedFile(null);
                setEditPreviewSVG('');
                fetchSchemas();
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to update schema');
        } finally {
            setEditUploading(false);
        }
    };

    const handleSetActive = async (schemaId) => {
        try {
            setError('');
            setSuccess('');
            const response = await schemaService.setActiveSchema(schemaId);
            if (response.success) {
                setSuccess('Schema set as active!');
                fetchSchemas();
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to set active schema');
        }
    };

    const handleDelete = (schema) => {
        const confirmMessage = schema.isActive
            ? 'WARNING: This is the ACTIVE schema. Deleting it will leave the system without an active schema display. Are you sure?'
            : 'Are you sure you want to delete this schema?';

        setConfirmConfig({
            isOpen: true,
            title: 'Konfirmasi Hapus Schema',
            message: confirmMessage,
            type: 'error',
            onConfirm: async () => {
                try {
                    setError('');
                    setSuccess('');
                    const response = await schemaService.deleteSchema(schema.id);
                    if (response.success) {
                        setSuccess('Schema deleted successfully!');
                        fetchSchemas();
                        // Close preview or edit modal if open and matches deleted schema
                        if (previewingSchema?.id === schema.id) {
                            setShowPreview(false);
                            setPreviewingSchema(null);
                        }
                        if (editingSchema?.id === schema.id) {
                            setShowEditModal(false);
                            setEditingSchema(null);
                        }
                    }
                } catch (err) {
                    setError(err.response?.data?.message || 'Failed to delete schema');
                }
            }
        });
    };

    const handleViewSchema = async (schemaId) => {
        try {
            const response = await schemaService.getSchemaById(schemaId);
            if (response.success) {
                setPreviewSVG(response.data.svgContent);
                setPreviewingSchema(response.data);
                setShowPreview(true);
            }
        } catch (err) {
            setError('Failed to load schema');
        }
    };

    if (user?.role !== 'ADMIN') {
        return (
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
                <div className="text-center">
                    <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
                    <h3 className="text-lg font-semibold text-gray-800">Access Denied</h3>
                    <p className="text-gray-500 mt-2">Only administrators can manage schemas.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Alerts */}
            <Alert
                type="error"
                message={error}
                onClose={() => setError('')}
                title="Error"
            />
            <Alert
                type="success"
                message={success}
                onClose={() => setSuccess('')}
                title="Success"
            />

            {/* Upload Section */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-blue-100 rounded-lg">
                        <Upload className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">Upload New Schema</h2>
                        <p className="text-sm text-gray-500">Upload SVG file for desalination schema</p>
                    </div>
                </div>

                <div className="space-y-4">
                    {/* File Input */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Select SVG File
                        </label>
                        <div className="flex items-center gap-3">
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".svg,image/svg+xml"
                                onChange={handleFileSelect}
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                            {selectedFile && (
                                <span className="flex items-center gap-2 text-sm text-green-600">
                                    <CheckCircle size={16} />
                                    {selectedFile.name}
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                            Maximum file size: 5MB • Accepted format: SVG
                        </p>
                    </div>

                    {/* Upload Button */}
                    <button
                        onClick={handleUpload}
                        disabled={!selectedFile || uploading}
                        className="w-full px-4 py-3 bg-blue-500 text-white font-semibold rounded-xl hover:bg-blue-600 hover:shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none flex items-center justify-center gap-2"
                    >
                        {uploading ? (
                            <>
                                <Loader2 size={20} className="animate-spin" />
                                Uploading...
                            </>
                        ) : (
                            <>
                                <Upload size={20} />
                                Upload Schema
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Schemas List */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-purple-100 rounded-lg">
                        <FileText className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">Uploaded Schemas</h2>
                        <p className="text-sm text-gray-500">{schemas.length} total schemas</p>
                    </div>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                    </div>
                ) : schemas.length === 0 ? (
                    <div className="text-center py-12">
                        <Image className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500">No schemas uploaded yet</p>
                        <p className="text-sm text-gray-400 mt-1">Upload your first schema above</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {schemas.map((schema) => (
                            <div
                                key={schema.id}
                                className={`p-3 sm:p-4 rounded-xl border-2 transition-all ${schema.isActive
                                    ? 'bg-green-50 border-green-200'
                                    : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                                    }`}
                            >
                                {/* Mobile Layout - Stack vertically */}
                                <div className="flex flex-col gap-3 sm:hidden">
                                    {/* Header with icon and title */}
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg flex-shrink-0 ${schema.isActive ? 'bg-green-100' : 'bg-gray-200'
                                            }`}>
                                            <FileText size={18} className={
                                                schema.isActive ? 'text-green-600' : 'text-gray-600'
                                            } />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <h3 className="font-semibold text-gray-800 text-sm truncate">
                                                    {schema.fileName}
                                                </h3>
                                                {schema.isActive && (
                                                    <span className="px-2 py-0.5 bg-green-500 text-white text-xs font-medium rounded-full flex-shrink-0">
                                                        Active
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-gray-500 mt-0.5">
                                                Version {schema.version} • Uploaded {new Date(schema.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Action buttons - Mobile */}
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => handleViewSchema(schema.id)}
                                            className="flex-1 flex items-center justify-center gap-1.5 h-9 bg-blue-100 hover:bg-blue-500 text-blue-600 hover:text-white rounded-lg text-xs font-medium transition-all"
                                            title="View"
                                        >
                                            <Eye size={16} />
                                            <span>Lihat</span>
                                        </button>
                                        <button
                                            onClick={() => openEditModal(schema)}
                                            className="flex items-center justify-center w-9 h-9 bg-yellow-100 hover:bg-yellow-500 text-yellow-700 hover:text-white rounded-lg transition-all flex-shrink-0"
                                            title="Edit"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(schema)}
                                            className="flex items-center justify-center w-9 h-9 bg-red-100 hover:bg-red-500 text-red-600 hover:text-white rounded-lg transition-all flex-shrink-0"
                                            title="Delete"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>

                                    {/* Set Active button - Full width on mobile */}
                                    {!schema.isActive && (
                                        <button
                                            onClick={() => handleSetActive(schema.id)}
                                            className="w-full flex items-center justify-center gap-2 h-9 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition-all"
                                        >
                                            <CheckCircle size={16} />
                                            Set Active
                                        </button>
                                    )}
                                </div>

                                {/* Desktop Layout - Horizontal */}
                                <div className="hidden sm:flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${schema.isActive ? 'bg-green-100' : 'bg-gray-200'
                                            }`}>
                                            <FileText size={20} className={
                                                schema.isActive ? 'text-green-600' : 'text-gray-600'
                                            } />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-semibold text-gray-800">
                                                    {schema.fileName}
                                                </h3>
                                                {schema.isActive && (
                                                    <span className="px-2 py-0.5 bg-green-500 text-white text-xs font-medium rounded-full">
                                                        Active
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm text-gray-500 mt-1">
                                                Version {schema.version} • Uploaded {new Date(schema.createdAt).toLocaleDateString('id-ID')}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => handleViewSchema(schema.id)}
                                            className="flex items-center justify-center w-9 h-9 bg-blue-100 hover:bg-blue-500 text-blue-600 hover:text-white rounded-lg transition-all"
                                            title="View Schema"
                                        >
                                            <Eye size={18} />
                                        </button>
                                        <button
                                            onClick={() => openEditModal(schema)}
                                            className="flex items-center justify-center w-9 h-9 bg-yellow-100 hover:bg-yellow-500 text-yellow-700 hover:text-white rounded-lg transition-all"
                                            title="Edit Schema"
                                        >
                                            <Edit2 size={18} />
                                        </button>
                                        {!schema.isActive && (
                                            <button
                                                onClick={() => handleSetActive(schema.id)}
                                                className="flex items-center gap-2 px-3 h-9 bg-green-100 hover:bg-green-500 text-green-700 hover:text-white rounded-lg text-sm font-medium transition-all whitespace-nowrap"
                                            >
                                                <CheckCircle size={16} />
                                                Set Active
                                            </button>
                                        )}
                                        <button
                                            onClick={() => handleDelete(schema)}
                                            className="flex items-center justify-center w-9 h-9 bg-red-100 hover:bg-red-500 text-red-600 hover:text-white rounded-lg transition-all"
                                            title="Delete Schema"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Edit Modal */}
            {showEditModal && createPortal(
                <div
                    className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm"
                    onClick={() => setShowEditModal(false)}
                    style={{ animation: 'fadeIn 0.2s ease-out' }}
                >
                    <div
                        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                        style={{ animation: 'slideUp 0.3s ease-out' }}
                    >
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 bg-yellow-500">
                            <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                                <div className="p-1.5 sm:p-2 bg-white/20 rounded-lg flex-shrink-0">
                                    <Edit2 size={18} className="text-white sm:w-5 sm:h-5" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h3 className="text-base sm:text-lg font-bold text-white">Update Schema</h3>
                                    <p className="text-yellow-100 text-xs sm:text-sm truncate">{editingSchema?.fileName}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowEditModal(false)}
                                className="p-1.5 sm:p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors flex-shrink-0 ml-2"
                            >
                                <XCircle size={18} className="text-white sm:w-5 sm:h-5" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-4 sm:p-6 space-y-3 sm:space-y-4 flex-1 overflow-auto">
                            <div>
                                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">
                                    Select New SVG File
                                    <span className="text-red-500 ml-1">*</span>
                                </label>
                                <input
                                    ref={editFileInputRef}
                                    type="file"
                                    accept=".svg,image/svg+xml"
                                    onChange={handleEditFileSelect}
                                    className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-transparent bg-gray-50 transition-all"
                                />
                                {editSelectedFile && (
                                    <p className="text-xs sm:text-sm text-green-600 mt-2 flex items-center gap-2">
                                        <CheckCircle size={14} className="sm:w-4 sm:h-4 flex-shrink-0" />
                                        <span className="truncate">{editSelectedFile.name}</span>
                                    </p>
                                )}
                            </div>
                            {editPreviewSVG && (
                                <div>
                                    <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">Preview</label>
                                    <div className="p-3 sm:p-4 bg-gray-50 rounded-xl border-2 border-gray-100 max-h-48 sm:max-h-64 overflow-auto [&>svg]:max-w-full [&>svg]:h-auto" dangerouslySetInnerHTML={{ __html: editPreviewSVG }} />
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="flex gap-2 sm:gap-3 p-4 sm:p-5 border-t border-gray-200 bg-gray-50">
                            <button
                                onClick={() => setShowEditModal(false)}
                                className="flex-1 flex items-center justify-center gap-1.5 sm:gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-white border-2 border-gray-200 text-gray-600 text-sm sm:text-base font-semibold rounded-xl hover:bg-gray-100 transition-all"
                            >
                                <XCircle size={16} className="sm:w-[18px] sm:h-[18px]" />
                                Batal
                            </button>
                            <button
                                onClick={handleUpdate}
                                disabled={editUploading || !editPreviewSVG}
                                className="flex-1 flex items-center justify-center gap-1.5 sm:gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-yellow-500 text-white text-sm sm:text-base font-semibold rounded-xl hover:bg-yellow-600 hover:shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                            >
                                {editUploading ? (
                                    <>
                                        <Loader2 size={16} className="animate-spin sm:w-[18px] sm:h-[18px]" />
                                        Updating...
                                    </>
                                ) : (
                                    <>
                                        <Upload size={16} className="sm:w-[18px] sm:h-[18px]" />
                                        <span className="hidden xs:inline">Update Schema</span>
                                        <span className="xs:hidden">Update</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Preview Modal */}
            {showPreview && createPortal(
                <div
                    className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm"
                    onClick={() => setShowPreview(false)}
                    style={{ animation: 'fadeIn 0.2s ease-out' }}
                >
                    <div
                        className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                        style={{ animation: 'slideUp 0.3s ease-out' }}
                    >
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 bg-blue-500">
                            <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                                <div className="p-1.5 sm:p-2 bg-white/20 rounded-lg flex-shrink-0">
                                    <Eye size={18} className="text-white sm:w-5 sm:h-5" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h3 className="text-base sm:text-lg font-bold text-white">Preview Schema</h3>
                                    {previewingSchema && (
                                        <p className="text-blue-100 text-xs sm:text-sm truncate">{previewingSchema.fileName}</p>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0 ml-2">
                                <button
                                    onClick={() => { setShowPreview(false); setPreviewingSchema(null); }}
                                    className="p-1.5 sm:p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                                >
                                    <XCircle size={18} className="text-white sm:w-5 sm:h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Modal Body */}
                        <div className="p-3 sm:p-6 overflow-auto flex-1 bg-gray-50" style={{ maxHeight: 'calc(90vh - 100px)' }}>
                            <div className="flex items-center justify-center">
                                <div
                                    className="bg-white p-3 sm:p-6 rounded-xl border-2 border-gray-100 shadow-sm inline-flex items-center justify-center [&>svg]:max-w-full [&>svg]:max-h-[70vh] [&>svg]:w-auto [&>svg]:h-auto"
                                    dangerouslySetInnerHTML={{ __html: previewSVG }}
                                />
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* CustomAlert for confirmations */}
            {confirmConfig.isOpen && createPortal(
                <div className="relative z-[200]">
                    <CustomAlert
                        isOpen={confirmConfig.isOpen}
                        onClose={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
                        title={confirmConfig.title}
                        message={confirmConfig.message}
                        type={confirmConfig.type}
                        isConfirm={true}
                        onConfirm={confirmConfig.onConfirm}
                    />
                </div>,
                document.body
            )}

            {/* CSS Animations */}
            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slideUp {
                    from { transform: translateY(20px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
            `}</style>
        </div>
    );
};

export default SchemaManagement;
