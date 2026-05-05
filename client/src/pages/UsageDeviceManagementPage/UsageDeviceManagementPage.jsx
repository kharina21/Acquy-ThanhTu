import { useState, useEffect } from 'react';
import { getUsageDevices, createUsageDevice, updateUsageDevice, deleteUsageDevice } from '@/services/usageDeviceService';
import { toast } from 'sonner';
import { Cpu, Plus, Search, Pencil, Trash2 } from 'lucide-react';
import UsageDeviceModal from '@/components/common/UsageDeviceModal';
import { FilterToolbar, FilterToolbarActions, FilterToolbarField } from '@/components/common/FilterToolbar';

const UsageDeviceTable = ({ devices, loading, onEdit, onDelete }) => {
    if (loading) {
        return (
            <div className="flex justify-center items-center py-12">
                <span className="loading loading-spinner loading-lg"></span>
            </div>
        );
    }

    if (devices.length === 0) {
        return (
            <div className="text-center py-12 text-base-content/60">
                <p>Chưa có thiết bị sử dụng nào</p>
            </div>
        );
    }

    return (
        <div className="bg-base-100 rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto overflow-y-auto max-h-[700px]">
                <table className="table">
                    <thead className="bg-blue-100 sticky top-0 z-20">
                        <tr>
                            <th className="font-medium text-neutral text-xs">Tên thiết bị sử dụng</th>
                            <th className="font-medium text-neutral text-xs">Mô tả</th>
                            <th className="font-medium text-neutral text-xs">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody className="text-xs">
                        {devices.map((device) => (
                            <tr
                                key={device._id}
                                className="cursor-pointer hover:bg-base-200/60 transition-colors font-light"
                            >
                                <td className="font-medium">{device.name}</td>
                                <td>{device.description || '—'}</td>
                                <td>
                                    <div className="flex gap-2">
                                        <button
                                            className="btn btn-ghost btn-xs"
                                            onClick={() => onEdit(device)}
                                            title="Chỉnh sửa"
                                        >
                                            <Pencil className="w-4 h-4" />
                                        </button>
                                        <button
                                            className="btn btn-ghost btn-xs text-error"
                                            onClick={() => onDelete(device._id)}
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
        </div>
    );
};

const UsageDeviceManagementPage = () => {
    const [devices, setDevices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingDevice, setEditingDevice] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    const fetchDevices = async () => {
        setLoading(true);
        try {
            const res = await getUsageDevices();
            if (res.success) {
                setDevices(res.data.usageDevices || []);
            }
        } catch (error) {
            console.error('Error fetching usage devices:', error);
            toast.error('Lỗi khi tải danh sách thiết bị sử dụng');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDevices();
    }, []);

    const handleCreate = () => {
        setEditingDevice(null);
        setShowModal(true);
    };

    const handleEdit = (device) => {
        setEditingDevice(device);
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Bạn có chắc chắn muốn xóa thiết bị sử dụng này?')) return;
        try {
            await deleteUsageDevice(id);
            toast.success('Xóa thiết bị sử dụng thành công');
            setShowModal(false);
            setEditingDevice(null);
            fetchDevices();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Lỗi khi xóa thiết bị sử dụng');
        }
    };

    const handleSubmit = async (formData) => {
        setSubmitting(true);
        try {
            if (editingDevice) {
                await updateUsageDevice(editingDevice._id, formData);
                toast.success('Cập nhật thiết bị sử dụng thành công');
            } else {
                await createUsageDevice(formData);
                toast.success('Tạo thiết bị sử dụng thành công');
            }
            setShowModal(false);
            fetchDevices();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Lỗi khi lưu thiết bị sử dụng');
        } finally {
            setSubmitting(false);
        }
    };

    const filteredDevices = devices.filter((d) =>
        d.name.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="flex-1 p-6 bg-base-200 overflow-y-auto space-y-6">
            <div className="flex items-center gap-3">
                <Cpu className="w-8 h-8 text-primary" />
                <h1 className="text-3xl font-bold">Quản lý Thiết bị sử dụng</h1>
            </div>

            <div className="bg-base-100 rounded-lg shadow p-6">
                <FilterToolbar className="mb-6">
                    <FilterToolbarField label="Tìm kiếm" className="max-w-md flex-1">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-base-content/40" />
                            <input
                                type="text"
                                placeholder="Tìm kiếm thiết bị sử dụng..."
                                className="input input-bordered input-sm w-full pl-10"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                    </FilterToolbarField>
                    <FilterToolbarActions>
                        <button type="button" onClick={handleCreate} className="btn btn-primary btn-sm gap-1">
                            <Plus className="h-4 w-4" />
                            Thêm thiết bị sử dụng
                        </button>
                    </FilterToolbarActions>
                </FilterToolbar>

                <UsageDeviceTable
                    devices={filteredDevices}
                    loading={loading}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                />
            </div>

            {showModal && (
                <UsageDeviceModal
                    device={editingDevice}
                    onClose={() => setShowModal(false)}
                    onSubmit={handleSubmit}
                    onDelete={editingDevice ? () => handleDelete(editingDevice._id) : undefined}
                    submitting={submitting}
                />
            )}
        </div>
    );
};

export default UsageDeviceManagementPage;
