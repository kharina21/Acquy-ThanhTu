import { useState, useEffect } from 'react';
import {
    Users,
    UserPlus,
    Search,
    Edit,
    Trash2,
    Shield,
    Key,
    ChevronLeft,
    ChevronRight,
    X,
    CheckCircle2,
    XCircle,
    UserRoundPlus,
} from 'lucide-react';
import {
    getUsers,
    createUser,
    updateUser,
    deleteUser,
    assignRoles,
    removeRoles,
    resetUserPassword,
    getRoles,
} from '@/services/userService';
import { getInitials, formatDateTime } from '@/lib/utils';
import { useUserRole } from '@/hooks/useUserRole';

const UserManagementPage = () => {
    const { isAdmin, isOwner } = useUserRole();
    const [users, setUsers] = useState([]);
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
    });
    const [filters, setFilters] = useState({
        search: '',
        role: '',
    });
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showRoleModal, setShowRoleModal] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        email: '',
        firstName: '',
        lastName: '',
        phoneNumber: '',
        address: '',
        roles: [],
    });
    const [formErrors, setFormErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);

    // Fetch users
    const fetchUsers = async () => {
        try {
            setLoading(true);
            const params = {
                page: pagination.page,
                limit: pagination.limit,
                ...filters,
            };

            // Remove empty filters
            Object.keys(params).forEach((key) => {
                if (params[key] === '' || params[key] === null) {
                    delete params[key];
                }
            });

            const res = await getUsers(params);
            if (res.success) {
                setUsers(res.data.users);
                setPagination(res.data.pagination);
            }
        } catch (error) {
            console.error('Error fetching users:', error);
        } finally {
            setLoading(false);
        }
    };

    // Fetch roles
    const fetchRoles = async () => {
        try {
            const res = await getRoles();
            if (res.success) {
                setRoles(res.data.roles);
            }
        } catch (error) {
            console.error('Error fetching roles:', error);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, [pagination.page, filters]);

    useEffect(() => {
        fetchRoles();
    }, []);

    // Handle create user
    const handleCreateUser = async (e) => {
        e.preventDefault();
        setFormErrors({});
        setSubmitting(true);

        try {
            const res = await createUser(formData);
            if (res.success) {
                setShowCreateModal(false);
                resetForm();
                fetchUsers();
            }
        } catch (error) {
            if (error.response?.data?.errors) {
                const errors = {};
                error.response.data.errors.forEach((err) => {
                    const field = err.split(' ')[0].toLowerCase();
                    errors[field] = err;
                });
                setFormErrors(errors);
            } else {
                setFormErrors({ root: error.response?.data?.message || 'Có lỗi xảy ra' });
            }
        } finally {
            setSubmitting(false);
        }
    };

    // Handle update user
    const handleUpdateUser = async (e) => {
        e.preventDefault();
        setFormErrors({});
        setSubmitting(true);

        try {
            const res = await updateUser(selectedUser._id, formData);
            if (res.success) {
                setShowEditModal(false);
                resetForm();
                fetchUsers();
            }
        } catch (error) {
            if (error.response?.data?.errors) {
                const errors = {};
                error.response.data.errors.forEach((err) => {
                    const field = err.split(' ')[0].toLowerCase();
                    errors[field] = err;
                });
                setFormErrors(errors);
            } else {
                setFormErrors({ root: error.response?.data?.message || 'Có lỗi xảy ra' });
            }
        } finally {
            setSubmitting(false);
        }
    };

    // Handle delete user
    const handleDeleteUser = async (userId) => {
        if (!confirm('Bạn có chắc chắn muốn xóa user này?')) return;

        try {
            const res = await deleteUser(userId);
            if (res.success) {
                fetchUsers();
            }
        } catch (error) {
            alert(error.response?.data?.message || 'Có lỗi xảy ra');
        }
    };

    // Handle assign roles
    const handleAssignRoles = async (e) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            const res = await assignRoles(selectedUser._id, formData.roles);
            if (res.success) {
                setShowRoleModal(false);
                resetForm();
                fetchUsers();
            }
        } catch (error) {
            alert(error.response?.data?.message || 'Có lỗi xảy ra');
        } finally {
            setSubmitting(false);
        }
    };

    // Handle remove roles
    const handleRemoveRole = async (userId, roleName) => {
        if (!confirm(`Bạn có chắc chắn muốn xóa role "${roleName}" khỏi user này?`)) return;

        try {
            const res = await removeRoles(userId, [roleName]);
            if (res.success) {
                fetchUsers();
            }
        } catch (error) {
            alert(error.response?.data?.message || 'Có lỗi xảy ra');
        }
    };

    // Handle reset password
    const handleResetPassword = async (e) => {
        e.preventDefault();
        setFormErrors({});
        setSubmitting(true);

        try {
            const res = await resetUserPassword(selectedUser._id, formData.password);
            if (res.success) {
                setShowPasswordModal(false);
                resetForm();
                alert('Đặt lại mật khẩu thành công');
            }
        } catch (error) {
            setFormErrors({ password: error.response?.data?.message || 'Có lỗi xảy ra' });
        } finally {
            setSubmitting(false);
        }
    };

    // Reset form
    const resetForm = () => {
        setFormData({
            username: '',
            password: '',
            email: '',
            firstName: '',
            lastName: '',
            phoneNumber: '',
            address: '',
            roles: [],
        });
        setFormErrors({});
        setSelectedUser(null);
    };

    // Open edit modal
    const openEditModal = (user) => {
        setSelectedUser(user);
        setFormData({
            username: user.username,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            phoneNumber: user.phoneNumber || '',
            address: user.address || '',
            roles: user.roles?.map((r) => r.name) || [],
        });
        setShowEditModal(true);
    };

    // Open role modal
    const openRoleModal = (user) => {
        setSelectedUser(user);
        setFormData({
            roles: user.roles?.map((r) => r.name) || [],
        });
        setShowRoleModal(true);
    };

    // Open password modal
    const openPasswordModal = (user) => {
        setSelectedUser(user);
        setFormData({ password: '' });
        setShowPasswordModal(true);
    };

    // Get role badge color
    const getRoleBadgeColor = (roleName) => {
        const colors = {
            admin: 'badge-error',
            owner: 'badge-warning',
            manager: 'badge-info',
            seller: 'badge-success',
            staff: 'badge-primary',
            agency: 'badge-secondary',
            user: 'badge-neutral',
        };
        return colors[roleName] || 'badge-neutral';
    };

    return (
        <div className="px-6 py-8 min-h-screen">
            <div className="">
                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-base-content mb-2">Quản lý người dùng</h1>
                        <p className="text-base-content/60">Quản lý tài khoản và phân quyền người dùng</p>
                    </div>
                    <button
                        className="btn btn-primary gap-2"
                        onClick={() => {
                            resetForm();
                            setShowCreateModal(true);
                        }}
                    >
                        <UserRoundPlus className="w-5 h-5" />
                        Tạo người dùng
                    </button>
                </div>

                {/* Filters */}
                <div className="bg-base-100 rounded-lg shadow-lg p-6 mb-6">
                    <div className="flex items-center gap-4">
                        <div className="min-w-xl">
                            <label className="label">
                                <span className="label-text font-semibold">Tìm kiếm</span>
                            </label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-base-content/40 z-40" />
                                <input
                                    type="text"
                                    placeholder="Tìm theo tên, email, username..."
                                    className="input w-full pl-10 focus:outline-none"
                                    value={filters.search}
                                    onChange={(e) => {
                                        setFilters({ ...filters, search: e.target.value });
                                        setPagination({ ...pagination, page: 1 });
                                    }}
                                />
                            </div>
                        </div>
                        <div className="w-28">
                            <label className="label">
                                <span className="label-text font-semibold">Lọc theo role</span>
                            </label>
                            <select
                                className="select w-full  focus:ring-0 outline-none"
                                value={filters.role}
                                onChange={(e) => {
                                    setFilters({ ...filters, role: e.target.value });
                                    setPagination({ ...pagination, page: 1 });
                                }}
                            >
                                <option value="">Tất cả</option>
                                {roles.map((role) => (
                                    <option key={role._id} value={role.name}>
                                        {role.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        {(filters.search || filters.role) && (
                            <button
                                className="btn btn-ghost btn-sm mt-8"
                                onClick={() => {
                                    setFilters({ search: '', role: '' });
                                    setPagination({ ...pagination, page: 1 });
                                }}
                            >
                                <X className="w-4 h-4" />
                                Xóa bộ lọc
                            </button>
                        )}
                    </div>
                </div>

                {/* Users Table */}
                <div className="bg-base-100 rounded-lg shadow-lg overflow-hidden">
                    {loading ? (
                        <div className="flex justify-center items-center p-8">
                            <span className="loading loading-spinner loading-lg"></span>
                        </div>
                    ) : users.length === 0 ? (
                        <div className="p-8 text-center">
                            <Users className="w-16 h-16 mx-auto mb-4 text-base-content/30" />
                            <p className="text-base-content/60">Không có người dùng nào</p>
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <table className="table table-zebra w-full">
                                    <thead>
                                        <tr>
                                            <th>Người dùng</th>
                                            <th>Email</th>
                                            <th>Số điện thoại</th>
                                            <th>Roles</th>
                                            <th>Trạng thái</th>
                                            <th>Ngày tạo</th>
                                            <th className="text-center">Thao tác</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {users.map((user) => (
                                            <tr key={user._id}>
                                                <td>
                                                    <div className="flex items-center gap-3">
                                                        <div>
                                                            <div className="font-semibold">
                                                                {user.firstName} {user.lastName}
                                                            </div>
                                                            <div className="text-sm text-base-content/60">@{user.username}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>{user.email}</td>
                                                <td>{user.phoneNumber || '-'}</td>
                                                <td>
                                                    <div className="flex flex-wrap gap-1">
                                                        {user.roles?.map((role) => (
                                                            <div
                                                                key={role._id}
                                                                className="flex items-center gap-1"
                                                            >
                                                                <span className={`badge badge-sm ${getRoleBadgeColor(role.name)}`}>
                                                                    {role.name}
                                                                </span>
                                                                <button
                                                                    className="btn btn-ghost btn-xs p-0 h-4 w-4 min-h-0"
                                                                    onClick={() => handleRemoveRole(user._id, role.name)}
                                                                    title={`Xóa role ${role.name}`}
                                                                >
                                                                    <X className="w-3 h-3" />
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </td>
                                                <td>
                                                    {user.isVerified ? (
                                                        <span className="badge badge-success badge-sm gap-1">
                                                            <CheckCircle2 className="w-3 h-3" />
                                                            Đã xác thực
                                                        </span>
                                                    ) : (
                                                        <span className="badge badge-warning badge-sm gap-1">
                                                            <XCircle className="w-3 h-3" />
                                                            Chưa xác thực
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="text-sm">{formatDateTime(user.createdAt)}</td>
                                                <td>
                                                    <div className="flex gap-2 justify-center">
                                                        <button
                                                            className="btn btn-ghost btn-sm "
                                                            onClick={() => openEditModal(user)}
                                                            title="Chỉnh sửa"
                                                        >
                                                            <Edit className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            className="btn btn-ghost btn-sm"
                                                            onClick={() => openRoleModal(user)}
                                                            title="Quản lý roles"
                                                        >
                                                            <Shield className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            className="btn btn-ghost btn-sm"
                                                            onClick={() => openPasswordModal(user)}
                                                            title="Đặt lại mật khẩu"
                                                        >
                                                            <Key className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            className="btn btn-ghost btn-sm text-error"
                                                            onClick={() => handleDeleteUser(user._id)}
                                                            title="Xóa"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            <div className="flex justify-between items-center p-4 border-t border-base-300">
                                <div>
                                    <p className="text-sm text-base-content/60">
                                        Hiển thị {users.length} / {pagination.total} người dùng
                                    </p>
                                </div>
                                <div className="join">
                                    <button
                                        className="join-item btn btn-sm"
                                        disabled={pagination.page === 1}
                                        onClick={() =>
                                            setPagination({ ...pagination, page: pagination.page - 1 })
                                        }
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                    </button>
                                    <button className="join-item btn btn-sm">
                                        Trang {pagination.page} / {pagination.totalPages}
                                    </button>
                                    <button
                                        className="join-item btn btn-sm"
                                        disabled={pagination.page === pagination.totalPages}
                                        onClick={() =>
                                            setPagination({ ...pagination, page: pagination.page + 1 })
                                        }
                                    >
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Create User Modal */}
            {showCreateModal && (
                <dialog className="modal modal-open">
                    <div className="modal-box max-w-2xl">
                        <h3 className="font-bold text-lg mb-4">Tạo người dùng mới</h3>
                        <form onSubmit={handleCreateUser} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="label">
                                        <span className="label-text font-semibold">Username *</span>
                                    </label>
                                    <input
                                        type="text"
                                        className={`input input-bordered w-full ${formErrors.username ? 'input-error' : ''}`}
                                        value={formData.username}
                                        onChange={(e) =>
                                            setFormData({ ...formData, username: e.target.value })
                                        }
                                        required
                                    />
                                    {formErrors.username && (
                                        <label className="label">
                                            <span className="label-text-alt text-error">{formErrors.username}</span>
                                        </label>
                                    )}
                                </div>
                                <div>
                                    <label className="label">
                                        <span className="label-text font-semibold">Mật khẩu *</span>
                                    </label>
                                    <input
                                        type="password"
                                        className={`input input-bordered w-full ${formErrors.password ? 'input-error' : ''}`}
                                        value={formData.password}
                                        onChange={(e) =>
                                            setFormData({ ...formData, password: e.target.value })
                                        }
                                        required
                                    />
                                    {formErrors.password && (
                                        <label className="label">
                                            <span className="label-text-alt text-error">{formErrors.password}</span>
                                        </label>
                                    )}
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="label">
                                        <span className="label-text font-semibold">Họ *</span>
                                    </label>
                                    <input
                                        type="text"
                                        className={`input input-bordered w-full ${formErrors.firstName ? 'input-error' : ''}`}
                                        value={formData.firstName}
                                        onChange={(e) =>
                                            setFormData({ ...formData, firstName: e.target.value })
                                        }
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="label">
                                        <span className="label-text font-semibold">Tên *</span>
                                    </label>
                                    <input
                                        type="text"
                                        className={`input input-bordered w-full ${formErrors.lastName ? 'input-error' : ''}`}
                                        value={formData.lastName}
                                        onChange={(e) =>
                                            setFormData({ ...formData, lastName: e.target.value })
                                        }
                                        required
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="label">
                                    <span className="label-text font-semibold">Email *</span>
                                </label>
                                <input
                                    type="email"
                                    className={`input input-bordered w-full ${formErrors.email ? 'input-error' : ''}`}
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="label">
                                        <span className="label-text font-semibold">Số điện thoại</span>
                                    </label>
                                    <input
                                        type="text"
                                        className="input input-bordered w-full"
                                        value={formData.phoneNumber}
                                        onChange={(e) =>
                                            setFormData({ ...formData, phoneNumber: e.target.value })
                                        }
                                    />
                                </div>
                                <div>
                                    <label className="label">
                                        <span className="label-text font-semibold">Roles</span>
                                    </label>
                                    <div className="flex flex-wrap gap-2">
                                        {roles.map((role) => (
                                            <label key={role._id} className="label cursor-pointer gap-2">
                                                <input
                                                    type="checkbox"
                                                    className="checkbox checkbox-sm"
                                                    checked={formData.roles.includes(role.name)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setFormData({
                                                                ...formData,
                                                                roles: [...formData.roles, role.name],
                                                            });
                                                        } else {
                                                            setFormData({
                                                                ...formData,
                                                                roles: formData.roles.filter((r) => r !== role.name),
                                                            });
                                                        }
                                                    }}
                                                />
                                                <span className="label-text">{role.name}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div>
                                <label className="label">
                                    <span className="label-text font-semibold">Địa chỉ</span>
                                </label>
                                <textarea
                                    className="textarea textarea-bordered w-full"
                                    value={formData.address}
                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                />
                            </div>
                            {formErrors.root && (
                                <div className="alert alert-error">
                                    <span>{formErrors.root}</span>
                                </div>
                            )}
                            <div className="modal-action">
                                <button
                                    type="button"
                                    className="btn btn-ghost"
                                    onClick={() => {
                                        setShowCreateModal(false);
                                        resetForm();
                                    }}
                                >
                                    Hủy
                                </button>
                                <button type="submit" className="btn btn-primary" disabled={submitting}>
                                    {submitting ? (
                                        <>
                                            <span className="loading loading-spinner loading-sm"></span>
                                            Đang tạo...
                                        </>
                                    ) : (
                                        'Tạo người dùng'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                    <form method="dialog" className="modal-backdrop">
                        <button onClick={() => resetForm()}>close</button>
                    </form>
                </dialog>
            )}

            {/* Edit User Modal */}
            {showEditModal && selectedUser && (
                <dialog className="modal modal-open">
                    <div className="modal-box max-w-2xl">
                        <h3 className="font-bold text-lg mb-4">Chỉnh sửa người dùng</h3>
                        <form onSubmit={handleUpdateUser} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="label">
                                        <span className="label-text font-semibold">Họ *</span>
                                    </label>
                                    <input
                                        type="text"
                                        className="input input-bordered w-full"
                                        value={formData.firstName}
                                        onChange={(e) =>
                                            setFormData({ ...formData, firstName: e.target.value })
                                        }
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="label">
                                        <span className="label-text font-semibold">Tên *</span>
                                    </label>
                                    <input
                                        type="text"
                                        className="input input-bordered w-full"
                                        value={formData.lastName}
                                        onChange={(e) =>
                                            setFormData({ ...formData, lastName: e.target.value })
                                        }
                                        required
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="label">
                                    <span className="label-text font-semibold">Email *</span>
                                </label>
                                <input
                                    type="email"
                                    className="input input-bordered w-full"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="label">
                                        <span className="label-text font-semibold">Số điện thoại</span>
                                    </label>
                                    <input
                                        type="text"
                                        className="input input-bordered w-full"
                                        value={formData.phoneNumber}
                                        onChange={(e) =>
                                            setFormData({ ...formData, phoneNumber: e.target.value })
                                        }
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="label">
                                    <span className="label-text font-semibold">Địa chỉ</span>
                                </label>
                                <textarea
                                    className="textarea textarea-bordered w-full"
                                    value={formData.address}
                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                />
                            </div>
                            {formErrors.root && (
                                <div className="alert alert-error">
                                    <span>{formErrors.root}</span>
                                </div>
                            )}
                            <div className="modal-action">
                                <button
                                    type="button"
                                    className="btn btn-ghost"
                                    onClick={() => {
                                        setShowEditModal(false);
                                        resetForm();
                                    }}
                                >
                                    Hủy
                                </button>
                                <button type="submit" className="btn btn-primary" disabled={submitting}>
                                    {submitting ? (
                                        <>
                                            <span className="loading loading-spinner loading-sm"></span>
                                            Đang cập nhật...
                                        </>
                                    ) : (
                                        'Cập nhật'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                    <form method="dialog" className="modal-backdrop">
                        <button onClick={() => resetForm()}>close</button>
                    </form>
                </dialog>
            )}

            {/* Role Management Modal */}
            {showRoleModal && selectedUser && (
                <dialog className="modal modal-open">
                    <div className="modal-box">
                        <h3 className="font-bold text-lg mb-4">Quản lý roles cho {selectedUser.username}</h3>
                        <form onSubmit={handleAssignRoles} className="space-y-4">
                            <div>
                                <label className="label">
                                    <span className="label-text font-semibold">Roles</span>
                                </label>
                                <div className="flex flex-wrap gap-3 p-4 border border-base-300 rounded-lg max-h-64 overflow-y-auto">
                                    {roles.map((role) => (
                                        <label key={role._id} className="label cursor-pointer gap-2">
                                            <input
                                                type="checkbox"
                                                className="checkbox"
                                                checked={formData.roles.includes(role.name)}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setFormData({
                                                            ...formData,
                                                            roles: [...formData.roles, role.name],
                                                        });
                                                    } else {
                                                        setFormData({
                                                            ...formData,
                                                            roles: formData.roles.filter((r) => r !== role.name),
                                                        });
                                                    }
                                                }}
                                            />
                                            <div>
                                                <span className="label-text font-semibold">{role.name}</span>
                                                {role.description && (
                                                    <div className="text-xs text-base-content/60">{role.description}</div>
                                                )}
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>
                            <div className="modal-action">
                                <button
                                    type="button"
                                    className="btn btn-ghost"
                                    onClick={() => {
                                        setShowRoleModal(false);
                                        resetForm();
                                    }}
                                >
                                    Hủy
                                </button>
                                <button type="submit" className="btn btn-primary" disabled={submitting}>
                                    {submitting ? (
                                        <>
                                            <span className="loading loading-spinner loading-sm"></span>
                                            Đang cập nhật...
                                        </>
                                    ) : (
                                        'Cập nhật roles'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                    <form method="dialog" className="modal-backdrop">
                        <button onClick={() => resetForm()}>close</button>
                    </form>
                </dialog>
            )}

            {/* Reset Password Modal */}
            {showPasswordModal && selectedUser && (
                <dialog className="modal modal-open">
                    <div className="modal-box">
                        <h3 className="font-bold text-lg mb-4">Đặt lại mật khẩu cho {selectedUser.username}</h3>
                        <form onSubmit={handleResetPassword} className="space-y-4">
                            <div>
                                <label className="label">
                                    <span className="label-text font-semibold">Mật khẩu mới *</span>
                                </label>
                                <input
                                    type="password"
                                    className={`input input-bordered w-full ${formErrors.password ? 'input-error' : ''}`}
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    required
                                    minLength={6}
                                />
                                {formErrors.password && (
                                    <label className="label">
                                        <span className="label-text-alt text-error">{formErrors.password}</span>
                                    </label>
                                )}
                            </div>
                            <div className="modal-action">
                                <button
                                    type="button"
                                    className="btn btn-ghost"
                                    onClick={() => {
                                        setShowPasswordModal(false);
                                        resetForm();
                                    }}
                                >
                                    Hủy
                                </button>
                                <button type="submit" className="btn btn-primary" disabled={submitting}>
                                    {submitting ? (
                                        <>
                                            <span className="loading loading-spinner loading-sm"></span>
                                            Đang đặt lại...
                                        </>
                                    ) : (
                                        'Đặt lại mật khẩu'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                    <form method="dialog" className="modal-backdrop">
                        <button onClick={() => resetForm()}>close</button>
                    </form>
                </dialog>
            )}
        </div>
    );
};

export default UserManagementPage;

