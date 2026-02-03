import { formatDateTime } from '@/lib/utils';
import { CheckCircle2, ChevronLeft, ChevronRight, Edit, Key, Shield, Trash2, Users, X, XCircle } from 'lucide-react';
import {
    deleteUser, getUsers, removeRoles, updateUser,
    assignRoles, createUser,
    resetUserPassword,
} from '@/services/userService';
import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import ConfirmationModal from '@/components/common/ConfirmationModal';
import { TableSkeleton } from '@/components/common/SkeletonLoader';

const UserTable = ({
    setSelectedUser,
    selectedUser,
    formData,
    setFormData,
    formErrors,
    setFormErrors,
    submitting,
    setSubmitting,
    resetForm,
    roles,
    filters,
    pagination,
    setPagination,
    refreshKey }) => {

    const [showEditModal, setShowEditModal] = useState(false);
    const [showRoleModal, setShowRoleModal] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [users, setUsers] = useState([]);





    const [loading, setLoading] = useState(true);

    // Confirmation modal states
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: null,
        onCancel: null,
        variant: 'warning',
    });

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



    // Handle assign roles
    const handleAssignRoles = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const currentRoles = selectedUser.roles?.map((r) => r.name) || [];
            const newRoles = formData.roles || [];
            const rolesToAdd = newRoles.filter((role) => !currentRoles.includes(role));
            const rolesToRemove = currentRoles.filter((role) => !newRoles.includes(role));

            if (rolesToRemove.length > 0) {
                const removeRes = await removeRoles(selectedUser._id, rolesToRemove);
                if (!removeRes.success) {
                    toast.error(removeRes.message || 'Có lỗi khi xóa roles');
                    setSubmitting(false);
                    return;
                }
            }
            if (rolesToAdd.length > 0) {
                const addRes = await assignRoles(selectedUser._id, rolesToAdd);
                if (!addRes.success) {
                    toast.error(addRes.message || 'Có lỗi khi thêm roles');
                    setSubmitting(false);
                    return;
                }
            }

            // If no changes, still refresh
            setShowRoleModal(false);
            resetForm();
            toast.success('Cập nhật roles thành công');
            fetchUsers();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Có lỗi xảy ra');
        } finally {
            setSubmitting(false);
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
                toast.success('Đặt lại mật khẩu thành công');
            }
        } catch (error) {
            setFormErrors({ password: error.response?.data?.message || 'Có lỗi xảy ra' });
            toast.error(error.response?.data?.message || 'Có lỗi xảy ra');
        } finally {
            setSubmitting(false);
        }
    };
    // Handle delete user
    const handleDeleteUser = (userId) => {
        const user = users.find(u => u._id === userId);
        setConfirmModal({
            isOpen: true,
            title: 'Xóa người dùng',
            message: `Bạn có chắc chắn muốn xóa người dùng "${user?.firstName} ${user?.lastName}" (${user?.username})? Hành động này không thể hoàn tác.`,
            onConfirm: async () => {
                try {
                    setLoading(true);
                    const res = await deleteUser(userId);
                    if (res.success) {
                        toast.success('Xóa người dùng thành công');
                        fetchUsers();
                    }
                } catch (error) {
                    toast.error(error.response?.data?.message || 'Có lỗi xảy ra');
                } finally {
                    setLoading(false);
                }
            },
            variant: 'danger',
        });
    };
    // Handle remove roles
    const handleRemoveRole = (userId, roleName) => {
        const user = users.find(u => u._id === userId);
        setConfirmModal({
            isOpen: true,
            title: 'Xóa role',
            message: `Bạn có chắc chắn muốn xóa role "${roleName}" khỏi người dùng "${user?.firstName} ${user?.lastName}"?`,
            onConfirm: async () => {
                try {
                    setLoading(true);
                    const res = await removeRoles(userId, [roleName]);
                    if (res.success) {
                        toast.success(`Đã xóa role "${roleName}" thành công`);
                        fetchUsers();
                    }
                } catch (error) {
                    toast.error(error.response?.data?.message || 'Có lỗi xảy ra');
                } finally {
                    setLoading(false);
                }
            },
            variant: 'warning',
        });
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
            isVerified: user.isVerified || false,
            status: user.status || 'active',
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

    // Get role description in Vietnamese
    const getRoleDescription = (roleName, defaultDescription) => {
        const descriptions = {
            admin: 'Quản trị viên - Toàn quyền truy cập và quản lý hệ thống',
            staff: 'Nhân viên - Quyền hạn cơ bản để thực hiện các tác vụ hàng ngày',
            manager: 'Quản lý - Quyền quản lý sản phẩm, đơn hàng và nhân viên',
            user: 'Người dùng thông thường',
        };
        return descriptions[roleName] || defaultDescription || '';
    };

    // Get role badge color
    const getRoleBadgeColor = (roleName) => {
        const colors = {
            admin: 'badge-error',
            owner: 'badge-warning',
            manager: 'badge-info',
            staff: 'badge-primary',
            user: 'badge-neutral',
        };
        return colors[roleName] || 'badge-neutral';
    };

    // Get status badge color
    const getStatusBadgeColor = (status) => {
        const colors = {
            active: 'badge-success',
            inactive: 'badge-neutral',
            banned: 'badge-error',
            suspended: 'badge-warning',
        };
        return colors[status] || 'badge-neutral';
    };

    // Get status label
    const getStatusLabel = (status) => {
        const labels = {
            active: 'Hoạt động',
            inactive: 'Không hoạt động',
            banned: 'Bị cấm',
            suspended: 'Tạm ngưng',
        };
        return labels[status] || status;
    };

    // Handle update status
    const handleUpdateStatus = (userId, newStatus, currentStatus, selectElement) => {
        const user = users.find(u => u._id === userId);
        setConfirmModal({
            isOpen: true,
            title: 'Thay đổi trạng thái',
            message: `Bạn có chắc chắn muốn thay đổi trạng thái của "${user?.firstName} ${user?.lastName}" từ "${getStatusLabel(currentStatus)}" sang "${getStatusLabel(newStatus)}"?`,
            onConfirm: async () => {
                try {
                    setLoading(true);
                    const res = await updateUser(userId, { status: newStatus });
                    if (res.success) {
                        toast.success(`Đã cập nhật trạng thái thành "${getStatusLabel(newStatus)}"`);
                        fetchUsers();
                    } else {
                        // Reset select if failed
                        if (selectElement) selectElement.value = currentStatus;
                    }
                } catch (error) {
                    toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi cập nhật trạng thái');
                    // Reset select on error
                    if (selectElement) selectElement.value = currentStatus;
                } finally {
                    setLoading(false);
                }
            },
            onCancel: () => {
                // Reset select if cancelled
                if (selectElement) selectElement.value = currentStatus;
            },
            variant: 'warning',
        });
    };

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
    useEffect(() => {
        fetchUsers();
    }, [pagination.page, filters, refreshKey]);


    return (
        <div className="bg-base-100 rounded-lg shadow-lg">
            {loading ? (
                <div className="p-4">
                    <TableSkeleton rows={pagination.limit} cols={8} />
                </div>
            ) : users.length === 0 ? (
                <div className="p-8 text-center">
                    <Users className="w-16 h-16 mx-auto mb-4 text-base-content/30" />
                    <p className="text-base-content/60">Không có người dùng nào</p>
                </div>
            ) : (
                <>
                    <div className="overflow-x-auto overflow-y-auto max-h-[700px]">
                        <table className="table">
                            <thead className='bg-blue-100 sticky top-0 z-20'>
                                <tr>
                                    <th className="font-medium text-neutral text-xs">Người dùng</th>
                                    <th className="font-medium text-neutral text-xs">Email</th>
                                    <th className="font-medium text-neutral text-xs">Số điện thoại</th>
                                    <th className="font-medium text-neutral text-xs">Roles</th>
                                    <th className="font-medium text-neutral text-xs">Xác thực</th>
                                    <th className="font-medium text-neutral text-xs">Trạng thái</th>
                                    <th className="font-medium text-neutral text-xs">Ngày tạo</th>
                                    <th className="text-center font-medium text-neutral text-xs">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody className='text-xs'>
                                {users.map((user) => (
                                    <tr key={user._id} className="hover:bg-base-200/60 transition-colors font-light">
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
                                                            className="btn btn-ghost btn-xs p-0 h-4 w-4 min-h-0 focus:outline-none focus:ring-2 focus:ring-error focus:ring-offset-1"
                                                            onClick={() => handleRemoveRole(user._id, role.name)}
                                                            title={`Xóa role ${role.name}`}
                                                            aria-label={`Xóa role ${role.name} khỏi ${user.firstName} ${user.lastName}`}
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
                                        <td>
                                            <select
                                                className={`select select-sm select-bordered w-full max-w-xs ${getStatusBadgeColor(user.status || 'active')} focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1`}
                                                value={user.status || 'active'}
                                                onChange={(e) => {
                                                    const newStatus = e.target.value;
                                                    const currentStatus = user.status || 'active';
                                                    if (newStatus !== currentStatus) {
                                                        const selectElement = e.target;
                                                        handleUpdateStatus(user._id, newStatus, currentStatus, selectElement);
                                                        // Reset immediately - will be updated after confirmation
                                                        selectElement.value = currentStatus;
                                                    }
                                                }}
                                                aria-label={`Thay đổi trạng thái của ${user.firstName} ${user.lastName}`}
                                            >
                                                <option value="active">Hoạt động</option>
                                                <option value="inactive">Không hoạt động</option>
                                                <option value="banned">Bị cấm</option>
                                                <option value="suspended">Tạm ngưng</option>
                                            </select>
                                        </td>
                                        <td className="text-sm">{formatDateTime(user.createdAt)}</td>
                                        <td>
                                            <div className="flex gap-2 justify-center">
                                                <button
                                                    className="btn btn-ghost btn-sm focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
                                                    onClick={() => openEditModal(user)}
                                                    title="Chỉnh sửa"
                                                    aria-label={`Chỉnh sửa người dùng ${user.firstName} ${user.lastName}`}
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                                <button
                                                    className="btn btn-ghost btn-sm focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
                                                    onClick={() => openRoleModal(user)}
                                                    title="Quản lý roles"
                                                    aria-label={`Quản lý roles của ${user.firstName} ${user.lastName}`}
                                                >
                                                    <Shield className="w-4 h-4" />
                                                </button>
                                                <button
                                                    className="btn btn-ghost btn-sm focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
                                                    onClick={() => openPasswordModal(user)}
                                                    title="Đặt lại mật khẩu"
                                                    aria-label={`Đặt lại mật khẩu cho ${user.firstName} ${user.lastName}`}
                                                >
                                                    <Key className="w-4 h-4" />
                                                </button>
                                                <button
                                                    className="btn btn-ghost btn-sm text-error focus:outline-none focus:ring-2 focus:ring-error focus:ring-offset-1"
                                                    onClick={() => handleDeleteUser(user._id)}
                                                    title="Xóa"
                                                    aria-label={`Xóa người dùng ${user.firstName} ${user.lastName}`}
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
                    <div className="flex justify-between items-center p-4 border-t border-base-200">
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
                                                {getRoleDescription(role.name, role.description) && (
                                                    <div className="text-xs text-base-content/60">{getRoleDescription(role.name, role.description)}</div>
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
            {/* Edit User Modal */}
            {showEditModal && selectedUser && (
                <dialog className="modal modal-open">
                    <div className="modal-box max-w-2xl">
                        <h3 className="font-bold text-lg mb-4">Chỉnh sửa người dùng</h3>
                        <form onSubmit={handleUpdateUser} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="label">
                                        <span className="label-text font-semibold">Họ <span className='text-error'>*</span></span>
                                    </label>
                                    <input
                                        type="text"
                                        className="input outline-none w-full"
                                        value={formData.firstName}
                                        onChange={(e) =>
                                            setFormData({ ...formData, firstName: e.target.value })
                                        }
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="label">
                                        <span className="label-text font-semibold">Tên <span className='text-error'>*</span></span>
                                    </label>
                                    <input
                                        type="text"
                                        className="input outline-none w-full"
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
                                    <span className="label-text font-semibold">Email <span className='text-error'>*</span></span>
                                </label>
                                <input
                                    type="email"
                                    className="input outline-none w-full"
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
                                        className="input outline-none w-full"
                                        value={formData.phoneNumber}
                                        onChange={(e) =>
                                            setFormData({ ...formData, phoneNumber: e.target.value })
                                        }
                                    />
                                </div>
                                <div>
                                    <label className="label">
                                        <span className="label-text font-semibold">Trạng thái <span className='text-error'>*</span></span>
                                    </label>
                                    <select
                                        className={`select outline-none ${getStatusBadgeColor(formData.status || 'active')}`}
                                        value={formData.status || 'active'}
                                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                    >
                                        <option value="active">Hoạt động</option>
                                        <option value="inactive">Không hoạt động</option>
                                        <option value="banned">Bị cấm</option>
                                        <option value="suspended">Tạm ngưng</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="label">
                                    <span className="label-text font-semibold">Địa chỉ</span>
                                </label>
                                <textarea
                                    className="textarea w-full outline-none"
                                    value={formData.address}
                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="label cursor-pointer mb-2">
                                        <span className="label-text font-semibold">Xác thực email</span>
                                        <input
                                            type="checkbox"
                                            className="checkbox checkbox-success checkbox-xs"
                                            checked={formData.isVerified || false}
                                            onChange={(e) => setFormData({ ...formData, isVerified: e.target.checked })}
                                        />
                                    </label>
                                </div>

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
                        <button type="button" onClick={() => resetForm()} aria-label="Đóng">close</button>
                    </form>
                </dialog>
            )}

            {/* Confirmation Modal */}
            <ConfirmationModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                onConfirm={confirmModal.onConfirm || (() => { })}
                onCancel={confirmModal.onCancel}
                title={confirmModal.title}
                message={confirmModal.message}
                variant={confirmModal.variant}
            />
        </div>
    )
}

export default UserTable