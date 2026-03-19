import { useEffect, useState } from 'react';
import Header from '../UserManagementPage/Header';
import { toast } from 'sonner';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { getMemberPolicies, createMemberPolicy, updateMemberPolicy, deleteMemberPolicy } from '@/services/memberPolicyService';

const emptyForm = {
    name: '',
    code: '',
    description: '',
    minTotalSpent: 0,
    discountPercent: 0,
    isActive: true,
};

const MemberPolicyPage = () => {
    const [policies, setPolicies] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editingPolicy, setEditingPolicy] = useState(null);
    const [formData, setFormData] = useState(emptyForm);

    const fetchPolicies = async () => {
        try {
            setLoading(true);
            const res = await getMemberPolicies();
            if (res.success && res.data) {
                setPolicies(res.data.policies || []);
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Không thể tải danh sách hạng thành viên');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPolicies();
    }, []);

    const openCreateModal = () => {
        setEditingPolicy(null);
        setFormData(emptyForm);
        setShowModal(true);
    };

    const openEditModal = (policy) => {
        setEditingPolicy(policy);
        setFormData({
            name: policy.name || '',
            code: policy.code || '',
            description: policy.description || '',
            minTotalSpent: policy.minTotalSpent ?? 0,
            discountPercent: policy.discountPercent ?? 0,
            isActive: policy.isActive ?? true,
        });
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                name: (formData.name || '').trim(),
                code: (formData.code || '').trim(),
                description: (formData.description || '').trim(),
                minTotalSpent: Number(formData.minTotalSpent) || 0,
                discountPercent: Number(formData.discountPercent) || 0,
                isActive: !!formData.isActive,
            };

            if (!payload.name) {
                toast.error('Vui lòng nhập tên hạng');
                return;
            }
            if (!payload.code) {
                toast.error('Vui lòng nhập mã hạng');
                return;
            }
            if (payload.minTotalSpent < 0) {
                toast.error('Tổng chi tiêu tối thiểu không hợp lệ');
                return;
            }
            if (payload.discountPercent < 0 || payload.discountPercent > 100) {
                toast.error('Phần trăm giảm giá phải từ 0 đến 100');
                return;
            }

            if (editingPolicy) {
                const res = await updateMemberPolicy(editingPolicy._id, payload);
                if (res.success) {
                    toast.success('Cập nhật hạng thành viên thành công');
                }
            } else {
                const res = await createMemberPolicy(payload);
                if (res.success) {
                    toast.success('Tạo hạng thành viên thành công');
                }
            }

            setShowModal(false);
            setEditingPolicy(null);
            setFormData(emptyForm);
            fetchPolicies();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Lưu hạng thành viên thất bại');
        }
    };

    const handleDelete = async (policy) => {
        if (!window.confirm(`Xóa hạng "${policy.name}"?`)) return;
        try {
            const res = await deleteMemberPolicy(policy._id);
            if (res.success) {
                toast.success('Xóa hạng thành viên thành công');
                fetchPolicies();
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Xóa hạng thành viên thất bại');
        }
    };

    return (
        <div className="flex-1 p-6 bg-base-200 overflow-y-auto">
            <div className="container mx-auto space-y-4">
                <Header title="Chính sách hạng thành viên" subtitle="Cấu hình hạng khách hàng, điều kiện và % giảm giá" showCreateButton={false} />

                <div className="bg-base-100 rounded-lg shadow p-4 flex items-center justify-between gap-4">
                    <div>
                        <div className="font-semibold text-base-content">Cấu hình hạng khách hàng</div>
                        <div className="text-sm text-base-content/70">
                            Tạo các hạng như Đồng, Bạc, Vàng... kèm điều kiện tổng chi tiêu và % giảm giá.
                        </div>
                    </div>
                    <button type="button" className="btn btn-primary btn-sm gap-2" onClick={openCreateModal}>
                        <Plus className="w-4 h-4" />
                        Thêm hạng mới
                    </button>
                </div>

                <div className="bg-base-100 rounded-lg shadow overflow-x-auto">
                    {loading ? (
                        <div className="p-6 text-center text-base-content/60">Đang tải...</div>
                    ) : policies.length === 0 ? (
                        <div className="p-6 text-center text-base-content/60">
                            Chưa có hạng thành viên nào. Hãy thêm hạng đầu tiên.
                        </div>
                    ) : (
                        <table className="table table-sm">
                            <thead className="bg-blue-100">
                                <tr>
                                    <th>Tên hạng</th>
                                    <th>Mã</th>
                                    <th>Điều kiện (tổng chi tiêu &ge;)</th>
                                    <th>% giảm giá</th>
                                    <th>Trạng thái</th>
                                    <th className="text-center">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {policies.map((p) => (
                                    <tr key={p._id}>
                                        <td>{p.name}</td>
                                        <td>
                                            <span className="font-mono text-sm">{p.code}</span>
                                        </td>
                                        <td>{(p.minTotalSpent ?? 0).toLocaleString('vi-VN')} đ</td>
                                        <td>{p.discountPercent ?? 0}%</td>
                                        <td>
                                            <span
                                                className={`badge badge-sm ${p.isActive ? 'badge-success' : 'badge-neutral'
                                                    }`}
                                            >
                                                {p.isActive ? 'Đang áp dụng' : 'Ngừng áp dụng'}
                                            </span>
                                        </td>
                                        <td className="text-center">
                                            <div className="flex justify-center gap-2">
                                                <button
                                                    type="button"
                                                    className="btn btn-ghost btn-sm"
                                                    onClick={() => openEditModal(p)}
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                                <button
                                                    type="button"
                                                    className="btn btn-ghost btn-sm text-error"
                                                    onClick={() => handleDelete(p)}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {showModal && (
                    <dialog className="modal modal-open">
                        <div className="modal-box max-w-lg">
                            <h3 className="font-bold text-lg mb-4">
                                {editingPolicy ? 'Chỉnh sửa hạng thành viên' : 'Thêm hạng thành viên'}
                            </h3>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="label">
                                            <span className="label-text font-semibold">Tên hạng</span>
                                        </label>
                                        <input
                                            type="text"
                                            className="input input-bordered input-sm w-full"
                                            value={formData.name}
                                            onChange={(e) =>
                                                setFormData((prev) => ({ ...prev, name: e.target.value }))
                                            }
                                            placeholder="Ví dụ: Đồng, Bạc, Vàng"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="label">
                                            <span className="label-text font-semibold">Mã hạng</span>
                                        </label>
                                        <input
                                            type="text"
                                            className="input input-bordered input-sm w-full"
                                            value={formData.code}
                                            onChange={(e) =>
                                                setFormData((prev) => ({
                                                    ...prev,
                                                    code: e.target.value.toUpperCase(),
                                                }))
                                            }
                                            placeholder="VD: BRONZE, SILVER, GOLD"
                                            required
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="label">
                                        <span className="label-text font-semibold">Mô tả</span>
                                    </label>
                                    <textarea
                                        className="textarea textarea-bordered textarea-sm w-full"
                                        rows={3}
                                        value={formData.description}
                                        onChange={(e) =>
                                            setFormData((prev) => ({ ...prev, description: e.target.value }))
                                        }
                                        placeholder="Ghi chú thêm về quyền lợi, điều kiện..."
                                    />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="label">
                                            <span className="label-text font-semibold">Tổng chi tiêu &ge; (VNĐ)</span>
                                        </label>
                                        <input
                                            type="number"
                                            min={0}
                                            className="input input-bordered input-sm w-full"
                                            value={formData.minTotalSpent}
                                            onChange={(e) =>
                                                setFormData((prev) => ({
                                                    ...prev,
                                                    minTotalSpent: e.target.value,
                                                }))
                                            }
                                        />
                                    </div>
                                    <div>
                                        <label className="label">
                                            <span className="label-text font-semibold">% giảm giá</span>
                                        </label>
                                        <input
                                            type="number"
                                            min={0}
                                            max={100}
                                            className="input input-bordered input-sm w-full"
                                            value={formData.discountPercent}
                                            onChange={(e) =>
                                                setFormData((prev) => ({
                                                    ...prev,
                                                    discountPercent: e.target.value,
                                                }))
                                            }
                                        />
                                    </div>
                                </div>
                                <div className="form-control">
                                    <label className="label cursor-pointer justify-start gap-3">
                                        <input
                                            type="checkbox"
                                            className="checkbox checkbox-sm"
                                            checked={formData.isActive}
                                            onChange={(e) =>
                                                setFormData((prev) => ({
                                                    ...prev,
                                                    isActive: e.target.checked,
                                                }))
                                            }
                                        />
                                        <span className="label-text">Đang áp dụng</span>
                                    </label>
                                </div>
                                <div className="modal-action">
                                    <button
                                        type="button"
                                        className="btn btn-ghost btn-sm"
                                        onClick={() => {
                                            setShowModal(false);
                                            setEditingPolicy(null);
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
        </div>
    );
};

export default MemberPolicyPage;

