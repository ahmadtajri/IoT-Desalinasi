// User Profile Modal - Displays user info and allows account settings
import { useState, useEffect } from 'react';
import { X, User, Mail, Shield, Key, Eye, EyeOff, Loader2, CheckCircle, AlertCircle, Pencil, Save } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import authService from '../../services/authService';
import PropTypes from 'prop-types';

export default function UserProfileModal({ isOpen, onClose }) {
    const { user, isDefaultAdmin, refreshUser } = useAuth();

    // Edit states
    const [isEditingUsername, setIsEditingUsername] = useState(false);
    const [isEditingEmail, setIsEditingEmail] = useState(false);
    const [editUsername, setEditUsername] = useState('');
    const [editEmail, setEditEmail] = useState('');

    // Password states
    const [showChangePassword, setShowChangePassword] = useState(false);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);

    // Loading and message
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    // Reset edit states when user changes
    useEffect(() => {
        if (user) {
            setEditUsername(user.username || '');
            setEditEmail(user.email || '');
        }
    }, [user]);

    if (!isOpen) return null;

    const handleSaveUsername = async () => {
        if (!editUsername.trim()) {
            setMessage({ type: 'error', text: 'Username tidak boleh kosong.' });
            return;
        }
        if (editUsername === user?.username) {
            setIsEditingUsername(false);
            return;
        }

        setLoading(true);
        setMessage({ type: '', text: '' });

        try {
            const response = await authService.updateAccount({ username: editUsername.trim() });
            if (response.success) {
                setMessage({ type: 'success', text: 'Username berhasil diubah!' });
                setIsEditingUsername(false);
                await refreshUser();
                setTimeout(() => setMessage({ type: '', text: '' }), 2000);
            } else {
                setMessage({ type: 'error', text: response.message });
            }
        } catch (error) {
            setMessage({ type: 'error', text: error.message || 'Gagal mengubah username.' });
        } finally {
            setLoading(false);
        }
    };

    const handleSaveEmail = async () => {
        if (!editEmail.trim()) {
            setMessage({ type: 'error', text: 'Email tidak boleh kosong.' });
            return;
        }
        if (editEmail === user?.email) {
            setIsEditingEmail(false);
            return;
        }

        setLoading(true);
        setMessage({ type: '', text: '' });

        try {
            const response = await authService.updateAccount({ email: editEmail.trim() });
            if (response.success) {
                setMessage({ type: 'success', text: 'Email berhasil diubah!' });
                setIsEditingEmail(false);
                await refreshUser();
                setTimeout(() => setMessage({ type: '', text: '' }), 2000);
            } else {
                setMessage({ type: 'error', text: response.message });
            }
        } catch (error) {
            setMessage({ type: 'error', text: error.message || 'Gagal mengubah email.' });
        } finally {
            setLoading(false);
        }
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        setMessage({ type: '', text: '' });

        if (newPassword !== confirmPassword) {
            setMessage({ type: 'error', text: 'Password baru dan konfirmasi tidak cocok.' });
            return;
        }

        if (newPassword.length < 6) {
            setMessage({ type: 'error', text: 'Password baru minimal 6 karakter.' });
            return;
        }

        setLoading(true);

        try {
            const response = await authService.updateAccount({
                currentPassword,
                newPassword,
            });

            if (response.success) {
                setMessage({ type: 'success', text: 'Password berhasil diubah!' });
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
                setTimeout(() => {
                    setShowChangePassword(false);
                    setMessage({ type: '', text: '' });
                }, 2000);
            } else {
                setMessage({ type: 'error', text: response.message || 'Gagal mengubah password.' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: error.message || 'Terjadi kesalahan.' });
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setShowChangePassword(false);
        setIsEditingUsername(false);
        setIsEditingEmail(false);
        setEditUsername(user?.username || '');
        setEditEmail(user?.email || '');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setMessage({ type: '', text: '' });
        onClose();
    };

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={handleClose}
        >
            <div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden max-h-[90vh] overflow-y-auto mx-2"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="bg-blue-500 p-4 sm:p-6 flex items-center justify-between">
                    <div className="flex items-center gap-3 text-white">
                        <div className="p-2 bg-white/20 rounded-lg">
                            <User size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold">Profil Pengguna</h2>
                            <p className="text-blue-100 text-sm">Pengaturan akun Anda</p>
                        </div>
                    </div>
                    <button
                        onClick={handleClose}
                        className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-white" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 sm:p-6">
                    {/* Message */}
                    {message.text && (
                        <div className={`mb-4 p-3 rounded-lg flex items-center gap-2 ${message.type === 'success'
                            ? 'bg-green-50 text-green-700 border border-green-200'
                            : 'bg-red-50 text-red-700 border border-red-200'
                            }`}>
                            {message.type === 'success' ? (
                                <CheckCircle size={18} />
                            ) : (
                                <AlertCircle size={18} />
                            )}
                            <span className="text-sm">{message.text}</span>
                        </div>
                    )}

                    {/* User Info */}
                    <div className="space-y-4 mb-6">
                        {/* Username - Editable for all users */}
                        <div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-gray-50 rounded-xl">
                            <div className="p-2 bg-blue-100 rounded-lg shrink-0">
                                <User size={20} className="text-blue-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs text-gray-500 uppercase font-medium">Username</p>
                                {isEditingUsername ? (
                                    <div className="flex items-center gap-2 mt-1">
                                        <input
                                            type="text"
                                            value={editUsername}
                                            onChange={(e) => setEditUsername(e.target.value)}
                                            className="flex-1 px-2 py-1 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
                                            disabled={loading}
                                            autoFocus
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') handleSaveUsername();
                                                if (e.key === 'Escape') {
                                                    setIsEditingUsername(false);
                                                    setEditUsername(user?.username || '');
                                                }
                                            }}
                                        />
                                        <button
                                            onClick={handleSaveUsername}
                                            disabled={loading}
                                            className="p-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors disabled:opacity-50"
                                        >
                                            {loading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                                        </button>
                                        <button
                                            onClick={() => {
                                                setIsEditingUsername(false);
                                                setEditUsername(user?.username || '');
                                            }}
                                            className="p-1.5 bg-gray-200 hover:bg-gray-300 text-gray-600 rounded-lg transition-colors"
                                            disabled={loading}
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 min-w-0">
                                        <p className="text-gray-900 font-semibold truncate">{user?.username || '-'}</p>
                                        <button
                                            onClick={() => setIsEditingUsername(true)}
                                            className="p-1 hover:bg-blue-100 rounded-md transition-colors text-gray-400 hover:text-blue-600"
                                            title="Edit username"
                                        >
                                            <Pencil size={14} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Email */}
                        <div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-gray-50 rounded-xl">
                            <div className="p-2 bg-green-100 rounded-lg shrink-0">
                                <Mail size={20} className="text-green-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs text-gray-500 uppercase font-medium">Email</p>
                                {isEditingEmail ? (
                                    <div className="flex items-center gap-2 mt-1">
                                        <input
                                            type="email"
                                            value={editEmail}
                                            onChange={(e) => setEditEmail(e.target.value)}
                                            className="flex-1 px-2 py-1 border border-green-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400 text-sm"
                                            disabled={loading}
                                            autoFocus
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') handleSaveEmail();
                                                if (e.key === 'Escape') {
                                                    setIsEditingEmail(false);
                                                    setEditEmail(user?.email || '');
                                                }
                                            }}
                                        />
                                        <button
                                            onClick={handleSaveEmail}
                                            disabled={loading}
                                            className="p-1.5 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors disabled:opacity-50"
                                        >
                                            {loading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                                        </button>
                                        <button
                                            onClick={() => {
                                                setIsEditingEmail(false);
                                                setEditEmail(user?.email || '');
                                            }}
                                            className="p-1.5 bg-gray-200 hover:bg-gray-300 text-gray-600 rounded-lg transition-colors"
                                            disabled={loading}
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 min-w-0">
                                        <p className="text-gray-900 font-semibold text-sm break-all">{user?.email || '-'}</p>
                                        {/* Only default admin can edit email */}
                                        {isDefaultAdmin() && (
                                            <button
                                                onClick={() => setIsEditingEmail(true)}
                                                className="p-1 hover:bg-green-100 rounded-md transition-colors text-gray-400 hover:text-green-600"
                                                title="Edit email"
                                            >
                                                <Pencil size={14} />
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Role */}
                        <div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-gray-50 rounded-xl">
                            <div className="p-2 bg-purple-100 rounded-lg shrink-0">
                                <Shield size={20} className="text-purple-600" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 uppercase font-medium">Role</p>
                                <p className="text-gray-900 font-semibold">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${user?.role === 'ADMIN'
                                        ? 'bg-purple-100 text-purple-800'
                                        : 'bg-blue-100 text-blue-800'
                                        }`}>
                                        {user?.role || '-'}
                                    </span>
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Change Password Section */}
                    {!showChangePassword ? (
                        <button
                            onClick={() => setShowChangePassword(true)}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl text-gray-700 font-medium transition-colors"
                        >
                            <Key size={18} />
                            Ganti Password
                        </button>
                    ) : (
                        <form onSubmit={handleChangePassword} className="space-y-4">
                            <div className="border-t pt-4">
                                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                    <Key size={16} />
                                    Ganti Password
                                </h3>

                                {/* Current Password */}
                                <div className="mb-3">
                                    <label className="block text-xs text-gray-500 mb-1">Password Lama</label>
                                    <div className="relative">
                                        <input
                                            type={showCurrentPassword ? 'text' : 'password'}
                                            value={currentPassword}
                                            onChange={(e) => setCurrentPassword(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 pr-10"
                                            placeholder="Masukkan password lama"
                                            required
                                            disabled={loading}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                        >
                                            {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                </div>

                                {/* New Password */}
                                <div className="mb-3">
                                    <label className="block text-xs text-gray-500 mb-1">Password Baru</label>
                                    <div className="relative">
                                        <input
                                            type={showNewPassword ? 'text' : 'password'}
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 pr-10"
                                            placeholder="Masukkan password baru"
                                            required
                                            disabled={loading}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowNewPassword(!showNewPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                        >
                                            {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                </div>

                                {/* Confirm Password */}
                                <div className="mb-4">
                                    <label className="block text-xs text-gray-500 mb-1">Konfirmasi Password Baru</label>
                                    <input
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                                        placeholder="Konfirmasi password baru"
                                        required
                                        disabled={loading}
                                    />
                                </div>

                                {/* Buttons */}
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowChangePassword(false);
                                            setCurrentPassword('');
                                            setNewPassword('');
                                            setConfirmPassword('');
                                            setMessage({ type: '', text: '' });
                                        }}
                                        className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 font-medium transition-colors"
                                        disabled={loading}
                                    >
                                        Batal
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg text-white font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        {loading ? (
                                            <>
                                                <Loader2 size={18} className="animate-spin" />
                                                Menyimpan...
                                            </>
                                        ) : (
                                            'Simpan'
                                        )}
                                    </button>
                                </div>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}

UserProfileModal.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired
};
