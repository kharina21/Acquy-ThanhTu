import { useState, useEffect } from 'react';
import {
    getSuppliers,
    createSupplier,
    updateSupplier,
    deleteSupplier,
    getNextSupplierCode,
} from '@/services/supplierService';
import { toast } from 'sonner';
import { Truck, Plus, Search } from 'lucide-react';
import SupplierTable from './SupplierTable';
import SupplierModal from './SupplierModal';

const SuppliersPage = () => {
    const [suppliers, setSuppliers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    const fetchSuppliers = async () => {
        setLoading(true);
        try {
            const res = await getSuppliers({ search: search || undefined });
            if (res.success) {
                setSuppliers(res.data.suppliers || []);
            }
        } catch (error) {
            console.error('Error fetching suppliers:', error);
            toast.error('Lỗi khi tải danh sách nhà cung cấp');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSuppliers();
    }, [search]);

    const handleCreate = async () => {
        setEditingSupplier(null);
        try {
            const code = await getNextSupplierCode();
            setEditingSupplier(code ? { _nextCode: code } : {});
        } catch {
            setEditingSupplier({});
        }
        setShowModal(true);
    };

    const handleEdit = (supplier) => {
        setEditingSupplier(supplier);
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Bạn có chắc chắn muốn xóa nhà cung cấp này?')) return;
        try {
            const res = await deleteSupplier(id);
            if (res.success) {
                toast.success('Xóa nhà cung cấp thành công');
                fetchSuppliers();
            }
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Lỗi khi xóa nhà cung cấp');
        }
    };

    const handleSubmit = async (formData) => {
        setSubmitting(true);
        try {
            if (editingSupplier?._id) {
                const res = await updateSupplier(editingSupplier._id, formData);
                if (res.success) {
                    toast.success('Cập nhật nhà cung cấp thành công');
                    setShowModal(false);
                    fetchSuppliers();
                }
            } else {
                const payload = { ...formData };
                if (editingSupplier?._nextCode) payload.code = editingSupplier._nextCode;
                const res = await createSupplier(payload);
                if (res.success) {
                    toast.success('Tạo nhà cung cấp thành công');
                    setShowModal(false);
                    fetchSuppliers();
                }
            }
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Lỗi khi lưu nhà cung cấp');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="flex-1 p-6 bg-base-200 overflow-y-auto">
            <div className="container mx-auto">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <Truck className="w-8 h-8 text-primary" />
                        <h1 className="text-2xl font-bold text-base-content">Nhà cung cấp</h1>
                    </div>
                    <button onClick={handleCreate} className="btn btn-primary gap-2">
                        <Plus className="w-5 h-5" />
                        Thêm nhà cung cấp
                    </button>
                </div>

                <div className="bg-base-100 rounded-lg shadow p-6">
                    <div className="flex gap-4 mb-6">
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-base-content/40 z-10" />
                            <input
                                type="text"
                                placeholder="Tìm kiếm theo mã, tên, SĐT..."
                                className="input input-bordered w-full pl-10"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                    </div>

                    <SupplierTable
                        suppliers={suppliers}
                        loading={loading}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                    />
                </div>

                {showModal && (
                    <SupplierModal
                        supplier={editingSupplier}
                        onClose={() => setShowModal(false)}
                        onSubmit={handleSubmit}
                        submitting={submitting}
                    />
                )}
            </div>
        </div>
    );
};

export default SuppliersPage;
