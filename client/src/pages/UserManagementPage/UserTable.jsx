import { formatDateTime } from '@/lib/utils';
import { getAssignableRoleOptionsForUser, ROLE_LABELS } from '@/config/roleConfig';
import { CheckCircle2, ChevronLeft, ChevronRight, Edit, Key, Shield, Trash2, Users, XCircle } from 'lucide-react';
import {
    deleteUser, getUsers, updateUser,
    assignRoles,
    resetUserPassword,
} from '@/services/userService';
import { getLocations } from '@/services/locationService';
import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import ConfirmationModal from '@/components/common/ConfirmationModal';
import { TableSkeleton } from '@/components/common/SkeletonLoader';
import { useBranchStore } from '@/stores/useBranchStore';

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
    const [locations, setLocations] = useState([]);
    const [selectedLocationId, setSelectedLocationId] = useState('');
    const { fetchLocations } = useBranchStore();





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



    // Handle assign role (mỗi user chỉ 1 vai trò)
    const handleAssignRoles = async (e) => {
        e.preventDefault();
        const newRole = formData.roles?.[0];
        if (!newRole) {
            toast.error('Vui lòng chọn một vai trò');
            return;
        }

        // Validate branch selection for seller/manager roles
        const rolesRequiringBranch = ['seller', 'manager'];
        if (rolesRequiringBranch.includes(newRole) && !selectedLocationId) {
            toast.error('Vui lòng chọn cơ sở cho nhân viên');
            return;
        }

        setSubmitting(true);
        try {
            const payload = { roles: [newRole] };
            // Only include locationId for seller/manager roles
            if (rolesRequiringBranch.includes(newRole)) {
                payload.locationId = selectedLocationId;
            }
            const addRes = await assignRoles(selectedUser._id, [newRole], payload.locationId);
            if (!addRes.success) {
                toast.error(addRes.message || 'Cập nhật vai trò thất bại');
                setSubmitting(false);
                return;
            }
            setShowRoleModal(false);
            resetForm();
            setSelectedLocationId('');
            toast.success('Cập nhật vai trò thành công');
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
    // Open edit modal
    const openEditModal = (user) => {
        if (isAdminUser(user)) {
            toast.error('Không được chỉnh sửa thông tin tài khoản quản trị viên');
            return;
        }
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

    // Open role modal (mỗi user 1 vai trò)
    const openRoleModal = (user) => {
        if (isAdminUser(user)) {
            toast.error('Không được sửa đổi quyền tài khoản quản trị viên');
            return;
        }
        setSelectedUser(user);
        setSelectedLocationId(''); // Reset location when opening modal
        const allowedOptions = getAssignableRoleOptionsForUser(roles, user);
        const currentRole = user.roles?.[0]?.name;
        const isValidRole = allowedOptions.some((r) => r.name === currentRole);
        setFormData({
            ...formData,
            roles: isValidRole && currentRole ? [currentRole] : [],
        });
        setShowRoleModal(true);
    };

    // Open password modal
    const openPasswordModal = (user) => {
        if (isAdminUser(user)) {
            toast.error('Không được đặt lại mật khẩu tài khoản quản trị viên');
            return;
        }
        setSelectedUser(user);
        setFormData({ password: '' });
        setShowPasswordModal(true);
    };

    // Get role description in Vietnamese
    const getRoleDescription = (roleName, defaultDescription) => {
        const descriptions = {
            admin: 'Quản trị viên - Toàn quyền hệ thống',
            manager: 'Quản lý chi nhánh',
            seller: 'Nhân viên bán hàng',
            warehouse_manager: 'Quản lý kho - Kiểm kho, nhập/xuất, tồn',
            user: 'Người dùng thường',
            customer: 'Khách hàng / người dùng web',
        };
        return descriptions[roleName] || defaultDescription || '';
    };

    // User có vai trò admin thì không được thao tác trong UI
    const isAdminUser = (user) => user?.roles?.some((r) => r.name === 'admin');

    // Get role badge color
    const getRoleBadgeColor = (roleName) => {
        const colors = {
            admin: 'badge-error',
        };
        return colors[roleName] || 'badge-primary';
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
        if (isAdminUser(user)) {
            toast.error('Không được thay đổi trạng thái tài khoản quản trị viên');
            if (selectElement) selectElement.value = currentStatus;
            return;
        }
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

    // Fetch locations for branch selection
    const fetchLocationsData = async () => {
        try {
            const res = await getLocations();
            if (res.success && res.data?.locations) {
                setLocations(res.data.locations.filter((l) => l.isActive !== false));
            }
        } catch (error) {
            console.error('Error fetching locations:', error);
        }
    };

    useEffect(() => {
        fetchLocationsData();
    }, []);


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
                                                {(user.roles?.length ? [user.roles[0]] : user.roles || []).map((role) => (
                                                    <span key={role._id} className={`badge badge-sm ${getRoleBadgeColor(role.name)}`}>
                                                        {ROLE_LABELS[role.name] || role.name}
                                                    </span>
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
                                                disabled={isAdminUser(user)}
                                                onChange={(e) => {
                                                    const newStatus = e.target.value;
                                                    const currentStatus = user.status || 'active';
                                                    if (newStatus !== currentStatus) {
                                                        const selectElement = e.target;
                                                        handleUpdateStatus(user._id, newStatus, currentStatus, selectElement);
                                                        // Reset immediately - sẽ được cập nhật sau khi xác nhận
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
                                            {isAdminUser(user) ? (
                                                <div className="text-[11px] text-base-content/60 italic text-center leading-snug">
                                                    Tài khoản quản trị viên
                                                    <br />
                                                    Không cho phép thao tác
                                                </div>
                                            ) : (
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
                                                        title="Đổi vai trò"
                                                        aria-label={`Đổi vai trò của ${user.firstName} ${user.lastName}`}
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
                                            )}
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

            {/* Role Modal - mỗi user chỉ 1 vai trò */}
            {showRoleModal && selectedUser && !isAdminUser(selectedUser) && (
                <dialog className="modal modal-open">
                    <div className="modal-box">
                        <h3 className="font-bold text-lg mb-4">Đổi vai trò: {selectedUser.username}</h3>
                        <form onSubmit={handleAssignRoles} className="space-y-4">
                            <div>
                                <label className="label">
                                    <span className="label-text font-semibold">Vai trò <span className='text-error'>*</span></span>
                                </label>
                                <select
                                    className="select select-bordered w-full"
                                    value={formData.roles?.[0] || ''}
                                    onChange={(e) => {
                                        setFormData({ ...formData, roles: e.target.value ? [e.target.value] : [] });
                                        // Auto-reset location when role changes
                                        setSelectedLocationId('');
                                    }}
                                >
                                    <option value="">-- Chọn vai trò --</option>
                                    {getAssignableRoleOptionsForUser(roles, selectedUser).map((role) => (
                                        <option key={role.name} value={role.name}>
                                            {role.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Branch selection for seller and manager roles */}
                            {formData.roles?.[0] && ['seller', 'manager'].includes(formData.roles[0]) && (
                                <div>
                                    <label className="label">
                                        <span className="label-text font-semibold">Cơ sở <span className='text-error'>*</span></span>
                                    </label>
                                    <select
                                        className="select select-bordered w-full"
                                        value={selectedLocationId}
                                        onChange={(e) => setSelectedLocationId(e.target.value)}
                                        required
                                    >
                                        <option value="">-- Chọn cơ sở --</option>
                                        {locations.map((location) => (
                                            <option key={location._id} value={location._id}>
                                                {location.name} ({location.code})
                                            </option>
                                        ))}
                                    </select>
                                    <label className="label">
                                        <span className="label-text-alt text-base-content/60">
                                            Nhân viên sẽ được phân công làm việc tại cơ sở được chọn
                                        </span>
                                    </label>
                                </div>
                            )}

                            <div className="modal-action">
                                <button
                                    type="button"
                                    className="btn btn-ghost btn-sm"
                                    onClick={() => {
                                        setShowRoleModal(false);
                                        resetForm();
                                        setSelectedLocationId('');
                                    }}
                                >
                                    Hủy
                                </button>
                                <button 
                                    type="submit" 
                                    className="btn btn-primary btn-sm" 
                                    disabled={
                                        submitting || 
                                        !formData.roles?.[0] || 
                                        (['seller', 'manager'].includes(formData.roles[0]) && !selectedLocationId)
                                    }
                                >
                                    {submitting ? (
                                        <>
                                            <span className="loading loading-spinner loading-sm"></span>
                                            Đang cập nhật...
                                        </>
                                    ) : (
                                        'Cập nhật vai trò'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                    <form method="dialog" className="modal-backdrop">
                        <button onClick={() => { resetForm(); setSelectedLocationId(''); }}>close</button>
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
                                    className="btn btn-ghost btn-sm"
                                    onClick={() => {
                                        setShowEditModal(false);
                                        resetForm();
                                    }}
                                >
                                    Hủy
                                </button>
                                <button type="submit" className="btn btn-primary btn-sm" disabled={submitting}>
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
                                    className="btn btn-ghost btn-sm"
                                    onClick={() => {
                                        setShowPasswordModal(false);
                                        resetForm();
                                    }}
                                >
                                    Hủy
                                </button>
                                <button type="submit" className="btn btn-primary btn-sm" disabled={submitting}>
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