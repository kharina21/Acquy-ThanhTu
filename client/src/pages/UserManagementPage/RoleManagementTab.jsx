import React, { useEffect, useState } from 'react';
import { Trash2, Edit, Plus } from 'lucide-react';
import { toast } from 'sonner';
import {
    getRolesWithPermissions,
    getAllPermissions,
    createRole,
    updateRole,
    deleteRole,
} from '@/services/roleService';

const RoleManagementTab = () => {
    const [roles, setRoles] = useState([]);
    const [permissions, setPermissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingRole, setEditingRole] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        permissionIds: [],
        isActive: true,
    });

    const resetForm = () => {
        setEditingRole(null);
        setFormData({
            name: '',
            description: '',
            permissionIds: [],
            isActive: true,
        });
    };

    const fetchData = async () => {
        try {
            setLoading(true);
            const [roleRes, permRes] = await Promise.all([
                getRolesWithPermissions(),
                getAllPermissions(),
            ]);
            if (roleRes.success) setRoles(roleRes.data.roles || []);
            if (permRes.success) setPermissions(permRes.data.permissions || []);
        } catch (error) {
            console.error('Error fetching roles/permissions:', error);
            toast.error('Không thể tải dữ liệu vai trò');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const openCreateModal = () => {
        resetForm();
        setShowModal(true);
    };

    const openEditModal = (role) => {
        setEditingRole(role);
        setFormData({
            name: role.name,
            description: role.description || '',
            permissionIds: (role.permissions || []).map((p) => p._id),
            isActive: role.isActive ?? true,
        });
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                name: formData.name,
                description: formData.description,
                permissionIds: formData.permissionIds,
                isActive: formData.isActive,
            };
            if (editingRole) {
                const res = await updateRole(editingRole._id, payload);
                if (res.success) toast.success('Cập nhật vai trò thành công');
            } else {
                const res = await createRole(payload);
                if (res.success) toast.success('Tạo vai trò thành công');
            }
            setShowModal(false);
            resetForm();
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Lưu vai trò thất bại');
        }
    };

    const handleDelete = async (role) => {
        if (!window.confirm(`Bạn có chắc chắn muốn xóa vai trò "${role.name}"?`)) return;
        try {
            await deleteRole(role._id);
            toast.success('Xóa vai trò thành công');
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Xóa vai trò thất bại');
        }
    };

    const groupedPermissions = permissions.reduce((acc, p) => {
        if (!acc[p.resource]) acc[p.resource] = [];
        acc[p.resource].push(p);
        return acc;
    }, {});

    return (
        <div className="bg-base-100 rounded-lg shadow-lg p-4 space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold">Quản lý vai trò</h2>
                    <p className="text-sm text-base-content/60">
                        Tạo, chỉnh sửa và phân quyền cho các vai trò trong hệ thống
                    </p>
                </div>
                <button type="button" className="btn btn-primary btn-sm gap-1" onClick={openCreateModal}>
                    <Plus className="w-4 h-4" />
                    Thêm vai trò
                </button>
            </div>

            {loading ? (
                <div className="p-8 text-center text-base-content/60">Đang tải dữ liệu...</div>
            ) : roles.length === 0 ? (
                <div className="p-8 text-center text-base-content/60">
                    Chưa có vai trò nào. Bấm &quot;Thêm vai trò&quot; để tạo mới.
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="table table-sm">
                        <thead className="bg-blue-100">
                            <tr>
                                <th>Tên vai trò</th>
                                <th>Mô tả</th>
                                <th>Trạng thái</th>
                                <th className="text-center">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {roles.map((role) => (
                                <tr key={role._id}>
                                    <td className="font-semibold">{role.name}</td>
                                    <td>{role.description || '-'}</td>
                                    <td>
                                        <span
                                            className={`badge badge-sm ${role.isActive ? 'badge-success' : 'badge-neutral'
                                                }`}
                                        >
                                            {role.isActive ? 'Đang dùng' : 'Ngừng dùng'}
                                        </span>
                                    </td>
                                    <td className="text-center">
                                        {role.name === 'admin' ? (
                                            <span className="text-[11px] text-base-content/60 italic">
                                                Không chỉnh sửa / xóa
                                            </span>
                                        ) : (
                                            <div className="flex justify-center gap-2">
                                                <button
                                                    type="button"
                                                    className="btn btn-ghost btn-sm"
                                                    onClick={() => openEditModal(role)}
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                                <button
                                                    type="button"
                                                    className="btn btn-ghost btn-sm text-error"
                                                    onClick={() => handleDelete(role)}
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
            )}

            {showModal && (
                <dialog className="modal modal-open">
                    <div className="modal-box max-w-3xl">
                        <h3 className="font-bold text-lg mb-4">
                            {editingRole ? 'Chỉnh sửa vai trò' : 'Tạo vai trò mới'}
                        </h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="label">
                                        <span className="label-text font-semibold">
                                            Tên vai trò <span className="text-error">*</span>
                                        </span>
                                    </label>
                                    <input
                                        type="text"
                                        className="input input-bordered w-full"
                                        value={formData.name}
                                        onChange={(e) =>
                                            setFormData((prev) => ({ ...prev, name: e.target.value }))
                                        }
                                        disabled={editingRole?.name === 'admin'}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="label cursor-pointer mb-1">
                                        <span className="label-text font-semibold">Trạng thái</span>
                                        <input
                                            type="checkbox"
                                            className="checkbox checkbox-xs checkbox-primary ml-2"
                                            checked={formData.isActive}
                                            onChange={(e) =>
                                                setFormData((prev) => ({
                                                    ...prev,
                                                    isActive: e.target.checked,
                                                }))
                                            }
                                            disabled={editingRole?.name === 'admin'}
                                        />
                                    </label>
                                </div>
                            </div>
                            <div>
                                <label className="label">
                                    <span className="label-text font-semibold">Mô tả</span>
                                </label>
                                <textarea
                                    className="textarea textarea-bordered w-full"
                                    value={formData.description}
                                    onChange={(e) =>
                                        setFormData((prev) => ({
                                            ...prev,
                                            description: e.target.value,
                                        }))
                                    }
                                    rows={2}
                                />
                            </div>
                            <div>
                                <label className="label">
                                    <span className="label-text font-semibold">
                                        Quyền hạn áp dụng cho vai trò
                                    </span>
                                </label>
                                <div className="max-h-72 overflow-y-auto border border-base-300 rounded-lg p-3 space-y-3">
                                    {Object.entries(groupedPermissions).map(([resource, list]) => (
                                        <div key={resource}>
                                            <p className="text-xs font-semibold uppercase text-base-content/60 mb-1">
                                                {resource}
                                            </p>
                                            <div className="flex flex-wrap gap-2">
                                                {list.map((perm) => {
                                                    const checked = formData.permissionIds.includes(
                                                        perm._id
                                                    );
                                                    return (
                                                        <label
                                                            key={perm._id}
                                                            className={`badge badge-outline gap-1 cursor-pointer ${checked ? 'badge-primary' : ''
                                                                }`}
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                className="checkbox checkbox-xs"
                                                                checked={checked}
                                                                disabled={editingRole?.name === 'admin'}
                                                                onChange={(e) => {
                                                                    setFormData((prev) => {
                                                                        const nextIds =
                                                                            new Set(prev.permissionIds);
                                                                        if (e.target.checked) {
                                                                            nextIds.add(perm._id);
                                                                        } else {
                                                                            nextIds.delete(perm._id);
                                                                        }
                                                                        return {
                                                                            ...prev,
                                                                            permissionIds:
                                                                                Array.from(nextIds),
                                                                        };
                                                                    });
                                                                }}
                                                            />
                                                            <span>{perm.name}</span>
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="modal-action">
                                <button
                                    type="button"
                                    className="btn btn-ghost btn-sm"
                                    onClick={() => {
                                        setShowModal(false);
                                        resetForm();
                                    }}
                                >
                                    Hủy
                                </button>
                                <button type="submit" className="btn btn-primary btn-sm">
                                    Lưu
                                </button>
                            </div>
                        </form>
                    </div>
                    <form method="dialog" className="modal-backdrop">
                        <button type="button" onClick={() => setShowModal(false)}>
                            Đóng
                        </button>
                    </form>
                </dialog>
            )}
        </div>
    );
};

export default RoleManagementTab;

