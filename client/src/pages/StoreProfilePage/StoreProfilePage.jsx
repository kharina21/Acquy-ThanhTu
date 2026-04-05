import { useState, useEffect } from 'react';
import { Building2, MapPin, Plus, Pencil, Phone, Mail, Trash2, Globe } from 'lucide-react';
import { toast } from 'sonner';
import {
    getLocations,
    createLocation,
    updateLocation,
    deleteLocation,
    getOnlineLocation,
    setOnlineLocation,
} from '@/services/locationService';
import { useBranchStore } from '@/stores/useBranchStore';
import ConfirmationModal from '@/components/common/ConfirmationModal';
import BranchModal from './BranchModal';
import BankAccountSection from './BankAccountSection';

const StoreProfilePage = () => {
    const [locations, setLocations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingBranch, setEditingBranch] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: null,
        variant: 'warning',
    });
    const [onlineLocationId, setOnlineLocationId] = useState('');
    const [settingOnline, setSettingOnline] = useState(false);

    const fetchLocations = async () => {
        setLoading(true);
        try {
            const res = await getLocations();
            if (res.success) {
                setLocations(res.data.locations || []);
            }
        } catch (error) {
            console.error('Error fetching locations:', error);
            toast.error('Lỗi khi tải danh sách chi nhánh');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLocations();
    }, []);

    useEffect(() => {
        const load = async () => {
            try {
                const res = await getOnlineLocation();
                const loc = res?.data?.location;
                const resolvedAs = res?.data?.resolvedAs;
                setOnlineLocationId(resolvedAs === 'configured' && loc?._id ? loc._id : '');
            } catch {
                setOnlineLocationId('');
            }
        };
        if (locations.length > 0) load();
    }, [locations]);

    const handleCreate = () => {
        setEditingBranch(null);
        setShowModal(true);
    };

    const handleEdit = (branch) => {
        setEditingBranch(branch);
        setShowModal(true);
    };

    const handleDelete = (branch) => {
        if (locations.length <= 1) {
            toast.error('Cần có ít nhất một chi nhánh trong hệ thống. Không thể xóa chi nhánh cuối cùng.');
            return;
        }
        setConfirmModal({
            isOpen: true,
            title: 'Xóa chi nhánh',
            message: `Bạn có chắc chắn muốn xóa chi nhánh "${branch.name}" (${branch.code})?`,
            variant: 'warning',
            onConfirm: async () => {
                try {
                    const res = await deleteLocation(branch._id);
                    if (res.success) {
                        toast.success('Xóa chi nhánh thành công');
                        fetchLocations();
                        useBranchStore.getState().fetchLocations();
                    }
                } catch (error) {
                    toast.error(error.response?.data?.message || 'Lỗi khi xóa chi nhánh');
                }
            },
        });
    };

    const handleSubmit = async (formData) => {
        setSubmitting(true);
        try {
            if (editingBranch) {
                const res = await updateLocation(editingBranch._id, formData);
                if (res.success) {
                    toast.success('Cập nhật chi nhánh thành công');
                    setShowModal(false);
                    fetchLocations();
                    useBranchStore.getState().fetchLocations();
                }
            } else {
                const res = await createLocation(formData);
                if (res.success) {
                    toast.success('Tạo chi nhánh thành công');
                    setShowModal(false);
                    fetchLocations();
                    useBranchStore.getState().fetchLocations();
                }
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Lỗi khi lưu chi nhánh');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="flex-1 p-6 bg-base-200 overflow-y-auto">
            <div className="container mx-auto max-w-5xl">
                <h1 className="text-2xl font-bold text-base-content mb-6 flex items-center gap-2">
                    <Building2 className="w-8 h-8 text-primary" />
                    Hồ sơ cửa hàng
                </h1>

                {/* Quản lý chi nhánh */}
                <section className="bg-base-100 rounded-lg shadow p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-semibold flex items-center gap-2">
                            <MapPin className="w-5 h-5 text-primary" />
                            Quản lý chi nhánh
                        </h2>
                        <button onClick={handleCreate} className="btn btn-primary btn-sm gap-2">
                            <Plus className="w-4 h-4" />
                            Thêm chi nhánh
                        </button>
                    </div>

                    {loading ? (
                        <div className="flex justify-center py-12">
                            <span className="loading loading-spinner loading-lg" />
                        </div>
                    ) : locations.length === 0 ? (
                        <div className="text-center py-12 text-base-content/60">
                            <MapPin className="w-12 h-12 mx-auto mb-2 opacity-50" />
                            <p>Chưa có chi nhánh nào. Nhấn "Thêm chi nhánh" để tạo.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="table table-sm">
                                <thead>
                                    <tr>
                                        <th className="font-medium">Mã</th>
                                        <th className="font-medium">Tên</th>
                                        <th className="font-medium">Địa chỉ</th>
                                        <th className="font-medium">Điện thoại</th>
                                        <th className="font-medium">Email</th>
                                        <th className="font-medium">Trạng thái</th>
                                        <th className="font-medium text-right">Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {locations.map((loc) => (
                                        <tr key={loc._id}>
                                            <td className="font-mono font-medium">{loc.code}</td>
                                            <td>{loc.name}</td>
                                            <td className="max-w-[200px] truncate" title={loc.address}>
                                                {loc.address || '—'}
                                            </td>
                                            <td>
                                                {loc.phone ? (
                                                    <span className="inline-flex items-center gap-1">
                                                        <Phone className="w-3.5 h-3.5 text-base-content/50 shrink-0" />
                                                        {loc.phone}
                                                    </span>
                                                ) : (
                                                    '—'
                                                )}
                                            </td>
                                            <td>
                                                {loc.email ? (
                                                    <span className="inline-flex items-center gap-1">
                                                        <Mail className="w-3.5 h-3.5 text-base-content/50 shrink-0" />
                                                        {loc.email}
                                                    </span>
                                                ) : (
                                                    '—'
                                                )}
                                            </td>
                                            <td>
                                                <span
                                                    className={`badge badge-sm ${loc.isActive ? 'badge-success' : 'badge-ghost'}`}
                                                >
                                                    {loc.isActive ? 'Hoạt động' : 'Tạm ngưng'}
                                                </span>
                                            </td>
                                            <td className="text-right">
                                                <div className="flex gap-1 justify-end">
                                                    <button
                                                        type="button"
                                                        className="btn btn-ghost btn-xs"
                                                        onClick={() => handleEdit(loc)}
                                                        title="Chỉnh sửa"
                                                    >
                                                        <Pencil className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="btn btn-ghost btn-xs text-error"
                                                        onClick={() => handleDelete(loc)}
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
                    )}
                </section>

                {/* Bán online - chọn chi nhánh nhận đơn online */}
                {locations.length > 0 && (
                    <section className="bg-base-100 rounded-lg shadow p-6 mt-6">
                        <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
                            <Globe className="w-5 h-5 text-primary" />
                            Bán online
                        </h2>
                        <p className="text-sm text-base-content/60 mb-4">
                            Chọn một chi nhánh nhận đơn đặt hàng online và tính tồn kho cho website.
                        </p>
                        <div className="max-w-md">
                            <label className="label py-0 text-xs">Chi nhánh nhận đơn online</label>
                            <select
                                className="select select-bordered select-sm w-full"
                                value={onlineLocationId}
                                onChange={async (e) => {
                                    const id = e.target.value;
                                    if (!id) return;
                                    setSettingOnline(true);
                                    try {
                                        const res = await setOnlineLocation(id);
                                        if (res.success) {
                                            setOnlineLocationId(id);
                                            toast.success(res.message || 'Đã cập nhật chi nhánh bán online');
                                            useBranchStore.getState().fetchLocations();
                                        }
                                    } catch (err) {
                                        toast.error(err.response?.data?.message || 'Lỗi khi cập nhật');
                                    } finally {
                                        setSettingOnline(false);
                                    }
                                }}
                                disabled={settingOnline}
                            >
                                <option value="">— Chọn chi nhánh —</option>
                                {locations.filter((l) => l.isActive !== false).map((loc) => (
                                    <option key={loc._id} value={loc._id}>
                                        {loc.code} - {loc.name}
                                    </option>
                                ))}
                            </select>
                            {settingOnline && <span className="loading loading-spinner loading-xs ml-2" />}
                        </div>
                    </section>
                )}

                {/* Tài khoản ngân hàng (VietQR) */}
                <BankAccountSection locations={locations} loading={loading} />
            </div>

            {showModal && (
                <BranchModal
                    branch={editingBranch}
                    onClose={() => {
                        setShowModal(false);
                        setEditingBranch(null);
                    }}
                    onSubmit={handleSubmit}
                    submitting={submitting}
                />
            )}

            <ConfirmationModal
                isOpen={confirmModal.isOpen}
                title={confirmModal.title}
                message={confirmModal.message}
                variant={confirmModal.variant}
                onClose={() => setConfirmModal((p) => ({ ...p, isOpen: false }))}
                onConfirm={confirmModal.onConfirm}
                onCancel={() => setConfirmModal((p) => ({ ...p, isOpen: false }))}
            />
        </div>
    );
};

export default StoreProfilePage;
