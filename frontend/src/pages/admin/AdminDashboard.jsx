// Admin Dashboard Page
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import userService from '../../services/userService';
import SensorConfigPanel from '../../components/admin/SensorConfigPanel';
import BottomSheetModal from '../../components/shared/BottomSheetModal';
import {
    Users, Plus, Trash2, Edit2, Power, Clock, AlertCircle,
    Loader2, ChevronDown, ChevronUp, Settings, Thermometer
} from 'lucide-react';
import CustomAlert from '../../components/shared/CustomAlert';
import PropTypes from 'prop-types';
// User Card Component
function UserCard({ user, onEdit, onDelete, onToggleStatus }) {
    const [expanded, setExpanded] = useState(false);

    return (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden transition-all hover:shadow-md">
            {/* Header */}
            <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${user.role === 'ADMIN'
                        ? 'bg-purple-500'
                        : 'bg-blue-500'
                        }`}>
                        {user.username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <h3 className="text-gray-800 font-semibold flex items-center gap-2">
                            {user.username}
                            <span className={`text-xs px-2 py-0.5 rounded-full ${user.role === 'ADMIN'
                                ? 'bg-purple-100 text-purple-700'
                                : 'bg-blue-100 text-blue-700'
                                }`}>
                                {user.role}
                            </span>
                        </h3>
                        <p className="text-gray-500 text-sm">{user.email}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${user.isActive
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                        }`}>
                        {user.isActive ? 'Active' : 'Inactive'}
                    </span>
                    <button
                        onClick={() => setExpanded(!expanded)}
                        className="p-1 rounded-md hover:bg-gray-100"
                        aria-label="Toggle details"
                    >
                        {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                </div>
            </div>

            {/* Expanded Content */}
            {expanded && (
                <div className="border-t border-gray-100 p-4 bg-gray-50 space-y-4">
                    {/* User Info */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <span className="text-gray-500">Created:</span>
                            <span className="text-gray-800 ml-2 font-medium">{new Date(user.createdAt).toLocaleDateString()}</span>
                        </div>
                        <div>
                            <span className="text-gray-500">Data Records:</span>
                            <span className="text-gray-800 ml-2 font-medium">{user._count?.sensorData || 0}</span>
                        </div>
                        {user.activeInterval && (
                            <div className="col-span-2">
                                <span className="text-gray-500">Active Interval:</span>
                                <span className="text-gray-800 ml-2 font-medium">{user.activeInterval.intervalName}</span>
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2 pt-2">
                        <button
                            onClick={() => onEdit(user)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-all hover:shadow-md"
                        >
                            <Edit2 size={14} />
                            Edit
                        </button>
                        <button
                            onClick={() => onToggleStatus(user)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all hover:shadow-md ${user.isActive
                                ? 'bg-orange-500 hover:bg-orange-600 text-white'
                                : 'bg-green-500 hover:bg-green-600 text-white'
                                }`}
                        >
                            <Power size={14} />
                            {user.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                        {user.role !== 'ADMIN' && (
                            <button
                                onClick={() => onDelete(user)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-all hover:shadow-md"
                            >
                                <Trash2 size={14} />
                                Delete
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

UserCard.propTypes = {
    user: PropTypes.object.isRequired,
    onEdit: PropTypes.func.isRequired,
    onDelete: PropTypes.func.isRequired,
    onToggleStatus: PropTypes.func.isRequired
};


// Main Admin Dashboard Component
export default function AdminDashboard() {
    const { user: currentUser } = useAuth();
    const [users, setUsers] = useState([]);
    const [intervals, setIntervals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Modal states
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showIntervalModal, setShowIntervalModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);

    // Form states
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        role: 'USER',
    });
    const [intervalForm, setIntervalForm] = useState({
        hours: 0,
        minutes: 1,
        seconds: 0,
        intervalName: '',
    });
    const [formLoading, setFormLoading] = useState(false);
    const [formError, setFormError] = useState('');

    // CustomAlert state for confirmations
    const [confirmConfig, setConfirmConfig] = useState({
        isOpen: false,
        title: '',
        message: '',
        type: 'warning',
        onConfirm: null
    });

    // Fetch users and intervals
    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const [usersResponse, intervalsResponse] = await Promise.all([
                userService.getAllUsers(),
                userService.getGlobalIntervals()
            ]);

            if (usersResponse.success) setUsers(usersResponse.data);
            if (intervalsResponse.success) setIntervals(intervalsResponse.data);

        } catch (err) {
            setError('Failed to load dashboard data');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Handle create user
    const handleCreateUser = async (e) => {
        e.preventDefault();
        setFormLoading(true);
        setFormError('');

        try {
            const response = await userService.createUser(formData);
            if (response.success) {
                setShowCreateModal(false);
                setFormData({ username: '', email: '', password: '', role: 'USER' });
                fetchData();
            } else {
                setFormError(response.message);
            }
        } catch (err) {
            setFormError(err.response?.data?.message || 'Failed to create user');
        } finally {
            setFormLoading(false);
        }
    };

    // Handle edit user
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
                fetchData();
            } else {
                setFormError(response.message);
            }
        } catch (err) {
            setFormError(err.response?.data?.message || 'Failed to update user');
        } finally {
            setFormLoading(false);
        }
    };

    // Handle delete user
    const handleDeleteUser = async () => {
        setFormLoading(true);
        try {
            const response = await userService.deleteUser(selectedUser.id);
            if (response.success) {
                setShowDeleteConfirm(false);
                setSelectedUser(null);
                fetchData();
            } else {
                setFormError(response.message);
            }
        } catch (err) {
            setFormError(err.response?.data?.message || 'Failed to delete user');
        } finally {
            setFormLoading(false);
        }
    };

    // Handle toggle user status
    const handleToggleStatus = async (user) => {
        try {
            const response = await userService.toggleUserStatus(user.id);
            if (response.success) {
                fetchData();
            }
        } catch (err) {
            console.error('Failed to toggle user status:', err);
        }
    };

    // Handle create interval
    const handleCreateInterval = async (e) => {
        e.preventDefault();
        setFormLoading(true);
        setFormError('');

        // Calculate total seconds from hours, minutes, seconds
        const totalSeconds = (intervalForm.hours * 3600) + (intervalForm.minutes * 60) + intervalForm.seconds;

        if (totalSeconds <= 0) {
            setFormError('Interval must be greater than 0 seconds');
            setFormLoading(false);
            return;
        }

        try {
            const response = await userService.createInterval({
                intervalSeconds: totalSeconds,
                intervalName: intervalForm.intervalName
            });

            if (response.success) {
                setShowIntervalModal(false);
                setIntervalForm({ hours: 0, minutes: 1, seconds: 0, intervalName: '' });
                fetchData();
            } else {
                setFormError(response.message);
            }
        } catch (err) {
            setFormError(err.response?.data?.message || 'Failed to create interval');
        } finally {
            setFormLoading(false);
        }
    };

    // Handle delete interval
    const handleDeleteInterval = (intervalId) => {
        setConfirmConfig({
            isOpen: true,
            title: 'Konfirmasi Hapus Interval',
            message: 'Delete this interval? Users using this interval will lose their active interval.',
            type: 'error',
            onConfirm: async () => {
                try {
                    const response = await userService.deleteInterval(intervalId);
                    if (response.success) {
                        fetchData();
                    }
                } catch (err) {
                    console.error('Failed to delete interval:', err);
                }
            }
        });
    };

    // Open edit modal
    const openEditModal = (user) => {
        setSelectedUser(user);
        setFormData({
            username: user.username,
            email: user.email,
            password: '',
            role: user.role,
        });
        setFormError('');
        setShowEditModal(true);
    };

    // Open delete confirm
    const openDeleteConfirm = (user) => {
        setSelectedUser(user);
        setShowDeleteConfirm(true);
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-4 md:p-6">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                                <Settings className="w-7 h-7 text-blue-500" />
                                Admin Dashboard
                            </h1>
                            <p className="text-gray-500 text-sm mt-1">Manage users and global logging intervals</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="px-4 py-2 bg-blue-50 rounded-xl border border-blue-200">
                                <span className="text-sm text-gray-600">Logged in as: </span>
                                <span className="font-semibold text-blue-700">{currentUser?.username}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Error */}
                {error && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 text-red-500" />
                        <p className="text-red-700">{error}</p>
                    </div>
                )}

                {/* Global Intervals Section */}
                <section>
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-3">
                                    <Clock className="w-6 h-6 text-blue-500" />
                                    Global Logging Intervals
                                </h2>
                                <p className="text-gray-500 mt-1 text-sm">Define available logging intervals for all users</p>
                            </div>
                            <button
                                onClick={() => {
                                    setIntervalForm({ hours: 0, minutes: 1, seconds: 0, intervalName: '' });
                                    setFormError('');
                                    setShowIntervalModal(true);
                                }}
                                className="flex items-center gap-2 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all"
                            >
                                <Plus size={18} />
                                Add Interval
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {intervals.map((interval) => (
                                <div key={interval.id} className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex justify-between items-center group hover:shadow-md transition-all">
                                    <div>
                                        <h4 className="text-gray-800 font-semibold">{interval.intervalName}</h4>
                                        <p className="text-gray-500 text-xs mt-1">{interval.intervalSeconds} seconds</p>
                                    </div>
                                    <button
                                        onClick={() => handleDeleteInterval(interval.id)}
                                        className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}
                            {intervals.length === 0 && (
                                <div className="col-span-full p-8 text-center text-gray-400 border border-gray-200 border-dashed rounded-xl bg-gray-50">
                                    <Clock className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                                    <p>No global intervals defined yet.</p>
                                    <p className="text-sm mt-1">Click &quot;Add Interval&quot; to create one.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </section>

                {/* Users Section */}
                <section>
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-3">
                                    <Users className="w-6 h-6 text-purple-500" />
                                    User Management
                                </h2>
                                <p className="text-gray-500 mt-1 text-sm">{users.length} total users</p>
                            </div>
                            <button
                                onClick={() => {
                                    setFormData({ username: '', email: '', password: '', role: 'USER' });
                                    setFormError('');
                                    setShowCreateModal(true);
                                }}
                                className="flex items-center gap-2 px-4 py-2.5 bg-purple-500 hover:bg-purple-600 text-white font-semibold rounded-xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all"
                            >
                                <Plus size={18} />
                                Add User
                            </button>
                        </div>

                        <div className="space-y-3">
                            {users.map((user) => (
                                <UserCard
                                    key={user.id}
                                    user={user}
                                    onEdit={openEditModal}
                                    onDelete={openDeleteConfirm}
                                    onToggleStatus={handleToggleStatus}
                                />
                            ))}
                            {users.length === 0 && (
                                <div className="p-8 text-center text-gray-400 border border-gray-200 border-dashed rounded-xl bg-gray-50">
                                    <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                                    <p>No users found.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </section>

                {/* Sensor Configuration Section */}
                <section>
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-3">
                                    <Thermometer className="w-6 h-6 text-orange-500" />
                                    Konfigurasi Sensor
                                </h2>
                                <p className="text-gray-500 mt-1 text-sm">Atur nama display dan status sensor</p>
                            </div>
                        </div>
                        <SensorConfigPanel onConfigChange={() => { }} />
                    </div>
                </section>

                {/* Create User Modal */}
                <BottomSheetModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Create New User" headerColor="bg-purple-500">
                    <form onSubmit={handleCreateUser} className="space-y-4">
                        {formError && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                                {formError}
                            </div>
                        )}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                            <input
                                type="text"
                                value={formData.username}
                                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                            <input
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                            <input
                                type="password"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                            <select
                                value={formData.role}
                                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="USER">User</option>
                                <option value="ADMIN">Admin</option>
                            </select>
                        </div>
                        <div className="flex gap-3 pt-4">
                            <button
                                type="button"
                                onClick={() => setShowCreateModal(false)}
                                className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-all"
                            >
                                Batal
                            </button>
                            <button
                                type="submit"
                                disabled={formLoading}
                                className="flex-1 px-4 py-2.5 bg-purple-500 hover:bg-purple-600 text-white font-medium rounded-xl hover:shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {formLoading && <Loader2 size={16} className="animate-spin" />}
                                Create User
                            </button>
                        </div>
                    </form>
                </BottomSheetModal>

                {/* Edit User Modal */}
                <BottomSheetModal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Edit User" headerColor="bg-blue-500">
                    <form onSubmit={handleEditUser} className="space-y-4">
                        {formError && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                                {formError}
                            </div>
                        )}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                            <input
                                type="text"
                                value={formData.username}
                                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                            <input
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">New Password (leave blank to keep current)</label>
                            <input
                                type="password"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="Leave blank to keep current password"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                            <select
                                value={formData.role}
                                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="USER">User</option>
                                <option value="ADMIN">Admin</option>
                            </select>
                        </div>
                        <div className="flex gap-3 pt-4">
                            <button
                                type="button"
                                onClick={() => setShowEditModal(false)}
                                className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-all"
                            >
                                Batal
                            </button>
                            <button
                                type="submit"
                                disabled={formLoading}
                                className="flex-1 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-xl hover:shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {formLoading && <Loader2 size={16} className="animate-spin" />}
                                Update User
                            </button>
                        </div>
                    </form>
                </BottomSheetModal>

                {/* Delete Confirmation Modal */}
                <BottomSheetModal isOpen={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)} title="Confirm Delete" headerColor="bg-red-500">
                    <div className="space-y-4">
                        <p className="text-gray-700">
                            Are you sure you want to delete user <strong>{selectedUser?.username}</strong>?
                        </p>
                        <p className="text-sm text-gray-500">
                            This action cannot be undone. The user&apos;s sensor data will remain in the database.
                        </p>
                        {formError && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                                {formError}
                            </div>
                        )}
                        <div className="flex gap-3 pt-4">
                            <button
                                type="button"
                                onClick={() => setShowDeleteConfirm(false)}
                                className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-all"
                            >
                                Batal
                            </button>
                            <button
                                onClick={handleDeleteUser}
                                disabled={formLoading}
                                className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white font-medium rounded-xl hover:shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {formLoading && <Loader2 size={16} className="animate-spin" />}
                                Delete User
                            </button>
                        </div>
                    </div>
                </BottomSheetModal>

                {/* Create Interval Modal */}
                <BottomSheetModal isOpen={showIntervalModal} onClose={() => setShowIntervalModal(false)} title="Create Global Interval" headerColor="bg-blue-500">
                    <form onSubmit={handleCreateInterval} className="space-y-4">
                        {formError && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                                {formError}
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Interval Name</label>
                            <input
                                type="text"
                                value={intervalForm.intervalName}
                                onChange={(e) => setIntervalForm({ ...intervalForm, intervalName: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="e.g., Setiap 5 Menit"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Hours</label>
                                <input
                                    type="number"
                                    min="0"
                                    max="23"
                                    value={intervalForm.hours}
                                    onChange={(e) => setIntervalForm({ ...intervalForm, hours: parseInt(e.target.value) || 0 })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Minutes</label>
                                <input
                                    type="number"
                                    min="0"
                                    max="59"
                                    value={intervalForm.minutes}
                                    onChange={(e) => setIntervalForm({ ...intervalForm, minutes: parseInt(e.target.value) || 0 })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Seconds</label>
                                <input
                                    type="number"
                                    min="0"
                                    max="59"
                                    value={intervalForm.seconds}
                                    onChange={(e) => setIntervalForm({ ...intervalForm, seconds: parseInt(e.target.value) || 0 })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
                        </div>

                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <p className="text-sm text-blue-700">
                                <strong>Total:</strong> {(intervalForm.hours * 3600) + (intervalForm.minutes * 60) + intervalForm.seconds} seconds
                            </p>
                            <p className="text-xs text-blue-600 mt-1">
                                {intervalForm.hours > 0 && `${intervalForm.hours}h `}
                                {intervalForm.minutes > 0 && `${intervalForm.minutes}m `}
                                {intervalForm.seconds > 0 && `${intervalForm.seconds}s`}
                            </p>
                        </div>

                        <div className="flex gap-3 pt-4">
                            <button
                                type="button"
                                onClick={() => setShowIntervalModal(false)}
                                className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-all"
                            >
                                Batal
                            </button>
                            <button
                                type="submit"
                                disabled={formLoading}
                                className="flex-1 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-xl hover:shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {formLoading && <Loader2 size={16} className="animate-spin" />}
                                Create Interval
                            </button>
                        </div>
                    </form>
                </BottomSheetModal>
            </div>

            {/* CustomAlert for confirmations */}
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
