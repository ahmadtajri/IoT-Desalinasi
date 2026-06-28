import { useState, useEffect, useCallback } from 'react';
import userService from '../../services/userService';
import BottomSheetModal from '../../components/shared/BottomSheetModal';
import {
    Users, Plus, Trash2, Edit2, Power, AlertCircle,
    ChevronDown, ChevronUp, Loader2
} from 'lucide-react';
import CustomAlert from '../../components/shared/CustomAlert';
import { useAuth } from '../../context/AuthContext';
import PropTypes from 'prop-types';

// Kartu Pengguna
function UserCard({ user, currentUser, onEdit, onDelete, onToggleStatus }) {
    const [expanded, setExpanded] = useState(false);

    // Check if this user card is the default admin
    const isCardDefaultAdmin = user.role === 'ADMIN' && user.createdById === null;
    // Check if current logged-in user IS this default admin
    const isCurrentUserThisDefaultAdmin = isCardDefaultAdmin && currentUser?.id === user.id;
    // Show action buttons: hide all for default admin unless you ARE that default admin
    const showActions = !isCardDefaultAdmin || isCurrentUserThisDefaultAdmin;
    return (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden transition-all hover:shadow-md">
            <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shrink-0 ${user.role === 'ADMIN' ? 'bg-purple-500' : 'bg-blue-500'}`}>
                        {user.username.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                        <h3 className="text-gray-800 font-semibold flex items-center gap-2 flex-wrap">
                            <span className="truncate max-w-[150px] sm:max-w-none">{user.username}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${user.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                {user.role}
                            </span>
                        </h3>
                        <p className="text-gray-500 text-sm truncate">{user.email}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${user.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {user.isActive ? 'Aktif' : 'Nonaktif'}
                    </span>
                    <button onClick={() => setExpanded(!expanded)} className="p-1 rounded-md hover:bg-gray-100" aria-label="Toggle details">
                        {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                </div>
            </div>

            {expanded && (
                <div className="border-t border-gray-100 p-4 bg-gray-50 space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <span className="text-gray-500">Dibuat:</span>
                            <span className="text-gray-800 ml-2 font-medium">{new Date(user.createdAt).toLocaleDateString('id-ID')}</span>
                        </div>
                        <div>
                            <span className="text-gray-500">Data Rekaman:</span>
                            <span className="text-gray-800 ml-2 font-medium">{user._count?.sensorData || 0}</span>
                        </div>
                        {user.activeInterval && (
                            <div className="col-span-2">
                                <span className="text-gray-500">Interval Aktif:</span>
                                <span className="text-gray-800 ml-2 font-medium">{user.activeInterval.intervalName}</span>
                            </div>
                        )}
                    </div>

                    <div className="flex flex-wrap gap-2 pt-2">
                        {showActions && (
                            <>
                                <button onClick={() => onEdit(user)} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-all hover:shadow-md">
                                    <Edit2 size={14} /> Ubah
                                </button>
                                {/* Hide toggle & delete for default admin (seeded, no createdById) */}
                                {!(user.role === 'ADMIN' && user.createdById === null) && (
                                    <>
                                        <button onClick={() => onToggleStatus(user)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all hover:shadow-md ${user.isActive ? 'bg-orange-500 hover:bg-orange-600 text-white' : 'bg-green-500 hover:bg-green-600 text-white'}`}>
                                            <Power size={14} />
                                            {user.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                                        </button>
                                        <button onClick={() => onDelete(user)} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-all hover:shadow-md">
                                            <Trash2 size={14} /> Hapus
                                        </button>
                                    </>
                                )}
                            </>
                        )}
                        {!showActions && (
                            <span className="text-xs text-gray-400 italic">Default Admin</span>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

UserCard.propTypes = {
    user: PropTypes.object.isRequired,
    currentUser: PropTypes.object,
    onEdit: PropTypes.func.isRequired,
    onDelete: PropTypes.func.isRequired,
    onToggleStatus: PropTypes.func.isRequired
};



export default function UserManagement() {
    const { user: currentUser } = useAuth();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);

    const [formData, setFormData] = useState({ username: '', email: '', password: '', role: 'USER' });
    const [formLoading, setFormLoading] = useState(false);
    const [formError, setFormError] = useState('');

    const [confirmConfig, setConfirmConfig] = useState({
        isOpen: false, title: '', message: '', type: 'warning', onConfirm: null
    });

    const fetchUsers = useCallback(async () => {
        try {
            setLoading(true);
            setError('');
            const response = await userService.getAllUsers();
            if (response.success) {
                setUsers(response.data);
            } else {
                setError(response.message || 'Gagal memuat data pengguna');
            }
        } catch (err) {
            console.error('❌ Error fetching users:', err);
            let errorMsg = 'Gagal memuat data pengguna';
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

    useEffect(() => { fetchUsers(); }, [fetchUsers]);

    const handleCreateUser = async (e) => {
        e.preventDefault();
        setFormLoading(true);
        setFormError('');
        try {
            const response = await userService.createUser(formData);
            if (response.success) {
                setShowCreateModal(false);
                setFormData({ username: '', email: '', password: '', role: 'USER' });
                fetchUsers();
            } else {
                setFormError(response.message);
            }
        } catch (err) {
            setFormError(err.response?.data?.message || 'Gagal membuat pengguna');
        } finally {
            setFormLoading(false);
        }
    };

    const handleEditUser = async (e) => {
        e.preventDefault();
        setFormLoading(true);
        setFormError('');
        try {
            const response = await userService.updateUser(selectedUser.id, formData);
            if (response.success) {
                setShowEditModal(false);
                setSelectedUser(null);
                setFormData({ username: '', email: '', password: '', role: 'USER' });
                fetchUsers();
            } else {
                setFormError(response.message);
            }
        } catch (err) {
            setFormError(err.response?.data?.message || 'Gagal mengubah pengguna');
        } finally {
            setFormLoading(false);
        }
    };

    const handleDeleteUser = async () => {
        setFormLoading(true);
        try {
            const response = await userService.deleteUser(selectedUser.id);
            if (response.success) {
                setShowDeleteConfirm(false);
                setSelectedUser(null);
                fetchUsers();
            } else {
                setFormError(response.message);
            }
        } catch (err) {
            setFormError(err.response?.data?.message || 'Gagal menghapus pengguna');
        } finally {
            setFormLoading(false);
        }
    };

    const handleToggleStatus = async (user) => {
        try {
            const response = await userService.toggleUserStatus(user.id);
            if (response.success) fetchUsers();
        } catch (err) {
            console.error('Gagal mengubah status pengguna:', err);
        }
    };

    const openEditModal = (user) => {
        setSelectedUser(user);
        setFormData({ username: user.username, email: user.email, password: '', role: user.role });
        setFormError('');
        setShowEditModal(true);
    };

    const openDeleteConfirm = (user) => {
        setSelectedUser(user);
        setShowDeleteConfirm(true);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-16">
                <Loader2 className="w-10 h-10 text-purple-500 animate-spin" />
            </div>
        );
    }

    return (
        <div>
            <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-100 mb-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 rounded-lg">
                            <Users className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
                        </div>
                        <div>
                            <h2 className="text-lg sm:text-xl font-bold text-gray-800">Kelola Pengguna</h2>
                            <p className="text-xs sm:text-sm text-gray-500">{users.length} total pengguna</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
                        <button
                            onClick={() => {
                                setFormData({ username: '', email: '', password: '', role: 'USER' });
                                setFormError('');
                                setShowCreateModal(true);
                            }}
                            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-purple-500 hover:bg-purple-600 text-white font-medium rounded-xl transition-all text-sm sm:text-base"
                        >
                            <Plus size={16} />
                            <span className="hidden sm:inline">Tambah Pengguna</span>
                            <span className="sm:hidden">Pengguna</span>
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

            <div className="space-y-3">
                {users.map((user) => (
                    <UserCard key={user.id} user={user} currentUser={currentUser} onEdit={openEditModal} onDelete={openDeleteConfirm} onToggleStatus={handleToggleStatus} />
                ))}
                {users.length === 0 && (
                    <div className="p-8 text-center text-gray-400 border border-gray-200 border-dashed rounded-xl bg-gray-50">
                        <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                        <p>Belum ada pengguna.</p>
                    </div>
                )}
            </div>

            {/* Modal Buat Pengguna */}
            <BottomSheetModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Buat Pengguna Baru" headerColor="bg-purple-500">
                <form onSubmit={handleCreateUser} className="space-y-4">
                    {formError && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{formError}</div>}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                        <input type="text" value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                        <input type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                        <select value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent">
                            <option value="USER">User</option>
                            <option value="ADMIN">Admin</option>
                        </select>
                    </div>
                    <div className="flex gap-3 pt-4">
                        <button type="button" onClick={() => setShowCreateModal(false)} className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-all">Batal</button>
                        <button type="submit" disabled={formLoading} className="flex-1 px-4 py-2.5 bg-purple-500 hover:bg-purple-600 text-white font-medium rounded-xl hover:shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                            {formLoading && <Loader2 size={16} className="animate-spin" />}
                            Buat Pengguna
                        </button>
                    </div>
                </form>
            </BottomSheetModal>

            {/* Modal Edit Pengguna */}
            <BottomSheetModal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Ubah Pengguna" headerColor="bg-blue-500">
                <form onSubmit={handleEditUser} className="space-y-4">
                    {formError && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{formError}</div>}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                        <input type="text" value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Password Baru (kosongkan jika tidak diubah)</label>
                        <input type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Kosongkan jika tidak ingin mengubah" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                        <select value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                            <option value="USER">User</option>
                            <option value="ADMIN">Admin</option>
                        </select>
                    </div>
                    <div className="flex gap-3 pt-4">
                        <button type="button" onClick={() => setShowEditModal(false)} className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-all">Batal</button>
                        <button type="submit" disabled={formLoading} className="flex-1 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-xl hover:shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                            {formLoading && <Loader2 size={16} className="animate-spin" />}
                            Simpan Perubahan
                        </button>
                    </div>
                </form>
            </BottomSheetModal>

            {/* Modal Konfirmasi Hapus */}
            <BottomSheetModal isOpen={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)} title="Konfirmasi Hapus" headerColor="bg-red-500">
                <div className="space-y-4">
                    <p className="text-gray-700">
                        Apakah Anda yakin ingin menghapus pengguna <strong>{selectedUser?.username}</strong>?
                    </p>
                    <p className="text-sm text-gray-500">
                        Tindakan ini tidak dapat dibatalkan. Data sensor pengguna akan tetap tersimpan di database.
                    </p>
                    {formError && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{formError}</div>}
                    <div className="flex gap-3 pt-4">
                        <button type="button" onClick={() => setShowDeleteConfirm(false)} className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-all">Batal</button>
                        <button onClick={handleDeleteUser} disabled={formLoading} className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white font-medium rounded-xl hover:shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                            {formLoading && <Loader2 size={16} className="animate-spin" />}
                            Hapus Pengguna
                        </button>
                    </div>
                </div>
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
        </div>
    );
}
